-- Σήμερα ως ενημέρωση, κομμάτι 2 (#241 Σ4, Σ5, Σ7 και τα € του Σ1): τρία RPC για τα κομμάτια «Χρήματα», «Η ομάδα» και
-- «Το πρόγραμμα», και το «από πότε περιμένει» (waiting_since) στις γραμμές των καρτών απόφασης.
--
--  • public.today_money(p_now)      Χρήματα: ληξιπρόθεσμα (σύνολο, Τιμολόγια, Πελάτες), οι 3 μεγαλύτεροι οφειλέτες, ο ρυθμός
--                                   του μήνα. Δικαίωμα = της κάρτας «Ληξιπρόθεσμα Τιμολόγια» (authz.today_finance_all).
--  • public.today_team(p_now)       Η ομάδα: ανά Χρήστη ομάδας μόνο ό,τι κόλλησε. Δικαίωμα: Εύρος «όλα» σε ένα τουλάχιστον από
--                                   deliverables.work, deliverables.review, clients.manage (τις σελίδες-ουρές H1 και B3 με
--                                   όλη την ομάδα). Κάθε κομμάτι μετρά μόνο με το δικό του Δικαίωμα «όλα».
--  • public.today_programme(p_day)  Όλα τα ανοιχτά Γυρίσματα μιας μέρας (Αθήνα), με το Συνεργείο. Δικαίωμα και Εύρος = της
--                                   κάρτας «Γυρίσματα των επόμενων 7 ημερών» (authz.today_week_filmings).
--  Χωρίς Δικαίωμα (ή Χρήστης πελάτη, ή ανώνυμος): 42501. Καμία κρυφή μνήμη: όλα υπολογίζονται σε κάθε κλήση.
--  • waiting_since (Σ7): όταν ζητήθηκε η απόφαση. Πρόταση: η αίτηση έγκρισης. Κράτηση: η δημιουργία της. Ακύρωση/μετάθεση:
--    η αίτηση. Χωρίς υπεύθυνο, Αιτήματα και @αναφορές: η δημιουργία (ίδιο με το at). GDPR: η παραλαβή.
--    slot_free (μόνο κράτηση): η ώρα της χωρά ακόμα, κατά τον έλεγχο Ωραρίου και Χωρητικότητας (authz.slot_problem) χωρίς
--    την ίδια την κράτηση. Οι κρατήσεις δεν λήγουν· το false δεν σημαίνει «χάνεται», απλώς η φράση λείπει.
-- Τα υπόλοιπα πεδία των γραμμών μένουν ίδια (σύμβαση του 20261016100000_today.sql).

-- ───────────── Χρήματα ─────────────

-- «Περιμένουμε τον μήνα» = ό,τι μπήκε ως σήμερα μέσα στον μήνα (Εισπράξεις, μη διαγραμμένες) + ό,τι μένει ανοιχτό από
-- Τιμολόγια που λήγουν ως το τέλος του μήνα, και τα ήδη ληξιπρόθεσμα (υπόλοιπο του authz.invoice_standings). Έτσι το
-- «μπήκαν» δεν ξεπερνά ποτέ το «περιμένουμε», και μια Είσπραξη που εξοφλεί παλιό Τιμολόγιο μετρά και στα δύο.
-- Το «πού θα έπρεπε να είμαστε» = μέρα του μήνα / μέρες του μήνα (την υπολογίζει η εφαρμογή από τα day και days).
create function authz.today_money(p_uid uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Athens')::date;
  v_first date := date_trunc('month', (p_now at time zone 'Europe/Athens'))::date;
  v_last date := (date_trunc('month', (p_now at time zone 'Europe/Athens')) + interval '1 month - 1 day')::date;
  v_collected numeric;
  v_open numeric;
begin
  if not authz.today_finance_all(p_uid, null) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(sum(r.amount), 0) into v_collected
    from public.receipts r
   where r.deleted_at is null and r.received_on between v_first and v_today;
  select coalesce(sum(s.remaining), 0) into v_open
    from authz.invoice_standings(null, v_today) s
    join public.invoices i on i.id = s.invoice_id
   where s.remaining > 0 and i.due_date <= v_last;
  return (
    with o as (
      select i.client_id, c.name, s.remaining, i.due_date
        from authz.invoice_standings(null, v_today) s
        join public.invoices i on i.id = s.invoice_id
        join public.clients c on c.id = i.client_id
       where s.status = 'overdue'
    ), d as (
      select o.client_id, o.name, sum(o.remaining) as amount, (v_today - min(o.due_date))::integer as days
        from o group by o.client_id, o.name
    )
    select jsonb_build_object(
      'overdue_cents', (select coalesce(round(sum(o.remaining) * 100), 0)::bigint from o),
      'overdue_count', (select count(*)::integer from o),
      'client_count', (select count(distinct o.client_id)::integer from o),
      'debtors', coalesce((
        select jsonb_agg(jsonb_build_object('client_id', x.client_id, 'name', x.name,
                                            'amount_cents', round(x.amount * 100)::bigint, 'days', x.days,
                                            'link', '/app/finance/ledger?client=' || x.client_id)
                         order by x.amount desc, x.name, x.client_id)
          from (select * from d order by d.amount desc, d.name, d.client_id limit 3) x), '[]'::jsonb),
      'month', jsonb_build_object(
        'month', extract(month from v_today)::integer,
        'day', extract(day from v_today)::integer,
        'days', extract(day from v_last)::integer,
        'collected_cents', round(v_collected * 100)::bigint,
        'expected_cents', round((v_collected + v_open) * 100)::bigint))
  );
end;
$$;

-- ───────────── Η ομάδα ─────────────

-- Ανά ενεργό Χρήστη ομάδας: εκπρόθεσμα Παραδοτέα που του έχουν ανατεθεί (σε δουλειά: draft, returned, changes_requested,
-- προθεσμία πριν από σήμερα, ανοιχτή Παραγωγή, μη ακυρωμένα), Επόμενα βήματα που έληξαν (ανοιχτές Ευκαιρίες όπου είναι
-- Υπεύθυνος, όπως η B3), και Εκδόσεις που περιμένουν τον έλεγχό του (in_review σε Παραγωγή όπου είναι Υπεύθυνος).
-- Μόνο όσοι έχουν κάτι· οι υπόλοιποι ενεργοί μετρούν στο fine.
create function authz.today_team(p_uid uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Athens')::date;
  v_work boolean := authz.user_scope(p_uid, 'deliverables.work') is not distinct from 'all';
  v_review boolean := authz.user_scope(p_uid, 'deliverables.review') is not distinct from 'all';
  v_steps boolean := authz.user_scope(p_uid, 'clients.manage') is not distinct from 'all';
begin
  if not (v_work or v_review or v_steps) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    with open_deliverables as (
      select x.id, x.assignee_id, x.deadline, p.owner_id, authz.deliverable_state(x.id) as state
        from public.deliverables x
        join public.productions p on p.id = x.production_id
       where p.state = 'open' and x.cancelled_at is null
    ), people as (
      select u.user_id, u.name,
             (select count(*)::integer from open_deliverables d
               where v_work and d.assignee_id = u.user_id and d.deadline < v_today
                 and d.state in ('draft', 'returned', 'changes_requested')) as late,
             (select (v_today - min(d.deadline))::integer from open_deliverables d
               where v_work and d.assignee_id = u.user_id and d.deadline < v_today
                 and d.state in ('draft', 'returned', 'changes_requested')) as oldest,
             (select count(*)::integer from public.opportunities o
               where v_steps and o.manager_id = u.user_id and o.outcome = 'open' and o.next_step_due < v_today) as steps,
             (select count(*)::integer from open_deliverables d
               where v_review and d.owner_id = u.user_id and d.state = 'in_review') as versions
        from public.team_users u
       where u.is_active
    )
    select jsonb_build_object(
      'people', coalesce((
        select jsonb_agg(jsonb_build_object('user_id', p.user_id, 'name', p.name, 'late', p.late, 'oldest_days', p.oldest,
                                            'steps', p.steps, 'versions', p.versions)
                         order by p.late desc, p.oldest desc nulls last, p.steps desc, p.versions desc, p.name, p.user_id)
          from people p where p.late + p.steps + p.versions > 0), '[]'::jsonb),
      'fine', (select count(*)::integer from people p where p.late + p.steps + p.versions = 0),
      'sees', jsonb_build_object('deliverables', v_work, 'steps', v_steps, 'versions', v_review))
  );
end;
$$;

-- ───────────── Το πρόγραμμα ─────────────

-- Τα Γυρίσματα της μέρας p_day, με την ίδια ορατότητα με την κάρτα της εβδομάδας (authz.today_week_filmings, που ξεκινά
-- από τη μέρα που του δίνεται). Το Συνεργείο χωρίς όσους αρνήθηκαν.
create function authz.today_programme(p_uid uuid, p_day date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_day is null or authz.user_scope(p_uid, 'filming.view') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'day', p_day,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', w.id, 'title', w.title, 'at', w.starts_at, 'hours', f.hours,
               'subtitle', case when w.state = 'pending' then 'αναμένει έγκριση' end,
               'crew', coalesce((select jsonb_agg(u.name order by u.name)
                                   from public.filming_crew fc join public.team_users u on u.user_id = fc.user_id
                                  where fc.filming_id = w.id and fc.response <> 'declined'), '[]'::jsonb),
               'link', '/app/filming/' || w.id)
             order by w.starts_at, w.id)
        from authz.today_week_filmings(p_uid, (p_day::timestamp at time zone 'Europe/Athens')) w
        join public.filmings f on f.id = w.id
       where (w.starts_at at time zone 'Europe/Athens')::date = p_day), '[]'::jsonb));
end;
$$;

-- ───────────── Από πότε περιμένει (Σ7) ─────────────

create or replace function authz.today_items_proposal_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean;
  v_due date := (p_now at time zone 'Europe/Athens')::date + 1;
begin
  if not authz.today_proposal_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  v_amounts := authz.user_scope(p_uid, 'finance.amounts') is not null;
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'id', x.id::text, 'title', x.title, 'subtitle', x.client_name || ' · με Παρέκκλιση', 'at', x.requested_at,
             'waiting_since', x.requested_at,
             'urgent', x.urgent, 'link', '/app/agreements/approvals',
             'amount_cents', case when v_amounts then (select round(f.price * 100)::bigint from authz.agreement_figures(x.id) f) end))
           order by x.urgent desc, x.requested_at, x.id)
      from (select r.*, r.valid_until <= v_due as urgent
              from authz.today_proposal_approvals_rows() r
             order by r.valid_until <= v_due desc, r.requested_at, r.id limit 3) x),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_filming_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_filming_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.kind || ':' || x.id::text, 'title', x.title,
             'subtitle', null, 'at', x.starts_at, 'urgent', x.starts_at <= p_now + interval '24 hours',
             'waiting_since', case x.kind when 'booking' then f.created_at
                                          when 'cancel' then f.cancel_request_at
                                          else f.reschedule_requested_at end,
             'slot_free', case when x.kind = 'booking' then authz.slot_problem(f.starts_at, f.hours, f.id, false) is null end,
             'link', '/app/filming/queue')
           order by x.starts_at, x.kind, x.id)
      from (select * from authz.today_filming_approvals_rows() r order by r.starts_at, r.kind, r.id limit 3) x
      join public.filmings f on f.id = x.id),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_unassigned(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unassigned_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.id, 'title', coalesce(x.title, '—'), 'subtitle', x.subtitle, 'at', x.at, 'waiting_since', x.at,
             'urgent', false, 'link', x.link)
           order by x.at, x.id)
      from (select * from authz.today_unassigned_rows_for(p_uid) r order by r.at, r.id limit 3) x),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_requests_mentions(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'messages.chat') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((
    select jsonb_agg(to_jsonb(r) || jsonb_build_object('waiting_since', r.at)) from authz.today_request_rows(p_uid) r));
end;
$$;

create or replace function authz.today_items_gdpr(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Athens')::date;
begin
  if p_client is not null or not coalesce(authz.user_is_owner(p_uid), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id::text,
             'title', authz.gdpr_kind_text(r.kind) || ': '
                      || coalesce(authz.gdpr_label(r.subject_kind, coalesce(r.subject_user_id, r.subject_client_id)), '—'),
             'subtitle', authz.gdpr_days_text(r.deadline - v_today),
             'at', (r.deadline::timestamp at time zone 'Europe/Athens'),
             'waiting_since', (r.received_on::timestamp at time zone 'Europe/Athens'),
             'urgent', r.deadline - v_today <= 1,
             'link', '/app/team/gdpr') order by r.deadline, r.received_on, r.id)
      from (select * from public.gdpr_requests x where x.completed_on is null
             order by x.deadline, x.received_on, x.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Public RPC (authenticated) ─────────────

create function public.today_money(p_now timestamptz default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.today_money(auth.uid(), coalesce(p_now, now())); $$;

create function public.today_team(p_now timestamptz default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.today_team(auth.uid(), coalesce(p_now, now())); $$;

create function public.today_programme(p_day date) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.today_programme(auth.uid(), p_day); $$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_money(uuid, timestamptz), authz.today_team(uuid, timestamptz), authz.today_programme(uuid, date),
  authz.today_items_proposal_approvals(uuid, uuid, timestamptz), authz.today_items_filming_approvals(uuid, uuid, timestamptz),
  authz.today_items_unassigned(uuid, uuid, timestamptz), authz.today_items_requests_mentions(uuid, uuid, timestamptz),
  authz.today_items_gdpr(uuid, uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function public.today_money(timestamptz), public.today_team(timestamptz), public.today_programme(date)
  from public, anon;
grant execute on function public.today_money(timestamptz), public.today_team(timestamptz), public.today_programme(date)
  to authenticated;
