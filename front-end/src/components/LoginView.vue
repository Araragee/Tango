<script setup lang="ts">
import { ref, inject } from 'vue';
import { useAppStore } from '../stores/useStore';
import TangoButton from './TangoButton.vue';

const store = useAppStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const username = ref('');
const password = ref('');
const error = ref('');

const login = () => {
  error.value = '';
  if (!username.value.trim() || !password.value) {
    error.value = 'Please fill in all fields.';
    return;
  }
  store.setActiveView('Budget');
};
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 pt-16">
    <div class="w-[90%] max-w-[448px] min-w-[300px] bg-surface pixel-border hard-shadow p-6 flex flex-col items-center">
      <div class="mb-xl text-center flex flex-col items-center gap-sm mt-lg">
        <span class="material-symbols-outlined text-primary text-6xl" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <h1 class="text-headline-xl text-primary tracking-tighter italic uppercase">Tango</h1>
        <p class="text-body-md text-on-surface-variant font-bold uppercase tracking-wider">Welcome Back</p>
      </div>

      <form @submit.prevent="login" class="w-full flex flex-col gap-lg">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="username">Username</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">person</span>
            <input v-model="username" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="username" placeholder="user_123" type="text"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="password">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input v-model="password" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="password" placeholder="••••••••" type="password"/>
          </div>
          <div class="flex justify-end mt-xs">
            <button type="button" @click="notify('Password reset is not yet available.', 'info')" class="text-label-sm text-outline hover:text-primary transition-colors">Forgot password?</button>
          </div>
        </div>

        <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

        <TangoButton type="submit" shadow="dark" class="w-full py-3">
          Sign In
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">login</span>
        </TangoButton>

        <div class="flex items-center gap-sm my-md">
          <div class="h-px bg-outline-variant flex-1"></div>
          <span class="text-label-sm text-outline-variant">OR</span>
          <div class="h-px bg-outline-variant flex-1"></div>
        </div>

        <div class="text-center mb-sm">
          <p class="text-body-md text-on-surface-variant">Don't have an account?</p>
          <button @click="store.setActiveView('SignUp')" type="button" class="inline-block mt-xs text-body-md font-bold text-secondary hover:text-secondary-fixed-dim transition-colors border-b-2 border-transparent hover:border-secondary">Create an account</button>
        </div>
      </form>
    </div>
  </div>
</template>
