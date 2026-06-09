<script setup lang="ts">
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';

const router = useRouter();
const auth = useAuthStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');

const submit = async () => {
    error.value = '';
    if (password.value.length < 8) {
        error.value = 'Password must be at least 8 characters.';
        return;
    }
    if (password.value !== confirm.value) {
        error.value = 'Passwords do not match.';
        return;
    }
    loading.value = true;
    try {
        await auth.updatePassword(password.value);
        notify('Password updated. Welcome back.', 'success');
        router.push('/app/budget');
    } catch (e: any) {
        error.value = e.message ?? 'Failed to update password.';
    } finally {
        loading.value = false;
    }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 pt-16">
    <TangoCard padding="xl" shadow="default" class="w-[90%] max-w-[448px] space-y-6">
      <div class="text-center flex flex-col items-center gap-2">
        <span class="material-symbols-outlined text-primary text-6xl" style="font-variation-settings: 'FILL' 1;">lock_reset</span>
        <h1 class="text-headline-xl tracking-tighter italic uppercase text-primary">Reset Password</h1>
        <p class="text-body-md text-on-surface-variant">Choose a new password for your account.</p>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm uppercase" for="new-pw">New Password</label>
          <input v-model="password" id="new-pw" type="password" placeholder="••••••••" class="sunken-input pixel-border-sm px-sm py-3 text-body-md focus:outline-none focus:ring-0" />
        </div>
        <div class="flex flex-col gap-xs">
          <label class="text-label-sm uppercase" for="confirm-pw">Confirm Password</label>
          <input v-model="confirm" id="confirm-pw" type="password" placeholder="••••••••" class="sunken-input pixel-border-sm px-sm py-3 text-body-md focus:outline-none focus:ring-0" />
        </div>

        <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

        <TangoButton type="submit" shadow="dark" class="w-full py-3" :disabled="loading">
          {{ loading ? 'Updating…' : 'Set New Password' }}
        </TangoButton>
      </form>
    </TangoCard>
  </div>
</template>
