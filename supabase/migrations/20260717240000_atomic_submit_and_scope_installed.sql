-- Atomic, validated daily-report submission. One transaction: validates that
-- every scope item and photo path belongs to the project, then upserts the
-- entry and replaces its quantities and photos idempotently, and logs activity.
-- Fixes audit findings H1 (input validation), H2 (atomicity), M12 (idempotent photos).
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
  returning id into v_entry;

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

-- Grouped progress aggregate: one row per scope item regardless of history
-- depth, computed in Postgres instead of scanning all quantities in Node.
-- Fixes audit finding H6.
create or replace function public.scope_installed(p_project uuid)
returns table (scope_item_id uuid, installed numeric)
language sql
stable
as $$
  select eq.scope_item_id, sum(eq.qty)
  from public.entry_quantities eq
  join public.daily_entries de on de.id = eq.entry_id
  where de.project_id = p_project
  group by eq.scope_item_id
$$;

-- Supports "latest material check" lookups for the phase 1b Stueckliste gate
-- (audit finding M13, history-log model taken as the default).
create index if not exists idx_material_checks_project_checked
  on public.material_checks (project_id, checked_at desc);
