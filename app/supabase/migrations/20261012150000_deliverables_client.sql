-- Παραδοτέα, πλευρά πελάτη (H3, H4, #142): ορατότητα μόνο για σταλμένες Εκδόσεις, απάντηση «ενέκρινε» ή «ζήτησε αλλαγές»
-- (πρώτη απάντηση ισχύει, Π6), γύροι και προειδοποίηση χρέωσης (Π1), σχόλια με mm:ss χωρίς εσωτερικά, «το link δεν ανοίγει»,
-- Αίτημα αλλαγής μετά την έγκριση (Π4) με απόφαση της ομάδας, τελικά αρχεία και email ανά Χρήστη πελάτη με «Εγκρίνει Παραδοτέα».
-- Κεφ. 3 (Παραδοτέα), ADR 0011. Οι αυτοματισμοί, οι υπενθυμίσεις και η αυτόματη παράδοση Παραγωγής είναι στο #143.
--
-- Αρχές:
--  • Οι πίνακες μένουν κλειστοί για την εφαρμογή· όλα περνούν από τα public.deliverable* και public.client_deliverable* RPC.
--  • Ο Χρήστης πελάτη: πρώτα Δικαίωμα (c.approve ή c.productions, 42501), μετά ορατότητα (42501 ίδιο μήνυμα, χωρίς oracle).
--  • Κατάσταση πελάτη: «αναμένει εσένα» μόνο όταν υπάρχει σταλμένη Έκδοση χωρίς απάντηση. Ό,τι είναι σε έλεγχο ή επιστράφηκε
--    φαίνεται «σε εργασία». Ποτέ εσωτερικά σχόλια, υπεύθυνοι, προθεσμίες, χρέωση, κόστος ή Μέλη.
--  • Η εγκεκριμένη Έκδοση που ξανανοίγει από Αίτημα (approved_at null) παίρνει κατάσταση «χρειάζεται αλλαγές» για την ομάδα.

-- ───────────── Email και στήλες ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined', 'deliverable_version_sent'));

-- Τελικά αρχεία που όρισε η ομάδα. Αν λείπουν, ο πελάτης βλέπει το link της εγκεκριμένης Έκδοσης.
alter table public.deliverables add column final_files_url text
  check (final_files_url is null or length(final_files_url) between 1 and 2000);

-- ───────────── Αίτημα αλλαγής μετά την έγκριση ─────────────

-- Ένα ανοιχτό Αίτημα τη φορά ανά Παραδοτέο (Π4). Η απόφαση γράφεται μία φορά.
create table public.deliverable_requests (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables (id),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  decision text check (decision in ('round', 'charged', 'new_deliverable')),
  decided_at timestamptz,
  decided_by uuid,
  decision_note text check (decision_note is null or length(trim(decision_note)) > 0),
  new_deliverable_id uuid references public.deliverables (id),
  check ((decision is null) = (decided_at is null)),
  check ((decision is null) = (decided_by is null)),
  check (decision is distinct from 'new_deliverable' or new_deliverable_id is not null),
  check (new_deliverable_id is null or decision is not distinct from 'new_deliverable')
);

create index deliverable_requests_deliverable_idx on public.deliverable_requests (deliverable_id);
create unique index deliverable_requests_one_open on public.deliverable_requests (deliverable_id) where decision is null;

alter table public.deliverable_requests enable row level security;
revoke all on table public.deliverable_requests from anon, authenticated;

create trigger deliverable_requests_audit after insert or delete on public.deliverable_requests
  for each row execute function authz.audit_row('deliverable_id');
create trigger deliverable_requests_audit_update after update on public.deliverable_requests
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('deliverable_id');

-- Γύροι που έχουν καταναλωθεί: Εκδόσεις «χρειάζεται αλλαγές» και Αιτήματα με απόφαση «δεκτό ως γύρος».
-- Η «χρεώνεται» και το «νέο Παραδοτέο» δεν μετράνε.
create function authz.deliverable_rounds_used(p_deliverable uuid) returns integer
language sql stable set search_path = ''
as $$
  select (select count(*) from public.deliverable_versions v
           where v.deliverable_id = p_deliverable and v.state = 'changes_requested')::integer
       + (select count(*) from public.deliverable_requests r
           where r.deliverable_id = p_deliverable and r.decision = 'round')::integer;
$$;

-- ───────────── Κατάσταση και κάρτα (ξαναγράφονται) ─────────────

-- Εγκεκριμένη Έκδοση που ξανάνοιξε από Αίτημα (approved_at null) γίνεται «χρειάζεται αλλαγές» για την ομάδα.
create or replace function authz.deliverable_state(p_deliverable uuid) returns text
language sql stable set search_path = ''
as $$
  select case
           when d.cancelled_at is not null then 'cancelled'
           when d.approved_at is null
                and (select v.state from public.deliverable_versions v
                      where v.deliverable_id = d.id order by v.number desc limit 1) = 'approved' then 'changes_requested'
           else coalesce((
             select v.state from public.deliverable_versions v
              where v.deliverable_id = d.id
              order by v.number desc limit 1
           ), 'draft')
         end
    from public.deliverables d
   where d.id = p_deliverable;
$$;

-- Η κάρτα μετράει γύρους με την deliverable_rounds_used (και τα Αιτήματα «δεκτό ως γύρος»).
create or replace function authz.deliverable_card(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  d public.deliverables;
  v_production public.productions;
  v_latest public.deliverable_versions;
  v_state text;
  v_today date := public.sales_today();
  v_rounds_used integer;
  v_rounds_limit integer;
  v_days integer := 0;
  v_late boolean;
begin
  select * into d from public.deliverables x where x.id = p_deliverable;
  if not found then
    return null;
  end if;
  select * into v_production from public.productions p where p.id = d.production_id;
  select * into v_latest from public.deliverable_versions v where v.deliverable_id = d.id order by v.number desc limit 1;
  v_state := authz.deliverable_state(d.id);
  v_rounds_used := authz.deliverable_rounds_used(d.id);
  select r.rounds into v_rounds_limit from public.agreement_revision_limits r
   where r.agreement_id = v_production.agreement_id and r.kind_id = d.kind_id;
  v_late := d.deadline is not null and d.deadline < v_today and v_state not in ('approved', 'awaiting_client', 'in_review', 'cancelled');
  if v_state = 'awaiting_client' and v_latest.sent_at is not null then
    v_days := v_today - (v_latest.sent_at at time zone 'Europe/Athens')::date;
  elsif v_state = 'in_review' and v_latest.created_at is not null then
    v_days := v_today - (v_latest.created_at at time zone 'Europe/Athens')::date;
  end if;
  return jsonb_build_object(
    'id', d.id,
    'title', d.title,
    'productionId', v_production.id,
    'production', v_production.title,
    'client', (select c.name from public.clients c where c.id = v_production.client_id),
    'kind', (select k.label from public.provision_kinds k where k.id = d.kind_id),
    'kindId', d.kind_id,
    'assigneeId', d.assignee_id,
    'assigneeName', (select u.name from public.team_users u where u.user_id = d.assignee_id),
    'filmingId', d.filming_id,
    'deadline', d.deadline,
    'isLate', v_late,
    'state', v_state,
    'daysWaiting', v_days,
    'overLimit', v_rounds_limit is not null and v_rounds_used >= v_rounds_limit,
    'linkBroken', v_latest.link_broken_at is not null,
    'versionCount', (select count(*) from public.deliverable_versions v where v.deliverable_id = d.id),
    'roundsUsed', v_rounds_used,
    'roundsLimit', v_rounds_limit,
    'charge', d.charge,
    'chargeReason', d.charge_reason,
    'approvedAt', d.approved_at,
    'cancelledAt', d.cancelled_at,
    'cancelReason', d.cancel_reason,
    'cancelOutcome', d.cancel_outcome
  );
end;
$$;

-- Ίχνος του Παραδοτέου: + τα Αιτήματα του (κλειδί το deliverable_id).
create or replace function authz.deliverable_history(p_deliverable uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(h.entry order by h.at desc, h.id desc), '[]'::jsonb)
    from (
      select a.id, a.at, jsonb_build_object(
          'at', a.at, 'action', a.action, 'entity', a.entity,
          'actor_name', hu.name, 'before', a.before, 'after', a.after
        ) as entry
        from public.audit_log a
        left join public.team_users hu on hu.user_id = a.actor_id
       where a.entity in ('deliverables', 'deliverable_versions', 'deliverable_comments', 'deliverable_requests')
         and a.entity_id = p_deliverable::text
       order by a.at desc, a.id desc
       limit 100
    ) h;
$$;

-- Αιτήματα του Παραδοτέου για την ομάδα (H2).
create function authz.deliverable_requests_json(p_deliverable uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'body', r.body, 'createdAt', r.created_at,
           'createdByName', (select cu.name from public.client_users cu
                              where cu.user_id = r.created_by order by cu.joined_at limit 1),
           'decision', r.decision, 'decidedAt', r.decided_at,
           'decidedByName', (select t.name from public.team_users t where t.user_id = r.decided_by),
           'decisionNote', r.decision_note, 'newDeliverableId', r.new_deliverable_id
         ) order by r.created_at, r.id), '[]'::jsonb)
    from public.deliverable_requests r
   where r.deliverable_id = p_deliverable;
$$;

-- Η Παραγωγή που έγινε παραδομένη ξανανοίγει όταν ζητείται δουλειά πάνω της (Αίτημα ή νέο Παραδοτέο).
create function authz.reopen_production_for_work(p_production uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.productions p where p.id = p_production and p.state = 'delivered') then
    update public.productions p
       set state = 'open', delivered_at = null, delivered_by = null, delivered_note = null
     where p.id = p_production;
    perform authz.production_event(p_production, 'reopened', jsonb_build_object('reason', 'deliverable_request'));
  end if;
end;
$$;

-- Email «νέα Έκδοση προς έγκριση» σε κάθε Χρήστη πελάτη του Πελάτη με Δικαίωμα «Εγκρίνει Παραδοτέα» (c.approve).
-- Γλώσσα: προφίλ ομάδας αν υπάρχει, αλλιώς el. Καλείται στην ίδια συναλλαγή με την αποστολή.
create function authz.email_client_deliverable_version(p_deliverable uuid, p_number integer) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  select 'deliverable_version_sent', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'),
         jsonb_build_object(
           'deliverableId', d.id, 'title', d.title, 'production', p.title, 'version', p_number,
           'roundsUsed', authz.deliverable_rounds_used(d.id),
           'roundsLimit', (select r.rounds from public.agreement_revision_limits r
                            where r.agreement_id = p.agreement_id and r.kind_id = d.kind_id)
         ),
         auth.uid()
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    join public.client_users cu on cu.client_id = p.client_id and cu.removed_at is null
    join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.approve'
    join auth.users u on u.id = cu.user_id
    left join public.team_users t on t.user_id = cu.user_id
   where d.id = p_deliverable and coalesce(u.email, '') <> '';
end;
$$;

-- ───────────── Χρήστης πελάτη: βοηθητικές ─────────────

-- Ο Χρήστης πελάτη βλέπει το Παραδοτέο: Παραγωγή του Πελάτη του, όχι Εσωτερική. Αλλιώς 42501 (χωρίς oracle ύπαρξης).
create function authz.require_client_deliverable_visible(p_deliverable uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.deliverables d join public.productions p on p.id = d.production_id
     where d.id = p_deliverable and p.client_id is not null and p.client_id = authz.client_user_client_id()
  ) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

create function authz.client_user_name(p_user uuid, p_client uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select cu.name from public.client_users cu where cu.user_id = p_user and cu.client_id = p_client;
$$;

-- Κατάσταση για τον πελάτη: αναμένει εσένα, εγκρίθηκε, χρειάζεται αλλαγές, σε εργασία ή ακυρώθηκε.
create function authz.client_deliverable_state(p_deliverable uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case
           when d.cancelled_at is not null then 'cancelled'
           when exists (select 1 from public.deliverable_versions v
                         where v.deliverable_id = d.id and v.state = 'awaiting_client') then 'awaiting_you'
           when d.approved_at is not null then 'approved'
           when (select v.state from public.deliverable_versions v
                  where v.deliverable_id = d.id order by v.number desc limit 1) = 'changes_requested' then 'changes_requested'
           else 'in_progress'
         end
    from public.deliverables d
   where d.id = p_deliverable;
$$;

-- Κάρτα για τον πελάτη: μόνο τίτλος, είδος, κατάσταση, γύροι και από πότε περιμένει. Χωρίς Υπεύθυνο, προθεσμία, χρέωση.
create function authz.client_deliverable_card(p_deliverable uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'productionId', d.production_id,
    'title', d.title,
    'kind', (select k.label from public.provision_kinds k where k.id = d.kind_id),
    'state', authz.client_deliverable_state(d.id),
    'roundsUsed', authz.deliverable_rounds_used(d.id),
    'roundsLimit', (select r.rounds from public.agreement_revision_limits r
                     join public.productions p on p.agreement_id = r.agreement_id
                    where p.id = d.production_id and r.kind_id = d.kind_id),
    'waitingSince', (select (v.sent_at at time zone 'Europe/Athens')::date from public.deliverable_versions v
                      where v.deliverable_id = d.id and v.state = 'awaiting_client')
  )
    from public.deliverables d
   where d.id = p_deliverable;
$$;

-- Παροχές της Περιόδου για τον πελάτη: έχουν χρησιμοποιηθεί (και δεσμευτεί), σύνολο, απομένουν.
create function authz.client_provisions(p_period uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', b.value ->> 'label',
           'used', (b.value ->> 'used')::integer + (b.value ->> 'reserved')::integer,
           'remaining', (b.value ->> 'balance')::integer,
           'total', (b.value ->> 'given')::integer + (b.value ->> 'carried')::integer
         ) order by b.ord), '[]'::jsonb)
    from jsonb_array_elements(authz.period_balances(p_period)) with ordinality as b (value, ord);
$$;

-- Ομάδα Παραδοτέων μιας Περιόδου (ή μιας εφάπαξ Παραγωγής χωρίς Περίοδο).
create function authz.client_group_json(p_period uuid, p_production uuid, p_cards jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'periodId', p_period,
    'periodLabel', coalesce(
      (select 'Περίοδος ' || pe.n::text from public.agreement_periods pe where pe.id = p_period),
      (select pr.title from public.productions pr where pr.id = p_production)),
    'provisions', authz.client_provisions(p_period),
    'deliverables', p_cards
  );
$$;

-- Εκδόσεις που στάλθηκαν, νεότερη πρώτη, με τα σχόλια που βλέπει ο πελάτης (χωρίς εσωτερικά).
create function authz.client_versions_json(p_deliverable uuid, p_client uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'number', v.number, 'url', v.url, 'host', v.host, 'sentAt', v.sent_at, 'state', v.state,
           'answeredByName', authz.client_user_name(v.answered_by, p_client),
           'answeredAt', v.answered_at, 'answerNote', v.answer_note,
           'linkBroken', v.link_broken_at is not null,
           'comments', (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'id', c.id, 'body', c.body, 'atSeconds', c.at_seconds,
                      'authorName', coalesce((select t.name from public.team_users t where t.user_id = c.created_by),
                                             authz.client_user_name(c.created_by, p_client)),
                      'createdAt', c.created_at
                    ) order by c.created_at, c.id), '[]'::jsonb)
               from public.deliverable_comments c
              where c.deliverable_id = v.deliverable_id and c.version_number = v.number and not c.is_internal
           )
         ) order by v.number desc), '[]'::jsonb)
    from public.deliverable_versions v
   where v.deliverable_id = p_deliverable and v.sent_at is not null;
$$;

-- Τελικά αρχεία: μετά την έγκριση, ό,τι όρισε η ομάδα ή αλλιώς το link της εγκεκριμένης Έκδοσης.
create function authz.client_final_files_url(p_deliverable uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case when d.approved_at is not null
              then coalesce(d.final_files_url, (
                     select v.url from public.deliverable_versions v
                      where v.deliverable_id = d.id and v.state = 'approved'
                      order by v.number desc limit 1))
         end
    from public.deliverables d
   where d.id = p_deliverable;
$$;

-- Το Αίτημα που περιμένει απόφαση (αν υπάρχει).
create function authz.client_open_request_json(p_deliverable uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id', r.id, 'body', r.body, 'createdAt', r.created_at)
    from public.deliverable_requests r
   where r.deliverable_id = p_deliverable and r.decision is null;
$$;

-- Τι μπορεί να κάνει ο Χρήστης πελάτη στο Παραδοτέο τώρα.
create function authz.client_deliverable_can(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_approve boolean := authz.client_user_has('c.approve');
  v_open boolean := exists (select 1 from public.deliverables d where d.id = p_deliverable and d.cancelled_at is null);
  v_awaiting boolean := exists (select 1 from public.deliverable_versions v
                                 where v.deliverable_id = p_deliverable and v.state = 'awaiting_client');
  v_sent boolean := exists (select 1 from public.deliverable_versions v
                             where v.deliverable_id = p_deliverable and v.sent_at is not null);
  v_approved boolean := exists (select 1 from public.deliverables d
                                 where d.id = p_deliverable and d.approved_at is not null);
  v_has_open_request boolean := exists (select 1 from public.deliverable_requests r
                                         where r.deliverable_id = p_deliverable and r.decision is null);
begin
  return jsonb_build_object(
    'answer', v_approve and v_open and v_awaiting,
    'comment', v_approve and v_open and v_sent,
    'reportLink', (v_approve or authz.client_user_has('c.productions')) and v_sent,
    'requestChange', v_approve and v_open and v_approved and not v_has_open_request
  );
end;
$$;

-- ───────────── Ομάδα: ξαναγραφές Εκδόσεων (email προς τον πελάτη) ─────────────

-- Νέα Έκδοση (Π2, Π5). Ελεγκτής ή εσωτερικός έλεγχος off: αναμένει πελάτη και email. Αλλιώς: εσωτερικό έλεγχο.
create or replace function public.deliverable_version_add(p_id uuid, p_url text, p_note text) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := trim(coalesce(p_url, ''));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_host text;
  v_number integer;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  perform authz.require_deliverable_open(p_id);
  perform 1 from public.deliverables d where d.id = p_id for update;
  if authz.deliverable_state(p_id) in ('approved', 'cancelled') then
    raise exception 'Το Παραδοτέο δεν δέχεται νέα Έκδοση' using errcode = 'P0001';
  end if;
  v_host := authz.deliverable_host(v_url);
  v_number := coalesce(authz.deliverable_current_number(p_id), 0) + 1;
  if authz.deliverable_goes_direct(p_id) then
    update public.deliverable_versions v
       set state = 'superseded'
     where v.deliverable_id = p_id and v.state in ('in_review', 'awaiting_client');
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_by, sent_at, sent_by)
    values (p_id, v_number, v_url, v_host, 'awaiting_client', v_note, auth.uid(), now(), auth.uid());
    perform authz.email_client_deliverable_version(p_id, v_number);
  else
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_by)
    values (p_id, v_number, v_url, v_host, 'in_review', v_note, auth.uid());
  end if;
  return v_number;
end;
$$;

-- Στείλε στον πελάτη (Π2): από εσωτερικό έλεγχο σε αναμονή πελάτη, με email.
create or replace function public.deliverable_version_send(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_number integer;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.review');
  perform authz.require_deliverable_open(p_id);
  perform 1 from public.deliverables d where d.id = p_id for update;
  if not exists (
       select 1 from public.deliverables d join public.productions p on p.id = d.production_id
        where d.id = p_id and p.client_id is not null
     ) then
    raise exception 'Η Εσωτερική Παραγωγή δεν στέλνεται στον πελάτη' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) <> 'in_review' then
    raise exception 'Μόνο Έκδοση σε εσωτερικό έλεγχο στέλνεται' using errcode = 'P0001';
  end if;
  v_number := authz.deliverable_current_number(p_id);
  update public.deliverable_versions v
     set state = 'superseded'
   where v.deliverable_id = p_id and v.state = 'awaiting_client' and v.number < v_number;
  update public.deliverable_versions v
     set state = 'awaiting_client', sent_at = now(), sent_by = auth.uid()
   where v.deliverable_id = p_id and v.number = v_number;
  perform authz.email_client_deliverable_version(p_id, v_number);
end;
$$;

-- Σελίδα Παραδοτέου (H2): + Αιτήματα και τελικά αρχεία.
create or replace function public.deliverable_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_card jsonb;
begin
  perform authz.require_deliverable_view(p_id);
  v_card := authz.deliverable_card(p_id);
  return v_card || jsonb_build_object(
    'versions', authz.deliverable_versions_json(p_id),
    'can', authz.deliverable_viewer_can(p_id),
    'pendingCharge', v_card->>'charge' = 'pending',
    'history', authz.deliverable_history(p_id),
    'requests', authz.deliverable_requests_json(p_id),
    'finalFilesUrl', (select d.final_files_url from public.deliverables d where d.id = p_id)
  );
end;
$$;

-- ───────────── Ίχνος (ολόκληρη η λίστα από το #141 με τα Αιτήματα) ─────────────

create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'production_costs' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    -- Πρόσβαση και Ρυθμίσεις
    when 'roles' then true
    when 'role_permissions' then true
    when 'team_users' then true
    when 'team_user_roles' then true
    when 'company_settings' then true
    when 'bank_accounts' then true
    when 'readiness_confirmations' then true
    when 'system_state' then true
    -- Πωλήσεις: λίστες και ρυθμίσεις
    when 'sales_stages' then true
    when 'sales_sources' then true
    when 'sales_loss_reasons' then true
    when 'sales_activity_kinds' then true
    when 'sales_settings' then true
    -- Πωλήσεις: Πελάτες και Ευκαιρίες (το Εύρος κρίνεται ανά εγγραφή στο authz.audit_row_allowed)
    when 'clients' then true
    when 'client_duplicate_flags' then true
    when 'opportunities' then true
    when 'access_requests' then true
    -- Κατάλογος
    when 'provision_kinds' then true
    when 'catalogue_items' then true
    when 'catalogue_item_provisions' then true
    -- Συμφωνίες: ποσά και κόστος
    when 'agreement_line_costs' then authz.has('finance.cost')
    when 'agreement_costs' then authz.has('finance.cost') and authz.has('finance.amounts')
    when 'agreement_amounts' then authz.has('finance.amounts')
    when 'agreement_line_amounts' then authz.has('finance.amounts')
    when 'agreement_defaults' then authz.has('finance.amounts')
    -- Συμφωνίες: χωρίς ποσά (Σύνδεσμοι, κωδικοί, εξερχόμενα, έγγραφα και αναθεωρήσεις δεν γράφονται ποτέ στο Ίχνος)
    when 'agreements' then true
    when 'agreement_revision_limits' then true
    when 'agreement_milestones' then true
    when 'agreement_lines' then true
    when 'agreement_line_provisions' then true
    when 'agreement_recipients' then true
    when 'agreement_signatures' then true
    -- Εξοπλισμός: χωρίς ποσά
    when 'equipment_categories' then true
    when 'equipment_items' then true
    when 'equipment_templates' then true
    when 'equipment_template_items' then true
    -- Περίοδοι και Παραγωγές: χωρίς ποσά
    when 'agreement_periods' then true
    when 'agreement_period_provisions' then true
    when 'productions' then true
    when 'production_members' then true
    -- Γυρίσματα: χωρίς ποσά
    when 'filmings' then true
    when 'filming_crew' then true
    when 'filming_equipment' then true
    when 'crew_templates' then true
    when 'crew_template_members' then true
    when 'filming_settings' then true
    -- Ωράριο κρατήσεων: μόνο για όσους ορίζουν το Ωράριο
    when 'booking_week' then authz.has('settings.manage')
    when 'booking_exceptions' then authz.has('settings.manage')
    -- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): χωρίς ποσά· το email μόνο για τον Ιδιοκτήτη
    when 'access' then true
    when 'invitations' then true
    when 'client_users' then true
    when 'email_outbox' then authz.is_owner()
    when 'email_log' then authz.is_owner()
    -- Κλεισμένος χρόνος: με τίτλο μόνο για όσους κλείνουν χρόνο άλλων
    when 'blocked_times' then authz.has('calendar.block_others')
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    -- Παραδοτέα (#140): χωρίς ποσά
    when 'deliverables' then true
    when 'deliverable_versions' then true
    when 'deliverable_comments' then true
    -- Κανόνες Παραδοτέων (#141): χωρίς ποσά
    when 'deliverable_settings' then true
    -- Αιτήματα μετά την έγκριση (#142): χωρίς ποσά
    when 'deliverable_requests' then true
    else false
  end;
$$;

-- ───────────── Χρήστης πελάτη: RPC ανάγνωσης ─────────────

-- Τα Παραδοτέα του πελάτη ανά Περίοδο, με Παροχές, και «Περιμένουν εσένα». Μόνο σταλμένες Εκδόσεις φαίνονται.
create function public.client_deliverables_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_groups jsonb;
  v_awaiting jsonb;
begin
  perform authz.require_client_permission('c.productions');
  select coalesce(jsonb_agg(authz.client_group_json(g.period_id, g.production_id, g.cards)
                            order by g.starts nulls last, g.production_id), '[]'::jsonb)
    into v_groups
    from (
      select v.period_id,
             case when v.period_id is null then v.production_id end as production_id,
             jsonb_agg(v.card order by v.card->>'title', v.card->>'id') as cards,
             min(pe.starts) as starts
        from (
          select d.period_id, d.production_id, authz.client_deliverable_card(d.id) as card
            from public.deliverables d
            join public.productions p on p.id = d.production_id
           where p.client_id = authz.client_user_client_id()
        ) v
        left join public.agreement_periods pe on pe.id = v.period_id
       group by v.period_id, case when v.period_id is null then v.production_id end
    ) g;
  select coalesce(jsonb_agg(v.card order by v.card->>'waitingSince', v.card->>'id'), '[]'::jsonb)
    into v_awaiting
    from (
      select authz.client_deliverable_card(d.id) as card
        from public.deliverables d
        join public.productions p on p.id = d.production_id
       where p.client_id = authz.client_user_client_id()
    ) v
   where v.card->>'state' = 'awaiting_you';
  return jsonb_build_object('periods', v_groups, 'awaitingYou', v_awaiting);
end;
$$;

-- Σελίδα Παραδοτέου για τον πελάτη (H4): Εκδόσεις που στάλθηκαν, σχόλια, γύροι, αίτημα και τελικά αρχεία.
create function public.client_deliverable_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_title text;
  v_card jsonb;
begin
  perform authz.require_client_permission('c.productions');
  perform authz.require_client_deliverable_visible(p_id);
  select p.client_id, p.title into v_client, v_title
    from public.deliverables d join public.productions p on p.id = d.production_id
   where d.id = p_id;
  v_card := authz.client_deliverable_card(p_id) - 'waitingSince';
  return v_card || jsonb_build_object(
    'production', v_title,
    'overLimit', (v_card->>'roundsLimit') is not null and (v_card->>'roundsUsed')::integer >= (v_card->>'roundsLimit')::integer,
    'versions', authz.client_versions_json(p_id, v_client),
    'finalFilesUrl', authz.client_final_files_url(p_id),
    'openRequest', authz.client_open_request_json(p_id),
    'can', authz.client_deliverable_can(p_id)
  );
end;
$$;

-- ───────────── Χρήστης πελάτη: RPC γραφής ─────────────

-- Απάντηση (Π6): μόνο στην τρέχουσα σταλμένη Έκδοση. Η πρώτη απάντηση ισχύει (κλείδωμα γραμμής).
create function public.deliverable_client_answer(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_row public.deliverables;
  v_awaiting integer;
  v_latest public.deliverable_versions;
begin
  perform authz.require_client_permission('c.approve');
  perform authz.require_client_deliverable_visible(p_id);
  select * into v_row from public.deliverables d where d.id = p_id for update;
  if v_row.cancelled_at is not null then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if p_approve is null then
    raise exception 'Η απάντηση θέλει «ενέκρινε» ή «ζήτησε αλλαγές»' using errcode = 'P0001';
  end if;
  select v.number into v_awaiting from public.deliverable_versions v
   where v.deliverable_id = p_id and v.state = 'awaiting_client';
  if v_awaiting is null then
    select * into v_latest from public.deliverable_versions v
     where v.deliverable_id = p_id order by v.number desc limit 1;
    if v_latest.answered_at is not null and (v_latest.state = 'changes_requested' or v_row.approved_at is not null) then
      raise exception 'Απάντησε ήδη ο/η %', authz.client_user_name(
        v_latest.answered_by,
        (select p.client_id from public.productions p where p.id = v_row.production_id)
      ) using errcode = 'P0001';
    end if;
    raise exception 'Δεν υπάρχει Έκδοση σε αναμονή απάντησης' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.deliverable_versions v
       set state = 'approved', answered_at = now(), answered_by = auth.uid(), answer_note = v_note
     where v.deliverable_id = p_id and v.number = v_awaiting;
    update public.deliverables d set approved_at = now(), approved_by = auth.uid() where d.id = p_id;
    return;
  end if;
  if v_note is null then
    raise exception 'Η ζήτηση αλλαγών θέλει σημείωση' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set state = 'changes_requested', answered_at = now(), answered_by = auth.uid(), answer_note = v_note
   where v.deliverable_id = p_id and v.number = v_awaiting;
  update public.deliverables d
     set deadline = authz.add_working_days(public.sales_today(), authz.deliverable_changes_days())
   where d.id = p_id;
end;
$$;

-- Σχόλιο σε σταλμένη Έκδοση, με προαιρετικό χρόνο mm:ss. Ποτέ εσωτερικό.
create function public.deliverable_client_comment(p_id uuid, p_version integer, p_body text, p_at_seconds integer) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
begin
  perform authz.require_client_permission('c.approve');
  perform authz.require_client_deliverable_visible(p_id);
  if exists (select 1 from public.deliverables d where d.id = p_id and d.cancelled_at is not null) then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if length(v_body) = 0 or length(v_body) > 2000 then
    raise exception 'Το σχόλιο θέλει κείμενο έως 2000 χαρακτήρες' using errcode = 'P0001';
  end if;
  if p_at_seconds is not null and p_at_seconds not between 0 and 86399 then
    raise exception 'Ο χρόνος του σχολίου είναι εκτός ορίων' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.deliverable_versions v
                  where v.deliverable_id = p_id and v.number = p_version and v.sent_at is not null) then
    raise exception 'Η Έκδοση δεν βρέθηκε' using errcode = 'P0001';
  end if;
  insert into public.deliverable_comments (deliverable_id, version_number, body, at_seconds, is_internal, created_by)
  values (p_id, p_version, v_body, p_at_seconds, false, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- «Το link δεν ανοίγει» σε σταλμένη Έκδοση. Μία φορά: δεύτερη κλήση δεν αλλάζει τίποτα.
create function public.deliverable_report_link(p_id uuid, p_version integer) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (authz.client_user_has('c.approve') or authz.client_user_has('c.productions')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require_client_deliverable_visible(p_id);
  if not exists (select 1 from public.deliverable_versions v
                  where v.deliverable_id = p_id and v.number = p_version and v.sent_at is not null) then
    raise exception 'Η Έκδοση δεν βρέθηκε' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set link_broken_at = now()
   where v.deliverable_id = p_id and v.number = p_version and v.link_broken_at is null;
end;
$$;

-- «Ζητώ αλλαγή» σε εγκεκριμένο Παραδοτέο. Ένα ανοιχτό Αίτημα τη φορά (Π4).
create function public.deliverable_request_change(p_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_row public.deliverables;
  v_id uuid;
begin
  perform authz.require_client_permission('c.approve');
  perform authz.require_client_deliverable_visible(p_id);
  select * into v_row from public.deliverables d where d.id = p_id for update;
  if v_row.approved_at is null then
    raise exception 'Μόνο εγκεκριμένο Παραδοτέο ζητά αλλαγή μετά την έγκριση' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deliverable_requests r where r.deliverable_id = p_id and r.decision is null) then
    raise exception 'Υπάρχει ήδη ανοιχτό αίτημα για αυτό το Παραδοτέο' using errcode = 'P0001';
  end if;
  if length(v_body) = 0 or length(v_body) > 2000 then
    raise exception 'Το αίτημα θέλει κείμενο έως 2000 χαρακτήρες' using errcode = 'P0001';
  end if;
  insert into public.deliverable_requests (deliverable_id, body, created_by)
  values (p_id, v_body, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- ───────────── Ομάδα: απόφαση Αιτήματος και τελικά αρχεία ─────────────

-- Απόφαση Αιτήματος: «δεκτό ως γύρος» (μετράει), «χρεώνεται» (δεν μετράει, μόνο finance.amounts), «νέο Παραδοτέο».
-- Η δουλειά ξανανοίγει: το Παραδοτέο παίρνει νέα προθεσμία και η Παραγωγή ξανανοίγει αν ήταν παραδομένη.
create function public.deliverable_request_decide(p_request uuid, p_decision text, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_deliverable uuid := (select r.deliverable_id from public.deliverable_requests r where r.id = p_request);
  v_is_owner boolean;
  v_request public.deliverable_requests;
  v_row public.deliverables;
  v_new uuid;
begin
  v_is_owner := exists (select 1 from public.deliverables d join public.productions p on p.id = d.production_id
                         where d.id = v_deliverable and p.owner_id = auth.uid());
  if authz.scope('deliverables.work') is null and not v_is_owner then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_deliverable is null then
    if coalesce(authz.scope('deliverables.work'), '') = 'all' then
      raise exception 'Το αίτημα δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not (v_is_owner or authz.deliverable_in_scope(v_deliverable, 'deliverables.work')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select * into v_request from public.deliverable_requests r where r.id = p_request for update;
  select * into v_row from public.deliverables d where d.id = v_deliverable for update;
  if v_request.decision is not null then
    raise exception 'Το αίτημα έχει ήδη αποφασιστεί' using errcode = 'P0001';
  end if;
  if p_decision is null or p_decision not in ('round', 'charged', 'new_deliverable') then
    raise exception 'Η απόφαση θέλει «δεκτό ως γύρος», «χρεώνεται» ή «νέο Παραδοτέο»' using errcode = 'P0001';
  end if;
  if p_decision = 'charged' and not authz.has('finance.amounts') then
    raise exception 'Το «χρεώνεται» θέλει Δικαίωμα να βλέπεις ποσά' using errcode = '42501';
  end if;
  if v_row.cancelled_at is not null or v_row.approved_at is null then
    raise exception 'Το αίτημα θέλει εγκεκριμένο Παραδοτέο' using errcode = 'P0001';
  end if;
  perform authz.reopen_production_for_work(v_row.production_id);
  if p_decision = 'new_deliverable' then
    v_new := public.deliverable_create(v_row.production_id, v_row.kind_id, v_row.title, v_row.assignee_id, null, 'pending', null);
  else
    update public.deliverables d
       set approved_at = null, approved_by = null,
           deadline = authz.add_working_days(public.sales_today(), authz.deliverable_changes_days())
     where d.id = v_deliverable;
  end if;
  update public.deliverable_requests r
     set decision = p_decision, decided_at = now(), decided_by = auth.uid(),
         decision_note = v_note, new_deliverable_id = v_new
   where r.id = p_request;
end;
$$;

-- Τελικά αρχεία (μόνο εγκεκριμένο). Κενό link: ξαναγυρίζει στο link της εγκεκριμένης Έκδοσης.
create function public.deliverable_final_files_set(p_id uuid, p_url text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := nullif(trim(coalesce(p_url, '')), '');
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  perform 1 from public.deliverables d where d.id = p_id for update;
  if not exists (select 1 from public.deliverables d where d.id = p_id and d.approved_at is not null) then
    raise exception 'Τα τελικά αρχεία ορίζονται μόνο σε εγκεκριμένο Παραδοτέο' using errcode = 'P0001';
  end if;
  if v_url is not null then
    perform authz.deliverable_host(v_url);
  end if;
  update public.deliverables d set final_files_url = v_url where d.id = p_id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Οι νέοι βοηθοί κλειστοί· οι RPC τρέχουν ως ιδιοκτήτης και τους καλούν μέσα τους.
revoke all on function
  authz.deliverable_rounds_used(uuid), authz.deliverable_requests_json(uuid), authz.reopen_production_for_work(uuid),
  authz.email_client_deliverable_version(uuid, integer), authz.require_client_deliverable_visible(uuid),
  authz.client_user_name(uuid, uuid), authz.client_deliverable_state(uuid), authz.client_deliverable_card(uuid),
  authz.client_provisions(uuid), authz.client_group_json(uuid, uuid, jsonb), authz.client_versions_json(uuid, uuid),
  authz.client_final_files_url(uuid), authz.client_open_request_json(uuid), authz.client_deliverable_can(uuid)
  from public, anon, authenticated;

revoke all on function
  public.client_deliverables_view(), public.client_deliverable_view(uuid),
  public.deliverable_client_answer(uuid, boolean, text), public.deliverable_client_comment(uuid, integer, text, integer),
  public.deliverable_report_link(uuid, integer), public.deliverable_request_change(uuid, text),
  public.deliverable_request_decide(uuid, text, text), public.deliverable_final_files_set(uuid, text)
  from public, anon;
grant execute on function
  public.client_deliverables_view(), public.client_deliverable_view(uuid),
  public.deliverable_client_answer(uuid, boolean, text), public.deliverable_client_comment(uuid, integer, text, integer),
  public.deliverable_report_link(uuid, integer), public.deliverable_request_change(uuid, text),
  public.deliverable_request_decide(uuid, text, text), public.deliverable_final_files_set(uuid, text)
  to authenticated;
