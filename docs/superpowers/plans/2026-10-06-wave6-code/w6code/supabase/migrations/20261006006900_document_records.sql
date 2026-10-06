-- Task 6.9: public authenticity records for stored documents.
--
-- Every STORED document (naročilnica, its accepted copy, Zapisnik o prevzemu,
-- račun, zaključno poročilo) gets one row here BEFORE it is rendered, so the
-- PDF can print a QR to /<locale>/v/<id>. After the bytes are stored, the row
-- is sealed with their sha256 and storage path, once.
--
-- The public page shows ONLY: kind, issuer name, date, status, sha256. No
-- project, no amounts, no people. RLS on with no policies, like every table
-- here: the server reads it with the service role behind its own checks.
--
-- source_id is polymorphic (purchase_orders, acceptances, invoices or
-- generated_documents), so it carries no foreign key; a deleted source shows
-- as "no longer available" rather than breaking the page.

create table public.document_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'narocilnica', 'narocilnica_sprejem', 'zapisnik_prevzem', 'racun', 'zakljucno_porocilo'
  )),
  source_id uuid not null,
  issuer_org_id uuid references public.organizations (id) on delete set null,
  -- A snapshot: the record keeps saying who issued it if the company is renamed.
  issuer_name text not null,
  language text not null check (language in ('sl', 'de', 'en')),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text,
  created_at timestamptz not null default now(),
  sealed_at timestamptz
);

create index idx_document_records_source on public.document_records (source_id);
create index idx_document_records_project on public.document_records (project_id);

alter table public.document_records enable row level security;
revoke all on public.document_records from anon, authenticated;

-- Write once: a sealed record can never change its hash or its path.
create or replace function public.document_records_seal_once()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.sha256 is not null
     and (new.sha256 is distinct from old.sha256 or new.storage_path is distinct from old.storage_path) then
    raise exception 'document record % is sealed', old.id;
  end if;
  return new;
end;
$$;

create trigger trg_document_records_seal_once
  before update on public.document_records
  for each row execute function public.document_records_seal_once();

revoke execute on function public.document_records_seal_once() from public, anon, authenticated;
