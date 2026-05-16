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
