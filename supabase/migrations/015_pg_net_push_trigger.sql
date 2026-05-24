-- Migration 015 (hardened): Enable pg_net auto-push trigger on notifications inserts.
-- Run in: Supabase Dashboard > SQL Editor.
--
-- Pipeline:
--   partner write → table trigger (012_notification_triggers) → notifications row insert
--     → this trigger → pg_net POST → dispatch_push edge fn → web push
--
-- Prereqs:
--   - migration 014 applied (notifications + push_subscriptions tables)
--   - dispatch_push edge fn deployed with --no-verify-jwt
--   - VAPID secrets + DISPATCH_PUSH_SECRET set in Edge Function secrets
--
-- Required GUCs (Supabase → Settings → Database → Configuration → Custom GUCs):
--   app.dispatch_push_url    = 'https://<your-ref>.functions.supabase.co/dispatch_push'
--   app.dispatch_push_secret = '<same value as DISPATCH_PUSH_SECRET edge fn secret>'
--
-- Security note: the function URL is no longer hardcoded here — it is read from
-- a GUC so the project ref is never checked into source control.  The shared
-- secret is also read from a GUC and sent as x-tango-secret so the edge
-- function can reject unauthenticated callers.

create extension if not exists pg_net;

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

  -- Skip silently if either GUC is missing (dev / staging environments that
  -- haven't configured push yet).
  if fn_url is null or fn_url = '' or fn_secret is null or fn_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-tango-secret', fn_secret
    ),
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
