<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAppStore } from '../stores/useStore';
import { usePreferencesStore } from '../stores/usePreferencesStore';
import SpriteCharacter, { type SpriteEmotion } from './SpriteCharacter.vue';
import { localDateISO } from '../utils/dateUtils';

/**
 * TangoSprites — the couple avatar widget.
 *
 * Reads app state (balance, goals, todos) and derives an "emotion context"
 * for both characters. Characters animate with 2-frame alternating loops
 * so the widget feels alive without being distracting.
 *
 * Usage:
 *   <TangoSprites />          — standard widget
 *   <TangoSprites size="96" /> — larger
 *   <TangoSprites :compact="true" /> — horizontal strip, no label
 */

interface Props {
  size?: number;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 88,
  compact: false,
});

const store = useAppStore();
const prefs = usePreferencesStore();

// ── Mood derivation ───────────────────────────────────────────────────────────

/** True if any category is over budget this month */
const overBudget = computed(() =>
  store.budget.monthlySpending.some(
    (cat) => cat.spent > prefs.getBudgetLimit(cat.category)
  )
);

/** 0–100 goal progress average across all goals */
const avgGoalProgress = computed(() => {
  const gs = store.plans.goals;
  if (!gs.length) return 0;
  return gs.reduce((s, g) => s + g.progress, 0) / gs.length;
});


/** Are all todos done? */
const allTodosDone = computed(
  () => store.todos.items.length > 0 && store.todos.items.every((t) => t.completed)
);

/** Is balance negative? */
const negativeBalance = computed(() => store.budget.balance < 0);

/** Recent income (money coming in) */
const hasRecentIncome = computed(() => {
  // Use localDateISO (local calendar date) not toISOString (UTC) — for UTC+
  // users at evening hours the UTC date is already tomorrow, so an income
  // transaction recorded today would never match and the 'income' mood would
  // never trigger. (B120)
  const today = localDateISO();
  return store.budget.recentActivity.some(
    (tx) => tx.type === 'income' && tx.date === today
  );
});

/** Any goal just hit 100%? */
const goalCompleted = computed(() =>
  store.plans.goals.some((g) => g.status === 'Completed')
);

// ── Mood → Emotion mapping ────────────────────────────────────────────────────

type MoodKey =
  | 'broke'        // balance < 0
  | 'over-budget'  // over any limit
  | 'goal-done'    // a goal hit 100%
  | 'all-tasks'    // all todos checked
  | 'income'       // recent income recorded
  | 'saving'       // saving well (progress > 60%)
  | 'idle'         // default / no notable event

const mood = computed((): MoodKey => {
  if (negativeBalance.value) return 'broke';
  if (overBudget.value) return 'over-budget';
  if (goalCompleted.value) return 'goal-done';
  if (allTodosDone.value && store.todos.items.length > 0) return 'all-tasks';
  if (hasRecentIncome.value) return 'income';
  if (avgGoalProgress.value > 60) return 'saving';
  return 'idle';
});

// Map mood → emotion for each character
const moodEmotionMap: Record<MoodKey, { boy: SpriteEmotion; girl: SpriteEmotion; label: string }> = {
  'broke':       { boy: 'angry',       girl: 'wallet-empty', label: "Balance is in the red! Time to hustle 💸" },
  'over-budget': { boy: 'smash',       girl: 'angry',        label: "Over budget in some categories 😤" },
  'goal-done':   { boy: 'celebrate',   girl: 'excited',      label: "A goal was completed! 🎉" },
  'all-tasks':   { boy: 'excited',     girl: 'celebrate',    label: "All tasks checked off! ✅" },
  'income':      { boy: 'money-toss',  girl: 'money-out',    label: "Money came in today 💰" },
  'saving':      { boy: 'happy',       girl: 'happy',        label: "You're saving well together 💚" },
  'idle':        { boy: 'idle',        girl: 'idle',         label: "Your Tango couple 💕" },
};

const boyEmotion = computed(() => moodEmotionMap[mood.value].boy);
const girlEmotion = computed(() => moodEmotionMap[mood.value].girl);
const moodLabel = computed(() => moodEmotionMap[mood.value].label);

// ── Bounce-in animation trigger ───────────────────────────────────────────────
const bouncing = ref(false);
let bounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(mood, () => {
  bouncing.value = true;
  if (bounceTimer) clearTimeout(bounceTimer);
  bounceTimer = setTimeout(() => (bouncing.value = false), 600);
});
</script>

<template>
  <div
    class="tango-sprites"
    :class="[compact ? 'tango-sprites--compact' : 'tango-sprites--full', bouncing && 'tango-sprites--bounce']"
  >
    <!-- Characters -->
    <div class="tango-sprites__duo">
      <!-- Boy (left, slightly lower to look like they're standing side by side) -->
      <div class="tango-sprites__char tango-sprites__char--boy">
        <SpriteCharacter
          :sheet="'/sprites/boy-sheet.png'"
          :idle="'/sprites/boy-idle.png'"
          :emotion="boyEmotion"
          :size="size"
          :animate="true"
          label="Your partner"
        />
        <span v-if="!compact" class="tango-sprites__name">{{ store.userName }}</span>
      </div>

      <!-- Girl (right, mirrored so she faces left = toward boy) -->
      <div class="tango-sprites__char tango-sprites__char--girl">
        <SpriteCharacter
          :sheet="'/sprites/girl-sheet.png'"
          :idle="'/sprites/girl-idle.png'"
          :emotion="girlEmotion"
          :size="size"
          :animate="true"
          :flip="true"
          label="Partner"
        />
        <span v-if="!compact" class="tango-sprites__name">{{ store.partnerName }}</span>
      </div>
    </div>

    <!-- Mood label -->
    <p v-if="!compact" class="tango-sprites__label">{{ moodLabel }}</p>

    <!-- Mood pill -->
    <div
      v-if="!compact"
      class="tango-sprites__mood-pill"
      :class="`tango-sprites__mood-pill--${mood}`"
    >
      <span class="tango-sprites__mood-dot" />
      {{ mood.replace('-', ' ') }}
    </div>
  </div>
</template>

<style scoped>
/* ── Container ──────────────────────────────────────────────────────────────── */
.tango-sprites {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.tango-sprites--compact {
  flex-direction: row;
  align-items: flex-end;
  gap: 4px;
}

/* ── Bounce animation on mood change ──────────────────────────────────────── */
@keyframes sprite-bounce {
  0%   { transform: translateY(0);   }
  30%  { transform: translateY(-8px);}
  55%  { transform: translateY(2px); }
  75%  { transform: translateY(-4px);}
  100% { transform: translateY(0);   }
}

.tango-sprites--bounce .tango-sprites__duo {
  animation: sprite-bounce 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

/* ── Duo row ──────────────────────────────────────────────────────────────── */
.tango-sprites__duo {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

/* ── Individual character ─────────────────────────────────────────────────── */
.tango-sprites__char {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

/* ── Name label ───────────────────────────────────────────────────────────── */
.tango-sprites__name {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-on-surface-variant, #6b7280);
  text-align: center;
  font-family: 'Press Start 2P', monospace, sans-serif;
  line-height: 1;
}

/* Fallback if Press Start 2P isn't loaded */
@supports not (font-family: 'Press Start 2P') {
  .tango-sprites__name {
    font-family: monospace;
  }
}

/* ── Mood label ───────────────────────────────────────────────────────────── */
.tango-sprites__label {
  font-size: 11px;
  color: var(--color-on-surface-variant, #6b7280);
  text-align: center;
  max-width: 160px;
  line-height: 1.3;
  margin: 0;
}

/* ── Mood pill ────────────────────────────────────────────────────────────── */
.tango-sprites__mood-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 0; /* keep pixel aesthetic */
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 2px solid currentColor;
  line-height: 1.6;
}

.tango-sprites__mood-dot {
  width: 6px;
  height: 6px;
  border-radius: 0;
  background: currentColor;
  flex-shrink: 0;
}

/* Mood color variants */
.tango-sprites__mood-pill--idle        { color: var(--color-secondary, #6a9c8a); }
.tango-sprites__mood-pill--saving      { color: #22c55e; }
.tango-sprites__mood-pill--income      { color: #3b82f6; }
.tango-sprites__mood-pill--all-tasks   { color: #a855f7; }
.tango-sprites__mood-pill--goal-done   { color: #f59e0b; }
.tango-sprites__mood-pill--over-budget { color: #ef4444; }
.tango-sprites__mood-pill--broke       { color: #dc2626; }
</style>
