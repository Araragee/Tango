<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore';
import { useHouseholdStore } from '../stores/useHouseholdStore';
import { supabase, isConfigured } from '../lib/supabase';
import TangoCard from './TangoCard.vue';
import TangoButton from './TangoButton.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const household = useHouseholdStore();

const status = ref<'pending' | 'ok' | 'error'>('pending');
const message = ref('Confirming your account…');

onMounted(async () => {
    try {
        const rawTokenHash = route.query.token_hash;
        const rawType = route.query.type;
        const tokenHash = Array.isArray(rawTokenHash) ? String(rawTokenHash[0]) : String(rawTokenHash ?? '');
        const typeStr = Array.isArray(rawType) ? String(rawType[0]) : String(rawType ?? '');

        const rawCode = route.query.code;
        const codeStr = Array.isArray(rawCode) ? String(rawCode[0]) : String(rawCode ?? '');

        const validTypes = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const;
        type ValidType = typeof validTypes[number];

        if (isConfigured && codeStr) {
            const { error } = await supabase.auth.exchangeCodeForSession(codeStr);
            if (error) {
                status.value = 'error';
                message.value = error.message;
                return;
            }
        } else if (isConfigured && tokenHash && validTypes.includes(typeStr as ValidType)) {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: typeStr as ValidType,
            });
            if (error) {
                status.value = 'error';
                message.value = error.message;
                return;
            }
        }

        if (!auth.initialized) await auth.init();

        if (!auth.user) {
            status.value = 'error';
            message.value = 'Confirmation link expired or already used. Please sign in.';
            return;
        }

        await household.load();

        const invite = String(route.query.invite ?? '');
        if (invite && !household.householdId) {
            try {
                await household.joinHousehold(invite);
            } catch {
                // Fall through — let onboarding handle.
            }
        }

        status.value = 'ok';
        message.value = 'Account confirmed!';

        setTimeout(() => {
            router.replace(household.householdId ? '/app/budget' : '/onboarding');
        }, 800);
    } catch (e: any) {
        status.value = 'error';
        message.value = e.message ?? 'Confirmation failed.';
    }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 pt-16">
    <TangoCard padding="xl" shadow="default" class="w-[90%] max-w-[448px] text-center space-y-4">
      <span
        class="material-symbols-outlined text-6xl"
        :class="status === 'ok' ? 'text-primary' : status === 'error' ? 'text-error' : 'text-on-surface-variant'"
        style="font-variation-settings: 'FILL' 1;"
      >
        {{ status === 'ok' ? 'check_circle' : status === 'error' ? 'error' : 'hourglass_top' }}
      </span>
      <h1 class="text-headline-lg">{{ status === 'ok' ? 'Welcome to Tango' : status === 'error' ? 'Something went wrong' : 'Just a sec' }}</h1>
      <p class="text-body-md text-on-surface-variant">{{ message }}</p>

      <TangoButton v-if="status === 'error'" @click="router.push('/login')" shadow="dark" class="w-full">
        Go to Sign In
      </TangoButton>
    </TangoCard>
  </div>
</template>
