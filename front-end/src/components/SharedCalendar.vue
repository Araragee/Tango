<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import BaseCard from './Base/BaseCard.vue';
import BaseIcon from './Base/BaseIcon.vue';

const store = useAppStore();

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const prevMonthDays = [24, 25, 26, 27, 28, 29, 30];
const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const hasEvent = (day: number) => {
  if (day === 2) return ['secondary'];
  if (day === 6) return ['primary'];
  if (day === 8) return ['primary', 'secondary'];
  if (day === 13) return ['secondary'];
  if (day === 14) return ['primary'];
  return [];
};
</script>

<template>
  <div class="space-y-xl">
    <!-- Calendar Grid Section -->
    <BaseCard class="p-md overflow-hidden relative">
      <!-- Header Controls -->
      <div class="flex justify-between items-center mb-lg">
        <h2 class="font-h2 text-h2 text-on-surface">{{ store.calendar.currentMonth }}</h2>
        <div class="flex gap-xs">
          <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low active:bg-surface-container-highest text-on-surface-variant transition-all duration-200 active:scale-95">
            <BaseIcon name="chevron_left" />
          </button>
          <button class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low active:bg-surface-container-highest text-on-surface-variant transition-all duration-200 active:scale-95">
            <BaseIcon name="chevron_right" />
          </button>
        </div>
      </div>

      <!-- Days Header -->
      <div class="grid grid-cols-7 gap-1 text-center mb-sm">
        <div v-for="day in weekDays" :key="day" class="font-label-caps text-label-caps text-outline">{{ day }}</div>
      </div>

      <!-- Calendar Grid -->
      <div class="grid grid-cols-7 gap-y-sm gap-x-1 text-center">
        <!-- Previous Month -->
        <div v-for="d in prevMonthDays" :key="'prev-'+d" class="py-2 font-body-md text-body-md text-outline/50 flex flex-col items-center justify-center h-12">
          {{ d }}
        </div>
        <!-- Current Month -->
        <div
          v-for="d in days"
          :key="d"
          class="py-2 font-body-md text-body-md text-on-surface flex flex-col items-center justify-center h-12 cursor-pointer hover:bg-surface-container-low rounded-lg transition-all duration-150 active:scale-95 relative"
          :class="{ 'font-button text-button text-on-primary bg-primary rounded-full w-10 h-10 mx-auto shadow-md ring-4 ring-primary-fixed/30': d === 12 }"
        >
          {{ d }}
          <div v-if="d !== 12 && hasEvent(d).length > 0" class="flex items-center gap-[2px] mt-1">
            <div v-for="type in hasEvent(d)" :key="type" :class="['w-1.5 h-1.5 rounded-full', type === 'primary' ? 'bg-primary' : 'bg-secondary']"></div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Upcoming Events -->
    <section class="space-y-md">
      <h3 class="font-h2 text-h2 text-on-surface px-1">Upcoming this week</h3>
      <div class="space-y-sm">
        <BaseCard
          v-for="event in store.calendar.events"
          :key="event.id"
          class="p-md flex gap-md relative overflow-hidden active:scale-[0.98] hover:shadow-md transition-all duration-200 cursor-pointer group"
        >
          <div :class="['absolute left-0 top-0 bottom-0 w-1.5 transition-all', event.category === 'date' ? 'bg-primary' : 'bg-secondary']"></div>
          <div class="flex flex-col items-center justify-center min-w-[50px] border-r border-outline-variant/20 pr-md">
            <span :class="['font-label-caps text-label-caps', event.category === 'date' ? 'text-primary' : 'text-secondary']">OCT</span>
            <span class="font-h2 text-h2 text-on-surface">{{ event.date.split('-')[2] }}</span>
          </div>
          <div class="flex-1 py-1">
            <h4 class="font-button text-button text-on-surface">{{ event.title }}</h4>
            <div class="flex items-center gap-1 mt-1 text-on-surface-variant">
              <BaseIcon name="schedule" :size="14" />
              <span class="font-body-md text-body-md text-sm">{{ event.time }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex -space-x-2">
              <div v-for="p in event.partners" :key="p" :class="['w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold', p === 'P1' ? 'bg-primary' : 'bg-secondary']">
                {{ p }}
              </div>
            </div>
            <BaseIcon :name="event.icon" :size="20" :class="event.category === 'date' ? 'text-primary' : 'text-secondary'" />
          </div>
        </BaseCard>
      </div>
    </section>
  </div>
</template>
