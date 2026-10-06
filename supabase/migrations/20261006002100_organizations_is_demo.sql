-- 2026-10-06, Task 2.1a: the database says which organizations are disposable.
--
-- One database serves local development, the demo and production. The demo
-- seed deletes and rewrites, and until now the only thing between it and a real
-- customer was a hardcoded list of ids in a script. From here: the seed refuses
-- to run when a fixed demo id belongs to an organization that is not flagged,
-- every purge is scoped to flagged organizations, and the Demo Door opens
-- sessions only for people of a flagged organization. A new organization
-- (signup, invite) is never demo: the default is false and the app never sets it.

alter table public.organizations
  add column if not exists is_demo boolean not null default false;

comment on column public.organizations.is_demo is
  'True only for the fixed demo companies the seed owns. Never set by the app.';

update public.organizations
   set is_demo = true
 where id in (
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222223',
   '22222222-2222-4222-8222-222222222224'
 );
