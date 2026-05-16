-- Migration 014: Phase 5 (date-night reviews) + Phase 6 (push subscriptions).
-- Run in: Supabase Dashboard > SQL Editor

-- ============================================================
-- F5 — Date-night mood/review on calendar_events
-- ============================================================

alter table public.calendar_events
  add column if not exists mood        smallint,
  add column if not exists review_note text,
  add column if not exists notes       text;

alter table public.calendar_events
  drop constraint if exists events_mood_range,
  drop constraint if exists events_review_note_len,
  drop constraint if exists events_notes_len;

alter table public.calendar_events
  add constraint events_mood_range      check (mood is null or mood between 1 and 5),
  add constraint events_review_note_len check (review_note is null or length(review_note) <= 1000),
  add constraint events_notes_len       check (notes is null or length(notes) <= 1000);

-- ============================================================
-- F6 — Web push subscriptions
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  endpoint    text not null,
  p256dh      text not null,        -- public key from PushSubscription.toJSON().keys.p256dh
  auth_key    text not null,        -- auth secret from PushSubscription.toJSON().keys.auth
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select" on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions_insert" on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions_update" on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete" on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- ============================================================
-- Achievements ledger (server-side store of unlocked badges)
-- ============================================================

create table if not exists public.achievements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  household_id uuid references public.households(id) on delete cascade,
  code         text not null,           -- e.g. 'first_save_1k', 'streak_30_logged', 'dates_10_month'
  unlocked_at  timestamptz not null default now(),
  payload      jsonb,
  unique (user_id, code)
);

create index if not exists achievements_user_idx
  on public.achievements (user_id, unlocked_at desc);

alter table public.achievements enable row level security;

create policy "achievements_select" on public.achievements for select
  using (
    user_id = auth.uid()
    or (
      household_id is not null
      and public.is_household_member(household_id)
    )
  );

create policy "achievements_insert" on public.achievements for insert
  with check (user_id = auth.uid());

create policy "achievements_delete" on public.achievements for delete
  using (user_id = auth.uid());

-- ============================================================
-- Notification dispatch hook (Phase 6, optional, requires pg_net extension)
-- ============================================================
-- This trigger is OPTIONAL. It fires on every new notifications row and POSTs
-- to a Supabase Edge Function which then delivers a web-push payload to all
-- of the recipient's push_subscriptions.
--
-- Setup:
--   1. supabase functions deploy dispatch_push
--   2. set SUPABASE_PROJECT_REF + SUPABASE_FUNCTION_SECRET in Settings > Edge Functions
--   3. enable pg_net extension: create extension if not exists pg_net;
--   4. set the two GUCs below (Settings > Database > Configuration > Add custom GUC):
--        app.dispatch_push_url     = 'https://<ref>.functions.supabase.co/dispatch_push'
--        app.dispatch_push_secret  = '<secret matching the edge fn check>'
--   5. UNCOMMENT the trigger creation block at the bottom of this section.
--
-- If you skip this trigger, foreground notifications still work via the
-- realtime channel handler in useNotificationsStore.

create or replace function public.dispatch_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url    text;
  fn_secret text;
begin
  fn_url    := current_setting('app.dispatch_push_url',    true);
  fn_secret := current_setting('app.dispatch_push_secret', true);
  if fn_url is null or fn_secret is null then
    return new;
  end if;

  -- Fire-and-forget HTTP POST via pg_net
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-tango-secret', fn_secret
    ),
    body := jsonb_build_object(
      'notification_id', new.id,
      'user_id',         new.user_id,
      'title',           new.title,
      'body',            new.body,
      'type',            new.type,
      'payload',         new.payload
    )
  );
  return new;
exception when others then
  -- Don't break the notification insert if dispatch fails
  raise notice 'dispatch_push_for_notification failed: %', sqlerrm;
  return new;
end;
$$;

-- Uncomment when ready:
-- drop trigger if exists dispatch_push_on_notification on public.notifications;
-- create trigger dispatch_push_on_notification
--   after insert on public.notifications
--   for each row execute function public.dispatch_push_for_notification();

alter publication supabase_realtime add table public.achievements;
