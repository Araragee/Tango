import { describe, it, expect } from 'vitest';
import { buildMonthlyReport } from './monthlyReport';
import type { Transaction, Goal, Todo, CalendarEvent } from '../stores/useStore';
import type { Contribution } from '../stores/useContributionsStore';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'tx',
    amount: -10,
    date: '2026-05-15',
    type: 'expense',
    icon: 'shopping_cart',
    category: 'Food',
    ...overrides,
  };
}

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'goal',
    description: '',
    saved: 0,
    target: 100,
    status: 'On Track',
    icon: 'savings',
    progress: 0,
    ...overrides,
  };
}

function todo(overrides: Partial<Todo>): Todo {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    text: 'task',
    completed: false,
    category: 'General',
    ...overrides,
  };
}

function evt(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: 'event',
    time: '19:00',
    date: '2026-05-10',
    category: 'date',
    partners: [],
    icon: 'favorite',
    ...overrides,
  };
}

function contrib(overrides: Partial<Contribution>): Contribution {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    goal_id: 'g1',
    user_id: 'u1',
    amount: 10,
    note: null,
    created_at: '2026-05-10T00:00:00Z',
    ...(overrides as any),
  };
}

const YEAR = 2026;
const MONTH = 4; // May, zero-based

describe('buildMonthlyReport', () => {
  it('returns zeros and empty lists when no data falls in the month', () => {
    const r = buildMonthlyReport(YEAR, MONTH, {
      transactions: [tx({ date: '2026-04-30' })],
      goals: [],
      todos: [],
      events: [],
      contributions: [],
    });

    expect(r.month).toBe('2026-05');
    expect(r.totals.expenses).toBe(0);
    expect(r.totals.income).toBe(0);
    expect(r.totals.txCount).toBe(0);
    expect(r.topCategories).toEqual([]);
    expect(r.biggestSpends).toEqual([]);
    expect(r.dateNights.count).toBe(0);
    expect(r.dateNights.averageMood).toBeNull();
  });

  it('aggregates totals, top categories, and biggest spends in-month', () => {
    const r = buildMonthlyReport(YEAR, MONTH, {
      transactions: [
        tx({ amount: 1000, type: 'income', category: 'Salary', date: '2026-05-01' }),
        tx({ amount: -200, category: 'Food', date: '2026-05-10' }),
        tx({ amount: -150, category: 'Food', date: '2026-05-12' }),
        tx({ amount: -100, category: 'Transport', date: '2026-05-15' }),
        // Out of month — ignored
        tx({ amount: -999, category: 'Food', date: '2026-06-01' }),
      ],
      goals: [],
      todos: [],
      events: [],
      contributions: [],
    });

    expect(r.totals.income).toBe(1000);
    expect(r.totals.expenses).toBe(450);
    expect(r.totals.net).toBe(550);
    expect(r.totals.txCount).toBe(4);

    expect(r.topCategories[0].category).toBe('Food');
    expect(r.topCategories[0].spent).toBe(350);
    expect(r.topCategories[0].txCount).toBe(2);
    expect(r.topCategories[0].share).toBeCloseTo(350 / 450);

    expect(r.biggestSpends[0].amount).toBe(200);
    expect(r.biggestSpends[1].amount).toBe(150);
  });

  it('attributes contributions and completion to the right month', () => {
    const r = buildMonthlyReport(YEAR, MONTH, {
      transactions: [],
      goals: [
        goal({ id: 'g1', title: 'Trip', saved: 600, target: 1000, progress: 60 }),
        goal({
          id: 'g2',
          title: 'Old',
          status: 'Completed',
          completed_at: '2026-04-30T12:00:00Z', // previous month
        }),
      ],
      todos: [],
      events: [],
      contributions: [
        contrib({ goal_id: 'g1', amount: 50, created_at: '2026-05-05T00:00:00Z' }),
        contrib({ goal_id: 'g1', amount: 25, created_at: '2026-05-20T00:00:00Z' }),
        contrib({ goal_id: 'g1', amount: 999, created_at: '2026-06-01T00:00:00Z' }), // out of month
      ],
    });

    const g1 = r.goalProgress.find(g => g.id === 'g1');
    expect(g1?.contributedThisMonth).toBe(75);
    expect(g1?.completedThisMonth).toBe(false);

    // g2 was completed in April, not May, so it should not appear
    expect(r.goalProgress.find(g => g.id === 'g2')).toBeUndefined();
  });

  it('counts todos created or completed in the month', () => {
    const r = buildMonthlyReport(YEAR, MONTH, {
      transactions: [],
      goals: [],
      todos: [
        todo({ created_at: '2026-05-02T00:00:00Z' }),
        todo({ created_at: '2026-05-04T00:00:00Z', completed: true, completed_at: '2026-05-08T00:00:00Z' }),
        todo({ created_at: '2026-04-30T00:00:00Z', completed: true, completed_at: '2026-05-01T00:00:00Z' }),
      ],
      events: [],
      contributions: [],
    });

    expect(r.todoCounts.created).toBe(2);
    expect(r.todoCounts.completed).toBe(2);
  });

  it('averages date-night moods', () => {
    const r = buildMonthlyReport(YEAR, MONTH, {
      transactions: [],
      goals: [],
      todos: [],
      events: [
        evt({ mood: 4 }),
        evt({ mood: 5 }),
        evt({ mood: null }), // not counted in the average
        evt({ category: 'errand', mood: 1 }), // not a date night
      ],
      contributions: [],
    });

    expect(r.dateNights.count).toBe(3);
    expect(r.dateNights.averageMood).toBe(4.5);
  });
});
