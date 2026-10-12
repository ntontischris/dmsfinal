-- Ειδοποιήσεις Kδ (#173), μέρος 2: K2 Μηνύματα συστήματος (δέσμη Α1, Α11).
--
--  • system_messages: μία γραμμή ανά Μήνυμα συστήματος που στέλνει ο κώδικας (πρόσκληση και ξανα-αποστολή της, σύνδεσμος
--    εισόδου, επαναφορά κωδικού, κωδικός υπογραφής, Σύνδεσμος πρότασης, αντίγραφο υπογεγραμμένης, προσθήκη σε Πελάτη).
--    Θέμα και κείμενο el/en, όλα nullable: null = το προεπιλεγμένο κείμενο του κώδικα. «Επαναφορά» = όλα null.
--  • Πάντα ενεργά, χωρίς διακόπτη. Το κουμπί/σύνδεσμος και ο κωδικός μπαίνουν πάντα από τον κώδικα.
--  • Στο θέμα ποτέ {link} ή {code}.
--  • Μόνο γνωστές μεταβλητές {…} ανά Μήνυμα· οι υποχρεωτικές (ο {code} του κωδικού υπογραφής) δεν λείπουν από κανένα
--    κείμενο που αλλάζει. Ο σύνδεσμος είναι πάντα το κουμπί του μηνύματος, γι' αυτό το {link} δεν είναι υποχρεωτικό.
--  • Πίνακας κλειστός (RLS χωρίς policies, revoke). Ανάγνωση/αλλαγή με automations.manage· η αποστολή διαβάζει με service role.
--  • Ίχνος σε κάθε αλλαγή· το audit_entity_allowed ξαναγράφεται ολόκληρο με τον νέο πίνακα.

create table public.system_messages (
  code text primary key
    check (code in ('invite', 'magic_link', 'recovery', 'signing_code', 'proposal_link', 'signed_copy', 'client_added')),
  subject_el text check (subject_el is null or length(subject_el) between 1 and 300),
  subject_en text check (subject_en is null or length(subject_en) between 1 and 300),
  body_el text check (body_el is null or length(body_el) between 1 and 2000),
  body_en text check (body_en is null or length(body_en) between 1 and 2000),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.system_messages enable row level security;

insert into public.system_messages (code)
values ('invite'), ('magic_link'), ('recovery'), ('signing_code'), ('proposal_link'), ('signed_copy'), ('client_added');

create trigger system_messages_audit after update on public.system_messages
  for each row when ((old.subject_el, old.subject_en, old.body_el, old.body_en)
                     is distinct from (new.subject_el, new.subject_en, new.body_el, new.body_en))
  execute function authz.audit_row('code');

-- Οι μεταβλητές και οι υποχρεωτικές ανά Μήνυμα (ίδιες με το app/src/lib/email/system-texts.ts).
create function authz.system_message_spec(p_code text) returns table (sort integer, variables text[], required text[])
language sql immutable set search_path = ''
as $$
  select x.sort, x.variables, x.required
    from (values
      (1, 'invite', array['recipientName', 'place', 'link'], '{}'::text[]),
      (2, 'magic_link', array['recipientName', 'link'], '{}'::text[]),
      (3, 'recovery', array['recipientName', 'link'], '{}'::text[]),
      (4, 'signing_code', array['recipientName', 'agreement', 'code'], array['code']),
      (5, 'proposal_link', array['recipientName', 'agreement', 'link'], '{}'::text[]),
      (6, 'signed_copy', array['recipientName', 'agreement', 'manager'], '{}'::text[]),
      (7, 'client_added', array['recipientName', 'clientName', 'link'], '{}'::text[])
    ) x (sort, code, variables, required)
   where x.code = p_code;
$$;

-- [{ code, subjectEl, subjectEn, bodyEl, bodyEn, isEdited, updatedAt, updatedBy, variables, required }]
create function public.system_messages_list() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('automations.manage');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'code', m.code, 'subjectEl', m.subject_el, 'subjectEn', m.subject_en, 'bodyEl', m.body_el, 'bodyEn', m.body_en,
             'isEdited', num_nonnulls(m.subject_el, m.subject_en, m.body_el, m.body_en) > 0,
             'updatedAt', m.updated_at, 'updatedBy', authz.ev_team_name(m.updated_by),
             'variables', to_jsonb(s.variables), 'required', to_jsonb(s.required))
           order by s.sort)
      from public.system_messages m cross join lateral authz.system_message_spec(m.code) s
  ), '[]'::jsonb);
end;
$$;

-- Ο κανόνας ενός κειμένου: έως p_max χαρακτήρες, μόνο γνωστές μεταβλητές, και (στο σώμα) όλες οι υποχρεωτικές.
create function authz.system_text_check(p_text text, p_max integer, p_allowed text[], p_required text[]) returns void
language plpgsql immutable set search_path = ''
as $$
declare
  v_bad text;
  v_need text;
begin
  if p_text is null then
    return;
  end if;
  if length(p_text) > p_max then
    raise exception 'Το κείμενο έχει έως % χαρακτήρες', p_max using errcode = 'P0001';
  end if;
  v_bad := authz.unknown_variable(p_text, p_allowed);
  if v_bad is not null then
    raise exception 'Άγνωστη μεταβλητή {%}: διάλεξε από τη λίστα του Μηνύματος', v_bad using errcode = 'P0001';
  end if;
  select r into v_need from unnest(p_required) r where strpos(p_text, '{' || r || '}') = 0 limit 1;
  if v_need is not null then
    raise exception 'Λείπει το {%}: πρόσθεσέ το για να αποθηκευτεί', v_need using errcode = 'P0001';
  end if;
end;
$$;

-- { code, subjectEl, subjectEn, bodyEl, bodyEn }: αντικατάσταση και των τεσσάρων· κενό ή λείπον = το προεπιλεγμένο.
-- Όλα κενά = «Επαναφορά». Επιστρέφει { changed }.
create function public.system_message_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v jsonb := coalesce(p, '{}'::jsonb);
  m public.system_messages;
  s record;
  v_subject_el text;
  v_subject_en text;
  v_body_el text;
  v_body_en text;
  v_bad text;
begin
  perform authz.require('automations.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Το Μήνυμα συστήματος θέλει αντικείμενο' using errcode = 'P0001';
  end if;
  select x.* into m from public.system_messages x where x.code = v ->> 'code' for update;
  if not found then
    raise exception 'Δεν υπάρχει αυτό το Μήνυμα συστήματος' using errcode = 'P0001';
  end if;
  select * into s from authz.system_message_spec(m.code);
  begin
    v_subject_el := nullif(trim(coalesce(v ->> 'subjectEl', '')), '');
    v_subject_en := nullif(trim(coalesce(v ->> 'subjectEn', '')), '');
    v_body_el := nullif(trim(coalesce(v ->> 'bodyEl', '')), '');
    v_body_en := nullif(trim(coalesce(v ->> 'bodyEn', '')), '');
  exception when others then
    raise exception 'Τα κείμενα δεν είναι έγκυρα. Έλεγξε τα πεδία.' using errcode = 'P0001';
  end;
  -- Το θέμα φαίνεται σε λίστες και ειδοποιήσεις: ποτέ σύνδεσμος ή κωδικός μέσα του.
  v_bad := (select r.found[1] from regexp_matches(concat_ws(' ', v_subject_el, v_subject_en), '\{(link|code)\}', 'g') as r (found)
             limit 1);
  if v_bad is not null then
    raise exception 'Το {%} δεν μπαίνει στο θέμα: βάλ'' το στο κείμενο', v_bad using errcode = 'P0001';
  end if;
  perform authz.system_text_check(v_subject_el, 300, s.variables, '{}');
  perform authz.system_text_check(v_subject_en, 300, s.variables, '{}');
  perform authz.system_text_check(v_body_el, 2000, s.variables, s.required);
  perform authz.system_text_check(v_body_en, 2000, s.variables, s.required);
  if (v_subject_el, v_subject_en, v_body_el, v_body_en) is not distinct from (m.subject_el, m.subject_en, m.body_el, m.body_en) then
    return jsonb_build_object('changed', false);
  end if;
  update public.system_messages x
     set subject_el = v_subject_el, subject_en = v_subject_en, body_el = v_body_el, body_en = v_body_en,
         updated_at = now(), updated_by = auth.uid()
   where x.code = m.code;
  return jsonb_build_object('changed', true);
end;
$$;

-- ───────────── Ίχνος: ολόκληρη η λίστα ─────────────
-- Ξαναγραμμένη από τον ορισμό του 20261015140200_automation_timing_move.sql, με τον πίνακα system_messages.

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
    -- Μηνύματα συστήματος (#173): κείμενα, χωρίς σύνδεσμους ή κωδικούς
    when 'system_messages' then authz.has('automations.manage') or authz.has('audit.view')
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.system_message_spec(text), authz.system_text_check(text, integer, text[], text[])
  from public, anon, authenticated;

revoke all on function public.system_messages_list(), public.system_message_save(jsonb) from public, anon;
grant execute on function public.system_messages_list(), public.system_message_save(jsonb) to authenticated;

revoke all on table public.system_messages from anon, authenticated;
