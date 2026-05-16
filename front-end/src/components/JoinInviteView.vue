<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { isConfigured } from '../lib/supabase';
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const household = useHouseholdStore();
const notify = inject('notify') as (msg: string, type?: 'success' | 'error' | 'info') => void;

const code = String(route.params.code ?? '').toUpperCase();
const loading = ref(false);
const error = ref('');
const status = ref<'idle' | 'redeeming' | 'success'>('idle');

const goSignUp = () => router.push(`/signup?invite=${encodeURIComponent(code)}`);
const goLogin  = () => router.push(`/login?invite=${encodeURIComponent(code)}`);

const redeem = async () => {
    loading.value = true;
    error.value = '';
    status.value = 'redeeming';
    try {
        await household.joinHousehold(code);
        status.value = 'success';
        notify('Paired successfully!', 'success');
        router.push('/app/budget');
    } catch (e: any) {
        error.value = e.message ?? 'Failed to redeem invite.';
        status.value = 'idle';
    } finally {
        loading.value = false;
    }
};

onMounted(async () => {
    if (!isConfigured) return;
    if (!auth.initialized) await auth.init();
    if (auth.user && !household.householdId) {
        await redeem();
    }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 pt-16">
    <TangoCard padding="xl" shadow="default" class="w-[90%] max-w-[480px] text-center space-y-6">
      <div class="flex flex-col items-center gap-3">
        <span class="material-symbols-outlined text-primary text-6xl" style="font-variation-settings: 'FILL' 1;">group_add</span>
        <h1 class="text-headline-xl tracking-tighter italic uppercase text-primary">You're Invited</h1>
        <p class="text-body-md text-on-surface-variant">Join your partner's household on Tango.</p>
      </div>

      <div class="bg-primary-container pixel-border-sm p-4 inline-flex items-center justify-center mx-auto">
        <span class="text-headline-md font-black tracking-widest text-on-primary-container">{{ code }}</span>
      </div>

      <p v-if="status === 'redeeming'" class="text-body-md text-on-surface-variant">Pairing…</p>
      <p v-if="error" class="text-error text-label-sm">{{ error }}</p>

      <div v-if="!auth.user && status !== 'success'" class="space-y-3">
        <TangoButton @click="goSignUp" shadow="dark" class="w-full">
          Create Account & Join
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">person_add</span>
        </TangoButton>
        <TangoButton @click="goLogin" variant="surface" class="w-full">
          Already have an account? Sign In
        </TangoButton>
      </div>

      <div v-else-if="auth.user && status === 'idle' && error" class="space-y-3">
        <TangoButton @click="redeem" shadow="dark" class="w-full" :disabled="loading">Retry</TangoButton>
        <TangoButton @click="router.push('/onboarding')" variant="surface" class="w-full">Cancel</TangoButton>
      </div>
    </TangoCard>
  </div>
</template>
