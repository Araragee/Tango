<script setup lang="ts">
import { ref } from 'vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useAppStore } from '../stores/useStore';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);
const store = useAppStore();

const title = ref('');
const date = ref('');
const time = ref('');
const category = ref('date');
const errors = ref({ title: '', date: '' });

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

    store.addEvent({
        title: title.value,
        date: date.value,
        time: time.value || 'All Day',
        category: category.value,
        partners: ['P1', 'P2'],
        icon: category.value === 'date' ? 'favorite' : category.value === 'bill' ? 'payments' : category.value === 'errand' ? 'shopping_cart' : 'event'
    });

    title.value = '';
    date.value = '';
    time.value = '';
    emit('close');
};
</script>

<template>
  <Transition name="sheet">
    <div v-if="show" class="fixed inset-0 z-50 flex items-end justify-center">
      <!-- Background Overlay -->
      <div class="absolute inset-0 bg-dither opacity-90" @click="emit('close')"></div>

      <!-- Sheet Container -->
      <div class="relative z-20 w-full max-w-2xl bg-surface pixel-border border-b-0 hard-shadow-dark flex flex-col p-6 rounded-t-xl">
        <div class="w-12 h-1 bg-on-surface-variant opacity-20 mx-auto mb-6 rounded-full"></div>

        <h2 class="text-headline-lg mb-6 uppercase border-b-2 border-black pb-2">New Event</h2>

        <div class="flex flex-col gap-6 overflow-y-auto max-h-[60vh] pb-8">
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

        <div class="flex gap-4 mt-auto">
            <TangoButton @click="emit('close')" variant="surface" class="flex-1" aria-label="Cancel">Cancel</TangoButton>
            <TangoButton @click="saveEvent" shadow="dark" class="flex-1" aria-label="Add to Calendar">Add to Calendar</TangoButton>
        </div>
      </div>
    </div>
  </Transition>
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
