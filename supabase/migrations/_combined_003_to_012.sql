-- ============================================================
-- Tango — Combined migrations 003 → 012
-- ============================================================
-- Paste this entire file into Supabase Dashboard > SQL Editor
-- and click "Run". Idempotent: safe to re-run.
--
-- Order matters: don't reorder blocks. Each migration depends
-- on objects from earlier ones.
--
-- After running, verify with:
--   select * from public.household_invites      limit 1;
--   select * from public.audit_log              limit 1;
--   select * from public.notifications          limit 1;
--   select * from public.goal_contributions     limit 1;
--   select * from public.recurring_transactions limit 1;
--   select routine_name from information_schema.routines
--     where routine_schema = 'public'
--       and routine_name in ('create_invite','redeem_invite',
--           'revoke_invites','leave_household','transfer_creator',
--           'delete_my_data','mark_notifications_read','notify_partner');
-- ============================================================


-- Migration 003: Enforce max 2 members per household.
-- The (household_id, user_id) UNIQUE prevents duplicates but allows 3+ distinct users.
-- This trigger caps row count at 2 before insert.
-- Run in: Supabase Dashboard > SQL Editor

create or replace function public.enforce_household_member_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.household_members
    where household_id = new.household_id
  ) >= 2 then
    raise exception 'Household is full (max 2 members)' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists household_member_cap on public.household_members;

create trigger household_member_cap
  before insert on public.household_members
  for each row execute function public.enforce_household_member_cap();
-- Migration 004: Hardened invite system.
-- Replaces ad-hoc invite_code on households (kept for backwards compat) with
-- a dedicated invites table: server-issued codes, 24h expiry, single-use, revocable.
-- Run in: Supabase Dashboard > SQL Editor

create table if not exists public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  code         text unique not null,
  created_by   uuid references auth.users(id) on delete cascade not null,
  expires_at   timestamptz not null default (now() + interval '24 hours'),
  used_by      uuid references auth.users(id) on delete set null,
  used_at      timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists household_invites_code_idx
  on public.household_invites (code)
  where used_at is null and revoked_at is null;

create index if not exists household_invites_household_idx
  on public.household_invites (household_id);

alter table public.household_invites enable row level security;

-- Read: members of the household see their invites
create policy "invites_select" on public.household_invites for select
  using (public.is_household_member(household_id));

-- Insert: handled via RPC only (security definer) — no direct insert policy

-- Update: handled via RPC only — no direct update policy

-- Atomically issue a fresh invite. Revokes any prior unused invites for this household.
create or replace function public.create_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  hid       uuid;
  new_code  text;
  new_exp   timestamptz;
begin
  -- Resolve caller's household
  select household_id into hid
    from public.household_members
    where user_id = auth.uid()
    limit 1;

  if hid is null then
    raise exception 'Not a member of any household';
  end if;

  -- Revoke outstanding unused invites for this household
  update public.household_invites
    set revoked_at = now()
    where household_id = hid
      and used_at is null
      and revoked_at is null
      and expires_at > now();

  -- Generate 6-char code, retry on rare collision
  for i in 1..5 loop
    new_code := upper(substr(encode(gen_random_bytes(6), 'base64'), 1, 6));
    new_code := regexp_replace(new_code, '[^A-Z0-9]', 'X', 'g');
    begin
      insert into public.household_invites (household_id, code, created_by, expires_at)
        values (hid, new_code, auth.uid(), now() + interval '24 hours')
        returning household_invites.expires_at into new_exp;
      return query select new_code, new_exp;
      return;
    exception when unique_violation then
      -- retry
    end;
  end loop;

  raise exception 'Failed to generate unique invite code after 5 attempts';
end;
$$;

-- Atomically redeem an invite. Validates expiry/usage, joins household, marks used.
create or replace function public.redeem_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.household_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the invite row for the duration of the transaction
  select * into invite_row
    from public.household_invites
    where code = upper(invite_code)
    for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if invite_row.revoked_at is not null then
    raise exception 'Invite has been revoked';
  end if;

  if invite_row.used_at is not null then
    raise exception 'Invite has already been used';
  end if;

  if invite_row.expires_at <= now() then
    raise exception 'Invite has expired';
  end if;

  -- Check user is not already in a household
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'You are already in a household';
  end if;

  -- Mark used and join (member cap trigger will reject if household full)
  update public.household_invites
    set used_by = auth.uid(), used_at = now()
    where id = invite_row.id;

  insert into public.household_members (household_id, user_id, role)
    values (invite_row.household_id, auth.uid(), 'partner');

  return invite_row.household_id;
end;
$$;

-- Revoke caller's outstanding invites
create or replace function public.revoke_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  update public.household_invites
    set revoked_at = now()
    where household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
    and used_at is null
    and revoked_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Realtime
alter publication supabase_realtime add table public.household_invites;
-- Migration 005: Audit log + activity feed source.
-- Captures every write to transactions / goals / todos / calendar_events.
-- Powers "Sam added $40 Groceries" feed and dispute resolution.
-- Run in: Supabase Dashboard > SQL Editor

create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete set null,
  table_name   text not null,
  row_id       uuid not null,
  action       text not null check (action in ('insert', 'update', 'delete')),
  before       jsonb,
  after        jsonb,
  summary      text,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_household_created_idx
  on public.audit_log (household_id, created_at desc);

create index if not exists audit_log_row_idx
  on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;

create policy "audit_log_select" on public.audit_log for select
  using (public.is_household_member(household_id));

-- No client-side write policies; written only by triggers (definer)

create or replace function public.audit_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid      uuid;
  uid      uuid;
  rid      uuid;
  rec_before jsonb;
  rec_after  jsonb;
  summary  text;
begin
  uid := auth.uid();

  if tg_op = 'DELETE' then
    rec_before := to_jsonb(old);
    rec_after  := null;
    hid := (rec_before->>'household_id')::uuid;
    rid := (rec_before->>'id')::uuid;
  elsif tg_op = 'UPDATE' then
    rec_before := to_jsonb(old);
    rec_after  := to_jsonb(new);
    hid := (rec_after->>'household_id')::uuid;
    rid := (rec_after->>'id')::uuid;
  else -- INSERT
    rec_before := null;
    rec_after  := to_jsonb(new);
    hid := (rec_after->>'household_id')::uuid;
    rid := (rec_after->>'id')::uuid;
  end if;

  summary := tg_table_name || ' ' || tg_op;

  insert into public.audit_log (household_id, user_id, table_name, row_id, action, before, after, summary)
    values (hid, uid, tg_table_name, rid, lower(tg_op), rec_before, rec_after, summary);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Attach to data tables
drop trigger if exists audit_transactions     on public.transactions;
drop trigger if exists audit_goals            on public.goals;
drop trigger if exists audit_todos            on public.todos;
drop trigger if exists audit_calendar_events  on public.calendar_events;

create trigger audit_transactions     after insert or update or delete on public.transactions     for each row execute function public.audit_writes();
create trigger audit_goals            after insert or update or delete on public.goals            for each row execute function public.audit_writes();
create trigger audit_todos            after insert or update or delete on public.todos            for each row execute function public.audit_writes();
create trigger audit_calendar_events  after insert or update or delete on public.calendar_events  for each row execute function public.audit_writes();

alter publication supabase_realtime add table public.audit_log;
-- Migration 006: In-app notifications.
-- Per-user delivery, read state, optional payload. Push integration later (web push).
-- Run in: Supabase Dashboard > SQL Editor

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  household_id uuid references public.households(id) on delete cascade,
  type         text not null,                  -- e.g. 'transaction.added', 'goal.completed', 'todo.assigned', 'invite.accepted'
  title        text not null,
  body         text,
  payload      jsonb,                          -- e.g. { row_id, amount, actor_id }
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_user_all_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Read: own notifications only
create policy "notifications_select" on public.notifications for select
  using (user_id = auth.uid());

-- Update: own only (mark read)
create policy "notifications_update" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Delete: own only
create policy "notifications_delete" on public.notifications for delete
  using (user_id = auth.uid());

-- No client insert policy; created by server-side triggers/functions

create or replace function public.mark_notifications_read(ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  if ids is null then
    update public.notifications
      set read_at = now()
      where user_id = auth.uid() and read_at is null;
  else
    update public.notifications
      set read_at = now()
      where user_id = auth.uid() and id = any(ids) and read_at is null;
  end if;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Helper: notify the partner of the actor about a household event.
-- Skips the actor themselves. Called from app-level triggers (next migration).
create or replace function public.notify_partner(
  p_household_id uuid,
  p_actor_id     uuid,
  p_type         text,
  p_title        text,
  p_body         text default null,
  p_payload      jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, household_id, type, title, body, payload)
  select hm.user_id, p_household_id, p_type, p_title, p_body, p_payload
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id <> p_actor_id;
end;
$$;

alter publication supabase_realtime add table public.notifications;
-- Migration 007: Per-user goal contribution tracking.
-- Each contribution is a single deposit toward a goal. goals.saved is the sum.
-- Powers "duo bar" visualisation and equity nudges.
-- Run in: Supabase Dashboard > SQL Editor

create table if not exists public.goal_contributions (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references public.goals(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  amount      numeric not null check (amount > 0),
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists goal_contributions_goal_idx
  on public.goal_contributions (goal_id, created_at desc);

create index if not exists goal_contributions_user_idx
  on public.goal_contributions (user_id, created_at desc);

alter table public.goal_contributions enable row level security;

-- Helper: did the caller's household own the goal?
create or replace function public.goal_in_my_household(g_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.goals g
    join public.household_members hm on hm.household_id = g.household_id
    where g.id = g_id and hm.user_id = auth.uid()
  );
$$;

create policy "goal_contributions_select" on public.goal_contributions for select
  using (public.goal_in_my_household(goal_id));

create policy "goal_contributions_insert" on public.goal_contributions for insert
  with check (public.goal_in_my_household(goal_id) and user_id = auth.uid());

create policy "goal_contributions_delete" on public.goal_contributions for delete
  using (user_id = auth.uid());

-- Keep goals.saved in sync. Recomputes from contributions table on each change.
create or replace function public.sync_goal_saved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gid      uuid;
  total    numeric;
  tgt      numeric;
  new_prog int;
  new_stat text;
begin
  gid := coalesce(new.goal_id, old.goal_id);

  select coalesce(sum(amount), 0) into total
    from public.goal_contributions
    where goal_id = gid;

  select target into tgt from public.goals where id = gid;
  if tgt is null or tgt <= 0 then tgt := 1; end if;

  new_prog := least(100, greatest(0, round((total / tgt) * 100)));
  new_stat := case
                when new_prog >= 100 then 'Completed'
                when new_prog >= 50  then 'On Track'
                else 'Behind'
              end;

  update public.goals
    set saved = total,
        progress = new_prog,
        status = new_stat,
        updated_at = now()
    where id = gid;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists goal_contributions_sync on public.goal_contributions;

create trigger goal_contributions_sync
  after insert or update or delete on public.goal_contributions
  for each row execute function public.sync_goal_saved();

alter publication supabase_realtime add table public.goal_contributions;
-- Migration 008: Recurring transactions / bill schedule.
-- Powers calendar bill markers and auto-spawn of transactions.
-- Run in: Supabase Dashboard > SQL Editor

create table if not exists public.recurring_transactions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid references public.households(id) on delete cascade not null,
  created_by    uuid references auth.users(id) on delete cascade not null,
  title         text not null,
  amount        numeric not null,
  type          text not null check (type in ('expense', 'income')),
  category      text not null default 'General',
  icon          text not null default 'event_repeat',
  cadence       text not null check (cadence in ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  start_date    date not null,
  end_date      date,
  next_run_at   date not null,
  last_run_at   date,
  active        boolean not null default true,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists recurring_household_idx
  on public.recurring_transactions (household_id, active, next_run_at);

alter table public.recurring_transactions enable row level security;

create policy "recurring_select" on public.recurring_transactions for select
  using (public.is_household_member(household_id));

create policy "recurring_insert" on public.recurring_transactions for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());

create policy "recurring_update" on public.recurring_transactions for update
  using (public.is_household_member(household_id));

create policy "recurring_delete" on public.recurring_transactions for delete
  using (public.is_household_member(household_id));

-- Helper: advance next_run_at by the cadence (used after spawn).
create or replace function public.advance_recurring_next(r_id uuid)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.recurring_transactions%rowtype;
  next_d date;
begin
  select * into r from public.recurring_transactions where id = r_id;
  if not found then return null; end if;

  next_d := case r.cadence
              when 'daily'    then r.next_run_at + interval '1 day'
              when 'weekly'   then r.next_run_at + interval '1 week'
              when 'biweekly' then r.next_run_at + interval '2 weeks'
              when 'monthly'  then r.next_run_at + interval '1 month'
              when 'yearly'   then r.next_run_at + interval '1 year'
            end;

  update public.recurring_transactions
    set last_run_at = r.next_run_at,
        next_run_at = next_d,
        active = (r.end_date is null or next_d <= r.end_date),
        updated_at = now()
    where id = r_id;

  return next_d;
end;
$$;

alter publication supabase_realtime add table public.recurring_transactions;
-- Migration 009: Schema upgrades to existing tables.
-- Adds notes/receipts/completion timestamps/optimistic-version/updated_at on writes.
-- Run in: Supabase Dashboard > SQL Editor

-- ── transactions ─────────────────────────────────────────────────────────────
alter table public.transactions
  add column if not exists note          text,
  add column if not exists receipt_url   text,
  add column if not exists updated_at    timestamptz not null default now(),
  add column if not exists updated_by    uuid references auth.users(id) on delete set null,
  add column if not exists version       int not null default 1;

-- ── goals ────────────────────────────────────────────────────────────────────
alter table public.goals
  add column if not exists completed_at  timestamptz,
  add column if not exists version       int not null default 1;

-- Backfill completed_at for already-completed goals
update public.goals
   set completed_at = updated_at
 where status = 'Completed' and completed_at is null;

-- Auto-set completed_at when status flips to Completed
create or replace function public.goals_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Completed' and (old.status is distinct from 'Completed') and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'Completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists goals_completed_at on public.goals;

create trigger goals_completed_at
  before update on public.goals
  for each row execute function public.goals_set_completed_at();

-- ── calendar_events ──────────────────────────────────────────────────────────
alter table public.calendar_events
  add column if not exists updated_at  timestamptz not null default now(),
  add column if not exists updated_by  uuid references auth.users(id) on delete set null,
  add column if not exists version     int not null default 1;

-- ── todos ────────────────────────────────────────────────────────────────────
-- updated_at + updated_by already exist; add version + structured assignee_id
alter table public.todos
  add column if not exists version       int not null default 1,
  add column if not exists assignee_id   uuid references auth.users(id) on delete set null;

-- ── auto-bump updated_at + version on every UPDATE ──────────────────────────
create or replace function public.bump_row_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version   := coalesce(old.version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists bump_transactions     on public.transactions;
drop trigger if exists bump_goals            on public.goals;
drop trigger if exists bump_todos            on public.todos;
drop trigger if exists bump_calendar_events  on public.calendar_events;

create trigger bump_transactions     before update on public.transactions     for each row execute function public.bump_row_version();
create trigger bump_goals            before update on public.goals            for each row execute function public.bump_row_version();
create trigger bump_todos            before update on public.todos            for each row execute function public.bump_row_version();
create trigger bump_calendar_events  before update on public.calendar_events  for each row execute function public.bump_row_version();
-- Migration 010: Leave household / transfer creator / delete account.
-- Fills the gap from B16 — no way to leave or dissolve a household.
-- All paths go through security-definer RPCs to keep RLS strict.
-- Run in: Supabase Dashboard > SQL Editor

-- household_members: allow self-delete (leave) and role-update (transfer creator)
drop policy if exists "members_delete_self" on public.household_members;
create policy "members_delete_self" on public.household_members for delete
  using (user_id = auth.uid());

drop policy if exists "members_update_role" on public.household_members;
create policy "members_update_role" on public.household_members for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ── Leave household ─────────────────────────────────────────────────────────
-- Removes caller's membership. If caller is the only/last member, household is
-- deleted (cascade wipes all data). If caller was the creator and partner remains,
-- partner is promoted.
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid       uuid;
  my_role   text;
  remaining int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select household_id, role into hid, my_role
    from public.household_members
    where user_id = auth.uid()
    limit 1;

  if hid is null then
    raise exception 'You are not in a household';
  end if;

  delete from public.household_members
    where household_id = hid and user_id = auth.uid();

  select count(*) into remaining
    from public.household_members
    where household_id = hid;

  if remaining = 0 then
    -- Cascade-delete the empty household and all its data
    delete from public.households where id = hid;
  elsif my_role = 'creator' then
    -- Promote remaining member to creator
    update public.household_members
      set role = 'creator'
      where household_id = hid;
  end if;
end;
$$;

-- ── Transfer creator role ───────────────────────────────────────────────────
create or replace function public.transfer_creator(new_creator uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into hid
    from public.household_members
    where user_id = auth.uid() and role = 'creator'
    limit 1;

  if hid is null then
    raise exception 'Only the creator can transfer ownership';
  end if;

  if not exists (
    select 1 from public.household_members
    where household_id = hid and user_id = new_creator
  ) then
    raise exception 'Target user is not in your household';
  end if;

  update public.household_members set role = 'partner'
    where household_id = hid and user_id = auth.uid();
  update public.household_members set role = 'creator'
    where household_id = hid and user_id = new_creator;
end;
$$;

-- ── Delete account ──────────────────────────────────────────────────────────
-- Scrubs profile + household membership. Auth row deletion still needs an
-- edge function with the service role (cannot be done from SQL with auth.uid()).
-- This RPC handles the data side; pair it with an edge fn for the auth.users row.
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  remaining int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Cascade-leave if in a household (reuses leave_household logic inline)
  select household_id into hid
    from public.household_members
    where user_id = auth.uid()
    limit 1;

  if hid is not null then
    delete from public.household_members
      where user_id = auth.uid();

    select count(*) into remaining
      from public.household_members
      where household_id = hid;

    if remaining = 0 then
      delete from public.households where id = hid;
    end if;
  end if;

  delete from public.profiles where id = auth.uid();
end;
$$;
-- Migration 011: Defensive CHECK constraints.
-- Server-side bounds to reject malformed or hostile input even if the client lies.
-- Run in: Supabase Dashboard > SQL Editor

-- ── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_display_name_len;
alter table public.profiles
  add constraint profiles_display_name_len
  check (length(trim(display_name)) between 1 and 60);

-- ── households ───────────────────────────────────────────────────────────────
alter table public.households
  drop constraint if exists households_invite_code_len;
alter table public.households
  add constraint households_invite_code_len
  check (length(invite_code) between 4 and 32);

-- ── transactions ─────────────────────────────────────────────────────────────
alter table public.transactions
  drop constraint if exists transactions_title_len,
  drop constraint if exists transactions_amount_range,
  drop constraint if exists transactions_category_len,
  drop constraint if exists transactions_note_len,
  drop constraint if exists transactions_date_format;

alter table public.transactions
  add constraint transactions_title_len    check (length(trim(title)) between 1 and 200),
  add constraint transactions_amount_range check (amount between -1000000000 and 1000000000),
  add constraint transactions_category_len check (length(category) between 1 and 60),
  add constraint transactions_note_len     check (note is null or length(note) <= 1000),
  add constraint transactions_date_format  check (date ~ '^\d{4}-\d{2}-\d{2}');

-- ── goals ────────────────────────────────────────────────────────────────────
alter table public.goals
  drop constraint if exists goals_title_len,
  drop constraint if exists goals_target_positive,
  drop constraint if exists goals_saved_nonneg,
  drop constraint if exists goals_progress_range,
  drop constraint if exists goals_status_enum,
  drop constraint if exists goals_description_len;

alter table public.goals
  add constraint goals_title_len        check (length(trim(title)) between 1 and 200),
  add constraint goals_target_positive  check (target > 0),
  add constraint goals_saved_nonneg     check (saved >= 0),
  add constraint goals_progress_range   check (progress between 0 and 100),
  add constraint goals_status_enum      check (status in ('Behind', 'On Track', 'Completed')),
  add constraint goals_description_len  check (description is null or length(description) <= 1000);

-- ── todos ────────────────────────────────────────────────────────────────────
alter table public.todos
  drop constraint if exists todos_text_len,
  drop constraint if exists todos_category_len,
  drop constraint if exists todos_subtext_len,
  drop constraint if exists todos_assigned_enum;

alter table public.todos
  add constraint todos_text_len        check (length(trim(text)) between 1 and 500),
  add constraint todos_category_len    check (length(category) between 1 and 60),
  add constraint todos_subtext_len     check (subtext is null or length(subtext) <= 1000),
  add constraint todos_assigned_enum   check (assigned in ('me', 'partner', 'both'));

-- ── calendar_events ──────────────────────────────────────────────────────────
alter table public.calendar_events
  drop constraint if exists events_title_len,
  drop constraint if exists events_category_len,
  drop constraint if exists events_date_format,
  drop constraint if exists events_time_format;

alter table public.calendar_events
  add constraint events_title_len    check (length(trim(title)) between 1 and 200),
  add constraint events_category_len check (length(category) between 1 and 60),
  add constraint events_date_format  check (date ~ '^\d{4}-\d{2}-\d{2}'),
  add constraint events_time_format  check (time ~ '^\d{1,2}:\d{2}');
-- Migration 012: Auto-notify partner on household events.
-- Hooks into each data table; uses notify_partner from migration 006.
-- Run in: Supabase Dashboard > SQL Editor

-- ── Transactions ────────────────────────────────────────────────────────────
create or replace function public.notify_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  sign  text;
  amt   text;
begin
  if tg_op = 'INSERT' then
    actor := new.created_by;
    sign  := case when new.type = 'income' then '+' else '-' end;
    amt   := sign || abs(new.amount)::text;
    perform public.notify_partner(
      new.household_id,
      actor,
      'transaction.added',
      'New transaction',
      amt || ' • ' || new.title,
      jsonb_build_object('row_id', new.id, 'amount', new.amount, 'type', new.type, 'category', new.category)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_transactions on public.transactions;
create trigger notify_transactions
  after insert on public.transactions
  for each row execute function public.notify_on_transaction();

-- ── Goals ───────────────────────────────────────────────────────────────────
create or replace function public.notify_on_goal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_partner(
      new.household_id,
      new.created_by,
      'goal.added',
      'New goal',
      new.title,
      jsonb_build_object('row_id', new.id, 'target', new.target)
    );
  elsif tg_op = 'UPDATE' and new.status = 'Completed' and old.status is distinct from 'Completed' then
    perform public.notify_partner(
      new.household_id,
      coalesce(new.created_by, old.created_by),
      'goal.completed',
      'Goal completed!',
      new.title,
      jsonb_build_object('row_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_goals on public.goals;
create trigger notify_goals
  after insert or update on public.goals
  for each row execute function public.notify_on_goal();

-- ── Todos ───────────────────────────────────────────────────────────────────
create or replace function public.notify_on_todo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and coalesce(new.shared, false) = true then
    perform public.notify_partner(
      new.household_id,
      new.owner_id,
      'todo.added',
      'New shared task',
      new.text,
      jsonb_build_object('row_id', new.id, 'priority', new.priority, 'category', new.category)
    );
  elsif tg_op = 'UPDATE'
        and new.assignee_id is not null
        and new.assignee_id is distinct from old.assignee_id then
    insert into public.notifications (user_id, household_id, type, title, body, payload)
      values (new.assignee_id, new.household_id, 'todo.assigned', 'Task assigned to you', new.text,
              jsonb_build_object('row_id', new.id));
  elsif tg_op = 'UPDATE'
        and new.completed = true and old.completed = false then
    perform public.notify_partner(
      new.household_id,
      coalesce(new.updated_by, new.owner_id),
      'todo.completed',
      'Task completed',
      new.text,
      jsonb_build_object('row_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_todos on public.todos;
create trigger notify_todos
  after insert or update on public.todos
  for each row execute function public.notify_on_todo();

-- ── Calendar events ─────────────────────────────────────────────────────────
create or replace function public.notify_on_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_partner(
      new.household_id,
      new.created_by,
      'event.added',
      'New event',
      new.title || ' • ' || new.date || ' ' || new.time,
      jsonb_build_object('row_id', new.id, 'category', new.category)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_events on public.calendar_events;
create trigger notify_events
  after insert on public.calendar_events
  for each row execute function public.notify_on_event();

-- ── Pairing ─────────────────────────────────────────────────────────────────
create or replace function public.notify_on_pair()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
begin
  select display_name into display from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, household_id, type, title, body, payload)
    select hm.user_id, new.household_id, 'partner.joined',
           'You are paired!',
           coalesce(display, 'Your partner') || ' joined your household.',
           jsonb_build_object('partner_id', new.user_id)
      from public.household_members hm
      where hm.household_id = new.household_id
        and hm.user_id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists notify_pair on public.household_members;
create trigger notify_pair
  after insert on public.household_members
  for each row execute function public.notify_on_pair();
