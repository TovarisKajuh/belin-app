-- Self-serve EPC signup (demo-day plan 2026-10-06, Task 4.1).
--
-- A stranger asks for an account, we email a link, and only the click on that
-- link creates anything in organizations and people (decision D4). Until then
-- the request lives here, where an abandoned one costs one row that is pruned
-- after ten days instead of a fake customer in the shared database.
--
-- The raw confirmation token is only ever in the email. This table holds its
-- sha256, the same rule as login_tokens and sessions: a leaked table cannot be
-- replayed as an account.
--
-- Service role only: RLS on, no policies, and the anon and authenticated roles
-- lose even their default grants. The browser never reads this table.

alter table public.organizations
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  -- Stored lowercased by the server, enforced here, so rate limits and the
  -- duplicate check can use plain equality.
  email text not null check (email = lower(email) and char_length(email) between 3 and 254),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text check (phone is null or char_length(phone) <= 40),
  company_name text not null check (char_length(company_name) between 1 and 200),
  vat_id text check (vat_id is null or char_length(vat_id) <= 20),
  country text not null check (country in ('si', 'at', 'de')),
  address text check (address is null or char_length(address) <= 300),
  locale text check (locale is null or locale in ('sl', 'de', 'en')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  -- Set null rather than cascade: deleting a test organization must not be
  -- blocked by its signup row, and scripts/admin/delete-org.mjs removes the
  -- row explicitly anyway.
  org_id uuid references public.organizations (id) on delete set null,
  terms_version text not null,
  consent_at timestamptz not null,
  -- HMAC of the client IP with a server secret, never the IP itself. Only for
  -- the per-IP rate limit.
  ip_hash text,
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index idx_signups_email_created on public.signups (email, created_at desc);
create index idx_signups_ip_created on public.signups (ip_hash, created_at desc) where ip_hash is not null;
create index idx_signups_org on public.signups (org_id) where org_id is not null;

alter table public.signups enable row level security;
revoke all on table public.signups from anon, authenticated;

-- Turns a confirmed signup into an EPC organization and its first admin, in one
-- transaction. The row is locked FOR UPDATE, so two clicks on the same link
-- cannot both create a company: the second waits, then finds it consumed.
create or replace function public.complete_epc_signup(p_token_hash text)
returns table (org_id uuid, person_id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
#variable_conflict use_column
declare
  v_signup public.signups%rowtype;
  v_org_id uuid;
  v_person_id uuid;
begin
  if p_token_hash is null or char_length(p_token_hash) <> 64 then
    raise exception 'signup.invalid';
  end if;

  select * into v_signup
    from public.signups s
    where s.token_hash = p_token_hash
    for update;

  if not found then
    raise exception 'signup.invalid';
  end if;
  if v_signup.consumed_at is not null then
    raise exception 'signup.used';
  end if;
  if v_signup.expires_at <= now() then
    raise exception 'signup.expired';
  end if;
  if exists (select 1 from public.people p where lower(p.email) = v_signup.email) then
    raise exception 'signup.emailTaken';
  end if;

  begin
    insert into public.organizations (
      type, name, country, address, vat_id, contact_email, contact_phone,
      is_demo, terms_accepted_at, terms_version
    ) values (
      'epc', v_signup.company_name, v_signup.country, v_signup.address, v_signup.vat_id,
      v_signup.email, v_signup.phone,
      false, v_signup.consent_at, v_signup.terms_version
    ) returning id into v_org_id;

    insert into public.people (org_id, full_name, email, phone, role)
    values (v_org_id, v_signup.full_name, v_signup.email, v_signup.phone, 'admin')
    returning id into v_person_id;
  exception when unique_violation then
    -- An invite accepted with the same address in the same instant: the
    -- people email index (lower(email)) caught what the check above could not.
    raise exception 'signup.emailTaken';
  end;

  update public.signups s
    set consumed_at = now(), org_id = v_org_id
    where s.id = v_signup.id;

  return query select v_org_id, v_person_id;
end;
$function$;

revoke execute on function public.complete_epc_signup(text) from public, anon, authenticated;
grant execute on function public.complete_epc_signup(text) to service_role;
