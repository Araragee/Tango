# Web Push Setup

## 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This outputs:
```
Public Key:  <BASE64URL_PUBLIC>
Private Key: <BASE64URL_PRIVATE>
```

## 2. Front-end env

Add to `front-end/.env.local` (or Vercel / Netlify env):

```
VITE_VAPID_PUBLIC_KEY=<BASE64URL_PUBLIC>
```

## 3. Supabase Edge Function secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | `<BASE64URL_PUBLIC>` |
| `VAPID_PRIVATE_KEY` | `<BASE64URL_PRIVATE>` |
| `VAPID_CONTACT` | `mailto:your@email.com` |

## 4. Deploy the edge function

```bash
supabase functions deploy dispatch_push --no-verify-jwt
```

> `--no-verify-jwt` lets the function be invoked from a pg_net webhook without a user JWT.

## 5. Enable pg_net trigger (optional — auto-push on partner writes)

In your Supabase SQL editor, paste and run:

```sql
-- Replace <PROJECT_REF> with your actual Supabase project ref
-- Replace <SERVICE_ROLE_KEY> with your service role key (use a vault secret in prod)
create or replace function notify_push_on_write()
returns trigger language plpgsql security definer as $$
declare
  _household_id uuid;
  _title text;
  _body  text;
begin
  _household_id := coalesce(NEW.household_id, OLD.household_id);
  if _household_id is null then return NEW; end if;

  _title := 'Tango';
  _body  := tg_table_name || ' updated by your partner.';

  perform net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch_push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := jsonb_build_object(
      'household_id', _household_id::text,
      'title',        _title,
      'body',         _body
    )
  );
  return NEW;
end;
$$;

-- Attach to any table you want (example: goals)
create trigger push_on_goal_change
  after insert or update on goals
  for each row execute function notify_push_on_write();
```

## 6. Manual dispatch (from server code or SQL)

```sql
select net.http_post(
  url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch_push',
  headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}',
  body    := '{"user_id":"<UUID>","title":"Tango","body":"Your partner added a goal!"}'
);
```

Or from any backend:

```ts
await fetch('https://<PROJECT_REF>.supabase.co/functions/v1/dispatch_push', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({
    household_id: householdId,
    title: 'Tango',
    body: 'Partner just added a transaction!',
    url: '/app/budget',
  }),
})
```

## Notes

- Safari on iOS 16.4+ supports Web Push for installed PWAs (add to home screen required).
- Chrome / Edge on Android support it out of the box.
- Firefox desktop supports it.
- The `push_subscriptions` table is already created by migration `014_phase5_phase6.sql`.
- Expired subscriptions (HTTP 410) are auto-deleted by the edge function.
