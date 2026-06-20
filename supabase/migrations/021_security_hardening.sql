-- 021_security_hardening.sql
--
-- Addresses WARN-level findings from the Supabase security advisor
-- (2026-06-20). No ERROR-level issues exist; RLS is already enabled on all
-- tables. These are defence-in-depth hardening steps.
--
-- Review and apply via the Supabase CLI / dashboard. Test signup, invite
-- redeem, and push delivery on a branch before promoting to production.

begin;

-- ── 1. Pin search_path on flagged functions ─────────────────────────────────
-- A role-mutable search_path lets a caller prepend a malicious schema and
-- shadow the objects a SECURITY DEFINER function resolves. All five functions
-- below already schema-qualify every reference (public.*, auth.uid()), so an
-- empty search_path is safe and is the recommended hardening.
alter function public.bump_row_version()        set search_path = '';
alter function public.create_household(text)     set search_path = '';
alter function public.goals_set_completed_at()   set search_path = '';
alter function public.is_household_member(uuid)   set search_path = '';
alter function public.join_household(text)        set search_path = '';

-- ── 2. Remove anon EXECUTE on functions ──────────────────────────────────────
-- Postgres grants EXECUTE to PUBLIC by default, which includes the anon role.
-- Every RPC in this app is gated on auth.uid(), so anon never needs to call
-- them; trigger functions run with definer privileges regardless of grants.
-- Revoke the blanket PUBLIC/anon grant, then restore EXECUTE for the roles
-- that legitimately need it.
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated, service_role;

commit;

-- ── 3. Move pg_net out of the public schema (MANUAL — left commented) ─────────
-- The advisor flags `pg_net` living in `public`. Moving it is NOT safe to run
-- blindly: migration 015's push-dispatch trigger calls `net.http_post(...)`,
-- and `ALTER EXTENSION ... SET SCHEMA` changes the schema those functions live
-- in. Before enabling the lines below, update every `net.*` reference (notably
-- in 015_pg_net_push_trigger.sql / dispatch_push_for_notification) to the new
-- schema, then verify push still fires.
--
-- create schema if not exists extensions;
-- alter extension pg_net set schema extensions;

-- ── 4. Leaked-password protection — dashboard toggle, not SQL ────────────────
-- Enable HaveIBeenPwned checks under Auth → Providers → Email → "Prevent use of
-- compromised passwords". Cannot be set from a migration.

-- ── Verify (run after applying) ──────────────────────────────────────────────
-- select proname, proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and proname in
--   ('bump_row_version','create_household','goals_set_completed_at','is_household_member','join_household');
-- -- proconfig should show {search_path=""} for each.
