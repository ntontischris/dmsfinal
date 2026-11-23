-- Σήμερα: κάρτα «Κάμερα σε επισκευή» (equipment_repair). Μία γραμμή ανά (Γύρισμα, αντικείμενο Εξοπλισμού) όπου
-- το αντικείμενο είναι in_repair και δεσμευμένο σε Γύρισμα που θα γίνει στις επόμενες 7 μέρες (starts_at > now και
-- ≤ now + 7 μέρες). Το Γύρισμα είναι pending ή scheduled, όπως στο filming_no_script. Ταξινόμηση: η ώρα έναρξης, μετά id.
-- Επείγον αν το Γύρισμα είναι σε ≤ 1 μέρα (ώρα Αθήνας, authz.today_work_day). Υπότιτλος: μέρα/ώρα · λόγος επισκευής.
-- Σύνδεσμος: το Γύρισμα. Id γραμμής: «filming_id:item_id».
-- Ορατότητα: μιμείται ακριβώς το δικαίωμα που ελέγχει η αλλαγή Εξοπλισμού Γυρίσματος (public.filming_equipment_set →
-- authz.can_reserve_for_filming → authz.scope_covers_filming('equipment.reserve')): ο Χρήστης πρέπει να έχει
-- equipment.reserve με Εύρος «όλα» ή, με «όσα με αφορούν», να είναι Ιδιοκτήτης/Μέλος της Παραγωγής ή μέλος του Συνεργείου
-- του Γυρίσματος (authz.is_filming_participant). Χωρίς το δικαίωμα: count null, items 42501.

create function authz.today_equipment_repair_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, starts_at timestamptz, urgent boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_scope text := authz.user_scope(p_uid, 'equipment.reserve');
  v_today date := authz.today_work_day(p_now);
begin
  return query
    select fe.filming_id::text || ':' || fe.item_id::text,
           i.name,
           concat_ws(' · ', to_char(f.starts_at at time zone 'Europe/Athens', 'DD/MM HH24:MI'),
                     nullif(trim(i.status_note), '')),
           f.starts_at,
           authz.today_work_day(f.starts_at) - v_today <= 1
      from public.filming_equipment fe
      join public.filmings f on f.id = fe.filming_id
      join public.equipment_items i on i.id = fe.item_id
      join public.productions p on p.id = f.production_id
     where i.status = 'in_repair'
       and f.state in ('pending', 'scheduled')
       and f.starts_at > p_now
       and f.starts_at <= p_now + interval '7 days'
       and (v_scope = 'all'
            or (v_scope = 'mine'
                and (p.owner_id = p_uid
                     or exists (select 1 from public.production_members m where m.production_id = p.id and m.user_id = p_uid)
                     or exists (select 1 from public.filming_crew x where x.filming_id = f.id and x.user_id = p_uid))))
     order by f.starts_at, fe.filming_id, fe.item_id;
end;
$$;

create function authz.today_count_equipment_repair(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'equipment.reserve') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_equipment_repair_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_equipment_repair(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'equipment.reserve') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'title', r.title, 'subtitle', r.subtitle,
             'at', r.starts_at, 'urgent', r.urgent, 'link', '/app/filming/' || split_part(r.id, ':', 1))
           order by r.starts_at, r.id)
      from (select * from authz.today_equipment_repair_rows(p_uid, p_now) x
             order by x.starts_at, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('equipment_repair', 'week', 'action', 'team', 516, 'Κάμερα σε επισκευή', 'Camera in repair', '/app/filming',
   'authz.today_count_equipment_repair(uuid, uuid, timestamptz)', 'authz.today_items_equipment_repair(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_equipment_repair_rows(uuid, timestamptz),
  authz.today_count_equipment_repair(uuid, uuid, timestamptz), authz.today_items_equipment_repair(uuid, uuid, timestamptz)
  from public, anon, authenticated;
