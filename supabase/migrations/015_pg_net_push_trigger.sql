-- Migration 015: Enable pg_net auto-push trigger on notifications inserts.
-- Run in: Supabase Dashboard > SQL Editor.
--
-- Pipeline:
--   partner write → table trigger (012_notification_triggers) → notifications row insert
--     → this trigger → pg_net POST → dispatch_push edge fn → web push
--
-- Prereqs (already done):
--   - migration 014 applied (notifications + push_subscriptions tables)
--   - dispatch_push edge fn deployed with --no-verify-jwt
--   - VAPID secrets set in Edge Function secrets

create extension if not exists pg_net;

-- Replace the fn from 014 with a version that:
--   1. Hardcodes the project URL (no GUC dependency)
--   2. Posts the notification fields dispatch_push actually expects
--      (user_id, title, body, url) instead of the 014 schema.
--   3. Swallows errors so a dispatch failure never blocks notification insert.
create or replace function public.dispatch_push_for_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://zunaobfntaeyyazitzft.supabase.co/functions/v1/dispatch_push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'user_id', new.user_id,
      'title',   new.title,
      'body',    new.body,
      'url',     coalesce(new.payload->>'url', '/app/budget')
    )
  );
  return new;
exception when others then
  raise notice 'dispatch_push_for_notification failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists dispatch_push_on_notification on public.notifications;
create trigger dispatch_push_on_notification
  after insert on public.notifications
  for each row execute function public.dispatch_push_for_notification();
