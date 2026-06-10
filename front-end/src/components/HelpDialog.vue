<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';

const props = defineProps<{
  show: boolean
}>();

const emit = defineEmits(['close']);
const route = useRoute();

const currentRoutePath = computed(() => route.path);

const getHelpContent = () => {
    const path = currentRoutePath.value;
    if (path.includes('/budget')) {
        return {
            title: 'Budget Guide',
            sections: [
                { title: 'The Rule of Two', text: 'Tango budgets are scoped to a household of 2 members. Each transaction can be tagged with who paid it.' },
                { title: 'Settle Up', text: 'If there is an imbalance in shared expenses, the Settle Up card will show who owes whom to get back to 50/50.' },
                { title: 'Categories', text: 'Customize your budget limits and emoji icons in Settings.' },
            ]
        };
    } else if (path.includes('/plans')) {
        return {
            title: 'Plans Guide',
            sections: [
                { title: 'Joint Goals', text: 'Save up for a vacation, a car, or an emergency fund together.' },
                { title: 'Contributions', text: 'Add money to a goal when you have extra cash. Tango tracks the total progress.' },
                { title: 'Vibe Check', text: 'A quick way to check in on how you both feel about your financial progress this month.' },
            ]
        };
    } else if (path.includes('/todos')) {
        return {
            title: 'To-Dos Guide',
            sections: [
                { title: 'Shared Chores', text: 'Add chores or errands. You can assign them to yourself or leave them unassigned.' },
                { title: 'Smart Handoff', text: 'If a chore is taking too long, use Smart Handoff to suggest your partner takes it over.' },
                { title: 'Shopping List', text: 'A dedicated tab for groceries and shared items. Add quantities like "Milk x 2".' },
            ]
        };
    } else if (path.includes('/calendar')) {
        return {
            title: 'Calendar Guide',
            sections: [
                { title: 'Shared Events', text: 'Add dates, trips, or appointments you both need to know about.' },
                { title: 'Date Night Planner', text: 'Click the heart icon to get AI-powered ideas for your next date night based on your budget.' },
                { title: 'Mood Tracking', text: 'Tag date nights with a mood to remember how it went.' },
            ]
        };
    }

    return {
        title: 'Tango Basics',
        sections: [
            { title: 'Household', text: 'Tango is designed for two people. Invite your partner from Settings to share data.' },
            { title: 'Offline Mode', text: 'Tango works offline! Changes are queued and sync automatically when you reconnect.' },
        ]
    };
};

const helpContent = computed(() => getHelpContent());
</script>

<template>
  <BaseModal :show="show" :title="helpContent.title" @close="emit('close')">
    <div class="space-y-6">
        <div v-for="(section, idx) in helpContent.sections" :key="idx" class="space-y-1">
            <h3 class="text-title-sm font-bold text-primary uppercase">{{ section.title }}</h3>
            <p class="text-body-md text-on-surface-variant">{{ section.text }}</p>
        </div>

        <div class="pt-4 border-t-2 border-outline-variant flex justify-end">
            <TangoButton @click="emit('close')" variant="primary">Got it</TangoButton>
        </div>
    </div>
  </BaseModal>
</template>
