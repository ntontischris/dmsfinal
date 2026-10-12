-- Ειδοποιήσεις Kα (#170), μέρος 2: Αυτοματισμοί, Προτιμήσεις, Ειδοποιήσεις και σημάδι «μία φορά» (δέσμη Α3, Α5, Α6, Α10).
--
--  • Ένας Αυτοματισμός = Γεγονός + κανάλι + ένας τρόπος παραληπτών + χρονισμός + κείμενο el/en. Οι στήλες χρονισμού
--    υπάρχουν από τώρα (Kγ)· ο επεξεργαστής του Kα εκτελεί μόνο timing = 'immediate'.
--  • Παραλήπτες «σε σχέση με το Γεγονός» μόνο από τη λίστα του Γεγονότος (event_types.relatives)· Επισκέπτης μόνο σε Γεγονός
--    με Επισκέπτη· Δικαίωμα μόνο υπαρκτό (FK). Ο χρονισμός ακολουθεί το είδος του Γεγονότος.
--  • Αρχικοί Αυτοματισμοί Ειδοποίησης για τα στιγμιαία, συνδεδεμένα Γεγονότα με Ειδοποίηση στο prototype. Ενεργοί όταν το
--    Γεγονός ζητά ενέργεια από τον παραλήπτη, κλειστοί όταν είναι απλή ενημέρωση (Α3). Το «→ Διαχείριση» γίνεται Δικαίωμα.
--    Αρχικός Αυτοματισμός email δεν γράφεται εδώ (Kβ, Kγ).
--  • automation_sends: UNIQUE (Αυτοματισμός, περίπτωση, παραλήπτης) = «μία φορά» (Α5).
--  • Προτιμήσεις (Α10): ο Χρήστης πελάτη σβήνει μόνο μη απαραίτητους· η ομάδα ό,τι θέλει. Μόνο βάση (UI στο Kδ).
--  • Πίνακες κλειστοί (RLS χωρίς policies, revoke). Πρόσβαση μόνο από RPC.

-- ───────────── Πίνακες ─────────────

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  event_type text not null references public.event_types (code),
  channel text not null check (channel in ('notification', 'email')),
  recipient_kind text not null check (recipient_kind in ('relative', 'permission', 'users', 'visitor')),
  recipient_relative text,
  recipient_permission text references public.permissions (code),
  recipient_user_ids uuid[] not null default '{}',
  timing text not null default 'immediate' check (timing in ('immediate', 'offset', 'wait')),
  offset_days integer check (offset_days is null or offset_days between -365 and 365),
  -- Ώρα Ελλάδας (Α4).
  send_time time,
  wait_minutes integer check (wait_minutes is null or wait_minutes between 1 and 525600),
  subject_el text check (subject_el is null or length(subject_el) between 1 and 300),
  subject_en text check (subject_en is null or length(subject_en) <= 300),
  body_el text not null check (length(trim(body_el)) between 1 and 2000),
  body_en text not null default '' check (length(body_en) <= 2000),
  is_essential boolean not null default false,
  is_enabled boolean not null default true,
  is_initial boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((recipient_kind = 'relative') = (recipient_relative is not null)),
  check ((recipient_kind = 'permission') = (recipient_permission is not null)),
  check ((recipient_kind = 'users') = (cardinality(recipient_user_ids) > 0)),
  check ((timing = 'offset') = (offset_days is not null and send_time is not null)),
  check ((timing = 'wait') = (wait_minutes is not null)),
  check (timing = 'offset' or (offset_days is null and send_time is null)),
  check (channel <> 'email' or subject_el is not null)
);

create index automations_event_idx on public.automations (event_type) where is_enabled;

create table public.automation_optouts (
  user_id uuid not null references auth.users (id),
  automation_id uuid not null references public.automations (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, automation_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  -- Το πλαίσιο: ο Πελάτης του Γεγονότος (για Χρήστη πελάτη σε πολλούς Πελάτες).
  client_id uuid references public.clients (id),
  automation_id uuid references public.automations (id) on delete set null,
  event_id bigint references public.events (id) on delete set null,
  title text not null check (length(title) between 1 and 300),
  body text not null check (length(body) <= 2000),
  link text check (link is null or link ~ '^/app(/|\?|$)' or link ~ '^https://[^[:space:]]+$'),
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_event_user_idx on public.notifications (event_id, user_id);
create index notifications_created_idx on public.notifications (created_at);

create table public.automation_sends (
  id bigint generated always as identity primary key,
  automation_id uuid not null references public.automations (id) on delete cascade,
  event_id bigint references public.events (id) on delete set null,
  case_key text not null,
  -- user_id ή email (Επισκέπτης).
  recipient_key text not null,
  channel text not null check (channel in ('notification', 'email')),
  notification_id uuid references public.notifications (id) on delete set null,
  email_outbox_id uuid references public.email_outbox (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (automation_id, case_key, recipient_key)
);

alter table public.automations enable row level security;
alter table public.automation_optouts enable row level security;
alter table public.notifications enable row level security;
alter table public.automation_sends enable row level security;

-- ───────────── Email: το γενικό kind των Αυτοματισμών ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined', 'deliverable_version_sent',
                  'production_delivered', 'deliverable_reminder', 'invoice_registered', 'invoice_overdue',
                  'message_digest', 'request_closed', 'automation'));

-- ───────────── Συνέπεια Αυτοματισμού με το Γεγονός ─────────────

create function authz.automations_guard() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  t public.event_types;
begin
  select * into t from public.event_types x where x.code = new.event_type;
  if new.recipient_kind = 'relative' and not (new.recipient_relative = any (t.relatives)) then
    raise exception 'Ο παραλήπτης «%» δεν ταιριάζει σε αυτό το Γεγονός', new.recipient_relative using errcode = 'P0001';
  end if;
  if new.recipient_kind = 'visitor' and not t.has_visitor then
    raise exception 'Ο Επισκέπτης υπάρχει μόνο σε Γεγονότα με Επισκέπτη' using errcode = 'P0001';
  end if;
  if new.timing <> (case t.kind when 'instant' then 'immediate' when 'dated' then 'offset' else 'wait' end) then
    raise exception 'Ο χρονισμός δεν ταιριάζει στο είδος του Γεγονότος' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger automations_guard before insert or update on public.automations
  for each row execute function authz.automations_guard();

create trigger automations_audit after insert or delete on public.automations
  for each row execute function authz.audit_row('id');
create trigger automations_audit_update after update on public.automations
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

-- ───────────── Αρχικοί Αυτοματισμοί Ειδοποίησης ─────────────

create function authz.seed_note(
  p_type text, p_kind text, p_target text, p_enabled boolean, p_el text, p_en text, p_sort integer,
  p_essential boolean default false
) returns void
language sql set search_path = ''
as $$
  insert into public.automations (event_type, channel, recipient_kind, recipient_relative, recipient_permission,
                                  body_el, body_en, is_essential, is_enabled, is_initial, sort)
  values (p_type, 'notification', p_kind,
          case when p_kind = 'relative' then p_target end, case when p_kind = 'permission' then p_target end,
          p_el, p_en, p_essential, p_enabled, true, p_sort);
$$;

select authz.seed_note('proposal.link_opened', 'relative', 'opportunity_owner', false,
  'Ο {clientName} άνοιξε την πρόταση {proposal}.', '{clientName} opened the proposal {proposal}.', 1);
select authz.seed_note('agreement.signed', 'permission', 'productions.manage', false,
  'Υπογράφηκε η Συμφωνία {agreement} του {clientName}.', 'The agreement {agreement} with {clientName} was signed.', 1);
select authz.seed_note('proposal.approval_requested', 'permission', 'agreements.deviate', true,
  'Ζητήθηκε Έγκριση για την πρόταση {proposal} ({clientName}).', 'Approval was requested for the proposal {proposal} ({clientName}).', 1);
select authz.seed_note('proposal.approval_decided', 'relative', 'opportunity_owner', true,
  'Απαντήθηκε η Έγκριση της πρότασης {proposal}.', 'The approval for the proposal {proposal} was answered.', 1);
select authz.seed_note('proposal.changes_requested', 'relative', 'opportunity_owner', true,
  'Ο {clientName} ζήτησε αλλαγές στην πρόταση {proposal}.', '{clientName} asked for changes to the proposal {proposal}.', 1);
select authz.seed_note('proposal.declined', 'relative', 'opportunity_owner', true,
  'Ο {clientName} απέρριψε την πρόταση {proposal}.', '{clientName} declined the proposal {proposal}.', 1);
select authz.seed_note('filming.booked', 'permission', 'filming.approve', true,
  'Ο {clientName} έκλεισε Γύρισμα στις {filmingDate} {filmingTime}. Αναμένει έγκριση.',
  '{clientName} booked a filming on {filmingDate} {filmingTime}. It awaits approval.', 1);
select authz.seed_note('filming.google_deleted', 'permission', 'calendar.google', true,
  'Το Γύρισμα {filming} διαγράφηκε από το Google. Επαναφορά ή Επιβεβαίωση με λόγο.',
  'The filming {filming} was deleted in Google. Restore it or confirm with a reason.', 1);
select authz.seed_note('filming.google_move_rejected', 'permission', 'calendar.google', false,
  'Η μετακίνηση του Γυρίσματος {filming} στο Google απορρίφθηκε.', 'The move of the filming {filming} in Google was rejected.', 1);
select authz.seed_note('filming.cancel_requested', 'permission', 'filming.approve', true,
  'Ο {clientName} ζητά ακύρωση μετά το Όριο για το Γύρισμα {filming}.',
  '{clientName} asks to cancel the filming {filming} after the limit.', 1);
select authz.seed_note('filming.crew_declined', 'relative', 'production_owner', true,
  'Ο/Η {member} δεν μπορεί στο Γύρισμα {filming}.', '{member} cannot make the filming {filming}.', 1);
select authz.seed_note('deliverable.assigned', 'relative', 'assignee', true,
  'Σου ανατέθηκε: {deliverable} ({production}).', 'Assigned to you: {deliverable} ({production}).', 1);
select authz.seed_note('deliverable.client_answered', 'relative', 'production_owner', true,
  'Ο {clientName} απάντησε στην Έκδοση {version} του {deliverable}.', '{clientName} answered version {version} of {deliverable}.', 1);
select authz.seed_note('deliverable.review_pending', 'permission', 'deliverables.review', true,
  'Η Έκδοση {version} του {deliverable} περιμένει έλεγχο.', 'Version {version} of {deliverable} awaits review.', 1);
select authz.seed_note('deliverable.limit_exceeded', 'relative', 'production_owner', false,
  'Το {deliverable} ξεπέρασε το Όριο αλλαγών.', '{deliverable} exceeded the change limit.', 1);
select authz.seed_note('deliverable.change_requested', 'relative', 'client_owner', true,
  'Αίτημα αλλαγής μετά την έγκριση: {deliverable}.', 'Change request after approval: {deliverable}.', 1);
select authz.seed_note('deliverable.review_returned', 'relative', 'assignee', true,
  'Η Έκδοση {version} του {deliverable} επιστράφηκε από τον έλεγχο.', 'Version {version} of {deliverable} was returned by review.', 1);
select authz.seed_note('deliverable.link_broken', 'relative', 'assignee', true,
  'Ο {clientName} λέει ότι το link του {deliverable} δεν ανοίγει.', '{clientName} says the link of {deliverable} does not open.', 1);
select authz.seed_note('deliverable.link_broken', 'relative', 'production_owner', true,
  'Ο {clientName} λέει ότι το link του {deliverable} δεν ανοίγει.', '{clientName} says the link of {deliverable} does not open.', 2);
select authz.seed_note('proposal.low_margin', 'permission', 'finance.cost', true,
  'Χαμηλό περιθώριο στην πρόταση {proposal} ({clientName}).', 'Low margin on the proposal {proposal} ({clientName}).', 1);
select authz.seed_note('client.colleagues_changed', 'permission', 'access.clientUsers', false,
  'Ο {clientName} προσκάλεσε ή αφαίρεσε τον/την {colleague}.', '{clientName} invited or removed {colleague}.', 1);
select authz.seed_note('team.access_changed', 'relative', 'owner', true,
  'Ο/Η {by} προσκάλεσε τον/την {user} με τους Ρόλους {roles}.', '{by} invited {user} with the roles {roles}.', 1);
select authz.seed_note('message.created', 'relative', 'client_owner', true,
  'Νέο Μήνυμα από {sender}: {excerpt}', 'New message from {sender}: {excerpt}', 1);
select authz.seed_note('message.created', 'relative', 'production_members', true,
  'Νέο Μήνυμα από {sender}: {excerpt}', 'New message from {sender}: {excerpt}', 2);
select authz.seed_note('message.created', 'relative', 'client', true,
  'Νέο Μήνυμα από την {companyName}: {excerpt}', 'New message from {companyName}: {excerpt}', 3);
select authz.seed_note('request.created', 'relative', 'assignee', true,
  'Νέο Αίτημα από τον {clientName}: {request}', 'New request from {clientName}: {request}', 1);
select authz.seed_note('request.closed', 'relative', 'client', true,
  'Το Αίτημά σας «{request}» έκλεισε.', 'Your request "{request}" was closed.', 1, true);
select authz.seed_note('message.mentioned', 'relative', 'mentioned', true,
  'Ο/Η {sender} σε ανέφερε: {excerpt}', '{sender} mentioned you: {excerpt}', 1);

drop function authz.seed_note(text, text, text, boolean, text, text, integer, boolean);

-- ───────────── Προτιμήσεις (Α10, μόνο βάση) ─────────────

-- Ο συνδεδεμένος Χρήστης: ενεργό μέλος ομάδας ή Χρήστης πελάτη με ενεργό Πελάτη. Αλλιώς 42501.
create function authz.require_notification_user() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.is_team_user() or authz.client_user_client_id() is not null) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ποιοι Αυτοματισμοί αφορούν τον θεατή: η ομάδα όλους εκτός από όσους πάνε μόνο σε πελάτη ή Επισκέπτη·
-- ο πελάτης μόνο όσους πάνε «στον πελάτη».
create function authz.automation_for_viewer(a public.automations) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when authz.is_team_user() then
      a.recipient_kind not in ('visitor') and coalesce(a.recipient_relative, '') <> 'client'
    else a.recipient_kind = 'relative' and a.recipient_relative = 'client'
  end;
$$;

-- [{ automationId, eventType, eventLabel, channel, isEssential, canMute, receive }] των ενεργών Αυτοματισμών που αφορούν τον θεατή.
create function public.my_notification_prefs() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_team boolean := authz.is_team_user();
begin
  perform authz.require_notification_user();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'automationId', a.id, 'eventType', a.event_type, 'eventLabel', t.label_el, 'channel', a.channel,
             'isEssential', a.is_essential, 'canMute', v_team or not a.is_essential,
             'receive', not exists (select 1 from public.automation_optouts o
                                     where o.user_id = auth.uid() and o.automation_id = a.id))
           order by t.sort, a.sort, a.created_at)
      from public.automations a join public.event_types t on t.code = a.event_type
     where a.is_enabled and authz.automation_for_viewer(a)
  ), '[]'::jsonb);
end;
$$;

create function public.set_notification_pref(p_automation uuid, p_receive boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.automations;
begin
  perform authz.require_notification_user();
  select * into a from public.automations x where x.id = p_automation;
  if not found or not authz.automation_for_viewer(a) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_receive is null then
    raise exception 'Διάλεξε αν θέλεις να το λαμβάνεις' using errcode = 'P0001';
  end if;
  if not p_receive and a.is_essential and not authz.is_team_user() then
    raise exception 'Αυτός ο Αυτοματισμός είναι απαραίτητος και δεν σβήνει' using errcode = 'P0001';
  end if;
  if p_receive then
    delete from public.automation_optouts o where o.user_id = auth.uid() and o.automation_id = p_automation;
  else
    insert into public.automation_optouts (user_id, automation_id) values (auth.uid(), p_automation)
    on conflict do nothing;
  end if;
end;
$$;

-- ───────────── Ίχνος: ολόκληρη η λίστα ─────────────
-- Ξαναγραμμένη από τον ορισμό του 20261014140000_message_emails.sql, με τον πίνακα automations.

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
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.automations_guard(), authz.require_notification_user(), authz.automation_for_viewer(public.automations)
  from public, anon, authenticated;

revoke all on function public.my_notification_prefs(), public.set_notification_pref(uuid, boolean) from public, anon;
grant execute on function public.my_notification_prefs(), public.set_notification_pref(uuid, boolean) to authenticated;

revoke all on table public.automations, public.automation_optouts, public.notifications, public.automation_sends
  from anon, authenticated;
