# Tango — User Stories

> Caveman-ultra doc. Fragments OK. Story cores kept readable.
> Status: ✅ done · 🟡 partial · ⬜ missing
> Source: code + `front-end/src/Tango System Audit.md` (bug/feat changelog, NOT stories).
> Last sync: 2026-06-01. P0 + P1 complete.

---

## Personas

- **Duo-partner** — one of 2 people in a household. Core user. Shares budget/goals/todos/calendar.
- **Solo** — signed up, no partner yet. Pre-pairing state. Uses app alone, invites later.
- **Returning** — daily/weekly check-in. Cares: fast load, fresh data, nudges.

App = household-scoped. Most stories assume duo. Member cap enforced (`003_member_cap_trigger.sql`).

---

## Epics + Stories

### E1 — Auth & Session

| ID | Story | Status |
|----|-------|--------|
| A1 | As solo, sign up email+pw → start using. | ✅ |
| A2 | As user, login magic link (no pw). | ✅ |
| A3 | As user, login Google OAuth. | ✅ |
| A4 | As user, reset forgotten pw via email. | ✅ |
| A5 | As user, "keep me logged in" → session persists. | ✅ |
| A6 | As user, auto-logout after idle → protect shared device. | ✅ idle timeout |
| A7 | As user, logout all devices. | ✅ |
| A8 | As user, blocked from app routes til auth+household ready. | ✅ route guard |

Gaps: ⬜ 2FA/MFA. ⬜ session list/revoke-per-device UI.

---

### E2 — Household / Pairing

| ID | Story | Status |
|----|-------|--------|
| H1 | As solo, onboarding → create household. | ✅ |
| H2 | As solo, generate invite code + QR → partner joins. | ✅ |
| H3 | As partner, join via code link `/join/:code`. | ✅ |
| H4 | As member, see partner presence (online/offline). | ✅ presence badge |
| H5 | As household, capped at 2 members. | ✅ trigger |
| H6 | As member, manage membership (remove/leave). | ✅ Leave + Remove Partner (creator) in Settings |

Gaps: ✅ rename household (Settings > Household Name). ✅ re-invite flow after partner removed (auto-generate invite + polished UI). ⬜ H7: member presence re-invite deep link (P2).

---

### E3 — Budget & Transactions

| ID | Story | Status |
|----|-------|--------|
| B1 | As duo, add expense/income w/ category + note. | ✅ |
| B2 | As duo, set per-category budget limits, see bars. | ✅ |
| B3 | As duo, attach receipt photo/PDF to tx. | ✅ |
| B4 | As duo, import bank CSV (col-remap + preview). | ✅ |
| B5 | As duo, set up recurring bills, auto-spawn when due. | ✅ |
| B6 | As duo, see spending breakdown by category (sorted). | ✅ |
| B7 | As duo, "vibe check" budget mood signal. | ✅ |
| B8 | As duo, monthly couple's report → print/PDF. | ✅ |
| B9 | As duo, budget analytics charts. | ✅ |
| B10 | As duo, custom emoji per category. | ✅ |
| B11 | As duo, track who paid each expense → see settle-up balance. | ✅ paid_by field + settle-up card |
| B12 | As duo, export transactions → CSV download. | ✅ Export button in Recent card |

Gaps:
- ⬜ recurring **goal contributions** (recurring is tx-only).
- ⬜ multi-currency.
- ⬜ budget rollover / auto month-reset rules.
- ⬜ bank live-sync (only manual CSV).

---

### E4 — Goals / Plans

| ID | Story | Status |
|----|-------|--------|
| G1 | As duo, create savings goal w/ target + deadline. | ✅ |
| G2 | As duo, contribute to goal, split per partner. | ✅ contribution split |
| G3 | As duo, see progress bar + DuoBar (both partners). | ✅ |
| G4 | As duo, complete goal → archive. | ✅ |
| G5 | As duo, earn streaks/achievements as team. | ✅ |
| G6 | As user, auto-allocate % of income to goal. | ✅ Settings > Income Auto-Allocate |
| G7 | As user, see goal deadlines approaching in Plans view. | ✅ 7-day nudge banner + days-left badge |

Gaps: ✅ goal categories/priority (category picker + priority Low/Normal/High in EditGoalModal; filter tabs + priority sort in TangoPlans). ⬜ goal push reminders (needs pg_cron or scheduled edge fn — client can't call dispatch_push directly; in-app 7-day banner covers it for now).

---

### E5 — Todos

| ID | Story | Status |
|----|-------|--------|
| T1 | As duo, add shared todo w/ due date + category. | ✅ |
| T2 | As duo, complete/uncomplete todo (optimistic). | ✅ |
| T3 | As duo, hand off todo to partner. | ✅ smart handoff |
| T4 | As duo, overdue badge (local-date correct). | ✅ |
| T5 | As duo, daily phrase-of-day (shared, deterministic). | ✅ |
| T6 | As duo, shared shopping list (distinct tab, quick-add). | ✅ Shopping tab in To-Dos |
| T7 | As duo, recurring todo auto-spawns next on complete. | ✅ recurrence field + completion-spawn |

Gaps: ✅ subtasks/checklists (JSONB checklist on todos; inline toggle in task list; checklist editor in AddNewTaskModal). ✅ assign-to-partner default (defaultTodoAssignee pref in Settings > Local Preferences; AddNewTaskModal reads it on new task).

---

### E6 — Calendar & Date Night

| ID | Story | Status |
|----|-------|--------|
| C1 | As duo, shared calendar of events. | ✅ |
| C2 | As duo, add event w/ category. | ✅ |
| C3 | As duo, plan date night from idea list. | ✅ planner |
| C4 | As duo, review past date night → mood rating. | ✅ feeds monthly report |
| C5 | As duo, "today" cell stays fresh past midnight. | ✅ |
| C6 | As duo, export calendar to .ics (import to any calendar app). | ✅ ICS export button |
| C7 | As user, see goal deadlines approaching on calendar page. | ✅ 7-day nudge banner |

Gaps: ⬜ event reminders via push (needs pg_cron). ⬜ recurring events. ⬜ Google/ICS import. ⬜ event RSVP/both-confirm.

---

### E7 — Notifications & Activity

| ID | Story | Status |
|----|-------|--------|
| N1 | As user, opt-in web push. | ✅ edge fn `dispatch_push` |
| N2 | As user, in-app notification bell + list. | ✅ |
| N3 | As duo, partner activity feed (who did what). | ✅ |
| N4 | As user, in-app toasts on actions/errors. | ✅ |
| N5 | As user, server triggers fire push on events. | ✅ `012`,`015` |
| N6 | As user, mute specific notification categories (budget, goals, todos, events, partner). | ✅ Settings > Notifications |

Gaps: ⬜ digest/summary push (blocked — needs pg_cron/scheduler; dispatch_push requires server secret). ✅ partner-nudge (nudge_partner_todo RPC → partner.nudge notification → push via mig-015 trigger; bell button on todo rows). ✅ quiet hours (preferences store; in-app toast gate in App.vue notify; Settings UI with start/end time; errors always bypass).

---

### E8 — Settings & Account

| ID | Story | Status |
|----|-------|--------|
| S1 | As user, upload avatar (MIME+size guard). | ✅ |
| S2 | As user, dark mode / follow system theme. | ✅ |
| S3 | As user, edit category emojis. | ✅ |
| S4 | As user, change email (validated). | ✅ |
| S5 | As user, delete account (typed confirm). | ✅ |

Gaps: ⬜ profile display name edit surfaced. ⬜ data export/download (GDPR). ⬜ notification prefs (see E7). ⬜ language/locale.

---

### E9 — Platform / Infra (cross-cutting, non-UI)

| ID | Story | Status |
|----|-------|--------|
| P1 | As user offline, writes queue + replay on reconnect. | ✅ all paths |
| P2 | As user, instant load via read cache. | ✅ |
| P3 | As duo, realtime sync both screens; auto-reconnect. | ✅ backoff |
| P4 | As user, concurrent edits guarded (optimistic lock). | ✅ |
| P5 | As user, install as PWA + install hint. | ✅ |
| P6 | As user, app safe (CSP, open-redirect guard). | ✅ |
| P7 | As user, audit log of sensitive actions. | ✅ `005` |

Gaps: ⬜ E2E tests (only unit, 75). ⬜ i18n. ⬜ a11y audit. ⬜ error telemetry/monitoring. ⬜ rate-limit on writes.

---

## Gaps → Roadmap

Prioritized. P0 = needed for "complete couples app". P1 = strong value. P2 = nice/scale.

### P0 — finish core duo value ✅ ALL DONE
1. ~~**Settle-up / who-paid**~~ ✅ `paid_by` on transactions, settle-up card in Budget.
2. ~~**Data export**~~ ✅ CSV export button in Recent card.
3. ~~**Notification preferences**~~ ✅ Per-category mute in Settings > Appearance.
4. ~~**Membership mgmt UI**~~ ✅ Remove Partner button in Settings > Household.

### P1 — depth + retention ✅ ALL DONE
5. ~~Event + goal reminders~~ ✅ Deadline nudge banners in Plans + Calendar (push scheduling requires pg_cron — add later).
6. ~~Recurring todos~~ ✅ `recurrence` field, completion-spawns next instance. Events recurrence → P2.
7. ~~External calendar sync~~ ✅ ICS export button in Calendar. Import → P2.
8. ~~Shared shopping list~~ ✅ Shopping tab in To-Dos (category-filtered, quick-add).
9. ~~Recurring goal contributions / auto-allocate~~ ✅ Settings > Income Auto-Allocate (% of income → goal).

### P2 — scale + polish
10. i18n / locale + multi-currency (E3/E8/E9).
11. Bank live-sync (replace manual CSV) (E3).
12. 2FA/MFA + per-device session revoke (E1).
13. E2E test suite + error telemetry + write rate-limit (E9).
14. a11y audit pass (E9).

---

## Maintenance notes

- Status reflects 2026-06-01 code. Re-sync on feature merge.
- Bug-level history → `front-end/src/Tango System Audit.md`. This doc = product, not bugs.
- F13/F14 (audit numbering) never built — slots skipped, not tracked here.
