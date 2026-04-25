<script setup lang="ts">
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';

const store = useAppStore();

const signup = () => {
  store.setActiveView('Onboarding');
};
</script>

<template>
  <div class="min-h-[80vh] flex flex-col items-center justify-center p-gutter">
    <main class="w-full max-w-md mx-auto bg-surface pixel-border hard-shadow p-lg flex flex-col items-center">
      <div class="mb-xl text-center flex flex-col items-center gap-sm mt-lg">
        <span class="material-symbols-outlined text-secondary text-6xl" style="font-variation-settings: 'FILL' 1;">person_add</span>
        <h1 class="text-headline-xl text-secondary tracking-tighter italic uppercase">Join Us</h1>
        <p class="text-body-md text-on-surface-variant font-bold uppercase tracking-wider">Create your duo account</p>
      </div>

      <form @submit.prevent="signup" class="w-full flex flex-col gap-lg">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="email">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">mail</span>
            <input class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="email" placeholder="hello@tango.com" type="email"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="password">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="password" placeholder="••••••••" type="password"/>
          </div>
        </div>

        <TangoButton type="submit" variant="secondary" shadow="dark" class="w-full py-3">
          Create Account
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">arrow_forward</span>
        </TangoButton>

        <div class="text-center mt-md">
          <p class="text-body-md text-on-surface-variant">Already have an account?</p>
          <button @click="store.setActiveView('Login')" type="button" class="inline-block mt-xs text-body-md font-bold text-primary hover:text-primary-container transition-colors border-b-2 border-transparent hover:border-primary">Sign In instead</button>
        </div>
      </form>
    </main>
  </div>
</template>
