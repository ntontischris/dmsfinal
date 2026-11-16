-- Γυρίσματα: ο Πίνακας της E1 (Kanban) δείχνει τον τόπο στην κάρτα και φιλτράρει «Ποιος πάει».
-- Η γραμμή της λίστας φέρνει πια τον τόπο και τα άτομα του Συνεργείου (μόνο σε όποιον βλέπει Συνεργείο).
-- Τα δικαιώματα της συνάρτησης μένουν ως έχουν (create or replace).

create or replace function authz.filming_row(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id,
    'startsAt', f.starts_at,
    'hours', f.hours,
    'state', f.state,
    'location', f.location,
    'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
    'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
    'crew', case when authz.can_see_crew(f.id) then jsonb_build_object(
        'confirmed', (select count(*) from public.filming_crew c where c.filming_id = f.id and c.response = 'confirmed'),
        'total', (select count(*) from public.filming_crew c where c.filming_id = f.id),
        'userIds', (select coalesce(jsonb_agg(c.user_id order by c.user_id), '[]'::jsonb)
                      from public.filming_crew c where c.filming_id = f.id)) end,
    'signals', authz.filming_signals(f.id, authz.can_see_crew(f.id))
  )
  from public.filmings f
  where f.id = p_filming;
$$;
