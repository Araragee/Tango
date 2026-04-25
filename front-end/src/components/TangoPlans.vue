<script setup lang="ts">
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';

const longTermGoals = [
  { id: 1, name: 'Europe Trip', current: 4500, target: 6000, description: 'Summer 2024 Backpacking', status: 'On Track' },
  { id: 2, name: 'House Downpayment', current: 12000, target: 40000, description: 'The Dream Home Fund', status: 'Needs Attention' },
];

const shortTermGoals = [
  { id: 3, name: 'New Sofa', current: 800, target: 800, description: 'Living room upgrade', status: 'Goal Reached!' },
  { id: 4, name: 'New Laptop', current: 900, target: 1200, description: 'Work & Play Machine', status: 'On Track' },
];
</script>

<template>
  <div class="space-y-xl w-full">
    <!-- Header Section -->
    <section class="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black pb-lg gap-6 w-full">
      <div>
        <h2 class="text-headline-xl text-on-surface">Your Goals</h2>
        <p class="text-body-md text-on-surface-variant mt-sm">Keep tracking, you're doing great!</p>
      </div>
      <TangoButton shadow="dark" size="md" class="uppercase">
        <span class="material-symbols-outlined text-[16px]">add</span>
        New Goal
      </TangoButton>
    </section>

    <!-- Long Term Goals -->
    <section class="space-y-lg mt-xl w-full">
      <div class="flex items-center gap-sm mb-lg">
        <span class="material-symbols-outlined text-tertiary-container" style="font-variation-settings: 'FILL' 1;">flight_takeoff</span>
        <h3 class="text-headline-lg text-on-surface">Long-term</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-xl w-full">
        <TangoCard v-for="goal in longTermGoals" :key="goal.id" padding="lg" shadow="default" class="relative w-full">
          <div 
            class="absolute top-0 right-0 border-l-2 border-b-2 border-black px-md py-sm text-label-sm z-10"
            :class="goal.status === 'On Track' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'"
          >
            {{ goal.status }}
          </div>
          <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center pt-8 gap-2">
            <h4 class="text-headline-md text-on-surface pr-4">{{ goal.name }}</h4>
            <span class="text-body-md font-bold text-primary-container whitespace-nowrap">
              ${{ goal.current.toLocaleString() }} / ${{ goal.target.toLocaleString() }}
            </span>
          </div>
          <p class="text-body-md text-on-surface-variant mt-2">{{ goal.description }}</p>
          <div class="w-full h-6 pixel-border bg-surface-variant relative my-lg">
            <div 
              class="h-full bg-primary-container flex justify-end transition-all duration-500"
              :style="{ width: `${(goal.current / goal.target) * 100}%` }"
            >
              <div v-if="goal.current < goal.target" class="w-4 h-full bg-dither opacity-50"></div>
            </div>
          </div>
          <div class="flex justify-between text-label-sm text-outline mt-xs">
            <span>Started: Jan 2023</span>
            <span>{{ Math.round((goal.current / goal.target) * 100) }}%</span>
          </div>
        </TangoCard>
      </div>
    </section>

    <!-- Short Term Goals -->
    <section class="space-y-lg mt-xl w-full">
      <div class="flex items-center gap-sm mb-lg">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">shopping_cart</span>
        <h3 class="text-headline-lg text-on-surface">Short-term</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-xl w-full">
        <TangoCard v-for="goal in shortTermGoals" :key="goal.id" padding="lg" shadow="default" class="relative w-full">
          <div 
            class="absolute top-0 right-0 border-l-2 border-b-2 border-black px-md py-sm text-label-sm z-10"
            :class="goal.status === 'Goal Reached!' ? 'bg-secondary text-on-secondary' : 'bg-secondary-container text-on-secondary-container'"
          >
            {{ goal.status }}
          </div>
          <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center pt-8 gap-2">
            <h4 class="text-headline-md text-on-surface pr-4" :class="{ 'line-through decoration-2': goal.current === goal.target }">
              {{ goal.name }}
            </h4>
            <span class="text-body-md font-bold text-secondary whitespace-nowrap">
              ${{ goal.current.toLocaleString() }} / ${{ goal.target.toLocaleString() }}
            </span>
          </div>
          <p class="text-body-md text-on-surface-variant mt-2">{{ goal.description }}</p>
          <div class="w-full h-6 pixel-border bg-surface-variant relative my-lg">
            <div 
              class="h-full bg-secondary flex justify-end transition-all duration-500"
              :style="{ width: `${(goal.current / goal.target) * 100}%` }"
            >
              <div v-if="goal.current < goal.target" class="w-4 h-full bg-dither opacity-50"></div>
            </div>
          </div>
          <div class="flex justify-between text-label-sm text-outline mt-xs">
            <span>Started: Aug 2023</span>
            <span>{{ Math.round((goal.current / goal.target) * 100) }}%</span>
          </div>
        </TangoCard>
      </div>
    </section>
  </div>
</template>
