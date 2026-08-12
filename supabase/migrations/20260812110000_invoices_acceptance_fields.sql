-- Invoices, and the acceptance fields the protocol needs (Task 12).
--
-- The invoices table carries SNAPSHOTS of both parties rather than joins. An
-- invoice is a legal record of what was true when it was issued: if a company
-- later changes its address or its VAT id, the invoice must keep saying what it
-- said, because that is the document the tax authority holds.

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: an issued invoice outlives its project. Deleting a
  -- project must never silently destroy the record of money that was billed.
  project_id uuid not null references public.projects(id) on delete restrict,
  sub_org_id uuid not null references public.organizations(id) on delete restrict,
  number text not null,
  status text not null default 'draft' check (status in ('draft','final')),
  issue_date date not null,
  service_start date,
  service_end date,
  vat_mode text not null check (vat_mode in ('reverse_charge','standard')),
  vat_rate numeric(4,2),
  reverse_charge_note text,
  supplier jsonb not null,
  customer jsonb not null,
  lines jsonb not null,
  total_net numeric(12,2) not null,
  total_vat numeric(12,2),
  total_gross numeric(12,2) not null,
  due_date date,
  iban text,
  pdf_path text,
  accountant_email text,
  sent_to_accountant_at timestamptz,
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (sub_org_id, number),

  -- The database guarantee behind the reverse charge rule. Printing VAT on a
  -- reverse charge invoice creates a real liability for the issuer under § 14c
  -- UStG: they owe the tax they wrongly showed. Making the shape impossible to
  -- store is stronger than remembering not to render it.
  constraint invoices_vat_shape check (
    (vat_mode = 'reverse_charge' and vat_rate is null and total_vat is null)
    or
    (vat_mode = 'standard' and vat_rate is not null and total_vat is not null)
  )
);
create index idx_invoices_project on public.invoices(project_id);

-- One invoice per project in v1. Generating twice would mint two legal
-- documents for the same work, and the second one is always the accident.
-- Abschlagsrechnung (partial invoicing) relaxes this deliberately, later.
create unique index idx_invoices_project_single on public.invoices(project_id);

-- The acceptance protocol needs somewhere to keep what the parties agreed:
-- who attended, what was declared, whether the penalty was reserved, and when
-- the warranty starts. Without these the flow had nowhere to persist between
-- steps, which is exactly when a dropped connection on a roof loses the record.
alter table public.acceptances
  add column attendees text,
  add column declaration text
    check (declaration in ('accepted','with_reservations','refused')),
  add column penalty_reserved boolean not null default false,
  add column warranty_start date;

-- A defect is either agreed or disputed, and the difference is the whole point
-- of writing it down: an agreed defect is a task, a disputed one is a warning.
alter table public.acceptance_defects
  add column agreement text not null default 'agreed'
    check (agreement in ('agreed','disputed'));

alter table public.invoices enable row level security;
