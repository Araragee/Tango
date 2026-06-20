<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { isConfigured } from '../lib/supabase';
import TangoButton from './TangoButton.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const email = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const error = ref('');
const loading = ref(false);
const needsConfirm = ref(false);

const inviteCode = computed(() => String(route.query.invite ?? ''));

const passwordStrength = computed(() => {
    const p = password.value;
    if (p.length === 0) return { score: 0, label: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];
    return { score, label: labels[score] ?? '' };
});

const signup = async () => {
    error.value = '';
    if (!email.value.trim() || !displayName.value.trim() || !password.value) {
        error.value = 'Please fill in all fields.';
        return;
    }
    if (password.value.length < 8) {
        error.value = 'Password must be at least 8 characters.';
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
        const result = await auth.signup(email.value, password.value, displayName.value.trim(), inviteCode.value || undefined);
        if (result.needsConfirm) {
            needsConfirm.value = true;
            return;
        }
        if (inviteCode.value) {
            router.push(`/join/${inviteCode.value}`);
        } else {
            router.push('/onboarding');
        }
    } catch (e: any) {
        error.value = e.message ?? 'Sign up failed.';
    } finally {
        loading.value = false;
    }
};

const resend = async () => {
    try {
        await auth.resendConfirmation(email.value.trim());
        notify('Confirmation email resent.', 'success');
    } catch (e: any) {
        notify(e.message ?? 'Failed to resend.', 'error');
    }
};

onMounted(() => {
    if (inviteCode.value) {
        notify(`Sign up to join household ${inviteCode.value}.`, 'info');
    }
});
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center sm:p-4">
    <div class="w-full min-h-screen sm:min-h-0 sm:w-[90%] max-w-[448px] min-w-[300px] bg-surface sm:pixel-border sm:hard-shadow p-6 flex flex-col items-center justify-center sm:justify-start">
      <div class="mb-xl text-center flex flex-col items-center gap-sm mt-lg">
        <span class="material-symbols-outlined text-secondary text-6xl" style="font-variation-settings: 'FILL' 1;">person_add</span>
        <h1 class="text-headline-xl text-secondary tracking-tighter italic uppercase">Join Us</h1>
        <p class="text-body-md text-on-surface-variant font-bold uppercase tracking-wider">Create your duo account</p>
      </div>

      <div v-if="needsConfirm" class="text-center space-y-4">
        <span class="material-symbols-outlined text-primary text-5xl" style="font-variation-settings: 'FILL' 1;">mark_email_read</span>
        <h2 class="text-headline-md">Confirm your email</h2>
        <p class="text-body-md text-on-surface-variant">We sent a confirmation link to <strong>{{ email }}</strong>. Tap it to finish signing up.</p>
        <div class="flex flex-col gap-2">
          <TangoButton @click="resend" variant="surface" class="w-full">Resend Email</TangoButton>
          <TangoButton @click="router.push('/login')" shadow="dark" class="w-full">Back to Sign In</TangoButton>
        </div>
      </div>

      <form v-else @submit.prevent="signup" class="w-full flex flex-col gap-lg">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="name">Your Name</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">person</span>
            <input v-model="displayName" class="w-full sunken-input pixel-border-sm pl-xl pr-sm py-3 text-body-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" id="name" placeholder="Alex" type="text" autocomplete="name"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="email">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">mail</span>
            <input v-model="email" class="w-full sunken-input pixel-border-sm pl-xl pr-sm py-3 text-body-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" id="email" placeholder="hello@tango.app" type="email" autocomplete="email"/>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="password">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input v-model="password" class="w-full sunken-input pixel-border-sm pl-xl pr-10 py-3 text-body-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" id="password" placeholder="••••••••" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"/>
            <button type="button" @click="showPassword = !showPassword" class="absolute right-sm top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" tabindex="-1">
                <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          <div v-if="password" class="flex items-center gap-2 mt-1">
            <div class="flex-1 h-1.5 bg-surface-variant pixel-border-sm overflow-hidden">
              <div class="h-full transition-all"
                   :class="passwordStrength.score >= 3 ? 'bg-primary' : passwordStrength.score >= 2 ? 'bg-secondary' : 'bg-error'"
                   :style="{ width: (passwordStrength.score * 25) + '%' }"></div>
            </div>
            <span class="text-label-sm text-on-surface-variant uppercase">{{ passwordStrength.label }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-xs">
          <label class="text-label-sm text-on-background uppercase" for="confirmPassword">Confirm Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline" style="font-variation-settings: 'FILL' 1;">lock</span>
            <input v-model="confirmPassword" class="w-full sunken-input pixel-border-sm pl-xl pr-10 py-3 text-body-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" id="confirmPassword" placeholder="••••••••" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"/>
          </div>
        </div>

        <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

        <TangoButton type="submit" variant="secondary" shadow="dark" class="w-full py-3" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Create Account' }}
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">arrow_forward</span>
        </TangoButton>

<div class="text-center mt-md">
          <p class="text-body-md text-on-surface-variant">Already have an account?</p>
          <button @click="router.push(`/login${inviteCode ? '?invite=' + encodeURIComponent(inviteCode) : ''}`)" type="button" class="inline-block mt-xs text-body-md font-bold text-primary hover:text-primary-container transition-colors border-b-2 border-transparent hover:border-primary">Sign In instead</button>
        </div>
      </form>
    </div>
  </div>
</template>
