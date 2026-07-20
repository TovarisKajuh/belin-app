-- The wizard's commit step, as one transaction.
--
-- Creating a project from a reviewed plan writes a project, its access tokens,
-- every material line and the backfill onto plan_imports. A partial write here
-- leaves an EPC looking at a project whose material list silently lost rows, so
-- it follows the same rule as submit_daily_report and submit_material_check:
-- one function, all or nothing, client identifiers validated server side.

create or replace function public.create_project_from_review(
  p_import_id uuid,
  p_epc_org_id uuid,
  p_sub_org_id uuid,
  p_project jsonb,
  p_items jsonb,
  p_epc_token text,
  p_sub_token text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_import record;
  v_item jsonb;
  v_idx integer := 0;
  v_country text;
  v_language text;
begin
  -- Country and language are lowercased and checked here rather than left to
  -- the table constraint, so a bad value reads as a named error instead of a
  -- raw check violation. The wizard offers only valid choices, so this fires
  -- only for a hand rolled request.
  v_country := lower(coalesce(nullif(trim(p_project->>'country'), ''), 'si'));
  if v_country not in ('de','at','si') then
    raise exception 'country must be de, at or si';
  end if;

  v_language := lower(coalesce(nullif(trim(p_project->>'language'), ''), 'sl'));
  if v_language not in ('sl','de','en') then
    raise exception 'language must be sl, de or en';
  end if;

  -- The import must exist, be under review, and not already have produced a
  -- project. This is what stops a double submit from creating twin projects.
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

  -- A sub org must actually be a sub. Never trust the client's pick.
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

  -- A sub token is minted only when a sub is attached: a token that resolves to
  -- no sub organization would produce an actor with no org.
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

  update plan_imports
    set project_id = v_project_id, status = 'committed'
    where id = p_import_id;

  -- Deliberately no activity row: the feed records things that happen TO a
  -- project, and creation is already carried by projects.created_at. Adding a
  -- project_created kind would mean widening activity_kind_check and giving the
  -- dashboard a label to render for it, for no information gain.

  return v_project_id;
end;
$$;
