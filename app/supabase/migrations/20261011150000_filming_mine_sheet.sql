-- Τα Γυρίσματά μου (#136, C2γ): η τρέχουσα έκδοση του Δελτίου και η έκδοση της απάντησης του μέλους.
-- Προσθήκη δύο κλειδιών στο filming_mine_view (το υπόλοιπο σώμα όπως στο 20261009210000). Η βάση δεν αλλάζει άλλα.

create or replace function public.filming_mine_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'location', f.location, 'state', f.state,
        'note', f.internal_note, 'myResponse', c.response, 'myReason', c.reason,
        'myVersion', c.version,
        'sheetVersion', (select max(v.version) from public.filming_sheet_versions v where v.filming_id = f.id),
        'production', jsonb_build_object('id', pr.id, 'title', pr.title),
        'client', (select jsonb_build_object('id', cl.id, 'name', cl.name) from public.clients cl where cl.id = f.client_id)
      ) order by f.starts_at, f.id)
      from public.filming_crew c
      join public.filmings f on f.id = c.filming_id
      join public.productions pr on pr.id = f.production_id
     where c.user_id = auth.uid() and f.state in ('pending', 'scheduled')
  ), '[]'::jsonb);
end;
$$;
