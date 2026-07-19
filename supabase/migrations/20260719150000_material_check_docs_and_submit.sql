-- Stückliste (material check), founder spec 2026-07-19.
--
-- Product model: one living material list per project. The EPC owns the list,
-- the sub checks it off on delivery, and whenever the EPC adds or changes an
-- item the sub is prompted to check again. Latest check wins, which settles
-- audit finding M13 (the table was an append log with nothing marking the
-- current check).
--
-- Each check carries two kinds of document, both of which the founder named as
-- required from field practice: a photo of the delivered material, and the
-- delivery note (dobavnica / prevzemni list). Modelled as one table with a
-- kind column rather than two path columns, because a real delivery arrives on
-- several pallets with several notes and two columns would cap it at one each.

create table public.material_check_docs (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.material_checks (id) on delete cascade,
  kind text not null check (kind in ('material_photo', 'delivery_note')),
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_material_check_docs_check on public.material_check_docs (check_id);

-- Reads always ask for the most recent check, so index for exactly that.
create index idx_material_checks_project_latest
  on public.material_checks (project_id, checked_at desc);

-- Atomic, validated submit, mirroring submit_daily_report. A legal-evidence
-- app must not trust client-supplied item ids or storage paths, and must not
-- leave a check row without its items and documents on a partial failure
-- (audit findings H1 and H2).
create or replace function public.submit_material_check(
  p_project uuid,
  p_is_complete boolean,
  p_note text,
  p_items jsonb,
  p_material_photos text[],
  p_delivery_notes text[]
) returns uuid
language plpgsql
as $$
declare
  v_check uuid;
  v_item jsonb;
  v_material uuid;
  v_status text;
  v_missing numeric;
  v_path text;
  v_valid uuid[];
  v_prefix text := p_project::text || '/';
  v_shortfall integer := 0;
begin
  select coalesce(array_agg(id), '{}') into v_valid
  from public.material_items where project_id = p_project;

  insert into public.material_checks (project_id, is_complete, note)
  values (p_project, p_is_complete, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_check;

  if p_items is not null then
    for v_item in select * from jsonb_array_elements(p_items) loop
      v_material := (v_item->>'material_item_id')::uuid;
      v_status := v_item->>'status';
      v_missing := nullif(v_item->>'missing_qty', '')::numeric;

      if not (v_material = any(v_valid)) then
        raise exception 'material_item % does not belong to project %', v_material, p_project;
      end if;
      if v_status is null or v_status not in ('present', 'partial', 'missing') then
        raise exception 'invalid material status %', v_status;
      end if;
      if v_status <> 'present' then
        v_shortfall := v_shortfall + 1;
      end if;

      insert into public.material_check_items (check_id, material_item_id, status, missing_qty)
      values (v_check, v_material, v_status,
              case when v_status = 'present' then null else v_missing end);
    end loop;
  end if;

  if p_material_photos is not null then
    for i in 1 .. coalesce(array_length(p_material_photos, 1), 0) loop
      v_path := p_material_photos[i];
      if v_path is null or left(v_path, length(v_prefix)) <> v_prefix then
        raise exception 'document path % is not in project %', v_path, p_project;
      end if;
      insert into public.material_check_docs (check_id, kind, storage_path, sort_order)
      values (v_check, 'material_photo', v_path, i - 1);
    end loop;
  end if;

  if p_delivery_notes is not null then
    for i in 1 .. coalesce(array_length(p_delivery_notes, 1), 0) loop
      v_path := p_delivery_notes[i];
      if v_path is null or left(v_path, length(v_prefix)) <> v_prefix then
        raise exception 'document path % is not in project %', v_path, p_project;
      end if;
      insert into public.material_check_docs (check_id, kind, storage_path, sort_order)
      values (v_check, 'delivery_note', v_path, i - 1);
    end loop;
  end if;

  -- The EPC is notified through the activity feed either way: a complete
  -- delivery is as worth knowing as a short one.
  insert into public.activity (project_id, kind, payload)
  values (p_project, 'material_check_completed',
          jsonb_build_object(
            'complete', p_is_complete,
            'shortfall', v_shortfall,
            'photos', coalesce(array_length(p_material_photos, 1), 0),
            'notes', coalesce(array_length(p_delivery_notes, 1), 0)
          ));

  return v_check;
end;
$$;
