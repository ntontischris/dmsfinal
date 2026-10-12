-- Ειδοποιήσεις Kγ (#172), μέρος 2: Χρονισμοί «με ημερομηνία» και «αναμονής» (δέσμη Α4, Α5).
--
--  • Χωρίς αποθηκευμένα ραντεβού. Για κάθε συνδεδεμένο dated/waiting Γεγονός υπάρχει μία πηγή (authz.ts_*) που επιστρέφει τις
--    υποψήφιες περιπτώσεις από την ΤΡΕΧΟΥΣΑ κατάσταση της βάσης, ως γραμμές public.events που δεν αποθηκεύονται: entity,
--    entity_id, case_key, client_id, payload και occurred_at = η «άγκυρα».
--      – dated: η ημερομηνία του Γεγονότος (μεσάνυχτα Αθήνας για στήλες date, η ώρα έναρξης για το Γύρισμα).
--      – waiting: από πότε ισχύει η αναμονή· η πηγή επιστρέφει την περίπτωση μόνο όσο η κατάσταση παραμένει.
--    Το case_key τελειώνει με την άγκυρα, άρα μια μετακίνηση (π.χ. Γυρίσματος) δίνει νέα περίπτωση και η παλιά δεν φεύγει.
--  • Ώρα αποστολής: offset = (ημερομηνία Αθήνας της άγκυρας + offset_days) στις send_time Αθήνας· wait = άγκυρα + wait_minutes.
--  • public.automations_scan(p_now): μόνο service_role, κάθε λεπτό από το cron της ουράς, πριν από τον worker. Στέλνει όσες ώρες
--    είναι <= p_now και νεότερες από 36 ώρες (παράθυρο αναπλήρωσης: ένας νέος Αυτοματισμός δεν στέλνει για όλο το παρελθόν).
--    Η παράδοση είναι η ίδια με του στιγμιαίου (authz.ev_recipients + authz.ev_deliver του Kα): φίλτρα, γλώσσα, σημάδι
--    automation_sends (UNIQUE Αυτοματισμός, περίπτωση, παραλήπτης) = μία φορά.
--  • public.automations_upcoming(p_from, p_to): οι προγραμματισμένες αποστολές από τις ίδιες πηγές (για το K3), με πλήθος
--    παραληπτών. service_role, automations.manage ή health.view.
--  • Σύνοψη αδιάβαστων (45): ίδια σημασιολογία με το message_digest_enqueue. Η περίπτωση είναι (Χρήστης πελάτη, Πελάτης, κύμα)·
--    το κύμα = τα Μηνύματα της ομάδας μετά το διάβασμα και μετά το «ως πού» (message_digest_marks). Το «ως πού» προχωρά όταν το
--    κύμα έχει ωριμάσει για όλους τους ενεργούς Αυτοματισμούς του Γεγονότος. Νέος σχετικός παραλήπτης «self».

-- ───────────── Κατάλογος: σύνδεση, μεταβλητές, «self» ─────────────

do $$
declare
  v_name text;
begin
  select c.conname into v_name from pg_constraint c
   where c.conrelid = 'public.event_types'::regclass and c.contype = 'c'
     and pg_get_constraintdef(c.oid) like '%approval_requester%';
  execute format('alter table public.event_types drop constraint %I', v_name);
end;
$$;

alter table public.event_types add constraint event_types_relatives_check
  check (relatives <@ array['client', 'crew', 'actor', 'owner', 'production_owner', 'production_members', 'client_owner',
                            'assignee', 'requester', 'mentioned', 'opportunity_owner', 'approval_requester',
                            'sheet_issuer', 'request_client', 'filming_requester', 'self']);

update public.event_types set relatives = '{self,client,client_owner}' where code = 'message.unread_waiting';
update public.event_types set variables = authz.ev_vars('holidayName') where code = 'holiday.greeting';
update public.event_types set variables = authz.ev_vars('invoice', 'amount', 'dueOn', 'payment') where code = 'invoice.overdue';
update public.event_types set is_wired = true
 where code in ('proposal.link_expiring', 'agreement.expiring', 'proposal.expired', 'opportunity.next_step_due',
                'period.opening', 'filming.day', 'filming.not_done', 'filming.approval_waiting', 'deliverable.deadline',
                'deliverable.client_waiting', 'invoice.overdue', 'holiday.greeting', 'message.unread_waiting',
                'request.open_waiting');

-- ───────────── Παραλήπτες και ορατότητα (event_relative_users από το 20261015130000_automation_emails.sql,
-- event_visible_to από το 20261015120200_events_process.sql) ─────────────

-- Όπως πριν, με το «self»: ο Χρήστης που αφορά η περίπτωση (payload.self_id).
create or replace function authz.event_relative_users(e public.events, p_relative text) returns setof uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_production uuid := authz.ev_uuid(e.payload, 'production_id');
begin
  case p_relative
    when 'client' then
      return query select cu.user_id from public.client_users cu where cu.client_id = e.client_id and cu.removed_at is null;
    when 'actor' then
      return query select e.actor_id where e.actor_id is not null;
    when 'owner' then
      return query select u.user_id from public.team_users u where authz.user_is_owner(u.user_id);
    when 'crew' then
      -- Μετακίνηση που έβγαλε νέα έκδοση Δελτίου στην ίδια συναλλαγή: το Συνεργείο παίρνει μόνο το Δελτίο.
      return query select fc.user_id from public.filming_crew fc
                    where fc.filming_id = authz.ev_uuid(e.payload, 'filming_id')
                      and not (e.type = 'filming.rescheduled'
                               and exists (select 1 from public.filming_sheet_versions v
                                            where v.filming_id = fc.filming_id
                                              and v.issued_at = (e.payload ->> 'txAt')::timestamptz));
    when 'production_owner' then
      return query select * from authz.ev_owner_or_fallback((select p.owner_id from public.productions p where p.id = v_production));
    when 'production_members' then
      return query select p.owner_id from public.productions p where p.id = v_production and p.owner_id is not null
                   union select pm.user_id from public.production_members pm where pm.production_id = v_production;
    when 'client_owner' then
      return query select * from authz.ev_owner_or_fallback((select c.manager_id from public.clients c where c.id = e.client_id));
    when 'opportunity_owner' then
      return query select * from authz.ev_owner_or_fallback(
        (select o.manager_id from public.opportunities o where o.id = authz.ev_uuid(e.payload, 'opportunity_id')));
    when 'assignee' then
      return query select * from authz.ev_owner_or_fallback(authz.ev_assignee(e));
    when 'requester' then
      return query select authz.ev_uuid(e.payload, 'requester_id') where authz.ev_uuid(e.payload, 'requester_id') is not null;
    when 'approval_requester' then
      return query select authz.ev_uuid(e.payload, 'approval_requester_id')
                    where authz.ev_uuid(e.payload, 'approval_requester_id') is not null;
    when 'mentioned' then
      return query select x::uuid from jsonb_array_elements_text(coalesce(e.payload -> 'mentioned_ids', '[]'::jsonb)) x;
    when 'sheet_issuer' then
      return query select * from authz.ev_sheet_issuer(e);
    when 'filming_requester' then
      return query select * from authz.ev_filming_requester(e);
    when 'request_client' then
      return query select * from authz.ev_request_clients(e);
    when 'self' then
      return query select authz.ev_uuid(e.payload, 'self_id') where authz.ev_uuid(e.payload, 'self_id') is not null;
    else
      return;
  end case;
end;
$$;

-- Όπως πριν, με τα Δικαιώματα πελάτη των χρονισμένων: σύνοψη → c.chatRead, Έκδοση που περιμένει → c.approve,
-- Τιμολόγιο → c.finance, Περίοδος → c.agreements ή c.book.
create or replace function authz.event_visible_to(e public.events, p_user uuid, p_is_client boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when e.entity in ('messages', 'message_requests')
         and not exists (select 1 from public.messages m where m.id = e.entity_id and m.deleted_at is null) then false
    when e.entity in ('messages', 'message_requests') and p_is_client then
      authz.ev_client_has(p_user, e.client_id, array['c.chatRead'])
      and (e.type <> 'message.created' or e.payload ->> 'author_kind' = 'team')
    when e.entity in ('messages', 'message_requests') then
      (authz.message_visible_to(p_user, e.entity_id)
       or (e.type = 'message.mentioned' and authz.message_mentionable(p_user)
           and exists (select 1 from public.messages m where m.id = e.entity_id and p_user = any (m.mentions))))
      and (e.type <> 'message.created' or e.payload ->> 'author_kind' = 'client')
    when not p_is_client then true
    when e.type = 'message.unread_waiting' then authz.ev_client_has(p_user, e.client_id, array['c.chatRead'])
    when e.type = 'deliverable.client_waiting' then authz.ev_client_has(p_user, e.client_id, array['c.approve'])
    when e.entity in ('deliverables', 'productions') then authz.ev_client_has(p_user, e.client_id, array['c.productions', 'c.approve'])
    when e.entity = 'filmings' then authz.ev_client_has(p_user, e.client_id, array['c.book', 'c.productions'])
    when e.entity in ('agreements', 'agreement_costs') then authz.ev_client_has(p_user, e.client_id, array['c.agreements'])
    when e.entity = 'agreement_periods' then authz.ev_client_has(p_user, e.client_id, array['c.agreements', 'c.book'])
    when e.entity = 'invoices' then authz.ev_client_has(p_user, e.client_id, array['c.finance'])
    else true
  end;
$$;

-- Προτιμήσεις (ξαναγραμμένο από το 20261015130000_automation_emails.sql): ο «self» της σύνοψης είναι πάντα Χρήστης πελάτη.
create or replace function authz.automation_for_viewer(a public.automations) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when authz.is_team_user() then
      a.recipient_kind not in ('visitor') and coalesce(a.recipient_relative, '') not in ('client', 'request_client', 'filming_requester', 'self')
    else a.recipient_kind = 'relative' and a.recipient_relative in ('client', 'request_client', 'filming_requester', 'self')
  end;
$$;

-- Αποστολή σε έναν παραλήπτη (ξαναγραμμένο από το 20261015130000_automation_emails.sql): ίδιο, με μία προσθήκη. Ένας
-- Χρήστης ομάδας χωρίς «Βλέπει ποσά» δεν παίρνει ποτέ ποσό: οι μεταβλητές amount, payment, margin και cost φεύγουν πριν
-- από την απόδοση (στιγμιαία και χρονισμένα).
create or replace function authz.ev_deliver(
  a public.automations, e public.events, r authz.ev_recipient, p_now timestamptz
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_locale text := case when r.locale = 'en' and length(trim(a.body_en)) > 0 then 'en' else 'el' end;
  v_link text := case when r.is_client then coalesce(e.payload ->> 'client_link', e.payload ->> 'link') else e.payload ->> 'link' end;
  v_vars jsonb := e.payload || jsonb_build_object('recipientName', r.name, 'companyName', authz.ev_company(),
                                                  'link', coalesce(v_link, ''));
  v_label text := (select case v_locale when 'en' then t.label_en else t.label_el end from public.event_types t where t.code = e.type);
  v_allowed text[] := (select t.variables from public.event_types t where t.code = e.type);
  v_subject text;
  v_body text;
  v_send bigint;
  v_ref uuid;
  v_token text;
begin
  if a.channel = 'email' and coalesce(trim(r.email), '') = '' then
    return false;
  end if;
  if not r.is_client and authz.user_scope(r.user_id, 'finance.amounts') is null then
    v_vars := v_vars - array['amount', 'payment', 'margin', 'cost'];
  end if;
  insert into public.automation_sends (automation_id, event_id, case_key, recipient_key, channel, created_at)
  values (a.id, e.id, e.case_key, r.user_id::text, a.channel, p_now)
  on conflict (automation_id, case_key, recipient_key) do nothing
  returning id into v_send;
  if v_send is null then
    return false;
  end if;
  -- Το σημάδι γράφτηκε (μία φορά)· η Ειδοποίηση όμως μπαίνει μία ανά (Γεγονός, Χρήστη), όσοι Αυτοματισμοί κι αν τον βρουν.
  if a.channel = 'notification'
     and exists (select 1 from public.notifications n where n.event_id = e.id and n.user_id = r.user_id) then
    return false;
  end if;
  -- Το θέμα είναι μία γραμμή.
  v_subject := regexp_replace(
    authz.ev_render(coalesce(case v_locale when 'en' then nullif(trim(a.subject_en), '') end, a.subject_el, v_label),
                    v_vars, v_allowed),
    '\s*[\r\n]+\s*', ' ', 'g');
  v_body := authz.ev_render(case v_locale when 'en' then a.body_en else a.body_el end, v_vars, v_allowed);
  if a.channel = 'notification' then
    insert into public.notifications (user_id, client_id, automation_id, event_id, title, body, link, created_at)
    values (r.user_id, e.client_id, a.id, e.id, left(coalesce(nullif(v_subject, ''), v_label), 300), left(v_body, 2000),
            nullif(v_link, ''), p_now)
    returning id into v_ref;
    update public.automation_sends set notification_id = v_ref where id = v_send;
  else
    if not a.is_essential then
      v_token := authz.new_token();
      insert into public.automation_unsubscribes (token_hash, user_id, automation_id)
      values (authz.token_hash(v_token), r.user_id, a.id);
    end if;
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    values ('automation', coalesce(r.name, ''), lower(trim(r.email)), v_locale,
            jsonb_strip_nulls(jsonb_build_object('subject', left(coalesce(nullif(v_subject, ''), v_label), 300),
              'body', left(v_body, 2000), 'link', nullif(v_link, ''), 'automationId', a.id,
              'details', authz.ev_email_details(e, r), 'unsubscribeToken', v_token)))
    returning id into v_ref;
    update public.automation_sends set email_outbox_id = v_ref where id = v_send;
  end if;
  return true;
end;
$$;

-- ───────────── Πλαίσιο των νέων οντοτήτων ─────────────

-- Ποσό σε ευρώ με ελληνική μορφή: 1.234,50 €.
create function authz.ev_money(p numeric) returns text
language sql immutable set search_path = ''
as $$ select replace(replace(replace(to_char(p, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') || ' €'; $$;

create function authz.athens_midnight(p date) returns timestamptz
language sql stable set search_path = ''
as $$ select p::timestamp at time zone 'Europe/Athens'; $$;

create function authz.ev_ctx_opportunity(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', o.client_id, 'opportunity_id', o.id, 'opportunity_owner_id', o.manager_id,
    'clientName', c.name, 'opportunity', o.title, 'owner', authz.ev_team_name(o.manager_id),
    'link', '/app/pipeline/' || o.id))
    from public.opportunities o join public.clients c on c.id = o.client_id
   where o.id = p_id;
$$;

create function authz.ev_ctx_period(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(authz.ev_ctx_agreement(p.agreement_id), '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'period_id', p.id, 'period', p.n::text, 'periodStart', authz.ev_date(p.starts),
    'provisions', coalesce((select string_agg(pp.given || ' ' || k.label, ', ' order by k.sort, k.label)
                              from public.agreement_period_provisions pp join public.provision_kinds k on k.id = pp.kind_id
                             where pp.period_id = p.id), ''),
    'client_link', '/app/book'))
    from public.agreement_periods p
   where p.id = p_id;
$$;

create function authz.ev_ctx_invoice(p_id uuid, p_remaining numeric) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', i.client_id, 'invoice_id', i.id, 'clientName', c.name, 'invoice', i.number,
    'amount', authz.ev_money(p_remaining), 'dueOn', authz.ev_date(i.due_date),
    'payment', (select b.holder || ', ' || b.bank_name || ', IBAN ' || b.iban
                  from public.bank_accounts b where b.is_default and b.retired_at is null limit 1),
    'link', '/app/finance/invoices', 'client_link', '/app/finance/ledger'))
    from public.invoices i join public.clients c on c.id = i.client_id
   where i.id = p_id;
$$;

-- ───────────── Μία περίπτωση (γραμμή events που δεν αποθηκεύεται) ─────────────

create function authz.timed_case(
  p_type text, p_entity text, p_id uuid, p_case text, p_client uuid, p_payload jsonb, p_anchor timestamptz
) returns public.events
language plpgsql stable set search_path = ''
as $$
declare
  e public.events;
begin
  e.type := p_type;
  e.entity := p_entity;
  e.entity_id := p_id;
  e.case_key := p_case || ':' || to_char(p_anchor at time zone 'UTC', 'YYYYMMDD"T"HH24MISS');
  e.payload := coalesce(p_payload, '{}'::jsonb);
  e.client_id := coalesce(p_client, authz.ev_uuid(e.payload, 'client_id'));
  e.occurred_at := p_anchor;
  e.attempts := 0;
  return e;
end;
$$;

-- ───────────── Πηγές: Α (Πωλήσεις και Συμφωνίες) ─────────────

-- 3: ενεργός Σύνδεσμος της τρέχουσας αναθεώρησης, πρόταση σε αποστολή. Άγκυρα: η λήξη της πρότασης.
create function authz.ts_link_expiring(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.agreements a
   cross join lateral authz.timed_case('proposal.link_expiring', 'agreements', a.id, 'proposal.link_expiring:' || a.id || ':r' || a.revision,
                                       null, authz.ev_ctx_agreement(a.id), authz.athens_midnight(a.valid_until)) c
   where a.state = 'proposal' and a.path = 'sent'
     and authz.athens_midnight(a.valid_until) between p_from and p_to
     and exists (select 1 from public.agreement_links l where l.agreement_id = a.id and l.revision = a.revision and l.revoked_at is null);
$$;

-- 10: πρόταση σε αποστολή (ή ήδη σημειωμένη ως ληγμένη). Άγκυρα: η τελευταία μέρα ισχύος· «έληξε» = offset +1.
-- Το στιγμιαίο «proposal_expired» του Ίχνους δεν συνδέεται: γράφεται μόνο όταν κάποιος αγγίξει τη Συμφωνία.
create function authz.ts_proposal_expired(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.agreements a
   cross join lateral authz.timed_case('proposal.expired', 'agreements', a.id, 'proposal.expired:' || a.id || ':r' || a.revision,
                                       null, authz.ev_ctx_agreement(a.id), authz.athens_midnight(a.valid_until)) c
   where a.state = 'proposal' and a.path in ('sent', 'expired')
     and authz.athens_midnight(a.valid_until) between p_from and p_to;
$$;

-- 11: ανοιχτή Ευκαιρία. Άγκυρα: η ημερομηνία του Επόμενου βήματος.
create function authz.ts_next_step(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.opportunities o
   cross join lateral authz.timed_case('opportunity.next_step_due', 'opportunities', o.id, 'opportunity.next_step_due:' || o.id,
                                       o.client_id, authz.ev_ctx_opportunity(o.id), authz.athens_midnight(o.next_step_due)) c
   where o.outcome = 'open' and o.next_step_due is not null
     and authz.athens_midnight(o.next_step_due) between p_from and p_to;
$$;

-- 5: υπογεγραμμένη/ενεργή μηνιαία που λήγει (η αυτόματη συνέχιση δεν λήγει). Άγκυρα: η λήξη.
create function authz.ts_agreement_expiring(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.agreements a
   cross join lateral authz.timed_case('agreement.expiring', 'agreements', a.id, 'agreement.expiring:' || a.id,
                                       null, authz.ev_ctx_agreement(a.id), authz.athens_midnight(a.end_on)) c
   where a.state in ('signed', 'active') and a.kind = 'monthly' and a.renewal = 'new_opportunity' and a.end_on is not null
     and authz.athens_midnight(a.end_on) between p_from and p_to;
$$;

-- ───────────── Πηγές: Β (Περίοδοι και Γυρίσματα) ─────────────

-- 12: Περίοδος υπογεγραμμένης/ενεργής Συμφωνίας που ανοίγει μετά την υπογραφή. Άγκυρα: η έναρξή της (ανά Συμφωνία).
create function authz.ts_period_opening(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.agreement_periods p
    join public.agreements a on a.id = p.agreement_id
   cross join lateral authz.timed_case('period.opening', 'agreement_periods', p.id, 'period.opening:' || p.id,
                                       null, authz.ev_ctx_period(p.id), authz.athens_midnight(p.starts)) c
   where a.state in ('signed', 'active') and p.starts > (a.signed_at at time zone 'Europe/Athens')::date
     and authz.athens_midnight(p.starts) between p_from and p_to;
$$;

-- 16: εγκεκριμένο Γύρισμα. Άγκυρα: η ώρα έναρξης.
create function authz.ts_filming_day(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.filmings f
   cross join lateral authz.timed_case('filming.day', 'filmings', f.id, 'filming.day:' || f.id,
                                       f.client_id, authz.ev_ctx_filming(f.id), f.starts_at) c
   where f.state = 'scheduled' and f.starts_at between p_from and p_to;
$$;

-- 24: εγκεκριμένο Γύρισμα που δεν σημειώθηκε «έγινε». Άγκυρα: η ώρα λήξης του.
create function authz.ts_filming_not_done(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.filmings f
   cross join lateral authz.timed_case('filming.not_done', 'filmings', f.id, 'filming.not_done:' || f.id,
                                       f.client_id, authz.ev_ctx_filming(f.id), f.starts_at + make_interval(mins => (f.hours * 60)::integer)) c
   where f.state = 'scheduled'
     and f.starts_at + make_interval(mins => (f.hours * 60)::integer) between p_from and p_to;
$$;

-- 25: Γύρισμα που αναμένει έγκριση. Άγκυρα: η κράτηση.
create function authz.ts_filming_approval(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.filmings f
   cross join lateral authz.timed_case('filming.approval_waiting', 'filmings', f.id, 'filming.approval_waiting:' || f.id,
                                       f.client_id, authz.ev_ctx_filming(f.id), f.created_at) c
   where f.state = 'pending' and f.created_at between p_from and p_to;
$$;

-- ───────────── Πηγές: Γ (Παραδοτέα) ─────────────

-- 29: Παραδοτέο ανοιχτής Παραγωγής, όχι ακυρωμένο ή εγκεκριμένο. Άγκυρα: η προθεσμία.
create function authz.ts_deliverable_deadline(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.deliverables d
    join public.productions p on p.id = d.production_id
   cross join lateral authz.timed_case('deliverable.deadline', 'deliverables', d.id, 'deliverable.deadline:' || d.id,
                                       p.client_id, authz.ev_ctx_deliverable(d.id), authz.athens_midnight(d.deadline)) c
   where d.cancelled_at is null and d.approved_at is null and p.state = 'open' and d.deadline is not null
     and authz.athens_midnight(d.deadline) between p_from and p_to;
$$;

-- 32: Έκδοση που περιμένει τον πελάτη, σε ανοιχτή Παραγωγή πελάτη. Άγκυρα: η αποστολή της.
create function authz.ts_deliverable_waiting(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.deliverable_versions v
    join public.deliverables d on d.id = v.deliverable_id
    join public.productions p on p.id = d.production_id
   cross join lateral authz.timed_case('deliverable.client_waiting', 'deliverables', d.id,
                                       'deliverable.client_waiting:' || d.id || ':v' || v.number, p.client_id,
                                       authz.ev_ctx_deliverable(d.id) || jsonb_build_object('version', v.number::text), v.sent_at) c
   where v.state = 'awaiting_client' and v.sent_at is not null and d.cancelled_at is null
     and p.state = 'open' and p.client_id is not null
     and v.sent_at between p_from and p_to;
$$;

-- ───────────── Πηγές: Δ, Ε (Τιμολόγια, Αργίες, Μηνύματα, Αιτήματα) ─────────────

-- 37: μη ακυρωμένο Τιμολόγιο με υπόλοιπο (τα ακυρωμένα λείπουν από το invoice_standings). Άγκυρα: η λήξη πληρωμής·
-- «ληξιπρόθεσμο» = offset +1. Το υπόλοιπο είναι το τρέχον.
create function authz.ts_invoice_overdue(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from authz.invoice_standings(null, null) s
    join public.invoices i on i.id = s.invoice_id
   cross join lateral authz.timed_case('invoice.overdue', 'invoices', i.id, 'invoice.overdue:' || i.id,
                                       i.client_id, authz.ev_ctx_invoice(i.id, s.remaining), authz.athens_midnight(i.due_date)) c
   where s.remaining > 0 and i.kind <> 'credit'
     and authz.athens_midnight(i.due_date) between p_from and p_to;
$$;

-- 42: κάθε αργία × κάθε ενεργός ή ανενεργός (όχι υποψήφιος, όχι αρχειοθετημένος) Πελάτης. Άγκυρα: η μέρα της αργίας.
create function authz.ts_holiday(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from authz.holidays_between((p_from at time zone 'Europe/Athens')::date, (p_to at time zone 'Europe/Athens')::date) h
   cross join public.clients cl
   cross join lateral authz.timed_case('holiday.greeting', 'clients', cl.id, 'holiday.greeting:' || cl.id,
                                       cl.id, jsonb_build_object('client_id', cl.id, 'clientName', cl.name, 'holidayName', h.name,
                                                                 'link', '/app/clients/' || cl.id, 'client_link', '/app'),
                                       authz.athens_midnight(h.day)) c
   where cl.archived_at is null and authz.client_status(cl.id) in ('active', 'inactive')
     and authz.athens_midnight(h.day) between p_from and p_to;
$$;

-- 45: για κάθε Χρήστη πελάτη με c.chatRead, το κύμα: Μηνύματα της ομάδας (όχι εσωτερικά, όχι σβησμένα) μετά το διάβασμα
-- και μετά το «ως πού». Άγκυρα: το παλαιότερο του κύματος. payload: count, newest (για το «ως πού»), self_id.
create function authz.ts_message_unread(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.*
    from public.client_users cu
    join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.chatRead'
    join public.clients cl on cl.id = cu.client_id
   cross join lateral (
     select count(*) as cnt, min(m.created_at) as oldest, max(m.created_at) as newest
       from public.messages m
      where m.client_id = cu.client_id and m.author_kind = 'team' and not m.is_internal and m.deleted_at is null
        and m.created_at > greatest(
              coalesce((select r.read_at from public.message_reads r where r.user_id = cu.user_id and r.client_id = cu.client_id), '-infinity'),
              coalesce((select k.upto from public.message_digest_marks k where k.user_id = cu.user_id and k.client_id = cu.client_id), '-infinity'))
   ) n
   cross join lateral authz.timed_case('message.unread_waiting', 'clients', cu.client_id,
                                       'message.unread_waiting:' || cu.client_id || ':' || cu.user_id, cu.client_id,
                                       jsonb_build_object('client_id', cu.client_id, 'self_id', cu.user_id, 'clientName', cl.name,
                                                          'count', n.cnt::text, 'newest', n.newest,
                                                          'link', '/app/messages/' || cu.client_id, 'client_link', '/app/messages'),
                                       n.oldest) c
   where cu.removed_at is null and n.cnt > 0 and n.oldest between p_from and p_to;
$$;

-- 47: ανοιχτό Αίτημα σε μη σβησμένο Μήνυμα. Άγκυρα: η δήλωση.
create function authz.ts_request_open(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.message_requests r
    join public.messages m on m.id = r.message_id
   cross join lateral authz.timed_case('request.open_waiting', 'message_requests', r.message_id, 'request.open_waiting:' || r.message_id,
                                       m.client_id, authz.ev_ctx_request(r.message_id), r.declared_at) c
   where r.state = 'open' and m.deleted_at is null and r.declared_at between p_from and p_to;
$$;

-- ───────────── Από τον Αυτοματισμό στις ώρες ─────────────

create function authz.timed_cases(p_type text, p_from timestamptz, p_to timestamptz) returns setof public.events
language plpgsql stable security definer set search_path = ''
as $$
begin
  case p_type
    when 'proposal.link_expiring' then return query select * from authz.ts_link_expiring(p_from, p_to);
    when 'proposal.expired' then return query select * from authz.ts_proposal_expired(p_from, p_to);
    when 'opportunity.next_step_due' then return query select * from authz.ts_next_step(p_from, p_to);
    when 'agreement.expiring' then return query select * from authz.ts_agreement_expiring(p_from, p_to);
    when 'period.opening' then return query select * from authz.ts_period_opening(p_from, p_to);
    when 'filming.day' then return query select * from authz.ts_filming_day(p_from, p_to);
    when 'filming.not_done' then return query select * from authz.ts_filming_not_done(p_from, p_to);
    when 'filming.approval_waiting' then return query select * from authz.ts_filming_approval(p_from, p_to);
    when 'deliverable.deadline' then return query select * from authz.ts_deliverable_deadline(p_from, p_to);
    when 'deliverable.client_waiting' then return query select * from authz.ts_deliverable_waiting(p_from, p_to);
    when 'invoice.overdue' then return query select * from authz.ts_invoice_overdue(p_from, p_to);
    when 'holiday.greeting' then return query select * from authz.ts_holiday(p_from, p_to);
    when 'message.unread_waiting' then return query select * from authz.ts_message_unread(p_from, p_to);
    when 'request.open_waiting' then return query select * from authz.ts_request_open(p_from, p_to);
    else return;
  end case;
end;
$$;

-- Η ώρα αποστολής ενός Αυτοματισμού για μια άγκυρα (ώρα Ελλάδας, με τις αλλαγές ώρας).
create function authz.timed_due_at(a public.automations, p_anchor timestamptz) returns timestamptz
language sql stable set search_path = ''
as $$
  select case a.timing
    when 'wait' then p_anchor + make_interval(mins => a.wait_minutes)
    when 'offset' then (((p_anchor at time zone 'Europe/Athens')::date + a.offset_days) + a.send_time) at time zone 'Europe/Athens'
  end;
$$;

-- Η αρχή του παραθύρου αναπλήρωσης: 36 ώρες. Το ληξιπρόθεσμο δεν έχει παράθυρο όσο υπάρχει υπόλοιπο (όπως το παλιό
-- enqueue: ένας Χρήστης με c.finance που μπαίνει αργότερα το παίρνει)· το σημάδι κρατά το «μία φορά».
create function authz.timed_window_start(p_type text, p_now timestamptz) returns timestamptz
language sql stable set search_path = ''
as $$ select case when p_type = 'invoice.overdue' then '-infinity'::timestamptz else p_now - interval '36 hours' end; $$;

-- Τα όρια της άγκυρας για ώρες αποστολής στο (p_from, p_to]· για offset με περιθώριο ±2 μέρες.
create function authz.timed_lo(a public.automations, p_from timestamptz) returns timestamptz
language sql stable set search_path = ''
as $$
  select case a.timing when 'wait' then p_from - make_interval(mins => a.wait_minutes)
                       else p_from - make_interval(days => a.offset_days + 2) end;
$$;

create function authz.timed_hi(a public.automations, p_to timestamptz) returns timestamptz
language sql stable set search_path = ''
as $$
  select case a.timing when 'wait' then p_to - make_interval(mins => a.wait_minutes)
                       else p_to - make_interval(days => a.offset_days - 2) end;
$$;

-- Η ώρα αποστολής αν πέφτει στο (p_from, p_to], αλλιώς null. Μια υπενθύμιση «πριν» (offset < 0) φεύγει μόνο αν η μέρα
-- αποστολής (p_at, αλλιώς η ώρα αποστολής) είναι πριν από τη μέρα της άγκυρας: όχι «αύριο» για κάτι που γίνεται σήμερα.
create function authz.timed_match(a public.automations, p_anchor timestamptz, p_from timestamptz, p_to timestamptz, p_at timestamptz)
returns timestamptz
language sql stable set search_path = ''
as $$
  select d.due from (select authz.timed_due_at(a, p_anchor) as due) d
   where d.due > p_from and d.due <= p_to
     and (a.timing <> 'offset' or a.offset_days >= 0
          or (coalesce(p_at, d.due) at time zone 'Europe/Athens')::date < (p_anchor at time zone 'Europe/Athens')::date);
$$;

-- Οι περιπτώσεις ενός Αυτοματισμού με ώρα αποστολής στο (p_from, p_to] (για τα Προγραμματισμένα).
create function authz.timed_due(a public.automations, p_from timestamptz, p_to timestamptz)
returns table (e public.events, due_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c, m.due from authz.timed_cases(a.event_type, authz.timed_lo(a, p_from), authz.timed_hi(a, p_to)) c
   cross join lateral (select authz.timed_match(a, c.occurred_at, p_from, p_to, null) as due) m
   where m.due is not null;
$$;

-- Ενεργοί χρονισμένοι Αυτοματισμοί συνδεδεμένων Γεγονότων.
create function authz.timed_automations() returns setof public.automations
language sql stable security definer set search_path = ''
as $$
  select a.* from public.automations a join public.event_types t on t.code = a.event_type
   where a.is_enabled and a.timing in ('offset', 'wait') and t.is_wired
   order by a.event_type, a.sort, a.created_at, a.id;
$$;

-- Η περίπτωση έχει ήδη σταλεί από αυτόν τον Αυτοματισμό σε προηγούμενο έλεγχο (πάνω από 5 λεπτά πριν): παράλειψη χωρίς
-- υπολογισμό παραληπτών. Όχι για το ληξιπρόθεσμο, που περιμένει και Χρήστες που μπαίνουν αργότερα.
create function authz.timed_done(a public.automations, e public.events, p_now timestamptz) returns boolean
language sql stable security definer set search_path = ''
as $$
  select e.type <> 'invoice.overdue' and exists (
    select 1 from public.automation_sends s
     where s.automation_id = a.id and s.case_key = e.case_key and s.created_at < p_now - interval '5 minutes');
$$;

-- Ο παραλήπτης έχει ήδη πάρει το ίδιο στον ίδιο έλεγχο: μία Ειδοποίηση ανά (περίπτωση, Χρήστη) από όσους Αυτοματισμούς
-- κι αν τον βρουν, και μία ευχή ανά άνθρωπο και αργία ακόμα κι αν είναι Χρήστης δύο Πελατών.
create function authz.timed_duplicate(a public.automations, e public.events, r authz.ev_recipient, p_now timestamptz) returns boolean
language sql stable security definer set search_path = ''
as $$
  select (a.channel = 'notification' and exists (
            select 1 from public.automation_sends s
             where s.case_key = e.case_key and s.recipient_key = r.user_id::text and s.channel = 'notification'
               and s.created_at = p_now and s.automation_id <> a.id))
      or (e.type = 'holiday.greeting' and exists (
            select 1 from public.automation_sends s
             where s.automation_id = a.id and s.recipient_key = r.user_id::text and s.case_key <> e.case_key
               and s.case_key like 'holiday.greeting:%' and right(s.case_key, 15) = right(e.case_key, 15)));
$$;

create index automation_sends_case_recipient_idx on public.automation_sends (case_key, recipient_key);

-- Σύνοψη: το «ως πού» προχωρά στο νεότερο Μήνυμα των κυμάτων που ωρίμασαν για τον Αυτοματισμό email προς τον ίδιο (self).
create function authz.digest_marks_advance(p_now timestamptz) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_wait integer := coalesce((select max(a.wait_minutes) from public.automations a
                               where a.event_type = 'message.unread_waiting' and a.is_enabled and a.channel = 'email'
                                 and a.recipient_kind = 'relative' and a.recipient_relative = 'self'), 0);
begin
  insert into public.message_digest_marks (user_id, client_id, upto)
  select authz.ev_uuid(c.payload, 'self_id'), c.client_id, (c.payload ->> 'newest')::timestamptz
    from authz.ts_message_unread('-infinity', p_now - make_interval(mins => v_wait)) c
  on conflict (user_id, client_id) do update set upto = excluded.upto
    where public.message_digest_marks.upto < excluded.upto;
end;
$$;

-- ───────────── Ο έλεγχος κάθε λεπτού (service_role) ─────────────

-- { sent, failed }. Το p_now (null = τώρα) υπάρχει για τα τεστ. Οι περιπτώσεις ενός Γεγονότος υπολογίζονται μία φορά για
-- όλους τους Αυτοματισμούς του. Σφάλμα σε ένα Γεγονός (ή στο «ως πού» της σύνοψης): καταγράφεται και συνεχίζει.
create function public.automations_scan(p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_type text;
  v_from timestamptz;
  v_lo timestamptz;
  v_hi timestamptz;
  v_cases public.events[];
  a public.automations;
  c public.events;
  r authz.ev_recipient;
  v_sent integer := 0;
  v_failed integer := 0;
begin
  for v_type in select distinct t.event_type from authz.timed_automations() t order by 1 loop
    begin
      v_from := authz.timed_window_start(v_type, v_now);
      select min(authz.timed_lo(t, v_from)), max(authz.timed_hi(t, v_now)) into v_lo, v_hi
        from authz.timed_automations() t where t.event_type = v_type;
      select coalesce(array_agg(x), '{}') into v_cases from authz.timed_cases(v_type, v_lo, v_hi) x;
      for a in select * from authz.timed_automations() t where t.event_type = v_type loop
        for c in select * from unnest(v_cases) u where authz.timed_match(a, u.occurred_at, v_from, v_now, v_now) is not null loop
          continue when authz.timed_done(a, c, v_now);
          for r in select * from authz.ev_recipients(a, c) loop
            if authz.timed_duplicate(a, c, r, v_now) then
              insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at)
              values (a.id, c.case_key, r.user_id::text, a.channel, v_now)
              on conflict do nothing;
            elsif authz.ev_deliver(a, c, r, v_now) then
              v_sent := v_sent + 1;
            end if;
          end loop;
        end loop;
      end loop;
    exception when others then
      v_failed := v_failed + 1;
      raise warning 'automations_scan %: %', v_type, sqlerrm;
    end;
  end loop;
  begin
    perform authz.digest_marks_advance(v_now);
  exception when others then
    v_failed := v_failed + 1;
    raise warning 'automations_scan digest marks: %', sqlerrm;
  end;
  return jsonb_build_object('sent', v_sent, 'failed', v_failed);
end;
$$;

-- ───────────── Προγραμματισμένα (K3) ─────────────

-- [{ automationId, eventType, eventLabel, channel, dueAt, caseKey, entity, entityId, clientId, clientName, link, recipients }]
-- με ώρα στο (p_from, p_to], έως 31 μέρες. Χωρίς ονόματα παραληπτών: μόνο το πλήθος. Η σύνοψη δεν δείχνει caseKey (έχει
-- το id του Χρήστη)· τα Τιμολόγια μόνο σε όσους βλέπουν ποσά ή καταχωρούν Τιμολόγια.
create function public.automations_upcoming(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_service boolean := coalesce(auth.role(), '') = 'service_role';
  v_finance boolean;
begin
  if not v_service and not (authz.has('automations.manage') or authz.has('health.view')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '31 days' then
    raise exception 'Το διάστημα είναι έως 31 μέρες' using errcode = 'P0001';
  end if;
  v_finance := v_service or authz.has('finance.amounts') or authz.has('finance.invoices');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'automationId', a.id, 'eventType', a.event_type, 'eventLabel', t.label_el, 'channel', a.channel,
             'dueAt', x.due_at,
             'caseKey', case when a.event_type = 'message.unread_waiting' then null else (x.e).case_key end,
             'entity', (x.e).entity, 'entityId', (x.e).entity_id,
             'clientId', (x.e).client_id, 'clientName', (x.e).payload ->> 'clientName', 'link', (x.e).payload ->> 'link',
             'recipients', (select count(*) from authz.ev_recipients(a, x.e)))
           order by x.due_at, t.sort, a.sort, (x.e).case_key)
      from authz.timed_automations() a
      join public.event_types t on t.code = a.event_type
     cross join lateral authz.timed_due(a, p_from, p_to) x
     where v_finance or (x.e).entity <> 'invoices'
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.ev_money(numeric), authz.athens_midnight(date), authz.ev_ctx_opportunity(uuid), authz.ev_ctx_period(uuid),
  authz.ev_ctx_invoice(uuid, numeric),
  authz.timed_case(text, text, uuid, text, uuid, jsonb, timestamptz),
  authz.ts_link_expiring(timestamptz, timestamptz), authz.ts_proposal_expired(timestamptz, timestamptz),
  authz.ts_next_step(timestamptz, timestamptz), authz.ts_agreement_expiring(timestamptz, timestamptz),
  authz.ts_period_opening(timestamptz, timestamptz), authz.ts_filming_day(timestamptz, timestamptz),
  authz.ts_filming_not_done(timestamptz, timestamptz), authz.ts_filming_approval(timestamptz, timestamptz),
  authz.ts_deliverable_deadline(timestamptz, timestamptz), authz.ts_deliverable_waiting(timestamptz, timestamptz),
  authz.ts_invoice_overdue(timestamptz, timestamptz), authz.ts_holiday(timestamptz, timestamptz),
  authz.ts_message_unread(timestamptz, timestamptz), authz.ts_request_open(timestamptz, timestamptz),
  authz.timed_cases(text, timestamptz, timestamptz), authz.timed_due_at(public.automations, timestamptz),
  authz.timed_window_start(text, timestamptz), authz.timed_lo(public.automations, timestamptz),
  authz.timed_hi(public.automations, timestamptz),
  authz.timed_match(public.automations, timestamptz, timestamptz, timestamptz, timestamptz),
  authz.timed_due(public.automations, timestamptz, timestamptz), authz.timed_automations(),
  authz.timed_done(public.automations, public.events, timestamptz),
  authz.timed_duplicate(public.automations, public.events, authz.ev_recipient, timestamptz),
  authz.digest_marks_advance(timestamptz), authz.ev_deliver(public.automations, public.events, authz.ev_recipient, timestamptz)
  from public, anon, authenticated;

revoke all on function public.automations_scan(timestamptz) from public, anon, authenticated;
grant execute on function public.automations_scan(timestamptz) to service_role;

revoke all on function public.automations_upcoming(timestamptz, timestamptz) from public, anon;
grant execute on function public.automations_upcoming(timestamptz, timestamptz) to authenticated, service_role;
