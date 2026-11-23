-- Σήμερα: κάρτα «Γύρισμα χωρίς σενάριο» (filming_no_script). Μία γραμμή ανά Γύρισμα μελλοντικό μέσα στις επόμενες
-- 3 μέρες (starts_at > now και ≤ now + 3 μέρες), ανοιχτό (pending/scheduled), χωρίς λήψεις: δεν έχει Δελτίο
-- γυρίσματος (filming_sheets) ή το Δελτίο του έχει κενό shots. Επείγον αν είναι σε ≤ 2 μέρες (ώρα Αθήνας).
-- Ορατότητα: όπως το Δελτίο (authz.can_crew_filming, δικαίωμα filming.crew): όλα, ή όσα έχει ως Ιδιοκτήτης ή Μέλος
-- την Παραγωγή ή ως μέλος του Συνεργείου του Γυρίσματος.

create function authz.today_no_script_rows(p_uid uuid, p_now timestamptz)
returns table (id uuid, title text, subtitle text, starts_at timestamptz, urgent boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_scope text := authz.user_scope(p_uid, 'filming.crew');
  v_today date := (p_now at time zone 'Europe/Athens')::date;
begin
  return query
    select f.id, p.title,
           concat_ws(' · ', to_char(f.starts_at at time zone 'Europe/Athens', 'DD/MM HH24:MI'),
                     nullif(concat_ws(', ', c.name, f.location), '')),
           f.starts_at,
           (f.starts_at at time zone 'Europe/Athens')::date - v_today <= 2
      from public.filmings f
      join public.productions p on p.id = f.production_id
      left join public.clients c on c.id = f.client_id
     where f.state in ('pending', 'scheduled')
       and f.starts_at > p_now
       and f.starts_at <= p_now + interval '3 days'
       and not exists (select 1 from public.filming_sheets s
                        where s.filming_id = f.id and jsonb_array_length(s.shots) > 0)
       and (v_scope = 'all'
            or (v_scope = 'mine'
                and (p.owner_id = p_uid
                     or exists (select 1 from public.production_members m where m.production_id = p.id and m.user_id = p_uid)
                     or exists (select 1 from public.filming_crew x where x.filming_id = f.id and x.user_id = p_uid))))
     order by f.starts_at, f.id;
end;
$$;

create function authz.today_count_filming_no_script(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.crew') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_no_script_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_filming_no_script(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.crew') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'title', r.title, 'subtitle', r.subtitle,
             'at', r.starts_at, 'urgent', r.urgent, 'link', '/app/filming/' || r.id)
           order by r.starts_at, r.id)
      from (select * from authz.today_no_script_rows(p_uid, p_now) x order by x.starts_at, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('filming_no_script', 'week', 'action', 'team', 515, 'Γύρισμα χωρίς σενάριο', 'Filming without a script', '/app/filming',
   'authz.today_count_filming_no_script(uuid, uuid, timestamptz)', 'authz.today_items_filming_no_script(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_no_script_rows(uuid, timestamptz),
  authz.today_count_filming_no_script(uuid, uuid, timestamptz), authz.today_items_filming_no_script(uuid, uuid, timestamptz)
  from public, anon, authenticated;
