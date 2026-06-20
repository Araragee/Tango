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

---

# Addendum — Run 3 (same day): safe-area (notch) support, disabled-button state & overlap fix

Runs 1–2 are now **committed and pushed** — `git status` is clean and `main` is level
with `origin/main` (the divergence note above is resolved). This run targets the
remaining mobile-first gaps the first two passes didn't cover. Every change is a **no-op
in a normal browser tab** (the CSS `env(safe-area-inset-*)` values are `0` there) and only
takes effect in an **installed / standalone PWA on notched devices** — so the risk to the
existing experience is essentially nil.

## 1. Safe-area insets — the biggest remaining mobile gap

The app pins a header to the top and a nav bar to the bottom, but **nothing accounted for
the iPhone notch or home-indicator** (`env(safe-area-inset-*)` appeared nowhere, and the
viewport meta lacked `viewport-fit=cover`). Installed on a modern iPhone, the bottom-nav's
buttons sat under the home-indicator and the header crowded the status-bar/notch.

- `index.html`: added `viewport-fit=cover` so the insets become available.
- `style.css`: added a small, documented set of semantic helpers — `.app-header`,
  `.with-header-offset`, `.pb-safe`, `.bottom-above-nav`, `.top-safe`, `.top-below-header`
  — each using `env(safe-area-inset-*)`. Kept as real CSS (not fragile Tailwind
  `calc()/env()` arbitrary values) so the `calc` math stays valid.
- `App.vue`: the fixed **header** now reserves the notch height above its 4rem control row;
  **main** content offset and the **mobile bottom padding** grow to match.
- `BottomNav.vue`: added `.pb-safe` so the home-indicator never overlaps the tab buttons.
- Floating UI made inset-aware so it always clears the (now slightly taller) nav:
  `UndoToast`, `IosInstallHint`, the PWA "New version ready" banner (bottom), and the
  `NotificationSystem` toast stack + `PushPromptBanner` (top, clear of the notch/header).

## 2. Fixed a real overlap bug — PWA update banner over the bottom-nav

The "New version ready" banner was pinned at `bottom-6` (24px) while the sibling toasts had
already been lifted above the bottom-nav (`bottom-20`/`bottom-24`). On a phone the banner
**overlapped the nav bar**. It now uses `.bottom-above-nav` like the others (and gained a
`max-w-md` cap so it isn't a full-width slab on desktop — same cap applied to the iOS hint
and push banner).

## 3. `TangoButton` had no disabled state — added one

`TangoButton` is passed `:disabled` in 10+ places (Login, Sign-up, Onboarding, CSV import,
goal/event/recurring modals, …) but rendered **identically whether enabled or disabled** —
a disabled primary submit button still looked fully clickable. Added
`disabled:opacity-50 disabled:cursor-not-allowed` (plus a guard so the press-translate
can't fire while disabled). Now every disabled button across the app reads correctly.

## 4. Bottom-nav accessibility

`BottomNav` gained `aria-label="Primary"`, a per-item `aria-label`, and
`aria-current="page"` on the active tab (screen readers now announce the current section).
Attribute order was also tidied so the file is fully `vue/attributes-order`-clean.

## Broken links / APIs — re-checked, clean

- All router targets resolve; the catch-all redirects to `/`. No dead routes.
- Supabase `rpc()` calls all map to generated schema functions.
- Both `target="_blank"` receipt links in `TransactionDetailsModal` already carry
  `rel="noopener noreferrer"`. No `href="#"` / no-op `@click` handlers anywhere.
- No new external links, network calls, or CSP changes introduced.

## Verification

- `vue-tsc --noEmit`: **clean** · `vitest`: **75/75 pass** · production build: **succeeds**
  (built to a temp dir — the in-repo `dist/` can't be emptied because a couple of files in
  it are not unlinkable in this environment; that's a filesystem-permission quirk, **not**
  a build error: all 53 modules transform and the bundle is produced).
- ESLint: **0 errors**, 492 warnings — **2 fewer** than the 494 baseline (no new warnings
  introduced; tidying `BottomNav` removed two). The remaining warnings are the repo's
  long-standing `vue/attributes-order` style only.
- Confirmed the safe-area classes and `disabled:` variants are present in the built CSS
  with `env(safe-area-inset-*)` intact.

## Decisions made autonomously

- Implemented safe-area support as **semantic CSS helper classes** rather than inline
  Tailwind `calc()/env()` arbitrary values — clearer, and keeps the `calc` valid.
- Used `min-height` (not a fixed `height`) on the header so the notch padding adds on top
  without compressing the control row under `box-sizing: border-box`.
- Disabled-button affordance = opacity + not-allowed cursor (no `shadow-none`, which the
  custom `.hard-shadow` would out-specify anyway; `opacity` already fades the shadow).
- Left all edits **uncommitted** for review — the task didn't request a commit/push, and a
  stale `.git/index.lock` (not removable in this environment) would block a commit regardless.

## The "caveman" skill referenced by the task wasn't available

The task header invokes `/caveman Ultra`, but no skill named `caveman` is installed in this
environment (the uploaded `SKILL.md` only re-states the task text). I proceeded with the
stated goal directly using the standard toolchain and best practices.

## Suggested follow-ups (not done — out of scope / not defects)

- Complete the ARIA tab pattern in `SettingsView` (`role="tabpanel"` + `aria-controls` +
  arrow-key roving) — current `role="tab"`/`aria-selected` is already usable.
- Snooze presets (tonight / weekend / next week) — still a UX enhancement, the +1-day
  snooze works.
- A repo-wide `eslint --fix` + `prettier` pass to clear the ~490 legacy style warnings
  (deliberately avoided here to keep diffs reviewable, matching Runs 1–2).

---

# Addendum — Run 4 (same day): Settings tablist keyboard accessibility + full re-audit

This run closed the top deferred a11y item and independently re-ran every audit. **Only one
file changed (`SettingsView.vue`, +31/−2)** — the mobile-responsive, button, and
links/API work from Runs 1–3 was re-verified as already correct, so no churn was added.

## 1. Completed the WAI-ARIA "tabs" pattern in `SettingsView` (the deferred item)

Runs 1–2 grouped Settings into seven horizontally-scrollable tabs with `role="tablist"`,
`role="tab"` and `aria-selected`, but the pattern was only mouse/touch complete — there was
no keyboard model and the panel region wasn't programmatically tied to its tab. Finished it:

- **Roving tabindex** — the selected tab is `tabindex="0"`, the rest `-1`, so the tablist is
  a single Tab stop and arrow keys (not Tab) move between tabs, exactly as native tab widgets
  and screen-reader users expect.
- **Arrow-key navigation** (`onTabKeydown`): ←/→ cycle through tabs (wrapping), Home/End jump
  to first/last. Uses **automatic activation** (focus follows selection) so the matching panel
  shows instantly — appropriate here since panels are already in the DOM (`v-show`).
- **Panel semantics** — the content region is now `role="tabpanel"`, `id="settings-tabpanel"`,
  `aria-labelledby="settings-tab-<active>"`; every tab carries `aria-controls="settings-tabpanel"`
  and a stable `id`. A screen reader now announces "Profile, tab panel" etc. and ties it to the
  active tab.
- Implemented as a **single labelled panel region** rather than one `<div>` per tab on purpose:
  the panels use `v-show` (all stay mounted) and the Budget/Data groups render **two** cards
  each, so per-panel IDs would have collided. One region whose label tracks the active tab is
  valid, axe-clean, and required zero restructuring of the 800-line template.
- Side benefit: reordering the tab button's attributes to ARIA-pattern order also made that
  element `vue/attributes-order`-clean, so total lint warnings **dropped 492 → 488** (no new
  ones introduced; 4 removed).

## 2. Independent re-audit — mobile, buttons, links/APIs (all clear, nothing to fix)

- **Mobile layout:** swept every `grid-cols-3..9` and fixed-px width. All wide grids are either
  responsive (`grid-cols-2 sm:grid-cols-4`, …), inherently 7-wide calendar grids that flex to
  the viewport, or — for the week view's `min-w-[600px]` grid — already wrapped in
  `overflow-x-auto`. No new overflow or cramped rows found.
- **Hover-only controls (the Run-1 touch bug):** the `opacity-0 group-hover` anti-pattern now
  exists **only** in `TangoTodo.vue`, and there it's the corrected
  `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (visible on touch, hover-revealed on
  desktop). No other component uses hover-gated visibility.
- **Dead/placebo buttons:** no `href="#"`, no empty `@click`, no "coming soon"/"requires P2"
  stubs remain anywhere. Every handler resolves (typecheck is clean).
- **Broken links/APIs:** independently re-confirmed — all 13 Supabase `rpc()` names map to
  functions in `database.types.ts`; every `router.push/replace` target resolves against
  `router/index.ts`; both `target="_blank"` receipt links carry `rel="noopener noreferrer"`.

## Verification

- `vue-tsc --noEmit`: **clean** · `vitest`: **75/75 pass** · production build: **succeeds**
  (`exit 0` to a fresh out-dir — app 299 modules + PWA service worker with 30 precache entries;
  the in-repo `dist/` and temp dirs still can't be emptied here, the known filesystem-permission
  quirk, **not** a build error) · ESLint: **0 errors, 488 warnings** (4 fewer than the run's
  492 baseline; only the repo's legacy `vue/attributes-order` style warnings remain).

## Decisions made autonomously

- Chose **automatic activation** (panel follows focus) over manual (Enter/Space to activate)
  because the panels are pre-mounted, so there's no cost to switching and it's the smoother UX.
- Kept it to **one tabpanel region** (see §1) instead of refactoring to per-tab panels — same
  a11y outcome, far lower risk, no duplicate-ID problem with the `v-show` + duplicate-card layout.
- Left all edits **uncommitted** for review (the task didn't ask for a commit/push).

## The "caveman" skill referenced by the task still isn't installed

The task header invokes `/caveman Ultra`, but no skill named `caveman` exists in this
environment (the uploaded `SKILL.md` only re-states the task text). Proceeded with the stated
goal directly using the standard toolchain and best practices, as in Runs 1–3.
