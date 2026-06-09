-- Migration 017: Secure UPDATE policies by adding WITH CHECK clauses
-- Run in: Supabase Dashboard > SQL Editor

-- 1. Profiles
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 2. Transactions
drop policy if exists "transactions_update" on public.transactions;
create policy "transactions_update" on public.transactions for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- 3. Goals
drop policy if exists "goals_update" on public.goals;
create policy "goals_update" on public.goals for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- 4. Todos
drop policy if exists "todos_update" on public.todos;
create policy "todos_update" on public.todos for update
  using (
    (shared = false and owner_id = auth.uid()) or
    (shared = true and public.is_household_member(household_id))
  )
  with check (
    (shared = false and owner_id = auth.uid()) or
    (shared = true and public.is_household_member(household_id))
  );

-- 5. Calendar Events
drop policy if exists "events_update" on public.calendar_events;
create policy "events_update" on public.calendar_events for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- 6. Recurring Transactions
drop policy if exists "recurring_update" on public.recurring_transactions;
create policy "recurring_update" on public.recurring_transactions for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- 7. Notifications
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
