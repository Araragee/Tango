# Tango — Mobile Responsiveness, Settings Grouping & Button Audit

Date: 2026-06-14
Scope: front-end Vue 3 app. Goal: make the app mobile-first, regroup Settings for
easier navigation, fix cramped/inaccessible card buttons, and repair broken links/APIs.

All changes verified: `vue-tsc` typecheck clean, **75/75 tests pass**, production build
succeeds, ESLint **0 errors** (warnings are the project's pre-existing attribute-order
style only). No dependencies added; `package-lock.json` left as-is (its diff pre-dates
this work).

---

## 1. App shell header (`App.vue`) — fixed a real layout bug

The header previously nested **every** action button (search, notifications, help,
activity, archive, settings avatar) *inside* the logo's `@click="goHome()"` element.
Consequences: clicking any action also bubbled up and navigated home, there was no
real logo, no flex spacer (everything crammed to the left), and the `navItems` array
was defined but never rendered — so **desktop had no primary navigation at all**.

Rebuilt the header as: **logo/home (left) → desktop nav → spacer → actions (right)**.

- Real brand mark (heart + "Tango"; wordmark hides below 384px via the `xs:` breakpoint).
- Desktop primary nav (Budget / Plans / To-Dos / Calendar) now rendered for ≥ md.
- Actions no longer bubble into `goHome()`.
- On mobile the secondary actions (Help, Activity, Archive) collapse into a single
  **"More" overflow menu** so the top bar isn't crammed; they stay inline on desktop.
- Avatar/settings is now a real `<button>` (keyboard-focusable).

## 2. Settings (`SettingsView.vue`) — grouped into tabs

744 lines of seven stacked cards became a **tabbed layout** (Profile · Household ·
Account · Notifications · Appearance · Budget · Data & Sync). The tab strip scrolls
horizontally on mobile, so no group is more than one tap away.

- **Notifications** settings were previously buried *inside* the Appearance card — split
  into their own tab.
- The active tab is mirrored in the URL (`?tab=`). This **fixes a broken link**: the
  sync-status pill already linked to `/app/settings?tab=data` with a "we'll add this tab
  later" TODO — that tab now exists and is honored (with a friendly "Everything is
  synced" empty state).

## 3. Card buttons & accessibility

- `TangoButton`: added comfortable min-heights per size (sm 36px / md 44px / lg 52px).
- Global, app-wide **visible focus ring** for keyboard users (`:focus-visible` outline)
  added via low-specificity `:where()` so components can still override.
- New `.tap-target` / `.tap-target-mobile` utilities for icon-only buttons (44px hit area;
  the mobile variant stays compact on pointer-precise screens).
- Global `prefers-reduced-motion` guard (was only honored in one place).
- `BaseModal` close button referenced an undefined color (`primary-fixed`) so its hover
  did nothing — fixed, plus a proper tap target.

## 4. To-Dos (`TangoTodo.vue`) — biggest mobile fix

- Task action buttons (hand-off, nudge, edit, snooze, delete) and the shopping-list
  delete were `opacity-0 group-hover:opacity-100` — **invisible and unusable on touch
  devices** (no hover). They're now visible on mobile and hover-revealed on desktop.
- Task cards restructured: on mobile the actions move to their **own row beneath the
  text** (no longer crushed beside squished text); right-aligned on desktop.
- **Snooze was a dead button** ("requires P2 feature"). Implemented for real: it now
  pushes the due date out by one day (anchored to today when there's no/overdue date).

## 5. Calendar (`SharedCalendar.vue`) — header de-crammed

The header packed eight controls (view switcher + prev/today/next + .ics + Date Night +
New Event) into one wrapping row that jumbled on phones. Regrouped into two tidy rows:
view switcher + period navigation on one, the three actions on the next (equal-width on
mobile, inline on desktop).

---

## Broken links / APIs checked

- All 13 Supabase `rpc()` calls map to functions defined in the generated schema — none broken.
- All `router.push` targets resolve to defined routes — none broken.
- `supabase.ts` already tolerates both `VITE_SUPABASE_ANON_KEY` and `..._PUBLISHABLE_KEY`.
- CSP, SPA redirect, and font/icon loading in `index.html` / `netlify.toml` are sound.
- Two real issues found and fixed: the `?tab=data` dead link (§2) and the placebo
  snooze button (§4).

## Decisions made autonomously

- Snooze = **+1 day** (simplest correct behaviour matching the button's tooltip).
- Mobile secondary header actions placed in a **"More" menu** rather than dropped, so
  nothing becomes unreachable on small screens.
- Data tab shows the existing sync-status card when there are queued/failed items, else a
  reassuring empty state.
- Did **not** run `eslint --fix` repo-wide (would churn ~470 pre-existing style warnings
  across unrelated files); kept the diff focused.

## Suggested follow-ups (not done)

- Apply the same touch-target pass to the dense icon buttons in `BudgetTracker` /
  modals.
- Consider real "snooze" presets (tonight / weekend / next week) per the original audit.

---

# Addendum — Run 2 (same day): touch-target pass completed

The first follow-up above is now **done**. This pass extends the 44px-on-mobile touch
target to the dense icon-only buttons the first run deferred, using the existing
`.tap-target-mobile` utility (44px hit area at ≤639px, intrinsic size on pointer-precise
screens) so desktop rows stay compact. Icons bumped 14px → 18px and `aria-label`s added.

- **BudgetTracker** — the inline category-limit editor's save (✓) and cancel (✗) controls
  were 14px icons with no hit area; now tap-targeted with labels.
- **RecurringList** — the pause/resume toggle on each bill row (`text-sm`, no target) now
  meets 44px on mobile.
- **TangoPlans** — the per-goal delete button in each goal card's footer enlarged.
- **EditGoalModal** — the per-contribution delete button enlarged.
- **AddNewTaskModal** — the checklist-item remove (✗) button enlarged.
- **NewEventSheet** — the cancel-edit control was a 14px clickable `<span>` carrying a
  `group-hover:` class that never fired (no `group` ancestor). Converted to a real
  `<button>` with a tap target and `aria-label`; the decorative edit affordance is now
  `aria-hidden` since the whole row is already the edit click-target.

## Links / APIs — independent re-check (all clear)

- 13/13 Supabase `rpc()` calls map to functions in `database.types.ts` — none broken.
- Every `router.push` / route target resolves against `router/index.ts` — none broken.
- `index.html` carries the `width=device-width` viewport meta; CSP, Google fonts
  (Space Grotesk + Material Symbols) and icons all load within policy.
- Settings is grouped into 7 horizontally-scrollable tabs with `role="tablist"` /
  `aria-selected` and 44px tab targets; the `?tab=data` deep link from the sync pill is
  honored. Removed a stale "we'll add this tab later" comment that no longer matched.

## Verification

- `vue-tsc --noEmit`: **clean** · `vitest`: **75/75 pass** · production build: **succeeds**
  · ESLint: **0 errors** (only the repo's pre-existing attribute-order warnings remain —
  no new ones introduced).

## Deliberately not done

- Snooze presets (tonight / weekend / next week) — still a UX enhancement, not a defect;
  the existing +1-day snooze works. Left out to keep this run's diff tight and low-risk.

## ⚠ Note for the user — git branch has diverged

`main` is **1 commit ahead** (the Run 1 `feat: mobile responsiveness` commit) and
**1 commit behind** origin (`9fd7435 fix: allow iframe embedding from portfolio`). This
run's edits are left **uncommitted** in the working tree for review. You'll want to
reconcile the divergence (e.g. `git pull --rebase`) before pushing.
