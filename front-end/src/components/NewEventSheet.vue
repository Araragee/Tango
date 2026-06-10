<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';

const { confirm } = useConfirm();
import { ref, watch, computed, inject, onMounted, onUnmounted } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore, type CalendarEvent } from '../stores/useStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { localDateISO } from '../utils/dateUtils';

const props = defineProps<{
    show: boolean;
    initialDate?: string;
    initialEventId?: string | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();
const household = useHouseholdStore();
const prefs = usePreferencesStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;
const newCategory = ref('');

const title = ref('');
const date = ref('');
const time = ref('');
const category = ref('date');
const notes = ref('');
const mood = ref<number | null>(null);
const reviewNote = ref('');
const errors = ref({ title: '', date: '' });
const editingEventId = ref<string | null>(null);

const dayEvents = computed(() => {
    if (!date.value) return [];
    return store.calendar.events.filter((e: CalendarEvent) => e.date === date.value);
});

// todayStr must stay reactive — if the app is left open past midnight the
// static const becomes stale and isPastDateEvent stops firing for events that
// just became "past", hiding the date-night review UI. Refresh on
// visibilitychange so it corrects the moment the user returns on a new day. (B98)
// Use localDateISO (local calendar date) not toISOString (UTC) — see dateUtils.ts. (B-UTC)
const todayStr = ref(localDateISO());
const _refreshToday = () => { if (document.visibilityState === 'visible') todayStr.value = localDateISO(); };
onMounted(() => document.addEventListener('visibilitychange', _refreshToday));
onUnmounted(() => document.removeEventListener('visibilitychange', _refreshToday));

const isPastDateEvent = computed(() =>
    editingEventId.value && category.value === 'date' && date.value && date.value < todayStr.value
);

watch(() => props.show, (isShown) => {
    if (isShown) {
        date.value = props.initialDate || '';
        title.value = '';
        time.value = '';
        category.value = 'date';
        notes.value = '';
        mood.value = null;
        reviewNote.value = '';
        errors.value = { title: '', date: '' };
        editingEventId.value = null;

        if (props.initialEventId) {
            const ev = store.calendar.events.find((e: CalendarEvent) => e.id === props.initialEventId);
            if (ev) {
                date.value = ev.date;
                setEditEvent(ev);
            }
        }
    }
});

const setEditEvent = (event: CalendarEvent) => {
    editingEventId.value = event.id;
    title.value = event.title;
    date.value = event.date;
    time.value = event.time === 'All Day' ? '' : event.time;
    category.value = event.category;
    notes.value = event.notes ?? '';
    mood.value = event.mood ?? null;
    reviewNote.value = event.review_note ?? '';
};

const saveBusy = ref(false);

const deleteEvent = async () => {
    if (!editingEventId.value) return;
    if (!(await confirm({ title: 'Delete Event', message: 'Delete this event?', isDestructive: true }))) return;
    saveBusy.value = true;
    try {
        await store.deleteEvent(editingEventId.value);
        emit('close');
    } catch (e: any) {
        notify(e.message ?? 'Failed to delete event.', 'error');
    } finally {
        saveBusy.value = false;
    }
};

const cancelEdit = () => {
    editingEventId.value = null;
    title.value = '';
    date.value = props.initialDate || '';
    time.value = '';
    category.value = 'date';
    notes.value = '';
    mood.value = null;
    reviewNote.value = '';
    errors.value = { title: '', date: '' };
};

const saveEvent = async () => {
    errors.value = { title: '', date: '' };
    let hasError = false;

    if (!title.value.trim()) {
        errors.value.title = 'Event name is required';
        hasError = true;
    }
    if (!date.value) {
        errors.value.date = 'Date is required';
        hasError = true;
    }
    if (hasError) return;

    const eventData = {
        title: title.value,
        date: date.value,
        time: time.value || 'All Day',
        category: category.value,
        partners: household.members.map(m => m.user_id),
        icon: ({ date: 'favorite', bill: 'payments', errand: 'shopping_cart' } as Record<string, string>)[category.value] ?? 'event',
        notes: notes.value.trim() || null,
        mood: mood.value,
        review_note: reviewNote.value.trim() || null,
    };

    saveBusy.value = true;
    try {
        if (editingEventId.value) {
            await store.editEvent(editingEventId.value, eventData);
        } else {
            await store.addEvent(eventData);
        }
    } catch (e: any) {
        notify(e.message ?? 'Failed to save event.', 'error');
        saveBusy.value = false;
        return;
    }
    saveBusy.value = false;

    title.value = '';
    date.value = '';
    time.value = '';
    category.value = 'date';
    notes.value = '';
    mood.value = null;
    reviewNote.value = '';
    emit('close');
};

const MOOD_OPTIONS: { value: number; emoji: string; label: string }[] = [
    { value: 1, emoji: '😞', label: 'Meh'   },
    { value: 2, emoji: '🙂', label: 'OK'    },
    { value: 3, emoji: '😊', label: 'Good'  },
    { value: 4, emoji: '😍', label: 'Great' },
    { value: 5, emoji: '🥰', label: 'Magic' },
];
</script>

<template>
  <BaseModal :show="show" title="Day Schedule" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <div v-if="dayEvents.length > 0" class="space-y-3">
        <h3 class="text-label-sm text-secondary uppercase font-bold border-b border-secondary pb-1">Scheduled Events</h3>
        <div class="space-y-2">
          <div
            v-for="event in dayEvents"
            :key="event.id"
            @click="setEditEvent(event)"
            class="p-3 bg-surface-container-low pixel-border-sm flex justify-between items-center cursor-pointer hover:bg-surface-variant transition-colors"
            :class="{ 'ring-2 ring-primary': editingEventId === event.id }"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-sm">{{ event.icon }}</span>
              <span class="text-body-md font-bold">{{ event.title }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-label-sm text-outline">{{ event.time }}</span>
              <span
                v-if="editingEventId === event.id"
                @click.stop="cancelEdit"
                class="material-symbols-outlined text-sm text-primary cursor-pointer hover:scale-125 transition-transform"
              >close</span>
              <span
                v-else
                class="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors"
              >edit</span>
            </div>
          </div>
        </div>
      </div>

      <div
        class="space-y-4 pt-4 transition-all duration-300 rounded-lg"
        :class="{ 'bg-primary-container/10 p-4 ring-1 ring-primary/20': editingEventId }"
      >
        <h3 class="text-label-sm uppercase font-bold border-b pb-1" :class="editingEventId ? 'text-primary border-primary/30' : 'text-on-surface-variant border-outline-variant'">
          {{ editingEventId ? 'Edit Mode: ' + title : 'Add New Event' }}
        </h3>
        <TangoInput v-model="title" label="Event Name" placeholder="e.g. Anniversary Dinner" :error="errors.title" required />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TangoInput v-model="date" label="Date" type="date" :error="errors.date" required />
          <TangoInput v-model="time" label="Time (Optional)" type="time" />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-label-sm text-on-surface-variant uppercase font-bold">Category</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="cat in prefs.eventCategories"
              :key="cat"
              @click="category = cat"
              class="px-3 py-1 pixel-border-sm text-label-sm uppercase transition-colors"
              :class="category === cat ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
            >{{ cat }}</button>
          </div>
          <div class="flex justify-between gap-2 flex-wrap mt-1">
            <TangoInput v-model="newCategory" placeholder="Add category..." class="flex-1"
              @keyup.enter="() => { if (!newCategory.trim()) return; prefs.addEventCategory(newCategory); category = newCategory.trim(); newCategory = ''; }" />
            <TangoButton size="sm" variant="outline"
              @click="() => { if (!newCategory.trim()) return; prefs.addEventCategory(newCategory); category = newCategory.trim(); newCategory = ''; }"
              aria-label="Add category">+</TangoButton>
          </div>
        </div>

        <TangoInput v-model="notes" label="Notes (optional)" placeholder="Plans, links, reservations..." />

        <!-- Post-date mood review (date events that already happened) -->
        <div v-if="isPastDateEvent" class="border-t-2 border-on-surface pt-4 space-y-3">
          <h4 class="text-label-md uppercase font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">favorite</span>
            How was it?
          </h4>
          <div class="flex flex-wrap justify-between gap-2">
            <button
              v-for="m in MOOD_OPTIONS"
              :key="m.value"
              @click="mood = m.value"
              class="flex-1 py-2 pixel-border-sm transition-all flex flex-col items-center gap-1"
              :class="mood === m.value ? 'bg-primary text-on-primary scale-110' : 'bg-surface hover:bg-surface-variant'"
            >
              <span class="text-2xl">{{ m.emoji }}</span>
              <span class="text-[10px] uppercase">{{ m.label }}</span>
            </button>
          </div>
          <TangoInput v-model="reviewNote" label="Review (optional)" placeholder="What made it special?" />
        </div>
      </div>
    </div>

    <template #footer>
      <TangoButton v-if="editingEventId" @click="deleteEvent" :disabled="saveBusy" variant="outline" class="text-error border-error mr-auto" size="sm">Delete</TangoButton>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Cancel</TangoButton>
      <TangoButton @click="saveEvent" :disabled="saveBusy" shadow="dark" size="sm">
        {{ saveBusy ? 'Saving…' : (editingEventId ? 'SAVE CHANGES' : 'ADD EVENT') }}
      </TangoButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
