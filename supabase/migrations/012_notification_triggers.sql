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
