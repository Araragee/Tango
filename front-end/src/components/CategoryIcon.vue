<script setup lang="ts">
/**
 * CategoryIcon — F10 Emoji category renderer.
 *
 * Resolution order:
 *   1. User-set emoji from usePreferencesStore (categoryEmojis)
 *   2. Explicit fallbackIcon prop (e.g. an icon already stored on a transaction)
 *   3. iconForCategory(category, txType) from the shared icon map
 *
 * Either path renders inside the same outer <span> so size/colour utility
 * classes apply consistently regardless of which branch wins.
 */
import { computed } from 'vue';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import { iconForCategory } from '../utils/categoryIcons';

const props = withDefaults(
  defineProps<{
    category: string;
    fallbackIcon?: string;
    txType?: 'expense' | 'income';
    /** Tailwind classes for sizing the glyph (applies to both branches). */
    size?: string;
    /** Material Symbols fill ('1' fills the glyph, '0' is outline). */
    fill?: '0' | '1';
  }>(),
  {
    fallbackIcon: '',
    txType: 'expense',
    size: 'text-[20px]',
    fill: '0',
  },
);

const prefs = usePreferencesStore();

const emoji = computed(() => prefs.getCategoryEmoji(props.category));

const iconName = computed(
  () => props.fallbackIcon || iconForCategory(props.category, props.txType),
);
</script>

<template>
  <span v-if="emoji" :class="['inline-flex items-center justify-center leading-none', size]">
    {{ emoji }}
  </span>
  <span
    v-else
    :class="['material-symbols-outlined', size]"
    :style="{ fontVariationSettings: `'FILL' ${fill}` }"
  >{{ iconName }}</span>
</template>
