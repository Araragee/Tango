import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: { from: vi.fn(), channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })), removeChannel: vi.fn() },
}));

vi.mock('./useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'user-abc' } }),
}));

vi.mock('./useHouseholdStore', () => ({
  useHouseholdStore: () => ({ householdId: 'hh-123' }),
}));

import { useAchievementsStore } from './useAchievementsStore';
import type { AchievementSnapshot } from '@/utils/achievements';

function snap(overrides: Partial<AchievementSnapshot> = {}): AchievementSnapshot {
  return { transactions: [], goals: [], todos: [], events: [], ...overrides };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('useAchievementsStore', () => {
  it('starts with no unlocked achievements', () => {
    const store = useAchievementsStore();
    expect(store.unlocked).toHaveLength(0);
    expect(store.unlockedCodes.size).toBe(0);
  });

  it('has all 12 achievement definitions', () => {
    const store = useAchievementsStore();
    expect(store.definitions).toHaveLength(12);
  });

  it('unlock adds to unlocked list', async () => {
    const store = useAchievementsStore();
    await store.unlock('first_save_100');
    expect(store.unlocked).toHaveLength(1);
    expect(store.unlockedCodes.has('first_save_100')).toBe(true);
  });

  it('unlock is idempotent — duplicate code not re-added', async () => {
    const store = useAchievementsStore();
    await store.unlock('first_save_100');
    await store.unlock('first_save_100');
    expect(store.unlocked).toHaveLength(1);
  });

  it('unlock multiple different codes', async () => {
    const store = useAchievementsStore();
    await store.unlock('first_save_100');
    await store.unlock('first_goal_completed');
    expect(store.unlocked).toHaveLength(2);
    expect(store.unlockedCodes.has('first_save_100')).toBe(true);
    expect(store.unlockedCodes.has('first_goal_completed')).toBe(true);
  });

  it('evaluate does nothing with empty snapshot', async () => {
    const store = useAchievementsStore();
    await store.evaluate(snap());
    expect(store.unlocked).toHaveLength(0);
  });

  it('evaluate unlocks first_save_100 when income >= 100', async () => {
    const store = useAchievementsStore();
    const txns = [{ id: '1', title: 'Pay', amount: 150, type: 'income' as const, category: 'Income', date: '2025-01-01', icon: 'paid' }];
    await store.evaluate(snap({ transactions: txns }));
    expect(store.unlockedCodes.has('first_save_100')).toBe(true);
  });

  it('evaluate does not unlock first_save_100 when income < 100', async () => {
    const store = useAchievementsStore();
    const txns = [{ id: '1', title: 'Pay', amount: 50, type: 'income' as const, category: 'Income', date: '2025-01-01', icon: 'paid' }];
    await store.evaluate(snap({ transactions: txns }));
    expect(store.unlockedCodes.has('first_save_100')).toBe(false);
  });

  it('evaluate unlocks first_goal_completed for completed goal', async () => {
    const store = useAchievementsStore();
    const goals = [{ id: 'g1', title: 'Fund', description: '', target: 1000, saved: 1000, progress: 100, icon: 'savings', status: 'Completed' }];
    await store.evaluate(snap({ goals }));
    expect(store.unlockedCodes.has('first_goal_completed')).toBe(true);
  });

  it('evaluate unlocks first_date_night for date event', async () => {
    const store = useAchievementsStore();
    const events = [{ id: 'e1', title: 'Dinner', date: '2025-02-14', time: '19:00', category: 'date', icon: 'favorite', partners: [] as string[] }];
    await store.evaluate(snap({ events }));
    expect(store.unlockedCodes.has('first_date_night')).toBe(true);
  });

  it('evaluate skips already unlocked achievements', async () => {
    const store = useAchievementsStore();
    // Pre-unlock
    await store.unlock('first_save_100');
    const unlockSpy = vi.spyOn(store, 'unlock');

    const txns = [{ id: '1', title: 'Pay', amount: 500, type: 'income' as const, category: 'Income', date: '2025-01-01', icon: 'paid', notes: null, created_by: null }];
    await store.evaluate(snap({ transactions: txns }));

    // unlock should NOT be called for first_save_100 again
    const calls = unlockSpy.mock.calls.map(c => c[0]);
    expect(calls.filter(c => c === 'first_save_100')).toHaveLength(0);
  });

  it('unsubscribe clears unlocked list', () => {
    const store = useAchievementsStore();
    // Manually seed some unlocked state
    store.unlocked.push({ id: '1', user_id: 'u', household_id: null, code: 'test', unlocked_at: '', payload: null });
    store.unsubscribe();
    expect(store.unlocked).toHaveLength(0);
  });
});
