# Tango — System Audit (UX, Stability, Fool-proofing)

Date: 2026-06-09
Scope: full repo (front-end Vue 3 app + Supabase backend + PWA infra)
Focus: what's missing, what hurts UX, what makes the app brittle for a non-technical user.

The roadmap in `USER_STORIES.md` (P0/P1 done, P2 open) covers most *product* gaps. This audit covers what that doc doesn't: implementation-level UX foot-guns, stability cracks, and fool-proofing.

---

## 1. The seven highest-leverage problems

These deliver the biggest ratio of "feels-pro" to dev-effort. Tackle in this order.

1. **Replace every native `confirm()` / `alert()` / `prompt()` with an in-app dialog.** 16 call sites across `SettingsView`, `TangoPlans`, `EditGoalModal`, `RecurringTransactionModal`, `NewEventSheet`, `TransactionDetailsModal`, `TangoTodo`. Native browser dialogs (a) look like phishing, (b) can't be styled, (c) freeze the JS thread, (d) on iOS PWA the title bar shows a generic origin, (e) can't be screen-reader-cued with a custom message. Build one `ConfirmDialog.vue` (uses `BaseModal`) + a `useConfirm()` composable that returns a promise — drop-in replacement. Account-delete "type DELETE" prompt should be a styled typed-confirm modal.
2. **Restore visible focus rings everywhere.** Every input in `LoginView`, `SignUpView`, `ResetPasswordView`, `RecurringTransactionModal`, etc. uses `focus:outline-none focus:ring-0` — keyboard users have no idea where they are. Replace with `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`. Same fix for all interactive elements (`TangoButton`, nav links, modal close).
3. **Modal hardening: focus trap + Esc + scroll-lock.** `BaseModal.vue` has none of these. Result: tabbing escapes the modal, background scrolls under it, screen readers don't know it opened. Add (a) `focus-trap-vue` or a 20-line trap, (b) `Escape` handler, (c) `document.body.style.overflow = 'hidden'` on open, (d) `role="dialog" aria-modal="true" aria-labelledby`, (e) auto-focus the first focusable element. One file change improves every modal at once.
4. **Network/offline UX is invisible.** `useOfflineQueue` quietly accumulates writes; the user has no idea their last 5 edits haven't synced. Add a persistent status pill near `NotificationsBell` — "Online", "Offline · 3 queued", "Syncing…", "Failed: tap to retry". Surface `failed_store` items (currently dead in IDB) in a small "Stuck syncs" sheet in Settings.
5. **Destructive-action guard rails.** Two patterns:
   - **Toast undo** for soft destructives — deleting a todo, transaction, goal contribution. Optimistically remove + show a 6 s toast "Deleted. Undo." A native confirm is too heavyweight for these, and the current confirm-every-time pattern trains users to click through. Reserve true confirm dialogs for unrecoverable actions (delete account, leave household, remove partner, hard-delete goal).
   - **Typed-confirm** for the 4 nuclear actions (delete account, leave household, remove partner, sign-out-all-devices). Already done for delete-account — apply the same pattern to the others. Currently a misclick on "Remove Partner" wipes shared data with one OS dialog tap.
6. **Empty-states need a CTA, not just a sad sentence.** `EmptyState.vue` accepts a slot but most call sites pass nothing. Every empty state should have one primary action — "Add your first transaction", "Create a goal", "Invite your partner". This is the single biggest first-session conversion lever.
7. **Add a global, persistent "How does this work?" entry-point.** A tiny `?` button in the top bar that opens a contextual cheat-sheet per route (Budget, Plans, Todos, Calendar). Non-technical partners landing in the app via an invite have no idea what "Vibe Check" or "DuoBar" mean.

---

## 2. UX foot-guns by surface

### Auth & onboarding
- **Sign-up has no "show password" toggle.** Both fields are `type="password"`. Typing a long password twice on mobile is a common bounce point. Add an eye-icon toggle on both fields.
- **Password strength meter is informational only.** Bumps the score but doesn't block weak passwords. Either enforce score >= 2 or remove the visual to avoid implying enforcement.
- **No "you're invited by X" preview on `/join/:code`.** Quick win: fetch the inviter's display name + avatar and show it on the join screen ("Join Sam's household"). Massive trust boost for a partner clicking an unknown link.
- **Reset-password cooldown is per-device.** Stored in `localStorage`, so a user can bypass it by opening a new browser. If this is to prevent SES bill abuse, move the rate-limit server-side (`004_household_invites` style trigger or edge function).
- **Magic-link "sent" state has no resend.** If the email never arrives, the user is stuck. Add a 30 s cooldown + Resend button.

### Pairing (household)
- **Invite link copy is silent on success.** `OnboardingView` likely has copy buttons (verify) — confirm there's a toast on copy. Without it users tap "Copy" several times unsure if it worked.
- **Partner-removal needs a 2-step.** Currently one native confirm — make it a typed-confirm modal with the partner's display name. Same for `transferCreator`.
- **No grace period on Leave Household.** Leaving immediately drops access to all shared data. Consider a 7-day soft delete with a "Restore membership" link in audit log, or at minimum a more emphatic typed-confirm modal.

### Budget
- **`paid_by` is visible but not nudged.** The settle-up card exists, but expense entry doesn't surface "Who paid?" prominently for new users. Make it a default-required field on first-time use (with a remembered default), then optional after.
- **CSV import lacks a "remember mapping" feature.** Each month users re-map columns. Persist last successful mapping per filename hash in `localStorage`.
- **Budget-limit editing has no "set for all months" toggle.** Users may want to set monthly limits once. Add a checkbox under the edit input.
- **`monthlyReport.ts` has no PDF download UX.** Migration / story says it prints — verify it doesn't open the browser print dialog only. If PDF, add an explicit "Download PDF" button alongside Print.

### Todos
- **Recurrence semantics are not documented in-UI.** Users can't tell what "weekly" recurrence means — does it spawn on completion or on schedule? Add a tooltip / helper text under the picker.
- **Smart handoff has no "undo".** Once handed off, the original assignee disappears. Add a 6 s undo toast.
- **Shopping tab has no quantity field.** Common ask for couples — "milk × 2". Add an optional inline qty.
- **No "snooze until tomorrow" gesture.** Common pattern for recurring chores users don't want to bump.

### Goals / Plans
- **Goal target amount has no currency hint.** Multi-currency is a P2 gap, but even single-currency the field should show the symbol inline.
- **Auto-allocate %: no preview of expected monthly contribution.** Add "≈ $X/mo at current income" under the slider.
- **No "stretch goal" or split contribution recommendation.** Suggest a per-partner monthly amount based on income split.

### Calendar
- **Recurring events missing (P2).** Couples track anniversaries, dates, recurring chores. Without this, users duplicate events manually.
- **ICS export is one-shot, no subscribe URL.** A read-only `webcal://` subscription URL is far more useful than a static download. Generate via signed edge function so external calendars stay in sync.
- **Date-night planner ideas have no "save for later".** Idea list is ephemeral.

### Settings
- **Settings is 744 lines.** Split into route-tabs (Account, Household, Notifications, Appearance, Data) — currently overwhelming, especially on mobile where each section scrolls past sub-headers without anchors.
- **Avatar upload has no crop step.** Photos are stored at original aspect, then displayed in a circle — heads get cut off. Add a square-crop modal (`vue-advanced-cropper` is ~30 KB).
- **Data export (GDPR) is missing.** Story `S` lists it as a gap. One-click "Download my data" should ZIP the user's transactions/goals/todos as CSV + a JSON manifest.

### General
- **No "what's new" pane after PWA update.** `usePwaUpdate` triggers a refresh — surface a small release-notes drawer keyed by build hash so users notice features.
- **No bulk-action support anywhere.** Selecting + bulk-deleting transactions or todos is the most common missing power-user feature.
- **No search-within-view.** `GlobalSearch` is great but each view (Budget, Todos) should have a quick filter bar above the list.

---

## 3. Stability & data-integrity cracks

- **No write rate-limiting.** Anyone with a session can hammer `transactions` inserts. Add a `created_at` rolling-window check in a Postgres trigger (e.g. >20 inserts/min throws). Mentioned in P2.
- **Audit log isn't surfaced.** Migration `005` collects rich `before`/`after`/`summary` data — there's no UI to browse it. Build a Settings → Activity log table. This is the single biggest dispute-resolution feature for shared finances.
- **Optimistic-lock pattern is partial.** `useStore.ts` throws `VersionConflictError` on `transactions`, `goals`, but I see no version increments on `calendar_events` updates path (verify). Audit all UPDATE call sites.
- **Realtime channels are not cleanly torn down on logout.** `App.vue` `onUnmounted` stops presence but not the contributions/recurring/notifications subscriptions. On account-switch (or logout-then-login as a different user), the previous channels can still fire onto stale stores. Centralize subscribe/unsubscribe in an `onAuthChange` watcher.
- **Idle timeout duration is hard-coded.** Make it a user pref in Settings (5 / 15 / 30 / 60 / never). Shared-device couples want it short; solo users want it long.
- **CSP has `'unsafe-inline'` in `style-src`.** Required for Vue scoped styles but should be paired with `script-src 'self' 'strict-dynamic'` and a `frame-ancestors 'none'` directive to block clickjacking. Add `object-src 'none'`, `base-uri 'self'`, and a `report-to` endpoint for CSP violations.
- **No client-side error telemetry.** When something breaks for a user, you have no visibility. Add Sentry (free tier) or PostHog with PII scrubbing. Mentioned in P2.
- **`useReadCache` has no schema version.** If a future migration changes a column, stale IDB entries deserialize into broken objects. Bump the IDB version on schema change or stamp records with a schema tag.
- **Offline queue's `failed` store is write-only from the UI side.** Nothing reads or surfaces it (see UX point 4). Right now stuck mutations are silently abandoned.
- **No CSRF on edge functions.** `dispatch_push` should validate origin against an allowlist. Verify it does — if not, anyone with a leaked anon key can fire pushes.
- **Service worker doesn't handle quota-exceeded.** If IndexedDB hits the browser quota, the offline queue throws and the app shows nothing. Catch `QuotaExceededError` and offer a "Clear cache" action.
- **Avatar URL is a public Supabase storage URL.** Anyone with the URL can fetch it forever. Acceptable for avatars but worth flagging that receipt attachments (`receipt_url`) must use signed URLs, not public ones. Verify storage bucket policy.

---

## 4. Accessibility & responsive

- **Visible focus is broken (see Section 1, #2).**
- **Touch targets:** no `min-h-11 min-w-11` (44 px) audit. Many icon-only buttons in `BudgetTracker` and `TangoTodo` are likely sub-target. Add a base class on `TangoButton` for icon variant.
- **`role="dialog"` is missing on `BaseModal`.** Add `role="dialog" aria-modal="true" aria-labelledby="modal-title"`.
- **`aria-live="polite"` region for toasts.** Check `NotificationSystem.vue` — if it doesn't have an `aria-live` container, screen readers miss every error.
- **Color contrast on muted text.** `text-on-surface-variant` over `bg-surface` should be checked against WCAG AA. The pixel-border / hard-shadow aesthetic risks low contrast on info text.
- **Dark mode color tokens not audited.** Verify all `--surface-variant` / `--on-surface-variant` pairs meet 4.5:1.
- **Landmark roles missing.** No `<main>`, `<nav>`, `<header>` semantic tags spotted in `App.vue` shell. Wrap router-view in `<main role="main">` and bottom nav in `<nav role="navigation" aria-label="Primary">`.
- **`prefers-reduced-motion` only respected in `App.vue:349`.** Modal scale, FAB bounces, `FloatingBoy` sprite — all should gate animations behind the media query.
- **Form errors aren't announced.** `error.value = '...'` updates a `<p>` but without `role="alert"` or `aria-live="assertive"` screen readers miss it.

---

## 5. Features worth implementing for "fool-proof" UX

Sorted by impact-to-effort.

### Quick wins (≤ 1 day each)
- **Toast-undo for soft deletes.**
- **Visible focus rings (utility class swap).**
- **Empty-state CTAs.**
- **Custom `ConfirmDialog` + `useConfirm()` composable.**
- **"Invited by X" preview on `/join/:code`.**
- **Show-password toggle on auth forms.**
- **Offline status pill.**
- **Idle-timeout pref.**
- **Resend magic-link cooldown.**
- **Quantity field on shopping items.**

### Medium (2–5 days each)
- **Activity-log viewer** in Settings (audit_log table → table view, filter by table/user/date).
- **In-app guided tour** on first login (3–4 step coach marks per main route). Use `driver.js` (5 KB).
- **Avatar crop modal.**
- **GDPR data export.**
- **Settle-up reminder.** If `paid_by` imbalance > $threshold, banner in Budget: "Sam owes you $42. Mark settled?"
- **Snooze on todos** (+1d, weekend, next week).
- **Recurring calendar events.**
- **Receipt OCR.** Stripe-like — drag receipt, autofill amount + date + merchant (could be edge-fn calling an LLM or hosted OCR). High wow factor.
- **Daily summary push.** Needs `pg_cron` (already flagged P1). Without scheduler, a Netlify cron-triggered edge function is a viable workaround.
- **Signup honeypot + bot-rate-limit.** Sign-up endpoint is unauthenticated; trivial to abuse.

### Larger (1–2 weeks)
- **2FA / MFA** (TOTP via Supabase Auth's built-in factors).
- **Per-device session list + revoke** (Supabase exposes refresh-token rows).
- **Multi-currency** with FX cache.
- **Bank sync (Plaid / TrueLayer / GoCardless)** to replace manual CSV.
- **E2E test suite** (Playwright; 5 happy-path flows: signup, pair, add tx, complete goal, ICS export).
- **i18n** scaffold with `vue-i18n`, English first, structured for community translation.
- **Error telemetry** (Sentry).

---

## 6. Suggested 2-sprint roadmap

**Sprint 1 — "feel pro" (UX polish)**
1. `ConfirmDialog` + `useConfirm()` → replace all native confirms.
2. Focus-ring utility class pass across all inputs/buttons.
3. `BaseModal`: focus trap, Esc, scroll-lock, `role="dialog"`.
4. Toast-undo for soft deletes (todos, txs, goal contributions).
5. Empty-state CTAs across all 4 main views.
6. Offline status pill + failed-sync sheet.
7. "Invited by X" preview on join.
8. Show-password toggle + password meter enforcement.

**Sprint 2 — "trust + recovery"**
1. Activity-log viewer (Settings → History).
2. Idle-timeout preference.
3. CSP hardening + Sentry error telemetry.
4. GDPR data export.
5. Avatar crop.
6. Server-side rate limits on writes + sign-up.
7. Realtime channel teardown audit.
8. Recurring calendar events.

After Sprint 2 the app crosses the line from "couple's side-project" to "thing you'd recommend to your in-laws".

---

## 7. Things `USER_STORIES.md` already lists but worth re-flagging

`USER_STORIES.md` P2 items are correctly prioritized but two deserve a sooner slot:

- **a11y audit (E9)** — should run *with* Sprint 1, not after. Each polish change is a chance to land a11y too; doing it as a separate pass means double the touch.
- **Error telemetry (E9)** — should land before any further feature work. You can't tune what you can't see.

---

End of audit.
