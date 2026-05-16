<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { isConfigured } from '../lib/supabase';
import TangoButton from './TangoButton.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const household = useHouseholdStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

type Mode = 'password' | 'magic';

const mode = ref<Mode>('password');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const magicSent = ref(false);

const inviteCode = computed(() => String(route.query.invite ?? ''));
const redirectTo  = computed(() => String(route.query.redirect ?? ''));

const forgotPassword = async () => {
    if (!email.value.trim()) {
        notify('Enter your email above first, then click Forgot password.', 'info');
        return;
    }
    try {
        await auth.resetPassword(email.value.trim());
        notify('Reset link sent. Check your email.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to send reset link.', 'error');
    }
};

const goAfterLogin = async () => {
    if (inviteCode.value && !household.householdId) {
        router.push(`/join/${inviteCode.value}`);
        return;
    }
    await household.load();
    if (redirectTo.value) {
        router.push(redirectTo.value);
        return;
    }
    router.push(household.householdId ? '/app/budget' : '/onboarding');
};

const login = async () => {
    error.value = '';
    if (!email.value.trim() || !password.value) {
        error.value = 'Please fill in all fields.';
        return;
    }

    if (!isConfigured) {
        router.push('/app/budget');
        return;
    }

    loading.value = true;
    try {
        await auth.login(email.value, password.value);
        await goAfterLogin();
    } catch (e: any) {
        error.value = e.message ?? 'Login failed.';
    } finally {
        loading.value = false;
    }
};

const sendMagicLink = async () => {
    error.value = '';
    if (!email.value.trim()) {
        error.value = 'Enter your email.';
        return;
    }
    loading.value = true;
    try {
        await auth.loginWithMagicLink(email.value.trim(), inviteCode.value || undefined);
        magicSent.value = true;
    } catch (e: any) {
        error.value = e.message ?? 'Failed to send magic link.';
    } finally {
        loading.value = false;
    }
};

const oauth = async (provider: 'google') => {
    error.value = '';
    try {
        await auth.loginWithOAuth(provider, inviteCode.value || undefined);
    } catch (e: any) {
        error.value = e.message ?? 'OAuth sign-in failed.';
    }
};

onMounted(() => {
    if (inviteCode.value) {
        notify(`Sign in to join household ${inviteCode.value}.`, 'info');
    }
});
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 pt-16">
    <div class="w-[90%] max-w-[448px] min-w-[300px] bg-surface pixel-border hard-shadow p-6 flex flex-col items-center">
      <div class="mb-xl text-center flex flex-col items-center gap-sm mt-lg">
        <span class="material-symbols-outlined text-primary text-6xl" style="font-variation-settings: 'FILL' 1;">favorite</span>
        <h1 class="text-headline-xl text-primary tracking-tighter italic uppercase">Tango</h1>
        <p class="text-body-md text-on-surface-variant font-bold uppercase tracking-wider">Welcome Back</p>
      </div>

      <div class="w-full flex pixel-border-sm mb-lg">
        <button
          type="button"
          @click="mode = 'password'; magicSent = false; error = ''"
          class="flex-1 py-2 text-label-sm uppercase font-bold transition-colors"
          :class="mode === 'password' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
        >Password</button>
        <button
          type="button"
          @click="mode = 'magic'; error = ''"
          class="flex-1 py-2 text-label-sm uppercase font-bold transition-colors"
          :class="mode === 'magic' ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
        >Magic Link</button>
      </div>

      <!-- Password tab -->
      <form v-if="mode === 'password'" @submit.prevent="login" class="w-full flex flex-col gap-lg">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="email">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">mail</span>
            <input v-model="email" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="email" placeholder="hello@tango.app" type="email" autocomplete="email"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="password">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input v-model="password" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0" id="password" placeholder="••••••••" type="password" autocomplete="current-password"/>
          </div>
          <div class="flex justify-end mt-xs">
            <button type="button" @click="forgotPassword" class="text-label-sm text-outline hover:text-primary transition-colors">Forgot password?</button>
          </div>
        </div>

        <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

        <TangoButton type="submit" shadow="dark" class="w-full py-3" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign In' }}
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">login</span>
        </TangoButton>
      </form>

      <!-- Magic link tab -->
      <form v-else @submit.prevent="sendMagicLink" class="w-full flex flex-col gap-lg">
        <div v-if="!magicSent" class="flex flex-col gap-xs">
          <label class="text-label-sm uppercase" for="ml-email">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">mail</span>
            <input v-model="email" id="ml-email" type="email" placeholder="hello@tango.app" autocomplete="email" class="w-full sunken-input pl-xl pr-sm py-3 text-body-md focus:outline-none focus:ring-0"/>
          </div>
          <p class="text-label-sm text-on-surface-variant mt-xs">We'll email you a one-tap sign-in link.</p>
        </div>

        <div v-else class="text-center space-y-2">
          <span class="material-symbols-outlined text-primary text-5xl" style="font-variation-settings: 'FILL' 1;">mark_email_read</span>
          <p class="text-body-md">Check <strong>{{ email }}</strong> for your sign-in link.</p>
        </div>

        <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

        <TangoButton v-if="!magicSent" type="submit" shadow="dark" class="w-full py-3" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send Magic Link' }}
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
        </TangoButton>
      </form>

      <div class="flex items-center gap-sm my-md w-full">
        <div class="h-px bg-outline-variant flex-1"></div>
        <span class="text-label-sm text-outline-variant">OR</span>
        <div class="h-px bg-outline-variant flex-1"></div>
      </div>

      <TangoButton @click="oauth('google')" variant="surface" shadow="dark" class="w-full py-3">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">google</span>
        Continue with Google
      </TangoButton>

      <div class="text-center mt-lg mb-sm">
        <p class="text-body-md text-on-surface-variant">Don't have an account?</p>
        <button @click="router.push(`/signup${inviteCode ? '?invite=' + encodeURIComponent(inviteCode) : ''}`)" type="button" class="inline-block mt-xs text-body-md font-bold text-secondary hover:text-secondary-fixed-dim transition-colors border-b-2 border-transparent hover:border-secondary">Create an account</button>
      </div>
    </div>
  </div>
</template>
