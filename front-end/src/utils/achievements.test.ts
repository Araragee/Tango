import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import type { AchievementSnapshot } from './achievements';
import type { Transaction, Goal, Todo, CalendarEvent } from '../stores/useStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    title: 'Test',
    amount: 100,
    type: 'income',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    icon: 'attach_money',
    ...overrides,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: crypto.randomUUID(),
    title: 'Test Goal',
    description: '',
    target: 1000,
    saved: 0,
    progress: 0,
    icon: 'savings',
    status: 'On Track',
    ...overrides,
  };
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: crypto.randomUUID(),
    text: 'Test todo',
    completed: false,
    category: 'General',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: 'Test event',
    date: new Date().toISOString().split('T')[0],
    time: 'All Day',
    category: 'other',
    icon: 'event',
    partners: [],
    ...overrides,
  };
}

function snap(overrides: Partial<AchievementSnapshot> = {}): AchievementSnapshot {
  return { transactions: [], goals: [], todos: [], events: [], ...overrides };
}

const def = (code: string) => {
  const d = ACHIEVEMENTS.find(a => a.code === code);
  if (!d) throw new Error(`Achievement ${code} not found`);
  return d;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ACHIEVEMENTS — structure', () => {
  it('has 12 definitions', () => {
    expect(ACHIEVEMENTS).toHaveLength(12);
  });

  it('each has required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.code).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(typeof a.predicate).toBe('function');
    }
  });

  it('codes are unique', () => {
    const codes = ACHIEVEMENTS.map(a => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('first_save_100', () => {
  const { predicate } = def('first_save_100');

  it('false with no transactions', () => {
    expect(predicate(snap())).toBe(false);
  });

  it('false with $99 income', () => {
    expect(predicate(snap({ transactions: [makeTx({ amount: 99 })] }))).toBe(false);
  });

  it('true with exactly $100 income', () => {
    expect(predicate(snap({ transactions: [makeTx({ amount: 100 })] }))).toBe(true);
  });

  it('ignores expenses', () => {
    expect(predicate(snap({
      transactions: [
        makeTx({ amount: -200, type: 'expense' }),
        makeTx({ amount: 50, type: 'income' }),
      ],
    }))).toBe(false);
  });
});

describe('first_save_1k', () => {
  const { predicate } = def('first_save_1k');

  it('false below 1000', () => {
    expect(predicate(snap({ transactions: [makeTx({ amount: 999 })] }))).toBe(false);
  });

  it('true at 1000', () => {
    expect(predicate(snap({ transactions: [makeTx({ amount: 1000 })] }))).toBe(true);
  });

  it('accumulates across multiple transactions', () => {
    expect(predicate(snap({
      transactions: [makeTx({ amount: 600 }), makeTx({ amount: 400 })],
    }))).toBe(true);
  });
});

describe('first_save_10k', () => {
  const { predicate } = def('first_save_10k');

  it('true at 10000', () => {
    expect(predicate(snap({ transactions: [makeTx({ amount: 10_000 })] }))).toBe(true);
  });

  it('false at 9999', () => {
    expect(predicate(snap({ transactions: [makeTx({ amount: 9_999 })] }))).toBe(false);
  });
});

describe('first_goal_completed', () => {
  const { predicate } = def('first_goal_completed');

  it('false with no goals', () => {
    expect(predicate(snap())).toBe(false);
  });

  it('false with in-progress goal', () => {
    expect(predicate(snap({ goals: [makeGoal({ status: 'On Track' })] }))).toBe(false);
  });

  it('true when a goal is Completed', () => {
    expect(predicate(snap({ goals: [makeGoal({ status: 'Completed' })] }))).toBe(true);
  });
});

describe('first_date_night', () => {
  const { predicate } = def('first_date_night');

  it('false with no events', () => {
    expect(predicate(snap())).toBe(false);
  });

  it('false with non-date event', () => {
    expect(predicate(snap({ events: [makeEvent({ category: 'health' })] }))).toBe(false);
  });

  it('true with one date-category event', () => {
    expect(predicate(snap({ events: [makeEvent({ category: 'date' })] }))).toBe(true);
  });
});

describe('dates_10_total', () => {
  const { predicate } = def('dates_10_total');

  it('false with 9 dates', () => {
    const events = Array.from({ length: 9 }, () => makeEvent({ category: 'date' }));
    expect(predicate(snap({ events }))).toBe(false);
  });

  it('true with 10 dates', () => {
    const events = Array.from({ length: 10 }, () => makeEvent({ category: 'date' }));
    expect(predicate(snap({ events }))).toBe(true);
  });
});

describe('todos_50_done', () => {
  const { predicate } = def('todos_50_done');

  it('false with 49 completed', () => {
    const todos = Array.from({ length: 49 }, () => makeTodo({ completed: true }));
    expect(predicate(snap({ todos }))).toBe(false);
  });

  it('true with 50 completed', () => {
    const todos = Array.from({ length: 50 }, () => makeTodo({ completed: true }));
    expect(predicate(snap({ todos }))).toBe(true);
  });

  it('does not count incomplete', () => {
    const todos = [
      ...Array.from({ length: 40 }, () => makeTodo({ completed: true })),
      ...Array.from({ length: 20 }, () => makeTodo({ completed: false })),
    ];
    expect(predicate(snap({ todos }))).toBe(false);
  });
});

describe('shared_categories_5', () => {
  const { predicate } = def('shared_categories_5');

  it('false with 4 unique expense categories', () => {
    const txns = ['Food', 'Transport', 'Health', 'Entertainment'].map(category =>
      makeTx({ category, type: 'expense', amount: -10 })
    );
    expect(predicate(snap({ transactions: txns }))).toBe(false);
  });

  it('true with 5 unique expense categories', () => {
    const txns = ['Food', 'Transport', 'Health', 'Entertainment', 'Shopping'].map(category =>
      makeTx({ category, type: 'expense', amount: -10 })
    );
    expect(predicate(snap({ transactions: txns }))).toBe(true);
  });

  it('income categories do not count', () => {
    const txns = ['Food', 'Transport', 'Health', 'Entertainment', 'Salary'].map(category =>
      makeTx({ category, type: 'income', amount: 10 })
    );
    expect(predicate(snap({ transactions: txns }))).toBe(false);
  });
});

describe('reviewed_5_dates', () => {
  const { predicate } = def('reviewed_5_dates');

  it('false with 4 rated date events', () => {
    const events = Array.from({ length: 4 }, () => makeEvent({ category: 'date', mood: 4 }));
    expect(predicate(snap({ events }))).toBe(false);
  });

  it('true with 5 rated date events', () => {
    const events = Array.from({ length: 5 }, () => makeEvent({ category: 'date', mood: 3 }));
    expect(predicate(snap({ events }))).toBe(true);
  });

  it('unrated date events do not count', () => {
    const events = [
      ...Array.from({ length: 5 }, () => makeEvent({ category: 'date', mood: null })),
    ];
    expect(predicate(snap({ events }))).toBe(false);
  });
});

describe('streak achievements (smoke)', () => {
  it('streak_7 requires 7 consecutive days', () => {
    const { predicate } = def('streak_7_logged');
    // Zero transactions → streak 0
    expect(predicate(snap())).toBe(false);
  });

  it('streak_30 requires 30 consecutive days', () => {
    const { predicate } = def('streak_30_logged');
    expect(predicate(snap())).toBe(false);
  });
});
