<script setup lang="ts">
import { ref } from 'vue';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import EditGoalModal from './EditGoalModal.vue';

const store = useAppStore();

const showEditModal = ref(false);
const selectedGoalId = ref<string | null>(null);
const viewType = ref<'Joint' | 'Personal'>('Joint');

const openNewGoal = () => {
    selectedGoalId.value = null;
    showEditModal.value = true;
};

const openEditGoal = (id: string) => {
    selectedGoalId.value = id;
    showEditModal.value = true;
};
</script>

<template>
  <div class="space-y-xl w-full">
    <!-- Header Section -->
    <section class="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-black dark:border-white pb-lg gap-6 w-full">
      <div>
        <div class="flex items-center gap-3">
            <h2 class="text-headline-xl text-on-surface">{{ viewType }} Goals</h2>
            <button 
                @click="viewType = viewType === 'Joint' ? 'Personal' : 'Joint'"
                class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors bg-surface-variant rounded-full p-1"
                title="Toggle View"
            >
                swap_horiz
            </button>
        </div>
        <p class="text-body-md text-on-surface-variant mt-sm">Keep tracking, you're doing great!</p>
      </div>
      <TangoButton @click="openNewGoal" shadow="dark" size="md" class="uppercase" aria-label="New Goal">
        <span class="material-symbols-outlined text-[16px]">add</span>
        New Goal
      </TangoButton>
    </section>

    <!-- Goals Grid -->
    <section class="space-y-lg mt-xl w-full">
      <div v-if="store.plans.goals.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-xl w-full">
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
            :class="goal.status === 'On Track' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'"
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
          <div class="w-full h-6 pixel-border bg-surface-variant relative my-lg">
            <div 
              class="h-full bg-primary-container flex justify-end transition-all duration-500"
              :style="{ width: `${goal.progress}%` }"
            >
              <div v-if="goal.progress < 100" class="w-4 h-full bg-dither opacity-50"></div>
            </div>
          </div>
          <div class="flex justify-between text-label-sm text-outline mt-xs items-center">
            <span>Progress</span>
            <div class="flex items-center gap-2">
              <span>{{ goal.progress }}%</span>
              <button
                @click.stop="store.deleteGoal(goal.id)"
                class="material-symbols-outlined text-outline hover:text-error transition-colors text-sm"
                aria-label="Delete goal"
              >
                delete
              </button>
            </div>
          </div>
        </TangoCard>
      </div>
      <p v-else class="text-body-md text-on-surface-variant py-8">
        No goals yet. Create one to start tracking.
      </p>
    </section>

    <EditGoalModal
        :show="showEditModal"
        :goalId="selectedGoalId"
        @close="showEditModal = false"
    />
  </div>
</template>
