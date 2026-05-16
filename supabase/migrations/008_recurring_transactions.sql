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
