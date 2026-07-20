-- M1: accounts and settings.
-- Org settings that carry money meaning (vat_id, iban, accountant_email), a
-- per-person notification preference bag, a per-project VAT mode, and the two
-- tables behind magic-link login: single-use login tokens and revocable
-- sessions. Both store only a sha256 hash of the raw token, never the token.
-- RLS on with no policies, matching the repo architecture: all access goes
-- through the service-role client behind the Actor seam.

alter table public.organizations
  add column vat_id text,
  add column iban text,
  add column accountant_email text,
  add column logo_path text;

alter table public.people
  add column notification_prefs jsonb not null default '{}'::jsonb;

-- Case-insensitive uniqueness: login looks people up by lowercased email, so
-- two rows differing only in case would make the lookup ambiguous.
create unique index idx_people_email_unique
  on public.people (lower(email)) where email is not null;

alter table public.projects
  add column vat_mode text check (vat_mode in ('reverse_charge','standard'));

create table public.login_tokens (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_login_tokens_person on public.login_tokens(person_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_sessions_person on public.sessions(person_id);

alter table public.login_tokens enable row level security;
alter table public.sessions enable row level security;
