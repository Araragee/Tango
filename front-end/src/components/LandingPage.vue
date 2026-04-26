<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';

const store = useAppStore();
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen text-center px-4 pt-16">
    <div class="w-full lg:max-w-6xl max-w-[90%] mx-auto flex flex-col items-center py-20">
    <!-- Hero Image Area -->
    <div class="relative w-64 h-64 mb-12">
      <div class="absolute inset-0 bg-primary-container pixel-border hard-shadow transform rotate-3"></div>
      <div class="absolute inset-0 bg-surface pixel-border hard-shadow -rotate-3 flex items-center justify-center overflow-hidden">
        <div class="w-full h-full bg-primary-container flex items-center justify-center">
          <span class="material-symbols-outlined text-on-primary-container" style="font-size: 80px; font-variation-settings: 'FILL' 1;">favorite</span>
        </div>
      </div>
      <!-- Floating Pixel Hearts -->
      <span class="absolute -top-4 -right-4 material-symbols-outlined text-primary text-4xl animate-bounce">favorite</span>
      <span class="absolute -bottom-2 -left-6 material-symbols-outlined text-secondary text-3xl animate-pulse" style="animation-delay: 1s;">favorite</span>
    </div>

    <!-- Content -->
    <h1 class="text-headline-xl text-on-background mb-6 tracking-tight">
      Finance & Planning <br/>
      <span class="text-primary italic">for Duos.</span>
    </h1>

    <p class="text-body-lg text-on-surface-variant  mb-12">
      Tango helps partners sync their budgets, calendars, and goals in one retro-inspired shared space.
    </p>

    <div class="flex flex-col sm:flex-row gap-6 w-full ">
      <TangoButton
        class="flex-1"
        size="lg"
        shadow="dark"
        @click="store.setActiveView('Login')"
      >
        Get Started
      </TangoButton>
      <TangoButton
        class="flex-1"
        variant="outline"
        size="lg"
        @click="store.setActiveView('Login')"
      >
        Sign In
      </TangoButton>
    </div>

    <!-- Footer Stats -->
    <div class="mt-20 grid grid-cols-2 gap-12 border-t-2 border-black pt-8 w-full max-w-2xl">
      <div>
        <div class="text-headline-md text-secondary">50k+</div>
        <div class="text-label-sm uppercase tracking-widest mt-1">Happy Couples</div>
      </div>
      <div>
        <div class="text-headline-md text-primary">$2M+</div>
        <div class="text-label-sm uppercase tracking-widest mt-1">Saved Together</div>
      </div>
    </div>
    </div>
  </div>
</template>
