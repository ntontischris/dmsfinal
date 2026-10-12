-- Ειδοποιήσεις Kγ (#172), μέρος 3: αρχικοί χρονισμένοι Αυτοματισμοί και μετακόμιση (δέσμη Α3, Α11, Α12).
--
--  • Αρχικοί Αυτοματισμοί για τα dated/waiting Γεγονότα του prototype (Ειδοποιήσεις και email), ενεργοί. Τα κείμενα των τριών
--    email που μεταφέρονται (υπενθύμιση Έκδοσης, ληξιπρόθεσμο, σύνοψη) είναι τα ίδια με τα σημερινά templates.
--  • Οι «μέρες υπενθύμισης πελάτη» (Ρυθμίσεις › Παραδοτέα) γίνονται ένας Αυτοματισμός email ανά μέρα (και μία Ειδοποίηση στον
--    Υπεύθυνο Παραγωγής)· τα «λεπτά σύνοψης» (Ρυθμίσεις › Μηνύματα) γίνονται το wait_minutes της σύνοψης. Οι στήλες σβήνουν
--    μετά την αντιγραφή και φεύγουν από τα RPC. Το 47 παίρνει ως αναμονή τις σημερινές μέρες «χρειάζεται προσοχή» (αντιγραφή:
--    από εδώ και πέρα αλλάζει στον Αυτοματισμό, ενώ η σήμανση της λίστας μένει στις Ρυθμίσεις).
--  • Τα deliverable_reminders_enqueue, invoice_overdue_enqueue και message_digest_enqueue σβήνουν. Καμία διπλή αποστολή την
--    ημέρα του deploy: όσες υπενθυμίσεις και ληξιπρόθεσμα στάλθηκαν ήδη γίνονται σημάδια automation_sends πριν σβηστούν οι
--    πίνακες dedupe· η σύνοψη κρατά τον πίνακα message_digest_marks (ορίζει τα κύματα).
--  • Ακύρωση Τιμολογίου: τα email Αυτοματισμών του που περιμένουν ακόμα δεν φεύγουν (όπως πριν για invoice_overdue).

-- ───────────── Αρχικοί χρονισμένοι Αυτοματισμοί ─────────────

create function authz.seed_timed(
  p_type text, p_channel text, p_kind text, p_target text, p_offset integer, p_time time, p_wait integer,
  p_subject_el text, p_subject_en text, p_el text, p_en text, p_essential boolean, p_sort integer
) returns void
language sql set search_path = ''
as $$
  insert into public.automations (event_type, channel, recipient_kind, recipient_relative, recipient_permission,
                                  timing, offset_days, send_time, wait_minutes, subject_el, subject_en, body_el, body_en,
                                  is_essential, is_enabled, is_initial, sort)
  values (p_type, p_channel, p_kind,
          case when p_kind = 'relative' then p_target end, case when p_kind = 'permission' then p_target end,
          case when p_wait is null then 'offset' else 'wait' end, p_offset, p_time, p_wait,
          p_subject_el, p_subject_en, p_el, p_en, p_essential, true, true, p_sort);
$$;

select authz.seed_timed('proposal.link_expiring', 'notification', 'relative', 'opportunity_owner', -2, '09:00', null, null, null,
  'Ο Σύνδεσμος της πρότασης {proposal} λήγει στις {expiresOn}.', 'The link of the proposal {proposal} expires on {expiresOn}.', false, 1);
select authz.seed_timed('agreement.expiring', 'email', 'relative', 'client', -30, '09:00', null,
  'Η Συμφωνία σας λήγει στις {endOn}', 'Your agreement expires on {endOn}',
  E'Γεια σας {recipientName},\n\nη Συμφωνία {agreement} λήγει στις {endOn}. Θα επικοινωνήσουμε μαζί σας για τη συνέχεια.',
  E'Hello {recipientName},\n\nthe agreement {agreement} expires on {endOn}. We will be in touch about what comes next.', true, 1);
select authz.seed_timed('agreement.expiring', 'notification', 'permission', 'clients.transfer', -30, '09:00', null, null, null,
  'Η Συμφωνία {agreement} του {clientName} λήγει στις {endOn}.', 'The agreement {agreement} with {clientName} expires on {endOn}.', false, 2);
select authz.seed_timed('proposal.expired', 'notification', 'relative', 'opportunity_owner', 1, '09:00', null, null, null,
  'Έληξε η πρόταση {proposal}: Παράταση ή απώλεια;', 'The proposal {proposal} expired: extend it or mark it lost?', false, 1);
select authz.seed_timed('opportunity.next_step_due', 'notification', 'relative', 'opportunity_owner', 1, '09:00', null, null, null,
  'Πέρασε το Επόμενο βήμα της Ευκαιρίας {opportunity}.', 'The next step of the opportunity {opportunity} is overdue.', false, 1);
select authz.seed_timed('period.opening', 'email', 'relative', 'client', 0, '09:00', null,
  'Ξεκινά η νέα σας Περίοδος', 'Your new period starts',
  E'Γεια σας {recipientName},\n\nξεκινά η Περίοδος {period} της Συμφωνίας {agreement}, με {provisions}.',
  E'Hello {recipientName},\n\nperiod {period} of the agreement {agreement} starts, with {provisions}.', false, 1);
select authz.seed_timed('period.opening', 'email', 'relative', 'client', -5, '09:00', null,
  'Κλείστε το επόμενο Γύρισμα', 'Book your next filming',
  E'Γεια σας {recipientName},\n\nσε 5 μέρες, στις {periodStart}, ξεκινά η νέα Περίοδος της Συμφωνίας {agreement}. Κλείστε το Γύρισμά σας από το DMS.',
  E'Hello {recipientName},\n\nin 5 days, on {periodStart}, a new period of the agreement {agreement} starts. Book your filming in the DMS.', false, 2);
select authz.seed_timed('filming.day', 'email', 'relative', 'crew', -1, '17:00', null,
  'Αύριο: Γύρισμα στις {filmingTime}', 'Tomorrow: filming at {filmingTime}',
  E'Υπενθύμιση: αύριο {filmingDate} στις {filmingTime}, {location}.\n\n{filming}',
  E'Reminder: tomorrow {filmingDate} at {filmingTime}, {location}.\n\n{filming}', false, 1);
select authz.seed_timed('filming.day', 'email', 'relative', 'client', -1, '17:00', null,
  'Αύριο: Γύρισμα στις {filmingTime}', 'Tomorrow: filming at {filmingTime}',
  E'Γεια σας {recipientName},\n\nυπενθύμιση: αύριο {filmingDate} στις {filmingTime}, {location}.',
  E'Hello {recipientName},\n\nreminder: tomorrow {filmingDate} at {filmingTime}, {location}.', false, 2);
select authz.seed_timed('filming.not_done', 'notification', 'relative', 'production_owner', null, null, 1440, null, null,
  'Το Γύρισμα {filming} δεν σημειώθηκε ως «έγινε».', 'The filming {filming} was not marked as done.', false, 1);
select authz.seed_timed('filming.approval_waiting', 'notification', 'permission', 'filming.approve', null, null, 1440, null, null,
  'Το Γύρισμα {filming} περιμένει έγκριση.', 'The filming {filming} awaits approval.', false, 1);
select authz.seed_timed('deliverable.deadline', 'notification', 'relative', 'assignee', -2, '09:00', null, null, null,
  'Η προθεσμία του {deliverable} είναι στις {deadline}.', 'The deadline of {deliverable} is on {deadline}.', false, 1);
select authz.seed_timed('deliverable.deadline', 'notification', 'relative', 'assignee', 0, '09:00', null, null, null,
  'Σήμερα είναι η προθεσμία του {deliverable}.', 'Today is the deadline of {deliverable}.', false, 2);
select authz.seed_timed('deliverable.deadline', 'notification', 'relative', 'production_owner', 0, '09:00', null, null, null,
  'Σήμερα είναι η προθεσμία του {deliverable}.', 'Today is the deadline of {deliverable}.', false, 3);

-- 32: μία υπενθύμιση email και μία Ειδοποίηση ανά μέρα των σημερινών Κανόνων Παραδοτέων.
select authz.seed_timed('deliverable.client_waiting', 'email', 'relative', 'client', null, null, d * 1440,
  'Περιμένει την απάντησή σου: {deliverable}', 'Waiting for your answer: {deliverable}',
  E'Γεια σου {recipientName},\n\nη Έκδοση {version} του Παραδοτέου «{deliverable}» για την Παραγωγή «{production}» περιμένει την απάντησή σου.\n\nΈχουν περάσει ' || d || ' μέρες από την αποστολή της.',
  E'Hello {recipientName},\n\nversion {version} of the deliverable “{deliverable}” for the production “{production}” is waiting for your answer.\n\nIt was sent ' || d || ' days ago.',
  false, o::integer)
  from unnest((select s.reminder_days from public.deliverable_settings s where s.id)) with ordinality as x (d, o);
select authz.seed_timed('deliverable.client_waiting', 'notification', 'relative', 'production_owner', null, null, d * 1440, null, null,
  'Η Έκδοση {version} του {deliverable} περιμένει τον πελάτη ' || d || ' μέρες.',
  'Version {version} of {deliverable} has waited for the client ' || d || ' days.', false, 10 + o::integer)
  from unnest((select s.reminder_days from public.deliverable_settings s where s.id)) with ordinality as x (d, o);

select authz.seed_timed('invoice.overdue', 'email', 'relative', 'client', 1, '09:00', null,
  'Ληξιπρόθεσμο τιμολόγιο {invoice}', 'Overdue invoice {invoice}',
  E'Γεια σου {recipientName},\n\nτο τιμολόγιο {invoice} είναι ληξιπρόθεσμο.\n\nΥπόλοιπο: {amount}\n\nΛήξη: {dueOn}\n\nΣτοιχεία πληρωμής: {payment}',
  E'Hello {recipientName},\n\ninvoice {invoice} is overdue.\n\nBalance: {amount}\n\nDue date: {dueOn}\n\nPayment details: {payment}', true, 1);
select authz.seed_timed('invoice.overdue', 'notification', 'permission', 'finance.invoices', 1, '09:00', null, null, null,
  'Ληξιπρόθεσμο Τιμολόγιο {invoice} του {clientName}.', 'Overdue invoice {invoice} of {clientName}.', false, 2);
select authz.seed_timed('holiday.greeting', 'email', 'relative', 'client', 0, '09:00', null,
  'Χρόνια πολλά από την {companyName}', 'Best wishes from {companyName}',
  E'Γεια σας {recipientName},\n\nχρόνια πολλά για {holidayName}!\n\n{companyName}',
  E'Hello {recipientName},\n\nbest wishes for {holidayName}!\n\n{companyName}', false, 1);
select authz.seed_timed('message.unread_waiting', 'email', 'relative', 'self', null, null,
  (select s.digest_minutes from public.message_settings s where s.id),
  'Αδιάβαστα Μηνύματα: {count}', 'Unread messages: {count}',
  E'Γεια σου {recipientName},\n\nη ομάδα έγραψε στη Συνομιλία του Πελάτη {clientName} και δεν τα έχεις διαβάσει ακόμα.\n\nΑπάντησε μέσα από το DMS.',
  E'Hello {recipientName},\n\nthe team wrote in the conversation of {clientName} and you have not read it yet.\n\nPlease reply inside the DMS.', false, 1);
select authz.seed_timed('request.open_waiting', 'notification', 'relative', 'assignee', null, null, s.request_open_days * 1440, null, null,
  'Το Αίτημα «{request}» είναι ανοιχτό ' || s.request_open_days || ' μέρες.',
  'The request "{request}" has been open for ' || s.request_open_days || ' days.', false, 1)
  from public.message_settings s where s.id;

drop function authz.seed_timed(text, text, text, text, integer, time, integer, text, text, text, text, boolean, integer);

-- ───────────── Μετάβαση: ό,τι στάλθηκε ήδη γίνεται σημάδι «μία φορά» ─────────────

insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at)
select a.id, c.case_key, cu.user_id::text, 'email', r.sent_at
  from public.deliverable_reminders r
  join public.deliverable_versions v on v.deliverable_id = r.deliverable_id and v.number = r.version_number
  join public.deliverables d on d.id = v.deliverable_id
  join public.productions p on p.id = d.production_id
  join public.automations a on a.event_type = 'deliverable.client_waiting' and a.channel = 'email' and a.is_initial
                           and a.wait_minutes = r.day * 1440
  join public.client_users cu on cu.client_id = p.client_id
 cross join lateral authz.timed_case('deliverable.client_waiting', 'deliverables', d.id,
                                     'deliverable.client_waiting:' || d.id || ':v' || v.number, p.client_id, '{}'::jsonb, v.sent_at) c
 where v.state = 'awaiting_client' and v.sent_at is not null
on conflict do nothing;

insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at)
select a.id, c.case_key, cu.user_id::text, 'email', n.sent_at
  from public.invoice_overdue_notices n
  join public.invoices i on i.id = n.invoice_id
  join public.automations a on a.event_type = 'invoice.overdue' and a.channel = 'email' and a.is_initial
  join public.client_users cu on cu.client_id = i.client_id
 cross join lateral authz.timed_case('invoice.overdue', 'invoices', i.id, 'invoice.overdue:' || i.id, i.client_id, '{}'::jsonb,
                                     authz.athens_midnight(i.due_date)) c
on conflict do nothing;

-- Η Ειδοποίηση ληξιπρόθεσμου είναι νέα και δεν έχει παράθυρο αναπλήρωσης: όσα Τιμολόγια ήταν ήδη ληξιπρόθεσμα πριν από
-- το deploy σημειώνονται για τους σημερινούς αρμόδιους, ώστε να μην έρθουν όλα μαζί την πρώτη φορά.
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at)
select a.id, c.case_key, u.user_id::text, 'notification', now()
  from authz.invoice_standings(null, null) s
  join public.invoices i on i.id = s.invoice_id
  join public.automations a on a.event_type = 'invoice.overdue' and a.channel = 'notification' and a.is_initial
  join public.team_users u on u.is_active and authz.user_scope(u.user_id, 'finance.invoices') = 'all'
 cross join lateral authz.timed_case('invoice.overdue', 'invoices', i.id, 'invoice.overdue:' || i.id, i.client_id, '{}'::jsonb,
                                     authz.athens_midnight(i.due_date)) c
 where s.remaining > 0 and i.kind <> 'credit' and i.due_date < public.sales_today()
on conflict do nothing;

drop function public.deliverable_reminders_enqueue();
drop function authz.email_client_deliverable_reminder(uuid, integer, integer);
drop function public.invoice_overdue_enqueue(timestamptz);
drop function public.message_digest_enqueue(timestamptz);
drop table public.deliverable_reminders;
drop table public.invoice_overdue_notices;

-- ───────────── Ακύρωση Τιμολογίου: τα email Αυτοματισμών του που περιμένουν δεν φεύγουν ─────────────

create function authz.invoice_voided_cancel() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Από τις εκκρεμείς γραμμές της ουράς (δείκτης email_outbox_pending_idx) προς το σημάδι τους.
  update public.email_outbox o
     set status = 'cancelled', handled_at = now()
   where o.status = 'pending' and o.kind = 'automation'
     and exists (select 1 from public.automation_sends s
                  where s.email_outbox_id = o.id and s.case_key like 'invoice.%'
                    and split_part(s.case_key, ':', 2) = new.id::text);
  return null;
end;
$$;

create trigger invoices_voided_cancel after update of voided_at on public.invoices
  for each row when (old.voided_at is null and new.voided_at is not null) execute function authz.invoice_voided_cancel();

-- ───────────── Ρυθμίσεις › Μηνύματα: χωρίς λεπτά σύνοψης ─────────────

alter table public.message_settings drop column digest_minutes;

create or replace function authz.message_settings_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('editMinutes', s.edit_minutes, 'requestOpenDays', s.request_open_days)
    from public.message_settings s where s.id;
$$;

-- Μερική ενημέρωση: { editMinutes?, requestOpenDays? }. Ισχύουν από εκεί και πέρα. Η σύνοψη αλλάζει στους Αυτοματισμούς.
create or replace function public.message_settings_update(p jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.message_settings;
  v jsonb := coalesce(p, '{}'::jsonb);
  v_edit integer;
  v_days integer;
begin
  perform authz.require('settings.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Οι Ρυθμίσεις Μηνυμάτων θέλουν αντικείμενο' using errcode = 'P0001';
  end if;
  select x.* into s from public.message_settings x where x.id;
  v_edit := authz.message_setting_int(v, 'editMinutes', 'Τα λεπτά διόρθωσης', s.edit_minutes, 1, 1440);
  v_days := authz.message_setting_int(v, 'requestOpenDays', 'Οι μέρες ανοιχτού Αιτήματος', s.request_open_days, 1, 60);
  update public.message_settings x
     set edit_minutes = v_edit, request_open_days = v_days
   where x.id;
end;
$$;

-- Τα λεπτά σύνοψης έρχονται πλέον από τον ενεργό Αυτοματισμό email της σύνοψης (null = κανένας).
create or replace function public.messages_client_context() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
begin
  if v_client is null or not authz.client_user_has('c.chatRead') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'clientId', v_client,
    'canWrite', authz.client_user_has('c.chatWrite'),
    'editMinutes', authz.message_edit_minutes(),
    'digestMinutes', (select min(a.wait_minutes) from public.automations a
                       where a.event_type = 'message.unread_waiting' and a.channel = 'email' and a.is_enabled));
end;
$$;

-- ───────────── Ρυθμίσεις › Παραδοτέα: χωρίς μέρες υπενθύμισης ─────────────

drop trigger deliverable_settings_audit_update on public.deliverable_settings;
alter table public.deliverable_settings drop column reminder_days;
create trigger deliverable_settings_audit_update after update on public.deliverable_settings
  for each row when ((old.internal_review, old.changes_days) is distinct from (new.internal_review, new.changes_days))
  execute function authz.audit_row('id');

drop function authz.deliverable_reminder_days();
drop function authz.deliverable_days(jsonb, text, integer[]);
drop function authz.reminder_days_valid(integer[]);

create or replace function authz.deliverable_defaults_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'internalReview', true,
    'changesDays', 2,
    'kinds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'deadlineDays', case k.code when 'reel' then 5 when 'video' then 10 when 'photo' then 3 when 'podcast_episode' then 5 else 5 end,
        'revisionLimit', case k.code when 'reel' then 2 when 'video' then 2 when 'photo' then 1 when 'podcast_episode' then 1 end
      ) order by k.sort, k.id)
        from public.provision_kinds k where k.measure is null and k.retired_at is null
    ), '[]'::jsonb)
  );
$$;

create or replace function authz.deliverable_settings_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'internalReview', s.internal_review,
    'changesDays', s.changes_days,
    'kinds', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', k.id, 'label', k.label, 'deadlineDays', coalesce(k.deadline_days, 5), 'revisionLimit', k.revision_limit
      ) order by k.sort, k.id), '[]'::jsonb)
        from public.provision_kinds k where k.measure is null and k.retired_at is null
    ),
    'defaults', authz.deliverable_defaults_json()
  )
  from public.deliverable_settings s where s.id;
$$;

-- Μερική ενημέρωση: { internalReview?, changesDays?, kinds? }. Οι υπενθυμίσεις αλλάζουν στους Αυτοματισμούς.
create or replace function public.deliverable_settings_save(p_settings jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.deliverable_settings;
  v jsonb := coalesce(p_settings, '{}'::jsonb);
  v_internal boolean;
  v_changes integer;
begin
  perform authz.require('settings.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Οι Κανόνες Παραδοτέων θέλουν αντικείμενο' using errcode = 'P0001';
  end if;
  select x.* into s from public.deliverable_settings x where x.id;
  v_internal := authz.deliverable_bool(v, 'internalReview', s.internal_review);
  v_changes := authz.deliverable_int(v, 'changesDays', s.changes_days, 0, 30);
  -- Χωρίς αλλαγή στις τιμές της γραμμής δεν γράφεται ούτε Ίχνος.
  if (v_internal, v_changes) is distinct from (s.internal_review, s.changes_days) then
    update public.deliverable_settings x set internal_review = v_internal, changes_days = v_changes where x.id;
  end if;
  if v ? 'kinds' then
    perform authz.save_deliverable_kinds(v -> 'kinds');
  end if;
end;
$$;

-- ───────────── Ίχνος: ολόκληρη η λίστα ─────────────
-- Ξαναγραμμένη από τον ορισμό του 20261015120100_automations.sql, με τον πίνακα holiday_greetings.

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
    -- Εργασίες Παραγωγής (#143): χωρίς ποσά
    when 'production_tasks' then true
    -- Οικονομικά (#150, #151, #152): οι Τρόποι δεν έχουν ποσά· Εισπράξεις, Τιμολογητέα και Τιμολόγια μόνο με «Βλέπει ποσά»
    when 'payment_methods' then true
    when 'receipts' then authz.has('finance.amounts')
    when 'billables' then authz.has('finance.amounts')
    when 'invoices' then authz.has('finance.amounts')
    -- Αιτήματα Μηνυμάτων (#163): το κλείσιμο έχει κείμενο προς τον πελάτη, άρα όπως τα Μηνύματα
    when 'message_requests' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Μηνύματα (#160): περιέχουν κείμενο Συνομιλίας, άρα μόνο όσοι βλέπουν όλες τις Συνομιλίες
    when 'messages' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Ρυθμίσεις Μηνυμάτων (#164): αριθμοί χωρίς κείμενο ή ποσά
    when 'message_settings' then authz.has('audit.view')
    -- Αυτοματισμοί (#170): κείμενα και παραλήπτες, χωρίς ποσά
    when 'automations' then authz.has('automations.manage') or authz.has('audit.view')
    -- Αργίες (#172): ονόματα και ημερομηνίες
    when 'holiday_greetings' then authz.has('automations.manage') or authz.has('audit.view')
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.invoice_voided_cancel() from public, anon, authenticated;
