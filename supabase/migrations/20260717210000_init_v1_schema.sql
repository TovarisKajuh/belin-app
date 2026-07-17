-- BELIN v1 schema. Complete data model for all five modules, designed
-- before any module code (DECISIONS.md 2026-07-17 evening).
-- Conventions: uuid pks, timestamptz, numeric quantities, text + CHECK
-- instead of enums, RLS enabled with zero policies (server-only access
-- via service role until M1 adds per-user policies), explicit fk indexes.

create extension if not exists moddatetime with schema extensions;

-- ============================================================
-- Module 0: core (organizations, people, projects, tokens, invites)
-- ============================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('epc', 'sub')),
  name text not null,
  country text check (country in ('de', 'at', 'si')),
  address text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete restrict,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  role text not null check (role in ('admin', 'bauleiter', 'owner', 'crew')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_people_org on public.people (org_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  epc_org_id uuid not null references public.organizations (id) on delete restrict,
  sub_org_id uuid references public.organizations (id) on delete restrict,
  name text not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  language text not null default 'de' check (language in ('sl', 'de', 'en')),
  country text not null check (country in ('de', 'at', 'si')),
  address_street text,
  address_zip text,
  address_city text,
  lat double precision,
  lng double precision,
  plan_pdf_path text,
  kwp numeric(8, 2),
  module_count integer,
  module_type text,
  mounting_system text,
  roof_type text,
  hourly_work_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_epc_org on public.projects (epc_org_id);
create index idx_projects_sub_org on public.projects (sub_org_id);

create table public.project_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  role text not null check (role in ('epc', 'sub')),
  token text not null unique,
  label text,
  revoked boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_project_tokens_project on public.project_tokens (project_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sub_company', 'crew', 'epc_member')),
  project_id uuid references public.projects (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  email text,
  invited_role text check (invited_role in ('admin', 'bauleiter', 'owner', 'crew')),
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by_person uuid references public.people (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_invites_project on public.invites (project_id);
create index idx_invites_org on public.invites (org_id);

-- ============================================================
-- Module 3: daily log, quantities, materials, requests, activity
-- ============================================================

create table public.scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  unit text not null,
  target_qty numeric(12, 2) not null check (target_qty >= 0),
  weight numeric(8, 2) not null default 1 check (weight >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_scope_items_project on public.scope_items (project_id);

create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  entry_date date not null,
  note text,
  headcount integer check (headcount >= 0),
  weather jsonb,
  created_by_person uuid references public.people (id) on delete set null,
  client_generated_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_daily_entries_project_date
  on public.daily_entries (project_id, entry_date desc);

create table public.entry_quantities (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.daily_entries (id) on delete cascade,
  scope_item_id uuid not null references public.scope_items (id) on delete cascade,
  qty numeric(12, 2) not null check (qty >= 0),
  unique (entry_id, scope_item_id)
);
create index idx_entry_quantities_entry on public.entry_quantities (entry_id);
create index idx_entry_quantities_scope_item on public.entry_quantities (scope_item_id);

create table public.entry_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.daily_entries (id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  taken_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_entry_photos_entry on public.entry_photos (entry_id);

create table public.material_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  qty numeric(12, 2) not null check (qty >= 0),
  unit text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_material_items_project on public.material_items (project_id);

create table public.material_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  is_complete boolean not null,
  note text,
  checked_by_person uuid references public.people (id) on delete set null,
  checked_at timestamptz not null default now()
);
create index idx_material_checks_project on public.material_checks (project_id);

create table public.material_check_items (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.material_checks (id) on delete cascade,
  material_item_id uuid not null references public.material_items (id) on delete cascade,
  status text not null check (status in ('present', 'partial', 'missing')),
  missing_qty numeric(12, 2) check (missing_qty >= 0),
  unique (check_id, material_item_id)
);
create index idx_material_check_items_check on public.material_check_items (check_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in ('material', 'plan', 'instruction')),
  text text not null,
  photo_path text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  response_note text,
  resolved_at timestamptz,
  created_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_requests_project_status on public.requests (project_id, status);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'entry_submitted',
    'material_check_completed',
    'request_created',
    'request_resolved',
    'document_uploaded',
    'document_expiring',
    'hours_submitted',
    'hours_decided',
    'hours_deemed_approved',
    'change_order_submitted',
    'change_order_decided',
    'acceptance_signed',
    'project_updated'
  )),
  payload jsonb not null default '{}'::jsonb,
  actor_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_activity_project_created
  on public.activity (project_id, created_at desc);

-- ============================================================
-- Module 2: compliance vault
-- ============================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete restrict,
  person_id uuid references public.people (id) on delete restrict,
  type text not null check (type in (
    'a1',
    'freistellungsbescheinigung',
    'unbedenklichkeitsbescheinigung',
    'id_document',
    'qualification',
    'hfu_status',
    'zko_notification',
    'insurance',
    'other'
  )),
  title text not null,
  storage_path text not null,
  valid_from date,
  valid_until date,
  uploaded_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_documents_org on public.documents (org_id);
create index idx_documents_person on public.documents (person_id);
create index idx_documents_valid_until on public.documents (valid_until);

create table public.document_reminders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  days_before integer not null,
  sent_at timestamptz not null default now()
);
create index idx_document_reminders_document
  on public.document_reminders (document_id);

-- ============================================================
-- Module 4: Regiestunden
-- ============================================================

create table public.hour_sheets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sub_org_id uuid not null references public.organizations (id) on delete restrict,
  number integer not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'approved', 'rejected', 'deemed_approved'
  )),
  submitted_at timestamptz,
  -- Six working days (Werktage, Mon to Sat excluding public holidays)
  -- from submission, computed in code at submit time. § 15 VOB/B.
  deadline_at timestamptz,
  decided_at timestamptz,
  decided_by_person uuid references public.people (id) on delete set null,
  epc_signature_path text,
  note text,
  created_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create index idx_hour_sheets_project_status
  on public.hour_sheets (project_id, status);

create table public.hour_sheet_lines (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.hour_sheets (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  work_date date not null,
  hours numeric(6, 2) not null check (hours > 0),
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_hour_sheet_lines_sheet on public.hour_sheet_lines (sheet_id);

-- ============================================================
-- Module 5: Nachtraege and Abnahme
-- ============================================================

create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  number integer not null,
  title text not null,
  description text,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  decided_at timestamptz,
  decided_by_person uuid references public.people (id) on delete set null,
  created_by_person uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create index idx_change_orders_project on public.change_orders (project_id);

create table public.change_order_photos (
  id uuid primary key default gen_random_uuid(),
  change_order_id uuid not null references public.change_orders (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_change_order_photos_order
  on public.change_order_photos (change_order_id);

create table public.acceptances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null default 'final' check (kind in ('final', 'partial')),
  status text not null default 'draft' check (status in ('draft', 'signed')),
  conducted_at timestamptz,
  epc_signer_name text,
  sub_signer_name text,
  epc_signature_path text,
  sub_signature_path text,
  report_pdf_path text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_acceptances_project on public.acceptances (project_id);

create table public.acceptance_defects (
  id uuid primary key default gen_random_uuid(),
  acceptance_id uuid not null references public.acceptances (id) on delete cascade,
  description text not null,
  photo_path text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'resolved')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_acceptance_defects_acceptance
  on public.acceptance_defects (acceptance_id);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'bautagebuch', 'regiebericht', 'nachtrag', 'abnahmeprotokoll', 'completion_report'
  )),
  language text not null check (language in ('sl', 'de', 'en')),
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index idx_generated_documents_project
  on public.generated_documents (project_id);

-- ============================================================
-- updated_at triggers
-- ============================================================

create trigger set_updated_at before update on public.organizations
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.people
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.projects
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.scope_items
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.daily_entries
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.material_items
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.requests
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.documents
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.hour_sheets
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.hour_sheet_lines
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.change_orders
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.acceptances
  for each row execute function extensions.moddatetime (updated_at);
create trigger set_updated_at before update on public.acceptance_defects
  for each row execute function extensions.moddatetime (updated_at);

-- ============================================================
-- Row level security: enabled everywhere, zero policies.
-- Only the server (service role) can read or write until M1
-- introduces authenticated per-user policies.
-- ============================================================

alter table public.organizations enable row level security;
alter table public.people enable row level security;
alter table public.projects enable row level security;
alter table public.project_tokens enable row level security;
alter table public.invites enable row level security;
alter table public.scope_items enable row level security;
alter table public.daily_entries enable row level security;
alter table public.entry_quantities enable row level security;
alter table public.entry_photos enable row level security;
alter table public.material_items enable row level security;
alter table public.material_checks enable row level security;
alter table public.material_check_items enable row level security;
alter table public.requests enable row level security;
alter table public.activity enable row level security;
alter table public.documents enable row level security;
alter table public.document_reminders enable row level security;
alter table public.hour_sheets enable row level security;
alter table public.hour_sheet_lines enable row level security;
alter table public.change_orders enable row level security;
alter table public.change_order_photos enable row level security;
alter table public.acceptances enable row level security;
alter table public.acceptance_defects enable row level security;
alter table public.generated_documents enable row level security;
