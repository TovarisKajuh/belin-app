-- Expand the project lifecycle states for the party status control.
-- Adds paused, reviewing, finished (replacing the unused 'completed').
alter table public.projects drop constraint projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('draft', 'active', 'paused', 'reviewing', 'finished', 'cancelled'));
