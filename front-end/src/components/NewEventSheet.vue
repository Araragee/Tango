<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore, type CalendarEvent } from '../stores/useStore';

const props = defineProps<{ 
    show: boolean;
    initialDate?: string;
    initialEventId?: string | null;
}>();
const emit = defineEmits(['close']);
const store = useAppStore();

const title = ref('');
const date = ref('');
const time = ref('');
const category = ref('date');
const errors = ref({ title: '', date: '' });
const editingEventId = ref<string | null>(null);

const dayEvents = computed(() => {
    if (!date.value) return [];
    return store.calendar.events.filter((e: CalendarEvent) => e.date === date.value);
});

watch(() => props.show, (isShown) => {
    if (isShown) {
        date.value = props.initialDate || '';
        title.value = '';
        time.value = '';
        category.value = 'date';
        errors.value = { title: '', date: '' };
        editingEventId.value = null;

        if (props.initialEventId) {
            const ev = store.calendar.events.find((e: CalendarEvent) => e.id === props.initialEventId);
            if (ev) {
                date.value = ev.date;
                // Wait for the next tick or just set it
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
};

const deleteEvent = () => {
    if (editingEventId.value && confirm('Delete this event?')) {
        store.deleteEvent(editingEventId.value);
        emit('close');
    }
};

const cancelEdit = () => {
    editingEventId.value = null;
    title.value = '';
    date.value = props.initialDate || '';
    time.value = '';
    category.value = 'date';
    errors.value = { title: '', date: '' };
};

const saveEvent = () => {
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
        partners: ['P1', 'P2'],
        icon: category.value === 'date' ? 'favorite' : category.value === 'bill' ? 'payments' : category.value === 'errand' ? 'shopping_cart' : 'event'
    };

    if (editingEventId.value) {
        store.editEvent(editingEventId.value, eventData);
    } else {
        store.addEvent(eventData);
    }

    title.value = '';
    date.value = '';
    time.value = '';
    category.value = 'date';
    emit('close');
};
</script>

<template>
  <BaseModal :show="show" title="Day Schedule" @close="emit('close')">
    <div class="flex flex-col gap-6">
        <!-- Existing Events -->
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
                        <div class="relative w-5 h-5 flex items-center justify-center">
                            <Transition name="icon-pop" mode="out-in">
                                <span 
                                    v-if="editingEventId === event.id" 
                                    key="close"
                                    @click.stop="cancelEdit"
                                    class="material-symbols-outlined text-sm text-primary cursor-pointer hover:scale-125 transition-transform"
                                >
                                    close
                                </span>
                                <span 
                                    v-else 
                                    key="edit"
                                    class="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors"
                                >
                                    edit
                                </span>
                            </Transition>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div 
            class="space-y-4 pt-4 transition-all duration-300 rounded-lg"
            :class="{ 'bg-primary-container bg-opacity-10 p-4 ring-1 ring-primary ring-opacity-20': editingEventId }"
        >
            <h3 class="text-label-sm uppercase font-bold border-b pb-1" :class="editingEventId ? 'text-primary border-primary border-opacity-30' : 'text-on-surface-variant border-outline-variant'">
                {{ editingEventId ? 'Edit Mode: ' + title : 'Add New Event' }}
            </h3>
            <TangoInput v-model="title" label="Event Name" placeholder="e.g. Anniversary Dinner" :error="errors.title" required />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TangoInput v-model="date" label="Date" type="date" :error="errors.date" required />
                <TangoInput v-model="time" label="Time (Optional)" type="time" />
            </div>

            <div class="flex flex-col gap-2">
                <label class="text-label-sm text-on-surface-variant uppercase font-bold">Category</label>
                <div class="flex gap-4 flex-wrap">
                    <button
                        v-for="cat in ['date', 'errand', 'bill', 'other']"
                        :key="cat"
                        @click="category = cat"
                        class="px-4 py-2 pixel-border-sm text-label-sm uppercase transition-colors"
                        :class="category === cat ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant'"
                        :aria-label="'Select ' + cat + ' category'"
                        :aria-pressed="category === cat"
                    >
                        {{ cat }}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <template #footer>
        <TangoButton v-if="editingEventId" @click="deleteEvent" variant="outline" class="text-error border-error mr-auto" size="sm" aria-label="Delete Event">Delete</TangoButton>
        <TangoButton @click="emit('close')" variant="surface" size="sm" aria-label="Cancel">Cancel</TangoButton>
        <TangoButton @click="saveEvent" shadow="dark" size="sm" :aria-label="editingEventId ? 'Save Changes' : 'Add to Calendar'">
            {{ editingEventId ? 'SAVE CHANGES' : 'ADD EVENT' }}
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

.icon-pop-enter-active,
.icon-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icon-pop-enter-from {
  opacity: 0;
  transform: scale(0.5) rotate(-90deg);
}

.icon-pop-leave-to {
  opacity: 0;
  transform: scale(0.5) rotate(90deg);
}
</style>
