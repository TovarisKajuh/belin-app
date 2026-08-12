-- Removes a silent trap found during the migration reconciliation of 2026-08-12.
--
-- create_project_from_review existed TWICE: the original seven argument version
-- from 20260720150000, and the roofs-aware eight argument version that replaced
-- it in 20260720180000. "create or replace function" only replaces a function
-- with the SAME signature, so adding p_roofs did not replace anything: it
-- created a second overload and left the first one live. Both the database and
-- the repo carried both, which is why nothing looked wrong.
--
-- Nothing calls the old one today, because lib/data/plan-imports.ts always
-- sends p_roofs and PostgREST resolves overloads by argument name. That is the
-- entire safety margin, and it is one forgotten argument wide: a caller that
-- omitted p_roofs would silently land on the old body, create the project with
-- its material list intact and its ROOFS MISSING, and return a perfectly normal
-- project id. No error, no warning, a project that quietly lost half the plan.
--
-- The types are tightened in the same commit (p_roofs stops being optional in
-- lib/database.types.ts), so the compiler now refuses the call shape that this
-- migration makes impossible at the database.

drop function if exists public.create_project_from_review(
  uuid,   -- p_import_id
  uuid,   -- p_epc_org_id
  uuid,   -- p_sub_org_id
  jsonb,  -- p_project
  jsonb,  -- p_items
  text,   -- p_epc_token
  text    -- p_sub_token
);
