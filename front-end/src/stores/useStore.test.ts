import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// ── Mock Supabase + dependent stores ─────────────────────────────────────────
vi.mock('@/lib/supabase', () => ({
  isConfigured: false,
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('./useAuthStore', () => ({
  useAuthStore: () => ({ user: { id: 'test-user' }, email: 'test@example.com' }),
}));

vi.mock('./useHouseholdStore', () => ({
  useHouseholdStore: () => ({ householdId: null, partner: null }),
}));

vi.mock('./useOfflineQueue', () => ({
  useOfflineQueue: () => ({ enqueue: vi.fn() }),
}));

import { useAppStore } from './useStore';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia());
});

// ── Transactions ──────────────────────────────────────────────────────────────

describe('Transactions', () => {
  it('addTransaction appends to recentActivity', async () => {
    const store = useAppStore();
    await store.addTransaction({
      title: 'Grocery run',
      amount: -45.5,
      type: 'expense',
      category: 'Food',
      date: '2025-01-15',
      icon: 'shopping_cart',
    });
    expect(store.budget.recentActivity).toHaveLength(1);
    expect(store.budget.recentActivity[0].title).toBe('Grocery run');
  });

  it('addTransaction updates balance', async () => {
    const store = useAppStore();
    await store.addTransaction({
      title: 'Salary',
      amount: 5000,
      type: 'income',
      category: 'Income',
      date: '2025-01-01',
      icon: 'paid',
    });
    expect(store.budget.balance).toBe(5000);
  });

  it('multiple transactions accumulate balance', async () => {
    const store = useAppStore();
    await store.addTransaction({ title: 'Income', amount: 1000, type: 'income', category: 'Income', date: '2025-01-01', icon: 'paid' });
    await store.addTransaction({ title: 'Rent', amount: -400, type: 'expense', category: 'Bills', date: '2025-01-02', icon: 'home' });
    expect(store.budget.balance).toBe(600);
  });

  it('deleteTransaction removes from list', async () => {
    const store = useAppStore();
    await store.addTransaction({ title: 'Coffee', amount: -5, type: 'expense', category: 'Food', date: '2025-01-03', icon: 'local_cafe' });
    const id = store.budget.recentActivity[0].id;
    await store.deleteTransaction(id);
    expect(store.budget.recentActivity).toHaveLength(0);
  });

  it('prepends newest transaction first', async () => {
    const store = useAppStore();
    await store.addTransaction({ title: 'First', amount: 10, type: 'income', category: 'Income', date: '2025-01-01', icon: 'paid' });
    await store.addTransaction({ title: 'Second', amount: 20, type: 'income', category: 'Income', date: '2025-01-02', icon: 'paid' });
    expect(store.budget.recentActivity[0].title).toBe('Second');
  });
});

// ── Goals ─────────────────────────────────────────────────────────────────────

describe('Goals', () => {
  it('addGoal appends to goals list', async () => {
    const store = useAppStore();
    await store.addGoal({
      title: 'Emergency Fund',
      description: '3 months expenses',
      target: 5000,
      saved: 0,
      icon: 'savings',
      completed_at: null,
      version: 1,
    });
    expect(store.plans.goals).toHaveLength(1);
    expect(store.plans.goals[0].title).toBe('Emergency Fund');
  });

  it('addGoal calculates progress 0% when saved=0', async () => {
    const store = useAppStore();
    await store.addGoal({ title: 'Vacation', description: '', target: 2000, saved: 0, icon: 'flight', completed_at: null, version: 1 });
    expect(store.plans.goals[0].progress).toBe(0);
  });

  it('addGoal calculates progress correctly', async () => {
    const store = useAppStore();
    await store.addGoal({ title: 'Laptop', description: '', target: 1000, saved: 500, icon: 'laptop', completed_at: null, version: 1 });
    expect(store.plans.goals[0].progress).toBe(50);
  });

  it('deleteGoal removes by id', async () => {
    const store = useAppStore();
    await store.addGoal({ title: 'Car', description: '', target: 10000, saved: 0, icon: 'directions_car', completed_at: null, version: 1 });
    const id = store.plans.goals[0].id;
    await store.deleteGoal(id);
    expect(store.plans.goals).toHaveLength(0);
  });

  it('adds multiple goals independently', async () => {
    const store = useAppStore();
    await store.addGoal({ title: 'Goal A', description: '', target: 100, saved: 0, icon: 'star', completed_at: null, version: 1 });
    await store.addGoal({ title: 'Goal B', description: '', target: 200, saved: 0, icon: 'star', completed_at: null, version: 1 });
    expect(store.plans.goals).toHaveLength(2);
  });
});

// ── Todos ─────────────────────────────────────────────────────────────────────

describe('Todos', () => {
  it('addTask appends to todos list', async () => {
    const store = useAppStore();
    await store.addTask({
      text: 'Buy groceries',
      category: 'General',
      priority: 'Normal',
    });
    expect(store.todos.items).toHaveLength(1);
    expect(store.todos.items[0].text).toBe('Buy groceries');
  });

  it('toggleTodo flips completed flag', async () => {
    const store = useAppStore();
    await store.addTask({ text: 'Task', category: 'General', priority: 'Normal' });
    const id = store.todos.items[0].id;
    await store.toggleTodo(id);
    expect(store.todos.items[0].completed).toBe(true);
  });

  it('toggleTodo can uncomplete a task (double-toggle)', async () => {
    const store = useAppStore();
    await store.addTask({ text: 'Task', category: 'General', priority: 'Normal' });
    const id = store.todos.items[0].id;
    await store.toggleTodo(id); // false → true
    await store.toggleTodo(id); // true → false
    expect(store.todos.items[0].completed).toBe(false);
  });

  it('deleteTask removes from list', async () => {
    const store = useAppStore();
    await store.addTask({ text: 'Delete me', category: 'General', priority: 'Normal' });
    const id = store.todos.items[0].id;
    await store.deleteTask(id);
    expect(store.todos.items).toHaveLength(0);
  });
});

// ── Calendar events ───────────────────────────────────────────────────────────

describe('Calendar Events', () => {
  it('addEvent appends to events list', async () => {
    const store = useAppStore();
    await store.addEvent({
      title: 'Date night',
      date: '2025-02-14',
      time: '19:00',
      category: 'date',
      icon: 'favorite',
      partners: [],
    });
    expect(store.calendar.events).toHaveLength(1);
    expect(store.calendar.events[0].title).toBe('Date night');
  });

  it('deleteEvent removes from list', async () => {
    const store = useAppStore();
    await store.addEvent({ title: 'Event', date: '2025-03-01', time: 'All Day', category: 'other', icon: 'event', partners: [] });
    const id = store.calendar.events[0].id;
    await store.deleteEvent(id);
    expect(store.calendar.events).toHaveLength(0);
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('starts as false', () => {
    const store = useAppStore();
    expect(store.loading).toBe(false);
  });
});
