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
  // Tracks an in-flight init() call so concurrent invocations (main.ts + router
  // guard) share one Promise and never register duplicate onAuthStateChange listeners.
  let _initPromise: Promise<void> | null = null
  // Stores the subscription returned by onAuthStateChange so it can be removed
  // on logout. Without this, each login/logout cycle registers a fresh listener
  // on top of the old one, causing stale callbacks to accumulate. (B85)
  let _authSub: { unsubscribe: () => void } | null = null

  const email = computed(() => user.value?.email ?? null)

  async function init() {
    // Guard 1: already done — return immediately.
    if (initialized.value) return

    // Guard 2: already in-flight — share the same Promise so a second caller
    // (e.g. the router beforeEach while main.ts await is still pending) waits
    // on the same work instead of registering a second listener.
    if (_initPromise) return _initPromise

    _initPromise = _doInit()
    try {
      await _initPromise
    } finally {
      _initPromise = null
    }
  }

  async function _doInit() {
    if (!isConfigured) {
      user.value = { id: 'demo', email: 'demo@tango.app' } as User
      initialized.value = true
      return
    }

    // "Keep me logged in" = unchecked: tango:no-persist is set in localStorage.
    // If the sessionStorage sentinel is absent, the browser was restarted (or a
    // new tab opened) — clear the persisted session so the user starts logged out.
    if (localStorage.getItem('tango:no-persist') && !sessionStorage.getItem('tango:session-alive')) {
      localStorage.removeItem('tango:no-persist')
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      if (sbKey) localStorage.removeItem(sbKey)
    }

    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null

    // Remove any stale listener from a prior init/logout cycle before registering
    // a new one.  Without this, each login+logout+login cycle accumulates an extra
    // onAuthStateChange callback that fires (redundantly) for every future event. (B85)
    _authSub?.unsubscribe()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user ?? null
      if (event === 'PASSWORD_RECOVERY') {
        isPasswordRecovery.value = true
      }
      if (event === 'SIGNED_OUT') {
        if (!_loggingOut) sessionExpired.value = true
        await useHouseholdStore().reset()
      }
    })
    _authSub = subscription

    initialized.value = true
  }

  async function login(emailAddr: string, password: string, keepLoggedIn = true) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailAddr, password })
    if (error) throw error
    if (!keepLoggedIn) {
      localStorage.setItem('tango:no-persist', '1')
      sessionStorage.setItem('tango:session-alive', '1')
    } else {
      localStorage.removeItem('tango:no-persist')
      sessionStorage.removeItem('tango:session-alive')
    }
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
    // Tear down the listener before resetting initialized so the next init()
    // call doesn't stack a second listener on top of this one. (B85)
    _authSub?.unsubscribe()
    _authSub = null
    user.value = null
    initialized.value = false
    _loggingOut = false
    localStorage.removeItem('tango:no-persist')
    sessionStorage.removeItem('tango:session-alive')
  }

  async function logoutAllDevices() {
    _loggingOut = true
    if (isConfigured) await supabase.auth.signOut({ scope: 'global' })
    _authSub?.unsubscribe()
    _authSub = null
    user.value = null
    initialized.value = false
    _loggingOut = false
    localStorage.removeItem('tango:no-persist')
    sessionStorage.removeItem('tango:session-alive')
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
