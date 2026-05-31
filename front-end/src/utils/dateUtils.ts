/**
 * dateUtils.ts — Date helpers for Tango
 *
 * Transaction and event dates in Tango are LOCAL calendar dates (YYYY-MM-DD)
 * sourced from <input type="date"> elements. Using `new Date().toISOString()`
 * returns a UTC timestamp, which for users in positive-UTC-offset timezones
 * (e.g. UTC+10) produces tomorrow's date during evening hours — causing
 * overdue badges, streak counts, and default date fields to be off by one day.
 *
 * Always use `localDateISO()` instead of `new Date().toISOString().split('T')[0]`.
 */

/**
 * Returns a YYYY-MM-DD string for the given date (defaults to today)
 * using the LOCAL calendar date, not UTC.
 */
export function localDateISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
