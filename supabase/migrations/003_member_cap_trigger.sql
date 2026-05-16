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
