-- DRIFT REPAIR, not a change.
--
-- On 2026-07-20 the roofs-aware version of create_project_from_review was
-- applied to the database through the Supabase connector but never committed as
-- a migration file, so the repo still held the older seven argument body. The
-- repo is the only thing a future session can safely rebuild from, and anyone
-- doing "create or replace" starting from the stale file would have silently
-- dropped the roofs loop from a live system.
--
-- This file is the deployed definition, pulled back out of the database with
-- pg_get_functiondef and committed verbatim, so that the repo and the database
-- agree again before the next migration edits the function.
--
-- The lesson is recorded so it does not recur: every apply_migration through
-- the connector lands its matching file in the same step.

create or replace function public.create_project_from_review(
  p_import_id uuid,
  p_epc_org_id uuid,
  p_sub_org_id uuid,
  p_project jsonb,
  p_items jsonb,
  p_epc_token text,
  p_sub_token text,
  p_roofs jsonb default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project_id uuid;
  v_import record;
  v_item jsonb;
  v_idx integer := 0;
  v_roof jsonb;
  v_roof_idx integer := 0;
  v_country text;
  v_language text;
begin
  v_country := lower(coalesce(nullif(trim(p_project->>'country'), ''), 'si'));
  if v_country not in ('de','at','si') then
    raise exception 'country must be de, at or si';
  end if;

  v_language := lower(coalesce(nullif(trim(p_project->>'language'), ''), 'sl'));
  if v_language not in ('sl','de','en') then
    raise exception 'language must be sl, de or en';
  end if;

  select * into v_import from plan_imports where id = p_import_id for update;
  if not found then
    raise exception 'plan import not found';
  end if;
  if v_import.status <> 'review' or v_import.project_id is not null then
    raise exception 'plan import already committed';
  end if;

  if p_epc_org_id is null then
    raise exception 'epc org required';
  end if;

  if p_sub_org_id is not null then
    if not exists (select 1 from organizations where id = p_sub_org_id and type = 'sub') then
      raise exception 'sub org invalid';
    end if;
  end if;

  insert into projects (
    epc_org_id, sub_org_id, name, country, language,
    address_street, address_zip, address_city,
    kwp, module_count, module_type, mounting_system, roof_type,
    planned_start, planned_end, plan_pdf_path
  ) values (
    p_epc_org_id,
    p_sub_org_id,
    coalesce(nullif(trim(p_project->>'name'), ''), 'Nov projekt'),
    v_country,
    v_language,
    nullif(trim(coalesce(p_project->>'addressStreet', '')), ''),
    nullif(trim(coalesce(p_project->>'addressZip', '')), ''),
    nullif(trim(coalesce(p_project->>'addressCity', '')), ''),
    (p_project->>'kwp')::numeric,
    (p_project->>'moduleCount')::integer,
    nullif(trim(coalesce(p_project->>'moduleType', '')), ''),
    nullif(trim(coalesce(p_project->>'mountingSystem', '')), ''),
    nullif(trim(coalesce(p_project->>'roofType', '')), ''),
    (p_project->>'plannedStart')::date,
    (p_project->>'plannedEnd')::date,
    v_import.storage_path
  ) returning id into v_project_id;

  insert into project_tokens (project_id, role, token, label)
  values (v_project_id, 'epc', p_epc_token, 'EPC');

  if p_sub_org_id is not null and p_sub_token is not null then
    insert into project_tokens (project_id, role, token, label)
    values (v_project_id, 'sub', p_sub_token, 'Podizvajalec');
  end if;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    for v_item in select * from jsonb_array_elements(p_items) loop
      if coalesce(trim(v_item->>'name'), '') <> '' then
        insert into material_items (project_id, name, qty, unit, sort_order)
        values (
          v_project_id,
          trim(v_item->>'name'),
          coalesce((v_item->>'qty')::numeric, 0),
          coalesce(nullif(trim(coalesce(v_item->>'unit', '')), ''), 'kos'),
          v_idx
        );
        v_idx := v_idx + 1;
      end if;
    end loop;
  end if;

  if p_roofs is not null and jsonb_typeof(p_roofs) = 'array' then
    for v_roof in select * from jsonb_array_elements(p_roofs) loop
      if coalesce(trim(v_roof->>'name'), '') <> '' then
        insert into project_roofs (project_id, name, module_count, kwp, module_type, sort_order)
        values (
          v_project_id,
          trim(v_roof->>'name'),
          (v_roof->>'moduleCount')::integer,
          (v_roof->>'kwp')::numeric,
          nullif(trim(coalesce(v_roof->>'moduleType', '')), ''),
          v_roof_idx
        );
        v_roof_idx := v_roof_idx + 1;
      end if;
    end loop;
  end if;

  update plan_imports
    set project_id = v_project_id, status = 'committed'
    where id = p_import_id;

  return v_project_id;
end;
$function$;
