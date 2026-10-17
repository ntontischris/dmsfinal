-- Υγεία Pα (#214, PRD #213, δέσμη Υ1–Υ5): Ίχνος ενεργειών (P1) με φίλτρα, κρυφά ποσά και εξαγωγή.
--
--  • Υ1 Λίστα: public.audit_trail(p_filters, p_before_at, p_before_id). Ελέγχει ΠΡΩΤΑ το «Βλέπει ίχνος ενεργειών»
--    (audit.view, αλλιώς 42501) και μετά τους κανόνες ανά γραμμή. Φίλτρα (jsonb): who (uuid ή 'system'), area, entity
--    (+ id), action (insert / update / delete / event), period (7d / 30d / all, σε ώρα Αθήνας). Σελίδες των 50 με keyset
--    (at, id). Το όνομα του δράστη είναι το τρέχον (μετά από ανωνυμοποίηση GDPR: «Ανωνυμοποιημένος Χρήστης N»).
--    Στοιχείο που δεν υπάρχει και στοιχείο που δεν φαίνεται δίνουν την ίδια άδεια λίστα.
--  • Υ2 Απόκρυψη ανά πεδίο: ο κατάλογος public.audit_entities δηλώνει για κάθε στοιχείο τα κλειδιά «ποσό» και «κόστος».
--    Χωρίς finance.amounts / finance.cost τα κλειδιά αυτά (και οι αλλαγές τους στο «changes» των Τιμολογίων) γυρίζουν ως
--    {"$hidden": "amount" | "cost"}: η τιμή δεν φεύγει ποτέ από τη βάση. Ορατότητα στοιχείου:
--      - 'masked': όσα ως τώρα κόβονταν ολόκληρα μόνο λόγω ποσών ή κόστους· τα βλέπει κάθε κάτοχος audit.view, κρυφά.
--      - 'owner': email_outbox, email_log, gdpr, gdpr_requests, subscriptions· μόνο ο Ιδιοκτήτης.
--      - 'rule': ο υπάρχων κανόνας (authz.audit_entity_allowed / authz.audit_row_allowed), αμετάβλητος.
--    Το RLS του audit_log ΔΕΝ αλλάζει (μένει αυστηρό)· η εφαρμογή διαβάζει μόνο μέσω των RPC αυτού του αρχείου.
--  • Υ3 Περιοχές και ετικέτες: public.audit_areas και public.audit_entities (περιοχή, ελληνική ετικέτα, «γονέας»: το
--    στοιχείο του οποίου το id κρατά η γραμμή, π.χ. agreement_amounts → agreements). Το φίλτρο «στοιχείο + id» πιάνει και τα
--    παιδιά του (τα ποσά, το κόστος, οι υπογραφές μιας Συμφωνίας). Τα είδη ενέργειας τα μεταφράζει η εφαρμογή.
--    Σύμβαση (pgTAP): κάθε στοιχείο του allowlist και κάθε πίνακας με trigger Ίχνους έχει γραμμή εδώ.
--  • Υ5 Εξαγωγή: public.audit_trail_export(p_filters, p_format). Θέλει reports.export ΚΑΙ audit.view, ίδια φίλτρα και ίδια
--    απόκρυψη, έως 10.000 γραμμές. Γράφει authz.export_log ('dataset', 'audit', φίλτρα, γραμμές, μορφή) ΠΡΙΝ επιστρέψει,
--    στην ίδια συναλλαγή. Στην M2 το σύνολο «audit» μπαίνει στη λίστα (authz.export_datasets) για όποιον έχει audit.view.
--  • Ξαναγράφεται από τον ΤΕΛΕΥΤΑΙΟ ορισμό: authz.export_datasets (20261017160000_reports_export.sql). Τα
--    authz.audit_entity_allowed, authz.audit_row_allowed και authz.reject_audit_change ΔΕΝ αλλάζουν.
--  • Το p_now των authz.audit_trail_* υπάρχει για τα τεστ· τα public RPC δίνουν now().

-- ───────────── Κατάλογος ─────────────

create table public.audit_areas (
  code text primary key check (code ~ '^[a-z_]{1,40}$'),
  label text not null check (length(trim(label)) between 1 and 80),
  sort integer not null
);

create table public.audit_entities (
  entity text primary key check (entity ~ '^[a-z_]{1,60}$'),
  area text not null references public.audit_areas (code),
  label text not null check (length(trim(label)) between 1 and 120),
  -- Το στοιχείο του οποίου το id γράφει αυτή η γραμμή στο entity_id (null = το δικό της).
  parent text check (parent is null or parent ~ '^[a-z_]{1,60}$'),
  amount_keys text[] not null default '{}',
  cost_keys text[] not null default '{}',
  visibility text not null check (visibility in ('rule', 'masked', 'owner'))
);

comment on table public.audit_entities is
  'Κατάλογος του Ίχνους: περιοχή, ετικέτα, κλειδιά ποσών και κόστους ανά στοιχείο. Κάθε νέο στοιχείο του Ίχνους μπαίνει εδώ.';

alter table public.audit_areas enable row level security;
alter table public.audit_entities enable row level security;
revoke all on table public.audit_areas, public.audit_entities from anon, authenticated;

insert into public.audit_areas (code, label, sort) values
  ('sales', 'Πωλήσεις', 1),
  ('catalogue', 'Κατάλογος', 2),
  ('agreements', 'Συμφωνίες', 3),
  ('productions', 'Παραγωγές', 4),
  ('filming', 'Γυρίσματα', 5),
  ('calendar', 'Ημερολόγιο', 6),
  ('equipment', 'Εξοπλισμός', 7),
  ('deliverables', 'Παραδοτέα', 8),
  ('finance', 'Οικονομικά', 9),
  ('messages', 'Μηνύματα', 10),
  ('automations', 'Αυτοματισμοί', 11),
  ('knowledge', 'Γνώση', 12),
  ('reports', 'Αναφορές και εξαγωγές', 13),
  ('team', 'Ομάδα και Πρόσβαση', 14),
  ('settings', 'Ρυθμίσεις', 15),
  ('health', 'Υγεία συστήματος', 16);

insert into public.audit_entities (entity, area, label, parent, amount_keys, cost_keys, visibility) values
  -- Ομάδα και Πρόσβαση
  ('roles', 'team', 'Ρόλος', null, '{}', '{}', 'rule'),
  ('role_permissions', 'team', 'Δικαιώματα Ρόλου', 'roles', '{}', '{}', 'rule'),
  ('team_users', 'team', 'Χρήστης ομάδας', null, '{}', '{}', 'rule'),
  ('team_user_roles', 'team', 'Ρόλοι Χρήστη', 'team_users', '{}', '{}', 'rule'),
  ('access', 'team', 'Πρόσβαση', null, '{}', '{}', 'rule'),
  ('invitations', 'team', 'Πρόσκληση', null, '{}', '{}', 'rule'),
  ('client_users', 'team', 'Χρήστης πελάτη', 'clients', '{}', '{}', 'rule'),
  ('gdpr_requests', 'team', 'Αίτημα GDPR', null, '{}', '{}', 'owner'),
  ('gdpr', 'team', 'GDPR', null, '{}', '{}', 'owner'),
  -- Ρυθμίσεις
  ('company_settings', 'settings', 'Στοιχεία Εταιρείας', null, '{}', '{}', 'rule'),
  ('bank_accounts', 'settings', 'Λογαριασμός τραπέζης', null, '{}', '{}', 'rule'),
  ('readiness_confirmations', 'settings', 'Έλεγχος ετοιμότητας', null, '{}', '{}', 'rule'),
  ('system_state', 'settings', 'Κατάσταση συστήματος', null, '{}', '{}', 'rule'),
  ('sales_stages', 'settings', 'Στάδιο Πωλήσεων', null, '{}', '{}', 'rule'),
  ('sales_sources', 'settings', 'Πηγή Πωλήσεων', null, '{}', '{}', 'rule'),
  ('sales_loss_reasons', 'settings', 'Λόγος απώλειας', null, '{}', '{}', 'rule'),
  ('sales_activity_kinds', 'settings', 'Είδος Δραστηριότητας', null, '{}', '{}', 'rule'),
  ('sales_settings', 'settings', 'Ρυθμίσεις Πωλήσεων', null, '{}', '{}', 'rule'),
  ('cost_months', 'settings', 'Κόστος μήνα', null, '{}',
   '{expenses_total,productive_hours,hour_cost}', 'masked'),
  ('cost_settings', 'settings', 'Πολλαπλασιαστές τιμής', null, '{}',
   '{multiplier_min,multiplier_target,multiplier_max}', 'masked'),
  ('agreement_defaults', 'settings', 'Όροι Συμφωνιών', null,
   '{standard_discount_percent,standard_discount_months,dissolution_fee}', '{}', 'masked'),
  ('filming_settings', 'settings', 'Ρυθμίσεις Γυρισμάτων', null, '{}', '{}', 'rule'),
  ('booking_week', 'settings', 'Ωράριο κρατήσεων', null, '{}', '{}', 'rule'),
  ('booking_exceptions', 'settings', 'Εξαίρεση Ωραρίου', null, '{}', '{}', 'rule'),
  ('deliverable_settings', 'settings', 'Κανόνες Παραδοτέων', null, '{}', '{}', 'rule'),
  ('message_settings', 'settings', 'Ρυθμίσεις Μηνυμάτων', null, '{}', '{}', 'rule'),
  ('payment_methods', 'settings', 'Τρόπος πληρωμής', null, '{}', '{}', 'rule'),
  ('subscriptions', 'settings', 'Συνδρομή', null, '{}', '{monthly_cost}', 'owner'),
  -- Πωλήσεις
  ('clients', 'sales', 'Πελάτης', null, '{}', '{}', 'rule'),
  ('client_duplicate_flags', 'sales', 'Πιθανό διπλό', null, '{}', '{}', 'rule'),
  ('opportunities', 'sales', 'Ευκαιρία', null, '{}', '{}', 'rule'),
  ('access_requests', 'sales', 'Αίτημα πρόσβασης', null, '{}', '{}', 'rule'),
  -- Κατάλογος
  ('provision_kinds', 'catalogue', 'Είδος Παροχής', null, '{}', '{}', 'rule'),
  ('catalogue_items', 'catalogue', 'Στοιχείο Καταλόγου', null, '{}', '{}', 'rule'),
  ('catalogue_item_provisions', 'catalogue', 'Παροχές στοιχείου Καταλόγου', 'catalogue_items', '{}', '{}', 'rule'),
  ('catalogue_item_amounts', 'catalogue', 'Τιμή στοιχείου Καταλόγου', 'catalogue_items', '{price}', '{}', 'masked'),
  ('catalogue_item_costs', 'catalogue', 'Ώρες και κόστος στοιχείου Καταλόγου', 'catalogue_items', '{}',
   '{hours_shoot,hours_edit,direct_cost,direct_cost_note}', 'masked'),
  -- Συμφωνίες
  ('agreements', 'agreements', 'Συμφωνία', null, '{}', '{}', 'rule'),
  ('agreement_amounts', 'agreements', 'Ποσά Συμφωνίας', 'agreements',
   '{discount_percent,discount_months,dissolution_fee}', '{}', 'masked'),
  ('agreement_costs', 'agreements', 'Κόστος Συμφωνίας', 'agreements', '{price,discounted_price}',
   '{hour_cost,hour_cost_month,multiplier_min,multiplier_target,multiplier_max,estimated_cost,is_low_margin}', 'masked'),
  ('agreement_revision_limits', 'agreements', 'Όριο αλλαγών Συμφωνίας', 'agreements', '{}', '{}', 'rule'),
  ('agreement_milestones', 'agreements', 'Δόση Συμφωνίας', null, '{}', '{}', 'rule'),
  ('agreement_lines', 'agreements', 'Γραμμή Συμφωνίας', null, '{}', '{}', 'rule'),
  ('agreement_line_amounts', 'agreements', 'Τιμή γραμμής Συμφωνίας', 'agreement_lines',
   '{unit_price,catalog_price}', '{}', 'masked'),
  ('agreement_line_costs', 'agreements', 'Ώρες και κόστος γραμμής Συμφωνίας', 'agreement_lines', '{}',
   '{hours_shoot,hours_edit,direct_cost}', 'masked'),
  ('agreement_line_provisions', 'agreements', 'Παροχές γραμμής Συμφωνίας', 'agreement_lines', '{}', '{}', 'rule'),
  ('agreement_recipients', 'agreements', 'Παραλήπτης Συμφωνίας', null, '{}', '{}', 'rule'),
  ('agreement_signatures', 'agreements', 'Υπογραφή Συμφωνίας', 'agreements', '{}', '{}', 'rule'),
  -- Εξοπλισμός
  ('equipment_categories', 'equipment', 'Κατηγορία εξοπλισμού', null, '{}', '{}', 'rule'),
  ('equipment_items', 'equipment', 'Εξοπλισμός', null, '{}', '{}', 'rule'),
  ('equipment_templates', 'equipment', 'Πρότυπο εξοπλισμού', null, '{}', '{}', 'rule'),
  ('equipment_template_items', 'equipment', 'Στοιχεία Προτύπου εξοπλισμού', 'equipment_templates', '{}', '{}', 'rule'),
  -- Περίοδοι και Παραγωγές
  ('agreement_periods', 'productions', 'Περίοδος Συμφωνίας', null, '{}', '{}', 'rule'),
  ('agreement_period_provisions', 'productions', 'Παροχές Περιόδου', 'agreement_periods', '{}', '{}', 'rule'),
  ('productions', 'productions', 'Παραγωγή', null, '{}', '{}', 'rule'),
  ('production_members', 'productions', 'Μέλη Παραγωγής', 'productions', '{}', '{}', 'rule'),
  ('production_tasks', 'productions', 'Εργασία Παραγωγής', null, '{}', '{}', 'rule'),
  ('production_costs', 'productions', 'Ώρες και κόστος Παραγωγής', 'productions', '{estimate_price}',
   '{estimate_shoot_hours,estimate_edit_hours,estimate_direct_cost,estimate_hour_cost,shoot_hours,edit_hours,direct_cost}',
   'masked'),
  -- Γυρίσματα
  ('filmings', 'filming', 'Γύρισμα', null, '{}', '{}', 'rule'),
  ('filming_crew', 'filming', 'Συνεργείο Γυρίσματος', 'filmings', '{}', '{}', 'rule'),
  ('filming_equipment', 'filming', 'Εξοπλισμός Γυρίσματος', 'filmings', '{}', '{}', 'rule'),
  ('filming_sheets', 'filming', 'Δελτίο Γυρίσματος', 'filmings', '{}', '{}', 'rule'),
  ('filming_sheet_versions', 'filming', 'Έκδοση Δελτίου', 'filmings', '{}', '{}', 'rule'),
  ('crew_templates', 'filming', 'Πρότυπο Συνεργείου', null, '{}', '{}', 'rule'),
  ('crew_template_members', 'filming', 'Μέλη Προτύπου Συνεργείου', 'crew_templates', '{}', '{}', 'rule'),
  -- Ημερολόγιο
  ('blocked_times', 'calendar', 'Κλεισμένος χρόνος', null, '{}', '{}', 'rule'),
  ('google_calendar', 'calendar', 'Ημερολόγιο Google', null, '{}', '{}', 'rule'),
  ('google_deletions', 'calendar', 'Διαγραφή από το Google', 'filmings', '{}', '{}', 'rule'),
  -- Παραδοτέα
  ('deliverables', 'deliverables', 'Παραδοτέο', null, '{}', '{}', 'rule'),
  ('deliverable_versions', 'deliverables', 'Έκδοση Παραδοτέου', 'deliverables', '{}', '{}', 'rule'),
  ('deliverable_comments', 'deliverables', 'Σχόλιο Παραδοτέου', 'deliverables', '{}', '{}', 'rule'),
  ('deliverable_requests', 'deliverables', 'Αίτημα μετά την έγκριση', 'deliverables', '{}', '{}', 'rule'),
  -- Οικονομικά
  ('receipts', 'finance', 'Είσπραξη', null, '{amount}', '{}', 'masked'),
  ('billables', 'finance', 'Τιμολογητέο', null, '{net}', '{}', 'masked'),
  ('invoices', 'finance', 'Τιμολόγιο', null, '{net,vat,total}', '{}', 'masked'),
  -- Μηνύματα
  ('messages', 'messages', 'Μήνυμα', null, '{}', '{}', 'rule'),
  ('message_requests', 'messages', 'Αίτημα Μηνύματος', 'messages', '{}', '{}', 'rule'),
  -- Αυτοματισμοί και email
  ('automations', 'automations', 'Αυτοματισμός', null, '{}', '{}', 'rule'),
  ('holiday_greetings', 'automations', 'Ευχές Αργίας', null, '{}', '{}', 'rule'),
  ('system_messages', 'automations', 'Μήνυμα συστήματος', null, '{}', '{}', 'rule'),
  ('email_outbox', 'automations', 'Ουρά email', null, '{}', '{}', 'owner'),
  ('email_log', 'automations', 'Ιστορικό email', null, '{}', '{}', 'owner'),
  -- Γνώση
  ('knowledge_sections', 'knowledge', 'Ενότητα Γνώσης', null, '{}', '{}', 'rule'),
  ('knowledge_items', 'knowledge', 'Στοιχείο Γνώσης', null, '{}', '{}', 'rule'),
  ('knowledge_item_audience', 'knowledge', 'Κοινό στοιχείου Γνώσης', null, '{}', '{}', 'rule'),
  -- Αναφορές
  ('report_exports', 'reports', 'Εξαγωγή', null, '{}', '{}', 'rule');

-- Keyset ανά (at, id) και φίλτρο «πρόσωπο».
create index audit_log_at_id_idx on public.audit_log (at desc, id desc);
create index audit_log_actor_idx on public.audit_log (actor_id, at desc, id desc);

-- ───────────── Πρόσβαση ─────────────

create function authz.audit_trail_require() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(authz.has('audit.view'), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Φαίνεται το στοιχείο (ολόκληρο, πριν από τον έλεγχο ανά γραμμή); 'masked' = πάντα, με κρυφά κλειδιά.
create function authz.audit_trail_entity_visible(p_entity text, p_visibility text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(case p_visibility
    when 'owner' then authz.is_owner()
    when 'masked' then true
    when 'rule' then authz.audit_entity_allowed(p_entity)
  end, false);
$$;

-- ───────────── Φίλτρα ─────────────

-- Τα φίλτρα όπως τα δέχεται η βάση: μόνο γνωστά κλειδιά, έλεγχος μορφής, period προεπιλογή 'all'. Λάθος μορφή → P0001.
-- Άγνωστη περιοχή ή στοιχείο ΔΕΝ είναι λάθος: απλώς δεν βρίσκει γραμμές (όπως ένα στοιχείο που δεν φαίνεται).
create function authz.audit_trail_filters(p_filters jsonb) returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  v_in jsonb := coalesce(p_filters, '{}'::jsonb);
  v_out jsonb;
  v_who text;
  v_area text;
  v_entity text;
  v_id text;
  v_action text;
  v_period text;
begin
  if jsonb_typeof(v_in) <> 'object' then
    raise exception 'Άγνωστο φίλτρο' using errcode = 'P0001';
  end if;
  v_who := lower(nullif(btrim(v_in ->> 'who'), ''));
  v_area := nullif(btrim(v_in ->> 'area'), '');
  v_entity := nullif(btrim(v_in ->> 'entity'), '');
  v_id := nullif(btrim(v_in ->> 'id'), '');
  v_action := nullif(btrim(v_in ->> 'action'), '');
  v_period := coalesce(nullif(btrim(v_in ->> 'period'), ''), 'all');
  if (v_who is not null and v_who !~ '^(system|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$')
     or (v_area is not null and v_area !~ '^[a-z_]{1,40}$')
     or (v_entity is not null and v_entity !~ '^[a-z_]{1,60}$')
     or (v_id is not null and length(v_id) > 200)
     or (v_action is not null and v_action not in ('insert', 'update', 'delete', 'event'))
     or v_period not in ('7d', '30d', 'all') then
    raise exception 'Άγνωστο φίλτρο' using errcode = 'P0001';
  end if;
  v_out := jsonb_build_object('who', v_who, 'area', v_area, 'entity', v_entity, 'id', v_id, 'action', v_action,
                              'period', v_period);
  return jsonb_strip_nulls(v_out);
end;
$$;

-- Η αρχή της περιόδου: μεσάνυχτα ώρα Αθήνας, 7 ή 30 ημερολογιακές μέρες μαζί με σήμερα. 'all' → null.
create function authz.audit_period_start(p_period text, p_now timestamptz) returns timestamptz
language sql stable set search_path = ''
as $$
  select case p_period
    when '7d' then (((p_now at time zone 'Europe/Athens')::date - 6)::timestamp) at time zone 'Europe/Athens'
    when '30d' then (((p_now at time zone 'Europe/Athens')::date - 29)::timestamp) at time zone 'Europe/Athens'
  end;
$$;

-- ───────────── Γραμμές ─────────────

-- Οι γραμμές που βλέπει ο Χρήστης με τα φίλτρα, νεότερη πρώτη, ως p_limit (το πολύ 10.001). Τα φίλτρα είναι ήδη ελεγμένα
-- (authz.audit_trail_filters). Η ορατότητα κρίνεται μία φορά ανά στοιχείο, και ανά γραμμή μόνο για Πελάτες και Ευκαιρίες.
create function authz.audit_trail_visible(
  p_filters jsonb, p_before_at timestamptz, p_before_id bigint, p_limit integer, p_now timestamptz
) returns setof public.audit_log
language sql stable security definer set search_path = ''
as $$
  with vis as materialized (
    select e.entity, e.area, e.parent
      from public.audit_entities e
     where authz.audit_trail_entity_visible(e.entity, e.visibility)
  ), f as materialized (
    select p_filters ->> 'who' as who, p_filters ->> 'area' as area, p_filters ->> 'entity' as entity,
           p_filters ->> 'id' as id, p_filters ->> 'action' as action,
           authz.audit_period_start(p_filters ->> 'period', p_now) as since
  )
  select a.*
    from public.audit_log a
    join vis v on v.entity = a.entity
    cross join f
   where (f.who is null or (f.who = 'system' and a.actor_id is null) or a.actor_id::text = f.who)
     and (f.area is null or v.area = f.area)
     and (f.entity is null or a.entity = f.entity or v.parent = f.entity)
     and (f.id is null or a.entity_id = f.id)
     and (f.action is null or a.action = f.action)
     and (f.since is null or a.at >= f.since)
     and (p_before_at is null or p_before_id is null or (a.at, a.id) < (p_before_at, p_before_id))
     and (a.entity not in ('clients', 'client_duplicate_flags', 'opportunities', 'access_requests')
          or authz.audit_row_allowed(a.entity, a.entity_id))
   order by a.at desc, a.id desc
   limit greatest(1, least(coalesce(p_limit, 50), 10001));
$$;

-- Κρύβει τα κλειδιά ποσών/κόστους ενός «πριν» ή «μετά» (και τα from/to των αλλαγών τους στο «changes»).
create function authz.audit_mask(
  p_data jsonb, p_amount_keys text[], p_cost_keys text[], p_amounts boolean, p_cost boolean
) returns jsonb
language sql immutable set search_path = ''
as $$
  select case
    when p_data is null or jsonb_typeof(p_data) <> 'object' or (p_amounts and p_cost) then p_data
    else (
      select coalesce(jsonb_object_agg(e.key, case
               when not p_amounts and e.key = any (p_amount_keys) then '{"$hidden": "amount"}'::jsonb
               when not p_cost and e.key = any (p_cost_keys) then '{"$hidden": "cost"}'::jsonb
               when e.key = 'changes' and jsonb_typeof(e.value) = 'array' then (
                 select coalesce(jsonb_agg(case
                          when jsonb_typeof(c.value) = 'object' and not p_amounts and (c.value ->> 'field') = any (p_amount_keys)
                            then c.value || '{"from": {"$hidden": "amount"}, "to": {"$hidden": "amount"}}'::jsonb
                          when jsonb_typeof(c.value) = 'object' and not p_cost and (c.value ->> 'field') = any (p_cost_keys)
                            then c.value || '{"from": {"$hidden": "cost"}, "to": {"$hidden": "cost"}}'::jsonb
                          else c.value
                        end order by c.n), '[]'::jsonb)
                   from jsonb_array_elements(e.value) with ordinality c (value, n))
               else e.value
             end), '{}'::jsonb)
        from jsonb_each(p_data) e
    )
  end;
$$;

-- Τα κλειδιά που άλλαξαν σε μια «αλλαγή» (πριν την απόκρυψη: λέει ότι άλλαξε, ποτέ τι).
create function authz.audit_changed_keys(p_before jsonb, p_after jsonb) returns text[]
language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(k order by k), '{}')
    from (select jsonb_object_keys(coalesce(p_before, '{}'::jsonb)) as k
          union
          select jsonb_object_keys(coalesce(p_after, '{}'::jsonb))) keys
   where p_before -> k is distinct from p_after -> k;
$$;

-- Ένα όνομα για τη γραμμή, από τα συνηθισμένα πεδία κειμένου (όνομα, τίτλος, ετικέτα, αριθμός).
create function authz.audit_subject(p_before jsonb, p_after jsonb) returns text
language sql immutable set search_path = ''
as $$
  select left(nullif(btrim(coalesce(
    p_after ->> 'name', p_after ->> 'title', p_after ->> 'label', p_after ->> 'number', p_after ->> 'provider',
    p_before ->> 'name', p_before ->> 'title', p_before ->> 'label', p_before ->> 'number', p_before ->> 'provider')), ''), 200);
$$;

-- Οι γραμμές ως JSON, με τρέχον όνομα δράστη, περιοχή, ετικέτα και απόκρυψη. Η σειρά = with ordinality.
create function authz.audit_trail_rows(
  p_filters jsonb, p_before_at timestamptz, p_before_id bigint, p_limit integer, p_now timestamptz
) returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  with fl as materialized (
    select coalesce(authz.has('finance.amounts'), false) as amounts, coalesce(authz.has('finance.cost'), false) as cost
  )
  select jsonb_build_object(
           'id', a.id, 'at', a.at, 'actorId', a.actor_id,
           'actorName', coalesce(tu.name, cu.name, case when a.actor_id is null then 'Σύστημα' else 'Άγνωστος Χρήστης' end),
           'action', a.action, 'entity', a.entity, 'entityLabel', e.label, 'area', e.area, 'areaLabel', ar.label,
           'parent', e.parent, 'entityId', a.entity_id, 'subject', authz.audit_subject(a.before, a.after),
           'before', authz.audit_mask(a.before, e.amount_keys, e.cost_keys, fl.amounts, fl.cost),
           'after', authz.audit_mask(a.after, e.amount_keys, e.cost_keys, fl.amounts, fl.cost),
           'changed', case when a.action = 'update' then to_jsonb(authz.audit_changed_keys(a.before, a.after)) end)
    from authz.audit_trail_visible(p_filters, p_before_at, p_before_id, p_limit, p_now) with ordinality a
    join public.audit_entities e on e.entity = a.entity
    join public.audit_areas ar on ar.code = e.area
    cross join fl
    left join public.team_users tu on tu.user_id = a.actor_id
    left join lateral (
      select u.name from public.client_users u where u.user_id = a.actor_id order by u.name limit 1
    ) cu on tu.user_id is null
   order by a.ordinality;
$$;

-- ───────────── P1: λίστα και επιλογές ─────────────

-- { items: [...50], hasMore, subject: { label, name } | null }. subject μόνο όταν το φίλτρο είναι ένα στοιχείο που φαίνεται.
create function authz.audit_trail_list(
  p_filters jsonb, p_before_at timestamptz, p_before_id bigint, p_now timestamptz
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_filters jsonb;
  v_items jsonb;
  v_subject jsonb;
begin
  perform authz.audit_trail_require();
  v_filters := authz.audit_trail_filters(p_filters);
  select coalesce(jsonb_agg(r.item order by r.n), '[]'::jsonb) into v_items
    from authz.audit_trail_rows(v_filters, p_before_at, p_before_id, 51, p_now) with ordinality r (item, n);
  if v_filters ? 'entity' and v_filters ? 'id' then
    select jsonb_build_object('label', e.label, 'name', (
             select r.item ->> 'subject'
               from authz.audit_trail_rows(jsonb_build_object('entity', e.entity, 'id', v_filters ->> 'id'), null, null, 200, p_now)
                    with ordinality r (item, n)
              where r.item ->> 'entity' = e.entity and r.item ->> 'subject' is not null
              order by r.n limit 1))
      into v_subject
      from public.audit_entities e
     where e.entity = v_filters ->> 'entity' and authz.audit_trail_entity_visible(e.entity, e.visibility);
  end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(i order by n) from jsonb_array_elements(v_items) with ordinality x (i, n) where n <= 50),
                      '[]'::jsonb),
    'hasMore', jsonb_array_length(v_items) > 50,
    'subject', v_subject
  );
end;
$$;

-- { areas: [{ code, label }], entities: [{ code, label, area }], actors: [{ id, name }] }: μόνο όσα φαίνονται.
create function authz.audit_trail_options() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.audit_trail_require();
  return (
    with vis as materialized (
      select e.entity, e.label, e.area
        from public.audit_entities e
       where authz.audit_trail_entity_visible(e.entity, e.visibility)
    )
    select jsonb_build_object(
      'areas', coalesce((
        select jsonb_agg(jsonb_build_object('code', ar.code, 'label', ar.label) order by ar.sort)
          from public.audit_areas ar
         where exists (select 1 from vis v where v.area = ar.code)), '[]'::jsonb),
      'entities', coalesce((
        select jsonb_agg(jsonb_build_object('code', v.entity, 'label', v.label, 'area', v.area) order by ar.sort, v.label)
          from vis v join public.audit_areas ar on ar.code = v.area), '[]'::jsonb),
      'actors', coalesce((
        select jsonb_agg(jsonb_build_object('id', u.user_id, 'name', u.name) order by u.name, u.user_id)
          from public.team_users u), '[]'::jsonb)
    )
  );
end;
$$;

-- Πόσες γραμμές βλέπει ο Χρήστης με αυτά τα φίλτρα (έως 10.000, όσο και η εξαγωγή). Χωρίς Ίχνος: δεν βγαίνουν δεδομένα.
create function authz.audit_trail_count(p_filters jsonb, p_now timestamptz) returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
    from authz.audit_trail_visible(authz.audit_trail_filters(p_filters), null, null, 10000, p_now);
$$;

-- ───────────── Υ5: εξαγωγή ─────────────

-- { filters, rows: [...], truncated }. reports.export και audit.view· ίδια φίλτρα και απόκρυψη· Ίχνος πριν από τα δεδομένα.
create function authz.audit_trail_export(p_filters jsonb, p_format text, p_now timestamptz) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_filters jsonb;
  v_rows jsonb;
  v_count integer;
  v_truncated boolean;
begin
  perform authz.export_require();
  perform authz.audit_trail_require();
  perform authz.export_check_format(p_format);
  v_filters := authz.audit_trail_filters(p_filters);
  select coalesce(jsonb_agg(r.item order by r.n), '[]'::jsonb) into v_rows
    from authz.audit_trail_rows(v_filters, null, null, 10001, p_now) with ordinality r (item, n);
  v_truncated := jsonb_array_length(v_rows) > 10000;
  if v_truncated then
    v_rows := v_rows - 10000;
  end if;
  v_count := jsonb_array_length(v_rows);
  perform authz.export_log('dataset', 'audit', v_filters, v_count, p_format);
  return jsonb_build_object('filters', v_filters, 'rows', v_rows, 'truncated', v_truncated);
end;
$$;

-- ───────────── M2: το Ίχνος ως σύνολο (ξαναγράφεται από 20261017160000_reports_export.sql) ─────────────

-- { today, period, items: [{ code, usesPeriod, rowCount }] }: μόνο τα σύνολα που βλέπει ο Χρήστης. Το «audit» (Ίχνος
-- ενεργειών) μπαίνει τελευταίο για όποιον «Βλέπει ίχνος ενεργειών», χωρίς Περίοδο της M2 (έχει τις δικές του).
create or replace function authz.export_datasets(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_from date;
  v_to date;
begin
  perform authz.export_require();
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return jsonb_build_object(
    'today', p_today,
    'period', authz.report_period_json(p_period, p_today),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', d.code,
               'usesPeriod', authz.export_dataset_uses_period(d.code),
               'rowCount', jsonb_array_length(authz.export_rows(d.code, v_from, v_to, p_today))
             ) order by d.n)
        from unnest(authz.export_dataset_codes()) with ordinality d (code, n)
       where authz.export_dataset_allowed(d.code)
    ), '[]'::jsonb)
    || case when coalesce(authz.has('audit.view'), false)
         then jsonb_build_array(jsonb_build_object('code', 'audit', 'usesPeriod', false,
                                                   'rowCount', authz.audit_trail_count('{}'::jsonb, now())))
         else '[]'::jsonb
       end
  );
end;
$$;

-- ───────────── RPC της εφαρμογής (now()) ─────────────

create function public.audit_trail(
  p_filters jsonb default '{}'::jsonb, p_before_at timestamptz default null, p_before_id bigint default null
) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.audit_trail_list(p_filters, p_before_at, p_before_id, now()); $$;

create function public.audit_trail_options() returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.audit_trail_options(); $$;

create function public.audit_trail_export(p_filters jsonb default '{}'::jsonb, p_format text default 'xlsx') returns jsonb
language sql volatile security definer set search_path = ''
as $$ select authz.audit_trail_export(p_filters, p_format, now()); $$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.audit_trail_require(), authz.audit_trail_entity_visible(text, text), authz.audit_trail_filters(jsonb),
  authz.audit_period_start(text, timestamptz),
  authz.audit_trail_visible(jsonb, timestamptz, bigint, integer, timestamptz),
  authz.audit_mask(jsonb, text[], text[], boolean, boolean), authz.audit_changed_keys(jsonb, jsonb),
  authz.audit_subject(jsonb, jsonb), authz.audit_trail_rows(jsonb, timestamptz, bigint, integer, timestamptz),
  authz.audit_trail_list(jsonb, timestamptz, bigint, timestamptz), authz.audit_trail_options(),
  authz.audit_trail_count(jsonb, timestamptz), authz.audit_trail_export(jsonb, text, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.audit_trail(jsonb, timestamptz, bigint), public.audit_trail_options(), public.audit_trail_export(jsonb, text)
  from public, anon, authenticated;

grant execute on function
  public.audit_trail(jsonb, timestamptz, bigint), public.audit_trail_options(), public.audit_trail_export(jsonb, text)
  to authenticated;
