<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { isConfigured } from '../lib/supabase';
import TangoButton from './TangoButton.vue';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);

const signup = async () => {
  error.value = '';
  if (!email.value.trim() || !displayName.value.trim() || !password.value) {
    error.value = 'Please fill in all fields.';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }

  if (!isConfigured) {
    router.push('/onboarding');
    return;
  }

  loading.value = true;
  try {
    const user = await auth.signup(email.value, password.value);
    if (user) {
      const { useAppStore } = await import('../stores/useStore');
      const store = useAppStore();
      await store.updateProfile(displayName.value.trim());
    }
    router.push('/onboarding');
  } catch (e: any) {
    error.value = e.message ?? 'Sign up failed.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 pt-16">
    <div class="w-[90%] max-w-[448px] min-w-[300px] bg-surface pixel-border hard-shadow p-6 flex flex-col items-center">
      <div class="mb-xl text-center flex flex-col items-center gap-sm mt-lg">
        <span class="material-symbols-outlined text-secondary text-6xl" style="font-variation-settings: 'FILL' 1;">person_add</span>
        <h1 class="text-headline-xl text-secondary tracking-tighter italic uppercase">Join Us</h1>
        <p class="text-body-md text-on-surface-variant font-bold uppercase tracking-wider">Create your duo account</p>
      </div>

      <form @submit.prevent="signup" class="w-full flex flex-col gap-lg">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="name">Your Name</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">person</span>
            <input v-model="displayName" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="name" placeholder="Alex" type="text"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="email">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">mail</span>
            <input v-model="email" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="email" placeholder="hello@tango.app" type="email"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="password">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input v-model="password" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="password" placeholder="••••••••" type="password"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="confirmPassword">Confirm Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input v-model="confirmPassword" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="confirmPassword" placeholder="••••••••" type="password"/>
          </div>
        </div>

        <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

        <TangoButton type="submit" variant="secondary" shadow="dark" class="w-full py-3" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Create Account' }}
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">arrow_forward</span>
        </TangoButton>

        <div class="text-center mt-md">
          <p class="text-body-md text-on-surface-variant">Already have an account?</p>
          <button @click="router.push('/login')" type="button" class="inline-block mt-xs text-body-md font-bold text-primary hover:text-primary-container transition-colors border-b-2 border-transparent hover:border-primary">Sign In instead</button>
        </div>
      </form>
    </div>
  </div>
</template>
