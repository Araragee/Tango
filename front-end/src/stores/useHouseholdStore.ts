import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from './useAuthStore'
import { useAppStore } from './useStore'

export interface HouseholdMember {
  id: string
  user_id: string
  role: 'creator' | 'partner'
  email?: string
}

export interface ActiveInvite {
  code: string
  expires_at: string
}

export const useHouseholdStore = defineStore('household', () => {
  const householdId = ref<string | null>(null)
  const inviteCode = ref<string | null>(null)
  const members = ref<HouseholdMember[]>([])
  const activeInvite = ref<ActiveInvite | null>(null)

  const partner = computed(() => {
    const auth = useAuthStore()
    return members.value.find(m => m.user_id !== auth.user?.id)
  })
  const isCreator = computed(() => {
    const auth = useAuthStore()
    const me = members.value.find(m => m.user_id === auth.user?.id)
    return me?.role === 'creator'
  })

  async function load() {
    if (!isConfigured) {
      householdId.value = 'demo-household'
      inviteCode.value = 'DEMO01'
      await _afterLoad()
      return
    }
    const auth = useAuthStore()
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
      await loadActiveInvite()
      await _afterLoad()
    } else if (householdId.value) {
      // Network unavailable but have persisted householdId — boot from IndexedDB cache
      await _afterLoad()
    }
  }

  async function _afterLoad() {
    await useAppStore().fetchAll()
  }

  async function loadMembers() {
    if (!householdId.value || !isConfigured) return

    const { data } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId.value)

    members.value = (data ?? []) as HouseholdMember[]
  }

  async function loadActiveInvite() {
    if (!householdId.value || !isConfigured) return

    const { data } = await supabase
      .from('household_invites')
      .select('code, expires_at')
      .eq('household_id', householdId.value)
      .is('used_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    activeInvite.value = data as ActiveInvite | null
  }

  async function createHousehold() {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Not authenticated')

    if (!isConfigured) {
      householdId.value = 'demo-household'
      inviteCode.value = 'DEMO01'
      activeInvite.value = { code: 'DEMO01', expires_at: new Date(Date.now() + 86_400_000).toISOString() }
      await _afterLoad()
      return
    }

    // Use crypto.randomUUID() instead of Math.random().toString(36).substring(2,8)
    // which can produce codes shorter than 6 chars (e.g. Math.random()=0.5 →
    // "0.i".substring(2,8) = "i", length 1). UUID hex digits are always 32 chars
    // so slicing 6 gives a reliably fixed-length code. (B84)
    const code = crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()
    const { data: id, error } = await supabase.rpc('create_household', { invite_code: code })
    if (error) throw error

    householdId.value = id as string
    inviteCode.value = code
    await loadMembers()
    await createInvite()
    await _afterLoad()
  }

  async function createInvite() {
    if (!isConfigured) {
      const code = crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()
      activeInvite.value = { code, expires_at: new Date(Date.now() + 86_400_000).toISOString() }
      return activeInvite.value
    }

    const { data, error } = await supabase.rpc('create_invite')
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    activeInvite.value = { code: row.code, expires_at: row.expires_at }
    return activeInvite.value
  }

  async function revokeInvites() {
    if (!isConfigured) {
      activeInvite.value = null
      return
    }
    const { error } = await supabase.rpc('revoke_invites')
    if (error) throw error
    activeInvite.value = null
  }

  async function joinHousehold(code: string) {
    const auth = useAuthStore()
    if (!auth.user) throw new Error('Not authenticated')

    if (!isConfigured) {
      householdId.value = 'demo-household'
      inviteCode.value = code.toUpperCase()
      await _afterLoad()
      return
    }

    const trimmed = code.trim().toUpperCase()

    let { data: id, error } = await supabase.rpc('redeem_invite', { invite_code: trimmed })

    if (error && /Invalid invite code/i.test(error.message)) {
      const fallback = await supabase.rpc('join_household', { invite_code: trimmed })
      if (fallback.error) throw new Error(fallback.error.message.includes('Invalid') ? 'Invalid invite code' : fallback.error.message)
      id = fallback.data
    } else if (error) {
      throw error
    }

    householdId.value = id as string
    inviteCode.value = trimmed
    await loadMembers()
    await _afterLoad()
  }

  async function leaveHousehold() {
    if (!isConfigured) {
      await reset()
      return
    }
    const { error } = await supabase.rpc('leave_household')
    if (error) throw error
    await reset()
  }

  async function transferCreator(newCreatorId: string) {
    if (!isConfigured) return
    const { error } = await supabase.rpc('transfer_creator', { new_creator: newCreatorId })
    if (error) throw error
    await loadMembers()
  }

  async function deleteAccount() {
    if (!isConfigured) {
      await reset()
      return
    }
    const { error } = await supabase.rpc('delete_my_data')
    if (error) throw error
    const auth = useAuthStore()
    await auth.logout()
    await reset()
  }

  async function sendEmailInvite(email: string) {
    const code = activeInvite.value?.code ?? inviteCode.value
    if (!code) throw new Error('No invite code')
    if (!isConfigured) throw new Error('Email invite requires Supabase to be configured')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/join/${code}`,
      },
    })
    if (error) throw error
  }

  async function reset() {
    useAppStore().unsubscribeRealtime()

    householdId.value = null
    inviteCode.value = null
    members.value = []
    activeInvite.value = null
  }

  return {
    householdId,
    inviteCode,
    members,
    partner,
    isCreator,
    activeInvite,
    load,
    loadMembers,
    loadActiveInvite,
    createHousehold,
    createInvite,
    revokeInvites,
    joinHousehold,
    leaveHousehold,
    transferCreator,
    deleteAccount,
    sendEmailInvite,
    reset,
  }
}, {
  persist: {
    key: 'tango:household',
    pick: ['householdId', 'inviteCode', 'members'],
  },
})