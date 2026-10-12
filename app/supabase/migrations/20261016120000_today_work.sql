-- Σήμερα Σγ (#182): οι κάρτες «Η δουλειά μου» (ομάδα work, sort 200–299). Ακολουθούν τη σύμβαση του 20261016100000_today.sql.
--
--  • Κάθε κάρτα έχει το Δικαίωμα και το Εύρος της σελίδας-ουράς της, με τον ίδιο κανόνα ορατότητας που έχει το RPC της ουράς.
--    Οι κανόνες εδώ είναι γραμμένοι για δοσμένο Χρήστη (p_uid) και όχι για τον auth.uid(), όπως το authz.today_sees_client:
--      my_deliverables       H1 «Για μένα»       deliverables.work    ίδιο με το deliverables_queue_view('mine')
--      versions_to_review    H1 «Προς έλεγχο»    deliverables.review  ίδιο με το deliverables_queue_view('review')
--      requests_mentions     J1 Αιτήματα         messages.chat        message_requests_view('mine') + αδιάβαστες @αναφορές
--      unread_messages       J1 Συνομιλίες       messages.chat        τα αδιάβαστα του messages_inbox
--      next_steps_due        B3 ξεχασμένες       clients.manage       η σελίδα B3 και το can_see_opportunity_row
--      proposals_in_progress D1 σε εξέλιξη       agreements.*         agreements_list (can_see_agreement)
--  • Επείγον (κανόνας 5): προθεσμία ή λήξη σε έως 1 μέρα ή περασμένη· κάθε Επόμενο βήμα που έληξε. Η Έκδοση σε έλεγχο
--    δεν είναι επείγουσα (η H1 δεν τη δείχνει εκπρόθεσμη).
--  • Οι @αναφορές μετρούν μόνο στα «Αιτήματα και @αναφορές», όχι και στα «Αδιάβαστα Μηνύματα».
--  • Ποσά: καμία από αυτές τις κάρτες δεν δείχνει ποσά (ούτε amount_cents).
--  • Δεν αλλάζει καμία κοινή συνάρτηση· μόνο νέες authz.today_* και γραμμές στο μητρώο. Κανένας νέος πίνακας.

-- ───────────── Βοηθητικά ─────────────

-- Η μέρα της p_now στην Ελλάδα (ADR 0018).
create function authz.today_work_day(p_now timestamptz) returns date
language sql immutable set search_path = ''
as $$ select (p_now at time zone 'Europe/Athens')::date; $$;

-- Μια ημερομηνία ως στιγμή (μεσάνυχτα Αθήνας), για το πεδίο at των γραμμών. Η εφαρμογή τη δείχνει ως μέρα.
create function authz.today_work_day_at(p_day date) returns timestamptz
language sql immutable set search_path = ''
as $$ select (p_day::timestamp at time zone 'Europe/Athens'); $$;

-- Οι γραμμές μιας κάρτας ως JSON: τα 3 πρώτα κατά rn.
create function authz.today_work_rows_json(p_rows jsonb) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(r - 'rn' order by (r ->> 'rn')::integer), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
   where (r ->> 'rn')::integer <= 3;
$$;

-- ───────────── Παραδοτέα (H1) ─────────────

-- Τα Παραδοτέα του Εύρους του p_perm σε μία από τις καταστάσεις, όπως η ουρά H1: μόνο ανοιχτές Παραγωγές, μη ακυρωμένα.
-- «Με αφορά» = υπεύθυνος του Παραδοτέου, ή υπεύθυνος / Μέλος της Παραγωγής (authz.deliverable_in_scope).
create function authz.today_deliverable_rows(p_uid uuid, p_perm text, p_states text[], p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean, link text, rn integer)
language sql stable security definer set search_path = ''
as $$
  with v as (select authz.user_scope(p_uid, p_perm) as scope, authz.today_work_day(p_now) as today),
  d as (
    select x.id, x.title, coalesce(c.name, p.title) as who, x.deadline,
           (select max(n.number) from public.deliverable_versions n where n.deliverable_id = x.id) as version,
           (select n.created_at from public.deliverable_versions n where n.deliverable_id = x.id
             order by n.number desc limit 1) as version_at
      from public.deliverables x
      join public.productions p on p.id = x.production_id
      left join public.clients c on c.id = p.client_id
      cross join v
     where p.state = 'open' and x.cancelled_at is null
       and authz.deliverable_state(x.id) = any (p_states)
       and case v.scope
             when 'all' then true
             when 'mine' then x.assignee_id = p_uid or p.owner_id = p_uid
                              or exists (select 1 from public.production_members m
                                          where m.production_id = p.id and m.user_id = p_uid)
             else false
           end
  )
  select d.id::text, d.title,
         case when d.version is not null and 'in_review' = any (p_states) then d.who || ' · Έκδοση ' || d.version else d.who end,
         case when d.deadline is not null then authz.today_work_day_at(d.deadline) end,
         -- Η Έκδοση σε έλεγχο δεν σημαίνεται επείγουσα, όπως το «εκπρόθεσμο» της H1.
         d.deadline is not null and d.deadline <= v.today + 1 and not ('in_review' = any (p_states)),
         '/app/deliverables/' || d.id,
         (row_number() over (order by d.deadline asc nulls last, d.version_at asc nulls last, d.id))::integer
    from d cross join v;
$$;

create function authz.today_count_my_deliverables(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'deliverables.work') is null then
    return null;
  end if;
  return (select count(*)::integer
            from authz.today_deliverable_rows(p_uid, 'deliverables.work', array['draft', 'returned', 'changes_requested'], p_now));
end;
$$;

create function authz.today_items_my_deliverables(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'deliverables.work') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((
    select jsonb_agg(to_jsonb(r))
      from authz.today_deliverable_rows(p_uid, 'deliverables.work', array['draft', 'returned', 'changes_requested'], p_now) r));
end;
$$;

create function authz.today_count_versions_to_review(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'deliverables.review') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_deliverable_rows(p_uid, 'deliverables.review', array['in_review'], p_now));
end;
$$;

create function authz.today_items_versions_to_review(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'deliverables.review') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((
    select jsonb_agg(to_jsonb(r))
      from authz.today_deliverable_rows(p_uid, 'deliverables.review', array['in_review'], p_now) r));
end;
$$;

-- ───────────── Μηνύματα (J1) ─────────────

-- Τα Μηνύματα που βλέπει ο Χρήστης ομάδας p_uid. Ίδιος κανόνας με το authz.message_visible (πλευρά ομάδας), για δοσμένο
-- Χρήστη· το Εύρος υπολογίζεται μία φορά, και με «όλα» δεν ελέγχεται τίποτα άλλο (όπως στο messages_inbox).
create function authz.today_visible_messages(p_uid uuid) returns setof public.messages
language sql stable security definer set search_path = ''
as $$
  with s as (select authz.user_scope(p_uid, 'messages.chat') as scope)
  select m.*
    from public.messages m cross join s
   where s.scope is not null
     and (s.scope = 'all'
          or exists (select 1 from public.clients c where c.id = m.client_id and c.manager_id = p_uid)
          or (m.production_id is not null and exists (
                select 1 from public.productions p
                 where p.id = m.production_id
                   and (p.owner_id = p_uid
                        or exists (select 1 from public.production_members pm
                                    where pm.production_id = p.id and pm.user_id = p_uid))))
          or (m.is_internal and p_uid = any (m.mentions)));
$$;

-- Ανοιχτά Αιτήματα ανατεθειμένα στον Χρήστη (με τα Αιτήματα αλλαγής των Παραγωγών του, όπως η όψη «mine» του J1), και
-- οι @αναφορές του που δεν διάβασε ακόμα. Πρώτα τα Αιτήματα (τα παλαιότερα πρώτα), μετά οι @αναφορές (οι νεότερες πρώτα).
create function authz.today_request_rows(p_uid uuid)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean, link text, rn integer)
language sql stable security definer set search_path = ''
as $$
  with x as (
    select 'r:' || r.message_id as id, 'Αίτημα: ' || left(m.body, 80) as title, c.name as subtitle, r.declared_at as at,
           '/app/messages/' || m.client_id || '#m-' || m.id as link, 1 as n
      from public.message_requests r
      join authz.today_visible_messages(p_uid) m on m.id = r.message_id
      join public.clients c on c.id = m.client_id
     where r.state = 'open' and r.assignee_id = p_uid and m.deleted_at is null
    union all
    select 'c:' || q.id, 'Αλλαγή: ' || left(q.body, 80), c.name, q.created_at, '/app/deliverables/' || d.id, 1
      from public.deliverable_requests q
      join public.deliverables d on d.id = q.deliverable_id
      join public.productions pr on pr.id = d.production_id
      join public.clients c on c.id = pr.client_id
     where q.decision is null and pr.owner_id = p_uid
    union all
    select 'm:' || m.id, '@αναφορά: ' || left(m.body, 80), c.name, m.created_at,
           '/app/messages/' || m.client_id || '#m-' || m.id, 2
      from public.messages m
      join public.clients c on c.id = m.client_id
      left join public.message_reads rd on rd.user_id = p_uid and rd.client_id = m.client_id
     where m.is_internal and m.mentions @> array[p_uid] and m.author_id <> p_uid and m.deleted_at is null
       and m.created_at > coalesce(rd.read_at, '-infinity'::timestamptz)
  )
  select x.id, x.title, x.subtitle, x.at, false, x.link,
         (row_number() over (order by x.n, case when x.n = 1 then x.at end asc, x.at desc, x.id))::integer
    from x;
$$;

create function authz.today_count_requests_mentions(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'messages.chat') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_request_rows(p_uid));
end;
$$;

create function authz.today_items_requests_mentions(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'messages.chat') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((select jsonb_agg(to_jsonb(r)) from authz.today_request_rows(p_uid) r));
end;
$$;

-- Οι Συνομιλίες με αδιάβαστα, όπως τα μετρά τα Εισερχόμενα: ορατά Μηνύματα άλλων, μετά το «ως πού διάβασα». Τα Εσωτερικά
-- που αναφέρουν τον Χρήστη μετρούν μόνο στην κάρτα «Αιτήματα και @αναφορές», όχι και εδώ.
create function authz.today_unread_rows(p_uid uuid)
returns table (client_id uuid, client_name text, unread integer, last_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.client_id, c.name, count(*)::integer, max(m.created_at)
    from authz.today_visible_messages(p_uid) m
    join public.clients c on c.id = m.client_id
    left join public.message_reads rd on rd.user_id = p_uid and rd.client_id = m.client_id
   where m.author_id <> p_uid and m.deleted_at is null
     and m.created_at > coalesce(rd.read_at, '-infinity'::timestamptz)
     and not (m.is_internal and p_uid = any (m.mentions))
   group by m.client_id, c.name;
$$;

create function authz.today_count_unread_messages(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'messages.chat') is null then
    return null;
  end if;
  return (select coalesce(sum(u.unread), 0)::integer from authz.today_unread_rows(p_uid) u);
end;
$$;

create function authz.today_items_unread_messages(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'messages.chat') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', u.client_id::text, 'title', u.client_name,
                                        'subtitle', u.unread || case when u.unread = 1 then ' νέο' else ' νέα' end,
                                        'at', u.last_at, 'urgent', false, 'link', '/app/messages/' || u.client_id)
                     order by u.last_at desc, u.client_id)
      from (select * from authz.today_unread_rows(p_uid) x order by x.last_at desc, x.client_id limit 3) u),
    '[]'::jsonb);
end;
$$;

-- ───────────── Ευκαιρίες (B3) ─────────────

-- Βλέπει ο Χρήστης p_uid την Ευκαιρία; Ίδιος κανόνας με το authz.can_see_opportunity_row, για δοσμένο Χρήστη.
create function authz.today_sees_opportunity(p_uid uuid, p_client uuid, p_manager uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.user_is_team(p_uid) and (
    coalesce(authz.user_scope(p_uid, 'clients.manage'), '') = 'all'
    or authz.user_scope(p_uid, 'clients.transfer') is not null
    or ((authz.user_scope(p_uid, 'clients.view') is not null or authz.user_scope(p_uid, 'clients.manage') is not null)
        and (coalesce(p_manager = p_uid, false)
             or exists (select 1 from public.clients c where c.id = p_client and c.manager_id = p_uid))));
$$;

-- Ανοιχτές Ευκαιρίες με Επόμενο βήμα που η μέρα του πέρασε (η ίδια μέρα δεν μετράει, όπως το isForgotten). Όλες επείγουσες.
create function authz.today_next_step_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean, link text, rn integer)
language sql stable security definer set search_path = ''
as $$
  select o.id::text, c.name || ': ' || o.next_step, o.title, authz.today_work_day_at(o.next_step_due), true,
         '/app/pipeline/' || o.id,
         (row_number() over (order by o.next_step_due, o.id))::integer
    from public.opportunities o
    join public.clients c on c.id = o.client_id
   where o.outcome = 'open' and o.next_step_due < authz.today_work_day(p_now)
     and authz.today_sees_opportunity(p_uid, o.client_id, o.manager_id);
$$;

create function authz.today_count_next_steps_due(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'clients.manage') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_next_step_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_next_steps_due(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'clients.manage') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((select jsonb_agg(to_jsonb(r)) from authz.today_next_step_rows(p_uid, p_now) r));
end;
$$;

-- ───────────── Προτάσεις (D1) ─────────────

-- Ίδιο με το authz.agreement_in_scope, για δοσμένο Χρήστη: Εύρος «όλα», ή Υπεύθυνος της Ευκαιρίας ή του Πελάτη.
create function authz.today_agreement_in_scope(p_uid uuid, p_opportunity uuid, p_perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.user_scope(p_uid, p_perm) is not null and (
    authz.user_scope(p_uid, p_perm) = 'all'
    or exists (select 1 from public.opportunities o join public.clients c on c.id = o.client_id
                where o.id = p_opportunity
                  and (coalesce(o.manager_id = p_uid, false) or coalesce(c.manager_id = p_uid, false))));
$$;

-- Ίδιο με το authz.can_see_agreement, για δοσμένο Χρήστη και Ευκαιρία της Συμφωνίας.
create function authz.today_sees_agreement(p_uid uuid, p_opportunity uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.user_is_team(p_uid) and (
    authz.today_agreement_in_scope(p_uid, p_opportunity, 'agreements.view')
    or authz.today_agreement_in_scope(p_uid, p_opportunity, 'agreements.draft')
    or authz.user_scope(p_uid, 'agreements.deviate') is not null);
$$;

-- Η σελίδα D1 ανοίγει σε όποιον «Βλέπει», «Συντάσσει» ή «Παρεκκλίνει».
create function authz.today_sees_agreements(p_uid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.user_scope(p_uid, 'agreements.view') is not null
      or authz.user_scope(p_uid, 'agreements.draft') is not null
      or authz.user_scope(p_uid, 'agreements.deviate') is not null;
$$;

-- Προτάσεις που στάλθηκαν και ισχύουν ακόμα, και λήγουν σε έως 7 μέρες ή τις άνοιξε ο πελάτης. Το «άνοιξε» φαίνεται μόνο
-- σε όποιον το βλέπει και στη D1 (όποιος συντάσσει ή παρεκκλίνει), όπως το links_opened του agreements_list.
create function authz.today_proposal_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean, link text, rn integer)
language sql stable security definer set search_path = ''
as $$
  with v as (select authz.today_work_day(p_now) as today, authz.user_scope(p_uid, 'agreements.deviate') is not null as deviate),
  a as (
    select x.id, x.title, x.valid_until, c.name as client,
           (v.deviate or authz.today_agreement_in_scope(p_uid, x.opportunity_id, 'agreements.draft'))
           and exists (select 1 from public.agreement_links l
                        where l.agreement_id = x.id and l.revision = x.revision and l.first_opened_at is not null) as opened
      from public.agreements x
      join public.opportunities o on o.id = x.opportunity_id
      join public.clients c on c.id = o.client_id
      cross join v
     where x.state = 'proposal' and x.path = 'sent' and x.valid_until >= v.today
       and authz.today_sees_agreement(p_uid, x.opportunity_id)
  )
  select a.id::text, a.client || ': ' || a.title,
         case when a.opened then 'την άνοιξε ο πελάτης' end,
         authz.today_work_day_at(a.valid_until), a.valid_until <= v.today + 1, '/app/agreements/' || a.id,
         (row_number() over (order by a.valid_until, a.id))::integer
    from a cross join v
   where a.valid_until <= v.today + 7 or a.opened;
$$;

create function authz.today_count_proposals_in_progress(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.today_sees_agreements(p_uid) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_proposal_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_proposals_in_progress(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.today_sees_agreements(p_uid) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((select jsonb_agg(to_jsonb(r)) from authz.today_proposal_rows(p_uid, p_now) r));
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('my_deliverables', 'work', 'action', 'team', 200, 'Παραδοτέα για μένα', 'Deliverables for me', '/app/deliverables?view=mine',
   'authz.today_count_my_deliverables(uuid, uuid, timestamptz)', 'authz.today_items_my_deliverables(uuid, uuid, timestamptz)'),
  ('versions_to_review', 'work', 'action', 'team', 210, 'Εκδόσεις προς έλεγχο', 'Versions to review', '/app/deliverables?view=review',
   'authz.today_count_versions_to_review(uuid, uuid, timestamptz)', 'authz.today_items_versions_to_review(uuid, uuid, timestamptz)'),
  ('requests_mentions', 'work', 'action', 'team', 220, 'Αιτήματα και @αναφορές', 'Requests and mentions',
   '/app/messages?tab=requests',
   'authz.today_count_requests_mentions(uuid, uuid, timestamptz)', 'authz.today_items_requests_mentions(uuid, uuid, timestamptz)'),
  ('unread_messages', 'work', 'action', 'team', 230, 'Αδιάβαστα Μηνύματα', 'Unread messages', '/app/messages',
   'authz.today_count_unread_messages(uuid, uuid, timestamptz)', 'authz.today_items_unread_messages(uuid, uuid, timestamptz)'),
  ('next_steps_due', 'work', 'action', 'team', 240, 'Επόμενα βήματα που έληξαν', 'Overdue next steps', '/app/pipeline?forgotten=1',
   'authz.today_count_next_steps_due(uuid, uuid, timestamptz)', 'authz.today_items_next_steps_due(uuid, uuid, timestamptz)'),
  ('proposals_in_progress', 'work', 'action', 'team', 250, 'Προτάσεις σε εξέλιξη', 'Proposals in progress',
   '/app/agreements?view=in_progress',
   'authz.today_count_proposals_in_progress(uuid, uuid, timestamptz)',
   'authz.today_items_proposals_in_progress(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_work_day(timestamptz), authz.today_work_day_at(date), authz.today_work_rows_json(jsonb),
  authz.today_deliverable_rows(uuid, text, text[], timestamptz),
  authz.today_count_my_deliverables(uuid, uuid, timestamptz), authz.today_items_my_deliverables(uuid, uuid, timestamptz),
  authz.today_count_versions_to_review(uuid, uuid, timestamptz), authz.today_items_versions_to_review(uuid, uuid, timestamptz),
  authz.today_visible_messages(uuid), authz.today_request_rows(uuid), authz.today_unread_rows(uuid),
  authz.today_count_requests_mentions(uuid, uuid, timestamptz), authz.today_items_requests_mentions(uuid, uuid, timestamptz),
  authz.today_count_unread_messages(uuid, uuid, timestamptz), authz.today_items_unread_messages(uuid, uuid, timestamptz),
  authz.today_sees_opportunity(uuid, uuid, uuid), authz.today_next_step_rows(uuid, timestamptz),
  authz.today_count_next_steps_due(uuid, uuid, timestamptz), authz.today_items_next_steps_due(uuid, uuid, timestamptz),
  authz.today_agreement_in_scope(uuid, uuid, text), authz.today_sees_agreement(uuid, uuid), authz.today_sees_agreements(uuid), authz.today_proposal_rows(uuid, timestamptz),
  authz.today_count_proposals_in_progress(uuid, uuid, timestamptz),
  authz.today_items_proposals_in_progress(uuid, uuid, timestamptz)
  from public, anon, authenticated;
