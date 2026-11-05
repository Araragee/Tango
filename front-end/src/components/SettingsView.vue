<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';

const { confirm } = useConfirm();
import { ref, computed, watch, inject, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAppStore } from '../stores/useStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { useThemeStore, type AccentColor } from '../stores/useThemeStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { usePushStore } from '../stores/usePushStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';
import QrCode from './QrCode.vue';
import EmojiCategoryEditor from './EmojiCategoryEditor.vue';
import { useOfflineQueue } from '../stores/useOfflineQueue';

const router = useRouter();
const route = useRoute();
const store = useAppStore();

// ── Section navigation ───────────────────────────────────────────────────────
// Settings is grouped into focused tabs so neither partner has to scroll a long
// wall of cards on mobile. The active tab is mirrored in the URL (?tab=) so deep
// links work — e.g. the sync-status pill links straight to ?tab=data.
type SettingsTab = 'profile' | 'household' | 'account' | 'notifications' | 'appearance' | 'budget' | 'data';
const TABS: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'household', label: 'Household', icon: 'group' },
    { id: 'account', label: 'Account', icon: 'lock' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'budget', label: 'Budget', icon: 'savings' },
    { id: 'data', label: 'Data & Sync', icon: 'sync' },
];
const VALID_TABS = TABS.map((t) => t.id) as string[];
const activeTab = ref<SettingsTab>('profile');

const syncTabFromQuery = () => {
    const q = route.query.tab;
    if (typeof q === 'string' && VALID_TABS.includes(q)) {
        activeTab.value = q as SettingsTab;
    }
};
syncTabFromQuery();
watch(() => route.query.tab, () => { syncTabFromQuery(); scrollActiveTabIntoView(); });

// Keep the active tab visible in the horizontally-scrollable strip, otherwise a
// later tab (e.g. ?tab=account) stays clipped off the right edge on mobile.
const scrollActiveTabIntoView = () => {
    nextTick(() => {
        const idx = TABS.findIndex((t) => t.id === activeTab.value);
        const buttons = tablistEl.value?.querySelectorAll<HTMLElement>('[role="tab"]');
        buttons?.[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
};

const setTab = (id: SettingsTab) => {
    activeTab.value = id;
    // replace (not push) so the back button still leaves Settings in one step
    router.replace({ query: { ...route.query, tab: id } });
    scrollActiveTabIntoView();
};

// Keyboard support for the tablist (WAI-ARIA "tabs" pattern, automatic activation):
// Left/Right move between tabs, Home/End jump to the first/last, and focus follows
// selection so the matching panel is shown immediately. Mirrors native tab widgets.
const tablistEl = ref<HTMLElement | null>(null);
const onTabKeydown = (e: KeyboardEvent) => {
    const handledKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!handledKeys.includes(e.key)) return;
    e.preventDefault();
    const current = TABS.findIndex((t) => t.id === activeTab.value);
    let next = current;
    if (e.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length;
    else if (e.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    setTab(TABS[next].id);
    const buttons = tablistEl.value?.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons?.[next]?.focus();
};
const auth = useAuthStore();
const household = useHouseholdStore();
const themeStore = useThemeStore();
const prefs = usePreferencesStore();
const push = usePushStore();
const offline = useOfflineQueue();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const userName = ref(store.userName);
const newEmail = ref('');
const newPassword = ref('');
const inviteBusy = ref(false);
const avatarBusy = ref(false);
const householdNameInput = ref(household.householdName ?? '');
const renameBusy = ref(false);

watch(() => household.householdName, (val) => {
    householdNameInput.value = val ?? '';
});
const fileInput = ref<HTMLInputElement | null>(null);

watch(() => store.userName, (val) => {
    userName.value = val;
});

const themes: { name: string; color: AccentColor; bg: string }[] = [
    { name: 'Rose', color: 'rose', bg: 'bg-[#983e4b]' },
    { name: 'Blue', color: 'blue', bg: 'bg-[#3e5e98]' },
    { name: 'Green', color: 'green', bg: 'bg-[#3e9854]' },
    { name: 'Amber', color: 'amber', bg: 'bg-[#987a3e]' },
    { name: 'Purple', color: 'purple', bg: 'bg-[#7a3e98]' },
];

const inviteLink = computed(() => {
    const code = household.activeInvite?.code ?? household.inviteCode;
    return code ? `${window.location.origin}/join/${code}` : '';
});

const expiresLabel = computed(() => {
    const iso = household.activeInvite?.expires_at;
    if (!iso) return '';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'expired';
    const hrs = Math.floor(ms / 3_600_000);
    return hrs >= 1 ? `expires in ${hrs}h` : 'expires soon';
});

const updateProfile = async () => {
    if (!userName.value.trim()) {
        notify('Name cannot be empty.', 'error');
        return;
    }
    try {
        await store.updateProfile(userName.value.trim());
        notify('Profile updated successfully!', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to update profile.', 'error');
    }
};

const triggerAvatarPick = () => fileInput.value?.click();

const onAvatarChosen = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Match the allowlist in store.uploadAvatar so the user sees the right
    // error message before the file ever reaches the store. Previously the
    // broader startsWith('image/') check let SVG, TIFF, BMP etc. through,
    // which then failed in the store with a less useful message. (B75)
    const AVATAR_ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!AVATAR_ALLOWED.has(file.type)) {
        notify('Please choose a JPEG, PNG, WebP, or GIF image.', 'error');
        input.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        notify('Image too large (max 5 MB).', 'error');
        input.value = '';
        return;
    }
    avatarBusy.value = true;
    try {
        await store.uploadAvatar(file);
        notify('Avatar updated.', 'success');
    } catch (err: any) {
        notify(err.message ?? 'Failed to upload avatar.', 'error');
    } finally {
        avatarBusy.value = false;
        input.value = '';
    }
};

const removeAvatar = async () => {
    if (!(await confirm({ title: 'Remove Avatar', message: 'Remove your avatar?', isDestructive: true }))) return;
    try {
        await store.removeAvatar();
        notify('Avatar removed.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to remove avatar.', 'error');
    }
};

const changeEmail = async () => {
    const trimmed = newEmail.value.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        notify('Please enter a valid email address.', 'error');
        return;
    }
    try {
        await auth.updateEmail(trimmed);
        notify('Confirmation sent to your new email.', 'success');
        newEmail.value = '';
    } catch (e: any) {
        notify(e.message ?? 'Failed to change email.', 'error');
    }
};

const changePassword = async () => {
    if (newPassword.value.length < 8) {
        notify('Password must be at least 8 characters.', 'error');
        return;
    }
    try {
        await auth.updatePassword(newPassword.value);
        notify('Password changed.', 'success');
        newPassword.value = '';
    } catch (e: any) {
        notify(e.message ?? 'Failed to change password.', 'error');
    }
};

const renameHousehold = async () => {
    if (!householdNameInput.value.trim()) {
        notify('Household name cannot be empty.', 'error');
        return;
    }
    renameBusy.value = true;
    try {
        await household.renameHousehold(householdNameInput.value.trim());
        notify('Household renamed.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to rename household.', 'error');
    } finally {
        renameBusy.value = false;
    }
};

const regenerateInvite = async () => {
    inviteBusy.value = true;
    try {
        await household.createInvite();
        notify('New invite code generated.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to regenerate invite.', 'error');
    } finally {
        inviteBusy.value = false;
    }
};

const revokeInvites = async () => {
    if (!(await confirm({ title: 'Revoke Invites', message: 'Revoke any outstanding invites? Existing partner is not affected.', isDestructive: true }))) return;
    try {
        await household.revokeInvites();
        notify('Invites revoked.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to revoke.', 'error');
    }
};

// Clipboard API throws on non-HTTPS origins and when the permission is denied.
// Wrap both callers in try/catch with a notify() fallback so the rejection is
// surfaced as an in-app toast rather than an uncaught promise rejection. (B77)
const copyCode = async () => {
    const code = household.activeInvite?.code ?? household.inviteCode;
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        notify('Invite code copied!', 'success');
    } catch {
        notify('Could not copy — please copy the code manually.', 'error');
    }
};

const copyLink = async () => {
    if (!inviteLink.value) return;
    try {
        await navigator.clipboard.writeText(inviteLink.value);
        notify('Invite link copied!', 'success');
    } catch {
        notify('Could not copy — please copy the link manually.', 'error');
    }
};

const transferCreator = async () => {
    const target = household.partner;
    if (!target) return;
    if (!(await confirm({ title: 'Transfer Role', message: `Transfer creator role to ${store.partnerName}? You'll become the partner.`, isDestructive: true, requireTypedText: store.partnerName }))) return;
    try {
        await household.transferCreator(target.user_id);
        notify('Creator role transferred.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to transfer.', 'error');
    }
};

const removingPartner = ref(false);
const removePartner = async () => {
    const target = household.partner;
    if (!target) return;
    if (!(await confirm({ title: 'Remove Partner', message: `Remove ${store.partnerName} from your household? They will lose access to all shared data.`, isDestructive: true, requireTypedText: store.partnerName }))) return;
    removingPartner.value = true;
    try {
        await household.removeMember(target.user_id);
        notify(`${store.partnerName} removed from household.`, 'success');
        // Auto-generate a fresh invite so the reinvite flow is ready immediately.
        if (!household.activeInvite) {
            await household.createInvite();
        }
    } catch (e: any) {
        notify(e.message ?? 'Failed to remove partner.', 'error');
    } finally {
        removingPartner.value = false;
    }
};

const leaveHousehold = async () => {
    if (!(await confirm({ title: 'Leave Household', message: 'Leave this household? You will lose access to shared data. This cannot be undone.', isDestructive: true, requireTypedText: 'LEAVE' }))) return;
    try {
        await household.leaveHousehold();
        notify('You left the household.', 'success');
        router.push('/onboarding');
    } catch (e: any) {
        notify(e.message ?? 'Failed to leave.', 'error');
    }
};

const deleteAccount = async () => {
    if (!(await confirm({ title: 'Delete Account', message: 'Permanently delete your account? All your data will be removed. This cannot be undone.', isDestructive: true, requireTypedText: 'DELETE' }))) return;


    try {
        await household.deleteAccount();
        notify('Account deleted.', 'success');
        router.push('/');
    } catch (e: any) {
        notify(e.message ?? 'Failed to delete account.', 'error');
    }
};

const resetPreferences = async () => {
    if (!(await confirm({ title: 'Reset Settings', message: 'Reset categories, budget limits, and theme to defaults? Your household data (transactions, goals, todos, events) will not be touched.', isDestructive: true }))) return;
    localStorage.removeItem('tango:preferences');
    localStorage.removeItem('tango-theme'); // plugin key (was tango-dark + tango-accent)
    localStorage.removeItem('tango-dark');   // legacy key — keep for clean migration
    localStorage.removeItem('tango-accent'); // legacy key — keep for clean migration
    window.location.reload();
};

const signOut = async () => {
    try {
        await auth.logout();
        household.reset();
        router.push('/');
    } catch (e: any) {
        notify(e.message ?? 'Failed to sign out.', 'error');
    }
};

const loggingOutAll = ref(false);
const signOutAllDevices = async () => {
    if (!(await confirm({ title: 'Sign Out All', message: 'Sign out from all devices? You will need to sign in again.', isDestructive: true, requireTypedText: 'SIGNOUT' }))) return;
    loggingOutAll.value = true;
    try {
        await auth.logoutAllDevices();
        household.reset();
        router.push('/');
    } catch (e: any) {
        notify(e.message ?? 'Failed to sign out all devices.', 'error');
    } finally {
        loggingOutAll.value = false;
    }
};

const togglePush = async () => {
    try {
        if (push.subscribed) {
            await push.unsubscribe();
            notify('Push notifications disabled.', 'info');
        } else {
            await push.subscribe();
            if (push.subscribed) {
                notify('Push notifications enabled.', 'success');
            } else {
                notify('Permission denied or unsupported.', 'error');
            }
        }
    } catch (e: any) {
        notify(e.message ?? 'Push toggle failed.', 'error');
    }
};

onMounted(() => {
    push.checkSubscription();
    scrollActiveTabIntoView();
});
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="border-b-2 border-black dark:border-white pb-4">
      <h2 class="text-headline-xl">Settings</h2>
    </div>

    <!-- Section tabs — horizontally scrollable on mobile so groups stay one tap away -->
    <nav
      ref="tablistEl"
      class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
      role="tablist"
      aria-label="Settings sections"
      @keydown="onTabKeydown"
    >
      <button
        v-for="t in TABS"
        :id="'settings-tab-' + t.id"
        :key="t.id"
        role="tab"
        :aria-selected="activeTab === t.id"
        aria-controls="settings-tabpanel"
        :tabindex="activeTab === t.id ? 0 : -1"
        class="shrink-0 flex items-center gap-2 px-4 py-2 min-h-11 pixel-border-sm text-label-sm uppercase font-bold transition-colors whitespace-nowrap"
        :class="activeTab === t.id
          ? 'bg-primary text-on-primary hard-shadow-dark'
          : 'bg-surface text-on-surface-variant hover:bg-surface-variant'"
        @click="setTab(t.id)"
      >
        <span class="material-symbols-outlined text-[18px]">{{ t.icon }}</span>
        {{ t.label }}
      </button>
    </nav>

    <div
      id="settings-tabpanel"
      class="space-y-8"
      role="tabpanel"
      :aria-labelledby="'settings-tab-' + activeTab"
    >
      <TangoCard v-show="activeTab === 'profile'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Profile</h3>
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 pixel-border bg-surface-container-highest overflow-hidden flex items-center justify-center shrink-0">
              <img
                v-if="store.avatarUrl"
                :src="store.avatarUrl"
                alt="Your avatar"
                class="w-full h-full object-cover"
              />
              <span v-else class="material-symbols-outlined text-on-surface-variant text-4xl">person</span>
            </div>
            <div class="flex flex-col gap-2">
              <TangoButton :disabled="avatarBusy" size="sm" shadow="dark" @click="triggerAvatarPick">
                {{ avatarBusy ? 'Uploading…' : (store.avatarUrl ? 'Change Photo' : 'Upload Photo') }}
              </TangoButton>
              <button
                v-if="store.avatarUrl"
                type="button"
                class="text-label-sm uppercase text-error hover:underline self-start"
                @click="removeAvatar"
              >Remove</button>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onAvatarChosen" />
            </div>
          </div>

          <TangoInput v-model="userName" label="Your Name" />
          <div class="flex flex-col gap-1">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Partner</label>
            <div class="px-4 py-3 sunken-input pixel-border-sm bg-surface-variant text-on-surface-variant opacity-70">
              {{ store.partnerName }}
            </div>
            <p class="text-[10px] text-on-surface-variant uppercase mt-1">Managed by partner</p>
          </div>
          <TangoButton shadow="dark" class="mt-4" @click="updateProfile">Update Profile</TangoButton>
        </div>
      </TangoCard>

      <TangoCard v-show="activeTab === 'appearance'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Appearance</h3>
        <div class="space-y-6">
          <!-- Follow system preference (F15) -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-body-md font-bold uppercase">Follow System Theme</span>
              <p class="text-label-sm text-on-surface-variant">Auto dark/light based on OS setting</p>
            </div>
            <div
class="w-12 h-6 pixel-border-sm cursor-pointer relative transition-colors"
                 :class="themeStore.followSystem ? 'bg-primary' : 'bg-surface-variant'"
                 role="switch"
                 :aria-checked="themeStore.followSystem" @click="themeStore.setFollowSystem(!themeStore.followSystem)">
              <div
class="absolute top-1 w-4 h-4 transition-all"
                   :class="themeStore.followSystem ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>

          <!-- Manual dark mode toggle — hidden when following system -->
          <div v-if="!themeStore.followSystem" class="flex items-center justify-between">
            <span class="text-body-md font-bold uppercase">Dark Mode</span>
            <div
class="w-12 h-6 pixel-border-sm cursor-pointer relative transition-colors"
                 :class="themeStore.isDark ? 'bg-primary' : 'bg-surface-variant'"
                 role="switch"
                 :aria-checked="themeStore.isDark" @click="themeStore.toggleDark()">
              <div
class="absolute top-1 w-4 h-4 transition-all"
                   :class="themeStore.isDark ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>

          <div class="space-y-3">
            <span class="text-body-md font-bold uppercase block">Color Theme</span>
            <div class="flex flex-wrap gap-3">
                <button
                    v-for="t in themes"
                    :key="t.color"
                    class="w-10 h-10 pixel-border transition-all flex items-center justify-center relative"
                    :class="[t.bg, themeStore.accentColor === t.color ? 'scale-110 hard-shadow-dark z-10' : 'hover:scale-105']"
                    :title="t.name"
                    @click="themeStore.setAccent(t.color)"
                >
                    <span v-if="themeStore.accentColor === t.color" class="material-symbols-outlined text-white text-sm">check</span>
                </button>
            </div>
          </div>

          <EmojiCategoryEditor />
        </div>
      </TangoCard>

      <!-- Notifications — split out of Appearance so alerts live in their own group -->
      <TangoCard v-show="activeTab === 'notifications'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Notifications</h3>
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <span class="text-body-md font-bold uppercase">In-App Notifications</span>
            <div
class="w-12 h-6 pixel-border-sm cursor-pointer relative"
                 :class="prefs.notificationsEnabled ? 'bg-primary' : 'bg-surface-variant'"
                 role="switch"
                 :aria-checked="prefs.notificationsEnabled" @click="prefs.setNotificationsEnabled(!prefs.notificationsEnabled)">
              <div
class="absolute top-1 w-4 h-4 transition-all"
                   :class="prefs.notificationsEnabled ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>

          <!-- Notification category muting — only relevant when notifications are on -->
          <div v-if="prefs.notificationsEnabled" class="space-y-2 pl-2 border-l-2 border-on-surface/20">
            <p class="text-label-sm uppercase text-on-surface-variant font-bold">Mute by category</p>
            <div
v-for="cat in [
              { key: 'transaction', label: 'Budget / Transactions', icon: 'receipt_long' },
              { key: 'goal',        label: 'Goals',                 icon: 'flag' },
              { key: 'todo',        label: 'Todos',                 icon: 'task_alt' },
              { key: 'event',       label: 'Calendar Events',       icon: 'event' },
              { key: 'partner',     label: 'Partner activity',      icon: 'favorite' },
            ]" :key="cat.key" class="flex items-center justify-between py-1">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-on-surface-variant">{{ cat.icon }}</span>
                <span class="text-label-sm uppercase">{{ cat.label }}</span>
              </div>
              <div
class="w-10 h-5 pixel-border-sm cursor-pointer relative transition-colors"
                   :class="prefs.isNotifCategoryMuted(cat.key) ? 'bg-surface-variant' : 'bg-primary'"
                   role="switch"
                   :aria-checked="!prefs.isNotifCategoryMuted(cat.key)" @click="prefs.toggleNotifCategory(cat.key)">
                <div
class="absolute top-0.5 w-3.5 h-3.5 transition-all"
                     :class="prefs.isNotifCategoryMuted(cat.key) ? 'left-0.5 bg-outline' : 'right-0.5 bg-on-primary'"></div>
              </div>
            </div>
          </div>

          <!-- Quiet hours -->
          <div class="border-t border-on-surface pt-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-body-md font-bold uppercase">Quiet Hours</span>
                <p class="text-label-sm text-on-surface-variant">Suppress in-app toasts during this window</p>
              </div>
              <div
class="w-12 h-6 pixel-border-sm cursor-pointer relative transition-colors"
                   :class="prefs.quietHoursEnabled ? 'bg-primary' : 'bg-surface-variant'"
                   role="switch"
                   :aria-checked="prefs.quietHoursEnabled" @click="prefs.setQuietHours(!prefs.quietHoursEnabled)">
                <div
class="absolute top-1 w-4 h-4 transition-all"
                     :class="prefs.quietHoursEnabled ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
              </div>
            </div>
            <div v-if="prefs.quietHoursEnabled" class="flex gap-4 items-end pl-2">
              <div class="flex flex-col gap-1">
                <label class="text-label-sm text-on-surface-variant uppercase font-bold">Start</label>
                <input
                  type="time"
                  :value="prefs.quietHoursStart"
                  class="px-2 py-1 sunken-input pixel-border-sm text-body-md"
                  @change="(e) => prefs.setQuietHours(true, (e.target as HTMLInputElement).value)"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-label-sm text-on-surface-variant uppercase font-bold">End</label>
                <input
                  type="time"
                  :value="prefs.quietHoursEnd"
                  class="px-2 py-1 sunken-input pixel-border-sm text-body-md"
                  @change="(e) => prefs.setQuietHours(true, undefined, (e.target as HTMLInputElement).value)"
                />
              </div>
              <p class="text-[10px] uppercase text-on-surface-variant pb-1">Errors always show</p>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-on-surface pt-4">
            <div>
              <span class="text-body-md font-bold uppercase">Push Notifications</span>
              <p v-if="!push.supported" class="text-label-sm text-on-surface-variant">Not supported in this browser</p>
              <p v-else class="text-label-sm text-on-surface-variant">{{ push.subscribed ? 'Enabled' : 'Disabled' }}</p>
            </div>
            <div
              class="w-12 h-6 pixel-border-sm relative transition-colors"
              :class="[
                push.supported ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed',
                push.subscribed ? 'bg-primary' : 'bg-surface-variant',
              ]"
              role="switch"
              :aria-checked="push.subscribed"
              :aria-disabled="!push.supported"
              @click="push.supported && !push.busy ? togglePush() : undefined"
            >
              <div
                class="absolute top-1 w-4 h-4 transition-all"
                :class="push.subscribed ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"
              ></div>
            </div>
          </div>
        </div>
      </TangoCard>

      <TangoCard v-show="activeTab === 'household'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Household</h3>
        <div class="space-y-6">

          <!-- Household name -->
          <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div class="flex-1">
              <TangoInput v-model="householdNameInput" label="Household Name" placeholder="e.g. The Smiths" />
            </div>
            <TangoButton variant="surface" :disabled="renameBusy || !householdNameInput.trim()" @click="renameHousehold">
              {{ renameBusy ? 'Saving…' : 'Save Name' }}
            </TangoButton>
          </div>

          <div v-if="household.partner" class="space-y-3 border-t border-on-surface/20 pt-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-body-md font-bold">Paired with {{ store.partnerName }}</p>
                <p class="text-label-sm text-on-surface-variant uppercase">Role: {{ household.isCreator ? 'Creator' : 'Partner' }}</p>
              </div>
              <TangoButton v-if="household.isCreator" variant="surface" size="sm" @click="transferCreator">
                Transfer Creator
              </TangoButton>
            </div>
            <div v-if="household.isCreator" class="border-t border-on-surface/20 pt-3">
              <TangoButton :disabled="removingPartner" variant="outline" size="sm" class="text-error border-error border-2 hover:bg-error-container" @click="removePartner">
                {{ removingPartner ? 'Removing…' : `Remove ${store.partnerName}` }}
              </TangoButton>
            </div>
          </div>

          <div v-else class="space-y-4 border-t border-on-surface/20 pt-4">
            <p class="text-body-md text-on-surface-variant">Invite your partner to start sharing data.</p>

            <div v-if="household.activeInvite || household.inviteCode" class="space-y-3 flex flex-col items-center">
              <div class="bg-primary-container pixel-border-sm p-4 flex flex-col items-center gap-2 w-full text-center">
                <span class="text-headline-md font-black tracking-widest text-on-primary-container">{{ household.activeInvite?.code ?? household.inviteCode }}</span>
                <span v-if="expiresLabel" class="text-label-sm uppercase text-on-primary-container opacity-70">{{ expiresLabel }}</span>
                <div class="flex gap-3 mt-1">
                  <button class="material-symbols-outlined text-on-primary-container hover:opacity-70 transition-opacity" aria-label="Copy code" @click="copyCode">content_copy</button>
                  <button :disabled="inviteBusy" class="material-symbols-outlined text-on-primary-container hover:opacity-70 transition-opacity" aria-label="Regenerate" @click="regenerateInvite">refresh</button>
                </div>
              </div>

              <div class="flex flex-col items-center gap-2">
                <QrCode :value="inviteLink" :size="160" />
                <div class="flex gap-2 flex-wrap">
                  <button class="text-label-sm uppercase text-primary hover:underline" @click="copyLink">Copy link</button>
                  <button class="text-label-sm uppercase text-error hover:underline" @click="revokeInvites">Revoke</button>
                </div>
              </div>
            </div>

            <TangoButton v-else shadow="dark" :disabled="inviteBusy" @click="regenerateInvite">
              {{ inviteBusy ? 'Generating…' : 'Generate Invite' }}
            </TangoButton>
          </div>

          <div class="border-t border-on-surface pt-4">
            <TangoButton variant="outline" class="text-error border-error border-2 hover:bg-error-container" @click="leaveHousehold">
              Leave Household
            </TangoButton>
          </div>
        </div>
      </TangoCard>

      <TangoCard v-show="activeTab === 'account'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Account</h3>
        <div class="space-y-6">
          <div class="flex flex-col gap-2">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Current Email</label>
            <div class="px-4 py-3 sunken-input pixel-border-sm bg-surface-variant text-on-surface-variant">{{ auth.email ?? '—' }}</div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div class="flex-1">
              <TangoInput v-model="newEmail" label="Change Email" placeholder="new@email.com" />
            </div>
            <TangoButton variant="surface" :disabled="!newEmail.trim()" @click="changeEmail">Update Email</TangoButton>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div class="flex-1">
              <TangoInput v-model="newPassword" label="Change Password" type="password" placeholder="••••••••" />
            </div>
            <TangoButton variant="surface" :disabled="newPassword.length < 8" @click="changePassword">Update Password</TangoButton>
          </div>

          <div class="border-t border-on-surface pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p class="text-body-md font-bold uppercase">Active Sessions</p>
              <p class="text-label-sm text-on-surface-variant">Sign out on all devices</p>
            </div>
            <TangoButton variant="surface" :disabled="loggingOutAll" @click="signOutAllDevices">
              {{ loggingOutAll ? 'Signing out…' : 'Sign Out All Devices' }}
            </TangoButton>
          </div>

          <div class="border-t border-error/30 pt-4 space-y-2">
            <p class="text-label-sm uppercase text-error font-bold">Danger Zone</p>
            <TangoButton variant="outline" class="text-error border-error border-2 hover:bg-error-container" @click="deleteAccount">
              Delete Account
            </TangoButton>
          </div>
        </div>
      </TangoCard>

      <TangoCard v-show="activeTab === 'budget'" padding="lg">
        <h3 class="text-headline-md mb-2 border-b border-on-surface pb-2">Currency</h3>
        <p class="text-body-md text-on-surface-variant mb-4">Symbol shown next to amounts. Amounts themselves are unchanged.</p>
        <div class="flex pixel-border-sm overflow-hidden w-full max-w-[20rem]" role="group" aria-label="Currency">
          <button
            v-for="c in [['USD', '$ Dollar'], ['PHP', '₱ Peso']] as const"
            :key="c[0]"
            class="flex-1 px-4 py-2 min-h-11 text-label-sm uppercase font-bold transition-colors"
            :aria-pressed="prefs.currency === c[0]"
            :class="prefs.currency === c[0]
              ? 'bg-primary text-on-primary'
              : 'bg-surface text-on-surface-variant hover:bg-surface-variant'"
            @click="prefs.setCurrency(c[0])"
          >{{ c[1] }}</button>
        </div>
      </TangoCard>

      <TangoCard v-show="activeTab === 'budget'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Income Auto-Allocate</h3>
        <p class="text-body-md text-on-surface-variant mb-4">When income is added, automatically contribute a % to a goal.</p>
        <div v-if="store.plans.goals.filter(g => g.status !== 'Completed').length === 0" class="text-body-md text-on-surface-variant">
          No active goals. Create a goal first.
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="goal in store.plans.goals.filter(g => g.status !== 'Completed')"
            :key="goal.id"
            class="flex items-center gap-3"
          >
            <div class="flex-1">
              <p class="text-body-md font-bold truncate">{{ goal.title }}</p>
              <p class="text-label-sm text-on-surface-variant uppercase">{{ goal.progress }}% saved</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min="0"
                max="100"
                class="w-16 px-2 py-1 sunken-input pixel-border-sm text-body-md text-center"
                :value="prefs.incomeAllocations.find(a => a.goalId === goal.id)?.percent ?? 0"
                @change="(e) => { const err = prefs.setIncomeAllocation(goal.id, +(e.target as HTMLInputElement).value); if (err) notify(err, 'error'); }"
              />
              <span class="text-body-md text-on-surface-variant">%</span>
              <button
                v-if="prefs.incomeAllocations.some(a => a.goalId === goal.id)"
                class="material-symbols-outlined text-outline hover:text-error text-[18px]"
                aria-label="Remove allocation"
                @click="prefs.removeIncomeAllocation(goal.id)"
              >close</button>
            </div>
          </div>
          <p class="text-[10px] uppercase text-on-surface-variant">
            Total allocated: {{ prefs.incomeAllocations.reduce((s, a) => s + a.percent, 0) }}%
          </p>
        </div>
      </TangoCard>

      <TangoCard v-show="activeTab === 'budget'" padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Local Preferences</h3>
        <div class="space-y-6">
          <div class="flex flex-col gap-2">
            <span class="text-body-md font-bold uppercase">Default Task Assignee</span>
            <p class="text-label-sm text-on-surface-variant">Who new to-dos are assigned to by default.</p>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="opt in [['me', store.userName], ['partner', store.partnerName], ['both', 'Both']] as const"
                :key="opt[0]"
                class="flex-1 py-2 pixel-border-sm text-label-sm uppercase font-bold transition-colors"
                :class="prefs.defaultTodoAssignee === opt[0] ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
                @click="prefs.setDefaultTodoAssignee(opt[0])"
              >{{ opt[1] }}</button>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-on-surface pt-4">
            <p class="text-body-md text-on-surface-variant">Reset categories, budget limits, and theme to defaults. Household data on the server is not affected.</p>
            <TangoButton variant="outline" class="text-error border-error border-2 hover:bg-error-container whitespace-nowrap" @click="resetPreferences">Reset Preferences</TangoButton>
          </div>
        </div>
      </TangoCard>

      <TangoCard
        v-show="activeTab === 'data' && (offline.pending.length > 0 || offline.failed.length > 0)"
        padding="lg"
      >
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Sync Status</h3>

        <!-- Pending Queue -->
        <div v-if="offline.pending.length" class="space-y-3 mb-6">
          <h4 class="text-label-md uppercase font-bold text-primary">Pending Changes ({{ offline.pending.length }})</h4>
          <p class="text-label-sm text-on-surface-variant">These changes are queued in memory and will automatically sync when online.</p>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            <div v-for="item in offline.pending" :key="item.id" class="flex items-center justify-between px-3 py-2 bg-surface-variant pixel-border-sm text-label-sm">
              <div class="flex flex-col">
                <span class="font-bold uppercase">{{ item.table }} · {{ item.op }}</span>
                <span class="text-[10px] text-outline uppercase">Queued at {{ new Date(item.created_at).toLocaleTimeString() }}</span>
              </div>
              <span class="text-[10px] uppercase font-bold text-outline">Pending</span>
            </div>
          </div>
        </div>

        <!-- Failed Queue -->
        <div v-if="offline.failed.length" class="space-y-3">
          <h4 class="text-label-md uppercase font-bold text-error">Sync Alerts / Failures ({{ offline.failed.length }})</h4>
          <p class="text-label-sm text-on-surface-variant">The following updates could not be synced with the server. Review the errors and choose to retry or discard.</p>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div v-for="item in offline.failed" :key="item.id" class="p-3 bg-error-container text-on-error-container pixel-border-sm text-label-sm space-y-2">
              <div class="flex justify-between items-start">
                <div>
                  <span class="font-bold uppercase block">{{ item.table }} · {{ item.op }}</span>
                  <span class="text-[10px] opacity-70 block">Attempts: {{ item.attempts }} / 5</span>
                </div>
                <div class="flex gap-2">
                  <button class="px-2 py-0.5 pixel-border-sm bg-primary text-on-primary text-[10px] uppercase font-bold hover:opacity-90" @click="offline.retryFailed(item.id)">Retry</button>
                  <button class="px-2 py-0.5 pixel-border-sm bg-surface text-on-surface text-[10px] uppercase font-bold hover:opacity-90" @click="offline.clearFailed(item.id)">Dismiss</button>
                </div>
              </div>
              <p v-if="item.last_error" class="text-xs font-mono p-2 bg-black/10 rounded-sm border border-error/20 overflow-x-auto select-all">
                {{ item.last_error }}
              </p>
            </div>
          </div>
          <TangoButton variant="outline" class="text-error border-error border-2 hover:bg-error-container w-full mt-2" size="sm" @click="offline.clearAllFailed()">
            Dismiss All Failures
          </TangoButton>
        </div>
      </TangoCard>

      <!-- Data & Sync — friendly empty state when everything is synced -->
      <TangoCard
        v-show="activeTab === 'data' && offline.pending.length === 0 && offline.failed.length === 0"
        padding="lg"
      >
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Data &amp; Sync</h3>
        <div class="flex flex-col items-center text-center gap-3 py-6">
          <span class="material-symbols-outlined text-secondary text-5xl" style="font-variation-settings: 'FILL' 1;">cloud_done</span>
          <p class="text-body-md font-bold text-on-surface">Everything is synced</p>
          <p class="text-label-sm text-on-surface-variant w-full max-w-[24rem]">
            Changes you make are saved to the server right away. If you ever go offline, queued and
            failed changes will show up here so you can retry them.
          </p>
        </div>
      </TangoCard>
    </div>

    <div class="flex justify-center pt-8">
        <TangoButton variant="surface" shadow="dark" @click="signOut">Sign Out</TangoButton>
    </div>
  </div>
</template>
