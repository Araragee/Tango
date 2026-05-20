import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, Provider } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'
import { useHouseholdStore } from './useHouseholdStore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const isPasswordRecovery = ref(false)
  const sessionExpired = ref(false)

  let _loggingOut = false

  const email = computed(() => user.value?.email ?? null)

  async function init() {
    if (!isConfigured) {
      user.value = { id: 'demo', email: 'demo@tango.app' } as User
      initialized.value = true
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null

    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user ?? null
      if (event === 'PASSWORD_RECOVERY') {
        isPasswordRecovery.value = true
      }
      if (event === 'SIGNED_OUT') {
        if (!_loggingOut) sessionExpired.value = true
        await useHouseholdStore().reset()
      }
    })

    initialized.value = true
  }

  async function login(emailAddr: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailAddr, password })
    if (error) throw error
    user.value = data.user
    return data.user
  }

  async function signup(emailAddr: string, password: string, displayName?: string, inviteCode?: string) {
    const { data, error } = await supabase.auth.signUp({
      email: emailAddr,
      password,
      options: {
        data: displayName ? { display_name: displayName } : {},
        emailRedirectTo: `${window.location.origin}/auth/confirm${inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : ''}`,
      },
    })
    if (error) throw error
    if (!data.session) {
      return { user: data.user, needsConfirm: true }
    }
    user.value = data.user
    return { user: data.user, needsConfirm: false }
  }

  async function loginWithOAuth(provider: Provider, inviteCode?: string) {
    const redirect = `${window.location.origin}/auth/confirm${inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : ''}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirect },
    })
    if (error) throw error
  }

  async function loginWithMagicLink(emailAddr: string, inviteCode?: string) {
    const redirect = `${window.location.origin}/auth/confirm${inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : ''}`
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAddr,
      options: { emailRedirectTo: redirect },
    })
    if (error) throw error
  }

  async function resendConfirmation(emailAddr: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailAddr,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    if (error) throw error
  }

  async function logout() {
    _loggingOut = true
    if (isConfigured) await supabase.auth.signOut()
    user.value = null
    initialized.value = false
    _loggingOut = false
  }

  async function logoutAllDevices() {
    _loggingOut = true
    if (isConfigured) await supabase.auth.signOut({ scope: 'global' })
    user.value = null
    initialized.value = false
    _loggingOut = false
  }

  async function resetPassword(emailAddr: string) {
    if (!isConfigured) throw new Error('Password reset requires Supabase to be configured.')
    const { error } = await supabase.auth.resetPasswordForEmail(emailAddr, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    isPasswordRecovery.value = false
  }

  async function updateEmail(newEmail: string) {
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error
  }

  return {
    user,
    email,
    initialized,
    isPasswordRecovery,
    sessionExpired,
    init,
    login,
    signup,
    loginWithOAuth,
    loginWithMagicLink,
    resendConfirmation,
    logout,
    logoutAllDevices,
    resetPassword,
    updatePassword,
    updateEmail,
  }
})
