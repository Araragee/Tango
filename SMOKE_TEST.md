# Tango — Phase 0-3 Smoke Test

Run after applying migrations 003-012 (paste `supabase/migrations/_combined_003_to_012.sql` into Supabase Dashboard → SQL Editor → Run).

## 0. Supabase Dashboard Config

Before testing the app, confirm:

- [ ] **Auth → URL Configuration → Redirect URLs**: add
  - `http://localhost:5173/auth/confirm`
  - `http://localhost:5173/reset-password`
  - `http://localhost:5173/join/*`
  - (and the production origin equivalents)
- [ ] **Auth → Providers → Google**: enable, paste OAuth client id + secret
- [ ] **Storage → New Bucket**: create `avatars` (public read), create `receipts` (private, signed URLs)
- [ ] **Database → Realtime**: confirm all six new tables (`household_invites`, `audit_log`, `notifications`, `goal_contributions`, `recurring_transactions`, plus existing data tables) appear in the publication list

## 1. Migrations Sanity

Run these in SQL Editor; each should return `1` or rows:

```sql
select count(*) from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'household_invites','audit_log','notifications',
      'goal_contributions','recurring_transactions'
    );  -- expect 5

select routine_name from information_schema.routines
  where routine_schema = 'public'
    and routine_name in (
      'create_invite','redeem_invite','revoke_invites',
      'leave_household','transfer_creator','delete_my_data',
      'mark_notifications_read','notify_partner',
      'enforce_household_member_cap','audit_writes',
      'goals_set_completed_at','bump_row_version'
    );  -- expect 12
```

## 2. Account A — Create flow

- [ ] Open `/` → click "Get Started" → routes to `/signup`
- [ ] Fill name + email + password (8+ chars). Strength meter renders 4 levels
- [ ] Submit → screen shows "Confirm your email" pending state with **Resend** button
- [ ] Open Supabase Auth → Users → verify row created
- [ ] Trigger `on_auth_user_created` should have populated `public.profiles` automatically:
  ```sql
  select id, display_name from public.profiles order by created_at desc limit 5;
  ```
- [ ] Click confirmation link in email → lands on `/auth/confirm` → routes to `/onboarding`
- [ ] Walk through 3 onboarding steps → step 4 shows Create / Join toggle
- [ ] Click "Create Household" → invite code + QR + "expires in 23h" label appear
- [ ] Verify in DB:
  ```sql
  select code, expires_at, used_at, revoked_at
    from public.household_invites
    order by created_at desc limit 1;
  ```
- [ ] Click "Let's Go" → lands on `/app/budget`

## 3. Account B — Join via deep link

- [ ] Copy invite link from Account A's onboarding (or Settings → Household)
- [ ] Open in incognito window → `/join/<CODE>` view appears with code displayed
- [ ] Not logged in → click "Create Account & Join" → `/signup?invite=<CODE>`
- [ ] Complete signup → confirm email → `/auth/confirm?invite=<CODE>` auto-redeems → lands on `/app/budget`
- [ ] Verify: `select count(*) from public.household_members where household_id = '<id>'` returns 2
- [ ] Verify: invite row in DB now has `used_at` set and `used_by` = Account B's user_id

## 4. Realtime sync

Open Account A and Account B side-by-side.

- [ ] **Presence dot**: Account A header should show green dot overlaid on partner avatar (Account B online), and vice versa
- [ ] **Add transaction** on Account A → Account B's budget page updates within 2s without manual refresh
- [ ] **Notification bell** on Account B should increment unread count by 1; dropdown shows "+$X • {title}"
- [ ] **Activity drawer** on Account B (click timeline icon in header) → entry appears: "Alex added a transaction"
- [ ] Click bell item → marks read, routes to budget page
- [ ] **Add goal** on Account A → Account B receives "New goal" notification
- [ ] **Add shared todo** on Account A → Account B receives "New shared task" notification
- [ ] **Add event** on Account A → Account B receives "New event" notification

## 5. Version conflict detection

- [ ] Open same todo on both accounts in edit mode
- [ ] Account A edits text and saves
- [ ] Account B edits text on stale version and tries to save
- [ ] Account B should see error toast: "This item was changed elsewhere. Please refresh to see the latest version."
- [ ] Account B's local optimistic state should revert to the old text

## 6. Member cap enforcement

- [ ] Try to insert a third user into the household via SQL:
  ```sql
  insert into public.household_members (household_id, user_id, role)
    values ('<existing_hid>', '<some_third_user_id>', 'partner');
  ```
- [ ] Should fail with `Household is full (max 2 members)`

## 7. Invite hardening

- [ ] In Settings on Account A → click regenerate (refresh icon) → new code issued; old code revoked in DB:
  ```sql
  select code, used_at, revoked_at, expires_at
    from public.household_invites
    where household_id = '<hid>'
    order by created_at desc;
  ```
- [ ] Try redeeming the revoked code via `/join/<OLDCODE>` → should error with "Invite has been revoked"
- [ ] Manually set `expires_at = now() - interval '1h'` on a fresh code and try to redeem → should error with "Invite has expired"

## 8. Membership management

- [ ] Settings → Household → **Transfer Creator** (only visible to creator) → confirm dialog → roles swap in DB:
  ```sql
  select user_id, role from public.household_members where household_id = '<hid>';
  ```
- [ ] Settings → Household → **Leave Household** → confirm twice → routes to `/onboarding`. Verify:
  - The leaving user's membership row is gone
  - If they were the last member, the household + all data is cascade-deleted
  - If a partner remains, that partner is now `creator`

## 9. Password reset

- [ ] On `/login` enter email → click "Forgot password?" → toast "Reset link sent"
- [ ] Click link in email → lands on `/reset-password` with active session
- [ ] Set new password (≥ 8 chars) → toast "Password updated" → routes to `/app/budget`
- [ ] Sign out, sign back in with the new password

## 10. OAuth (if Google enabled)

- [ ] `/login` → "Continue with Google" → Google consent screen → redirects back to `/auth/confirm` → routes to `/onboarding` (new user) or `/app/budget` (existing)
- [ ] Verify profile auto-created from email local-part if no display_name was returned

## 11. Magic link

- [ ] `/login` → tab to "Magic Link" → enter email → "Check your email" state
- [ ] Click link in email → `/auth/confirm` → routes through to app

## 12. Offline queue

- [ ] DevTools → Network → toggle "Offline"
- [ ] Header shows red "Offline" pill
- [ ] Add transaction → optimistic update appears locally, no error toast
- [ ] Open DevTools → Application → IndexedDB → `tango-offline` → `mutations` should show queued row
- [ ] Toggle network back on → within ~1s the queue drains; verify row appears in Supabase `transactions` table

## 13. Audit log

- [ ] After any write:
  ```sql
  select table_name, action, user_id, summary, created_at
    from public.audit_log
    where household_id = '<hid>'
    order by created_at desc
    limit 10;
  ```
- [ ] Confirm activity drawer reflects same entries
- [ ] After 30+ entries, drawer scrolls cleanly

## 14. Delete account

- [ ] Account B → Settings → **Delete Account** → confirm twice → routes to `/`
- [ ] Verify in DB: profile row gone, household_members gone, if last member then household + all data also gone

## Known degradations without migrations

If migrations 003-012 are NOT applied:

- `household.activeInvite` stays null (404 logged in console; UI falls back to legacy `households.invite_code`)
- `joinHousehold` falls back to legacy `join_household` RPC — still works for pre-migration invite codes
- Notifications bell shows zero unread (table doesn't exist)
- Activity drawer shows "No activity yet" (table doesn't exist)
- Presence still works (uses Realtime channel, not DB)
- Version conflict detection still works (column has DEFAULT 1 from migration 009; without migration, version is `undefined` → check is skipped, behaviour identical to pre-Phase-3)
- Member cap not enforced
- Leave / transfer / delete RPCs throw "function does not exist"

## Rollback

If something explodes, drop new objects:

```sql
drop table if exists public.audit_log cascade;
drop table if exists public.notifications cascade;
drop table if exists public.household_invites cascade;
drop table if exists public.goal_contributions cascade;
drop table if exists public.recurring_transactions cascade;
drop function if exists public.create_invite cascade;
drop function if exists public.redeem_invite cascade;
drop function if exists public.revoke_invites cascade;
drop function if exists public.leave_household cascade;
drop function if exists public.transfer_creator cascade;
drop function if exists public.delete_my_data cascade;
drop function if exists public.mark_notifications_read cascade;
drop function if exists public.notify_partner cascade;
drop function if exists public.enforce_household_member_cap cascade;
drop function if exists public.audit_writes cascade;
drop function if exists public.bump_row_version cascade;
drop function if exists public.goals_set_completed_at cascade;
drop function if exists public.sync_goal_saved cascade;
drop function if exists public.advance_recurring_next cascade;
-- column drops can be left as-is; they're additive and harmless
```
