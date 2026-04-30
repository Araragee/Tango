import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)

  async function init() {
    if (!isConfigured) {
      // Demo mode: mock session
      user.value = { id: 'demo', email: 'demo@tango.app' } as User
      initialized.value = true
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })

    initialized.value = true
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
    return data.user
  }

  async function signup(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: displayName ? { display_name: displayName } : {} },
    })
    if (error) throw error
    if (!data.session) {
      throw new Error('Check your email to confirm your account, then sign in.')
    }
    user.value = data.user
    return data.user
  }

  async function logout() {
    if (isConfigured) await supabase.auth.signOut()
    user.value = null
    initialized.value = false
  }

  async function resetPassword(email: string) {
    if (!isConfigured) throw new Error('Password reset requires Supabase to be configured.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }

  return { user, initialized, init, login, signup, logout, resetPassword }
})
