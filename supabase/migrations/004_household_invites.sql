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
