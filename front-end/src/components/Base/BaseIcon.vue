<script setup lang="ts">
import { computed } from 'vue';
import * as LucideIcons from 'lucide-vue-next';

interface Props {
  name: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  strokeWidth: 2,
});

// Map material names to Lucide names if needed
const nameMap: Record<string, string> = {
  'payments': 'Wallet',
  'explore': 'Compass',
  'check_box': 'CheckSquare',
  'calendar_today': 'Calendar',
  'notifications': 'Bell',
  'trending_up': 'TrendingUp',
  'home': 'Home',
  'restaurant': 'Utensils',
  'shopping_cart': 'ShoppingCart',
  'account_balance': 'Landmark',
  'bolt': 'Zap',
  'chevron_right': 'ChevronRight',
  'chevron_left': 'ChevronLeft',
  'flight_takeoff': 'Plane',
  'pets': 'Dog',
  'add': 'Plus',
  'check': 'Check',
  'delete': 'Trash2',
  'home_work': 'Home',
  'work': 'Briefcase',
  'menu': 'Menu',
  'account_circle': 'UserCircle',
  'settings': 'Settings',
  'flag': 'Flag',
  'calendar_month': 'CalendarDays',
  'assignment': 'ClipboardList',
  'fact_check': 'FileCheck',
  'schedule': 'Clock',
  'dentistry': 'Stethoscope' // No direct dentist icon in lucide basic
};

const iconName = computed(() => {
  const mapped = nameMap[props.name] || props.name;
  // Convert to PascalCase for component lookup
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
});

const iconComponent = computed(() => (LucideIcons as any)[iconName.value] || LucideIcons.HelpCircle);
</script>

<template>
  <component
    :is="iconComponent"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
  />
</template>
