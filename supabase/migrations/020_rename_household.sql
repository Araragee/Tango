-- Migration 020: Add household name + rename RPC.
-- Addresses E2 gap: rename household.
-- Run in: Supabase Dashboard > SQL Editor

alter table public.households
  add column if not exists name text;

-- Any household member can rename.
create or replace function public.rename_household(new_name text)
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
    where user_id = auth.uid()
    limit 1;

  if hid is null then
    raise exception 'Not in a household';
  end if;

  if trim(new_name) = '' then
    raise exception 'Household name cannot be empty';
  end if;

  update public.households
    set name = trim(new_name)
    where id = hid;
end;
$$;
