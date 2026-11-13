-- Ειδοποιήσεις: σωστοί παραλήπτες και τα έξι Γεγονότα «συνδέεται αργότερα» (L1: c1, c5, b5, b13, d2, d5, e2).
--
-- • c1  Ο Ανατεθειμένος (μοντέρ) μαθαίνει κάθε απάντηση του πελάτη και κάθε σχόλιο του πελάτη σε Έκδοση.
-- • c5  Όποιος μπαίνει στο Συνεργείο Γυρίσματος ειδοποιείται (Ειδοποίηση + email, σβήνεται από τις Προτιμήσεις).
-- • b5  Ο πωλητής μαθαίνει την απόφαση για το αίτημα πρόσβασης σε Πελάτη.
-- • b13 «Άνοιξε την πρόταση» και «Υπογράφηκε η Συμφωνία» ενεργά· η υπογραφή πάει και στον Υπεύθυνο της Ευκαιρίας.
-- • d2  Νέο Τιμολογητέο → όσοι «Εκδίδουν Τιμολόγια», όχι ο Υπεύθυνος Πελάτη.
-- • d5  Είσπραξη → email «Λάβαμε την πληρωμή σας» στον πελάτη (ουρά email_outbox, el/en, μία φορά, με Προτίμηση).
-- • e2  Συνδέονται: φόρμα Ιστοσελίδας, Τιμολογητέο, Είσπραξη, υπέρβαση κόστους, παράδοση χωρίς ώρες, Τιμολογητέο σε αναμονή.
--
-- Ο αριθμός των νέων Γεγονότων είναι ο επόμενος ελεύθερος τη στιγμή της migration (άλλες γραμμές εργασίας μπορεί να
-- προσθέσουν δικά τους)· ο κωδικός μένει το σταθερό κλειδί.

-- ───────────── Νέα Γεγονότα ─────────────

update public.event_types set sort = sort + 1
 where sort > (select t.sort from public.event_types t where t.code = 'deliverable.client_answered');
insert into public.event_types (number, code, grp, kind, label_el, label_en, case_of, variables, relatives,
                                has_visitor, is_cost_only, is_client_facing, is_wired, sort)
select (select max(x.number) + 1 from public.event_types x), 'deliverable.client_commented', 'Γ', 'instant',
       'Ο πελάτης σχολίασε Έκδοση', 'The client commented on a version',
       'η Έκδοση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee', 'comment'),
       '{assignee,production_owner,client_owner}', false, false, false, true, t.sort + 1
  from public.event_types t where t.code = 'deliverable.client_answered';

update public.event_types set sort = sort + 1
 where sort > (select t.sort from public.event_types t where t.code = 'filming.crew_vacated');
insert into public.event_types (number, code, grp, kind, label_el, label_en, case_of, variables, relatives,
                                has_visitor, is_cost_only, is_client_facing, is_wired, sort)
select (select max(x.number) + 1 from public.event_types x), 'filming.crew_assigned', 'Β', 'instant',
       'Μπήκες στο Συνεργείο Γυρίσματος', 'You were added to a filming crew',
       'το μέλος στο Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew', 'member'),
       '{assignee,production_owner}', false, false, false, true, t.sort + 1
  from public.event_types t where t.code = 'filming.crew_vacated';

update public.event_types set sort = sort + 1
 where sort > (select t.sort from public.event_types t where t.code = 'opportunity.next_step_due');
insert into public.event_types (number, code, grp, kind, label_el, label_en, case_of, variables, relatives,
                                has_visitor, is_cost_only, is_client_facing, is_wired, sort)
select (select max(x.number) + 1 from public.event_types x), 'client.access_decided', 'Α', 'instant',
       'Αποφασίστηκε αίτημα πρόσβασης σε Πελάτη', 'An access request for a client was decided',
       'το αίτημα πρόσβασης', authz.ev_vars('decision', 'comment'),
       '{requester}', false, false, false, true, t.sort + 1
  from public.event_types t where t.code = 'opportunity.next_step_due';

-- ───────────── Τα έξι «συνδέεται αργότερα» ─────────────

update public.event_types set is_wired = true
 where code in ('opportunity.form_submitted', 'billable.created', 'receipt.registered', 'production.cost_overrun',
                'production.delivered_without_hours', 'billable.open_waiting');

-- Η Είσπραξη φτάνει και στον πελάτη (d5): με «Βλέπει Οικονομικά» στον Πελάτη.
update public.event_types
   set relatives = '{client,client_owner,actor}', is_client_facing = true, client_permission = 'c.finance',
       variables = authz.ev_vars('receipt', 'amount', 'receivedOn')
 where code = 'receipt.registered';

-- ───────────── c1: σχόλιο πελάτη σε Έκδοση ─────────────
-- Μία περίπτωση ανά Έκδοση: ο πελάτης γράφει συχνά πολλά σχόλια στη σειρά (σημειώσεις με χρόνο)· ο μοντέρ μαθαίνει
-- την πρώτη φορά και τα βλέπει όλα μαζί στην Έκδοση.
create function authz.notify_client_comment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_case text := 'deliverable.client_commented:' || new.deliverable_id || ':v' || new.version_number;
begin
  if new.created_by is null or authz.user_is_team(new.created_by) then
    return null;
  end if;
  if exists (select 1 from public.events e where e.case_key = v_case) then
    return null;
  end if;
  perform authz.emit_event('deliverable.client_commented', 'deliverables', new.deliverable_id, v_case, null,
    jsonb_build_object('version', new.version_number::text, 'comment', authz.ev_excerpt(new.body)));
  return null;
end;
$$;

create trigger deliverable_comments_notify after insert on public.deliverable_comments
  for each row when (not new.is_internal) execute function authz.notify_client_comment();

-- ───────────── c5: μέλος στο Συνεργείο ─────────────
-- Μόνο για Γύρισμα που περιμένει ή είναι προγραμματισμένο και δεν έχει περάσει.
create function authz.notify_crew_assigned() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.filmings f
                  where f.id = new.filming_id and f.state in ('pending', 'scheduled') and f.starts_at >= now()) then
    return null;
  end if;
  perform authz.emit_event('filming.crew_assigned', 'filmings', new.filming_id,
    'filming.crew_assigned:' || new.filming_id || ':' || new.user_id || ':' || extract(epoch from new.added_at)::bigint,
    null,
    jsonb_build_object('assignee_id', new.user_id, 'member', authz.ev_team_name(new.user_id),
                       'link', '/app/filming/mine'));
  return null;
end;
$$;

create trigger filming_crew_notify after insert on public.filming_crew
  for each row execute function authz.notify_crew_assigned();

-- ───────────── b5: απόφαση για αίτημα πρόσβασης ─────────────
create function authz.notify_access_decided() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.emit_event('client.access_decided', 'access_requests', new.id, null, new.client_id,
    jsonb_build_object(
      'client_id', new.client_id, 'requester_id', new.requester_id,
      'clientName', (select c.name from public.clients c where c.id = new.client_id),
      'decision', case new.status when 'approved' then 'εγκρίθηκε' else 'απορρίφθηκε' end,
      'comment', coalesce(nullif(btrim(new.decision_comment), ''), '—'),
      'link', case
        when new.status = 'approved' and new.opportunity_id is not null then '/app/pipeline/' || new.opportunity_id
        when new.status = 'approved' then '/app/clients/' || new.client_id
        else '/app/pipeline' end));
  return null;
end;
$$;

create trigger access_requests_notify after update of status on public.access_requests
  for each row when (old.status = 'pending' and new.status in ('approved', 'rejected'))
  execute function authz.notify_access_decided();

-- ───────────── d2: νέο Τιμολογητέο ─────────────
create function authz.notify_billable_created() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.emit_event('billable.created', 'billables', new.id, null, new.client_id,
    jsonb_build_object(
      'client_id', new.client_id,
      'clientName', (select c.name from public.clients c where c.id = new.client_id),
      'billable', new.label, 'amount', authz.ev_money(new.net),
      'link', '/app/finance/to-invoice'));
  return null;
end;
$$;

create trigger billables_notify after insert on public.billables
  for each row execute function authz.notify_billable_created();

-- ───────────── d5: Είσπραξη ─────────────
create function authz.notify_receipt_registered() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.emit_event('receipt.registered', 'receipts', new.id, null, new.client_id,
    jsonb_build_object(
      'client_id', new.client_id,
      'clientName', (select c.name from public.clients c where c.id = new.client_id),
      'receipt', authz.ev_date(new.received_on) || ' · ' || authz.ev_money(new.amount),
      'amount', authz.ev_money(new.amount), 'receivedOn', authz.ev_date(new.received_on),
      'link', '/app/finance/receipts', 'client_link', '/app/finance/ledger'));
  return null;
end;
$$;

create trigger receipts_notify after insert on public.receipts
  for each row execute function authz.notify_receipt_registered();

-- ───────────── e2: κόστος Παραγωγής ─────────────

-- Τα κοινά στοιχεία των δύο Γεγονότων κόστους, από τη γραμμή της οθόνης G3.
create function authz.ev_cost_payload(p_production uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_row jsonb := authz.production_cost_row(p_production);
  v_price numeric := nullif(v_row #>> '{estimate,price}', '')::numeric;
  v_cost numeric := nullif(v_row #>> '{actual,cost}', '')::numeric;
begin
  return jsonb_build_object(
    'cost', coalesce(authz.ev_money(v_cost), '—'),
    'margin', case when v_price > 0 and v_cost is not null
                   then round((v_price - v_cost) / v_price * 100)::text || '%' else '—' end,
    'proposal', coalesce((select a.title from public.productions p join public.agreements a on a.id = p.agreement_id
                           where p.id = p_production), '—'),
    'link', '/app/productions/costs');
end;
$$;

-- Υπέρβαση (ώρες πάνω από το όριο, ή χαμηλό περιθώριο με ολοκληρωμένες ώρες): μία φορά ανά Παραγωγή.
create function authz.notify_cost_overrun() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_case text := 'production.cost_overrun:' || new.production_id;
  v_row jsonb;
begin
  if exists (select 1 from public.productions p where p.id = new.production_id and p.state = 'cancelled')
     or exists (select 1 from public.events e where e.case_key = v_case) then
    return null;
  end if;
  v_row := authz.production_cost_row(new.production_id);
  if coalesce((v_row #>> '{signals,overrun}')::boolean, false)
     or (coalesce((v_row #>> '{signals,lowMargin}')::boolean, false) and coalesce((v_row ->> 'hoursComplete')::boolean, false)) then
    perform authz.emit_event('production.cost_overrun', 'productions', new.production_id, v_case, null,
      authz.ev_cost_payload(new.production_id));
  end if;
  return null;
end;
$$;

create trigger production_costs_notify after update on public.production_costs
  for each row when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.notify_cost_overrun();

-- Παράδοση χωρίς επιβεβαιωμένες ώρες γυρίσματος και μοντάζ.
create function authz.notify_delivered_without_hours() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce((authz.production_cost_row(new.id) ->> 'hoursComplete')::boolean, true) then
    return null;
  end if;
  perform authz.emit_event('production.delivered_without_hours', 'productions', new.id,
    'production.delivered_without_hours:' || new.id || ':' || coalesce(extract(epoch from new.delivered_at)::bigint::text, ''),
    null, authz.ev_cost_payload(new.id));
  return null;
end;
$$;

create trigger productions_notify_hours after update of state on public.productions
  for each row when (new.state = 'delivered' and old.state is distinct from 'delivered')
  execute function authz.notify_delivered_without_hours();

-- ───────────── e2: φόρμα της Ιστοσελίδας ─────────────
-- Μόνο όσα έρχονται από τη φόρμα (server code χωρίς Χρήστη)· όχι όταν κάποιος της ομάδας διαλέγει Πηγή «Ιστοσελίδα».
create function authz.notify_form_submitted() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (auth.uid() is not null and authz.user_is_team(auth.uid()))
     or not exists (select 1 from public.sales_sources s where s.id = new.source_id and s.code = 'web') then
    return null;
  end if;
  perform authz.emit_event('opportunity.form_submitted', 'opportunities', new.id, null, new.client_id,
    authz.ev_ctx_opportunity(new.id));
  return null;
end;
$$;

create trigger opportunities_notify_form after insert on public.opportunities
  for each row execute function authz.notify_form_submitted();

-- ───────────── e2: Τιμολογητέο σε αναμονή (πηγή με χρόνο) ─────────────
-- Κάθε ανοιχτό Τιμολογητέο. Άγκυρα: η μέρα που έγινε τιμολογητέο· η αναμονή του Αυτοματισμού μετρά από εκεί.
create function authz.ts_billable_open(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from authz.billables_open(public.sales_today()) b
   cross join lateral authz.timed_case('billable.open_waiting', 'billables', b.id, 'billable.open_waiting:' || b.id,
                                       b.client_id,
                                       jsonb_build_object('client_id', b.client_id, 'clientName', b.client_name,
                                                          'billable', b.label, 'amount', authz.ev_money(b.open_amount),
                                                          'days', b.days_open::text, 'link', '/app/finance/to-invoice'),
                                       authz.athens_midnight(b.billable_on)) c
   where authz.athens_midnight(b.billable_on) between p_from and p_to;
$$;

-- Όπως το 20261018120000 (τελευταίος ορισμός), και το Τιμολογητέο σε αναμονή.
create or replace function authz.timed_cases(p_type text, p_from timestamptz, p_to timestamptz) returns setof public.events
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
    when 'subscription.renewing' then return query select * from authz.ts_subscription_renewing(p_from, p_to);
    when 'billable.open_waiting' then return query select * from authz.ts_billable_open(p_from, p_to);
    else return;
  end case;
end;
$$;

-- ───────────── Ορατότητα: σβησμένη Είσπραξη δεν ειδοποιεί κανέναν ─────────────
-- Όπως το 20261018120000 (τελευταίος ορισμός, plpgsql από το 20261106100000), και η σβησμένη Είσπραξη.
create or replace function authz.event_visible_to(e public.events, p_user uuid, p_is_client boolean) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  return (select case
    when e.entity = 'receipts'
         and not exists (select 1 from public.receipts r where r.id = e.entity_id and r.deleted_at is null) then false
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
    when e.entity = 'subscriptions' then not p_is_client and authz.user_is_owner(p_user)
    when not p_is_client then true
    when e.type = 'message.unread_waiting' then authz.ev_client_has(p_user, e.client_id, array['c.chatRead'])
    when e.type = 'deliverable.client_waiting' then authz.ev_client_has(p_user, e.client_id, array['c.approve'])
    when e.entity in ('deliverables', 'productions') then authz.ev_client_has(p_user, e.client_id, array['c.productions', 'c.approve'])
    when e.entity = 'filmings' then authz.ev_client_has(p_user, e.client_id, array['c.book', 'c.productions'])
    when e.entity in ('agreements', 'agreement_costs') then authz.ev_client_has(p_user, e.client_id, array['c.agreements'])
    when e.entity = 'agreement_periods' then authz.ev_client_has(p_user, e.client_id, array['c.agreements', 'c.book'])
    when e.entity = 'invoices' then authz.ev_client_has(p_user, e.client_id, array['c.finance'])
    when e.entity = 'receipts' then authz.ev_client_has(p_user, e.client_id, array['c.finance'])
    else true
  end);
end;
$$;

-- ───────────── Αρχικοί Αυτοματισμοί ─────────────

-- b13: ενεργοί, όσοι δεν τους άγγιξε ακόμη διαχειριστής.
update public.automations set is_enabled = true
 where is_initial and updated_by is null and not is_enabled
   and event_type in ('proposal.link_opened', 'agreement.signed');

insert into public.automations (event_type, channel, recipient_kind, recipient_relative, recipient_permission,
                                subject_el, subject_en, body_el, body_en, is_essential, is_enabled, is_initial, sort,
                                timing, wait_minutes)
values
  -- c1
  ('deliverable.client_answered', 'notification', 'relative', 'assignee', null, null, null,
   'Ο {clientName} απάντησε στην Έκδοση {version} του {deliverable}.', '{clientName} answered version {version} of {deliverable}.',
   false, true, true, 2, 'immediate', null),
  ('deliverable.client_commented', 'notification', 'relative', 'assignee', null, null, null,
   'Ο {clientName} σχολίασε την Έκδοση {version} του {deliverable}: {comment}', '{clientName} commented on version {version} of {deliverable}: {comment}',
   false, true, true, 1, 'immediate', null),
  ('deliverable.client_commented', 'notification', 'relative', 'production_owner', null, null, null,
   'Ο {clientName} σχολίασε την Έκδοση {version} του {deliverable}: {comment}', '{clientName} commented on version {version} of {deliverable}: {comment}',
   false, true, true, 2, 'immediate', null),
  -- c5
  ('filming.crew_assigned', 'notification', 'relative', 'assignee', null, null, null,
   'Μπήκες στο Συνεργείο: {filming}, {filmingDate} στις {filmingTime}.', 'You are on the crew: {filming}, {filmingDate} at {filmingTime}.',
   false, true, true, 1, 'immediate', null),
  ('filming.crew_assigned', 'email', 'relative', 'assignee', null,
   'Μπήκες στο Συνεργείο · {filming}', 'You are on the crew · {filming}',
   E'Γεια σου {recipientName},\n\nΜπήκες στο Συνεργείο του Γυρίσματος {filming}: {filmingDate} στις {filmingTime}.\nΤοποθεσία: {location}\nΣυνεργείο: {crew}',
   E'Hello {recipientName},\n\nYou are on the crew of the filming {filming}: {filmingDate} at {filmingTime}.\nLocation: {location}\nCrew: {crew}',
   false, true, true, 10, 'immediate', null),
  -- b5
  ('client.access_decided', 'notification', 'relative', 'requester', null, null, null,
   'Το αίτημά σου για τον {clientName} {decision}. {comment}', 'Your request for {clientName}: {decision}. {comment}',
   false, true, true, 1, 'immediate', null),
  -- b13
  ('agreement.signed', 'notification', 'relative', 'opportunity_owner', null, null, null,
   'Υπογράφηκε η Συμφωνία {agreement} του {clientName}.', 'The agreement {agreement} with {clientName} was signed.',
   false, true, true, 2, 'immediate', null),
  -- d2
  ('billable.created', 'notification', 'permission', null, 'finance.invoices', null, null,
   'Νέο Τιμολογητέο: {billable} ({clientName}) · {amount}.', 'New billable: {billable} ({clientName}) · {amount}.',
   false, true, true, 1, 'immediate', null),
  -- d5
  ('receipt.registered', 'email', 'relative', 'client', null,
   'Λάβαμε την πληρωμή σας', 'We received your payment',
   E'Γεια σου {recipientName},\n\nΛάβαμε την πληρωμή σας ύψους {amount} στις {receivedOn}. Σας ευχαριστούμε!',
   E'Hello {recipientName},\n\nWe received your payment of {amount} on {receivedOn}. Thank you!',
   false, true, true, 10, 'immediate', null),
  ('receipt.registered', 'notification', 'relative', 'client_owner', null, null, null,
   'Ο {clientName} πλήρωσε ({receivedOn}).', '{clientName} paid ({receivedOn}).',
   false, true, true, 1, 'immediate', null),
  -- e2
  ('opportunity.form_submitted', 'notification', 'relative', 'opportunity_owner', null, null, null,
   'Νέα Ευκαιρία από τη φόρμα της Ιστοσελίδας: {clientName} · {opportunity}.', 'New opportunity from the website form: {clientName} · {opportunity}.',
   false, true, true, 1, 'immediate', null),
  ('production.cost_overrun', 'notification', 'permission', null, 'finance.cost', null, null,
   'Υπέρβαση κόστους στην Παραγωγή {production}: κόστος {cost}, περιθώριο {margin}.', 'Cost overrun on {production}: cost {cost}, margin {margin}.',
   false, true, true, 1, 'immediate', null),
  ('production.delivered_without_hours', 'notification', 'relative', 'production_owner', null, null, null,
   'Η Παραγωγή {production} παραδόθηκε χωρίς επιβεβαιωμένες ώρες. Γράψε τις πραγματικές ώρες.',
   '{production} was delivered without confirmed hours. Record the actual hours.',
   false, true, true, 1, 'immediate', null),
  ('production.delivered_without_hours', 'notification', 'permission', null, 'finance.cost', null, null,
   'Η Παραγωγή {production} παραδόθηκε χωρίς επιβεβαιωμένες ώρες.', '{production} was delivered without confirmed hours.',
   false, true, true, 2, 'immediate', null),
  ('billable.open_waiting', 'notification', 'permission', null, 'finance.invoices', null, null,
   'Το Τιμολογητέο {billable} ({clientName}) περιμένει τιμολόγηση {days} μέρες · {amount}.',
   'The billable {billable} ({clientName}) has waited {days} days for an invoice · {amount}.',
   false, true, true, 1, 'wait', 10080);

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.notify_client_comment(), authz.notify_crew_assigned(), authz.notify_access_decided(),
  authz.notify_billable_created(), authz.notify_receipt_registered(), authz.ev_cost_payload(uuid),
  authz.notify_cost_overrun(), authz.notify_delivered_without_hours(), authz.notify_form_submitted(),
  authz.ts_billable_open(timestamptz, timestamptz)
  from public, anon, authenticated;
