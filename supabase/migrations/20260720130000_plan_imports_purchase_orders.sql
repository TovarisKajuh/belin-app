-- M2: plan imports, purchase orders, change order amounts, plans bucket xlsx.
-- Parts A and C of the v1 master plan. Applied 2026-07-20.
--
-- RLS is enabled with no policies on every new table, matching every existing
-- table in this schema: nothing is reachable with the anon key, and all app
-- access goes through the server with the service role.

create table public.plan_imports (
  id uuid primary key default gen_random_uuid(),
  -- Nullable on purpose: the wizard is plan FIRST, so the file is parsed before
  -- any project exists. createProjectFromReview backfills this.
  project_id uuid references public.projects(id) on delete cascade,
  source text not null check (source in ('k2_pdf','k2_xlsx')),
  storage_path text not null,
  parsed jsonb not null,
  status text not null default 'review' check (status in ('review','committed','discarded')),
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_plan_imports_project on public.plan_imports(project_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  number integer not null,
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','cancelled')),
  currency text not null default 'EUR',
  total_net numeric(12,2) not null check (total_net >= 0),
  regie_hourly_rate numeric(8,2) check (regie_hourly_rate >= 0),
  payment_terms text,
  deadline date,
  pdf_path text,
  pdf_sha256 text,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by_person uuid references public.people(id) on delete set null,
  accepted_by_name text,
  rejected_at timestamptz,
  rejection_note text,
  created_by_person uuid references public.people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, number)
);
create index idx_purchase_orders_project on public.purchase_orders(project_id);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  description text not null,
  qty numeric(12,2),
  unit text,
  unit_price numeric(12,2),
  total numeric(12,2) not null,
  sort_order integer not null default 0
);
create index idx_po_lines_po on public.purchase_order_lines(purchase_order_id);

alter table public.change_orders add column amount numeric(12,2) check (amount >= 0);

-- The plans bucket allowed only application/pdf. The wizard accepts the K2
-- Excel export too, and three of the five sample reports carry no article list
-- in the PDF at all, so xlsx is a common path rather than an exotic one.
update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  where id = 'plans';

alter table public.plan_imports enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
