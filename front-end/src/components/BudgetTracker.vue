<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import BaseCard from './Base/BaseCard.vue';
import BaseIcon from './Base/BaseIcon.vue';
import BaseProgressBar from './Base/BaseProgressBar.vue';
import BaseButton from './Base/BaseButton.vue';

const store = useAppStore();
</script>

<template>
  <div class="flex flex-col gap-xl">
    <!-- Joint Balance -->
    <section class="bg-surface-container-lowest rounded-[24px] p-lg shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-surface-variant/30 flex flex-col items-center text-center relative overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-fixed to-secondary-fixed"></div>
      <p class="font-label-caps text-label-caps text-on-surface-variant uppercase mb-xs">Joint Balance</p>
      <h2 class="font-h1 text-h1 text-primary mb-md tracking-tight">${{ store.budget.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</h2>
      <div class="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full font-label-caps text-label-caps">
        <BaseIcon name="trending_up" :size="16" />
        <span>${{ store.budget.savedThisMonth }} Saved this month</span>
      </div>
    </section>

    <!-- Monthly Spending -->
    <section>
      <div class="flex justify-between items-end mb-md px-xs">
        <h3 class="font-h2 text-h2 text-on-surface">Monthly Spending</h3>
      </div>
      <div class="grid grid-cols-1 gap-md">
        <BaseCard
          v-for="item in store.budget.monthlySpending"
          :key="item.id"
          class="cursor-pointer active:scale-[0.98] transition-all duration-200 hover:shadow-[0_8px_25px_rgb(0,0,0,0.04)] group"
        >
          <div class="flex justify-between items-center mb-sm">
            <div class="flex items-center gap-sm">
              <div class="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <BaseIcon :name="item.icon" />
              </div>
              <span class="font-body-lg text-body-lg text-on-surface font-medium">{{ item.category }}</span>
            </div>
            <span class="font-body-md text-body-md text-on-surface-variant">${{ item.spent }} / ${{ item.limit }}</span>
          </div>
          <BaseProgressBar :progress="(item.spent / item.limit) * 100" />
        </BaseCard>
      </div>
      <div class="mt-md flex justify-center">
        <BaseButton variant="outline">Adjust Budgets</BaseButton>
      </div>
    </section>

    <!-- Recent Activity -->
    <section>
      <div class="flex justify-between items-center mb-md px-xs">
        <h3 class="font-h2 text-h2 text-on-surface">Recent Activity</h3>
        <button class="font-label-caps text-label-caps text-primary uppercase tracking-wide hover:text-primary-container transition-colors">
          View All
        </button>
      </div>
      <BaseCard class="p-0 overflow-hidden flex flex-col">
        <div
          v-for="(activity, index) in store.budget.recentActivity"
          :key="activity.id"
          :class="[
            'min-h-touch-target flex items-center justify-between p-md active:bg-surface-container-low transition-colors cursor-pointer group relative overflow-hidden',
            index !== store.budget.recentActivity.length - 1 ? 'border-b border-surface-variant/30' : ''
          ]"
        >
          <div class="flex items-center gap-md">
            <div class="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <BaseIcon :name="activity.icon" />
            </div>
            <div class="flex flex-col">
              <span class="font-body-lg text-body-lg text-on-surface font-medium leading-tight mb-1">{{ activity.title }}</span>
              <span class="font-label-caps text-label-caps text-outline uppercase">{{ activity.date }}</span>
            </div>
          </div>
          <div class="flex items-center gap-sm">
            <span :class="['font-body-lg text-body-lg font-medium', activity.amount > 0 ? 'text-primary' : 'text-on-surface']">
              {{ activity.amount > 0 ? '+' : '' }}${{ Math.abs(activity.amount).toFixed(2) }}
            </span>
            <BaseIcon name="chevron_right" class="text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity" :size="18" />
          </div>
        </div>
      </BaseCard>
    </section>
  </div>
</template>
