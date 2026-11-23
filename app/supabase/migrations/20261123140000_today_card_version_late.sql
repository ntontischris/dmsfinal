-- Σήμερα: κάρτα «Αργεί η Έκδοση» (version_late). Μία γραμμή ανά Παραδοτέο με υπεύθυνο άλλον από τον Χρήστη, μη ακυρωμένο,
-- μη εγκεκριμένο, με προθεσμία έως αύριο (ώρα Αθήνας) και χωρίς Έκδοση μετά την ανάθεσή του.
-- Ανάθεση = η τελευταία γραμμή του ίχνους (audit_log) που έβαλε τον τρέχοντα υπεύθυνο· αλλιώς η created_at του Παραδοτέου.
-- Ορατότητα: η ίδια με την ουρά των Παραδοτέων (deliverables.work): όλα, ή όσα έχουν ως Ιδιοκτήτη ή Μέλος την Παραγωγή.
-- Ο υπεύθυνος δεν βλέπει τη δική του καθυστέρηση.
-- Επείγον: κανόνας 5 (προθεσμία σε έως 1 μέρα ή περασμένη)· με αυτό το παράθυρο, όλες οι γραμμές είναι επείγουσες.

create function authz.today_late_rows(p_uid uuid, p_now timestamptz)
returns table (id uuid, title text, assignee text, deadline date)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_scope text := authz.user_scope(p_uid, 'deliverables.work');
  v_limit date := authz.today_work_day(p_now) + 1;
begin
  return query
    select d.id, d.title, u.name, d.deadline
      from public.deliverables d
      join public.productions p on p.id = d.production_id
      join public.team_users u on u.user_id = d.assignee_id
      cross join lateral (
        select coalesce((
                 select a.at
                   from public.audit_log a
                  where a.entity = 'deliverables'
                    and a.entity_id = d.id::text
                    and a.after ->> 'assignee_id' = d.assignee_id::text
                    and (a.before is null or a.before ->> 'assignee_id' is distinct from d.assignee_id::text)
                  order by a.at desc, a.id desc
                  limit 1), d.created_at) as assigned_at
      ) s
     where d.assignee_id is not null
       and d.assignee_id <> p_uid
       and p.state = 'open'
       and d.cancelled_at is null
       and d.approved_at is null
       and d.deadline <= v_limit
       and (v_scope = 'all'
            or (v_scope = 'mine' and (p.owner_id = p_uid
                 or exists (select 1 from public.production_members m
                             where m.production_id = p.id and m.user_id = p_uid))))
       and not exists (select 1 from public.deliverable_versions v
                        where v.deliverable_id = d.id and v.created_at >= s.assigned_at)
     order by d.deadline, d.id;
end;
$$;

create function authz.today_count_version_late(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'deliverables.work') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_late_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_version_late(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := authz.today_work_day(p_now);
begin
  if p_client is not null or authz.user_scope(p_uid, 'deliverables.work') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'title', r.title,
             'subtitle', 'Υπεύθυνος: ' || r.assignee,
             'at', authz.today_work_day_at(r.deadline), 'urgent', r.deadline <= v_today + 1,
             'link', '/app/deliverables/' || r.id)
           order by r.deadline, r.id)
      from (select * from authz.today_late_rows(p_uid, p_now) x
             order by x.deadline, x.id
             limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn, needs_second_person) values
  ('version_late', 'decide', 'action', 'team', 127, 'Αργεί η Έκδοση', 'Version is late', '/app/deliverables',
   'authz.today_count_version_late(uuid, uuid, timestamptz)', 'authz.today_items_version_late(uuid, uuid, timestamptz)', true);

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_late_rows(uuid, timestamptz),
  authz.today_count_version_late(uuid, uuid, timestamptz), authz.today_items_version_late(uuid, uuid, timestamptz)
  from public, anon, authenticated;
