import type { Transaction, Goal, Todo, CalendarEvent } from '../stores/useStore'

export interface AchievementSnapshot {
  transactions: Transaction[]
  goals: Goal[]
  todos: Todo[]
  events: CalendarEvent[]
}

export interface AchievementDefinition {
  code: string
  title: string
  description: string
  icon: string
  predicate: (s: AchievementSnapshot) => boolean
}

function totalIncome(txns: Transaction[]) {
  return txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
}

function distinctDates(txns: Transaction[]) {
  return new Set(txns.map(t => t.date))
}

function dailyStreak(txns: Transaction[]): number {
  if (txns.length === 0) return 0
  const set = distinctDates(txns)
  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (true) {
    const ds = cursor.toISOString().split('T')[0]
    if (set.has(ds)) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return streak
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: 'first_save_100',
    title: 'First Hundred',
    description: 'Saved $100 in income',
    icon: 'savings',
    predicate: s => totalIncome(s.transactions) >= 100,
  },
  {
    code: 'first_save_1k',
    title: 'Four Digits',
    description: 'Saved $1,000 in income',
    icon: 'paid',
    predicate: s => totalIncome(s.transactions) >= 1000,
  },
  {
    code: 'first_save_10k',
    title: 'Five Digits',
    description: 'Saved $10,000 in income',
    icon: 'account_balance',
    predicate: s => totalIncome(s.transactions) >= 10_000,
  },
  {
    code: 'streak_7_logged',
    title: 'Weekly Habit',
    description: '7 days in a row with a logged transaction',
    icon: 'local_fire_department',
    predicate: s => dailyStreak(s.transactions) >= 7,
  },
  {
    code: 'streak_30_logged',
    title: 'Monthly Habit',
    description: '30 days in a row with a logged transaction',
    icon: 'whatshot',
    predicate: s => dailyStreak(s.transactions) >= 30,
  },
  {
    code: 'first_goal_completed',
    title: 'Goal Crusher',
    description: 'Complete your first joint goal',
    icon: 'emoji_events',
    predicate: s => s.goals.some(g => g.status === 'Completed'),
  },
  {
    code: 'first_date_night',
    title: 'First Date',
    description: 'Plan your first date night',
    icon: 'favorite',
    predicate: s => s.events.some(e => e.category === 'date'),
  },
  {
    code: 'dates_10_total',
    title: 'Ten Dates Deep',
    description: '10 date nights logged',
    icon: 'restaurant',
    predicate: s => s.events.filter(e => e.category === 'date').length >= 10,
  },
  {
    code: 'todos_50_done',
    title: 'Productivity Duo',
    description: '50 completed todos as a team',
    icon: 'task_alt',
    predicate: s => s.todos.filter(t => t.completed).length >= 50,
  },
  {
    code: 'shared_categories_5',
    title: 'Diverse Spenders',
    description: 'Track expenses across 5 categories',
    icon: 'category',
    predicate: s => new Set(s.transactions.filter(t => t.type === 'expense').map(t => t.category)).size >= 5,
  },
  {
    code: 'reviewed_5_dates',
    title: 'Reflective Couple',
    description: 'Rate 5 date nights with a mood',
    icon: 'mood',
    predicate: s => s.events.filter(e => e.category === 'date' && typeof e.mood === 'number' && e.mood !== null).length >= 5,
  },
  {
    code: 'thrifty_no_spend_day',
    title: 'No-Spend Champion',
    description: 'A whole day logged with no expenses',
    icon: 'eco',
    predicate: s => {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = (() => {
        const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]
      })()
      // Reward if both yesterday + today have any income but zero expense
      const hasNoExpenseFor = (date: string) =>
        s.transactions.some(t => t.date === date && t.type === 'income') &&
        !s.transactions.some(t => t.date === date && t.type === 'expense')
      return hasNoExpenseFor(yesterday) || hasNoExpenseFor(today)
    },
  },
]
