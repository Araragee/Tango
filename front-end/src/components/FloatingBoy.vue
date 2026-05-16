<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

type Direction = 'front' | 'back' | 'left' | 'right';

const direction = ref<Direction>('front');
const frame = ref(0); // 0, 1, 2, 3 for walk cycle
const isVisible = ref(true);

// Pixel Colors
const colors = {
  H: '#5d4037', // Hair
  S: '#ffccbc', // Skin
  R: '#e53935', // Red
  B: '#1e88e5', // Blue
  W: '#ffffff', // White
  K: '#212121', // Black
  '.': 'transparent'
};

/**
 * Enhanced 12x16 Pixel Maps
 * We define "Parts" to easily animate them (e.g., bobbing head)
 */
const getFrame = (dir: Direction, f: number) => {
  const isStep = f === 1 || f === 3;
  const side = f === 1 ? 'L' : 'R';
  const bob = isStep ? 1 : 0; // Torso/Head bob down on steps

  // Basic Front Template
  if (dir === 'front') {
    const hair = "....HHHHH..." + "...HHHHHHH..";
    const face = "..HSSSSSSSH." + "..HSKSSSKSH." + "..HSSSSSSSH.";
    const neck = "...SSSSSSS..";
    const body = "...RRRRRRR.." + "..RRBRRRRRR." + ".RRRRRRRRRR." + "..RRRRRRRR..";
    const hips = "...BBBBBBB..";
    
    // Animate legs
    let legs = "";
    if (!isStep) {
      legs = "..BBBBBBBBB." + "...BB...BB.." + "...BB...BB.." + "...WW...WW.." + "...RR...RR..";
    } else if (side === 'L') {
      legs = "..BBBBBBBBB." + "...BBBB.BB.." + "...BBBB.BB.." + "...WWWW.WW.." + "...RRRR.RR..";
    } else {
      legs = "..BBBBBBBBB." + "...BB.BBBB.." + "...BB.BBBB.." + "...WW.WWWW.." + "...RR.RRRR..";
    }

    // Assemble with bob
    const padding = ".".repeat(12 * bob);
    const result = padding + hair + face + neck + body + hips + legs;
    return result.padEnd(12 * 18, '.').slice(0, 12 * 18);
  }

  if (dir === 'back') {
    const hair = "....HHHHH..." + "...HHHHHHH.." + "..HHHHHHHHH." + "..HHHHHHHHH." + "..HHHHHHHHH.";
    const neck = "...HHHHHHH..";
    const body = "...RRRRRRR.." + "..RRRRRRRRR." + ".RRRRRRRRRR." + "..RRRRRRRR..";
    const hips = "...BBBBBBB..";
    
    let legs = "";
    if (!isStep) {
      legs = "..BBBBBBBBB." + "...BB...BB.." + "...BB...BB.." + "...WW...WW.." + "...RR...RR..";
    } else if (side === 'L') {
      legs = "..BBBBBBBBB." + "...BBBB.BB.." + "...BBBB.BB.." + "...WWWW.WW.." + "...RRRR.RR..";
    } else {
      legs = "..BBBBBBBBB." + "...BB.BBBB.." + "...BB.BBBB.." + "...WW.WWWW.." + "...RR.RRRR..";
    }

    const padding = ".".repeat(12 * bob);
    return (padding + hair + neck + body + hips + legs).padEnd(12 * 18, '.').slice(0, 12 * 18);
  }

  if (dir === 'left' || dir === 'right') {
    const isRight = dir === 'right';
    // Simplified Side Profile
    const hair = isRight ? "....HHHH...." : "....HHHH....";
    const face = isRight ? "...SSSSHHH.." : "..HHHSSSS..." ;
    const eye  = isRight ? "..SSSKSSHH.." : "..HHSSSKSS..";
    const head = hair + face + eye + (isRight ? "...SSSSHH..." : "..HHSSSS....") + (isRight ? "...SSSSS...." : "....SSSSS...");
    const body = (isRight ? "...RRRRR...." : "....RRRRR...") + (isRight ? "...RRBRR...." : "....RRBRR...") + (isRight ? "...RRRRR...." : "....RRRRR...");
    const hips = isRight ? "....BBB....." : ".....BBB....";
    
    let legs = "";
    if (!isStep) {
      legs = (isRight ? "...BBBBB...." : "....BBBBB...") + (isRight ? "....B..B...." : ".....B..B...") + (isRight ? "....W..W...." : ".....W..W...") + (isRight ? "....R..R...." : ".....R..R...");
    } else {
      // One leg bent/forward
      legs = (isRight ? "...BBBBBB..." : "..BBBBBB....") + (isRight ? "....BB..B..." : ".....B..BB..") + (isRight ? "....WW..W..." : ".....W..WW..") + (isRight ? "....RR..R..." : ".....R..RR..");
    }

    const padding = ".".repeat(12 * bob);
    return (padding + head + body + hips + legs).padEnd(12 * 18, '.').slice(0, 12 * 18);
  }

  return ".".repeat(12 * 18);
};

const currentShadow = computed(() => {
  const frameStr = getFrame(direction.value, frame.value);
  let shadow = '';
  for (let i = 0; i < frameStr.length; i++) {
    const char = frameStr[i];
    if (char === '.' || char === ' ') continue;
    const x = i % 12;
    const y = Math.floor(i / 12);
    shadow += `${x * 4}px ${y * 4}px 0 ${colors[char as keyof typeof colors] || 'transparent'},`;
  }
  return shadow.slice(0, -1);
});

let walkInterval: any;
let behaviorInterval: any;

onMounted(() => {
  // Smoother walk cycle (150ms per frame)
  walkInterval = setInterval(() => {
    frame.value = (frame.value + 1) % 4;
  }, 150);

  // Natural behavior cycle
  const behaviors: { dir: Direction; duration: number }[] = [
    { dir: 'front', duration: 5000 },
    { dir: 'right', duration: 4000 },
    { dir: 'back',  duration: 5000 },
    { dir: 'left',  duration: 4000 },
  ];
  
  let bIdx = 0;
  const runBehavior = () => {
    const b = behaviors[bIdx];
    direction.value = b.dir;
    behaviorInterval = setTimeout(() => {
      bIdx = (bIdx + 1) % behaviors.length;
      runBehavior();
    }, b.duration);
  };
  
  runBehavior();
});

onUnmounted(() => {
  clearInterval(walkInterval);
  clearTimeout(behaviorInterval);
});
</script>

<template>
  <div class="floating-boy">
    <!-- Ground Shadow -->
    <div class="ground-shadow" :class="{ walking: true }"></div>
    <!-- Character -->
    <div class="pixel-art-container">
      <div class="pixel-art" :style="{ boxShadow: currentShadow }"></div>
    </div>
  </div>
</template>

<style scoped>
.floating-boy {
  position: fixed;
  left: 30px;
  bottom: 84px;
  z-index: 999;
  width: 48px;
  height: 72px;
  pointer-events: none;
}

.pixel-art-container {
  position: relative;
  width: 48px;
  height: 72px;
}

.pixel-art {
  width: 4px;
  height: 4px;
  background: transparent;
  image-rendering: pixelated;
}

.ground-shadow {
  position: absolute;
  bottom: 4px;
  left: 6px;
  width: 36px;
  height: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 50%;
  transform: scale(1);
  transition: transform 0.15s ease-in-out;
}

/* Bobbing animation for the whole character container */
@keyframes walk-bob {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-2px); }
  75% { transform: translateY(-2px); }
}

.pixel-art-container {
  animation: walk-bob 0.3s infinite ease-in-out;
}

/* Ground shadow pulses with the walk */
@keyframes shadow-pulse {
  0%, 100% { transform: scale(1); opacity: 0.15; }
  50% { transform: scale(1.1); opacity: 0.2; }
}

.ground-shadow {
  animation: shadow-pulse 0.3s infinite ease-in-out;
}
</style>
