<script setup lang="ts">
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-lg py-12 w-full">
    <!-- Header & Controls -->
    <section class="flex flex-col md:flex-row justify-between items-start md:items-center gap-md w-full">
      <div>
        <h2 class="text-headline-lg text-primary">October 1998</h2>
        <p class="text-body-md text-on-surface-variant">Syncing with Alex</p>
      </div>
      <div class="flex gap-4 flex-wrap">
        <TangoButton variant="surface" size="md" class="w-12 h-12">
          <span class="material-symbols-outlined">chevron_left</span>
        </TangoButton>
        <TangoButton variant="surface" size="md" class="w-12 h-12">
          <span class="material-symbols-outlined">chevron_right</span>
        </TangoButton>
        <TangoButton variant="primary" size="md" class="md:ml-4">
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
        <div v-for="i in 3" :key="'empty-'+i" class="bg-surface-container-low min-h-[100px] p-xs"></div>
        
        <!-- Days -->
        <div 
          v-for="day in days" 
          :key="day"
          class="bg-surface-container-lowest min-h-[100px] p-xs relative border border-transparent hover:border-primary-container transition-colors"
          :class="{ 'bg-primary-fixed-dim border-primary': day === 14 }"
        >
          <span class="text-label-sm text-on-surface" :class="{ 'font-bold': day === 14 }">{{ day }}</span>
          
          <!-- Example Events -->
          <div v-if="day === 2" class="mt-xs bg-secondary-container text-on-secondary-container text-[10px] p-[2px] pixel-border-sm font-bold truncate leading-none">
            Rent Due
          </div>
          <div v-if="day === 7" class="mt-xs bg-primary-container text-on-primary-container text-[10px] p-[2px] pixel-border-sm font-bold truncate flex items-center gap-[2px] leading-none">
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
            Date Night
          </div>
          <div v-if="day === 11" class="mt-xs bg-tertiary-container text-on-tertiary-container text-[10px] p-[2px] pixel-border-sm font-bold truncate flex items-center gap-[2px] leading-none">
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
            Budget Sync
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
          <li class="flex items-center gap-4 bg-surface p-4 pixel-border-sm">
            <div class="w-8 h-8 bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-sm pixel-border-sm">7</div>
            <div>
              <p class="text-label-sm text-on-surface">Date Night: Pizza & Movies</p>
              <p class="text-[12px] text-on-surface-variant">7:00 PM</p>
            </div>
          </li>
          <li class="flex items-center gap-4 bg-surface p-4 pixel-border-sm">
            <div class="w-8 h-8 bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-label-sm pixel-border-sm">11</div>
            <div>
              <p class="text-label-sm text-on-surface">Monthly Budget Sync</p>
              <p class="text-[12px] text-on-surface-variant">10:00 AM</p>
            </div>
          </li>
        </ul>
      </TangoCard>

      <TangoCard padding="lg" shadow="default" class="bg-secondary-container flex flex-col gap-4 justify-between relative overflow-hidden w-full">
        <div class="absolute inset-0 bg-dither opacity-30 z-0"></div>
        <div class="relative z-10">
          <h3 class="text-headline-md text-on-secondary-container mb-2">Sync Score</h3>
          <p class="text-body-md text-on-secondary-container">You and Alex are perfectly aligned this month. Keep it up!</p>
        </div>
        <div class="relative z-10 w-full bg-surface-container-lowest pixel-border h-6 mt-6">
          <div class="h-full bg-secondary border-r border-on-surface w-[85%] flex items-center">
            <div class="w-full h-full" style="background-image: repeating-linear-gradient(45deg, #394b3d 25%, transparent 25%, transparent 75%, #394b3d 75%, #394b3d); background-position: 0 0, 4px 4px; background-size: 8px 8px;"></div>
          </div>
        </div>
      </TangoCard>
    </section>
  </div>
</template>
