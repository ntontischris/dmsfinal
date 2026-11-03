-- Είδη κλεισμένου χρόνου (owner 02, «επιλογή 3»): ο κλεισμένος χρόνος παίρνει Είδος (Ρεπό, Άδεια, Ραντεβού,
-- Τηλεφώνημα, Άλλο) και κάθε Είδος φαίνεται ξεχωριστά στο Ημερολόγιο. Η λίστα αλλάζει στις Ρυθμίσεις › Γυρίσματα (O4).
--
-- Αρχές:
--  • Τίποτα σταθερό: τα πέντε Είδη είναι μόνο αρχικές τιμές. Όποιος «Διαχειρίζεται Ρυθμίσεις» προσθέτει, μετονομάζει,
--    αποσύρει και επαναφέρει (όπως οι Τρόποι είσπραξης, 20261013100000_receipts.sql). Χωρίς διαγραφή: η τιμή που
--    χρησιμοποιήθηκε αποσύρεται και μένει στα παλιά (blueprint 03-processes/04 «δεν ρυθμίζονται»).
--  • Το Είδος είναι προαιρετικό. Ο υπάρχων κλεισμένος χρόνος και ό,τι έρχεται από το Google μένουν χωρίς Είδος και
--    φαίνονται ως «Κλεισμένος χρόνος» (δεν ξέρουμε αν ήταν ρεπό ή ραντεβού· δεν μαντεύουμε).
--  • Το Είδος φαίνεται όπου φαίνεται ο τίτλος: στον ίδιο και σε όσους «Κλείνουν χρόνο άλλων». Οι υπόλοιποι βλέπουν
--    μόνο «Απασχολημένος» (authz.calendar_busy δεν αλλάζει)· το «Άδεια» ή το «Ραντεβού» λέει ήδη κάτι προσωπικό.
--  • Νέο Είδος μόνο από ενεργή τιμή· σε αλλαγή υπάρχοντος, το Είδος που είχε κρατιέται ακόμη κι αν αποσύρθηκε.
--  • Ο πίνακας είναι κλειστός (RLS χωρίς policies, χωρίς grants)· όλα περνούν από τα RPC παρακάτω.

-- ───────────── Πίνακας και αρχικές τιμές ─────────────

create table public.blocked_time_kinds (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  sort integer not null default 0,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Ονομασία μοναδική μόνο στα ενεργά Είδη (το αποσυρμένο αφήνει ελεύθερη την ονομασία).
create unique index blocked_time_kinds_label_active on public.blocked_time_kinds (lower(label)) where retired_at is null;

alter table public.blocked_time_kinds enable row level security;

insert into public.blocked_time_kinds (label, sort) values
  ('Ρεπό', 1),
  ('Άδεια', 2),
  ('Ραντεβού', 3),
  ('Τηλεφώνημα', 4),
  ('Άλλο', 5);

-- Προσθετικό: οι υπάρχουσες γραμμές μένουν null («Κλεισμένος χρόνος»).
alter table public.blocked_times add column kind_id uuid references public.blocked_time_kinds (id);

-- ───────────── Έλεγχος Είδους ─────────────

-- Το Είδος της αποθήκευσης: κενό, ενεργό, ή αυτό που είχε ήδη η γραμμή (p_current). Αλλιώς P0001.
create function authz.require_blocked_kind(p_kind uuid, p_current uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_kind is null or p_kind is not distinct from p_current then
    return;
  end if;
  if not exists (select 1 from public.blocked_time_kinds k where k.id = p_kind and k.retired_at is null) then
    raise exception 'Το Είδος δεν βρέθηκε ή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Είδη: RPC ─────────────

-- Η λίστα για τη φόρμα (ομάδα) και για τις Ρυθμίσεις. Ενεργά πρώτα, με τη σειρά τους.
create function public.blocked_time_kinds_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(
             jsonb_build_object('id', k.id, 'label', k.label, 'retired', k.retired_at is not null)
             order by k.retired_at is not null, k.sort, k.label, k.id
           ), '[]'::jsonb)
      from public.blocked_time_kinds k
  );
end;
$$;

-- Προσθήκη (p_id null) ή μετονομασία. Η μετονομασία αλλάζει και τον παλιό κλεισμένο χρόνο (διαβάζεται ζωντανά).
create function public.blocked_time_kind_save(p_id uuid, p_label text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_id uuid;
begin
  perform authz.require('settings.manage');
  if char_length(v_label) not between 1 and 40 then
    raise exception 'Γράψε ονομασία Είδους από 1 έως 40 χαρακτήρες' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.blocked_time_kinds k
     where lower(k.label) = lower(v_label) and k.retired_at is null and k.id is distinct from p_id
  ) then
    raise exception 'Υπάρχει ήδη ενεργό Είδος με αυτή την ονομασία' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.blocked_time_kinds (label, sort, updated_by)
    values (v_label, (select coalesce(max(k.sort), 0) + 1 from public.blocked_time_kinds k), auth.uid())
    returning id into v_id;
    return v_id;
  end if;
  update public.blocked_time_kinds k
     set label = v_label, updated_at = now(), updated_by = auth.uid()
   where k.id = p_id
  returning k.id into v_id;
  if v_id is null then
    raise exception 'Το Είδος δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

create function public.blocked_time_kind_retire(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  update public.blocked_time_kinds k
     set retired_at = now(), updated_at = now(), updated_by = auth.uid()
   where k.id = p_id and k.retired_at is null;
  if not found then
    raise exception 'Το Είδος δεν βρέθηκε ή είναι ήδη αποσυρμένο' using errcode = 'P0001';
  end if;
end;
$$;

create function public.blocked_time_kind_restore(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text;
begin
  perform authz.require('settings.manage');
  select k.label into v_label from public.blocked_time_kinds k where k.id = p_id and k.retired_at is not null;
  if not found then
    raise exception 'Το Είδος δεν βρέθηκε ή είναι ενεργό' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.blocked_time_kinds k
     where lower(k.label) = lower(v_label) and k.retired_at is null and k.id <> p_id
  ) then
    raise exception 'Υπάρχει ήδη ενεργό Είδος με αυτή την ονομασία' using errcode = 'P0001';
  end if;
  update public.blocked_time_kinds k
     set retired_at = null, updated_at = now(), updated_by = auth.uid()
   where k.id = p_id;
end;
$$;

-- ───────────── Κλεισμένος χρόνος με Είδος ─────────────

-- Αντικαθιστά το 20261011100000: ίδιο σώμα, με το Είδος. Το p_kind έχει προεπιλογή null, άρα οι κλήσεις με έξι
-- ορίσματα (π.χ. η κλασική φόρμα) δουλεύουν όπως πριν. Η παλιά υπογραφή σβήνει για να μη γίνει διπλή.
drop function public.blocked_time_save(uuid, uuid, timestamptz, timestamptz, boolean, text);

create function public.blocked_time_save(
  p_id uuid, p_user uuid, p_starts timestamptz, p_ends timestamptz, p_all_day boolean, p_title text,
  p_kind uuid default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  b public.blocked_times;
  v_user uuid;
  v_span record;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_id uuid;
begin
  if p_id is null then
    v_user := coalesce(p_user, auth.uid());
    perform authz.require_block_target(v_user);
  else
    b := authz.require_blocked_edit(p_id);
    if p_user is not null and p_user <> b.user_id then
      raise exception 'Ο κλεισμένος χρόνος δεν αλλάζει άτομο' using errcode = 'P0001';
    end if;
    v_user := b.user_id;
    perform authz.require_block_target(v_user);
  end if;
  if v_title is not null and length(v_title) > 120 then
    raise exception 'Ο τίτλος έχει έως 120 χαρακτήρες' using errcode = 'P0001';
  end if;
  perform authz.require_blocked_kind(p_kind, b.kind_id);
  select * into v_span from authz.blocked_span(p_starts, p_ends, p_all_day);
  if p_id is null then
    insert into public.blocked_times (user_id, starts_at, ends_at, all_day, title, kind_id, created_by)
    values (v_user, v_span.span_start, v_span.span_end, coalesce(p_all_day, false), v_title, p_kind, auth.uid())
    returning id into v_id;
    return v_id;
  end if;
  update public.blocked_times
     set starts_at = v_span.span_start, ends_at = v_span.span_end,
         all_day = coalesce(p_all_day, false), title = v_title, kind_id = p_kind
   where id = p_id;
  return p_id;
end;
$$;

-- Αντικαθιστά το 20261011100000: και το Είδος, μόνο σε όσους βλέπουν τον τίτλο.
create or replace function public.blocked_time_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  b public.blocked_times;
  v_full boolean;
begin
  b := authz.require_blocked_viewer(p_id);
  v_full := authz.can_see_blocked_title(b.user_id);
  return jsonb_build_object(
    'id', b.id,
    'userId', b.user_id,
    'userName', (select u.name from public.team_users u where u.user_id = b.user_id),
    'startsAt', b.starts_at,
    'endsAt', b.ends_at,
    'allDay', b.all_day,
    'title', case when v_full then b.title end,
    'kindId', case when v_full then b.kind_id end,
    'kindLabel', case when v_full then (select k.label from public.blocked_time_kinds k where k.id = b.kind_id) end,
    'canEdit', v_full,
    'canConvert', v_full and authz.has('filming.book')
  );
end;
$$;

-- Αντικαθιστά το 20261011100000: και το Είδος. Οι γραμμές εδώ είναι ήδη μόνο όσες βλέπει ο Χρήστης με τίτλο.
create or replace function authz.calendar_team_blocked(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'userId', b.user_id, 'userName', u.name, 'startsAt', b.starts_at, 'endsAt', b.ends_at,
           'allDay', b.all_day, 'title', b.title, 'isMine', b.user_id = auth.uid(),
           'kindId', b.kind_id, 'kindLabel', k.label
         ) order by b.starts_at, b.id), '[]'::jsonb)
    from public.blocked_times b
    join public.team_users u on u.user_id = b.user_id
    left join public.blocked_time_kinds k on k.id = b.kind_id
   where b.starts_at < p_to and b.ends_at > p_from
     and authz.can_see_blocked_title(b.user_id);
$$;

-- ───────────── Ίχνος ─────────────

create trigger blocked_time_kinds_audit after insert on public.blocked_time_kinds
  for each row execute function authz.audit_row('id');
create trigger blocked_time_kinds_audit_update after update on public.blocked_time_kinds
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

insert into public.audit_entities (entity, area, label, parent, amount_keys, cost_keys, visibility)
values ('blocked_time_kinds', 'calendar', 'Είδος κλεισμένου χρόνου', null, '{}', '{}', 'rule');

-- Ξαναγράφεται ολόκληρο από τον τελευταίο ορισμό (20261018150000_health_page.sql), με τα 'blocked_time_kinds'.

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
    -- Είδη κλεισμένου χρόνου (owner 02): ονομασίες, χωρίς τίτλους ή ποσά
    when 'blocked_time_kinds' then true
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
    -- Μηνύματα συστήματος (#173): κείμενα, χωρίς σύνδεσμους ή κωδικούς
    when 'system_messages' then authz.has('automations.manage') or authz.has('audit.view')
    -- Γνώση (#190): περιέχει πρόχειρα, άρα μόνο όσοι διαχειρίζονται τη Γνώση
    when 'knowledge_sections' then authz.has('knowledge.manage')
    when 'knowledge_items' then authz.has('knowledge.manage')
    when 'knowledge_item_audience' then authz.has('knowledge.manage')
    -- Εξαγωγές (#200, #201): τι, φίλτρα, γραμμές· χωρίς ποσά
    when 'report_exports' then true
    -- Συνδρομές (#209): πάροχοι και κόστος, μόνο ο Ιδιοκτήτης
    when 'subscriptions' then authz.is_owner()
    -- GDPR (#208): αιτήματα, εξαγωγές και ανωνυμοποιήσεις, μόνο για τον Ιδιοκτήτη (ποτέ η Διαχείριση)
    when 'gdpr_requests' then authz.is_owner()
    when 'gdpr' then authz.is_owner()
    -- Υγεία (#215): «Ξαναδοκίμασε» ενός Γεγονότος που κόλλησε· μόνο τύπος και προσπάθειες
    when 'events' then true
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.require_blocked_kind(uuid, uuid) from public, anon, authenticated;

revoke all on function
  public.blocked_time_kinds_view(), public.blocked_time_kind_save(uuid, text), public.blocked_time_kind_retire(uuid),
  public.blocked_time_kind_restore(uuid), public.blocked_time_save(uuid, uuid, timestamptz, timestamptz, boolean, text, uuid)
  from public, anon;

grant execute on function
  public.blocked_time_kinds_view(), public.blocked_time_kind_save(uuid, text), public.blocked_time_kind_retire(uuid),
  public.blocked_time_kind_restore(uuid), public.blocked_time_save(uuid, uuid, timestamptz, timestamptz, boolean, text, uuid)
  to authenticated;

-- Ο πίνακας είναι κλειστός: διαβάζεται και γράφεται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.blocked_time_kinds from anon, authenticated;
