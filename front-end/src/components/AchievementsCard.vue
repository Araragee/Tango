<script setup lang="ts">
import { computed } from 'vue';
import { useAchievementsStore } from '../stores/useAchievementsStore';
import { useAppStore, type Transaction } from '../stores/useStore';
import TangoCard from './TangoCard.vue';

const achievements = useAchievementsStore();
const store = useAppStore();

const unlockedCodes = computed(() => achievements.unlockedCodes);

function dailyStreak(txns: Transaction[]): number {
    if (txns.length === 0) return 0;
    const set = new Set(txns.map(t => t.date));
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (true) {
        const ds = cursor.toISOString().split('T')[0];
        if (set.has(ds)) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        } else break;
    }
    return streak;
}

const streak = computed(() => dailyStreak(store.budget.recentActivity as Transaction[]));

const total = computed(() => achievements.definitions.length);
const unlockedCount = computed(() => achievements.unlocked.length);
</script>

<template>
  <TangoCard padding="lg" shadow="default" class="w-full">
    <div class="flex items-center justify-between mb-4 border-b-2 border-on-background pb-2">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">military_tech</span>
        <h3 class="text-headline-md text-on-surface">Achievements</h3>
      </div>
      <span class="text-label-sm uppercase text-on-surface-variant">{{ unlockedCount }} / {{ total }}</span>
    </div>

    <div class="flex items-center gap-3 mb-4 p-3 bg-primary-container pixel-border-sm">
      <span class="material-symbols-outlined text-on-primary-container text-3xl" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
      <div>
        <div class="text-body-lg font-bold text-on-primary-container">{{ streak }}-day streak</div>
        <div class="text-label-sm text-on-primary-container">Days in a row with a logged transaction</div>
      </div>
    </div>

    <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
      <div
        v-for="def in achievements.definitions"
        :key="def.code"
        class="flex flex-col items-center text-center gap-1 p-2 pixel-border-sm transition-colors"
        :class="unlockedCodes.has(def.code) ? 'bg-secondary-container' : 'bg-surface-variant opacity-60'"
        :title="def.description"
      >
        <span
          class="material-symbols-outlined text-2xl"
          :class="unlockedCodes.has(def.code) ? 'text-on-secondary-container' : 'text-outline'"
          :style="unlockedCodes.has(def.code) ? `font-variation-settings: 'FILL' 1;` : ''"
        >{{ unlockedCodes.has(def.code) ? def.icon : 'lock' }}</span>
        <div class="w-full text-label-sm font-bold leading-tight break-words"
             :class="unlockedCodes.has(def.code) ? 'text-on-secondary-container' : 'text-on-surface-variant'">
          {{ def.title }}
        </div>
      </div>
    </div>
  </TangoCard>
</template>
