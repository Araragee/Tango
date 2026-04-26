<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAppStore, type CalendarEvent } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import NewEventSheet from './NewEventSheet.vue';

const store = useAppStore();
const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const showEventSheet = ref(false);
const selectedDate = ref('');

const currentDate = ref(new Date(2023, 9, 1)); // Oct 2023 as starting default
const daysInMonth = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0).getDate());
const firstDayOffset = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1).getDay());
const monthLabel = computed(() => currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' }));

const getEventsForDay = (day: number) => {
  const y = currentDate.value.getFullYear();
  const m = String(currentDate.value.getMonth() + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return store.calendar.events.filter((e: CalendarEvent) => e.date === `${y}-${m}-${d}`);
};

const prevMonth = () => { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1); };
const nextMonth = () => { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1); };

const handleDayClick = (day: number) => {
  const y = currentDate.value.getFullYear();
  const m = String(currentDate.value.getMonth() + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  selectedDate.value = `${y}-${m}-${d}`;
  showEventSheet.value = true;
};

const syncScore = computed(() => {
  const total = store.calendar.events.length;
  if (total === 0) return 0;
  const shared = store.calendar.events.filter((e: CalendarEvent) => e.partners.length > 1).length;
  return Math.round((shared / total) * 100);
});
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-lg lg:py-12 py-6 w-full">
    <!-- Header & Controls -->
    <section class="flex flex-col md:flex-row justify-between items-start md:items-center gap-md w-full">
      <div>
        <h2 class="text-headline-lg text-primary">{{ monthLabel }}</h2>
        <p class="text-body-md text-on-surface-variant">Syncing with {{ store.partnerName }}</p>
      </div>
      <div class="flex gap-4 flex-wrap">
        <TangoButton @click="prevMonth" variant="surface" size="md" class="w-12 h-12" aria-label="Previous Month">
          <span class="material-symbols-outlined">chevron_left</span>
        </TangoButton>
        <TangoButton @click="nextMonth" variant="surface" size="md" class="w-12 h-12" aria-label="Next Month">
          <span class="material-symbols-outlined">chevron_right</span>
        </TangoButton>
        <TangoButton @click="showEventSheet = true" variant="primary" size="md" class="md:ml-4" aria-label="New Event">
          <span class="material-symbols-outlined">add</span>
          New Event
        </TangoButton>
      </div>
    </section>

    <!-- Calendar Grid -->
    <TangoCard padding="none" shadow="default" class="bg-surface-container-lowest p-1 w-full">
      <div class="grid grid-cols-7 gap-xs text-center border-b-2 border-on-surface pb-sm mb-sm bg-surface">
        <div v-for="day in weekDays" :key="day" class="text-label-sm text-on-surface uppercase">
          {{ day }}
        </div>
      </div>
      <!-- Grid Cells -->
      <div class="grid grid-cols-7 gap-[1px] bg-surface-variant">
        <!-- Empty Days -->
        <div v-for="i in firstDayOffset" :key="'empty-'+i" class="bg-surface-container-low min-h-[100px] p-xs"></div>
        
        <!-- Days -->
        <div 
          v-for="day in daysInMonth" 
          :key="day"
          class="bg-surface-container-lowest min-h-[100px] p-xs relative border border-transparent hover:border-primary-container transition-colors cursor-pointer"
          @click="handleDayClick(day)"
        >
          <span class="text-label-sm text-on-surface">{{ day }}</span>
          
          <!-- Events -->
          <div
            v-for="event in getEventsForDay(day)"
            :key="event.id"
            class="mt-xs text-[10px] p-[2px] pixel-border-sm font-bold truncate leading-none flex items-center gap-[1px]"
            :class="{
                'bg-primary-container text-on-primary-container': event.category === 'date',
                'bg-secondary-container text-on-secondary-container': event.category === 'errand',
                'bg-tertiary-container text-on-tertiary-container': event.category === 'bill',
                'bg-surface-variant': !['date', 'errand', 'bill'].includes(event.category)
            }"
          >
            <span class="material-symbols-outlined text-[10px]">{{ event.icon }}</span>
            {{ event.title }}
          </div>
        </div>
      </div>
    </TangoCard>

    <!-- Upcoming Highlights Bento -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 w-full">
      <TangoCard padding="lg" shadow="default" class="flex flex-col gap-4 w-full">
        <div class="flex items-center gap-4 border-b border-on-surface pb-4">
          <span class="material-symbols-outlined text-primary">notifications_active</span>
          <h3 class="text-headline-md text-on-surface">Coming Up</h3>
        </div>
        <ul class="space-y-4">
          <li
            v-for="event in store.calendar.events.slice(0, 3)"
            :key="event.id"
            class="flex items-center gap-4 bg-surface p-4 pixel-border-sm"
          >
            <div class="w-8 h-8 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-sm pixel-border-sm">
                {{ event.date.split('-').pop() }}
            </div>
            <div>
              <p class="text-label-sm text-on-surface">{{ event.title }}</p>
              <p class="text-[12px] text-on-surface-variant">{{ event.time }}</p>
            </div>
          </li>
        </ul>
      </TangoCard>

      <TangoCard padding="lg" shadow="default" class="bg-secondary-container flex flex-col gap-4 justify-between relative overflow-hidden w-full">
        <div class="absolute inset-0 bg-dither opacity-30 z-0"></div>
        <div class="relative z-10">
          <h3 class="text-headline-md text-on-secondary-container mb-2">Sync Score</h3>
          <p class="text-body-md text-on-secondary-container">You and {{ store.partnerName }} have {{ syncScore }}% of events in sync.</p>
        </div>
        <div class="relative z-10 w-full bg-surface-container-lowest pixel-border h-6 mt-6">
          <div class="h-full bg-secondary border-r border-on-surface flex items-center" :style="{ width: syncScore + '%' }">
            <div class="w-full h-full" style="background-image: repeating-linear-gradient(45deg, #394b3d 25%, transparent 25%, transparent 75%, #394b3d 75%, #394b3d); background-position: 0 0, 4px 4px; background-size: 8px 8px;"></div>
          </div>
        </div>
      </TangoCard>
    </section>

    <NewEventSheet :show="showEventSheet" :initialDate="selectedDate" @close="showEventSheet = false" />
  </div>
</template>
