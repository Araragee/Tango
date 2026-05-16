<script setup lang="ts">
import { computed } from 'vue';
import { usePresenceStore } from '../stores/usePresenceStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';

interface Props {
    userId?: string;
    showLabel?: boolean;
}
const props = withDefaults(defineProps<Props>(), { showLabel: false });

const presence = usePresenceStore();
const household = useHouseholdStore();

const targetId = computed(() => props.userId ?? household.partner?.user_id ?? null);
const online = computed(() => targetId.value ? presence.isUserOnline(targetId.value) : false);
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span
      class="w-2.5 h-2.5 pixel-border-sm transition-colors"
      :class="online ? 'bg-primary' : 'bg-outline'"
      :title="online ? 'Online' : 'Offline'"
    ></span>
    <span v-if="showLabel" class="text-label-sm uppercase">
      {{ online ? 'Online' : 'Offline' }}
    </span>
  </span>
</template>
