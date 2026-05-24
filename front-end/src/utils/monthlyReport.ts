/**
 * monthlyReport.ts — Pure aggregation for the monthly couple's recap (F7).
 *
 * Takes raw transactions, goals, todos, calendar events and contributions for
 * a given month and produces a structured `MonthlyReport`. The UI in
 * `MonthlyReport.vue` renders this shape; the same shape is also fed to the
 * browser print dialog so users can "Save as PDF" without a runtime PDF lib.
 *
 * Inputs are read-only — the function does not mutate any array.
 */

import type { Transaction, Goal, Todo, CalendarEvent } from '../stores/useStore'
import type { Contribution } from '../stores/useContributionsStore'

export interface CategoryTotal {
  category: string
  spent: number
  share: number   // 0–1, share of total expenses for the month
  txCount: number
}

export interface BiggestSpend {
  id: string
  title: string
  category: string
  amount: number
  date: string
}

export interface GoalProgressEntry {
  id: string
  title: string
  saved: number
  target: number
  progress: number
  status: Goal['status']
  contributedThisMonth: number
  completedThisMonth: boolean
}

export interface MonthlyReport {
  /** ISO month label e.g. "2026-05" */
  month: string
  /** Human label e.g. "May 2026" */
  monthLabel: string
  totals: {
    income: number
    expenses: number
    net: number
    txCount: number
  }
  topCategories: CategoryTotal[]
  biggestSpends: BiggestSpend[]
  goalProgress: GoalProgressEntry[]
  todoCounts: {
    completed: number
    created: number
  }
  dateNights: {
    count: number
    averageMood: number | null
  }
}

export interface ReportInputs {
  transactions: Transaction[]
  goals: Goal[]
  todos: Todo[]
  events: CalendarEvent[]
  contributions: Contribution[]
}

function inMonth(iso: string, year: number, month: number): boolean {
  // `iso` is either YYYY-MM-DD or a full ISO timestamp. The year-month prefix
  // is enough for the comparison.
  const ym = iso.slice(0, 7)
  return ym === `${year}-${String(month + 1).padStart(2, '0')}`
}

function formatMonthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * @param year  Four-digit year (e.g. 2026).
 * @param month Zero-based month index (0 = January) — matches `Date.getMonth()`.
 */
export function buildMonthlyReport(
  year: number,
  month: number,
  src: ReportInputs,
): MonthlyReport {
  const monthIso = `${year}-${String(month + 1).padStart(2, '0')}`

  const monthTx = src.transactions.filter(t => inMonth(t.date, year, month))
  const expenses = monthTx.filter(t => t.amount < 0)
  const income = monthTx.filter(t => t.amount > 0)

  const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = income.reduce((s, t) => s + t.amount, 0)

  // ── Category totals ─────────────────────────────────────────────────────
  const catMap = new Map<string, { spent: number; count: number }>()
  for (const t of expenses) {
    const entry = catMap.get(t.category) ?? { spent: 0, count: 0 }
    entry.spent += Math.abs(t.amount)
    entry.count += 1
    catMap.set(t.category, entry)
  }
  const topCategories: CategoryTotal[] = Array.from(catMap.entries())
    .map(([category, { spent, count }]) => ({
      category,
      spent,
      share: totalExpenses > 0 ? spent / totalExpenses : 0,
      txCount: count,
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)

  // ── Biggest individual expenses ─────────────────────────────────────────
  const biggestSpends: BiggestSpend[] = [...expenses]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      amount: Math.abs(t.amount),
      date: t.date,
    }))

  // ── Goal progress ───────────────────────────────────────────────────────
  const monthContribs = src.contributions.filter(c => inMonth(c.created_at, year, month))
  const contribByGoal = new Map<string, number>()
  for (const c of monthContribs) {
    contribByGoal.set(c.goal_id, (contribByGoal.get(c.goal_id) ?? 0) + c.amount)
  }
  const goalProgress: GoalProgressEntry[] = src.goals
    .map(g => ({
      id: g.id,
      title: g.title,
      saved: g.saved,
      target: g.target,
      progress: g.progress,
      status: g.status,
      contributedThisMonth: contribByGoal.get(g.id) ?? 0,
      completedThisMonth:
        g.status === 'Completed' && !!g.completed_at && inMonth(g.completed_at, year, month),
    }))
    .filter(g => g.contributedThisMonth > 0 || g.completedThisMonth || g.status !== 'Completed')
    .sort((a, b) => b.contributedThisMonth - a.contributedThisMonth)

  // ── Todo counts ─────────────────────────────────────────────────────────
  const created = src.todos.filter(t => inMonth(t.created_at ?? '', year, month)).length
  const completed = src.todos.filter(t =>
    t.completed && inMonth(t.completed_at ?? t.created_at ?? '', year, month),
  ).length

  // ── Date nights ─────────────────────────────────────────────────────────
  const dateEvents = src.events.filter(
    e => e.category === 'date' && inMonth(e.date, year, month),
  )
  const moodEvents = dateEvents.filter(e => typeof e.mood === 'number')
  const avgMood = moodEvents.length > 0
    ? moodEvents.reduce((s, e) => s + (e.mood ?? 0), 0) / moodEvents.length
    : null

  return {
    month: monthIso,
    monthLabel: formatMonthLabel(year, month),
    totals: {
      income: totalIncome,
      expenses: totalExpenses,
      net: totalIncome - totalExpenses,
      txCount: monthTx.length,
    },
    topCategories,
    biggestSpends,
    goalProgress,
    todoCounts: { created, completed },
    dateNights: { count: dateEvents.length, averageMood: avgMood },
  }
}
