<script setup lang="ts">
import { ref, computed, watch, inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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

const router = useRouter();
const store = useAppStore();
const auth = useAuthStore();
const household = useHouseholdStore();
const themeStore = useThemeStore();
const prefs = usePreferencesStore();
const push = usePushStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const userName = ref(store.userName);
const newEmail = ref('');
const newPassword = ref('');
const inviteBusy = ref(false);
const avatarBusy = ref(false);
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
    if (!confirm('Remove your avatar?')) return;
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
    if (!confirm('Revoke any outstanding invites? Existing partner is not affected.')) return;
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
    if (!confirm(`Transfer creator role to ${store.partnerName}? You'll become the partner.`)) return;
    try {
        await household.transferCreator(target.user_id);
        notify('Creator role transferred.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to transfer.', 'error');
    }
};

const leaveHousehold = async () => {
    if (!confirm('Leave this household? You will lose access to shared data. This cannot be undone.')) return;
    try {
        await household.leaveHousehold();
        notify('You left the household.', 'success');
        router.push('/onboarding');
    } catch (e: any) {
        notify(e.message ?? 'Failed to leave.', 'error');
    }
};

const deleteAccount = async () => {
    if (!confirm('Permanently delete your account? All your data will be removed. This cannot be undone.')) return;
    const typed = window.prompt('Type DELETE to confirm account deletion:');
    if ((typed ?? '').trim().toUpperCase() !== 'DELETE') {
        if (typed !== null) notify('Confirmation text did not match. Account not deleted.', 'info');
        return;
    }
    try {
        await household.deleteAccount();
        notify('Account deleted.', 'success');
        router.push('/');
    } catch (e: any) {
        notify(e.message ?? 'Failed to delete account.', 'error');
    }
};

const resetPreferences = () => {
    if (!confirm('Reset categories, budget limits, and theme to defaults? Your household data (transactions, goals, todos, events) will not be touched.')) return;
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
    if (!confirm('Sign out from all devices? You will need to sign in again.')) return;
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
});
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="border-b-2 border-black dark:border-white pb-4">
      <h2 class="text-headline-xl">Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <TangoCard padding="lg">
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
              <TangoButton @click="triggerAvatarPick" :disabled="avatarBusy" size="sm" shadow="dark">
                {{ avatarBusy ? 'Uploading…' : (store.avatarUrl ? 'Change Photo' : 'Upload Photo') }}
              </TangoButton>
              <button
                v-if="store.avatarUrl"
                @click="removeAvatar"
                type="button"
                class="text-label-sm uppercase text-error hover:underline self-start"
              >Remove</button>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onAvatarChosen" />
            </div>
          </div>

          <TangoInput label="Your Name" v-model="userName" />
          <div class="flex flex-col gap-1">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Partner</label>
            <div class="px-4 py-3 sunken-input bg-surface-variant text-on-surface-variant opacity-70">
              {{ store.partnerName }}
            </div>
            <p class="text-[10px] text-on-surface-variant uppercase mt-1">Managed by partner</p>
          </div>
          <TangoButton @click="updateProfile" shadow="dark" class="mt-4">Update Profile</TangoButton>
        </div>
      </TangoCard>

      <TangoCard padding="lg">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Appearance</h3>
        <div class="space-y-6">
          <!-- Follow system preference (F15) -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-body-md font-bold uppercase">Follow System Theme</span>
              <p class="text-label-sm text-on-surface-variant">Auto dark/light based on OS setting</p>
            </div>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative transition-colors"
                 :class="themeStore.followSystem ? 'bg-primary' : 'bg-surface-variant'"
                 @click="themeStore.setFollowSystem(!themeStore.followSystem)"
                 role="switch" :aria-checked="themeStore.followSystem">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="themeStore.followSystem ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>

          <!-- Manual dark mode toggle — hidden when following system -->
          <div v-if="!themeStore.followSystem" class="flex items-center justify-between">
            <span class="text-body-md font-bold uppercase">Dark Mode</span>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative transition-colors"
                 :class="themeStore.isDark ? 'bg-primary' : 'bg-surface-variant'"
                 @click="themeStore.toggleDark()"
                 role="switch" :aria-checked="themeStore.isDark">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="themeStore.isDark ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
            </div>
          </div>

          <div class="space-y-3">
            <span class="text-body-md font-bold uppercase block">Color Theme</span>
            <div class="flex flex-wrap gap-3">
                <button
                    v-for="t in themes"
                    :key="t.color"
                    @click="themeStore.setAccent(t.color)"
                    class="w-10 h-10 pixel-border transition-all flex items-center justify-center relative"
                    :class="[t.bg, themeStore.accentColor === t.color ? 'scale-110 hard-shadow-dark z-10' : 'hover:scale-105']"
                    :title="t.name"
                >
                    <span v-if="themeStore.accentColor === t.color" class="material-symbols-outlined text-white text-sm">check</span>
                </button>
            </div>
          </div>

          <EmojiCategoryEditor />

          <div class="flex items-center justify-between border-t border-on-surface pt-4">
            <span class="text-body-md font-bold uppercase">In-App Notifications</span>
            <div class="w-12 h-6 pixel-border-sm cursor-pointer relative"
                 :class="prefs.notificationsEnabled ? 'bg-primary' : 'bg-surface-variant'"
                 @click="prefs.setNotificationsEnabled(!prefs.notificationsEnabled)"
                 role="switch" :aria-checked="prefs.notificationsEnabled">
              <div class="absolute top-1 w-4 h-4 transition-all"
                   :class="prefs.notificationsEnabled ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"></div>
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
              @click="push.supported && !push.busy ? togglePush() : undefined"
              role="switch"
              :aria-checked="push.subscribed"
              :aria-disabled="!push.supported"
            >
              <div
                class="absolute top-1 w-4 h-4 transition-all"
                :class="push.subscribed ? 'right-1 bg-on-primary' : 'left-1 bg-primary'"
              ></div>
            </div>
          </div>
        </div>
      </TangoCard>

      <TangoCard padding="lg" class="md:col-span-2">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Household</h3>
        <div class="space-y-6">
          <div v-if="household.partner" class="flex items-center justify-between">
            <div>
              <p class="text-body-md font-bold">Paired with {{ store.partnerName }}</p>
              <p class="text-label-sm text-on-surface-variant uppercase">Role: {{ household.isCreator ? 'Creator' : 'Partner' }}</p>
            </div>
            <TangoButton v-if="household.isCreator" @click="transferCreator" variant="surface" size="sm">
              Transfer Creator
            </TangoButton>
          </div>

          <div v-else class="space-y-4">
            <p class="text-body-md text-on-surface-variant">Invite your partner to start sharing data.</p>

            <div v-if="household.activeInvite || household.inviteCode" class="space-y-3 flex flex-col items-center">
              <div class="bg-primary-container pixel-border-sm p-4 flex flex-col items-center gap-2 w-full text-center">
                <span class="text-headline-md font-black tracking-widest text-on-primary-container">{{ household.activeInvite?.code ?? household.inviteCode }}</span>
                <span v-if="expiresLabel" class="text-label-sm uppercase text-on-primary-container opacity-70">{{ expiresLabel }}</span>
                <div class="flex gap-3 mt-1">
                  <button @click="copyCode" class="material-symbols-outlined text-on-primary-container hover:opacity-70 transition-opacity" aria-label="Copy code">content_copy</button>
                  <button @click="regenerateInvite" :disabled="inviteBusy" class="material-symbols-outlined text-on-primary-container hover:opacity-70 transition-opacity" aria-label="Regenerate">refresh</button>
                </div>
              </div>

              <div class="flex flex-col items-center gap-2">
                <QrCode :value="inviteLink" :size="160" />
                <div class="flex gap-2">
                  <button @click="copyLink" class="text-label-sm uppercase text-primary hover:underline">Copy link</button>
                  <button @click="revokeInvites" class="text-label-sm uppercase text-error hover:underline">Revoke</button>
                </div>
              </div>
            </div>

            <TangoButton v-else @click="regenerateInvite" shadow="dark" :disabled="inviteBusy">
              {{ inviteBusy ? 'Generating…' : 'Generate Invite' }}
            </TangoButton>
          </div>

          <div class="border-t border-on-surface pt-4">
            <TangoButton @click="leaveHousehold" variant="outline" class="text-error border-error border-2 hover:bg-error-container">
              Leave Household
            </TangoButton>
          </div>
        </div>
      </TangoCard>

      <TangoCard padding="lg" class="md:col-span-2">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Account</h3>
        <div class="space-y-6">
          <div class="flex flex-col gap-2">
            <label class="text-label-sm text-on-surface-variant uppercase font-bold">Current Email</label>
            <div class="px-4 py-3 sunken-input bg-surface-variant text-on-surface-variant">{{ auth.email ?? '—' }}</div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div class="flex-1">
              <TangoInput label="Change Email" v-model="newEmail" placeholder="new@email.com" />
            </div>
            <TangoButton @click="changeEmail" variant="surface" :disabled="!newEmail.trim()">Update Email</TangoButton>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div class="flex-1">
              <TangoInput label="Change Password" v-model="newPassword" type="password" placeholder="••••••••" />
            </div>
            <TangoButton @click="changePassword" variant="surface" :disabled="newPassword.length < 8">Update Password</TangoButton>
          </div>

          <div class="border-t border-on-surface pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p class="text-body-md font-bold uppercase">Active Sessions</p>
              <p class="text-label-sm text-on-surface-variant">Sign out on all devices</p>
            </div>
            <TangoButton @click="signOutAllDevices" variant="surface" :disabled="loggingOutAll">
              {{ loggingOutAll ? 'Signing out…' : 'Sign Out All Devices' }}
            </TangoButton>
          </div>

          <div class="border-t border-error/30 pt-4 space-y-2">
            <p class="text-label-sm uppercase text-error font-bold">Danger Zone</p>
            <TangoButton @click="deleteAccount" variant="outline" class="text-error border-error border-2 hover:bg-error-container">
              Delete Account
            </TangoButton>
          </div>
        </div>
      </TangoCard>

      <TangoCard padding="lg" class="md:col-span-2">
        <h3 class="text-headline-md mb-6 border-b border-on-surface pb-2">Local Preferences</h3>
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-body-md text-on-surface-variant">Reset categories, budget limits, and theme to defaults. Household data on the server is not affected.</p>
          <TangoButton @click="resetPreferences" variant="outline" class="text-error border-error border-2 hover:bg-error-container whitespace-nowrap">Reset Preferences</TangoButton>
        </div>
      </TangoCard>
    </div>

    <div class="flex justify-center pt-8">
        <TangoButton @click="signOut" variant="surface" shadow="dark">Sign Out</TangoButton>
    </div>
  </div>
</template>
