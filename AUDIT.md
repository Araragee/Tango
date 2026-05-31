# Tango — System Audit Log

**App:** Vue 3 + Pinia + Vite PWA front-end, Supabase backend (Postgres + RLS +
edge function + pg_net push), Netlify hosting. ~12.9k LOC. Two-person household
app: budget, goals, todos, shared calendar, recurring transactions, date-night
planner, achievements, presence, web-push.

The codebase is mature and heavily hardened (long `B##`/`I##` bug-fix campaign).
An existing in-repo audit log at `front-end/src/Tango System Audit.md` documents
**23 prior audit phases** (bugs B1–B103, improvements I1–I19, features F1–F16).

---

## Run 0 — 2026-05-30 (Blocked)

**Result: Blocked — shell sandbox fully down, no code changes made.**

- Every command failed with `useradd ... No space left on device`; `git`, `npm`,
  `vue-tsc`, Vitest, and the production build could not run.
- File IO was unreliable — reads intermittently returned empty for files with content.
- Because changes could not be verified, no edits were made to `main`.

_See `AUDIT_STATUS_2026-05-31.md` for full details (now superseded by this file)._

---

## Run 1 — 2026-05-30 (Remediation)

**Baseline health (verified in clean `/tmp` copy, fresh `npm install`):**
typecheck ✓ · lint ✓ exit 0 · 75/75 tests ✓ · production build ✓

A fresh review found **no new logic bugs**. The 5 issues surfaced by the newly-added
linter were all pedantic/cosmetic (a mutated-not-reassigned `let`, an intentional
teardown `catch {}`, redundant regex escapes).

> **Sandbox constraints:** The mounted filesystem blocks file **deletion** and `.git`
> is **read-only** — no commits, branch switches, or file removals were possible.
> Edits landed on the currently checked-out working tree (`feat/hardening`, which is
> `main` + 1 commit). A human must commit/merge to `main`.

### Implemented ✅

- **Phase 2 — Dependencies.** Moved Tailwind off the alpha range:
  `tailwindcss` and `@tailwindcss/vite` `^4.0.0-alpha.12` → `^4.0.0` (resolves to
  stable 4.2.4; build re-verified). `lucide-vue-next ^1.0.0` concern was unfounded —
  resolves cleanly to 1.0.0; left as-is.
- **Phase 4 — Quality gates.** Added to `front-end/`:
  - `package.json` scripts: `typecheck`, `lint`, `lint:fix`, `format`, `format:check`.
  - `eslint.config.js` (flat config: JS + typescript-eslint + eslint-plugin-vue +
    prettier-compat). Tuned to a **passing baseline** — `no-explicit-any` off;
    `prefer-const`/`no-empty`/`no-useless-escape` as warnings — so `npm run lint`
    exits 0 today and rules can be tightened later.
  - `.prettierrc.json` + `.prettierignore`.
  - Relevant devDeps (eslint 9, typescript-eslint 8, eslint-plugin-vue 9, prettier 3,
    eslint-config-prettier) added and locked.
- **CI.** Added `.github/workflows/ci.yml` (repo root): on push to `main` and all
  PRs, runs `npm ci → lint → typecheck → test → build` in `front-end/`.
- **Phase 1 — Security (migration prepared).**
  `supabase/migrations/016_tighten_member_role_update.sql` drops the over-broad
  `members_update_role` RLS policy that let a partner self-promote to `creator`
  via direct PostgREST. **Not yet applied** — needs the Supabase SQL editor.

---

## Run 2 — 2026-05-31

**Baseline health (verified in clean copy, fresh `npm ci`):**
- typecheck ✓ (vue-tsc, no errors)
- lint ✓ exit 0 — 0 errors, 390 warnings (all cosmetic: 348 `vue/attributes-order`,
  rest formatting / `prefer-const` / a handful of `no-unused-vars`)
- tests ✓ 75/75
- build ✓ (precache 33 entries, 640 KiB)

No new logic, security, or correctness bugs found.

### Implemented ✅

**Dead-code removal — leftover OAuth handlers.** Commit `b26a152` ("remove google
oauth") stripped the Google sign-in buttons from the UI but left orphaned `oauth()`
handler functions in `LoginView.vue` and `SignUpView.vue` (unreferenced in their
templates — two `no-unused-vars` warnings). Removed both. The store method
`useAuthStore.loginWithOAuth` is intentionally kept as available API.

Verified: typecheck ✓ · 75/75 tests ✓ · build ✓.

### Considered but deliberately NOT done

**Mass `lint:fix` (≈379 autofixable cosmetic warnings, ~34 files).** Tested in a
clean copy — gates stay green and warnings drop to 11. **Not applied** because `.git`
is read-only (cannot commit), so it would only leave 34 files of un-committable
cosmetic churn. Recommend running `npm run lint:fix` as its own commit once git access
is restored.

---

## Run 3 — 2026-05-31 (run 2)

**Baseline health (verified in clean copy, fresh `npm ci`):**
- typecheck ✓ · tests ✓ 75/75 · build ✓
- lint ✓ exit 0 — 0 errors, 388 warnings (count dropped 390→388 thanks to the
  prior run's dead-`oauth()` removal now in the working tree)

### New bugs found: none

A deeper pass on the highest-risk areas confirmed the code is mature and defensively
written:

- **Offline mutation queue** (`useOfflineQueue.ts`): poison-message cap (drop after
  5 attempts, off-by-one correctly handled — `B93`), network-vs-server error
  distinction so a permanent 4xx/5xx doesn't stall the whole queue (`B80`),
  `crypto.randomUUID` keys, stable `online` listener reference preventing duplicate
  handlers across hot-reload / store re-init. All correct.
- **Recurring transactions** (`useRecurringStore.ts`): concurrent-spawn guard
  protects the onMounted auto-run vs. "Run due" button race (`I9`); `next_run_at`
  advancement is delegated to the `advance_recurring_next` RPC after the row spawns,
  avoiding premature bumping.
- No `innerHTML`/`eval`, no tokens/secrets in `localStorage`, only 1 stray
  `console.log`, no `TODO/FIXME/HACK` debt.

The presence of inline comments tagged with prior issue IDs (`B80`, `B93`, `I9`)
shows earlier fixes are landed and documented. Nothing new to fix.

### Implemented: nothing

No defects found; the previously-staged working-tree edits remain the right state.

---

## Open Follow-ups (all runs — still outstanding)

> Items are blocked by read-only `.git` / no shell access unless noted otherwise.

1. **[ ] Commit + merge working tree to `main`.**
   Current branch is `feat/hardening` (= `main` + 1 commit). Pending changes to land:
   - Run 1: eslint/prettier/CI setup, `package.json` Tailwind bump, migration 016.
   - Run 2: two `no-unused-vars` removals (`LoginView.vue`, `SignUpView.vue`).

2. **[ ] Apply `supabase/migrations/016_tighten_member_role_update.sql`** in the
   Supabase SQL editor. Drops the over-broad `members_update_role` RLS policy that
   lets any member directly UPDATE membership rows (privilege-escalation surface; role
   changes already go through SECURITY DEFINER RPCs, so this is safe to drop). Verify
   `transfer_creator()` / `leave_household()` still work afterward (they will).

3. **[ ] Repo hygiene** (blocked by no-delete):
   - Move `supabase/migrations/_combined_003_to_012.sql` out of `migrations/`
     (duplicate of `003`–`012`; risks double-applying DDL).
   - Move `front-end/src/Tango System Audit.md` and
     `front-end/src/components/Tango.code-workspace` out of `src/`.
   - Confirm `.env`, `front-end/.env.local`, `supabase/.temp/`, `dist/` are
     git-ignored and uncommitted.
   - Prune merged/stale branches so `main` is the single source of truth.

4. **[ ] Optional: `npm run lint:fix`** as a standalone cosmetic commit (verified
   clean — gates stay green, warnings drop to ~9). Not applied to avoid leaving
   un-committable churn while `.git` is locked.

5. **[ ] Optional: `npm run format`** once to normalize style, then commit.

---

## Standing notes (not bugs)

- **Date handling** uses UTC date strings (`toISOString().split('T')[0]`) throughout,
  including recurring-due comparisons — could be off-by-one near midnight in
  negative-UTC timezones. Pervasive and internally consistent; left as-is.
- **Write paths are asymmetric:** inserts/deletes enqueue offline, updates only throw
  when offline. Documented as intentional (version-checked updates are hard to
  reconcile on replay).

---

_All runs generated autonomously; no user present. No commits made (read-only `.git`);
no DB migrations applied (production write not requested)._
_Consolidated from: `AUDIT_2026-05-30.md`, `AUDIT_2026-05-31.md`,
`AUDIT_2026-05-31b.md`, `AUDIT_BLOCKED_2026-05-30.md`, `AUDIT_STATUS_2026-05-31.md`._
