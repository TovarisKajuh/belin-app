-- Task 1.7: close what the 2026-10-05 security pass found before strangers
-- get accounts. Verified live that night: material_check_docs had row level
-- security OFF with full anon grants, and all four public functions were
-- executable by anon and authenticated, one of them SECURITY DEFINER.
--
-- Morning cut 06.10.2026: this is the migration part of Task 1.7 only. The
-- people_email_lowercase constraint of the full plan is NOT in this file; it
-- ships after the meeting together with the exact-match code changes of 1.7.

-- 1. The only public table without row level security. No policies on
--    purpose: deny-all for anon and authenticated like every other table.
--    The app reads it with the service role, which bypasses RLS.
alter table public.material_check_docs enable row level security;

-- 2. Functions. Postgres grants EXECUTE to PUBLIC and Supabase to anon and
--    authenticated by default. Every call in this app goes through the
--    service role (lib/supabase/admin.ts), so nobody else needs them.
--    tests/migrations-guard.test.ts fails any later migration that creates a
--    public function without these two lines after it.
revoke execute on function public.create_project_from_review(uuid, uuid, uuid, jsonb, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_project_from_review(uuid, uuid, uuid, jsonb, jsonb, text, text, jsonb) to service_role;

revoke execute on function public.scope_installed(uuid) from public, anon, authenticated;
grant execute on function public.scope_installed(uuid) to service_role;

revoke execute on function public.submit_daily_report(uuid, date, text, integer, jsonb, uuid, jsonb, text[], uuid) from public, anon, authenticated;
grant execute on function public.submit_daily_report(uuid, date, text, integer, jsonb, uuid, jsonb, text[], uuid) to service_role;

revoke execute on function public.submit_material_check(uuid, uuid, text, jsonb, text[], text[]) from public, anon, authenticated;
grant execute on function public.submit_material_check(uuid, uuid, text, jsonb, text[], text[]) to service_role;

-- 3. A fixed search_path on the three SECURITY INVOKER functions that had
--    none (advisor 0011 function_search_path_mutable, late finding LF13).
--    Their bodies use only public tables and pg_catalog functions (checked
--    2026-10-05 against the latest definitions in 20260717240000,
--    20260719170000 and 20260813120000). ALTER FUNCTION keeps the grants
--    set above. create_project_from_review already has search_path=public.
alter function public.scope_installed(uuid) set search_path = public;
alter function public.submit_daily_report(uuid, date, text, integer, jsonb, uuid, jsonb, text[], uuid) set search_path = public;
alter function public.submit_material_check(uuid, uuid, text, jsonb, text[], text[]) set search_path = public;

-- 4. Two identical indexes on material_checks (project_id, checked_at desc):
--    idx_material_checks_project_checked (20260717240000) and
--    idx_material_checks_project_latest (20260719150000). Keep the first.
drop index if exists public.idx_material_checks_project_latest;
