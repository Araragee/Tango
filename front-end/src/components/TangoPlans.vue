<script setup lang="ts">
import { ref, inject } from 'vue';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import EditGoalModal from './EditGoalModal.vue';
import DuoBar from './DuoBar.vue';
import AchievementsCard from './AchievementsCard.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import EmptyState from './EmptyState.vue';

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const showEditModal = ref(false);
const selectedGoalId = ref<string | null>(null);

const openNewGoal = () => {
    selectedGoalId.value = null;
    showEditModal.value = true;
};

const openEditGoal = (id: string) => {
    selectedGoalId.value = id;
    showEditModal.value = true;
};

const confirmDelete = async (id: string, title: string) => {
    if (!confirm(`Delete goal "${title}"? This cannot be undone.`)) return;
    try {
        await store.deleteGoal(id);
        notify('Goal deleted.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to delete goal.', 'error');
    }
};
</script>

<template>
  <div class="space-y-xl w-full">
    <!-- Header Section -->
    <section class="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black dark:border-white pb-lg gap-6 w-full">
      <div>
        <h2 class="text-headline-xl text-on-surface">Joint Goals</h2>
        <p class="text-body-md text-on-surface-variant mt-sm">Keep tracking, you're doing great!</p>
      </div>
      <TangoButton @click="openNewGoal" shadow="dark" size="md" class="uppercase" aria-label="New Goal">
        <span class="material-symbols-outlined text-[16px]">add</span>
        New Goal
      </TangoButton>
    </section>

    <!-- Goals Grid -->
    <section class="space-y-lg mt-xl w-full">
      <!-- Loading skeleton -->
      <div v-if="store.loading" class="grid grid-cols-1 md:grid-cols-2 gap-xl w-full">
        <TangoCard v-for="n in 2" :key="n" padding="lg" shadow="default" class="w-full space-y-4">
          <div class="flex justify-between items-center pt-2">
            <SkeletonBlock width="50%" height="1.25rem" />
            <SkeletonBlock width="5rem" height="1rem" />
          </div>
          <SkeletonBlock height="0.75rem" width="80%" />
          <SkeletonBlock height="1.5rem" />
          <div class="flex justify-between">
            <SkeletonBlock width="3rem" height="0.75rem" />
            <SkeletonBlock width="2rem" height="0.75rem" />
          </div>
        </TangoCard>
      </div>

      <div v-else-if="store.plans.goals.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-xl w-full">
        <TangoCard
            v-for="goal in store.plans.goals"
            :key="goal.id"
            padding="lg"
            shadow="default"
            class="relative w-full cursor-pointer hover:bg-surface-container-low transition-colors"
            @click="openEditGoal(goal.id)"
        >
          <div
            v-if="goal.status"
            class="absolute top-0 right-0 border-l-2 border-b-2 border-black dark:border-white px-md py-sm text-label-sm z-10"
            :class="{
              'bg-secondary-container text-on-secondary-container': goal.status === 'Completed',
              'bg-primary-container text-on-primary-container': goal.status === 'On Track',
              'bg-error-container text-on-error-container': goal.status === 'Behind',
            }"
          >
            {{ goal.status }}
          </div>
          <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center pt-8 gap-2">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary">{{ goal.icon }}</span>
                <h4 class="text-headline-md text-on-surface pr-4">{{ goal.title }}</h4>
            </div>
            <span class="text-body-md font-bold text-primary-container whitespace-nowrap">
              ${{ goal.saved.toLocaleString() }} / ${{ goal.target.toLocaleString() }}
            </span>
          </div>
          <p class="text-body-md text-on-surface-variant mt-2">{{ goal.description }}</p>
          <div class="my-lg">
            <DuoBar :goal-id="goal.id" :target="goal.target" :show-legend="true" />
          </div>
          <div class="flex justify-between text-label-sm text-outline mt-xs items-center">
            <span>Progress</span>
            <div class="flex items-center gap-2">
              <span>{{ goal.progress }}%</span>
              <button
                @click.stop="confirmDelete(goal.id, goal.title)"
                class="material-symbols-outlined text-outline hover:text-error transition-colors text-sm"
                aria-label="Delete goal"
              >
                delete
              </button>
            </div>
          </div>
        </TangoCard>
      </div>
      <EmptyState
        v-else
        icon="savings"
        title="No goals yet"
        description="Set your first joint goal and start tracking progress together."
      >
        <TangoButton @click="openNewGoal" shadow="dark" size="sm" class="uppercase mt-2">
          <span class="material-symbols-outlined text-[16px]">add</span>
          New Goal
        </TangoButton>
      </EmptyState>
    </section>

    <AchievementsCard />

    <EditGoalModal
        :show="showEditModal"
        :goalId="selectedGoalId"
        @close="showEditModal = false"
    />
  </div>
</template>
