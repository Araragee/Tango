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
