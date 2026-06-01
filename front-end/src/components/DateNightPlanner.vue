<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { DATE_NIGHT_IDEAS, randomDateNightIdea, type DateNightIdea } from '../utils/dateNightIdeas';
import { useAppStore } from '../stores/useStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { localDateISO } from '../utils/dateUtils';

defineProps<{ show: boolean }>();
const emit = defineEmits(['close']);

const store = useAppStore();
const household = useHouseholdStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const filterCategory = ref<'all' | DateNightIdea['category']>('all');
const filterCost = ref<'all' | DateNightIdea['cost']>('all');
const surprise = ref<DateNightIdea | null>(null);

const date = ref(localDateISO()); // localDateISO avoids UTC offset date drift (B-UTC)
const time = ref('19:00');
const customTitle = ref('');

const ideas = computed(() => {
    return DATE_NIGHT_IDEAS.filter(i =>
        (filterCategory.value === 'all' || i.category === filterCategory.value) &&
        (filterCost.value === 'all'     || i.cost === filterCost.value)
    );
});

const surpriseMe = () => {
    surprise.value = randomDateNightIdea({
        category: filterCategory.value === 'all' ? undefined : filterCategory.value,
        cost:     filterCost.value     === 'all' ? undefined : filterCost.value,
    });
};

const scheduleIdea = async (idea: DateNightIdea) => {
    try {
        await store.addEvent({
            title: idea.title,
            date: date.value,
            time: time.value || 'All Day',
            category: 'date',
            partners: household.members.map(m => m.user_id),
            icon: 'favorite',
        });
        notify(`Date night scheduled: ${idea.title}`, 'success');
        emit('close');
    } catch (e: any) {
        notify(e.message ?? 'Failed to schedule.', 'error');
    }
};

const scheduleCustom = async () => {
    const t = customTitle.value.trim();
    if (!t) { notify('Give your date a name.', 'error'); return; }
    try {
        await store.addEvent({
            title: t,
            date: date.value,
            time: time.value || 'All Day',
            category: 'date',
            partners: household.members.map(m => m.user_id),
            icon: 'favorite',
        });
        customTitle.value = '';
        notify('Date night scheduled.', 'success');
        emit('close');
    } catch (e: any) {
        notify(e.message ?? 'Failed to schedule.', 'error');
    }
};
</script>

<template>
  <BaseModal :show="show" title="Date Night Planner" max-width="max-w-2xl" @close="emit('close')">
    <div class="flex flex-col gap-6">
      <!-- Surprise me -->
      <div class="bg-primary-container pixel-border-sm p-4 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-on-primary-container" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
          <h3 class="text-headline-md text-on-primary-container">Surprise Me</h3>
        </div>
        <div v-if="surprise" class="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface pixel-border-sm">
          <div class="flex items-center gap-3 min-w-0">
            <span class="material-symbols-outlined text-primary text-3xl">{{ surprise.icon }}</span>
            <div class="min-w-0">
              <div class="text-body-md font-bold truncate">{{ surprise.title }}</div>
              <div class="text-label-sm text-on-surface-variant uppercase">{{ surprise.category }} · {{ surprise.cost }}</div>
            </div>
          </div>
          <TangoButton @click="scheduleIdea(surprise!)" size="sm" shadow="dark">Schedule</TangoButton>
        </div>
        <TangoButton @click="surpriseMe" variant="surface" class="self-start">
          <span class="material-symbols-outlined text-[16px]">casino</span>
          {{ surprise ? 'Re-roll' : 'Pick for us' }}
        </TangoButton>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-label-sm uppercase text-on-surface-variant font-bold">Vibe</label>
          <select v-model="filterCategory" class="sunken-input px-3 py-2 text-body-md pixel-border-sm">
            <option value="all">Any</option>
            <option value="cozy">Cozy</option>
            <option value="adventure">Adventure</option>
            <option value="classic">Classic</option>
            <option value="creative">Creative</option>
            <option value="cheap">Cheap</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-label-sm uppercase text-on-surface-variant font-bold">Cost</label>
          <select v-model="filterCost" class="sunken-input px-3 py-2 text-body-md pixel-border-sm">
            <option value="all">Any</option>
            <option value="$">$</option>
            <option value="$$">$$</option>
            <option value="$$$">$$$</option>
          </select>
        </div>
      </div>

      <!-- Date/time -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TangoInput v-model="date" label="When" type="date" />
        <TangoInput v-model="time" label="Time" type="time" />
      </div>

      <!-- Ideas list -->
      <div class="space-y-1 max-h-72 overflow-y-auto">
        <div
          v-for="i in ideas"
          :key="i.id"
          class="flex flex-wrap items-center justify-between gap-2 p-2 bg-surface hover:bg-surface-variant pixel-border-sm transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="material-symbols-outlined text-primary">{{ i.icon }}</span>
            <div class="min-w-0">
              <div class="text-label-md font-bold truncate">{{ i.title }}</div>
              <div class="text-label-sm text-outline uppercase">{{ i.category }} · {{ i.cost }}</div>
            </div>
          </div>
          <TangoButton @click="scheduleIdea(i)" size="sm" variant="surface">Pick</TangoButton>
        </div>
      </div>

      <!-- Custom -->
      <div class="border-t-2 border-on-surface pt-4 space-y-2">
        <label class="text-label-sm uppercase text-on-surface-variant font-bold">Or write your own</label>
        <div class="flex justify-between gap-2 flex-wrap">
          <TangoInput v-model="customTitle" placeholder="e.g. Anniversary dinner at Luigi's" class="flex-1" />
          <TangoButton @click="scheduleCustom" shadow="dark" size="sm">Add</TangoButton>
        </div>
      </div>
    </div>

    <template #footer>
      <TangoButton @click="emit('close')" variant="surface" size="sm">Close</TangoButton>
    </template>
  </BaseModal>
</template>
