-- email_log, pulled forward out of M3.
--
-- The plan files this table with the notifications engine (Part D), but the
-- magic-link login in Part B sends mail before that engine exists, and a send
-- that is not written down cannot be debugged: "did the founder's link ever go
-- out" is the first question every auth problem asks. So the log lands with the
-- first sender rather than with the engine that later shares it. The rest of
-- M3 (incidents, notifications, the widened activity kinds) is unchanged.
--
-- Every attempt is recorded, sent or failed, including the deliberate refusals
-- to send to the fake *-demo.si seed addresses.

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  kind text not null,
  project_id uuid references public.projects(id) on delete set null,
  status text not null check (status in ('sent','failed')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index idx_email_log_project on public.email_log(project_id);

alter table public.email_log enable row level security;
