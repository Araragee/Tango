<script lang="ts">
// Types exported here so other components can import them
export type SpriteEmotion =
  | 'idle'
  | 'crossed'
  | 'angry'
  | 'excited'
  | 'happy'
  | 'hug'
  | 'celebrate'
  | 'money-out'
  | 'money-toss'
  | 'wallet-empty'
  | 'smash'
  | 'tired'
  | 'sleeping'
  | 'sleep-lying'
export default {};
</script>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';

/**
 * SpriteCharacter — renders a single character from a sprite sheet.
 *
 * Sprite sheets are 4-column × 4-row grids of individual emotion/pose frames.
 * We pick a frame (row, col) and optionally animate between a range of frames
 * using CSS `steps()` — producing a classic pixel-art animation effect.
 *
 * Frame layout (0-indexed, left-to-right, top-to-bottom):
 *   [0,0] [0,1] [0,2] [0,3]
 *   [1,0] [1,1] [1,2] [1,3]
 *   [2,0] [2,1] [2,2] [2,3]
 *   [3,0] [3,1] [3,2] [3,3]
 */



interface Props {
  /** Path to the sprite sheet PNG (4×4 grid) */
  sheet: string;
  /** Path to the standalone idle/standing PNG */
  idle?: string;
  /** Which emotion to display */
  emotion?: SpriteEmotion;
  /** Rendered size in px (sprite is square) */
  size?: number;
  /** Whether to auto-animate between frames of the chosen emotion */
  animate?: boolean;
  /** Flip horizontally (mirror) */
  flip?: boolean;
  /** Label for accessibility */
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  emotion: 'idle',
  size: 80,
  animate: true,
  flip: false,
  label: 'character sprite',
});

/**
 * Map emotion → sprite sheet frame(s).
 * Each entry is [row, col] (0-indexed), and optionally an array for multi-frame animations.
 *
 * Boy sprite sheet layout (observed from image):
 *  Row 0: [0,0]=crossed-arms  [0,1]=angry       [0,2]=excited+hearts [0,3]=happy-smile
 *  Row 1: [1,0]=crossed-arms2 [1,1]=hug-hearts  [1,2]=celebrate      [1,3]=crossed-arms3
 *  Row 2: [2,0]=crossed-mild  [2,1]=money-toss  [2,2]=money-out      [2,3]=tired
 *  Row 3: [3,0]=smash1        [3,1]=smash2      [3,2]=sleeping-stand [3,3]=sleep-lying
 *
 * Girl sprite sheet (same structure, different poses):
 *  Row 0: [0,0]=angry-stomp   [0,1]=crossed     [0,2]=excited-hearts [0,3]=happy-jump
 *  Row 1: [1,0]=crossed-sad   [1,1]=money-grab  [1,2]=money-toss     [1,3]=coins-drop
 *  Row 2: [2,0]=upset         [2,1]=wallet-sad  [2,2]=wallet-empty   [2,3]=wallet-full
 *  Row 3: [3,0]=tired1        [3,1]=tired2      [3,2]=sleep-lying1   [3,3]=sleep-lying2
 */
type FrameMap = Record<SpriteEmotion, [number, number][]>;

const emotionFramesMap: FrameMap = {
  'idle':         [[0, 0]],                        // fallback to sheet frame
  'crossed':      [[0, 0], [1, 0]],
  'angry':        [[0, 1], [0, 0]],
  'excited':      [[0, 2], [1, 2]],
  'happy':        [[0, 3], [0, 2]],
  'hug':          [[1, 1], [1, 2]],
  'celebrate':    [[0, 2], [1, 2], [0, 3]],
  'money-out':    [[2, 1], [2, 2]],
  'money-toss':   [[2, 2], [2, 1]],
  'wallet-empty': [[3, 0], [3, 1]],
  'smash':        [[3, 0], [3, 1]],
  'tired':        [[2, 3], [3, 0]],
  'sleeping':     [[3, 2], [3, 3]],
  'sleep-lying':  [[3, 3], [3, 2]],
};

// Animation frame index
const frameIndex = ref(0);
let animTimer: ReturnType<typeof setInterval> | null = null;

const frames = computed(() => emotionFramesMap[props.emotion] ?? [[0, 0]]);

function startAnimation() {
  stopAnimation();
  if (!props.animate || frames.value.length <= 1) return;
  animTimer = setInterval(() => {
    frameIndex.value = (frameIndex.value + 1) % frames.value.length;
  }, 400); // ~2.5fps — classic retro feel
}

function stopAnimation() {
  if (animTimer) {
    clearInterval(animTimer);
    animTimer = null;
  }
  frameIndex.value = 0;
}

watch(() => [props.emotion, props.animate], () => {
  frameIndex.value = 0;
  startAnimation();
}, { immediate: true });

onUnmounted(() => stopAnimation());

// If the standalone idle PNG fails to load (missing/placeholder URL), fall back
// to cropping the idle frame from the sprite sheet instead of showing a broken img.
const idleFailed = ref(false);
watch(() => props.idle, () => { idleFailed.value = false; });

// Whether we show the standalone idle image or the sheet
const showIdleImage = computed(() =>
  props.emotion === 'idle' && !!props.idle && !idleFailed.value
);

// Current frame coordinates
const currentFrame = computed(() => {
  const f = frames.value;
  return f[Math.min(frameIndex.value, f.length - 1)];
});

// Sprite sheet is 4 cols × 4 rows → each cell = 25% of sheet dimensions
// We use background-size: 400% 400% (4×4) and background-position steps
const bgPosition = computed(() => {
  const [row, col] = currentFrame.value;
  // background-position as % — col 0 = 0%, col 1 = 33.33%, col 2 = 66.66%, col 3 = 100%
  const x = (col / 3) * 100;
  const y = (row / 3) * 100;
  return `${x}% ${y}%`;
});
</script>

<template>
  <div
    class="sprite-character"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      transform: flip ? 'scaleX(-1)' : undefined,
    }"
    :aria-label="label"
    role="img"
  >
    <!-- Idle: show the standalone image -->
    <img
      v-if="showIdleImage"
      :src="idle"
      :alt="label"
      class="w-full h-full object-contain"
      style="image-rendering: pixelated;"
      @error="idleFailed = true"
    />

    <!-- Emotion: crop from sprite sheet -->
    <div
      v-else
      class="sprite-frame"
      :style="{
        width: '100%',
        height: '100%',
        backgroundImage: `url('${sheet}')`,
        backgroundSize: '400% 400%',
        backgroundPosition: bgPosition,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        transition: 'background-position 0.05s steps(1)',
      }"
    />
  </div>
</template>

<style scoped>
.sprite-character {
  display: inline-block;
  flex-shrink: 0;
}
.sprite-frame {
  display: block;
}
</style>
