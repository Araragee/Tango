import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'

export interface HouseholdMember {
  id: string
  user_id: string
  role: string
  email?: string
}

export const useHouseholdStore = defineStore('household', () => {
  const householdId = ref<string | null>(null)
  const inviteCode = ref<string | null>(null)
  const members = ref<HouseholdMember[]>([])

  const auth = useAuthStore()

  const partner = computed(() => members.value.find(m => m.user_id !== auth.user?.id))

  async function load() {
    if (!isConfigured) {
      householdId.value = 'demo-household'
      inviteCode.value = 'DEMO01'
      // Kick off data fetch in demo mode too
      await _afterLoad()
      return
    }
    if (!auth.user) return

    const { data } = await supabase
      .from('household_members')
      .select('household_id, households(invite_code)')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (data) {
      householdId.value = data.household_id
      inviteCode.value = (data.households as any)?.invite_code ?? null
      await loadMembers()
      await _afterLoad()
    }
  }

  /** Called after householdId is set: fetch data & start realtime */
  async function _afterLoad() {
    // Lazy-import to avoid circular dependency at module load time
    const { useAppStore } = await import('./useStore')
    const appStore = useAppStore()
    await appStore.fetchAll() // also subscribes realtime inside
  }

  async function loadMembers() {
    if (!householdId.value || !isConfigured) return

    const { data } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId.value)

    members.value = data ?? []
  }

  async function createHousehold() {
    if (!auth.user) throw new Error('Not authenticated')

    if (!isConfigured) {
      householdId.value = 'demo-household'
      inviteCode.value = 'DEMO01'
      await _afterLoad()
      return
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    // RPC handles household + member insert atomically (security definer bypasses bootstrapping RLS issue)
    const { data: id, error } = await supabase.rpc('create_household', { invite_code: code })

    if (error) throw error

    householdId.value = id as string
    inviteCode.value = code
    await _afterLoad()
  }

  async function joinHousehold(code: string) {
    if (!auth.user) throw new Error('Not authenticated')

    if (!isConfigured) {
      householdId.value = 'demo-household'
      inviteCode.value = code.toUpperCase()
      await _afterLoad()
      return
    }

    const { data: id, error } = await supabase.rpc('join_household', { invite_code: code })

    if (error) throw new Error(error.message.includes('Invalid') ? 'Invalid invite code' : error.message)

    householdId.value = id as string
    inviteCode.value = code.toUpperCase()
    await loadMembers()
    await _afterLoad()
  }

  async function sendEmailInvite(email: string) {
    if (!inviteCode.value) throw new Error('No invite code')
    if (!isConfigured) {
      throw new Error('Email invite requires Supabase to be configured')
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/signup?invite=${inviteCode.value}`,
      },
    })
    if (error) throw error
  }

  async function reset() {
    // Tear down realtime before clearing state
    const { useAppStore } = await import('./useStore')
    const appStore = useAppStore()
    appStore.unsubscribeRealtime()

    householdId.value = null
    inviteCode.value = null
    members.value = []
  }

  return { householdId, inviteCode, members, partner, load, createHousehold, joinHousehold, sendEmailInvite, loadMembers, reset }
})
