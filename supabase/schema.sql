-- ============================================================
-- Tango — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Households (one per couple)
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at  timestamptz default now()
);

-- Profiles (extension of auth.users)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz default now()
);

-- Household members (max 2 per household)
create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         text not null check (role in ('creator', 'partner')),
  created_at   timestamptz default now(),
  unique (household_id, user_id)
);

-- Transactions
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  created_by   uuid references auth.users(id) not null,
  title        text not null,
  amount       numeric not null,
  type         text not null check (type in ('expense', 'income')),
  category     text not null default 'General',
  icon         text not null default 'receipt',
  date         text not null,
  created_at   timestamptz default now()
);

-- Goals
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  created_by   uuid references auth.users(id) not null,
  title        text not null,
  description  text default '',
  saved        numeric not null default 0,
  target       numeric not null,
  icon         text not null default 'flag',
  deadline     text,
  status       text not null default 'Behind',
  progress     int not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Todos
create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  owner_id     uuid references auth.users(id) not null,
  text         text not null,
  completed    boolean not null default false,
  shared       boolean not null default false,
  category     text not null default 'General',
  assigned     text default 'both',
  priority     text check (priority in ('Chill', 'Normal', 'ASAP')),
  subtext      text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  updated_by   uuid references auth.users(id)
);

-- Calendar events
create table public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  created_by   uuid references auth.users(id) not null,
  title        text not null,
  date         text not null,
  time         text not null,
  category     text not null default 'date',
  icon         text not null default 'event',
  partners     text[] not null default '{}',
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.households         enable row level security;
alter table public.household_members  enable row level security;
alter table public.transactions       enable row level security;
alter table public.goals              enable row level security;
alter table public.todos              enable row level security;
alter table public.calendar_events    enable row level security;

-- Atomically creates household + first member (security definer to bypass RLS bootstrapping)
create or replace function public.create_household(invite_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  h_id uuid;
begin
  insert into public.households (invite_code)
    values (invite_code)
    returning id into h_id;

  insert into public.household_members (household_id, user_id, role)
    values (h_id, auth.uid(), 'creator');

  return h_id;
end;
$$;

-- Joins a household by invite code (security definer bypasses RLS select-before-member issue)
create or replace function public.join_household(invite_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  h_id uuid;
begin
  select id into h_id
    from public.households
    where households.invite_code = upper(join_household.invite_code)
    limit 1;

  if h_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.household_members (household_id, user_id, role)
    values (h_id, auth.uid(), 'partner')
    on conflict (household_id, user_id) do nothing;

  return h_id;
end;
$$;

-- Helper: is the current user a member of a given household?
create or replace function public.is_household_member(hid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- Profiles: anyone in the same household can see profiles
create policy "profiles_select" on public.profiles for select
  using (exists (
    select 1 from public.household_members m1
    join public.household_members m2 on m1.household_id = m2.household_id
    where m1.user_id = auth.uid() and m2.user_id = public.profiles.id
  ));

-- Profiles: users can update their own
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid());

-- Profiles: users can insert their own (on signup/onboarding)
create policy "profiles_insert" on public.profiles for insert
  with check (id = auth.uid());

-- Households: read own
create policy "households_select" on public.households for select
  using (public.is_household_member(id));

-- Households: insert (authenticated users only)
create policy "households_insert" on public.households
  for insert to authenticated
  with check (true);

-- Household members: read own household
create policy "members_select" on public.household_members for select
  using (public.is_household_member(household_id));

-- Household members: insert own membership
create policy "members_insert" on public.household_members
  for insert to authenticated
  with check (user_id = auth.uid());

-- Transactions: household members only
create policy "transactions_select" on public.transactions for select
  using (public.is_household_member(household_id));
create policy "transactions_insert" on public.transactions for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "transactions_update" on public.transactions for update
  using (public.is_household_member(household_id));
create policy "transactions_delete" on public.transactions for delete
  using (public.is_household_member(household_id));

-- Goals: household members only
create policy "goals_select" on public.goals for select
  using (public.is_household_member(household_id));
create policy "goals_insert" on public.goals for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "goals_update" on public.goals for update
  using (public.is_household_member(household_id));
create policy "goals_delete" on public.goals for delete
  using (public.is_household_member(household_id));

-- Todos: personal (owner only) or shared (household members)
create policy "todos_select" on public.todos for select
  using (
    (shared = false and owner_id = auth.uid()) or
    (shared = true and public.is_household_member(household_id))
  );
create policy "todos_insert" on public.todos for insert
  with check (public.is_household_member(household_id) and owner_id = auth.uid());
create policy "todos_update" on public.todos for update
  using (
    (shared = false and owner_id = auth.uid()) or
    (shared = true and public.is_household_member(household_id))
  );
create policy "todos_delete" on public.todos for delete
  using (owner_id = auth.uid());

-- Calendar events: household members only
create policy "events_select" on public.calendar_events for select
  using (public.is_household_member(household_id));
create policy "events_insert" on public.calendar_events for insert
  with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "events_update" on public.calendar_events for update
  using (public.is_household_member(household_id));
create policy "events_delete" on public.calendar_events for delete
  using (public.is_household_member(household_id));

-- ============================================================
-- Realtime: enable for all app tables
-- ============================================================
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.calendar_events;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.household_members;
