-- 022_private_receipts_bucket.sql
--
-- Receipts (financial documents) were uploaded to the PUBLIC `avatars` bucket,
-- so anyone holding a receipt URL could read it without signing in. This
-- creates the private `receipts` bucket the app now uses (front-end default
-- RECEIPTS_BUCKET='receipts'); receipts are viewed through short-lived signed
-- URLs and the transactions.receipt_url column stores `storage:receipts/<path>`.
--
-- Object path convention: <household_id>/<transaction_id>_<uuid>.<ext>
--
-- Apply BEFORE deploying the matching front-end build, or receipt uploads fail.
--
-- Existing receipts under avatars/receipts/... remain publicly readable until
-- they are re-attached or deleted; see the optional clean-up note at the end.

begin;

-- ── 1. Private bucket with server-side size + type limits ────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 10485760,  -- 10 MB, matches the client check
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. Household-scoped policies (replace 013's versions) ────────────────────
-- 013 cast the first path segment straight to uuid; a non-uuid folder name
-- raised an error instead of simply denying access. Guard the cast.
create or replace function public.receipt_household_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end
$$;

revoke execute on function public.receipt_household_id(text) from public, anon;
grant  execute on function public.receipt_household_id(text) to authenticated, service_role;

drop policy if exists "receipts_select" on storage.objects;
create policy "receipts_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(public.receipt_household_id(name))
  );

drop policy if exists "receipts_insert" on storage.objects;
create policy "receipts_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and public.is_household_member(public.receipt_household_id(name))
  );

drop policy if exists "receipts_update" on storage.objects;
create policy "receipts_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(public.receipt_household_id(name))
  )
  with check (
    bucket_id = 'receipts'
    and public.is_household_member(public.receipt_household_id(name))
  );

drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and public.is_household_member(public.receipt_household_id(name))
  );

commit;

-- ── Optional clean-up of legacy public receipts ──────────────────────────────
-- Receipts uploaded before this migration live at avatars/receipts/<user>/...
-- and stay public. To revoke public access entirely, re-attach them in the app
-- (or migrate them with a script using the service role), then delete the
-- objects from the dashboard: Storage › avatars › receipts/.
