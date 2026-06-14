<script setup lang="ts">
import { useConfirm } from '../composables/useConfirm';

const { confirm } = useConfirm();
import { ref, inject, computed } from 'vue';
import { localDateISO } from '../utils/dateUtils';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import EditGoalModal from './EditGoalModal.vue';
import DuoBar from './DuoBar.vue';
import AchievementsCard from './AchievementsCard.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import EmptyState from './EmptyState.vue';

const PRIORITY_ORDER: Record<string, number> = { High: 0, Normal: 1, Low: 2 };

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const showEditModal = ref(false);
const selectedGoalId = ref<string | null>(null);
const activeCategory = ref<string>('All');

const openNewGoal = () => {
    selectedGoalId.value = null;
    showEditModal.value = true;
};

const openEditGoal = (id: string) => {
    selectedGoalId.value = id;
    showEditModal.value = true;
};

const upcomingDeadlines = computed(() => {
  const now = localDateISO();
  const d7 = new Date();
  d7.setDate(d7.getDate() + 7);
  const week = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
  return store.plans.goals.filter(g =>
    g.deadline && g.deadline >= now && g.deadline <= week && g.status !== 'Completed'
  ).sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));
});

const deadlineDaysLeft = (deadline: string) => {
  const diff = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
  return diff === 0 ? 'Today' : diff === 1 ? '1 day left' : `${diff} days left`;
};

const availableCategories = computed(() => {
    const cats = new Set(store.plans.goals.map(g => g.category ?? 'General'));
    return ['All', ...Array.from(cats).sort()];
});

const sortedFilteredGoals = computed(() => {
    const goals = activeCategory.value === 'All'
        ? store.plans.goals
        : store.plans.goals.filter(g => (g.category ?? 'General') === activeCategory.value);

    return [...goals].sort((a, b) => {
        // Completed always last
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (b.status === 'Completed' && a.status !== 'Completed') return -1;
        // Then by priority
        const pa = PRIORITY_ORDER[a.priority ?? 'Normal'] ?? 1;
        const pb = PRIORITY_ORDER[b.priority ?? 'Normal'] ?? 1;
        if (pa !== pb) return pa - pb;
        // Then by deadline ascending (no deadline = lowest priority)
        const da = a.deadline ?? '9999';
        const db = b.deadline ?? '9999';
        return da.localeCompare(db);
    });
});

const confirmDelete = async (id: string, title: string) => {
    if (!(await confirm({ title: 'Delete Goal', message: `Delete goal "${title}"? This cannot be undone.`, isDestructive: true }))) return;
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

    <!-- Upcoming deadline nudge -->
    <div
      v-if="upcomingDeadlines.length > 0"
      class="flex flex-col gap-2 p-4 bg-error-container pixel-border-sm"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-on-error-container text-[18px]" style="font-variation-settings: 'FILL' 1;">alarm</span>
        <span class="text-label-sm uppercase font-bold text-on-error-container">Deadlines coming up</span>
      </div>
      <div v-for="g in upcomingDeadlines" :key="g.id" class="flex items-center justify-between">
        <span class="text-body-md text-on-error-container font-bold truncate">{{ g.title }}</span>
        <span class="text-label-sm uppercase text-on-error-container shrink-0 ml-2">{{ deadlineDaysLeft(g.deadline!) }}</span>
      </div>
    </div>

    <!-- Goals Grid -->
    <section class="space-y-lg mt-xl w-full">
      <!-- Category filter tabs -->
      <div v-if="!store.loading && availableCategories.length > 2" class="flex gap-2 flex-wrap">
        <button
          v-for="cat in availableCategories"
          :key="cat"
          @click="activeCategory = cat"
          class="px-3 py-1 pixel-border-sm text-label-sm uppercase font-bold transition-colors"
          :class="activeCategory === cat ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest'"
        >{{ cat }}</button>
      </div>

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

      <div v-else-if="sortedFilteredGoals.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-xl w-full">
        <TangoCard
            v-for="goal in sortedFilteredGoals"
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

          <!-- Category + priority tags -->
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="text-[10px] uppercase px-1.5 py-0.5 bg-surface-variant text-on-surface-variant pixel-border-sm">
              {{ goal.category ?? 'General' }}
            </span>
            <span
              v-if="goal.priority && goal.priority !== 'Normal'"
              class="text-[10px] uppercase px-1.5 py-0.5 pixel-border-sm font-bold"
              :class="goal.priority === 'High' ? 'bg-error text-on-error' : 'bg-surface-variant text-on-surface-variant'"
            >{{ goal.priority }}</span>
          </div>

          <div class="my-lg">
            <DuoBar :goal-id="goal.id" :target="goal.target" :show-legend="true" />
          </div>
          <div class="flex justify-between text-label-sm text-outline mt-xs items-center">
            <div class="flex items-center gap-2">
              <span>Progress {{ goal.progress }}%</span>
              <span
                v-if="goal.deadline && goal.status !== 'Completed'"
                class="px-1.5 py-0.5 pixel-border-sm uppercase"
                :class="upcomingDeadlines.some(u => u.id === goal.id)
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-surface-variant text-on-surface-variant'"
              >
                {{ deadlineDaysLeft(goal.deadline) }}
              </span>
            </div>
            <button
              @click.stop="confirmDelete(goal.id, goal.title)"
              class="material-symbols-outlined tap-target-mobile text-[18px] text-outline hover:text-error transition-colors"
              aria-label="Delete goal"
            >
              delete
            </button>
          </div>
        </TangoCard>
      </div>
      <EmptyState
        v-else-if="!store.loading && store.plans.goals.length === 0"
        icon="savings"
        title="No goals yet"
        description="Set your first joint goal and start tracking progress together."
      >
        <TangoButton @click="openNewGoal" shadow="dark" size="sm" class="uppercase mt-2">
          <span class="material-symbols-outlined text-[16px]">add</span>
          New Goal
        </TangoButton>
      </EmptyState>
      <p v-else-if="!store.loading" class="text-body-md text-on-surface-variant">No goals in this category.</p>
    </section>

    <AchievementsCard />

    <EditGoalModal
        :show="showEditModal"
        :goalId="selectedGoalId"
        @close="showEditModal = false"
    />
  </div>
</template>
