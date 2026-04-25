<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import BaseCard from './Base/BaseCard.vue';
import BaseIcon from './Base/BaseIcon.vue';
import BaseProgressBar from './Base/BaseProgressBar.vue';
import BaseButton from './Base/BaseButton.vue';

const store = useAppStore();
</script>

<template>
  <div class="flex flex-col gap-lg">
    <header class="flex justify-between items-end mb-sm">
      <div>
        <h2 class="font-h1 text-h1 text-on-surface">Goals</h2>
        <p class="font-body-md text-body-md text-on-surface-variant mt-xs">Tracking our shared dreams.</p>
      </div>
      <BaseButton class="flex items-center gap-xs">
        <BaseIcon name="add" :size="20" />
        <span class="hidden sm:inline">New Goal</span>
      </BaseButton>
    </header>

    <!-- Goals Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
      <BaseCard
        v-for="(goal, index) in store.plans.goals"
        :key="goal.id"
        :class="[
          'relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-transform duration-200',
          index === 0 ? 'md:col-span-2' : ''
        ]"
      >
        <div class="absolute top-0 left-0 w-1.5 h-full bg-primary shadow-[0_0_10px_rgba(107,142,174,0.6)]"></div>
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-sm">
            <div class="w-12 h-12 rounded-full bg-surface-variant/20 text-primary shadow-[0_0_15px_rgba(107,142,174,0.3)] flex items-center justify-center border border-surface-variant/30">
              <BaseIcon :name="goal.icon" />
            </div>
            <div>
              <h3 class="font-h2 text-h2 text-on-surface">{{ goal.title }}</h3>
              <p v-if="goal.description" class="font-body-md text-body-md text-on-surface-variant">{{ goal.description }}</p>
            </div>
          </div>
          <span v-if="goal.status" class="font-label-caps text-label-caps bg-primary/20 text-primary border border-primary/30 px-sm py-xs rounded-full">
            {{ goal.status }}
          </span>
        </div>

        <div class="space-y-xs mt-md">
          <div class="flex justify-between font-body-md text-body-md">
            <span class="font-semibold text-primary">${{ goal.saved.toLocaleString() }} <span class="text-on-surface-variant font-normal">saved</span></span>
            <span class="text-on-surface-variant">of ${{ goal.target.toLocaleString() }}</span>
          </div>
          <BaseProgressBar :progress="goal.progress" />
          <p class="font-body-sm text-sm text-on-surface-variant text-right">{{ goal.progress }}% Complete</p>
        </div>

        <!-- Extra details for the primary goal -->
        <div v-if="index === 0" class="mt-xs pt-md border-t border-surface-variant/30 hidden md:flex flex-col gap-sm">
          <p class="font-label-caps text-label-caps text-on-surface-variant uppercase">Recent Contributions</p>
          <div class="flex items-center gap-sm bg-surface-variant/10 rounded-lg p-sm border border-surface-variant/20">
            <div class="w-8 h-8 rounded-full overflow-hidden bg-surface-variant">
               <BaseIcon name="account_circle" />
            </div>
            <div class="flex-grow">
              <p class="font-body-md text-sm text-on-surface">Sarah added $200</p>
            </div>
            <span class="font-body-md text-sm text-on-surface-variant">2 days ago</span>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
