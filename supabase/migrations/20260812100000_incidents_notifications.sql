-- Incidents and notifications (Task 2 of the v1 completion plan).
--
-- Two new capabilities land together because they arrived together in the
-- product: the crew can record what went wrong on site, and the other side
-- learns about it without anybody phoning anybody.
--
-- email_log is NOT here: it was pulled forward into 20260720210000 with the
-- magic-link login, which needed a send log before this engine existed.

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('incident','rain_stop','obstruction')),
  -- May be empty on purpose. Typing a sentence in the rain is not mandatory:
  -- for a rain stop or an obstruction the kind IS the message, and the UI
  -- renders the kind label when the note is blank. Storing localized UI copy
  -- in a data row instead would freeze one language into the record.
  note text not null default '',
  occurred_on date not null,
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_incidents_project on public.incidents(project_id, occurred_on desc);

create table public.incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);
create index idx_incident_photos_incident on public.incident_photos(incident_id);

-- The in-app inbox. One row per recipient per event, so "read" is per person
-- rather than per event: two Bauleiter in one company each mark their own.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_person uuid not null references public.people(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient
  on public.notifications(recipient_person, created_at desc);
-- Partial index: the bell asks "any unread for me" on every page load, and that
-- question stays cheap forever while the table grows.
create index idx_notifications_unread
  on public.notifications(recipient_person) where read_at is null;

-- The activity feed gains the kinds the remaining modules emit. Constraint name
-- verified against pg_constraint before this drop: activity_kind_check.
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in (
  'entry_submitted','material_check_completed','request_created','request_resolved',
  'document_uploaded','document_expiring','hours_submitted','hours_decided',
  'hours_deemed_approved','change_order_submitted','change_order_decided',
  'acceptance_signed','project_updated',
  'incident_created','po_sent','po_accepted','po_rejected',
  'finalization_requested','invoice_generated','invoice_sent'
));

alter table public.incidents enable row level security;
alter table public.incident_photos enable row level security;
alter table public.notifications enable row level security;
