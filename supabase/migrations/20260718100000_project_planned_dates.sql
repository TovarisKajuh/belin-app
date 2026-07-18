-- Optional planned start and completion dates, used by the dashboard projection
-- (working-day totals and the deadline buffer). Nullable: the projection
-- degrades to a pure rate-based forecast when they are not set.
alter table public.projects
  add column if not exists planned_start date,
  add column if not exists planned_end date;
