-- Σήμερα: κάρτα «Βρες αντικαταστάτη» (crew_declined). Μία γραμμή ανά Γύρισμα με δηλωμένη άρνηση μέλους Συνεργείου
-- (filming_crew.response = 'declined'), μελλοντικό (starts_at > now), ανοιχτό (pending/scheduled)· επείγον αν είναι
-- σε ≤ 2 μέρες (ώρα Αθήνας). Ίδιο Δικαίωμα και ορατότητα με την κάρτα «Γυρίσματα των επόμενων 7 ημερών».

create function authz.today_declined_rows(p_uid uuid, p_now timestamptz)
returns table (id uuid, title text, names text, starts_at timestamptz, urgent boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_scope text := authz.user_scope(p_uid, 'filming.view');
  v_today date := (p_now at time zone 'Europe/Athens')::date;
begin
  return query
    select f.id, concat_ws(', ', coalesce(c.name, p.title), f.location),
           string_agg(u.name, ', ' order by lower(u.name)),
           f.starts_at,
           (f.starts_at at time zone 'Europe/Athens')::date - v_today <= 2
      from public.filmings f
      join public.productions p on p.id = f.production_id
      left join public.clients c on c.id = f.client_id
      join public.filming_crew fc on fc.filming_id = f.id and fc.response = 'declined'
      join public.team_users u on u.user_id = fc.user_id
     where f.state in ('pending', 'scheduled')
       and f.starts_at > p_now
       and (v_scope = 'all'
            or (v_scope = 'mine'
                and (p.owner_id = p_uid
                     or exists (select 1 from public.production_members m where m.production_id = p.id and m.user_id = p_uid)
                     -- Ό,τι βλέπει το Συνεργείο (authz.can_see_crew), χωρίς την άρνηση του ίδιου του Χρήστη.
                     or exists (select 1 from public.filming_crew x
                                 where x.filming_id = f.id and x.user_id = p_uid and x.response <> 'declined'))))
     group by f.id, f.starts_at, p.title, c.name, f.location
     order by f.starts_at, f.id;
end;
$$;

create function authz.today_count_crew_declined(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.view') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_declined_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_crew_declined(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.view') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', d.id, 'title', d.title,
             'subtitle', 'Δήλωσε «δεν μπορώ»: ' || d.names,
             'at', d.starts_at, 'urgent', d.urgent, 'link', '/app/filming/' || d.id)
           order by d.starts_at, d.id)
      from (select * from authz.today_declined_rows(p_uid, p_now) x order by x.starts_at, x.id limit authz.today_rows()) d),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn, needs_second_person) values
  ('crew_declined', 'decide', 'action', 'team', 125, 'Βρες αντικαταστάτη', 'Find a replacement', '/app/filming',
   'authz.today_count_crew_declined(uuid, uuid, timestamptz)', 'authz.today_items_crew_declined(uuid, uuid, timestamptz)', true);

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_declined_rows(uuid, timestamptz),
  authz.today_count_crew_declined(uuid, uuid, timestamptz), authz.today_items_crew_declined(uuid, uuid, timestamptz)
  from public, anon, authenticated;
