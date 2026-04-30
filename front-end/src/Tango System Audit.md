Tango System Audit
Stack snapshot
Vue 3 + TS + Vite + Tailwind v4 + Pinia + Supabase + PWA. Couples app: budget, goals, todos, calendar. Realtime sync via Supabase channels. Demo mode fallback when Supabase unconfigured.

BUGS (severity ranked)
Critical (broken UX/data)
B1. Search routes Task → /app/todo (404) — GlobalSearch.vue:45
Router has /app/todos. Click task search result → catch-all redirects to /. Dead navigation.

B2. monthlySpending aggregates ALL-TIME, not month — useStore.ts:339
Category breakdown grows forever. After 6mo of expenses, "this month" bar shows 6mo total → false "over budget" warnings. Compare with savedThisMonth which DOES filter by month — inconsistent.

B3. editGoal crashes if goal not found — useStore.ts:407-415
goal = goals.value.find(...) may be undefined. Then Object.assign(goal, updates, ...) throws TypeError: Cannot convert undefined to object. No null guard.

B4. editEvent / deleteEvent no optimistic update — useStore.ts:572-589
Online path skips local mutation. UI lags until realtime fires. addEvent does optimistic — inconsistent. Worse: if realtime disconnects, edits/deletes never reflect locally.

B5. "Get Started" CTA → /login (should be /signup) — LandingPage.vue:39
Two buttons, identical destination. New users hit Sign In page expecting signup.

B6. Profile row missing on signup race — SignUpView.vue:36-40 + schema RLS
If signup requires email confirmation, throws before updateProfile. display_name is NOT NULL in schema — no profile row created → next login fetchProfiles returns empty → username stays 'Alex' default forever. Also: no DB trigger to auto-create profile on auth.users insert.

High
B7. SettingsView local userName doesn't sync after fetchProfiles — SettingsView.vue:19
ref(store.userName) snapshots at mount. When async profile fetch resolves, input shows stale "Alex". Need watch(() => store.userName, ...) or computed.

B8. "Personal Balance" toggle hardcoded '0.00' — BudgetTracker.vue:72
Click toggles label but data dead. Same in TangoPlans.vue:31 viewType — no filtering.

B9. Notifications toggle persists nothing — SettingsView.vue:111-117
notifications ref is local. Page reload = reset. No backing store, no actual notification suppression logic.

B10. resetAccount clears nothing — SettingsView.vue:43-48
Removes tango-state localStorage key — but setupStorePersistence is no-op (line 650). Reload re-fetches from DB. Button lies.

B11. Archive "Past Transactions" shows OLDEST 10 — ArchiveView.vue:9
recentActivity sorted desc, .slice(-10) returns tail (oldest). Want most-recent.

B12. quickAdd notify success without awaiting — TangoTodo.vue:52-62
Fires "Task added!" before insert. RLS/network failure → silent. User thinks success.

B13. Profiles realtime channel has no filter — useStore.ts:272-274
Subscribes to ALL profile changes globally. Any user's profile update on Supabase triggers fetchProfiles here. RLS will scope reads, but unnecessary churn.

B14. Budget store's hardcoded limit: 1000 is dead — useStore.ts:347
Set in monthlySpending shape, never read. Template uses prefs.getBudgetLimit. Confusing.

Medium
B15. assigned task field uses display names — AddNewTaskModal.vue:80,92
Stores partner's userName string. Rename profile → orphan tasks. Should reference user_id or sentinel 'me' | 'partner' | 'both'.

B16. No household_members UPDATE/DELETE policies — schema.sql
Schema has no way to leave a household, change role, or delete membership. Reset/sign-out tears down local but DB membership persists.

B17. Forgot password is fake — LoginView.vue:69
Just shows "not yet available" toast. Supabase resetPasswordForEmail exists — wire it up or remove the link.

B18. Goals "Status" only colors "On Track" — TangoPlans.vue:62
"Completed" and "Behind" both gray. Lost signal.

B19. Goal delete on card has no confirm — TangoPlans.vue:89
Inline trash button = single-click destruction. EditModal version has confirm.

B20. Archive "Reached: –" is never filled — ArchiveView.vue:26
No completed_at in schema. Add column, write at status transition.

B21. unsubscribeRealtime not called on logout — useStore.ts + SettingsView.vue:50
signOut calls household.reset() which DOES tear down. OK in flow. But auth.logout alone (without reset) leaks. Also auth.onAuthStateChange doesn't trigger reset on token expiry → stale channel.

B22. TangoInput doesn't support size prop — TransactionDetailsModal.vue:53,54
Passed but Props interface lacks it. Vue dev warning + ignored.

B23. Onboarding isNameSet ref unused — OnboardingView.vue:21
Dead state.

B24. Favicon points to missing /vite.svg — index.html:5
Public/ has favicon.ico. 404 in console.

B25. Settings has no household UI — SettingsView.vue
Can't see invite code, partner email, leave household, regenerate code, transfer creator.

Low
B26. setupStorePersistence is dead code — useStore.ts:650
Empty function still imported and called from main.ts.

B27. activeCount computed unused — TangoTodo.vue:64
Dead.

B28. App.test.ts exists — verify it actually passes against the new auth/router setup. Likely stale from scaffold.

B29. PWA icons are placeholders — public/
192px = 675B, real branded assets needed for installability.

B30. editTransaction in modal not optimistic — TransactionDetailsModal.vue:34
Same as B4 — relies on realtime to reflect.

Feature Suggestions (creative, prioritized)
Tier 1 — Couple-killer features (high impact, on-brand)
F1. Shared spending insights — "Tango Vibe Check"
Weekly automated card on budget page: "You spent 23% more than last week on Food. Sam covered 60%." Surfaces patterns, gentle nudges. Pure compute over existing transactions, no new data.

F2. Goal contribution split tracking
Add goal_contributions table: who contributed how much, when. Visualize as duo bar. Solves "did I pull my weight?" friction. Tiny schema add, big emotional payoff.

F3. Bill reminders + recurring transactions
recurring table with cadence (weekly|monthly|yearly) → auto-spawn transactions/events. Calendar shows upcoming bills. Killer for couples who hate spreadsheets.

F4. Smart todo handoff
Swap assignee with one tap on todo card. Realtime ping to partner. "Sam handed off groceries to you." Notification.

F5. Date-night planner
Calendar event category 'date' already exists. Add: suggested ideas (curated list), "surprise me" button, mood tracking ("how was last date?"). Differentiator vs generic calendar.

Tier 2 — Polish + retention
F6. Streaks & achievements
"30 days of logged expenses", "First $1000 saved", "10 dates in a month". Pixel-art badges fit the retro aesthetic.

F7. Monthly couple's report
Auto-generated PDF/email recap: top categories, goals progress, biggest spend, syncs. Sent to both. Sticky retention loop.

F8. Notes on transactions
Schema has no note field. Add for: "for our anniversary trip", receipt context. Currently empty placeholder shown ("No receipt attached").

F9. Quick-add via floating compose button
Single FAB (bottom-right) that opens a unified add-anything (task / expense / event / goal) sheet. Reduces nav cost.

F10. Categorize-by-emoji + custom icons per category
Currently fixed icon list. Let users pick emoji per category. Massive perceived value, low cost.

Tier 3 — Power features
F11. CSV import for transactions
Import bank export. Map columns. Huge friction-killer for first-week adoption.

F12. Receipt photo attach (Supabase Storage)
Already hinted at in modal placeholder. Use supabase storage, link to transaction.

F13. Search filters & history
GlobalSearch has no filters (type, date range, category). Add tabs in result panel.

F14. Keyboard shortcuts beyond ⌘K
g+b budget, g+c calendar, n new (context-aware), ? cheat sheet. Shows polish.

F15. Dark/light auto-schedule
Already have theme store. Add "sunset/sunrise" mode using prefers-color-scheme + manual override.

F16. Partner activity feed
Right sidebar / drawer: "Sam added $40 Groceries · 5 min ago". Realtime data already present, just render it.

F17. Mobile widget / native PWA install prompt
PWA configured but no install banner. Add iOS/Android prompts.

F18. Offline queue
idb is in package.json but unused. Queue mutations offline → flush when back. Already imported, never wired.

Tier 4 — Long shot
F19. AI-powered "what should we save for next?" (Anthropic API)
Reads goals, transactions, suggests realistic targets. One-shot prompt. Use claude-haiku-4-5 for cost.

F20. Joint goal "investment" sim — set portfolio-style allocation, see projected timelines.

F21. Video call integration in date-night planner.

PLAN (phased)
Phase 1 — Stop the bleeding (1-2 days)
Critical bugs only. No features.

B1 GlobalSearch route fix (/app/todo → /app/todos)
B2 monthlySpending month filter
B3 editGoal null guard
B4 editEvent/deleteEvent optimistic
B5 LandingPage signup CTA
B6 profile auto-create trigger in Supabase + signup flow refactor
B7 SettingsView reactive userName
B11 Archive slice direction
B12 quickAdd error handling
B17 wire forgot password OR remove
Phase 2 — Cleanup + DX (1 day)
B8, B9, B10, B14, B18-B23, B26-B28. Mostly UI/dead-code purge. Add assigned enum migration (B15).

Phase 3 — Schema hardening (0.5 day)
Add household_members UPDATE/DELETE policies + leave-household RPC (B16)
Add goals.completed_at (B20)
Add transactions.note (F8 prep)
Profile auto-create trigger
Profiles realtime filter scoping (B13)
Phase 4 — Tier 1 features (1 week)
F1 spending insights → F2 goal contributions → F3 recurring/bills → F4 todo handoff → F5 date-night planner.

Phase 5 — Tier 2 polish (3-5 days)
F6 streaks, F8 notes, F9 unified FAB, F10 emoji categories, F16 activity feed.

Phase 6 — Power (open-ended)
F11 CSV, F12 receipts, F18 offline queue (already 50% in deps), F13/F14 search/keyboard.