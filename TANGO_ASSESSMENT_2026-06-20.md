# Tango — Security & Responsive Assessment

**Date:** 2026-06-20
**Scope:** Security posture (injection, exposed APIs, RLS) + responsive/UI across desktop and mobile.
**Method:** Static code scan + live Supabase advisor (project `zunaobfntaeyyazitzft`) + live browser rendering at 1280px desktop and 375px mobile (Preview, guest mode).

---

## 1. Security — Strong. Zero critical / zero ERROR-level findings.

### Non-negotiables — all pass

| Check | Result |
|-------|--------|
| **SQL injection** | **Not possible.** Frontend is 100% Supabase client (parameterized) + 14 typed `.rpc()` calls. **Zero dynamic SQL** (`EXECUTE format`/string-built) in any DB function. |
| **XSS** | No `v-html` / `innerHTML` / `eval` anywhere in `src`. |
| **Exposed secrets** | No `service_role` key in frontend. Anon/publishable key only. Auth via **PKCE** flow (`flowType: 'pkce'`). |
| **RLS** | **Enabled on all 14 tables** — verified against the live DB, not just migrations (`households`, `household_members`, `transactions`, `goals`, `todos`, `calendar_events`, `profiles`, etc.). |
| **Edge function** (`dispatch_push`) | Shared-secret auth, constant-time comparison, fail-closed when secret unset, service key server-side only, 410-Gone subscription cleanup. Textbook. |
| **`.env` hygiene** | `.env` / `.env.local` gitignored; only `.env.example` tracked. |
| **Open-redirect** | Router middleware sanitizes `?redirect=` via `validateRedirect`. |

### Hardening backlog (live advisor — all WARN, none blocking)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **Receipts stored in the public, listable `avatars` bucket** (`RECEIPTS_BUCKET` defaults to `avatars`). Broad `SELECT` policy allows listing all files → financial receipts enumerable. | **High** | Provision a private `receipts` bucket with owner-only RLS; serve via signed URLs; set `VITE_RECEIPTS_BUCKET`. *(User handling via Supabase MCP.)* |
| 2 | 50 `SECURITY DEFINER` functions are `EXECUTE`-grantable to the `anon` role. | Medium | `REVOKE EXECUTE ON FUNCTION … FROM anon, public;` for callable RPCs (`delete_my_data`, `create_invite`, `redeem_invite`, `leave_household`, `transfer_creator`, `rename_household`, …). Trigger functions are flagged but not directly callable. |
| 3 | 5 functions have a mutable `search_path` (`is_household_member`, `create_household`, `join_household`, …). | Low | `ALTER FUNCTION … SET search_path = '';` |
| 4 | Leaked-password protection (HaveIBeenPwned) disabled. | Low | Enable in Auth settings (one toggle). |
| 5 | `pg_net` extension installed in `public` schema. | Low | Move to a dedicated `extensions` schema. |
| 6 | `households_insert` policy has `WITH CHECK (true)`. | Info | Likely intended (any authenticated user may create a household). Confirm. |

---

## 2. Responsive / UI — Good foundation, with concrete mobile bugs in the app chrome.

**Architecture (verified):**
- Viewport meta correct (`width=device-width, viewport-fit=cover` — notch-safe).
- Theming = CSS-variable token system (`bg-surface` ×164) flipped by a `.dark` class via `useThemeStore` (OS preference + manual). Dark mode is comprehensive; only 9 hardcoded colors, most legitimate (QR needs white, modal overlays are theme-neutral).
- 136 responsive breakpoint uses across components.
- Public flows (Landing, Login, Signup) reflow cleanly at both widths — verified, no overflow, no console errors.
- **App is phone-first**: even at 1280px the app renders as a centered single column. This is a design choice (couples PWA), not a bug.

### Confirmed mobile bugs (375px, live)

| # | Issue | Where | Evidence |
|---|-------|-------|----------|
| A | **Global app header overflows horizontally (~36px).** The right-side icon cluster (search, online pill, bell, help, chart, history, kebab, avatar) doesn't condense; the avatar and `⋮` are pushed off / clipped at the right edge. | `App.vue` header (`HEADER.app-header.fixed` → `div.flex.items-center.gap-1`, measured `right=438` vs viewport `375`). Affects **every** `/app/*` view. | `document.documentElement.scrollWidth = 411 > clientWidth = 375`. |
| B | **Calendar toolbar overflows and clips.** Month/Week/Day toggle + `<` / Today / `>` nav wraps off-screen (next arrow cut), and the `.ics` / `Date Night` / `New Event` buttons truncate to `.ics / Dat… / Ne…` with `New Event` running off the right edge. | `SharedCalendar.vue` controls row. | Visible at 375px. |
| C | **Tab strips clip the last tab** with no visible scroll affordance — Settings shows `PROFILE / HOUSEHOLD / ACCO…` (Account cut off). | `SettingsView.vue` (and similar horizontal tab rows). | Likely intended `overflow-x-auto`; add a fade/scroll hint or wrap. |
| D | **Broken decorative images** in guest/demo render: partner avatars on Budget show `Your partner` alt text; the "Phrase of the day" card has an empty bordered image box. | Budget header partner avatars; To-dos phrase card. | May be demo-placeholder URLs only — verify in an authenticated/real-data build before treating as a prod bug. |

### What's solid on mobile
- All **content areas** — cards, forms, empty states, achievement grids, the calendar month grid (7 cols fit), Settings profile form — scale correctly with large touch targets.
- Recent commits already did a touch-target + mobile pass; the residual issues are concentrated in the **fixed app header** and the **calendar toolbar**, not the page bodies.

### Recommended fixes (priority order)
1. **Header (A):** make the icon cluster responsive — collapse secondary icons (chart/history/help) into the existing `⋮` overflow menu on `< sm`, or allow the cluster to shrink/wrap. This single fix removes the page-wide horizontal scroll on all app views.
2. **Calendar toolbar (B):** wrap the controls (`flex-wrap`) or stack the view-toggle and nav on a second row below `sm`; let the action buttons wrap instead of truncating.
3. **Tab strips (C):** add a scroll affordance (edge fade) or wrap tabs below `sm`.
4. **Images (D):** confirm whether broken images are demo-only; if not, fix `src`/fallbacks.

---

## 3. Fixes applied (2026-06-20)

All verified live at 375px after each change. Typecheck passes.

| Ref | Fix | Files |
|-----|-----|-------|
| A | Header no longer overflows — `SyncStatusPill` label hidden below `xs` (colour dot + `title`/`aria-label` retain status). `scrollWidth` now equals viewport (was 411 → 375). | `SyncStatusPill.vue` |
| B | Calendar toolbar wraps instead of clipping — view-toggle/nav row and action buttons use `flex-wrap`; removed forced `grid-cols-3` that truncated "Date Night"/"New Event". | `SharedCalendar.vue` |
| C | Active Settings tab now scrolls into view on click, URL change, and mount — `?tab=account/data` no longer lands clipped. | `SettingsView.vue` |
| D | Broken sprite avatars now fall back to the sprite-sheet frame on image load error (`@error`) instead of showing broken-img alt text. | `SpriteCharacter.vue` |
| **E (new)** | **Systemic `max-w-*` token collision** — see below. Patched 5 sites that were collapsing to a few px. | `App.vue`, `ActivityFeed.vue`, `IosInstallHint.vue`, `PushPromptBanner.vue`, `SettingsView.vue`, `style.css` |

### E — `max-w-{sm,md,lg,xl}` is broken project-wide (root cause)

The Tailwind v4 `@theme` block defines `--spacing-sm: 8px … --spacing-xl: 48px`. In this setup those **win over the container scale**, so `max-w-sm/md/lg/xl` compute to **8 / 16 / 24 / 48 px** instead of the expected 24/28/32/36 rem. (`max-w-2xl`+ and the custom `max-w-content` are unaffected — no matching spacing key.) Adding `--container-sm…xl` does **not** override it; spacing precedence holds.

- **Impact found:** the "Everything is synced" copy rendered one-word-per-line; the undo/push/iOS-install banners (`max-w-md` → 16px) and the Activity drawer (`max-w-sm` → 8px) collapse when shown.
- **Fix:** replaced those `max-w-{sm,md,lg,xl}` with explicit `max-w-[Nrem]`, and added a warning comment in `style.css`. **Going forward, do not use `max-w-{sm,md,lg,xl}`** — use `max-w-[Nrem]` or the custom `max-w-content`/`max-w-wide`/`max-w-page` tokens.
- **Latent (not changed):** `BaseModal`'s `maxWidth` prop is **dead code** — the template hardcodes `w-[90vw] min-w-[280px]` and never binds the prop, so every `max-width="max-w-…"` passed by callers is ignored. Modals are fine by accident; wiring the prop later would need care (callers pass `max-w-2xl/3xl` expecting caps that don't currently apply).

---

## 4. PWA / offline (2026-06-20)

**Already in place (good):** VitePWA `injectManifest`, IndexedDB-backed offline **write** queue with 5-attempt retry + auto-flush on reconnect (`useOfflineQueue`, wired in `App.vue`), persisted Pinia stores (offline **reads** of last-known data), push notifications + notification-click routing in `sw.ts`, update-prompt flow (`usePwaUpdate`).

**Gaps fixed:**
| Gap | Fix | File |
|-----|-----|------|
| Offline refresh / deep-link to `/app/*` had no fallback (blank page) | `NavigationRoute` → serves precached `index.html` (app shell) | `sw.ts` |
| Fonts (Space Grotesk + Material Symbols **icons**) loaded from Google Fonts → offline = broken text & icons | Runtime cache: `StaleWhileRevalidate` for stylesheets, `CacheFirst` (1yr) for webfont files | `sw.ts` |
| Supabase storage images (avatars/receipts) not cached | `CacheFirst` w/ expiration (60 entries / 30 days) | `sw.ts` |
| Manifest used stale template colours (`#3c5f7d`/`#0b0b0f`) | Brand colours `#983e4b` / `#fcf9f4`; added `theme-color` + iOS web-app meta tags | `vite.config.ts`, `index.html` |

**Verified (production build, `vite preview`):** SW registers, activates, controls the page; precache = 30 entries incl. `index.html`; runtime caches `google-fonts-stylesheets` + `google-fonts-webfonts` populate on load; build compiles all routes; no console errors.

**Still needs a manual check:** true offline E2E (DevTools → Application → **Offline**, then refresh `/app/budget`) — Preview can't toggle the network, so confirm the navigation fallback there before shipping.

---

## Appendix — How the live app was reached

The app gates `/app/*` behind `requiresAuth`, but `router/index.ts` short-circuits the guard when Supabase is unconfigured (`if (!isConfigured) return true`) — i.e. a local **guest mode**. The assessment temporarily ran the dev server without `.env.local` to render all authenticated views in guest mode (empty/demo data: "Dave & Joanna"). `.env.local` was restored afterward. (The section 3 fixes did modify source; the env juggling itself left no tracked files changed.)

> Note: a stale cached PWA (older `acc:*` localStorage namespace, served by the service worker) was observed in the browser during testing — unrelated to current code. Consider bumping the SW cache version on deploy to avoid users running stale builds.
