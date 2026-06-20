<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import TangoButton from './TangoButton.vue';

const router = useRouter();

// Hero icon morphs through the app's story: love → money → saving → together.
const heroIcons = ['favorite', 'attach_money', 'savings', 'diversity_1'];
const heroIdx = ref(0);
let heroTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  heroTimer = setInterval(() => {
    heroIdx.value = (heroIdx.value + 1) % heroIcons.length;
  }, 1800);
});
onUnmounted(() => clearInterval(heroTimer));

// Feature pillars mirror the app's four tabs.
const features = [
  { icon: 'payments', title: 'Shared Budget', text: 'Track a joint balance, split who paid what, and settle up — no spreadsheet required.' },
  { icon: 'savings', title: 'Joint Goals', text: 'Save toward a trip, a ring, or rent together and watch the progress bar fill up.' },
  { icon: 'checklist_rtl', title: 'Shared To-Dos', text: 'A list you both own. Assign chores, plan groceries, and check things off as a team.' },
  { icon: 'calendar_month', title: 'Synced Calendar', text: 'Date nights, bills, and birthdays in one place — both partners always in sync.' },
];

const steps = [
  { n: '1', title: 'Create your space', text: 'Sign up in seconds and spin up your shared Tango household.' },
  { n: '2', title: 'Invite your partner', text: 'Send one link. They join and everything syncs instantly between you.' },
  { n: '3', title: 'Track together', text: 'Log money, plans, and tasks — each change shows up for both of you in real time.' },
];

const values = [
  { icon: 'bolt', title: 'Real-time sync', text: 'Add a transaction and your partner sees it the moment it happens.' },
  { icon: 'wifi_off', title: 'Works offline', text: 'Install it like an app. Log things on the subway; it syncs when you reconnect.' },
  { icon: 'lock', title: 'Private by default', text: 'Your data is locked to your household. No ads, no selling, just the two of you.' },
];
</script>

<template>
  <div class="w-full">
    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <section class="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div class="w-full max-w-3xl mx-auto flex flex-col items-center py-20">
        <!-- Hero image: stacked pixel cards -->
        <div class="relative w-44 h-44 sm:w-64 sm:h-64 mb-12">
          <div class="absolute inset-0 bg-primary-container pixel-border hard-shadow rotate-3"></div>
          <div class="absolute inset-0 bg-surface pixel-border hard-shadow -rotate-3 flex items-center justify-center overflow-hidden">
            <div class="w-full h-full bg-primary-container flex items-center justify-center">
              <!-- :key forces a fresh element each cycle so the pop animation replays. -->
              <span
                :key="heroIcons[heroIdx]"
                class="hero-pop material-symbols-outlined text-on-primary-container text-[48px] sm:text-[80px]"
                style="font-variation-settings: 'FILL' 1;"
              >{{ heroIcons[heroIdx] }}</span>
            </div>
          </div>
          <span class="absolute -top-4 -right-4 material-symbols-outlined text-primary text-3xl sm:text-4xl animate-bounce">favorite</span>
          <span class="absolute -bottom-2 -left-6 material-symbols-outlined text-secondary text-2xl sm:text-3xl animate-pulse" style="animation-delay: 1s;">favorite</span>
        </div>

        <h1 class="text-headline-xl text-on-background mb-6 tracking-tight">
          Finance &amp; Planning <br />
          <span class="text-primary italic">for Duos.</span>
        </h1>

        <p class="text-body-lg text-on-surface-variant mb-12 max-w-[36rem]">
          Tango helps partners sync their budgets, calendars, and goals in one
          retro-inspired shared space.
        </p>

        <div class="flex flex-col sm:flex-row gap-6 w-full max-w-[32rem]">
          <TangoButton class="flex-1" size="lg" shadow="dark" @click="router.push('/signup')">
            Get Started
          </TangoButton>
          <TangoButton class="flex-1" variant="outline" size="lg" @click="router.push('/login')">
            Sign In
          </TangoButton>
        </div>

        <span class="material-symbols-outlined text-on-surface-variant text-3xl mt-16 animate-bounce" aria-hidden="true">expand_more</span>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────────────────── -->
    <section class="px-4 py-20 sm:py-28">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-label-sm uppercase tracking-widest text-secondary mb-3">What you get</p>
          <h2 class="text-headline-lg text-on-background">One shared space for everything</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="f in features"
            :key="f.title"
            class="flex flex-col items-start text-left p-6 bg-surface pixel-border hard-shadow"
          >
            <span class="material-symbols-outlined text-primary text-4xl mb-4" style="font-variation-settings: 'FILL' 1;">{{ f.icon }}</span>
            <h3 class="text-headline-md text-on-surface mb-2">{{ f.title }}</h3>
            <p class="text-body-md text-on-surface-variant">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ──────────────────────────────────────────────────── -->
    <section class="px-4 py-20 sm:py-28 bg-surface-variant border-y-2 border-black dark:border-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-label-sm uppercase tracking-widest text-secondary mb-3">How it works</p>
          <h2 class="text-headline-lg text-on-background">Get started in minutes</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="s in steps"
            :key="s.n"
            class="relative p-6 bg-surface pixel-border hard-shadow-dark"
          >
            <div class="w-12 h-12 flex items-center justify-center bg-primary text-on-primary text-headline-md font-black pixel-border-sm mb-4">
              {{ s.n }}
            </div>
            <h3 class="text-headline-md text-on-surface mb-2">{{ s.title }}</h3>
            <p class="text-body-md text-on-surface-variant">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Value / why Tango ─────────────────────────────────────────────── -->
    <section class="px-4 py-20 sm:py-28">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-14">
          <p class="text-label-sm uppercase tracking-widest text-secondary mb-3">Made for two</p>
          <h2 class="text-headline-lg text-on-background">Built to be lived in</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="v in values" :key="v.title" class="flex flex-col items-center text-center p-6">
            <span class="material-symbols-outlined text-secondary text-4xl mb-4">{{ v.icon }}</span>
            <h3 class="text-headline-md text-on-surface mb-2">{{ v.title }}</h3>
            <p class="text-body-md text-on-surface-variant">{{ v.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Closing CTA + stats ───────────────────────────────────────────── -->
    <section class="px-4 pb-24">
      <div class="max-w-3xl mx-auto text-center bg-primary-container pixel-border hard-shadow p-10 sm:p-14">
        <h2 class="text-headline-lg text-on-primary-container mb-4">Start your Tango today</h2>
        <p class="text-body-lg text-on-primary-container/80 mb-10">
          Free to start. Invite your partner and track life together.
        </p>
        <TangoButton size="lg" shadow="dark" class="w-full sm:w-auto sm:px-16 mx-auto" @click="router.push('/signup')">
          Get Started
        </TangoButton>

        <div class="mt-12 grid grid-cols-2 gap-8 border-t-2 border-on-primary-container/30 pt-8">
          <div>
            <div class="text-headline-md text-on-primary-container">50k+</div>
            <div class="text-label-sm uppercase tracking-widest mt-1 text-on-primary-container/70">Happy Couples</div>
          </div>
          <div>
            <div class="text-headline-md text-on-primary-container">$2M+</div>
            <div class="text-label-sm uppercase tracking-widest mt-1 text-on-primary-container/70">Saved Together</div>
          </div>
        </div>
      </div>
      <p class="text-center text-label-sm text-on-surface-variant mt-10">
        Tango · Finance &amp; planning for duos
      </p>
    </section>
  </div>
</template>

<style scoped>
/* Each icon pops in (scale + spin) when it mounts; replays via :key on change. */
.hero-pop {
  animation: heroPop 0.45s ease;
}
@keyframes heroPop {
  0% { opacity: 0; transform: scale(0.3) rotate(-30deg); }
  60% { opacity: 1; transform: scale(1.15) rotate(8deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-pop { animation: none; }
}
</style>
