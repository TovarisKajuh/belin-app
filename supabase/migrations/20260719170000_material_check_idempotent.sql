-- Stückliste hardening, 2026-07-19, from four adversarial review passes on the
-- PoC plan. Four fixes to submit_material_check plus one to submit_daily_report:
--
-- 1. Idempotency. The material check retry UX reuses the daily report's stable
--    draft id, so the RPC must upsert on it. Without this, a lost-response retry
--    creates a duplicate check.
-- 2. The conflict update must NOT reassign checked_at. Reads take the latest
--    check by checked_at desc; if a stale retry bumped checked_at to now() it
--    could resurrect an old "all present" check as the newest record and erase
--    a shortfall attested in between.
-- 3. Derived completeness. is_complete is computed here from the item statuses,
--    never accepted from the client. A hand-rolled request could otherwise store
--    "complete" alongside honest shortfall lines.
-- 4. Path binding. Document paths are validated against the full
--    project/material/clientId/ prefix, so a check can only reference its own
--    uploads, not another check's files or a daily-report photo.
-- 5. Cross-project upsert guard, applied to BOTH RPCs: a client id collision
--    from another project must update nothing and raise, not silently repoint a
--    foreign project's row.

alter table public.material_checks add column client_generated_id uuid unique;

-- The old six-arg signature must be dropped, not overloaded: an overload makes
-- the PostgREST RPC call ambiguous.
drop function public.submit_material_check(uuid, boolean, text, jsonb, text[], text[]);

create or replace function public.submit_material_check(
  p_project uuid,
  p_client_id uuid,
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
  v_prefix text := p_project::text || '/material/' || p_client_id::text || '/';
  v_shortfall integer := 0;
  v_item_count integer := 0;
begin
  select coalesce(array_agg(id), '{}') into v_valid
  from public.material_items where project_id = p_project;

  -- Upsert on the draft id. The conflict update deliberately leaves checked_at
  -- untouched (see header point 2) and is guarded on project (point 5): a
  -- collision from another project updates nothing, v_check stays null, and the
  -- raise below fires instead of corrupting a foreign row.
  insert into public.material_checks (project_id, client_generated_id, is_complete, note)
  values (p_project, p_client_id, false, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (client_generated_id) do update
    set note = excluded.note
    where material_checks.project_id = excluded.project_id
  returning id into v_check;

  if v_check is null then
    raise exception 'material check client id % conflicts with another project', p_client_id;
  end if;

  -- Replace children idempotently, like the daily report.
  delete from public.material_check_items where check_id = v_check;
  delete from public.material_check_docs where check_id = v_check;

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

      v_item_count := v_item_count + 1;
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
        raise exception 'document path % is not in %', v_path, v_prefix;
      end if;
      insert into public.material_check_docs (check_id, kind, storage_path, sort_order)
      values (v_check, 'material_photo', v_path, i - 1);
    end loop;
  end if;

  if p_delivery_notes is not null then
    for i in 1 .. coalesce(array_length(p_delivery_notes, 1), 0) loop
      v_path := p_delivery_notes[i];
      if v_path is null or left(v_path, length(v_prefix)) <> v_prefix then
        raise exception 'document path % is not in %', v_path, v_prefix;
      end if;
      insert into public.material_check_docs (check_id, kind, storage_path, sort_order)
      values (v_check, 'delivery_note', v_path, i - 1);
    end loop;
  end if;

  -- Completeness is derived, never trusted from the client. An empty check
  -- (the "material not arrived yet" escape) is never complete.
  update public.material_checks
    set is_complete = (v_item_count > 0 and v_shortfall = 0)
    where id = v_check;

  insert into public.activity (project_id, kind, payload)
  values (p_project, 'material_check_completed',
          jsonb_build_object(
            'complete', (v_item_count > 0 and v_shortfall = 0),
            'shortfall', v_shortfall,
            'photos', coalesce(array_length(p_material_photos, 1), 0),
            'notes', coalesce(array_length(p_delivery_notes, 1), 0)
          ));

  return v_check;
end;
$$;

-- The daily report RPC carries the same cross-project upsert flaw the review
-- found in the material check: a colliding client id from another project would
-- repoint and overwrite a foreign entry. Add the same project guard.
create or replace function public.submit_daily_report(
  p_project uuid,
  p_entry_date date,
  p_note text,
  p_headcount integer,
  p_weather jsonb,
  p_client_id uuid,
  p_quantities jsonb,
  p_photo_paths text[]
) returns uuid
language plpgsql
as $$
declare
  v_entry uuid;
  v_item jsonb;
  v_scope uuid;
  v_qty numeric;
  v_path text;
  v_valid uuid[];
  v_prefix text := p_project::text || '/';
begin
  select coalesce(array_agg(id), '{}') into v_valid
  from public.scope_items where project_id = p_project;

  insert into public.daily_entries
    (project_id, entry_date, note, headcount, weather, client_generated_id)
  values
    (p_project, p_entry_date, nullif(btrim(coalesce(p_note, '')), ''), p_headcount, p_weather, p_client_id)
  on conflict (client_generated_id) do update
    set note = excluded.note,
        headcount = excluded.headcount,
        weather = excluded.weather,
        entry_date = excluded.entry_date
    where daily_entries.project_id = excluded.project_id
  returning id into v_entry;

  if v_entry is null then
    raise exception 'daily entry client id % conflicts with another project', p_client_id;
  end if;

  delete from public.entry_quantities where entry_id = v_entry;
  if p_quantities is not null then
    for v_item in select * from jsonb_array_elements(p_quantities) loop
      v_scope := (v_item->>'scope_item_id')::uuid;
      v_qty := (v_item->>'qty')::numeric;
      if v_qty > 0 then
        if not (v_scope = any(v_valid)) then
          raise exception 'scope_item % does not belong to project %', v_scope, p_project;
        end if;
        insert into public.entry_quantities (entry_id, scope_item_id, qty)
        values (v_entry, v_scope, v_qty);
      end if;
    end loop;
  end if;

  delete from public.entry_photos where entry_id = v_entry;
  if p_photo_paths is not null then
    for i in 1 .. array_length(p_photo_paths, 1) loop
      v_path := p_photo_paths[i];
      if v_path is null or left(v_path, length(v_prefix)) <> v_prefix then
        raise exception 'photo path % is not in project %', v_path, p_project;
      end if;
      insert into public.entry_photos (entry_id, storage_path, sort_order)
      values (v_entry, v_path, i - 1);
    end loop;
  end if;

  insert into public.activity (project_id, kind, payload)
  values (p_project, 'entry_submitted',
          jsonb_build_object('headcount', p_headcount,
                             'photos', coalesce(array_length(p_photo_paths, 1), 0)));

  return v_entry;
end;
$$;
