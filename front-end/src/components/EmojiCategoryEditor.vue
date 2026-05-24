<script setup lang="ts">
/**
 * EmojiCategoryEditor — F10 Settings UI for assigning an emoji to each
 * transaction category. Renders inside SettingsView's Appearance card.
 *
 * Source of truth: usePreferencesStore.categoryEmojis (persisted).
 * Render path: CategoryIcon resolves to emoji when set, otherwise the
 * material-symbols icon from CATEGORY_ICON_MAP.
 */
import { ref, computed } from 'vue';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import CategoryIcon from './CategoryIcon.vue';

const prefs = usePreferencesStore();

// Curated palette covering the common transaction categories. Users with an
// unusual need can paste any emoji into the input fallback. Keeping the list
// short (no full Unicode picker) avoids a heavy emoji-mart dependency.
const EMOJI_PALETTE = [
  '🍔', '🍕', '🥗', '🍣', '🍳', '🛒', '🥑',
  '🚗', '🚌', '✈️', '⛽', '🚲', '🛴',
  '🏠', '🛋️', '💡', '🔧', '🧹',
  '👕', '👟', '🛍️', '💄', '💍',
  '💊', '🩺', '🧘', '🏋️', '🧠',
  '🎬', '🎮', '🎵', '📚', '🎨', '🎉',
  '💼', '💰', '🪙', '📈', '💳',
  '🐶', '🐱', '🎁', '☕', '🌮', '🍺',
];

const expanded = ref<string | null>(null);
const custom = ref('');

const categories = computed(() => prefs.transactionCategories);

function toggle(cat: string) {
  expanded.value = expanded.value === cat ? null : cat;
  custom.value = '';
}

function pick(cat: string, emoji: string) {
  prefs.setCategoryEmoji(cat, emoji);
  expanded.value = null;
  custom.value = '';
}

function applyCustom(cat: string) {
  if (!custom.value.trim()) return;
  prefs.setCategoryEmoji(cat, custom.value);
  expanded.value = null;
  custom.value = '';
}

function clear(cat: string) {
  prefs.clearCategoryEmoji(cat);
}
</script>

<template>
  <div class="space-y-3 border-t border-on-surface pt-4">
    <div>
      <span class="text-body-md font-bold uppercase block">Category Emojis</span>
      <p class="text-label-sm text-on-surface-variant">
        Pick an emoji for each transaction category. Leave unset to keep the default icon.
      </p>
    </div>

    <ul class="flex flex-col gap-2">
      <li
        v-for="cat in categories"
        :key="cat"
        class="bg-surface-variant pixel-border-sm p-2"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="w-10 h-10 pixel-border-sm bg-surface flex items-center justify-center shrink-0"
            :aria-label="`Pick emoji for ${cat}`"
            @click="toggle(cat)"
          >
            <CategoryIcon :category="cat" size="text-[22px]" />
          </button>
          <span class="text-body-md font-bold uppercase flex-1 truncate">{{ cat }}</span>
          <button
            v-if="prefs.getCategoryEmoji(cat)"
            type="button"
            class="text-label-sm uppercase text-error hover:underline"
            @click="clear(cat)"
          >Reset</button>
          <button
            type="button"
            class="text-label-sm uppercase text-primary hover:underline"
            @click="toggle(cat)"
          >{{ expanded === cat ? 'Close' : 'Edit' }}</button>
        </div>

        <div v-if="expanded === cat" class="mt-3 space-y-3">
          <div class="grid grid-cols-9 gap-1 sm:grid-cols-12">
            <button
              v-for="e in EMOJI_PALETTE"
              :key="e"
              type="button"
              class="w-9 h-9 pixel-border-sm bg-surface hover:bg-primary-container text-[20px] flex items-center justify-center"
              @click="pick(cat, e)"
            >{{ e }}</button>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="custom"
              type="text"
              maxlength="4"
              placeholder="Paste any emoji"
              class="sunken-input px-3 py-2 text-body-md w-32 pixel-border-sm focus:outline-none focus:ring-1 focus:ring-primary"
              @keyup.enter="applyCustom(cat)"
            />
            <button
              type="button"
              class="text-label-sm uppercase text-primary hover:underline"
              :disabled="!custom.trim()"
              @click="applyCustom(cat)"
            >Use</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
