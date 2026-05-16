-- Migration 013: Profile avatar URL + storage bucket bootstrap notes.
-- The bucket itself MUST be created via the Supabase Dashboard:
--   Storage > New Bucket > name=avatars, public=true (or signed URLs if you prefer privacy)
--   Storage > New Bucket > name=receipts, public=false
-- Then run this SQL to add the columns + storage policies.
--
-- Run in: Supabase Dashboard > SQL Editor (after creating buckets)

-- ── profiles.avatar_url ──────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_len;
alter table public.profiles
  add constraint profiles_avatar_url_len
  check (avatar_url is null or length(avatar_url) <= 1024);

-- ── Storage policies (avatars: public read, owner write) ─────────────────────
-- Skip silently if the bucket isn't created yet — storage.objects exists
-- regardless, so policy creation will succeed even on empty buckets.

drop policy if exists "avatars_select" on storage.objects;
create policy "avatars_select" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Storage policies (receipts: per-household member access) ─────────────────
-- Object path convention: <household_id>/<row_id>.<ext>

drop policy if exists "receipts_select" on storage.objects;
create policy "receipts_select" on storage.objects for select
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts_insert" on storage.objects;
create policy "receipts_insert" on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.uid() is not null
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts_update" on storage.objects;
create policy "receipts_update" on storage.objects for update
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "receipts_delete" on storage.objects;
create policy "receipts_delete" on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
