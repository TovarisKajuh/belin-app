-- Fix a latent bug in submit_daily_report exposed during live-sync testing: a
-- report submitted with zero photos sends an empty array (not null), and
-- array_length('{}', 1) is NULL, so `for i in 1 .. NULL` raises
-- "upper bound of FOR loop cannot be null" (SQLSTATE 22004). The empty-photo
-- path had simply never been exercised. Coalesce the bound to 0, matching the
-- pattern already used in submit_material_check.
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
    for i in 1 .. coalesce(array_length(p_photo_paths, 1), 0) loop
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
