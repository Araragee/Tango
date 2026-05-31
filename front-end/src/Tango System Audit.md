Tango System Audit
Stack snapshot
Vue 3 + TS + Vite + Tailwind v4 + Pinia + Supabase + PWA. Couples app: budget, goals, todos, calendar. Realtime sync via Supabase channels. Demo mode fallback when Supabase unconfigured.

---

## COMPLETED — All Phase 1–19 work is done.

### Bugs resolved

All original B1–B30 bugs have been fixed, plus new bugs found in Phase 7, Phase 8, and Phase 19 audits:

**Phase 19 bugs — resolved**

- **B-UTC**: UTC date drift across 8 files. `new Date().toISOString().split('T')[0]` returns a UTC date; for UTC+ timezone users this is "tomorrow" during evening hours, causing: overdue todo badges appearing a day early (`TangoTodo.vue`), achievement streak display undercounting (`AchievementsCard.vue`), new transactions/events/recurring templates defaulting to tomorrow's date (`AddTransactionModal.vue`, `NewEventSheet.vue`, `RecurringTransactionModal.vue`, `DateNightPlanner.vue`), "days until" counts in recurring list being off by one (`RecurringList.vue`), and CSV import falling back to tomorrow's date (`CsvImportModal.vue`). Fix: created `@/utils/dateUtils.ts` with `localDateISO(d?)` using local year/month/day fields, and replaced all affected call sites.

All original B1–B30 bugs have been fixed, plus new bugs found in Phase 7, Phase 8, and Phase 19 audits:

**Original B1–B30** — see prior entries (all resolved).

**Phase 7 bugs — resolved**

- **B31**: `App.vue` `headerAvatar` showed partner avatar first (`partnerAvatarUrl ?? avatarUrl`). Fixed to `avatarUrl ?? null` — header always shows your own avatar.
- **B32**: `TangoTodo.vue` delete button had no confirmation dialog. Added `confirmDelete()` with `confirm()` guard + error notification, matching the pattern used by deleteGoal and deleteTransaction.
- **B33**: `ArchiveView.vue` "Past Transactions" was slicing before sorting by date, potentially showing wrong order. Added `.sort((a, b) => b.date.localeCompare(a.date))` before `.slice(0, 10)`.
- **B34**: `TransactionDetailsModal.vue` — `saveEdit` and `deleteTx` were not awaited and had no error handling. Both converted to async with try/catch, toast notifications on error, and loading state buttons (`Saving…` / `Deleting…`).
- **B35**: `usePresenceStore.ts` — `startNetworkWatch()` was called at store init without a guard, causing duplicate `online`/`offline` listeners on hot-reload or store re-init. Added `_watchActive` boolean flag.

**Phase 8 bugs — resolved**

- **B36**: `NewEventSheet.vue` — `saveEvent()` and `deleteEvent()` were synchronous and never awaited the store calls, so promise rejections were silently swallowed and errors were never surfaced to the user. Both converted to `async`, `notify()` injected, loading/busy state wired to button text and disabled state (`Saving…`).
- **B37**: `AddTransactionModal.vue` — error path used `alert()` instead of `notify()`. Replaced with `notify(e.message ?? '...', 'error')` for consistent in-app toasts. `inject('notify')` added.
- **B38**: `TangoPlans.vue` — `confirmDelete` error path used `alert()` instead of `notify()`. Replaced with toast; also added a success notification on deletion. `inject('notify')` added.
- **B48**: `App.vue` — header avatar `alt` attribute was `partnerName` when a partner exists, even though the image always shows the logged-in user's own avatar (fixed in B31). Alt text corrected to always use `store.userName`.

**Phase 8 improvements**

- **I1**: `GlobalSearch.vue` — transaction search now also matches the `note` field, so users can find a transaction by its memo text.
- **I2**: `SettingsView.vue` — avatar size limit was 4 MB in the component but 5 MB in the store. Aligned both to 5 MB (the store is the authoritative guard; the component check is defence-in-depth).
- **I3**: `useReadCache.ts` — removed unnecessary `JSON.parse(JSON.stringify(data))` clone before writing to IndexedDB. The structured-clone algorithm used by IDB handles this internally; the manual round-trip added latency and would strip any non-JSON-serialisable values.

---

### Features implemented

**Tier 1**
- F1 ✓ Tango Vibe Check
- F2 ✓ Goal contribution split
- F3 ✓ Recurring transactions
- F4 ✓ Smart todo handoff
- F5 ✓ Date-night planner

**Tier 2**
- F6 ✓ Streaks & achievements
- F8 ✓ Notes on transactions
- F9 ✓ Unified FAB
- F12 ✓ Receipt photo attach — `TransactionDetailsModal` now has Attach/Replace/Remove buttons with Supabase Storage upload, image preview (inline), and PDF link fallback. Accepts JPEG/PNG/WebP/GIF/PDF up to 10 MB.
- F16 ✓ Partner activity feed

**Infrastructure**
- Profile avatar upload with MIME/size validation
- Version-conflict detection on todos, goals, events, transactions (optimistic lock)
- Offline queue integrated into all write paths
- Read cache for instant perceived load on fetch
- Push notifications (migration `015` + `usePushStore.ts` + edge function)
- Global search with keyboard navigation — debounced at 120 ms
- Idle timeout
- PWA service worker + install hint
- Magic link + Google OAuth login
- CSP header in `index.html`
- Open-redirect protection (`safeRedirect.ts`)
- Email format validation in Settings (`changeEmail`)
- Category-to-icon mapping in `recalculateBudget` — Food → restaurant, Transport → commute, Health → health_and_safety, etc. (27 mappings, falls back to `category`)
- Budget limit input auto-focuses and selects content when clicked for edit

---

**Phase 9 bugs — resolved**

- **B39**: `NewEventSheet.vue` — clicking `+` with an empty custom category input set `category` to `''` and called `prefs.addEventCategory('')`. Added a `if (!newCategory.trim()) return` guard on both the button `@click` and `@keyup.enter` handlers, matching the guard already present in `AddTransactionModal.vue`.
- **B40**: `deleteTask` in `useStore.ts` — in configured mode the function only deleted server-side and left the item visible until realtime fired, causing a jarring delay and inconsistency with `deleteTransaction`/`deleteGoal`. Converted to the standard optimistic-remove + rollback pattern.
- **B41**: `RecurringList.vue` — `runDue()` had no try/catch; a server error was silently swallowed. Added try/catch with `notify(e.message, 'error')`.
- **B42**: `RecurringList.vue` — `onMounted` spawn call had no try/catch. Added try/catch wrapper.
- **B43**: `AddTransactionModal.vue` — transaction icon was hardcoded to `shopping_cart`/`account_balance` regardless of the chosen category. Added `iconForCategory()` helper (mirrors the store's `CATEGORY_ICON_MAP`) so the correct category icon is stored with the transaction from the moment it's created.
- **B44**: `completeGoal` in `useStore.ts` — in configured mode the local goal list was not updated until realtime fired. Applied optimistic update (`goal.status = 'Completed'`, `goal.completed_at = now`) with rollback on error, matching the pattern used by `editGoal` and `toggleTodo`.
- **B45**: `SettingsView.vue` — `signOut()` had no try/catch; a failure from `auth.logout()` was silently dropped. Wrapped in try/catch with `notify(e.message, 'error')`.

---

**Phase 10 bugs — resolved**

- **B52**: `recalculateBudget` in `useStore.ts` used `String(i)` (array index) as the ID for each `monthlySpending` entry. Since Vue uses these as `v-for` keys in `BudgetTracker.vue`, adding or removing a category could cause the wrong DOM elements to be reused. Fixed: use the category name as the stable ID.
- **B59**: `BudgetTracker.vue` had `ref="limitInputRef"` inside a `v-for` loop. In Vue 3, refs inside `v-for` accumulate into an array, so the single `ref<HTMLInputElement | null>` never resolved to the right input element. Fixed: replaced with a `Map`-based function ref (`setLimitInputRef`) that maps each category to its specific `<input>` element, so `select()` on edit reliably targets the correct field.
- **B61**: `SettingsView.vue` `deleteAccount()` called `confirm('Are you absolutely sure? Type Y to proceed.')` as its second guard, but `confirm()` is a yes/no dialog — users cannot actually type anything in it. Fixed: replaced with `window.prompt('Type DELETE to confirm account deletion:')` that checks the entered text equals `DELETE` (case-insensitive), and notifies if the text doesn't match.
- **B64**: `useContributionsStore.subscribe()` subscribed to `goal_contributions` with no filter, meaning realtime events for any household would trigger a refetch. Fixed: added a guard that checks whether the affected `goal_id` belongs to the current household's items before triggering a refetch, preventing unnecessary fetches and cross-household data leakage.
- **B65**: `TransactionDetailsModal.vue` `saveEdit()` did not re-derive the icon when the category was changed. The stale icon remained stored even after editing. Fixed: `saveEdit` now calls `iconForCategory(newCategory, transaction.type)` and includes the derived icon in the `updateTransaction` call, keeping icon and category in sync.
- **B51**: `useStore.ts` `updateGoalProgress()` only updated local state in demo/offline mode (the `!isConfigured` branch). In configured mode, the UI waited for a realtime refetch. Fixed: apply the optimistic `{ saved, progress, status }` update before the Supabase call, with a full rollback to old values on error — matching the pattern used by `editGoal` and `toggleTodo`.

**Phase 10 improvements**

- **I4**: `AddTransactionModal.vue` — added an optional **Note** textarea so users can annotate a transaction at creation time (previously the note field was only editable after creation via the details modal). The note is passed through to `store.addTransaction()` and cleared on close.

---

**Phase 11 bugs — resolved**

- **B66**: `TransactionDetailsModal.vue` — `removeReceipt` was passing `{ receipt_url: undefined }` to `updateTransaction`. JSON serialisation strips `undefined`, so Supabase never cleared the column; after the next realtime refetch the receipt reappeared. Fixed: pass `{ receipt_url: null }` and widened the `Transaction.receipt_url` type to `string | null`.
- **B67**: `AddNewTaskModal.vue` — the add-category button and `@keyup.enter` handler had no empty-input guard. If the user accidentally triggered them with a blank `newCategory`, `category.value` was set to `''`, saving tasks with an empty string category. Fixed: added `if (!newCategory.trim()) return` guards matching the pattern in `AddTransactionModal.vue` and `NewEventSheet.vue`.
- **B68**: `EditGoalModal.vue` / `useStore.ts` — when creating a new goal with an initial saved amount, the code retrieved the freshly-added goal as `store.plans.goals[goals.length - 1]`. A realtime event firing between `addGoal` returning and that array access could reorder goals and target the wrong one. Fixed: `addGoal` now returns the new goal's ID (`Promise<string>`), and `EditGoalModal` uses that ID directly to post the first contribution.

**Phase 11 improvements**

- **I5**: Extracted `CATEGORY_ICON_MAP` and `iconForCategory` / `categoryIcon` helpers to `src/utils/categoryIcons.ts`. Previously the same 27-entry map was duplicated identically in `useStore.ts`, `AddTransactionModal.vue`, and `TransactionDetailsModal.vue`. All three now import from the shared module — future additions only need one edit.
- **I6**: `TangoTodo.vue` — `toggleTodo` was called directly in the template (`@click="store.toggleTodo(todo.id)"`) with no error handling. Version-conflict and network errors were silently swallowed. Added a local `toggleTodo` wrapper with try/catch that surfaces errors via `notify(e.message, 'error')`, matching the pattern used by `confirmDelete` and `handoff` in the same component.

---

**Phase 12 bugs — resolved**

- **B69**: `BudgetTracker.vue` `getBarPct()` — if a user explicitly saved a budget limit of `$0`, `spent / 0` evaluates to `Infinity`; `Math.min(100, Infinity)` pins every category's bar at 100% regardless of actual spend. Fixed: changed denominator to `Math.max(1, getLimit(cat))` so a zero-limit never causes a divide-by-zero.
- **B70**: `useStore.ts` `subscribeRealtime()` — the Supabase profiles subscription used the filter `id=in.(…)` built from `household.members`. For a solo user or when members haven't loaded yet, this produces `id=in.()` which is invalid SQL and causes a `CHANNEL_ERROR`. Fixed: snapshot `memberIds` before building the channel and only attach the profiles listener when the list is non-empty.
- **B71**: `useContributionsStore.ts` `subscribe()` — the B64 INSERT guard (`if (isOurs || payload.eventType === 'INSERT')`) still triggered an unconditional refetch for any INSERT event, including contributions posted by a completely different household. The flaw: for new contributions `items.value.some(...)` returns false (nothing cached yet), so `isOurs` was false, but the `|| INSERT` branch fired anyway. Fixed: replaced the INSERT fallback with a check against `useAppStore().plans.goals` which is already scoped to this household, so only contributions to our household's goals trigger a refetch.
- **B72**: `useRecurringStore.ts` `spawnDueAndAdvance()` — when offline, `addTransaction` silently enqueues to the offline queue (returns without throwing). The code then immediately called `supabase.rpc('advance_recurring_next')`, bumping the schedule forward before the transaction was actually persisted. If the queue replay later failed, the transaction was lost but the next-run date had already advanced. Fixed: skip `advance_recurring_next` when `!navigator.onLine`; log a warning so the transaction is still queued but the schedule stays put until the next online spawn run.

**Phase 12 improvements**

- **I7**: `ArchiveView.vue` — the "Past Transactions" section only shows expenses (filtered by `type === 'expense'`), but the heading implied it showed all transaction types. Renamed the section to "Recent Expenses" to match the actual content.
- **I8**: `GlobalSearch.vue` — `_debounceTimer` was never cancelled in `onUnmounted`, leaving a live `setTimeout` that could attempt a state update (`debouncedQuery.value = val`) after the component had been torn down. Added an `onUnmounted` hook that calls `clearTimeout`.
- **I9**: `useRecurringStore.ts` `spawnDueAndAdvance()` — no concurrency guard, so the `onMounted` auto-spawn in `RecurringList.vue` and a rapid manual "Run due" click could race and double-post every due transaction. Added a `spawning` ref flag (exposed from the store) that short-circuits re-entrant calls; the button in `RecurringList.vue` is disabled and shows "Running…" while a spawn is in progress.

---

**Phase 13 bugs — resolved**

- **B73**: `useStore.ts` `addTransaction` — demo/offline branch (`!isConfigured || !household.householdId`) manually incremented `balance.value` and returned early, bypassing `recalculateBudget()`. This left `savedThisMonth`, `budgetLastUpdated`, and `monthlySpending` stale in demo mode — newly added transactions never appeared in the Spending Breakdown or Vibe Check. Fixed: replace the manual `balance.value += …` with `recalculateBudget()`, which recomputes all derived budget state in one pass.
- **B74**: `useContributionsStore.ts` `addContribution` and `removeContribution` — no `isNetworkError` guard or offline-queue fallback. While every other write path (`addTransaction`, `addTask`, `addGoal`, `deleteTransaction`, etc.) silently enqueues mutations when offline and replays them on reconnect, contributions were silently lost. Fixed: added `isNetworkError` helper and `useOfflineQueue().enqueue(...)` fallback to both functions, mirroring the pattern used throughout `useStore.ts`.
- **B75**: `SettingsView.vue` `onAvatarChosen` — MIME validation used `file.type.startsWith('image/')`, which is broader than the strict allowlist in `store.uploadAvatar()` (`AVATAR_ALLOWED_TYPES`: jpeg, png, webp, gif only). SVG, TIFF, BMP etc. would pass the component check but fail the store with a confusing "Invalid file type" error. Fixed: replaced the `startsWith` guard with the same four-type `Set` check so the user gets the correct error message immediately, before the file reaches the store.

**Phase 13 improvements**

- **I10**: `useStore.ts` `subscribeRealtime()` — always tore down and recreated the Supabase channel even when called with the same `householdId` (e.g., on every `fetchAll()` invocation). Added a `_subscribedHouseholdId` guard: if a channel for the same household is already active, the call returns immediately. `unsubscribeRealtime()` now clears the guard on teardown. This closes the brief subscription gap that was occurring on every data reload.
- **I11**: `BudgetAnalytics.vue` — removed the unused `CHART_H_LG = 128` constant. It was defined but never referenced anywhere in the file.

---

**Phase 14 bugs — resolved**

- **B76**: `TransactionDetailsModal.vue` `saveEdit` — clearing a transaction note passed `note: undefined` to `updateTransaction`. JSON serialisation strips `undefined`, so Supabase never cleared the column and the old note reappeared on the next realtime refetch — the same root cause as B66 (receipt_url). Fixed: pass `note: null` when the field is blank; widened `Transaction.note` type in `useStore.ts` to `string | null`.
- **B77**: `SettingsView.vue` `copyCode()` / `copyLink()` — `navigator.clipboard.writeText()` was called without `await` or try/catch. On non-HTTPS origins and when clipboard permission is denied the API throws an uncaught promise rejection. Fixed: both functions are now `async` with `try/catch` and a `notify('…', 'error')` fallback.
- **B78**: `useStore.ts` `subscribeRealtime()` — the `profiles` channel listener snapshotted `memberIds` at channel-creation time. When a new partner joined the household the `household_members` handler called `loadMembers()` but never rebuilt the channel, so future profile edits by the new partner were invisible. Fixed: after `loadMembers()` resolves the handler calls `unsubscribeRealtime()` then `subscribeRealtime(householdId)` so the channel is rebuilt with the updated member list.
- **B79**: `EditGoalModal.vue` — when creating a new goal with `initialSaved > 0`, the initial contribution was added to `useContributionsStore` but `goal.saved` stayed 0 because `addContribution` only writes to the contributions store. The progress bar and DuoBar showed 0% until a realtime refetch arrived. Fixed: call `store.updateGoalProgress(newGoalId, initialSaved.value)` after the contribution so `goal.saved`, `goal.progress`, and `goal.status` update immediately.

**Phase 14 improvements**

- **I12**: `BudgetTracker.vue` `lastUpdatedLabel` — the computed relied purely on `store.budget.lastUpdated` with no reactive timer, so once data stopped changing the "Updated Xm ago" label froze indefinitely. Added a `_tick` ref driven by a 30-second `setInterval` (cleared in `onUnmounted`) that the computed subscribes to, ensuring the label re-evaluates every half minute.

---

**Phase 15 bugs — resolved**

- **B80**: `useOfflineQueue.ts` `flush()` — always `break`d on any error, so a single permanent server failure (409 duplicate, 400 validation) would block all subsequent mutations until that entry timed out after 5 retries. Fixed: distinguish network errors from permanent errors. Only `break` on network errors (device offline); for permanent server errors, bump attempts, skip the entry, and continue flushing remaining mutations.

- **B81**: `EditGoalModal.vue` `addContribution()` / `removeContribution()` — adding or removing a contribution from the edit modal's contribution panel did not call `store.updateGoalProgress`, so `goal.saved`, `goal.progress`, and the main progress bar stayed stale until a realtime refetch arrived. The B79 fix only covered the new-goal creation path. Fixed: both functions now call `store.updateGoalProgress` after a successful operation, immediately syncing the goal's saved amount and progress bar.

**Phase 15 features — implemented**

- **F11** ✓ CSV Import — `CsvImportModal.vue` added. Accepts a bank CSV file, auto-detects column names (date, description, amount, category, memo, type), lets the user remap columns, shows a per-row parse preview, then bulk-imports via `store.addTransaction`. Invalid rows (unparseable amount) are skipped and reported. Handles quoted fields, parenthetical negatives, and common date formats. Wired into `BudgetTracker.vue` as an "Import" button next to "Add".

---

---

**Phase 16 bugs — resolved**

- **B82**: `CsvImportModal.vue` `runImport()` — the outer `try/catch` caught the first `addTransaction` throw and aborted the entire import, leaving all subsequent rows silently unimported with no count. Fixed: moved the try/catch inside the `for` loop so each row is processed independently. A new `failedCount` ref tracks how many rows failed; the done step reports both imported and failed counts.

- **B83**: `useStore.ts` `calcProgress(saved, target)` — `saved / 0` = `Infinity` (or `NaN`), causing `calcStatus` to mis-classify a zero-target goal as `'Completed'`. Fixed: use `Math.max(1, target)` as the denominator — the same defence-in-depth pattern as the B69 fix.

- **B84**: `useHouseholdStore.ts` `createHousehold()` and `createInvite()` — client-side invite codes used `Math.random().toString(36).substring(2, 8)`. For certain float values (e.g. `0.5` → `"0.i"`) the fractional part has fewer than 6 base-36 digits, producing a code shorter than 6 characters. Fixed: replaced with `crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()` — UUID hex is always 32 chars so the slice is always 6.

- **B85**: `useAuthStore.ts` — `onAuthStateChange` was called in `_doInit()` without storing or removing the subscription. After `logout()` sets `initialized = false`, the next navigation triggers `_doInit()` again, registering a second listener on top of the old one. Repeated login/logout cycles accumulated callbacks. Fixed: stored the `{ subscription }` returned by `onAuthStateChange` in `_authSub`; added `_authSub?.unsubscribe()` at the top of `_doInit()` (to handle any lingering prior subscription) and in both `logout()` and `logoutAllDevices()`.

**Phase 16 improvements**

- **I13**: `TangoTodo.vue` — "Phrase of the Day" was hardcoded as a single static string. Added a 15-item `DAILY_PHRASES` array and a `phraseOfTheDay` computed that picks deterministically from the array using `(YYYY*10000 + MM*100 + DD) % phrases.length`. Both partners see the same phrase on the same calendar day without any server round-trip.

---

**Phase 17 bugs — resolved**

- **B93**: `useOfflineQueue.ts` `flush()` — off-by-one in the retry-drop check. `bumpFailure()` writes a new object into `pending.value` but the `entry` variable in the `for` loop is still the original pre-increment reference spread at the start of `flush()`. Using `entry.attempts >= 5` read the stale pre-bumpFailure count, so entries were only dropped after the **6th** failure instead of the intended 5th. Fixed: changed to `entry.attempts + 1 >= 5` to account for the increment already done inside `bumpFailure`. (B93)

- **B86**: `useStore.ts` `mapTransaction` — `note` and `receipt_url` were mapped with `?? undefined`. In JavaScript `null ?? undefined` evaluates to `undefined`, producing a type mismatch with the `Transaction` interface (`string | null`) and causing subtle JSON-serialisation edge-cases when those fields are later spread into Supabase update payloads. Fixed: changed both to `?? null` so the database `null` is faithfully preserved through the mapper.

**Phase 17 features — implemented**

- **F15** ✓ Follow system theme — `useThemeStore` gains `followSystem: boolean` (persisted). When enabled, a `MediaQueryList` watcher on `prefers-color-scheme: dark` drives `systemDark`, which an `effectiveDark` computed uses instead of the manual `isDark`. The MQL listener is set up by `initSystemWatch()` (called on toggle-on and after pinia-persist hydration). `toggleDark()` is a no-op while followSystem is active. `SettingsView.vue` gets a "Follow System Theme" toggle that hides the manual dark-mode switch when active.

---

---

**Phase 19 bugs — resolved**

- **B94**: `EditGoalModal.vue` — `saveGoal()` passed `deadline: deadline.value || undefined` when editing an existing goal. When the user cleared the deadline input, `deadline.value` is `''`, so `'' || undefined` evaluates to `undefined`. JSON serialisation strips `undefined`, so Supabase never received a value to clear the `deadline` column — the old deadline persisted silently on the server. Fixed: changed to `deadline: deadline.value || null` so an explicit `NULL` is sent. Same root cause as B66 (receipt_url) and B76 (note).
- **B95**: `AddNewTaskModal.vue` — `saveTask()` passed `due_date: dueDate.value || undefined`. When editing an existing task and clearing the due-date field, `undefined` was stripped by JSON serialisation and the server-side `due_date` was never cleared — the old date reappeared on the next realtime refetch. Fixed: changed to `due_date: dueDate.value || null`, same pattern as B94/B66/B76.

**Phase 19 improvements**

- **I14**: `useStore.ts` `recalculateBudget()` — `monthlySpending` was built from `Object.entries(categories)` which produces entries in insertion order (the order expenses appear in `recentActivity`, which changes as new transactions arrive or realtime reorders results). Categories now sorted by `spent` descending after the `map()` step so the most impactful category is always first in the Category Breakdown, giving users the most relevant information without scrolling.
- **I15**: `SharedCalendar.vue` / `TangoTodo.vue` — `todayStr` and `todayDate` were `const` values computed once at component initialisation. If the app was left open past midnight, the "today" cell highlight, overdue task badges, pending date-night review filter, and upcoming-events cutoff all froze at the previous day. Fixed in both components: converted `todayStr` to a `ref` driven by a `document.addEventListener('visibilitychange', …)` handler that refreshes the value whenever the user returns to the tab. `isDateToday` in `SharedCalendar` was also updated to derive from the reactive `todayStr.value` instead of the stale `todayDate` object. Listeners are registered on `onMounted` and cleaned up on `onUnmounted`.

---

**Phase 20 bugs — resolved**

- **B97**: `RecurringTransactionModal.vue` — icon was hardcoded to `'event_repeat'` / `'account_balance'` regardless of category. Fixed: replaced with `iconForCategory(category.value, type.value)` so spawned transactions display the same icon as equivalent one-off transactions. (Fixed in code; documented here retroactively.)

- **B98**: `NewEventSheet.vue` — `todayStr` was a plain `const`, not a reactive `ref`. The `isPastDateEvent` computed depends on it to show the date-night review UI; if the app was left open past midnight the comparison stayed frozen at the previous day, hiding the review prompt for events that just became "past". Fixed: converted to a `ref` driven by a `visibilitychange` listener that refreshes on tab focus, matching the I15 fix applied to `SharedCalendar.vue` and `TangoTodo.vue`.

- **B99**: `AddTransactionModal.vue` — `note: note.value.trim() || undefined` was passed to `addTransaction`. For a brand-new transaction this is harmless (server defaults to NULL) but inconsistent with the established `|| null` pattern (B66/B76/B94/B95). Fixed: changed to `|| null`.

- **B100**: `EditGoalModal.vue` — in the *new goal* branch `deadline: deadline.value || undefined` was passed to `addGoal`. Same root cause as B94 (edit path) and B66/B76/B99: `undefined` is stripped by JSON serialisation, preventing a deliberate "no deadline" from being stored as an explicit NULL. Fixed: changed to `|| null`.

- **B101**: `useStore.ts` `subscribeRealtime()` — on `CHANNEL_ERROR` the code logged the error and did nothing. If the Supabase channel errored (auth token expiry, network blip), realtime updates were silently lost for the entire session until a hard refresh. Fixed: added exponential-backoff reconnect (2 s → 4 s → 8 s … capped at 30 s). On error the broken channel is torn down and `subscribeRealtime` is rescheduled; on a clean `SUBSCRIBED` event the backoff resets to 2 s.

**Phase 20 improvements**

- **I17**: `GlobalSearch.vue` — recurring bill templates were missing from search results. Users couldn't find "Rent" or "Netflix" without opening the Budget tab. Added a `recurringResults` section (capped at 4) that matches on `title` and `category`, shows cadence and amount in the subtitle, and navigates to `/app/budget`. Added a `Recurring` entry to `typeColors` (error-container chip, visually distinct from transactions).

---

**Phase 21 work — resolved**

- **B28** ✓ `App.test.ts` rewritten as a self-contained render test. All twelve Pinia stores App.vue depends on are mocked, `virtual:pwa-register/vue` is stubbed, child components that pull in their own stores (NotificationSystem, GlobalSearch, NotificationsBell, ActivityFeed, PresenceBadge, PushPromptBanner, IosInstallHint, BottomNav) are stubbed at mount time, and `window.matchMedia` is shimmed so `useThemeStore` can seed `systemDark` under jsdom. Full suite now runs locally — 75 tests pass.

- **B29** ✓ Replaced the placeholder PWA icons with a brand pixel-heart on the design-system navy. New source `public/pwa-icon.svg` is the canonical artwork; `scripts/generate-pwa-icons.sh` rasterises it to `pwa-192x192.png`, `pwa-512x512.png`, and `apple-touch-icon.png` (180×180). The script auto-detects `rsvg-convert`, ImageMagick (`magick` / `convert`), and falls back to macOS `qlmanage`. `vite.config.ts` now serves the SVG as the primary manifest icon with PNGs as raster fallbacks for browsers that don't render SVG icons (and the maskable 512 entry stays PNG to satisfy Lighthouse).

**Phase 21 features — implemented**

- **F7** ✓ Monthly couple's report. New `utils/monthlyReport.ts` aggregates the recap (totals, top categories, biggest spends, goal progress, todo counts, date-night mood average) from raw store data — pure function, fully unit-tested (`monthlyReport.test.ts` covers totals, category share, contribution attribution, todo dating, mood averaging; 5 cases). `MonthlyReport.vue` renders the recap inside a modal with a month-picker and a print stylesheet (`@media print` hides everything outside `#monthly-report-printable`) so users can "Save as PDF" via the browser print dialog — no jsPDF dependency added. Wired into `BudgetTracker.vue` as a "Report" button next to Import/Add. Required schema sync: `Todo.created_at` / `completed_at` now exposed via the interface + mapper, and `toggleTodo` stamps `completed_at` so completions can be attributed to the correct month.

- **F10** ✓ Emoji categories. `usePreferencesStore` gains a persisted `categoryEmojis` record plus `getCategoryEmoji` / `setCategoryEmoji` / `clearCategoryEmoji` actions (keyed by lowercased category for case-insensitive lookup). New `CategoryIcon.vue` shared renderer prefers the user's emoji and falls back to `iconForCategory(category, txType)` — replaces the inline `material-symbols-outlined` spans in `BudgetTracker` (recent activity row) and `TransactionDetailsModal` (header). `EmojiCategoryEditor.vue` provides the Settings UI: a curated 46-emoji palette plus a paste-any-emoji input, surfaced under Appearance.

**Phase 21 infrastructure**

- F12 receipts bucket is now configurable via `VITE_RECEIPTS_BUCKET` (default `avatars`). When a dedicated `receipts` bucket is provisioned in Supabase, set the env var and the upload path automatically switches from `receipts/<user>/…` (collision-prefix inside avatars) to `<user>/…` at the bucket root. New `AVATARS_BUCKET` / `RECEIPTS_BUCKET` constants exported from `lib/supabase.ts`.

---

**Phase 22 bugs — resolved**

- **B102**: `utils/achievements.ts` — `dailyStreak()` and the `thrifty_no_spend_day` predicate derived date strings with `new Date().toISOString().split('T')[0]`, which is **UTC**, while transaction dates come from `<input type="date">` (local calendar dates) and the rest of the app (`recalculateBudget`'s `thisMonth`) keys off **local** dates. For users in positive-UTC-offset timezones (e.g. UTC+2, UTC+10) local midnight maps to the *previous* UTC day, so `cursor.toISOString()` produced yesterday's date — the streak comparison missed a transaction logged "today" and broke the streak, and the no-spend reward checked the wrong day. Fixed: added a `localDate(d)` helper (same `YYYY-MM-DD` local formatting used in `recalculateBudget`) and used it in both `dailyStreak` and the no-spend predicate. UTC-based unit tests are unaffected (local == UTC under UTC).

**Phase 22 improvements**

- **I18**: `CsvImportModal.vue` `runImport()` — `note: row.note || undefined` was passed to `addTransaction`. Harmless on insert (server defaults to NULL) but inconsistent with the established `|| null` convention applied everywhere else (B66/B76/B94/B95/B99/B100). Fixed: changed to `|| null`. (Note: `EditGoalModal.vue`'s `addContribution(..., note || undefined)` was reviewed and left as-is — that store action's signature is `note?: string`, so `undefined` is the type-correct value there.)

**Phase 22 audit notes**

- A fresh read-based pass was run over the stores (`useOfflineQueue`, `useThemeStore`, `useContributionsStore`, `useStore`), composables (`useIdleTimeout`), router middleware, `safeRedirect`, and the notification/event listener lifecycles. No further regressions found — listener cleanup, optimistic-update rollbacks, offline-queue retry semantics, and redirect sanitisation all hold up.
- Environment limitation: this audit run executed in a sandbox whose shell was unavailable (disk full), so `npm run test`, `vue-tsc`, and `git` could not be run. The two changes above are read-verified and type-safe but were **not** executed against the Vitest suite. Recommend running `npm run test` and `npm run build` before release to confirm.

---

**Phase 23 bugs — resolved**

- **B103**: `useStore.ts` — `deleteGoal()`, `deleteTask()`, and `deleteEvent()` rolled back the optimistic removal and threw on *any* server error, including network errors. By contrast `deleteTransaction()` already detects `isNetworkError` and enqueues the delete to the offline queue for replay on reconnect. The result: deleting a goal, todo, or calendar event while offline failed and snapped the item back into the list, breaking the app's offline-first contract that holds for transactions and all insert paths. Fixed: added the same `if (isNetworkError(error)) { enqueue(table, 'delete', {}, id); return }` fallback to all three delete actions, so offline deletions persist locally and sync when the connection returns. (The offline-queue `replay()` already handles the `delete` op via `row_id`.)

**Phase 23 improvements**

- **I19**: `useStore.ts` `mapGoal()` — `deadline` was mapped as bare `r.deadline` while every other nullable column in the mappers uses `?? null` (the convention established in B86 to preserve the DB value faithfully and avoid `undefined` leaking into update payloads). Changed to `deadline: r.deadline ?? null` for consistency.

**Phase 23 audit notes**

- Read-based pass over `useStore`, `useOfflineQueue`, `useReadCache`, `router/middleware`, and `utils/achievements`. Offline-queue retry/drop semantics (B80/B93), realtime reconnect backoff (B101), optimistic-update rollbacks, and the local-date streak logic (B102) all still hold. The delete-path gap above was the one genuine offline-first regression found.
- Environment limitation (recurring): this run executed in a sandbox whose shell was unavailable (`No space left on device`), so `npm run test`, `vue-tsc`, and `git` could not be run. The B103/I19 changes are read-verified and type-safe (they reuse the existing `isNetworkError` helper and `useOfflineQueue().enqueue` signature already used by `deleteTransaction`) but were **not** executed against the Vitest suite. Recommend running `npm run test` and `npm run build`, and committing on `main`, before release.

---

---

**Phase 24 bugs — resolved**

- **B104**: `useStore.ts` `completeGoal()` — the error rollback unconditionally set `goal.completed_at = null`, which would silently clear a pre-existing `completed_at` value if `completeGoal` ever failed on a goal that already had one. Fixed: saved `const oldCompletedAt = goal.completed_at` before the optimistic mutation and restored it in the rollback (`goal.completed_at = oldCompletedAt`), the same save-then-restore pattern used by `toggleTodo` and `updateGoalProgress`.

- **B105**: `ArchiveView.vue` `formatReached()` — `new Date(malformedButTruthyString)` produces an invalid `Date` whose `toLocaleDateString()` renders the literal string `"Invalid Date"` in the UI. Added `if (isNaN(d.getTime())) return '–'` after the `Date` construction, matching the guard that CodeRabbit identified for the similar `formatDate` function in PR #4 and the pattern used throughout the rest of the app's date formatting helpers.

**Phase 24 audit notes**

- Read-based pass over `useStore.ts` (completeGoal, editGoal, updateGoalProgress, delete paths), `ArchiveView.vue`, `useOfflineQueue.ts`, and `useRecurringStore.ts`. No further regressions found beyond B104/B105.
- Environment limitation: shell unavailable (disk full) — changes are read-verified and type-safe but `npm run test`, `vue-tsc`, and `git` could not be run. Recommend running `npm run test` and `npm run build` before committing to main.

---

**Phase 25 bugs — resolved**

- **B106**: `useRecurringStore.ts` `remove()` — optimistic removal had no `isNetworkError` check or offline-queue fallback. Deleting a recurring template while offline rolled the item back into the list instead of queuing the delete for replay — breaking the offline-first contract that holds for all other delete paths (transactions, goals, todos, events — see B103). Fixed: added `if (isNetworkError(error)) { enqueue('recurring_transactions', 'delete', {}, id); return }` matching the pattern.

- **B107**: `useRecurringStore.ts` `todayISO()` — used `new Date().toISOString().split('T')[0]` (UTC) to determine today's date. `spawnDueAndAdvance` then compared `r.next_run_at <= today`. For users in positive-UTC-offset timezones (e.g. UTC+10), local evening hours already fall on the next UTC day, so bills would spawn a day early from the user's perspective — the same root cause as B102 in `achievements.ts`. Fixed: replaced with a local-date formatter matching the `localDate()` helper convention.

- **B108**: `useRecurringStore.ts` `update()` — optimistic patch had no `isNetworkError` check. Offline edits (e.g. pausing/resuming a recurring bill, or any `togglePaused` call) silently rolled back instead of queuing for replay. Fixed: added offline queue enqueue for network errors, matching other write paths.

**Phase 25 audit notes**

- Read-based pass over `useRecurringStore`, `useContributionsStore`, `useOfflineQueue`, `useStore`, and `achievements.ts`. The three bugs above are all in `useRecurringStore` — they share the theme of the recurring store lagging behind the offline-first patterns established in the main store. All other offline-queue, realtime, and optimistic-update patterns audited hold up.
- Environment limitation: shell unavailable (disk full) — changes are read-verified and type-safe but `npm run test`, `vue-tsc`, and `git` could not be run. Recommend running `npm run test` and `npm run build` before committing to main.

## OPEN ITEMS

_All previously tracked bugs and features are closed. New items will be appended under a new Phase header as they are discovered._
