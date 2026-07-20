-- Roofs, as read from the K2 plan.
--
-- A solar site is planned, built and reported roof by roof: the K2 overview
-- prints one row per roof with its own module type, module count and kWp, and
-- the crew works one roof at a time. The wizard was parsing all of that and
-- discarding it, keeping only the project total, which is the number the EPC
-- cares about least when scheduling a crew.
--
-- Its own table rather than jsonb on projects, because a roof is a real thing
-- that later work hangs off (scope per roof, hours per roof, a report naming
-- the roof it covers), and those want a foreign key, not a blob.

create table public.project_roofs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  module_count integer check (module_count >= 0),
  kwp numeric(10,3) check (kwp >= 0),
  module_type text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_project_roofs_project on public.project_roofs(project_id, sort_order);

alter table public.project_roofs enable row level security;
