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
