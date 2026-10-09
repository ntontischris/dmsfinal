-- Συμφωνίες: προτάσεις, Παρεκκλίσεις και Έγκριση, Σύνδεσμος πρότασης και υπογραφή, εκτός συστήματος, Ρυθμίσεις (κεφ. 3, ADR 0008, 0009, 0015, 0016, 0017). Φανταστικοί Χρήστες και στοιχεία.
begin;
select plan(428);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Διαχείριση · e3 Άννα (Πωλήσεις) · e4 Νίκος (Πωλήσεις) · e5 Λογιστής · e6 Παραγωγή
-- e7 «Ελεγκτής» (audit.view) · e8 «Συντάκτης χωρίς ποσά» (clients.manage + agreements.draft + catalogue.view)
-- e9 «Ρυθμιστής» (settings.manage, χωρίς ποσά)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'drafter@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'settings@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Νίκος', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Μαρία', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'Κώστας', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'Ελένη', 'drafter@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'Σοφία', 'settings@example.com');

insert into public.roles (name, kind) values
  ('Ελεγκτής', 'team'), ('Συντάκτης χωρίς ποσά', 'team'), ('Ρυθμιστής', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, g.scope
  from (values
    ('Ελεγκτής', 'audit.view', 'all'),
    ('Συντάκτης χωρίς ποσά', 'clients.manage', 'mine'), ('Συντάκτης χωρίς ποσά', 'agreements.draft', 'mine'),
    ('Συντάκτης χωρίς ποσά', 'catalogue.view', 'all'),
    ('Ρυθμιστής', 'settings.manage', 'all')
  ) as g (role_name, code, scope)
  join public.roles r on r.name = g.role_name and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e5', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000e6', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e7', 'Ελεγκτής'),
    ('00000000-0000-0000-0000-0000000000e8', 'Συντάκτης χωρίς ποσά'),
    ('00000000-0000-0000-0000-0000000000e9', 'Ρυθμιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτες: f1, f3 της Άννας · f2 του Νίκου · f4 της Ελένης (e8).
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', 'Κυψέλη Καφέ Ι.Κ.Ε.', 'Αθήνα', '099999999', 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Γυμναστήριο Κίνηση', '', 'Πειραιάς', null, 'Πέτρος Νικολάου', 'info@kinisi.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000e4'),
  ('00000000-0000-0000-0000-0000000000f3', 'Ζαχαροπλαστείο Μέλι', '', 'Αθήνα', null, 'Ελένη Μέλη', 'eleni@meli.example.gr', '210 3333333', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f4', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', null, 'Κώστας Αρμύρας', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000e8');

-- Ευκαιρίες: o1 κύρια ροή (μηνιαία) · o2 εφάπαξ · o3 απόρριψη · o4 λήξη/Παράταση · o5 αναθεώρηση/ανάκληση · o6 εκτός συστήματος μηνιαία
-- o7 εκτός συστήματος εφάπαξ · o8 κλείσιμο ως χαμένη από τις Πωλήσεις · o9 του Νίκου · o10 χαμένη · o11 του e8 · o12 συγχώνευση · o13 ρήτρα λύσης
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), o.manager::uuid, 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο social', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f1', 'Βίντεο εγκαινίων', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f1', 'Φωτογράφιση μενού', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000f1', 'Podcast', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000f3', 'Ανανέωση social', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000f3', 'Παλιός πελάτης', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000f3', 'Εκδήλωση', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000f3', 'Διαφήμιση', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000f2', 'Social γυμναστηρίου', '00000000-0000-0000-0000-0000000000e4'),
    ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000f1', 'Παλιά ευκαιρία', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-0000000000f4', 'Menu video', '00000000-0000-0000-0000-0000000000e8'),
    ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000f2', 'Συγχώνευση', '00000000-0000-0000-0000-0000000000e4'),
    ('00000000-0000-0000-0000-0000000000cd', '00000000-0000-0000-0000-0000000000f1', 'Έξτρα εκδήλωση', '00000000-0000-0000-0000-0000000000e3')
  ) as o (id, client, title, manager);
update public.opportunities
   set outcome = 'lost', closed_at = now(), loss_reason_id = (select r.id from public.sales_loss_reasons r where r.code = 'price')
 where id = '00000000-0000-0000-0000-0000000000ca';

-- Κατάλογος: Πακέτο μηνιαίο, Πακέτο εφάπαξ, Υπηρεσίες, αρχειοθετημένο Πακέτο. Κόστος ώρας του μήνα: 40 €.
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'package', 'monthly', 'Μηνιαία Παρουσία', 'Monthly Presence', '', null),
  ('00000000-0000-0000-0000-0000000000a2', 'package', 'one_off', 'Εκδήλωση', 'Event', '', null),
  ('00000000-0000-0000-0000-0000000000a3', 'service', null, 'Έξτρα reel', 'Extra reel', 'ανά reel', null),
  ('00000000-0000-0000-0000-0000000000a4', 'package', 'monthly', 'Παλιό πακέτο', '', '', now()),
  ('00000000-0000-0000-0000-0000000000a5', 'service', null, 'Drone', 'Drone', 'ανά ώρα', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000a1', 1300), ('00000000-0000-0000-0000-0000000000a2', 400),
  ('00000000-0000-0000-0000-0000000000a3', 150), ('00000000-0000-0000-0000-0000000000a4', 500),
  ('00000000-0000-0000-0000-0000000000a5', 80);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000a1', 6, 14, 0), ('00000000-0000-0000-0000-0000000000a2', 4, 6, 0),
  ('00000000-0000-0000-0000-0000000000a3', 1, 3, 0), ('00000000-0000-0000-0000-0000000000a4', 2, 2, 0),
  ('00000000-0000-0000-0000-0000000000a5', 0, 0, 40);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select p.item::uuid, k.id, p.qty
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'shoot', 2), ('00000000-0000-0000-0000-0000000000a1', 'reel', 8),
    ('00000000-0000-0000-0000-0000000000a2', 'shoot', 1), ('00000000-0000-0000-0000-0000000000a2', 'video', 1),
    ('00000000-0000-0000-0000-0000000000a3', 'reel', 1),
    ('00000000-0000-0000-0000-0000000000a4', 'reel', 4)
  ) as p (item, code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

-- Βοηθητικά των τεστ (ζουν μόνο μέσα στη συναλλαγή): [{kind_id, quantity}] και το token ενός Συνδέσμου από τα εξερχόμενα.
create function public.t_prov(p_codes text[], p_qty integer[]) returns jsonb
language sql stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind_id', k.id, 'quantity', u.q) order by u.n), '[]'::jsonb)
    from unnest(p_codes, p_qty) with ordinality as u (code, q, n)
    join public.provision_kinds k on k.code = u.code;
$$;
create function public.t_token(p_agreement uuid, p_email text default null) returns text
language sql stable
as $$
  select substr(v.link_path, 4) from public.agreement_outbox_view(p_agreement) v
   where v.kind = 'proposal_link' and v.status = 'pending' and (p_email is null or v.to_email = p_email)
   order by v.created_at desc limit 1;
$$;
create function public.t_code(p_agreement uuid) returns text
language sql stable
as $$
  select v.code from public.agreement_outbox_view(p_agreement) v
   where v.kind = 'signing_code' and v.status = 'pending' order by v.created_at desc limit 1;
$$;
create function public.t_line(p_agreement uuid, p_n integer) returns uuid
language sql stable
as $$
  select l.id from public.agreement_lines l where l.agreement_id = p_agreement order by l.position, l.id offset p_n - 1 limit 1;
$$;

-- ───────────── Αρχικές τιμές και δομή ─────────────
select is(
  (select proposal_validity_days || '/' || standard_discount_percent || '/' || standard_discount_months || '/' || advance_percent
     from public.agreement_defaults),
  '21/10.00/2/50.00', 'Αρχικές προεπιλογές: Ισχύς 21 μέρες, τυπική έκπτωση 10% για 2 μήνες, προκαταβολή 50%'
);
select is(
  (select payment_days_monthly || '/' || payment_days_one_off || '/' || unused_provisions || '/' || grace_days || '/' || duration_months
          || '/' || renewal || '/' || dissolution_notice_days || '/' || dissolution_fee from public.agreement_defaults),
  '15/15/next_period/10/6/new_opportunity/30/0.00', 'Αρχικοί Όροι: 15 μέρες, επόμενη Περίοδος, χάρις 10, 6 μήνες, νέα Ευκαιρία, λύση 30 μέρες'
);
select is(
  (select filming_notice_hours || '/' || filming_cancel_hours || '/' || late_cancel_burns || '/' || no_show_burns from public.agreement_defaults),
  '48/24/true/true', 'Αρχική Πολιτική Γυρισμάτων: 48 ώρες, ακύρωση 24, καίνε και τα δύο'
);
select is((select email_sender_connected from public.agreement_defaults), false, 'Ο πάροχος email δεν είναι συνδεδεμένος: τα μηνύματα παραδίδονται με το χέρι');
select is(
  (select string_agg(code || '=' || coalesce(revision_limit::text, 'χωρίς'), ', ' order by sort) from public.provision_kinds where code is not null),
  'shoot=χωρίς, reel=2, video=2, photo=1, podcast_episode=1', 'Όριο αλλαγών ανά είδος Παροχής: reel 2, βίντεο 2, φωτογραφία 1, επεισόδιο 1, το Γύρισμα χωρίς'
);
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('agreement_defaults', 'agreements', 'agreement_amounts', 'agreement_baselines', 'agreement_revision_limits',
                        'agreement_milestones', 'agreement_lines', 'agreement_line_amounts', 'agreement_line_costs',
                        'agreement_line_provisions', 'agreement_costs', 'agreement_recipients', 'agreement_links', 'agreement_otps',
                        'agreement_signatures', 'agreement_documents', 'agreement_revisions', 'agreement_change_requests',
                        'agreement_outbox')),
  19, 'RLS ενεργό σε όλους τους πίνακες των Συμφωνιών'
);
select is((select count(*)::int from authz.readiness_items()), 11, 'Ο Έλεγχος ετοιμότητας μένει με 11 γραμμές: οι Συμφωνίες δεν προσθέτουν εκκρεμότητα');
select is(
  (select count(*)::int from public.sales_loss_reasons where code = 'client_declined'), 0,
  'Ο Λόγος απώλειας «ο πελάτης απέρριψε» δεν υπάρχει ως την πρώτη απόρριψη'
);
select is(public.catalogue_item_uses('00000000-0000-0000-0000-0000000000a1'), 0::bigint, 'Καμία γραμμή Συμφωνίας δεν έχει αντιγράψει ακόμα το Πακέτο');

set local role authenticated;

-- ───────────── Κλειστοί πίνακες ─────────────
select throws_ok($$ select * from public.agreements $$, '42501', null, 'Η εφαρμογή δεν διαβάζει τις Συμφωνίες απευθείας');
select throws_ok($$ select * from public.agreement_line_amounts $$, '42501', null, 'Ούτε τις τιμές των γραμμών');
select throws_ok($$ select * from public.agreement_links $$, '42501', null, 'Ούτε τους Συνδέσμους');
select throws_ok($$ select * from public.agreement_outbox $$, '42501', null, 'Ούτε τα εξερχόμενα');
select throws_ok($$ insert into public.agreement_defaults (id) values (false) $$, '42501', null, 'Ούτε γράφει στις προεπιλογές απευθείας');

-- ───────────── Άννα: νέα πρόταση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);

select throws_ok(
  $$ select public.agreement_create('00000000-0000-0000-0000-0000000000c9', 'monthly', null) $$,
  'P0001', 'Η Ευκαιρία δεν βρέθηκε', 'Ευκαιρία του Νίκου: η Άννα δεν ανοίγει Συμφωνία (Εύρος «με αφορά»)'
);
select throws_ok(
  $$ select public.agreement_create('00000000-0000-0000-0000-0000000000ca', 'monthly', null) $$,
  'P0001', 'Συμφωνία ανοίγει μόνο σε ανοιχτή Ευκαιρία', 'Σε χαμένη Ευκαιρία δεν ανοίγει Συμφωνία'
);
select throws_ok(
  $$ select public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'weekly', null) $$,
  'P0001', null, 'Μόνο μηνιαία ή εφάπαξ'
);
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', null)::text, true);
select set_config('t.a2', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'one_off', 'Εγκαίνια Κυψέλης')::text, true);
select throws_ok(
  $$ select public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', null) $$,
  'P0001', null, 'Μία Ευκαιρία, μία Συμφωνία'
);

select is(
  (select v ->> 'title' || '|' || (v ->> 'kind') || '|' || (v ->> 'state') || '|' || (v ->> 'path') || '|' || (v ->> 'revision')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'Μηνιαίο social|monthly|proposal|draft|1', 'Ο τίτλος παίρνει το όνομα της Ευκαιρίας· ξεκινά ως πρόταση σε Σύνταξη, αναθεώρηση 1'
);
select is(
  (select v ->> 'title' from (select public.agreement_view(current_setting('t.a2')::uuid) as v) x),
  'Εγκαίνια Κυψέλης', 'Ο τίτλος που γράφεις μένει'
);
select is(
  (select (v -> 'terms' ->> 'payment_days') || '/' || (v -> 'terms' ->> 'unused_provisions') || '/' || (v -> 'terms' ->> 'grace_days')
          || '/' || (v ->> 'duration_months') || '/' || (v -> 'terms' ->> 'renewal') || '/' || (v -> 'terms' ->> 'dissolution_notice_days')
          || '/' || (v -> 'terms' ->> 'filming_cancel_hours')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '15/next_period/10/6/new_opportunity/30/24', 'Οι Όροι της μηνιαίας αντιγράφουν το σετ των προεπιλογών'
);
select is(
  (select (v -> 'terms' ->> 'unused_provisions') || '/' || (v -> 'terms' ->> 'grace_days') || '/' || coalesce(v ->> 'duration_months', 'null')
     from (select public.agreement_view(current_setting('t.a2')::uuid) as v) x),
  'lost/0/null', 'Η εφάπαξ: οι Παροχές χάνονται, χωρίς Περίοδο χάριτος, χωρίς Διάρκεια'
);
select is(
  (select (v ->> 'valid_until')::date - (now() at time zone 'Europe/Athens')::date from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  21, 'Η Ισχύς πρότασης ξεκινά από τις Ρυθμίσεις: 21 μέρες'
);
select is(
  (select jsonb_array_length(v -> 'recipients') || '|' || (v -> 'recipients' -> 0 ->> 'email') || '|' || (v -> 'recipients' -> 0 ->> 'is_signatory')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '1|maria@kypseli.example.gr|true', 'Υπογράφων είναι το κύριο πρόσωπο επικοινωνίας του Πελάτη'
);
select is(
  (select string_agg((e ->> 'milestone'), ',') from (
     select jsonb_build_object('milestone', (m ->> 'trigger') || ':' || (m ->> 'percent')) as e
       from jsonb_array_elements(public.agreement_view(current_setting('t.a2')::uuid) -> 'milestones') m) q),
  'signature:50.00,delivered:50.00', 'Η εφάπαξ ξεκινά με δόσεις 50% στην υπογραφή και 50% στην παράδοση'
);
select is(
  (select jsonb_array_length(v -> 'revision_limits') from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  4, 'Το Όριο αλλαγών αντιγράφεται: reel, βίντεο, φωτογραφία, επεισόδιο'
);
select is(
  (select count(*)::int from public.opportunity_activities
    where opportunity_id = '00000000-0000-0000-0000-0000000000c1' and event = 'agreement'),
  1, 'Η έναρξη της σύνταξης γράφεται ως Δραστηριότητα της Ευκαιρίας'
);

-- Όποιος δεν συντάσσει δεν ανοίγει Συμφωνία.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok(
  $$ select public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'monthly', null) $$,
  '42501', null, 'Ο Λογιστής δεν συντάσσει προτάσεις'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok(
  $$ select public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'monthly', null) $$,
  '42501', null, 'Ούτε η Παραγωγή'
);

-- ───────────── Γραμμές από τον Κατάλογο ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);

select throws_ok(
  format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a2', 1) $$, current_setting('t.a1')),
  'P0001', 'Το Πακέτο είναι εφάπαξ και δεν μπαίνει σε μηνιαία Συμφωνία', 'Εφάπαξ Πακέτο δεν μπαίνει σε μηνιαία Συμφωνία'
);
select throws_ok(
  format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a1', 1) $$, current_setting('t.a2')),
  'P0001', 'Το Πακέτο είναι μηνιαίο και δεν μπαίνει σε εφάπαξ Συμφωνία', 'Μηνιαίο Πακέτο δεν μπαίνει σε εφάπαξ Συμφωνία'
);
select throws_ok(
  format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a4', 1) $$, current_setting('t.a1')),
  'P0001', 'Το Πακέτο ή η Υπηρεσία δεν βρέθηκε ή έχει αρχειοθετηθεί', 'Αρχειοθετημένο Πακέτο δεν μπαίνει ποτέ'
);
select throws_ok(
  format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a1', 0) $$, current_setting('t.a1')),
  'P0001', 'Η ποσότητα είναι από 1 έως 999', 'Ποσότητα 0 δεν γίνεται'
);
select is(
  (select count(*)::int from public.agreement_catalogue_options(current_setting('t.a1')::uuid)),
  3, 'Η μηνιαία Συμφωνία προσφέρει το μηνιαίο Πακέτο και τις δύο Υπηρεσίες (όχι το εφάπαξ, όχι το αρχειοθετημένο)'
);
select is(
  (select price from public.agreement_catalogue_options(current_setting('t.a1')::uuid) where name = 'Μηνιαία Παρουσία'),
  1300.00, 'Η Άννα βλέπει την τιμή στις επιλογές'
);

select set_config('t.l1', public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000a1', 1)::text, true);
select set_config('t.l2', public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000a3', 4)::text, true);

select is(
  (select (l ->> 'description') || '|' || (l ->> 'quantity') || '|' || (l ->> 'unit_price') || '|' || (l ->> 'catalog_price') || '|' || (l ->> 'kind')
     from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'lines') l where l ->> 'id' = current_setting('t.l1')),
  'Μηνιαία Παρουσία|1|1300.00|1300.00|package', 'Η γραμμή αντιγράφει όνομα και τιμή του Καταλόγου'
);
select is(
  (select (l ->> 'description') || '|' || (l ->> 'quantity') || '|' || (l ->> 'unit_price') || '|' || (l ->> 'kind')
     from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'lines') l where l ->> 'id' = current_setting('t.l2')),
  'Έξτρα reel|4|150.00|service', 'Η Υπηρεσία μπαίνει με ποσότητα 4'
);
select is(
  (select string_agg(k.code || '=' || (p ->> 'quantity') || '/' || (p ->> 'catalog_quantity'), ',' order by k.sort)
     from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'lines' -> 0 -> 'provisions') p
     join public.provision_kinds k on k.id = (p ->> 'kind_id')::uuid),
  'shoot=2/2,reel=8/8', 'Οι Παροχές της γραμμής αντιγράφονται, μαζί με του Καταλόγου της στιγμής'
);
select is(
  (select (v -> 'lines' -> 0 ->> 'hours_shoot') is null and (v -> 'lines' -> 0 ->> 'direct_cost') is null and (v ->> 'cost') is null
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  true, 'Η Άννα δεν βλέπει ώρες, κόστος ή περιθώριο: null, όχι μηδέν'
);
select is(
  (select (v -> 'totals' ->> 'price') || '|' || (v -> 'totals' ->> 'vat_rate') || '|' || (v -> 'totals' ->> 'gross')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '1900.00|24.00|2356.00', 'Σύνολο 1.900 € χωρίς ΦΠΑ, 24%, 2.356 € με ΦΠΑ'
);
select is(
  (select jsonb_array_length(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations')),
  0, 'Γραμμές από τον Κατάλογο στις τιμές του: καμία Παρέκκλιση'
);

select is(
  (select jsonb_array_length(d -> 'lines') || '|' || (d -> 'totals' ->> 'net') || '|' || (d ->> 'title') || '|' || (d -> 'client' ->> 'name')
     from (select public.agreement_document_preview(current_setting('t.a1')::uuid) as d) x),
  '2|1900.00|Μηνιαίο social|Κυψέλη Καφέ', 'Η προεπισκόπηση δείχνει το έγγραφο όπως θα το δει ο πελάτης, ζωντανά στη Σύνταξη'
);

-- Ώρες και κόστος γραμμής: μόνο «Διαχειρίζεται κόστος».
select throws_ok(
  format($$ select public.agreement_update_line(%L, null, null, null, null, 8, null, null) $$, current_setting('t.l1')),
  '42501', null, 'Η Άννα δεν αλλάζει τις ώρες μιας γραμμής'
);
select lives_ok(
  format($$ select public.agreement_update_line(%L, 2, null, null, null, null, null, null) $$, current_setting('t.l2')),
  'Αλλάζει την ποσότητα της γραμμής'
);
select is(
  (select (v -> 'totals' ->> 'price') from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '1600.00', 'Η ποσότητα πολλαπλασιάζει την τιμή: 1.300 + 2 × 150'
);
select lives_ok(
  format($$ select public.agreement_update_line(%L, 4, null, null, null, null, null, null) $$, current_setting('t.l2')),
  'Ξανά ποσότητα 4'
);
select throws_ok(
  format($$ select public.agreement_update_line(%L, 1000, null, null, null, null, null, null) $$, current_setting('t.l2')),
  'P0001', 'Η ποσότητα είναι από 1 έως 999', 'Ποσότητα 1000 δεν γίνεται'
);

-- Ελεύθερη γραμμή: θέλει «Βλέπει ποσά».
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.agreement_add_free_line(%L, 'Drone', '', 80) $$, current_setting('t.a1')),
  '42501', null, 'Όποιος δεν βλέπει ποσά δεν γράφει ελεύθερη γραμμή (κανείς δεν γράφει τυφλά)'
);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6) $$, current_setting('t.a1')),
  '42501', null, 'Ο e8 δεν αγγίζει Συμφωνία πελάτη άλλου πωλητή'
);
select is(
  (select count(*)::int from public.agreements_list()), 0, 'Ο e8 δεν βλέπει Συμφωνίες που δεν τον αφορούν'
);
select set_config('t.b1', public.agreement_create('00000000-0000-0000-0000-0000000000cb', 'monthly', null)::text, true);
select set_config('t.lb1', public.agreement_add_catalogue_line(current_setting('t.b1')::uuid, '00000000-0000-0000-0000-0000000000a1', 1)::text, true);
select is(
  (select (l ->> 'unit_price') is null and (l ->> 'catalog_price') is null and (l ->> 'line_total') is null
     from jsonb_array_elements(public.agreement_view(current_setting('t.b1')::uuid) -> 'lines') l limit 1),
  true, 'Χωρίς «Βλέπει ποσά» η τιμή της γραμμής είναι null'
);
select is(
  (select public.agreement_view(current_setting('t.b1')::uuid) ->> 'totals'), null::text, 'Και τα σύνολα είναι null'
);
select is(public.agreement_document_preview(current_setting('t.b1')::uuid), null::jsonb, 'Χωρίς «Βλέπει ποσά» δεν υπάρχει προεπισκόπηση (θα έδειχνε τιμές)');
select is(
  (select price from public.agreement_catalogue_options(current_setting('t.b1')::uuid) limit 1), null::numeric,
  'Και οι τιμές στις επιλογές του Καταλόγου'
);
select throws_ok(
  format($$ select public.agreement_update_line(%L, null, null, null, 1000, null, null, null) $$, current_setting('t.lb1')),
  '42501', null, 'Δεν αλλάζει τιμή που δεν βλέπει'
);
-- Ελεύθερη γραμμή από την Άννα και Παροχές της γραμμής.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.l3', public.agreement_add_free_line(current_setting('t.a1')::uuid, 'Βίντεο drone', 'Drone video', 400)::text, true);
select is(
  (select (l ->> 'kind') || '|' || (l ->> 'unit_price') || '|' || coalesce(l ->> 'catalog_price', 'null') || '|' || (l ->> 'description_en')
     from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'lines') l where l ->> 'id' = current_setting('t.l3')),
  'free|400.00|null|Drone video', 'Η ελεύθερη γραμμή δεν έχει τιμή Καταλόγου'
);
select is(
  (select string_agg(d ->> 'key', ',') from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations') d),
  'free:' || current_setting('t.l3'), 'Η ελεύθερη γραμμή είναι πάντα Παρέκκλιση'
);
select is(
  (select (v ->> 'needs_approval')::boolean from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  true, 'Η Άννα δεν «Παρεκκλίνει»: η πρόταση θέλει Έγκριση'
);
select lives_ok(
  format($$ select public.agreement_set_line_provisions(%L, public.t_prov(array['reel'], array[2])) $$, current_setting('t.l3')),
  'Παροχές στην ελεύθερη γραμμή'
);
select throws_ok(
  format($$ select public.agreement_set_line_provisions(%L, '[{"kind_id":"00000000-0000-0000-0000-000000000999","quantity":1}]') $$, current_setting('t.l3')),
  'P0001', 'Άγνωστο είδος Παροχής', 'Άγνωστο είδος Παροχής'
);
select throws_ok(
  format($$ select public.agreement_set_line_provisions(%L, public.t_prov(array['reel','reel'], array[1,2])) $$, current_setting('t.l3')),
  'P0001', 'Κάθε είδος Παροχής μπαίνει μία φορά', 'Κάθε είδος μία φορά'
);
select lives_ok(
  format($$ select public.agreement_remove_line(%L) $$, current_setting('t.l3')),
  'Αφαίρεση γραμμής'
);
select is(
  (select jsonb_array_length(public.agreement_view(current_setting('t.a1')::uuid) -> 'lines')), 2, 'Μένουν οι δύο γραμμές του Καταλόγου'
);
select is(
  (select jsonb_array_length(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations')), 0, 'Και η Παρέκκλιση φεύγει μαζί με τη γραμμή'
);

-- ───────────── Παρεκκλίσεις και Έγκριση (ADR 0009) ─────────────
select set_config('t.l3', public.agreement_add_free_line(current_setting('t.a1')::uuid, 'Βίντεο drone', 'Drone video', 400)::text, true);
select lives_ok(
  format($$ select public.agreement_update_line(%L, null, null, null, 120, null, null, null) $$, current_setting('t.l2')),
  'Τιμή κάτω από τον Κατάλογο (120 αντί 150)'
);
select lives_ok(
  format($$ select public.agreement_set_line_provisions(%L, public.t_prov(array['reel','photo'], array[3, 2])) $$, current_setting('t.l2')),
  'Περισσότερες Παροχές από τον Κατάλογο (3 reels αντί 1, και 2 φωτογραφίες)'
);
select is(
  (select string_agg(d ->> 'kind', ',' order by d ->> 'kind') from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations') d),
  'free_line,price,provisions', 'Τρεις Παρεκκλίσεις: ελεύθερη γραμμή, τιμή, Παροχές'
);
select is(
  (select (d ->> 'depth') || '|' || (d ->> 'base_value') || '|' || (d ->> 'value')
     from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations') d where d ->> 'kind' = 'price'),
  '30.00|150.00|120.00', 'Η Παρέκκλιση τιμής: βάθος 30 €, από 150 σε 120'
);
select is(
  (select (d ->> 'depth') from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations') d where d ->> 'kind' = 'provisions'),
  '4', 'Οι επιπλέον Παροχές: 2 reels πάνω από τον Κατάλογο + 2 φωτογραφίες'
);
select is(
  (select count(*)::int from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations') d where d ->> 'status' = 'new'),
  3, 'Όλες νέες: καμία Έγκριση δεν τις καλύπτει'
);
select throws_ok(
  format($$ select public.agreement_send(%L) $$, current_setting('t.a1')),
  'P0001', 'Η πρόταση έχει Παρέκκλιση χωρίς Έγκριση· ζήτησε Έγκριση', 'Η πρόταση με Παρέκκλιση δεν στέλνεται χωρίς Έγκριση'
);
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, 'Μαρία', (now() at time zone 'Europe/Athens')::date, 'file.pdf') $$, current_setting('t.a1')),
  '42501', null, 'Η Άννα δεν καταχωρεί υπογραφή εκτός συστήματος'
);
select throws_ok(
  format($$ select public.agreement_decide(%L, true, '') $$, current_setting('t.a1')),
  '42501', null, 'Η Άννα δεν εγκρίνει'
);
select lives_ok(
  format($$ select public.agreement_request_approval(%L) $$, current_setting('t.a1')),
  'Αίτημα έγκρισης'
);
select is(
  (select path || '|' || revision from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000c1')),
  'awaiting_approval|1', 'Η πορεία γίνεται «Αναμένει Έγκριση»'
);
select is(
  (select approval_pending_days || '|' || needs_approval || '|' || deviation_count from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000c1')),
  '0|true|3', 'Η B4 δείχνει: αναμονή 0 μέρες, 3 Παρεκκλίσεις'
);
select is((select count(*)::int from public.agreement_approvals_view()), 0, 'Η Άννα δεν «Παρεκκλίνει»: η ουρά προτάσεων προς έγκριση είναι άδεια γι αυτήν');

-- Αλλαγή όσο περιμένει Έγκριση: το αίτημα αποσύρεται.
select lives_ok(
  format($$ select public.agreement_update_line(%L, 5, null, null, null, null, null, null) $$, current_setting('t.l2')),
  'Η Άννα αλλάζει την πρόταση όσο περιμένει Έγκριση'
);
select is(
  (select v ->> 'path' || '|' || (v -> 'revisions' -> 0 -> 'approval' ->> 'state')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'draft|withdrawn', 'Το αίτημα αποσύρθηκε και η πρόταση γύρισε σε Σύνταξη (ίδια αναθεώρηση)'
);
select lives_ok(format($$ select public.agreement_request_approval(%L) $$, current_setting('t.a1')), 'Νέο αίτημα');
select lives_ok(format($$ select public.agreement_withdraw_approval(%L) $$, current_setting('t.a1')), 'Ο Υπεύθυνος αποσύρει το αίτημα μόνος του');
select throws_ok(
  format($$ select public.agreement_withdraw_approval(%L) $$, current_setting('t.a1')),
  'P0001', 'Δεν υπάρχει αίτημα Έγκρισης για απόσυρση', 'Δεν αποσύρεται ό,τι δεν περιμένει'
);
select lives_ok(format($$ select public.agreement_request_approval(%L) $$, current_setting('t.a1')), 'Και πάλι αίτημα');

-- Ο Εγκριτής (Ιδιοκτήτης).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select title || '|' || client_name || '|' || manager_name || '|' || jsonb_array_length(deviations) || '|' || is_reminder_due
     from public.agreement_approvals_view()),
  'Μηνιαίο social|Κυψέλη Καφέ|Άννα|3|false', 'Ο Ιδιοκτήτης βλέπει την πρόταση στην ουρά (D4), χωρίς υπενθύμιση ακόμα'
);
select is(
  (select (lines -> 1 ->> 'is_below')::boolean from public.agreement_approvals_view()), true, 'Η γραμμή με τιμή κάτω από τον Κατάλογο σημαίνεται'
);
select throws_ok(
  format($$ select public.agreement_decide(%L, false, '   ') $$, current_setting('t.a1')),
  'P0001', 'Γράψε σχόλιο: τι να αλλάξει ο Υπεύθυνος', 'Η απόρριψη θέλει σχόλιο'
);
select lives_ok(format($$ select public.agreement_decide(%L, false, 'Πολύ χαμηλή τιμή στο reel') $$, current_setting('t.a1')), 'Απόρριψη με σχόλιο');
select is(
  (select v ->> 'path' || '|' || (v -> 'revisions' -> 0 -> 'approval' ->> 'state') || '|' || (v -> 'revisions' -> 0 -> 'approval' ->> 'comment') || '|' || (v ->> 'revision')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'draft|rejected|Πολύ χαμηλή τιμή στο reel|1', 'Η απόρριψη γυρίζει σε Σύνταξη, στην ίδια αναθεώρηση'
);
select throws_ok(
  format($$ select public.agreement_decide(%L, true, '') $$, current_setting('t.a1')),
  'P0001', 'Η πρόταση δεν περιμένει Έγκριση', 'Δεν εγκρίνεται ό,τι δεν περιμένει'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_request_approval(%L) $$, current_setting('t.a1')), 'Ξανά αίτημα μετά τη διόρθωση');

-- Η Διαχείριση εγκρίνει: η πρόταση φεύγει αμέσως.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_decide(%L, true, 'Εντάξει για αυτόν τον πελάτη') $$, current_setting('t.a1')), 'Έγκριση');
select is(
  (select v ->> 'path' || '|' || (v -> 'revisions' -> 0 -> 'approval' ->> 'state') || '|' || (v -> 'revisions' -> 0 -> 'approval' ->> 'decided_by_name')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'sent|approved|Δημήτρης', 'Με το «Εγκρίνω» η πρόταση φεύγει αμέσως σε όλους τους παραλήπτες'
);
select is(
  (select count(*)::int from public.agreement_approvals_view()), 0, 'Η ουρά αδειάζει'
);
select is(
  (select string_agg(d ->> 'status', ',') from jsonb_array_elements(public.agreement_view(current_setting('t.a1')::uuid) -> 'deviations') d),
  'covered,covered,covered', 'Οι Παρεκκλίσεις είναι πια καλυμμένες από την Έγκριση'
);

-- ───────────── Αποστολή και Σύνδεσμοι ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  (select kind || '|' || status || '|' || to_email || '|' || (link_path ~ '^/p/[0-9a-f]{64}$')::text
     from public.agreement_outbox_view(current_setting('t.a1')::uuid) where kind = 'proposal_link'),
  'proposal_link|pending|maria@kypseli.example.gr|true', 'Ο Σύνδεσμος περιμένει στα εξερχόμενα: η ομάδα τον αντιγράφει (δεν υπάρχει email)'
);
select set_config('t.tok1', public.t_token(current_setting('t.a1')::uuid), true);
select is(
  (select jsonb_array_length(v -> 'recipients') || '|' || (v -> 'recipients' -> 0 -> 'link' ->> 'status') || '|' || (v -> 'recipients' -> 0 -> 'link' ->> 'is_opened')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '1|active|false', 'Ο Σύνδεσμος του παραλήπτη είναι ενεργός και δεν έχει ανοιχτεί'
);
select is(
  (select (v -> 'document' ->> 'revision') || '|' || (length(v -> 'document' ->> 'hash'))
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '1|64', 'Το έγγραφο της αναθεώρησης αποθηκεύτηκε με hash sha256'
);
select is(
  (select jsonb_array_length(d -> 'lines') || '|' || (d -> 'totals' ->> 'net') from (select public.agreement_document_preview(current_setting('t.a1')::uuid) as d) x),
  '3|2300.00', 'Η προεπισκόπηση της σταλμένης πρότασης είναι το αποθηκευμένο έγγραφο (3 γραμμές, 2.300 €)'
);
select throws_ok(
  format($$ select public.agreement_update_line(%L, 2, null, null, null, null, null, null) $$, current_setting('t.l2')),
  'P0001', 'Η πρόταση έχει σταλεί· κάνε πρώτα νέα αναθεώρηση', 'Μετά την αποστολή η αλλαγή θέλει νέα αναθεώρηση'
);
select throws_ok(
  format($$ select public.agreement_send(%L) $$, current_setting('t.a1')),
  'P0001', 'Η πρόταση έχει σταλεί· κάνε πρώτα νέα αναθεώρηση', 'Δεν στέλνεται δύο φορές'
);

-- Άλλοι Χρήστες δεν βλέπουν τα εξερχόμενα της Άννας.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select is((select count(*)::int from public.agreement_outbox_view(current_setting('t.a1')::uuid)), 0, 'Ο Νίκος δεν βλέπει τα εξερχόμενα της Άννας');
select is((select count(*)::int from public.agreements_list()), 0, 'Ούτε τη Συμφωνία της: Εύρος «με αφορά»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is((select count(*)::int from public.agreement_outbox_view(current_setting('t.a1')::uuid)), 0, 'Ο Λογιστής δεν βλέπει εξερχόμενα');
select is(
  (select jsonb_array_length(v -> 'deviations') || '|' || jsonb_array_length(v -> 'change_requests') || '|' || coalesce(v -> 'revisions' -> 0 ->> 'approval', 'null')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '0|0|null', 'Ο Λογιστής βλέπει τη Συμφωνία χωρίς Παρεκκλίσεις και Εγκρίσεις'
);
select is(
  (select (v -> 'totals' ->> 'price') is not null from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x), true,
  'Ο Λογιστής βλέπει τα ποσά'
);
select is(
  (select (v ->> 'cost') is null and (v -> 'lines' -> 0 ->> 'hours_shoot') is null from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  true, 'Αλλά όχι κόστος ή ώρες'
);
select is((select count(*)::int from public.agreements_list()), 3, 'Ο Λογιστής βλέπει όλες τις Συμφωνίες (Εύρος «όλα», μόνο ανάγνωση)');
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6) $$, current_setting('t.a1')),
  '42501', null, 'Αλλά δεν γράφει'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select is((select count(*)::int from public.agreements_list()), 0, 'Η Παραγωγή δεν βλέπει Συμφωνίες');
select is((select public.agreement_view(current_setting('t.a1')::uuid)) is null, true, 'Ούτε τη σελίδα τους');

-- ───────────── Σύνδεσμος πρότασης (D5): ανώνυμος επισκέπτης ─────────────
set local role anon;
select set_config('request.jwt.claims', '', true);

select is(public.agreement_public_view('δεν-είναι-token') ->> 'status', 'unknown', 'Λάθος μορφή token: άγνωστος Σύνδεσμος');
select is(public.agreement_public_view(repeat('a', 64)) ->> 'status', 'unknown', 'Token που δεν υπάρχει: άγνωστος Σύνδεσμος (ίδια απάντηση)');
select is(public.agreement_public_view(null) ->> 'status', 'unknown', 'Χωρίς token: άγνωστος Σύνδεσμος');
select is(public.agreement_public_view(upper(current_setting('t.tok1'))) ->> 'status', 'unknown', 'Το token δεν ταιριάζει με κεφαλαία: άγνωστος Σύνδεσμος');

select set_config('t.pv1', public.agreement_public_view(current_setting('t.tok1'))::text, true);
select is(current_setting('t.pv1')::jsonb ->> 'status', 'active', 'Ο ενεργός Σύνδεσμος ανοίγει την πρόταση');
select is(
  (select string_agg(k, ',' order by k collate "C") from jsonb_object_keys(current_setting('t.pv1')::jsonb -> 'document') k),
  'client,company,duration_months,kind,language,lines,milestones,provision_totals,revision,start_on,terms,title,totals,valid_until',
  'Το έγγραφο έχει μόνο ό,τι βλέπει ο πελάτης: γραμμές, Παροχές, τιμές, Όρους'
);
select is(
  current_setting('t.pv1')::jsonb -> 'document' ->> 'lines' ~ '(hours|direct_cost|catalog|deviation|margin|estimated)', false,
  'Ούτε ώρες, ούτε κόστος, ούτε τιμή Καταλόγου, ούτε Παρεκκλίσεις στις γραμμές'
);
select is(
  current_setting('t.pv1')::jsonb ->> 'document' ~ '(hours_shoot|hours_edit|direct_cost|catalog_price|approval|estimated_cost|deviation|margin)', false,
  'Κανένα στοιχείο κόστους ή Έγκρισης σε ολόκληρο το έγγραφο'
);
select is(
  (select (current_setting('t.pv1')::jsonb -> 'document' -> 'totals' ->> 'net')::numeric
        = 1300 + 5 * 120 + 400), true, 'Το σύνολο του εγγράφου είναι αυτό της αναθεώρησης 1 (1.300 + 5 × 120 + 400)'
);
select is(
  current_setting('t.pv1')::jsonb ->> 'masked_email', 'm•••@kypseli.example.gr', 'Το email του Υπογράφοντα φαίνεται συγκαλυμμένο'
);
select is(
  (current_setting('t.pv1')::jsonb ->> 'can_sign')::boolean || '|' || (current_setting('t.pv1')::jsonb ->> 'code_channel') || '|' || (current_setting('t.pv1')::jsonb ->> 'manager_name'),
  'true|manual|Άννα', 'Ο Υπογράφων υπογράφει· ο κωδικός παραδίδεται με το χέρι· ο Υπεύθυνος φαίνεται για επικοινωνία'
);
select is(
  (current_setting('t.pv1')::jsonb ? 'cost') or (current_setting('t.pv1')::jsonb ? 'deviations') or (current_setting('t.pv1')::jsonb ? 'agreement_id') or (current_setting('t.pv1')::jsonb ? 'id'),
  false, 'Η απάντηση δεν περιέχει id Συμφωνίας, κόστος ή Παρεκκλίσεις'
);
select throws_ok($$ select public.agreement_view('00000000-0000-0000-0000-000000000001') $$, '42501', null, 'Ο ανώνυμος δεν καλεί τις συναρτήσεις της ομάδας');
select throws_ok($$ select * from public.agreements $$, '42501', null, 'Ούτε διαβάζει πίνακες');
select throws_ok($$ select * from public.agreement_outbox_claim(5) $$, '42501', null, 'Ούτε τον αποστολέα email');
select throws_ok($$ select authz.agreement_settle('00000000-0000-0000-0000-000000000001') $$, '42501', null, 'Ούτε τις εσωτερικές συναρτήσεις');

-- ───────────── Άννα: ο πελάτης άνοιξε τον Σύνδεσμο ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  (select links_opened || '|' || links_total from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000c1')),
  '1|1', 'Η B4 δείχνει ότι ο Σύνδεσμος άνοιξε'
);
select is(
  (select v -> 'recipients' -> 0 -> 'link' ->> 'is_opened' from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'true', 'Και η D2'
);

-- ───────────── Νέα αναθεώρηση: οι παλιοί Σύνδεσμοι ακυρώνονται ─────────────
select lives_ok(format($$ select public.agreement_new_revision(%L, 'Νέα τιμή reel') $$, current_setting('t.a1')), 'Νέα αναθεώρηση της σταλμένης πρότασης');
select is(
  (select v ->> 'path' || '|' || (v ->> 'revision') || '|' || jsonb_array_length(v -> 'revisions') || '|' || (v -> 'revisions' -> 0 ->> 'summary')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'draft|2|2|Νέα τιμή reel', 'Αναθεώρηση 2 σε Σύνταξη, με ιστορικό'
);
select is(
  (select status from public.agreement_outbox_view(current_setting('t.a1')::uuid) where kind = 'proposal_link' and link_path is null limit 1),
  'cancelled', 'Το μήνυμα με τον παλιό Σύνδεσμο ακυρώθηκε και το token σβήστηκε'
);
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok1')) ->> 'status', 'superseded', 'Ο παλιός Σύνδεσμος λέει «υπάρχει νεότερη έκδοση»');
select is(
  public.agreement_public_view(current_setting('t.tok1')) ->> 'manager_name', 'Άννα', 'Και δείχνει με ποιον να επικοινωνήσει'
);
select is(
  public.agreement_public_view(current_setting('t.tok1')) ? 'document', false, 'Χωρίς το έγγραφο'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);

-- Η Έγκριση της αναθεώρησης 1 καλύπτει ό,τι δεν βαθαίνει.
select is(
  (select (v ->> 'needs_approval')::boolean from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  false, 'Αναθεώρηση χωρίς νέα ή βαθύτερη Παρέκκλιση: δεν θέλει νέα Έγκριση'
);
select lives_ok(format($$ select public.agreement_update_line(%L, null, null, null, 100, null, null, null) $$, current_setting('t.l2')), 'Βαθύτερη τιμή (100)');
select is(
  (select (v ->> 'needs_approval')::boolean || '|' || (select d ->> 'status' from jsonb_array_elements(v -> 'deviations') d where d ->> 'kind' = 'price')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'true|deeper', 'Βαθύτερη Παρέκκλιση: θέλει νέα Έγκριση'
);
select lives_ok(format($$ select public.agreement_update_line(%L, null, null, null, 135, null, null, null) $$, current_setting('t.l2')), 'Λιγότερο βαθιά (135)');
select is(
  (select (v ->> 'needs_approval')::boolean from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  false, 'Ό,τι μικραίνει μια εγκεκριμένη Παρέκκλιση δεν θέλει νέα Έγκριση'
);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Μηνιαίο social', 'el', (now() at time zone 'Europe/Athens')::date - 1, null, 6) $$, current_setting('t.a1')),
  'P0001', 'Η Ισχύς της πρότασης δεν μπορεί να είναι στο παρελθόν', 'Η Ισχύς δεν μπαίνει στο παρελθόν'
);
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a1')), 'Η Άννα στέλνει την αναθεώρηση 2 χωρίς νέα Έγκριση');
select set_config('t.tok2', public.t_token(current_setting('t.a1')::uuid), true);
select isnt(current_setting('t.tok2'), current_setting('t.tok1'), 'Νέος Σύνδεσμος για τη νέα αναθεώρηση');

-- ───────────── Ο πελάτης: αλλαγές, κωδικός, υπογραφή ─────────────
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_request_changes(current_setting('t.tok2'), '   ', '1.2.3.4') ->> 'status', 'invalid_message', 'Κενό μήνυμα αλλαγών δεν στέλνεται');
select is(public.agreement_public_request_changes(current_setting('t.tok2'), 'Μπορούμε 10 reels αντί για 8;', '1.2.3.4') ->> 'status', 'ok', '«Θέλω αλλαγές»: στάλθηκε στην ομάδα');
select is(public.agreement_public_view(current_setting('t.tok2')) ->> 'status', 'active', 'Η πρόταση μένει ανοιχτή');
select is(public.agreement_public_request_code(current_setting('t.tok2'), 'Μαρία Παπαδάκη', false, '1.2.3.4') ->> 'status', 'not_accepted', 'Χωρίς «Αποδέχομαι» δεν στέλνεται κωδικός');
select is(public.agreement_public_request_code(current_setting('t.tok2'), '   ', true, '1.2.3.4') ->> 'status', 'invalid_name', 'Χωρίς όνομα δεν στέλνεται κωδικός');
select set_config('t.rc1', public.agreement_public_request_code(current_setting('t.tok2'), 'Μαρία Παπαδάκη', true, '1.2.3.4')::text, true);
select is(current_setting('t.rc1')::jsonb ->> 'status' || '|' || (current_setting('t.rc1')::jsonb ->> 'channel'), 'sent|manual', 'Ο κωδικός μπήκε στα εξερχόμενα για χειροκίνητη παράδοση');
select is(current_setting('t.rc1')::jsonb ? 'code', false, 'Ο κωδικός δεν επιστρέφεται ποτέ στον ανώνυμο');
select is(
  public.agreement_public_request_code(current_setting('t.tok2'), 'Μαρία Παπαδάκη', true, '1.2.3.4') ->> 'status', 'rate_limited',
  'Δεύτερος κωδικός μέσα σε 60″: όριο'
);
select is(
  (public.agreement_public_request_code(current_setting('t.tok2'), 'Μαρία Παπαδάκη', true, '1.2.3.4') ->> 'retry_after')::int between 1 and 60, true,
  'Το όριο λέει σε πόσα δευτερόλεπτα ξαναδοκιμάζεις'
);
select is(public.agreement_public_sign(current_setting('t.tok2'), '12345', '1.2.3.4', 'test') ->> 'status', 'wrong_code', 'Λάθος κωδικός (5 ψηφία)');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.code1', public.t_code(current_setting('t.a1')::uuid), true);
select is(current_setting('t.code1') ~ '^[0-9]{6}$', true, 'Η ομάδα βλέπει τον κωδικό στα εξερχόμενα και τον λέει στον πελάτη (χειροκίνητη παράδοση)');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select is(public.t_code(current_setting('t.a1')::uuid), null, 'Άλλος πωλητής δεν βλέπει τον κωδικό');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(
  public.agreement_public_sign(current_setting('t.tok2'), case when current_setting('t.code1') = '000000' then '000001' else '000000' end, '1.2.3.4', 'test') ->> 'attempts_left',
  '3', 'Λάθος κωδικός: μένουν 3 προσπάθειες (η προσπάθεια καταγράφεται)'
);
select is(
  public.agreement_public_sign(current_setting('t.tok2'), '999999x', '1.2.3.4', 'test') ->> 'attempts_left', '2', 'Ο κωδικός με γράμματα μετρά κι αυτός'
);
select is(public.agreement_public_sign(current_setting('t.tok2'), '', '1.2.3.4', 'test') ->> 'attempts_left', '1', 'Κενός κωδικός μετρά κι αυτός');
select is(public.agreement_public_sign(current_setting('t.tok2'), '', '1.2.3.4', 'test') ->> 'status', 'locked', 'Μετά από 5 προσπάθειες ο κωδικός κλειδώνει');
select is(
  public.agreement_public_sign(current_setting('t.tok2'), current_setting('t.code1'), '1.2.3.4', 'test') ->> 'status', 'locked',
  'Ακόμα και ο σωστός κωδικός δεν περνά πια'
);

-- Ο χρόνος περνά: ο πελάτης ζητά νέο κωδικό.
reset role;
update public.agreement_otps set created_at = now() - interval '5 minutes';
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_request_code(current_setting('t.tok2'), 'Μαρία Παπαδάκη', true, '1.2.3.4') ->> 'status', 'sent', 'Νέος κωδικός μετά το λεπτό');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.code2', public.t_code(current_setting('t.a1')::uuid), true);
select is(
  (select count(*)::int from public.agreement_outbox_view(current_setting('t.a1')::uuid) where kind = 'signing_code' and status = 'pending'),
  1, 'Μόνο ο τελευταίος κωδικός περιμένει· ο προηγούμενος ακυρώθηκε και σβήστηκε'
);
select isnt(current_setting('t.code2'), current_setting('t.code1'), 'Νέος κωδικός');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(
  public.agreement_public_sign(current_setting('t.tok2'), current_setting('t.code1'), '1.2.3.4', 'test') ->> 'status' in ('wrong_code', 'locked'), true,
  'Ο παλιός κωδικός δεν περνά'
);
select set_config('t.sign', public.agreement_public_sign(current_setting('t.tok2'), current_setting('t.code2'), '1.2.3.4', 'Mozilla test')::text, true);
select is(current_setting('t.sign')::jsonb ->> 'status', 'signed', 'Με τον σωστό κωδικό η Συμφωνία υπογράφεται');
select is(public.agreement_public_view(current_setting('t.tok2')) ->> 'status', 'signed', 'Ο Σύνδεσμος λέει «έχει ήδη υπογραφεί»');
select is(public.agreement_public_sign(current_setting('t.tok2'), current_setting('t.code2'), '1.2.3.4', 'test') ->> 'status', 'signed', 'Δεύτερη υπογραφή δεν γίνεται');
select is(public.agreement_public_decline(current_setting('t.tok2'), 'Άλλαξα γνώμη', '1.2.3.4') ->> 'status', 'signed', 'Ούτε απόρριψη μετά την υπογραφή');

-- ───────────── Μετά την υπογραφή ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  (select v ->> 'state' || '|' || (v ->> 'path') || '|' || ((v ->> 'start_on')::date = (now() at time zone 'Europe/Athens')::date)::text
          || '|' || ((v ->> 'end_on')::date = ((now() at time zone 'Europe/Athens')::date + interval '6 months')::date - 1)::text
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'active|signed|true|true', 'Υπογεγραμμένη και ενεργή από σήμερα· Λήξη = Έναρξη + 6 μήνες − 1 μέρα'
);
select is(
  (select v -> 'signature' ->> 'method' || '|' || (v -> 'signature' ->> 'signed_name') || '|' || (v -> 'signature' ->> 'otp_delivery') || '|' || (v -> 'signature' ->> 'ip')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'link|Μαρία Παπαδάκη|manual|1.2.3.4', 'Η υπογραφή κρατά όνομα, τρόπο, παράδοση κωδικού και διεύθυνση σύνδεσης'
);
select is(
  (select v -> 'signature' ->> 'document_hash' = v -> 'document' ->> 'hash' from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  true, 'Η υπογραφή δένεται με το hash του εγγράφου που είδε ο Υπογράφων'
);
select is(
  (select outcome from public.opportunities where id = '00000000-0000-0000-0000-0000000000c1'), 'won', 'Η Ευκαιρία έγινε κερδισμένη με την υπογραφή'
);
select is(
  (select count(*)::int from public.opportunity_activities
    where opportunity_id = '00000000-0000-0000-0000-0000000000c1' and event = 'agreement' and body like 'Υπογράφηκε η Συμφωνία από Μαρία Παπαδάκη (Σύνδεσμος πρότασης)%'),
  1, 'Η υπογραφή γράφεται ως Δραστηριότητα'
);
select is(
  (select count(*)::int from public.opportunity_activities
    where opportunity_id = '00000000-0000-0000-0000-0000000000c1' and event = 'agreement' and body like 'Ο πελάτης ζήτησε αλλαγές (Μαρία Παπαδάκη): «Μπορούμε 10 reels%'),
  1, 'Και το αίτημα αλλαγών'
);
select is(
  (select string_agg(kind || ':' || status, ',' order by kind, status) from public.agreement_outbox_view(current_setting('t.a1')::uuid)
    where kind in ('signed_copy', 'client_invite')),
  'client_invite:pending,signed_copy:pending', 'Αντίγραφο και πρόσκληση Χρήστη πελάτη περιμένουν στα εξερχόμενα (δεν υπάρχει πάροχος email)'
);
select is(
  (select count(*)::int from public.agreement_outbox_view(current_setting('t.a1')::uuid) where kind in ('proposal_link', 'signing_code') and status = 'pending'),
  0, 'Κανένας Σύνδεσμος ή κωδικός δεν περιμένει πια'
);
select throws_ok(
  format($$ select public.agreement_update_line(%L, 2, null, null, null, null, null, null) $$, current_setting('t.l2')),
  'P0001', 'Η Συμφωνία έχει υπογραφεί και δεν αλλάζει', 'Η υπογεγραμμένη Συμφωνία δεν αλλάζει'
);
select throws_ok(
  format($$ select public.agreement_new_revision(%L, null) $$, current_setting('t.a1')),
  'P0001', 'Νέα αναθεώρηση γίνεται μόνο σε πρόταση που στάλθηκε', 'Ούτε νέα αναθεώρηση'
);
select is(
  (select path || '|' || state from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000c1')), 'signed|active', 'Η B4 δείχνει την υπογεγραμμένη Συμφωνία'
);
select is(
  (select jsonb_array_length(v -> 'change_requests') from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x), 1,
  'Το αίτημα αλλαγών φαίνεται στην ομάδα'
);

-- Σκληροί κανόνες: ισχύουν για όλους, και για τον service role.
reset role;
select throws_ok(format($$ update public.agreement_lines set quantity = 9 where id = %L $$, current_setting('t.l2')), 'P0001', null, 'Μετά την υπογραφή η γραμμή δεν αλλάζει (ούτε με service role)');
select throws_ok(format($$ update public.agreement_line_amounts set unit_price = 1 where line_id = %L $$, current_setting('t.l2')), 'P0001', null, 'Ούτε η τιμή της');
select throws_ok(format($$ update public.agreements set title = 'Άλλο' where id = %L $$, current_setting('t.a1')), 'P0001', 'Η υπογεγραμμένη Συμφωνία δεν αλλάζει', 'Ούτε ο τίτλος της Συμφωνίας');
select throws_ok(format($$ delete from public.agreements where id = %L $$, current_setting('t.a1')), 'P0001', 'Οι Συμφωνίες δεν διαγράφονται', 'Οι Συμφωνίες δεν διαγράφονται ποτέ');
select throws_ok(format($$ update public.agreement_signatures set signed_name = 'Χ' where agreement_id = %L $$, current_setting('t.a1')), 'P0001', null, 'Η υπογραφή δεν αλλάζει');
select throws_ok(format($$ update public.agreement_costs set estimated_cost = 1 where agreement_id = %L $$, current_setting('t.a1')), 'P0001', null, 'Ούτε το αντίγραφο κόστους');
select throws_ok(format($$ update public.agreement_documents set hash = 'x' where agreement_id = %L $$, current_setting('t.a1')), 'P0001', null, 'Ούτε το υπογεγραμμένο έγγραφο');
select throws_ok(format($$ update public.agreements set kind = 'one_off' where id = %L $$, current_setting('t.a1')), 'P0001', null, 'Το είδος της Συμφωνίας δεν αλλάζει');
select throws_ok(format($$ update public.agreements set state = 'proposal', path = 'draft', signed_at = null where id = %L $$, current_setting('t.a1')), 'P0001', null, 'Μια υπογεγραμμένη Συμφωνία δεν ξαναγίνεται πρόταση');
select throws_ok(
  $$ update public.opportunities set outcome = 'open', closed_at = null where id = '00000000-0000-0000-0000-0000000000c1' $$,
  'P0001', null, 'Η κερδισμένη Ευκαιρία δεν ξανανοίγει'
);

-- ───────────── Παραλήπτες και απόρριψη από τον Υπογράφοντα (o3) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.a3', public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'one_off', null)::text, true);
select lives_ok(
  format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a2', 1) $$, current_setting('t.a3')),
  'Το εφάπαξ Πακέτο μπαίνει στην εφάπαξ Συμφωνία'
);
select throws_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Α","email":"a@x.gr","is_signatory":false}]') $$, current_setting('t.a3')),
  'P0001', 'Χρειάζεται ακριβώς ένας Υπογράφων', 'Χωρίς Υπογράφοντα δεν γίνεται'
);
select throws_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Α","email":"a@x.gr","is_signatory":true},{"name":"Β","email":"b@x.gr","is_signatory":true}]') $$, current_setting('t.a3')),
  'P0001', 'Χρειάζεται ακριβώς ένας Υπογράφων', 'Δύο Υπογράφοντες δεν γίνονται'
);
select throws_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Α","email":"a@x.gr","is_signatory":true},{"name":"Β","email":"A@x.gr","is_signatory":false}]') $$, current_setting('t.a3')),
  'P0001', 'Ο ίδιος παραλήπτης μπαίνει μία φορά', 'Ο ίδιος παραλήπτης δύο φορές δεν γίνεται'
);
select throws_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Α","email":"όχι-email","is_signatory":true}]') $$, current_setting('t.a3')),
  '23514', null, 'Άκυρο email'
);
select lives_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Μαρία Παπαδάκη","email":"maria@kypseli.example.gr","is_signatory":true},{"name":"Νίκος Λογιστής","email":"logistis@kypseli.example.gr","is_signatory":false}]') $$, current_setting('t.a3')),
  'Δύο παραλήπτες: ένας Υπογράφων και ένας που βλέπει'
);
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a3')), 'Αποστολή χωρίς Παρέκκλιση');
select is(
  (select count(*)::int from public.agreement_outbox_view(current_setting('t.a3')::uuid) where kind = 'proposal_link' and status = 'pending'), 2,
  'Κάθε παραλήπτης έχει τον δικό του Σύνδεσμο'
);
select set_config('t.tok3a', public.t_token(current_setting('t.a3')::uuid, 'maria@kypseli.example.gr'), true);
select set_config('t.tok3b', public.t_token(current_setting('t.a3')::uuid, 'logistis@kypseli.example.gr'), true);
select isnt(current_setting('t.tok3a'), current_setting('t.tok3b'), 'Διαφορετικοί Σύνδεσμοι');

set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok3b')) ->> 'can_sign', 'false', 'Ο άλλος παραλήπτης βλέπει την πρόταση αλλά δεν υπογράφει');
select is(public.agreement_public_view(current_setting('t.tok3b')) ->> 'signatory_name', 'Μαρία Παπαδάκη', 'Και ξέρει ποιος υπογράφει');
select is(public.agreement_public_request_code(current_setting('t.tok3b'), 'Νίκος', true, '') ->> 'status', 'not_signatory', 'Δεν ζητά κωδικό υπογραφής');
select is(public.agreement_public_sign(current_setting('t.tok3b'), '123456', '', '') ->> 'status', 'not_signatory', 'Δεν υπογράφει');
select is(public.agreement_public_decline(current_setting('t.tok3b'), 'όχι', '') ->> 'status', 'not_signatory', 'Δεν απορρίπτει');
select is(public.agreement_public_request_changes(current_setting('t.tok3b'), 'Θέλουμε το ΦΠΑ ξεχωριστά', '') ->> 'status', 'ok', 'Ζητά αλλαγές: όλοι μπορούν');
-- Η πρώτη απόρριψη (ο Λόγος απώλειας του συστήματος δεν υπάρχει ακόμα) γίνεται με συνδεδεμένη συνεδρία στον ίδιο browser.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  public.agreement_public_decline(current_setting('t.tok3a'), 'Βρήκαμε φθηνότερο', '9.9.9.9') ->> 'status', 'declined',
  'Ο Υπογράφων απορρίπτει, ακόμα και με συνδεδεμένη συνεδρία (ο Λόγος του συστήματος φτιάχνεται χωρίς να τον μηδενίσει ο φρουρός των Πωλήσεων)'
);
select is(auth.uid(), '00000000-0000-0000-0000-0000000000e3'::uuid, 'Η ταυτότητα της συνεδρίας επανέρχεται μετά τη δημιουργία του Λόγου');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok3a')) ->> 'status', 'closed', 'Ο Σύνδεσμος λέει «δεν είναι πια ανοιχτή»');
select is(public.agreement_public_view(current_setting('t.tok3b')) ->> 'status', 'closed', 'Και ο Σύνδεσμος του άλλου παραλήπτη');
select is(public.agreement_public_request_changes(current_setting('t.tok3b'), 'Ακόμα εδώ;', '') ->> 'status', 'closed', 'Μετά την απόρριψη δεν γίνεται τίποτα');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  (select o.outcome || '|' || r.code || '|' || r.is_system from public.opportunities o join public.sales_loss_reasons r on r.id = o.loss_reason_id
    where o.id = '00000000-0000-0000-0000-0000000000c3'),
  'lost|client_declined|true', 'Η Ευκαιρία έγινε χαμένη με τον Λόγο απώλειας του συστήματος'
);
select is(
  (select v ->> 'state' || '|' || (v ->> 'path') from (select public.agreement_view(current_setting('t.a3')::uuid) as v) x),
  'proposal|lost', 'Η Συμφωνία μένει «πρόταση · Χάθηκε»'
);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null) $$, current_setting('t.a3')),
  'P0001', 'Η πρόταση έκλεισε ως χαμένη και δεν αλλάζει', 'Μόνο για ανάγνωση'
);
select is(
  (select count(*)::int from public.opportunity_activities where opportunity_id = '00000000-0000-0000-0000-0000000000c3' and event = 'agreement'
     and body like 'Ο Υπογράφων (Μαρία Παπαδάκη) απέρριψε την πρόταση: «Βρήκαμε φθηνότερο»'), 1,
  'Η απόρριψη γράφεται ως Δραστηριότητα, με τον λόγο'
);
select is(
  (select count(*)::int from public.opportunity_activities where opportunity_id = '00000000-0000-0000-0000-0000000000c3' and event = 'lost'), 1,
  'Και η Ευκαιρία καταγράφει ότι χάθηκε'
);

-- ───────────── Λήξη, Παράταση, ανάκληση και νέος Σύνδεσμος (o4) ─────────────
select set_config('t.a4', public.agreement_create('00000000-0000-0000-0000-0000000000c4', 'monthly', null)::text, true);
select lives_ok(format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a1', 1) $$, current_setting('t.a4')), 'Γραμμή');
select lives_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Μαρία Παπαδάκη","email":"maria@kypseli.example.gr","is_signatory":true},{"name":"Γιάννης Συνεταίρος","email":"giannis@kypseli.example.gr","is_signatory":false}]') $$, current_setting('t.a4')),
  'Δύο παραλήπτες'
);
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a4')), 'Αποστολή');
select set_config('t.tok4a', public.t_token(current_setting('t.a4')::uuid, 'maria@kypseli.example.gr'), true);
select set_config('t.tok4b', public.t_token(current_setting('t.a4')::uuid, 'giannis@kypseli.example.gr'), true);

-- Ανάκληση ενός Συνδέσμου: οι υπόλοιποι μένουν.
select lives_ok(
  format($$ select public.agreement_revoke_link((select (r -> 'link' ->> 'id')::uuid from jsonb_array_elements(public.agreement_view(%L) -> 'recipients') r where r ->> 'email' = 'giannis@kypseli.example.gr')) $$, current_setting('t.a4')),
  'Ανάκληση του Συνδέσμου του Γιάννη'
);
select throws_ok(
  format($$ select public.agreement_revoke_link((select (r -> 'link' ->> 'id')::uuid from jsonb_array_elements(public.agreement_view(%L) -> 'recipients') r where r ->> 'email' = 'giannis@kypseli.example.gr')) $$, current_setting('t.a4')),
  'P0001', 'Ο Σύνδεσμος δεν δουλεύει ήδη', 'Ο ανακλημένος Σύνδεσμος δεν ανακαλείται ξανά'
);
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok4b')) ->> 'status', 'revoked', 'Ο ανακλημένος Σύνδεσμος λέει «ανακλήθηκε»');
select is(public.agreement_public_view(current_setting('t.tok4a')) ->> 'status', 'active', 'Ο Σύνδεσμος της Μαρίας μένει ενεργός');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(
  format($$ select public.agreement_reissue_link((select (r -> 'link' ->> 'id')::uuid from jsonb_array_elements(public.agreement_view(%L) -> 'recipients') r where r ->> 'email' = 'maria@kypseli.example.gr')) $$, current_setting('t.a4')),
  'Νέος Σύνδεσμος για τη Μαρία (ο παλιός χάθηκε)'
);
select set_config('t.tok4a2', public.t_token(current_setting('t.a4')::uuid, 'maria@kypseli.example.gr'), true);
select isnt(current_setting('t.tok4a2'), current_setting('t.tok4a'), 'Ο νέος Σύνδεσμος είναι άλλος');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok4a')) ->> 'status', 'revoked', 'Ο παλιός Σύνδεσμος της Μαρίας ανακαλέστηκε');
select is(public.agreement_public_view(current_setting('t.tok4a2')) ->> 'status', 'active', 'Ο νέος δουλεύει');
set local role authenticated;

-- Η Ισχύς περνά: ο Σύνδεσμος σταματά, η Ευκαιρία μένει ανοιχτή.
reset role;
update public.agreements set valid_until = (now() at time zone 'Europe/Athens')::date - 1 where id = current_setting('t.a4')::uuid;
update public.agreement_documents set document = jsonb_set(document, '{valid_until}', to_jsonb(((now() at time zone 'Europe/Athens')::date - 1)::text))
 where agreement_id = current_setting('t.a4')::uuid;
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok4a2')) ->> 'status', 'expired', 'Ο ληγμένος Σύνδεσμος λέει «έληξε»');
select is(
  (public.agreement_public_view(current_setting('t.tok4a2')) ->> 'valid_until')::date, (now() at time zone 'Europe/Athens')::date - 1, 'Με την ημερομηνία λήξης'
);
select is(public.agreement_public_request_code(current_setting('t.tok4a2'), 'Μαρία', true, '') ->> 'status', 'expired', 'Ούτε κωδικός ζητιέται');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  (select path from public.agreements_list() where id = current_setting('t.a4')::uuid), 'expired', 'Η D1 δείχνει «Έληξε» χωρίς να τρέξει κάποιος έλεγχος'
);
select is(
  (select outcome from public.opportunities where id = '00000000-0000-0000-0000-0000000000c4'), 'open', 'Η λήξη δεν είναι απώλεια: η Ευκαιρία μένει ανοιχτή'
);
select throws_ok(
  format($$ select public.agreement_close_lost(%L, null) $$, current_setting('t.a4')),
  'P0001', 'Διάλεξε Λόγο απώλειας', 'Το κλείσιμο ως χαμένη θέλει Λόγο απώλειας'
);
select is(
  (select (v ->> 'proposal_validity_days') || '|' || (v ->> 'email_sender_connected') from (select public.agreement_view(current_setting('t.a4')::uuid) as v) x),
  '21|false', 'Η D2 ξέρει την προεπιλεγμένη Ισχύς (για την Παράταση) και ότι ο πάροχος email δεν είναι συνδεδεμένος'
);
select throws_ok(
  format($$ select public.agreement_extend(%L, 0) $$, current_setting('t.a4')),
  'P0001', 'Η Παράταση είναι από 1 έως 365 μέρες', 'Η Παράταση θέλει μέρες'
);
-- Ο Κατάλογος αλλάζει στο μεταξύ: η Παράταση δεν γίνεται Παρέκκλιση.
reset role;
update public.catalogue_item_amounts set price = 1500 where item_id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_extend(%L, null) $$, current_setting('t.a4')), 'Παράταση με την προεπιλεγμένη Ισχύς');
select is(
  (select v ->> 'path' || '|' || ((v ->> 'valid_until')::date - (now() at time zone 'Europe/Athens')::date) || '|' || jsonb_array_length(v -> 'deviations') || '|' || (v -> 'lines' -> 0 ->> 'unit_price')
     from (select public.agreement_view(current_setting('t.a4')::uuid) as v) x),
  'sent|21|0|1300.00', 'Παράταση: ξανά «Εστάλη» για 21 μέρες, ίδιες τιμές, καμία Παρέκκλιση ακόμα κι αν άλλαξε ο Κατάλογος'
);
select set_config('t.tok4c', public.t_token(current_setting('t.a4')::uuid, 'maria@kypseli.example.gr'), true);
select isnt(current_setting('t.tok4c'), current_setting('t.tok4a2'), 'Νέος Σύνδεσμος με την Παράταση');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok4a2')) ->> 'status', 'superseded', 'Ο προηγούμενος Σύνδεσμος δεν ζωντανεύει');
select is(
  (public.agreement_public_view(current_setting('t.tok4c')) -> 'document' ->> 'valid_until')::date, (now() at time zone 'Europe/Athens')::date + 21,
  'Το έγγραφο δείχνει τη νέα Ισχύς'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.agreement_extend(%L, 5) $$, current_setting('t.a4')),
  'P0001', 'Παράταση δίνεται μόνο σε πρόταση που έληξε', 'Παράταση μόνο σε ληγμένη πρόταση'
);
select throws_ok(
  format($$ select public.agreement_close_lost(%L, (select id from public.sales_loss_reasons where code = 'no_reply')) $$, current_setting('t.a4')),
  'P0001', 'Κλείσιμο ως χαμένη γίνεται μόνο σε πρόταση που έληξε', 'Κλείσιμο ως χαμένη μόνο μετά τη λήξη'
);
reset role;
update public.catalogue_item_amounts set price = 1300 where item_id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;

-- Ληγμένη πρόταση που κλείνει ως χαμένη.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.a5', public.agreement_create('00000000-0000-0000-0000-0000000000c5', 'monthly', null)::text, true);
select set_config('t.l51', public.agreement_add_catalogue_line(current_setting('t.a5')::uuid, '00000000-0000-0000-0000-0000000000a1', 1)::text, true);

-- ───────────── Όροι πιο χαλαροί από τις προεπιλογές (o5) ─────────────
select throws_ok(
  format($$ select public.agreement_update_terms(%L, 15, 'κάτι', 10, 'new_opportunity', 30, 48, 24, true, true) $$, current_setting('t.a5')),
  'P0001', 'Μια τιμή δεν είναι έγκυρη· έλεγξε τους Όρους', 'Άκυρη τιμή Όρου'
);
select lives_ok(
  format($$ select public.agreement_update_terms(%L, 30, 'accumulate', 20, 'auto', 10, 24, 12, false, false) $$, current_setting('t.a5')),
  'Πιο χαλαροί Όροι σε όλα'
);
select is(
  (select string_agg(d ->> 'kind', ',' order by d ->> 'kind') from jsonb_array_elements(public.agreement_view(current_setting('t.a5')::uuid) -> 'deviations') d),
  'cancel_hours,dissolution_notice,filming_notice,grace_days,late_cancel_burns,no_show_burns,payment_days,unused_provisions',
  'Οκτώ Παρεκκλίσεις Όρων· η αυτόματη συνέχιση δεν είναι Παρέκκλιση'
);
select lives_ok(
  format($$ select public.agreement_update_terms(%L, 10, 'lost', 5, 'new_opportunity', 60, 72, 48, true, true) $$, current_setting('t.a5')),
  'Πιο αυστηροί Όροι'
);
select is(
  jsonb_array_length(public.agreement_view(current_setting('t.a5')::uuid) -> 'deviations'), 0, 'Ό,τι είναι προς όφελος της εταιρείας δεν είναι Παρέκκλιση'
);
select lives_ok(
  format($$ select public.agreement_update_terms(%L, 30, 'next_period', 10, 'new_opportunity', 30, 48, 24, true, true) $$, current_setting('t.a5')),
  'Μέρες πληρωμής 30 αντί για 15'
);
select is(
  (select d ->> 'base_value' || '→' || (d ->> 'value') from jsonb_array_elements(public.agreement_view(current_setting('t.a5')::uuid) -> 'deviations') d),
  '15→30', 'Η Παρέκκλιση λέει από ποια τιμή σε ποια'
);

-- Έκπτωση πρώτων μηνών και Όριο αλλαγών.
select lives_ok(format($$ select public.agreement_set_money_terms(%L, 10, 2, 0) $$, current_setting('t.a5')), 'Η τυπική έκπτωση 10% για 2 μήνες');
select is(
  (select count(*)::int from jsonb_array_elements(public.agreement_view(current_setting('t.a5')::uuid) -> 'deviations') d where d ->> 'kind' like 'discount%'),
  0, 'Η τυπική έκπτωση δεν είναι Παρέκκλιση'
);
select throws_ok(
  format($$ select public.agreement_set_money_terms(%L, 10, 0, 0) $$, current_setting('t.a5')),
  'P0001', 'Η έκπτωση θέλει και ποσοστό και μήνες', 'Η έκπτωση θέλει και ποσοστό και μήνες'
);
select lives_ok(format($$ select public.agreement_set_money_terms(%L, 25, 3, 0) $$, current_setting('t.a5')), 'Έκπτωση 25% για 3 μήνες');
select is(
  (select string_agg(d ->> 'kind' || ':' || (d ->> 'value'), ',' order by d ->> 'kind') from jsonb_array_elements(public.agreement_view(current_setting('t.a5')::uuid) -> 'deviations') d where d ->> 'kind' like 'discount%'),
  'discount_months:3,discount_percent:25.00', 'Μεγαλύτερη έκπτωση σε ποσοστό και σε μήνες: δύο Παρεκκλίσεις'
);
select throws_ok(
  format($$ select public.agreement_set_money_terms(%L, 5, 1, 0) $$, current_setting('t.a2')),
  'P0001', 'Έκπτωση πρώτων μηνών και ρήτρα λύσης ισχύουν μόνο στις μηνιαίες Συμφωνίες', 'Η εφάπαξ δεν έχει έκπτωση πρώτων μηνών'
);
select lives_ok(
  format($$ select public.agreement_set_revision_limits(%L, jsonb_build_array(jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'reel'), 'rounds', 3))) $$, current_setting('t.a5')),
  'Όριο αλλαγών reel 3 αντί 2'
);
select is(
  (select d ->> 'subject' || ':' || (d ->> 'base_value') || '→' || (d ->> 'value') from jsonb_array_elements(public.agreement_view(current_setting('t.a5')::uuid) -> 'deviations') d where d ->> 'kind' = 'revision_limit'),
  'reel:2→3', 'Περισσότεροι γύροι αλλαγών: Παρέκκλιση'
);
select throws_ok(
  format($$ select public.agreement_set_revision_limits(%L, jsonb_build_array(jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'shoot'), 'rounds', 1))) $$, current_setting('t.a5')),
  'P0001', null, 'Όριο αλλαγών μπαίνει μόνο σε είδη που έχουν Όριο'
);
select throws_ok(
  format($$ select public.agreement_set_milestones(%L, '[]') $$, current_setting('t.a5')),
  'P0001', 'Οι δόσεις σε ορόσημα ισχύουν μόνο στις εφάπαξ Συμφωνίες', 'Η μηνιαία δεν έχει δόσεις'
);

-- Περίοδοι: το σχέδιο από την Έναρξη και τη Διάρκεια.
select lives_ok(
  format($$ select public.agreement_update_basics(%L, 'Ανανέωση social', 'el', (now() at time zone 'Europe/Athens')::date + 30, '2027-01-05', 6) $$, current_setting('t.a5')),
  'Έναρξη 5/1/2027, 6 μήνες'
);
select is(
  (select jsonb_array_length(v -> 'periods') || '|' || (v -> 'periods' -> 0 ->> 'starts') || '|' || (v -> 'periods' -> 0 ->> 'ends') || '|' || (v -> 'periods' -> 6 ->> 'starts') || '|' || (v -> 'periods' -> 6 ->> 'ends')
     from (select public.agreement_view(current_setting('t.a5')::uuid) as v) x),
  '7|2027-01-05|2027-01-31|2027-07-01|2027-07-04', 'Λήξη = Έναρξη + Διάρκεια − 1 μέρα: 5/1 → 4/7. Μερική πρώτη και μερική τελευταία Περίοδος'
);
select is(
  (select string_agg((p ->> 'is_partial') || '/' || (p ->> 'gives_provisions') || '/' || (p ->> 'amount'), ' ' order by (p ->> 'n')::int)
     from jsonb_array_elements(public.agreement_view(current_setting('t.a5')::uuid) -> 'periods') p),
  'true/true/849.19 false/true/975.00 false/true/975.00 false/true/1300.00 false/true/1300.00 false/true/1300.00 true/false/167.74',
  'Η πρώτη μερική Περίοδος: αναλογικά, ολόκληρες Παροχές· η τελευταία μερική: αναλογικά, καμία νέα Παροχή· η έκπτωση πάει στις πρώτες 3 Περιόδους'
);
reset role;
select is(
  (select count(*)::int from authz.agreement_period_rows('2026-11-01', 6)), 6, 'Έναρξη την 1η του μήνα: καμία μερική Περίοδος (6 μήνες, 6 Περίοδοι)'
);
select is(
  (select bool_and(share = 1 and gives_provisions) from authz.agreement_period_rows('2026-11-01', 6)), true, 'Όλες ολόκληρες, με Παροχές'
);
select is(
  (select ends from authz.agreement_period_rows('2026-10-05', 6) order by n desc limit 1), '2027-04-04'::date, '6 μήνες από τις 5/10 λήγουν στις 4/4'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);

-- Κόστος και περιθώριο: μόνο όποιος βλέπει κόστος.
select is(
  (select is_low_margin from public.agreements_list() where id = current_setting('t.a5')::uuid), null, 'Η Άννα δεν βλέπει το σήμα «χαμηλό περιθώριο»'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(
  (select (v -> 'cost' ->> 'hour_cost') || '|' || (v -> 'cost' ->> 'estimated_cost') || '|' || (v -> 'cost' ->> 'is_low_margin') || '|' || (v -> 'cost' ->> 'is_frozen')
     from (select public.agreement_view(current_setting('t.a5')::uuid) as v) x),
  '40.00|800.00|true|false', 'Η Διαχείριση βλέπει Κόστος ώρας 40 €, εκτιμώμενο κόστος 800 €, «χαμηλό περιθώριο» (975 € κάτω από 1.040 €)'
);
select is(
  (select (v -> 'lines' -> 0 ->> 'hours_shoot') || '|' || (v -> 'lines' -> 0 ->> 'hours_edit') from (select public.agreement_view(current_setting('t.a5')::uuid) as v) x),
  '6.0|14.0', 'Και τις ώρες της γραμμής'
);
select throws_ok(
  format($$ select public.agreement_update_line(%L, null, null, null, null, 8, null, null) $$, current_setting('t.l51')),
  '42501', null, 'Αλλά δεν τις αλλάζει: δεν «Διαχειρίζεται κόστος»'
);
select is((select is_low_margin from public.agreements_list() where id = current_setting('t.a5')::uuid), true, 'Η λίστα δείχνει το σήμα σε όποιον βλέπει κόστος');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok(
  format($$ select public.agreement_update_line(%L, null, null, null, null, 8, 14, 10) $$, current_setting('t.l51')),
  'Ο Ιδιοκτήτης αλλάζει τις ώρες (8 + 14) και το Άμεσο κόστος (10) της γραμμής'
);
select is(
  (select (v -> 'cost' ->> 'estimated_cost') from (select public.agreement_view(current_setting('t.a5')::uuid) as v) x), '890.00',
  'Εκτιμώμενο κόστος = 22 ώρες × 40 € + 10 € = 890 €'
);

-- Αποστολή από όποιον «Παρεκκλίνει»: η Έγκριση γράφεται μόνη της.
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a5')), 'Ο Ιδιοκτήτης στέλνει πρόταση με Παρεκκλίσεις χωρίς Έγκριση άλλου');
select is(
  (select (v -> 'revisions' -> 0 -> 'approval' ->> 'state') || '|' || (v -> 'revisions' -> 0 -> 'approval' ->> 'decided_by_name') || '|' || (v ->> 'path')
     from (select public.agreement_view(current_setting('t.a5')::uuid) as v) x),
  'approved|Γιώργος|sent', 'Η αναθεώρηση γράφει ότι τις ενέκρινε ο ίδιος'
);
reset role;
select is(
  (select count(*)::int from public.audit_log where entity = 'agreement_costs' and entity_id = current_setting('t.a5') and action = 'event' and after ->> 'event' = 'low_margin'),
  1, 'Το «χαμηλό περιθώριο» γράφεται ως γεγονός, στην οντότητα του κόστους'
);
update public.agreements set valid_until = (now() at time zone 'Europe/Athens')::date - 3 where id = current_setting('t.a5')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(
  format($$ select public.agreement_close_lost(%L, (select id from public.sales_loss_reasons where code = 'no_reply')) $$, current_setting('t.a5')),
  'Η ληγμένη πρόταση κλείνει ως χαμένη με Λόγο απώλειας'
);
select is(
  (select o.outcome || '|' || r.code from public.opportunities o join public.sales_loss_reasons r on r.id = o.loss_reason_id where o.id = '00000000-0000-0000-0000-0000000000c5'),
  'lost|no_reply', 'Η Ευκαιρία έγινε χαμένη'
);
select is((select path from public.agreements_list() where id = current_setting('t.a5')::uuid), 'lost', 'Και η πρόταση «Χάθηκε»');
set local role anon;
select set_config('request.jwt.claims', '', true);
set local role authenticated;

-- ───────────── Εφάπαξ: δόσεις σε ορόσημα και αναθεώρηση που κρατά την Έγκριση (a2) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a2', 1) $$, current_setting('t.a2')), 'Εφάπαξ Πακέτο στα Εγκαίνια');
select throws_ok(
  format($$ select public.agreement_set_milestones(%L, '[{"trigger":"date","percent":30}]') $$, current_setting('t.a2')),
  '23514', null, 'Δόση «ημερομηνία» χωρίς ημερομηνία δεν γίνεται'
);
select lives_ok(
  format($$ select public.agreement_set_milestones(%L, jsonb_build_array(
      jsonb_build_object('trigger', 'signature', 'percent', 40),
      jsonb_build_object('trigger', 'date', 'percent', 30, 'due_on', (now() at time zone 'Europe/Athens')::date + 30),
      jsonb_build_object('trigger', 'delivered', 'percent', 20))) $$, current_setting('t.a2')),
  'Δόσεις 40% / 30% / 20% (άθροισμα 90%)'
);
select is(
  (select (v ->> 'milestones_total') || '|' || (v -> 'milestones' -> 0 ->> 'amount') from (select public.agreement_view(current_setting('t.a2')::uuid) as v) x),
  '90.00|160.00', 'Το σύστημα δείχνει άθροισμα 90% (προειδοποίηση) και το ποσό της δόσης'
);
select is(
  (select (v -> 'can' ->> 'send') from (select public.agreement_view(current_setting('t.a2')::uuid) as v) x), 'false',
  'Προκαταβολή 40% αντί 50%: Παρέκκλιση, η Άννα δεν στέλνει'
);
select is(
  (select d ->> 'depth' from jsonb_array_elements(public.agreement_view(current_setting('t.a2')::uuid) -> 'deviations') d where d ->> 'kind' = 'advance'),
  '10.00', 'Η προκαταβολή είναι 10 μονάδες κάτω από την προεπιλογή'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a2')), 'Ο Ιδιοκτήτης στέλνει τα Εγκαίνια');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_new_revision(%L, null) $$, current_setting('t.a2')), 'Η Άννα κάνει νέα αναθεώρηση');
select is(
  (select (v ->> 'needs_approval')::boolean || '|' || (v ->> 'revision') from (select public.agreement_view(current_setting('t.a2')::uuid) as v) x),
  'false|2', 'Η Έγκριση του Ιδιοκτήτη (αυτο-έγκριση) καλύπτει και τη νέα αναθεώρηση'
);
select lives_ok(
  format($$ select public.agreement_set_recipients(%L, '[{"name":"Άλλος Υπογράφων","email":"allos@kypseli.example.gr","is_signatory":true}]') $$, current_setting('t.a2')),
  'Αλλάζει ο Υπογράφων στη νέα αναθεώρηση: η ομάδα ξαναστέλνει'
);
reset role;
select is(
  (select count(*)::int from public.agreement_links where agreement_id = current_setting('t.a2')::uuid and recipient_id is null and recipient_email = 'maria@kypseli.example.gr'),
  1, 'Ο παλιός Σύνδεσμος κρατά το όνομα και το email του παραλήπτη που αφαιρέθηκε'
);
select throws_ok(
  format($$ insert into public.agreement_lines (agreement_id, position, line_kind, description) values (%L, 9, 'free', 'Κρυφή γραμμή') $$, current_setting('t.a1')),
  'P0001', 'Η πρόταση δεν αλλάζει σε αυτή την κατάσταση· ξεκίνα νέα αναθεώρηση', 'Ούτε με service role μπαίνει γραμμή σε Συμφωνία που δεν είναι σε Σύνταξη'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a2')), 'Η Άννα στέλνει την αναθεώρηση 2');

-- ───────────── Υπογραφή εκτός συστήματος (o6, o7) ─────────────
select set_config('t.a6', public.agreement_create('00000000-0000-0000-0000-0000000000c6', 'monthly', null)::text, true);
select set_config('t.l61', public.agreement_add_catalogue_line(current_setting('t.a6')::uuid, '00000000-0000-0000-0000-0000000000a1', 1)::text, true);
select set_config('t.a7', public.agreement_create('00000000-0000-0000-0000-0000000000c7', 'one_off', null)::text, true);
select lives_ok(format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a2', 1) $$, current_setting('t.a7')), 'Γραμμή στην εφάπαξ');
select is((select (v -> 'can' ->> 'sign_outside') from (select public.agreement_view(current_setting('t.a6')::uuid) as v) x), 'false', 'Η Άννα δεν έχει το κουμπί «Υπογράφηκε εκτός συστήματος»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is((select (v -> 'can' ->> 'sign_outside') from (select public.agreement_view(current_setting('t.a6')::uuid) as v) x), 'true', 'Ο Ιδιοκτήτης το έχει');
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, 'Ελένη Μέλη', (now() at time zone 'Europe/Athens')::date - 100, 'ab') $$, current_setting('t.a6')),
  'P0001', 'Γράψε το αρχείο της υπογραφής (όνομα ή σύνδεσμος)', 'Το αρχείο της υπογραφής είναι υποχρεωτικό'
);
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date + 1, 'Ελένη Μέλη', (now() at time zone 'Europe/Athens')::date, 'symfonia.pdf') $$, current_setting('t.a6')),
  'P0001', 'Η ημερομηνία υπογραφής δεν μπορεί να είναι στο μέλλον', 'Η υπογραφή δεν είναι στο μέλλον'
);
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, '  ', (now() at time zone 'Europe/Athens')::date, 'symfonia.pdf') $$, current_setting('t.a6')),
  'P0001', 'Γράψε ποιος υπέγραψε', 'Χρειάζεται όνομα'
);
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, 'Ελένη Μέλη', null, 'symfonia.pdf') $$, current_setting('t.a6')),
  'P0001', 'Γράψε την Έναρξη', 'Χρειάζεται Έναρξη'
);
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, 'Ελένη Μέλη', (date_trunc('month', (now() at time zone 'Europe/Athens')::date) - interval '5 months')::date, 'symfonia.pdf',
      jsonb_build_array(jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'podcast_episode'), 'used', 1)), false) $$, current_setting('t.a6')),
  'P0001', 'Οι Παροχές που έχουν ήδη καταναλωθεί δεν διαβάστηκαν· έλεγξέ τες', 'Καταναλωμένες Παροχές μόνο από είδη της Συμφωνίας'
);
select lives_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date - 2, 'Ελένη Μέλη', (date_trunc('month', (now() at time zone 'Europe/Athens')::date) - interval '5 months')::date, 'symfonia-meli.pdf',
      jsonb_build_array(jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'reel'), 'used', 3)), true) $$, current_setting('t.a6')),
  'Υπογράφηκε εκτός συστήματος, με Έναρξη 5 μήνες πριν'
);
select is(
  (select v ->> 'state' || '|' || (v ->> 'path') || '|' || (v -> 'signature' ->> 'method') || '|' || (v -> 'signature' ->> 'signed_name') || '|' || (v -> 'signature' ->> 'reference')
          || '|' || (v -> 'signature' ->> 'month_invoiced') || '|' || (v -> 'signature' -> 'used_provisions' -> 0 ->> 'used')
     from (select public.agreement_view(current_setting('t.a6')::uuid) as v) x),
  'active|signed|outside|Ελένη Μέλη|symfonia-meli.pdf|true|3', 'Ενεργή, με υπογραφή «εκτός συστήματος», αρχείο, καταναλωμένες Παροχές και ένδειξη ότι ο μήνας τιμολογήθηκε ήδη'
);
select is(
  (select (v ->> 'start_on')::date = (date_trunc('month', (now() at time zone 'Europe/Athens')::date) - interval '5 months')::date from (select public.agreement_view(current_setting('t.a6')::uuid) as v) x),
  true, 'Η Έναρξη μπορεί να είναι στο παρελθόν'
);
select is(
  (select outcome from public.opportunities where id = '00000000-0000-0000-0000-0000000000c6'), 'won', 'Η Ευκαιρία έγινε κερδισμένη'
);
select is(
  (select expires_in_days between 0 and 31 from public.agreements_list() where id = current_setting('t.a6')::uuid), true,
  'Η D1 δείχνει «λήγει σε N μέρες» όταν μένουν 30 μέρες ή λιγότερες'
);
select is(
  (select count(*)::int from public.agreement_outbox_view(current_setting('t.a6')::uuid) where kind = 'client_invite' and status = 'pending'), 1,
  'Η πρόσκληση του Υπογράφοντα ως Χρήστη πελάτη περιμένει στα εξερχόμενα'
);
select throws_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, 'Ελένη Μέλη', (now() at time zone 'Europe/Athens')::date, 'symfonia.pdf') $$, current_setting('t.a6')),
  'P0001', null, 'Δεύτερη υπογραφή δεν γίνεται'
);
-- Με μελλοντική Έναρξη: «Υπογεγραμμένη» ώσπου να φτάσει η Έναρξη.
select lives_ok(
  format($$ select public.agreement_sign_outside(%L, (now() at time zone 'Europe/Athens')::date, 'Ελένη Μέλη', (now() at time zone 'Europe/Athens')::date + 10, 'ekdilosi.pdf', '[]', true) $$, current_setting('t.a7')),
  'Εφάπαξ με Έναρξη σε 10 μέρες'
);
select is(
  (select v ->> 'state' || '|' || (v ->> 'path') || '|' || coalesce(v ->> 'end_on', 'null') || '|' || (v -> 'signature' ->> 'month_invoiced')
     from (select public.agreement_view(current_setting('t.a7')::uuid) as v) x),
  'signed|signed|null|false', 'Υπογεγραμμένη, όχι ακόμα ενεργή· η εφάπαξ δεν έχει Λήξη· το «τιμολογήθηκε» αγνοείται χωρίς παλιά Έναρξη'
);
reset role;
alter table public.agreements disable trigger agreements_guard;
update public.agreements set start_on = (now() at time zone 'Europe/Athens')::date - 1 where id = current_setting('t.a7')::uuid;
alter table public.agreements enable trigger agreements_guard;
set local role service_role;
select is(public.agreements_tick(), 1, 'Ο έλεγχος «σήμερα» γράφει την έναρξη της Συμφωνίας');
reset role;
select is((select state from public.agreements where id = current_setting('t.a7')::uuid), 'active', 'Η υπογεγραμμένη έγινε ενεργή όταν έφτασε η Έναρξη');
select is(public.agreements_tick(), 0, 'Ξανά: δεν υπάρχει τίποτα να γραφτεί');


-- ───────────── Το αντίγραφο κόστους της υπογραφής δεν μετακινείται ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select (v -> 'cost' ->> 'is_frozen') || '|' || (v -> 'cost' ->> 'estimated_cost') || '|' || (v -> 'cost' ->> 'hour_cost') || '|' || (v -> 'cost' ->> 'is_low_margin')
     from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  'true|1600.00|40.00|false', 'Η υπογεγραμμένη Συμφωνία κρατά αντίγραφο: Κόστος ώρας 40 €, εκτιμώμενο κόστος 1.600 €'
);
reset role;
update public.cost_months set expenses_total = 17600 where month = date_trunc('month', now() at time zone 'Europe/Athens')::date;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select (v -> 'cost' ->> 'estimated_cost') || '|' || (v -> 'cost' ->> 'hour_cost') from (select public.agreement_view(current_setting('t.a1')::uuid) as v) x),
  '1600.00|40.00', 'Όταν αλλάξουν τα έξοδα, η υπογεγραμμένη Συμφωνία δεν αλλάζει'
);
select is(
  (select (v -> 'cost' ->> 'hour_cost') || '|' || (v -> 'cost' ->> 'is_frozen') from (select public.agreement_view(current_setting('t.a4')::uuid) as v) x),
  '80.00|false', 'Η πρόταση που περιμένει υπογραφή δείχνει το νέο Κόστος ώρας'
);
reset role;
update public.cost_months set expenses_total = 8800 where month = date_trunc('month', now() at time zone 'Europe/Athens')::date;

-- ───────────── Όρια του Συνδέσμου ─────────────
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(
  public.agreement_public_request_code(current_setting('t.tok4c'), repeat('α', 121), true, '') ->> 'status', 'invalid_name', 'Όνομα πάνω από 120 χαρακτήρες δεν γίνεται δεκτό'
);
select is(
  (select count(*) filter (where r ->> 'status' = 'ok')::text || '/' || count(*) filter (where r ->> 'status' = 'rate_limited')::text
     from (select public.agreement_public_request_changes(current_setting('t.tok4c'), 'Αίτημα ' || g, '') as r from generate_series(1, 12) g) q),
  '10/2', '«Θέλω αλλαγές»: έως 10 την ημέρα ανά Σύνδεσμο'
);
set local role authenticated;
-- ───────────── Η Ευκαιρία κλείνει ως χαμένη από τις Πωλήσεις ενώ η πρόταση είναι σταλμένη (o8) ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.a8', public.agreement_create('00000000-0000-0000-0000-0000000000c8', 'monthly', null)::text, true);
select lives_ok(format($$ select public.agreement_add_catalogue_line(%L, '00000000-0000-0000-0000-0000000000a1', 1) $$, current_setting('t.a8')), 'Γραμμή');
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a8')), 'Αποστολή');
select set_config('t.tok8', public.t_token(current_setting('t.a8')::uuid), true);
select lives_ok(
  $$ select public.sales_close_lost('00000000-0000-0000-0000-0000000000c8', (select id from public.sales_loss_reasons where code = 'price')) $$,
  'Η Άννα κλείνει την Ευκαιρία ως χαμένη από τη B4'
);
select is((select path from public.agreements_list() where id = current_setting('t.a8')::uuid), 'lost', 'Η πρόταση χάθηκε μαζί της');
select is((select count(*)::int from public.agreement_outbox_view(current_setting('t.a8')::uuid) where kind = 'proposal_link' and status = 'pending'), 0, 'Ο Σύνδεσμος δεν περιμένει πια αντιγραφή');
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok8')) ->> 'status', 'closed', 'Ο Σύνδεσμος δεν δουλεύει: «δεν είναι πια ανοιχτή»');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);

-- Έλεγχοι εισόδου στα βασικά στοιχεία.
-- Η o12 είναι του Νίκου: ο Νίκος τη δουλεύει.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select set_config('t.a9', public.agreement_create('00000000-0000-0000-0000-0000000000cc', 'one_off', null)::text, true);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, '  ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null) $$, current_setting('t.a9')),
  'P0001', 'Γράψε τον τίτλο της Συμφωνίας', 'Ο τίτλος είναι υποχρεωτικός'
);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'fr', (now() at time zone 'Europe/Athens')::date + 5, null, null) $$, current_setting('t.a9')),
  'P0001', 'Η γλώσσα είναι ελληνικά ή αγγλικά', 'Ελληνικά ή αγγλικά'
);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'en', (now() at time zone 'Europe/Athens')::date + 5, null, 6) $$, current_setting('t.a9')),
  'P0001', 'Η εφάπαξ Συμφωνία δεν έχει Διάρκεια', 'Η εφάπαξ δεν έχει Διάρκεια'
);
select lives_ok(
  format($$ select public.agreement_update_basics(%L, 'Social γυμναστηρίου', 'en', (now() at time zone 'Europe/Athens')::date + 15, (now() at time zone 'Europe/Athens')::date + 20, null) $$, current_setting('t.a9')),
  'Γλώσσα αγγλικά, Ισχύς 15 μέρες, Έναρξη σε 20'
);
select is(
  (select v ->> 'language' || '|' || (v ->> 'title') from (select public.agreement_view(current_setting('t.a9')::uuid) as v) x), 'en|Social γυμναστηρίου', 'Αποθηκεύτηκαν'
);
select lives_ok(
  format($$ select public.agreement_update_terms(%L, 20, 'accumulate', 30, 'auto', 99, 48, 24, true, true) $$, current_setting('t.a9')),
  'Στην εφάπαξ οι Όροι της μηνιαίας δεν εφαρμόζονται'
);
select is(
  (select (v -> 'terms' ->> 'payment_days') || '/' || (v -> 'terms' ->> 'unused_provisions') || '/' || (v -> 'terms' ->> 'grace_days') || '/' || coalesce(v -> 'terms' ->> 'renewal', 'null') || '/' || (v -> 'terms' ->> 'dissolution_notice_days')
     from (select public.agreement_view(current_setting('t.a9')::uuid) as v) x),
  '20/lost/0/null/0', 'Αλλάζουν μόνο οι Μέρες πληρωμής· οι υπόλοιποι μένουν'
);
select is((select count(*)::int from public.agreements_list()), 1, 'Ο Νίκος βλέπει μόνο τη δική του Συμφωνία');
select is(
  (select count(*)::int from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000c1')), 0, 'Και η B4 δεν δείχνει σε αυτόν την πρόταση της Άννας'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000cc')), 0, 'Ούτε η Άννα βλέπει την πρόταση του Νίκου'
);
select is((select count(*)::int from public.agreements_list()), 8, 'Η Άννα βλέπει τις 8 δικές της Συμφωνίες');

-- ───────────── Ρυθμίσεις › Συμφωνίες (O3): μόνο προς τα εμπρός ─────────────
select is((select count(*)::int from public.agreements_defaults_view()), 0, 'Η Άννα δεν βλέπει τις Ρυθμίσεις');
select throws_ok($$ select public.agreements_save_policy(24, 12, true, true) $$, '42501', null, 'Ούτε τις αλλάζει');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e9","role":"authenticated"}', true);
select is(
  (select dissolution_fee is null and payment_days_monthly = 15 from public.agreements_defaults_view()), true,
  'Ο Ρυθμιστής βλέπει τις προεπιλογές αλλά όχι το ποσό της ρήτρας (δεν βλέπει ποσά)'
);
select is(
  (select (open_proposals >= 1 and live_agreements >= 1)::text from public.agreements_defaults_view()), 'true',
  'Πριν την αποθήκευση το σύστημα δείχνει πόσα στοιχεία αφορά η αλλαγή'
);
select throws_ok(
  $$ select public.agreements_save_terms('monthly', 20, 'next_period', 10, 6, 'new_opportunity', 30, 100) $$,
  '42501', null, 'Η ρήτρα λύσης είναι ποσό: θέλει «Βλέπει ποσά»'
);
select throws_ok($$ select public.agreements_save_terms('monthly', 20, 'κάτι', 10, 6, 'new_opportunity', 30, null) $$, '23514', null, 'Άκυρη τιμή');
select throws_ok($$ select public.agreements_save_terms('weekly', 20) $$, 'P0001', 'Διάλεξε μηνιαίες ή εφάπαξ Συμφωνίες', 'Μηνιαίες ή εφάπαξ');
select lives_ok($$ select public.agreements_save_terms('monthly', 30, 'next_period', 10, 6, 'new_opportunity', 30, null) $$, 'Μέρες πληρωμής 30 στις μηνιαίες');
select lives_ok($$ select public.agreements_save_terms('one_off', 20) $$, 'Μέρες πληρωμής 20 στις εφάπαξ');
select lives_ok($$ select public.agreements_save_policy(48, 12, true, false) $$, 'Όριο ακύρωσης 12 ώρες, το «δεν έγινε» δεν καίει');
select lives_ok($$ select public.agreements_save_pricing(14, 40, 5, 1) $$, 'Ισχύς 14 μέρες, προκαταβολή 40%, τυπική έκπτωση 5% για 1 μήνα');
select throws_ok($$ select public.agreements_save_pricing(0, 40, 5, 1) $$, '23514', null, 'Ισχύς 0 μέρες δεν γίνεται');
select lives_ok(
  $$ select public.agreements_save_revision_limits(jsonb_build_array(
       jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'reel'), 'rounds', 3),
       jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'photo'), 'rounds', null))) $$,
  'Όριο αλλαγών: reel 3, φωτογραφία χωρίς'
);
select throws_ok(
  $$ select public.agreements_save_revision_limits(jsonb_build_array(jsonb_build_object('kind_id', (select id from public.provision_kinds where code = 'reel'), 'rounds', 99))) $$,
  'P0001', 'Το Όριο αλλαγών είναι από 1 έως 20 γύρους, ή κενό', 'Έως 20 γύρους'
);
select is(
  (select string_agg(code || '=' || coalesce(revision_limit::text, '-'), ',' order by sort) from public.provision_kinds where code in ('reel', 'photo', 'video')),
  'reel=3,video=2,photo=-', 'Το Όριο αλλαγών αποθηκεύτηκε'
);

-- Η νέα Συμφωνία παίρνει τις νέες προεπιλογές· οι ανοιχτές κρατούν τις παλιές και δεν γίνονται Παρεκκλίσεις.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select set_config('t.a10', public.agreement_create('00000000-0000-0000-0000-0000000000c9', 'monthly', null)::text, true);
select is(
  (select (v -> 'terms' ->> 'payment_days') || '/' || (v -> 'terms' ->> 'filming_cancel_hours') || '/' || (v -> 'terms' ->> 'late_cancel_burns') || '/' || (v -> 'terms' ->> 'no_show_burns')
          || '/' || ((v ->> 'valid_until')::date - (now() at time zone 'Europe/Athens')::date) || '/' || (v -> 'baseline' ->> 'standard_discount_percent')
     from (select public.agreement_view(current_setting('t.a10')::uuid) as v) x),
  '30/12/true/false/14/5.00', 'Η νέα πρόταση αντιγράφει τις νέες προεπιλογές'
);
select is(
  (select count(*)::int from public.agreement_catalogue_options(current_setting('t.a10')::uuid)), 3, 'Επιλογές Καταλόγου για την πρόταση'
);
select lives_ok(format($$ select public.agreement_add_free_line(%L, 'Ειδικό πακέτο', '', 900) $$, current_setting('t.a10')), 'Ο Νίκος γράφει ελεύθερη γραμμή');
select lives_ok(format($$ select public.agreement_request_approval(%L) $$, current_setting('t.a10')), 'Ζητά Έγκριση');
reset role;
update public.agreement_revisions set requested_at = now() - interval '6 days' where agreement_id = current_setting('t.a10')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(
  (select pending_days || '|' || is_reminder_due || '|' || (working_days >= 2)::text from public.agreement_approvals_view() where agreement_id = current_setting('t.a10')::uuid),
  '6|true|true', 'Μετά από 2 εργάσιμες η D4 σημαίνει ότι ξαναειδοποιούνται όσοι εγκρίνουν'
);
select lives_ok(format($$ select public.agreement_decide(%L, true, '') $$, current_setting('t.a10')), 'Η Διαχείριση εγκρίνει');
select is(
  (select v ->> 'path' from (select public.agreement_view(current_setting('t.a10')::uuid) as v) x), 'sent', 'Η εγκεκριμένη πρόταση του Νίκου έφυγε'
);
reset role;
update public.agreements set valid_until = (now() at time zone 'Europe/Athens')::date - 2 where id = current_setting('t.a10')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_new_revision(%L, null) $$, current_setting('t.a10')), 'Ο Νίκος κάνει νέα αναθεώρηση ληγμένης πρότασης');
select is(
  (select v ->> 'path' || '|' || (v ->> 'revision') || '|' || ((v ->> 'valid_until')::date - (now() at time zone 'Europe/Athens')::date)
     from (select public.agreement_view(current_setting('t.a10')::uuid) as v) x),
  'draft|2|14', 'Η νέα αναθεώρηση παίρνει νέα Ισχύς από τις Ρυθμίσεις (14 μέρες)'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select is(
  (select (v -> 'terms' ->> 'payment_days') || '/' || (v -> 'baseline' ->> 'payment_days') || '/' || jsonb_array_length(v -> 'deviations')
     from (select public.agreement_view(current_setting('t.b1')::uuid) as v) x),
  '15/15/0', 'Η πρόταση που γράφτηκε πριν την αλλαγή κρατά τις παλιές προεπιλογές και δεν γίνεται Παρέκκλιση'
);
select is(
  (select jsonb_array_length(v -> 'revision_limits') || '|' || (select sum((r ->> 'rounds')::int) from jsonb_array_elements(v -> 'revision_limits') r)
     from (select public.agreement_view(current_setting('t.b1')::uuid) as v) x),
  '4|6', 'Ούτε το Όριο αλλαγών της αλλάζει (reel 2, βίντεο 2, φωτογραφία 1, επεισόδιο 1)'
);

-- Ρήτρα λύσης: ποσό της προεπιλογής· πιο χαμηλή στη Συμφωνία είναι Παρέκκλιση.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.agreements_save_terms('monthly', 30, 'next_period', 10, 6, 'new_opportunity', 30, 200) $$, 'Ο Ιδιοκτήτης ορίζει ρήτρα λύσης 200 €');
select is((select dissolution_fee from public.agreements_defaults_view()), 200.00, 'Ο Ιδιοκτήτης (βλέπει ποσά) βλέπει το ποσό');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.a11', public.agreement_create('00000000-0000-0000-0000-0000000000cd', 'monthly', null)::text, true);
select is((select (v -> 'money_terms' ->> 'dissolution_fee') from (select public.agreement_view(current_setting('t.a11')::uuid) as v) x), '200.00', 'Η νέα Συμφωνία αντιγράφει τη ρήτρα λύσης των προεπιλογών');
select lives_ok(format($$ select public.agreement_set_money_terms(%L, 0, 0, 100) $$, current_setting('t.a11')), 'Ρήτρα λύσης 100 € στη Συμφωνία');
select is(
  (select d ->> 'kind' || ':' || (d ->> 'base_value') || '→' || (d ->> 'value') from jsonb_array_elements(public.agreement_view(current_setting('t.a11')::uuid) -> 'deviations') d where d ->> 'kind' = 'dissolution_fee'),
  'dissolution_fee:200.00→100.00', 'Μικρότερη ρήτρα λύσης από την προεπιλογή: Παρέκκλιση'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
reset role;
-- ───────────── Ίχνος ενεργειών: τα ποσά δεν διαρρέουν ───────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.audit_log where entity in ('agreement_line_amounts', 'agreement_amounts', 'agreement_line_costs', 'agreement_costs', 'agreement_defaults')),
  0, 'Ο Ελεγκτής (χωρίς ποσά και κόστος) δεν βλέπει γραμμές Ίχνους με ποσά ή κόστος'
);
select is(
  (select count(*)::int > 0 from public.audit_log where entity in ('agreements', 'agreement_lines', 'agreement_recipients', 'agreement_signatures')),
  true, 'Βλέπει όμως τις αλλαγές των Συμφωνιών, των γραμμών, των παραληπτών και τις υπογραφές'
);
select is(
  (select count(*)::int > 0 from public.audit_log where entity = 'agreements' and action = 'event' and after ->> 'event' = 'agreement_signed'),
  true, 'Και τα γεγονότα (υπογραφή) που θα ακούσουν οι Αυτοματισμοί'
);
select is(
  (select count(*)::int from public.audit_log where entity = 'agreement_links' or entity = 'agreement_outbox' or entity = 'agreement_otps'),
  0, 'Οι Σύνδεσμοι, οι κωδικοί και τα εξερχόμενα (μυστικά) δεν γράφονται ποτέ στο Ίχνος'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select count(*)::int > 0 from public.audit_log where entity in ('agreement_line_amounts', 'agreement_line_costs', 'agreement_costs', 'agreement_defaults')),
  true, 'Ο Ιδιοκτήτης βλέπει τις αλλαγές τιμών, ωρών, κόστους και προεπιλογών'
);
select is(
  (select count(*)::int > 0 from public.audit_log where entity = 'agreement_defaults' and (after ->> 'payment_days_monthly') = '30'),
  true, 'Μαζί με το πριν → μετά'
);

-- ───────────── Κατάλογος: οι χρήσεις έχουν πια νόημα ───────────
select is(
  (select uses > 0 from public.catalogue_items_view('00000000-0000-0000-0000-0000000000a1')), true,
  'Η C2 δείχνει πόσες Συμφωνίες αντέγραψαν το Πακέτο'
);
select is(
  (select uses from public.catalogue_items_view('00000000-0000-0000-0000-0000000000a5')), 0::bigint, 'Το Drone δεν έχει αντιγραφεί ακόμα'
);
reset role;
select is(
  public.catalogue_item_uses('00000000-0000-0000-0000-0000000000a1'),
  (select count(*) from public.agreement_lines where item_id = '00000000-0000-0000-0000-0000000000a1'),
  'Οι χρήσεις = οι γραμμές Συμφωνιών (σε οποιαδήποτε κατάσταση)'
);
select is(
  public.provision_kind_uses((select id from public.provision_kinds where code = 'reel')) >
    (select count(*) from public.catalogue_item_provisions where kind_id = (select id from public.provision_kinds where code = 'reel')),
  true, 'Οι χρήσεις ενός είδους Παροχής περιλαμβάνουν και τις γραμμές Συμφωνιών'
);
select throws_ok(
  $$ delete from public.provision_kinds where code = 'podcast_episode' $$, 'P0001', null,
  'Είδος Παροχής που το έχουν τα Όρια αλλαγών των Συμφωνιών δεν διαγράφεται· αποσύρεται'
);

-- ───────────── Συγχώνευση Πελατών: οι Συμφωνίες ακολουθούν την Ευκαιρία ───────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok(
  $$ select public.sales_merge_clients('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f2') $$,
  'Ο Ιδιοκτήτης συγχωνεύει το Γυμναστήριο στο Ζαχαροπλαστείο'
);
select is(
  (select count(*)::int from public.agreements_list('00000000-0000-0000-0000-0000000000f3')
    where opportunity_id in ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-0000000000c9')),
  2, 'Οι Συμφωνίες του συγχωνευμένου Πελάτη εμφανίζονται στον Πελάτη που μένει (ο Πελάτης προκύπτει από την Ευκαιρία)'
);

-- ───────────── Σκλήρυνση: ποσά, Ίχνος, κωδικοί, Ισχύς ─────────────
reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ea', 'costauditor@example.com'),
  ('00000000-0000-0000-0000-0000000000eb', 'approver@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000ea', 'Αλέξης', 'costauditor@example.com'),
  ('00000000-0000-0000-0000-0000000000eb', 'Βάσω', 'approver@example.com');
insert into public.roles (name, kind) values ('Ελεγκτής κόστους', 'team'), ('Εγκρίνων χωρίς ποσά', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, g.scope
  from (values
    ('Ελεγκτής κόστους', 'audit.view', 'all'), ('Ελεγκτής κόστους', 'finance.cost', 'all'),
    ('Εγκρίνων χωρίς ποσά', 'agreements.deviate', 'all'), ('Εγκρίνων χωρίς ποσά', 'agreements.view', 'all')
  ) as g (role_name, code, scope)
  join public.roles r on r.name = g.role_name and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000ea', 'Ελεγκτής κόστους'),
    ('00000000-0000-0000-0000-0000000000eb', 'Εγκρίνων χωρίς ποσά')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
values ('00000000-0000-0000-0000-0000000000ce', '00000000-0000-0000-0000-0000000000f1', 'Σκλήρυνση',
        (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
        '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3);

-- Παρεκκλίσεις με ποσά: η Άννα (βλέπει ποσά) ζητά Έγκριση, ο Εγκρίνων χωρίς «Βλέπει ποσά» δεν βλέπει τα ποσά ούτε εγκρίνει.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.ae', public.agreement_create('00000000-0000-0000-0000-0000000000ce', 'monthly', null)::text, true);
select set_config('t.lae', public.agreement_add_catalogue_line(current_setting('t.ae')::uuid, '00000000-0000-0000-0000-0000000000a1', 1)::text, true);
select lives_ok(format($$ select public.agreement_update_line(%L, null, null, null, 1000, null, null, null) $$, current_setting('t.lae')), 'Τιμή κάτω από τον Κατάλογο (1000 αντί 1300)');
select lives_ok(format($$ select public.agreement_set_money_terms(%L, 35, 4, 200) $$, current_setting('t.ae')), 'Έκπτωση 35% για 4 μήνες');
select lives_ok(format($$ select public.agreement_request_approval(%L) $$, current_setting('t.ae')), 'Αίτημα Έγκρισης');
select is(
  (select needs_approval::text || '|' || (deviation_count >= 3)::text || '|' || approval_pending_days from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000ce')),
  'true|true|0', 'Η Άννα (συντάσσει) βλέπει Παρεκκλίσεις και αναμονή Έγκρισης στην Ευκαιρία'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is(
  (select needs_approval::text || '|' || deviation_count || '|' || coalesce(approval_pending_days::text, 'null') || '|' || outbox_pending || '|'
          || change_requests_open || '|' || links_total || '|' || links_opened
     from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000ce')),
  'false|0|null|0|0|0|0', 'Ο Λογιστής (μόνο βλέπει) δεν παίρνει Παρεκκλίσεις, Εγκρίσεις, αιτήματα ή εξερχόμενα στην Ευκαιρία'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000eb","role":"authenticated"}', true);
select is(
  (select count(*) filter (where d ->> 'value' is null and d ->> 'depth' is null and d ->> 'base_value' is null)::text || '/' || count(*)::text
     from public.agreement_approvals_view() v, jsonb_array_elements(v.deviations) d
    where v.agreement_id = current_setting('t.ae')::uuid and d ->> 'key' in ('discount_percent', 'discount_months')),
  '2/2', 'Στην ουρά Εγκρίσεων χωρίς «Βλέπει ποσά» η έκπτωση (ποσοστό και μήνες) είναι null'
);
select is(
  (select (v.lines -> 0 ->> 'is_below') is null from public.agreement_approvals_view() v where v.agreement_id = current_setting('t.ae')::uuid),
  true, 'Και η ένδειξη «κάτω από τον Κατάλογο» της γραμμής (θα φανέρωνε την τιμή)'
);
select is(
  (select count(*) filter (where d ->> 'value' is null and d ->> 'depth' is null)::text || '/' || count(*)::text
     from jsonb_array_elements(public.agreement_view(current_setting('t.ae')::uuid) -> 'deviations') d
    where d ->> 'key' in ('discount_percent', 'discount_months')),
  '2/2', 'Το ίδιο στη σελίδα της Συμφωνίας (D2)'
);
select throws_ok(
  format($$ select public.agreement_decide(%L, true, '') $$, current_setting('t.ae')),
  '42501', null, 'Όποιος δεν βλέπει ποσά δεν εγκρίνει (η Έγκριση στέλνει τον Σύνδεσμο με τις τιμές)'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select count(*) filter (where d ->> 'value' is not null and d ->> 'depth' is not null)::text || '/' || (v.lines -> 0 ->> 'is_below')
     from public.agreement_approvals_view() v, jsonb_array_elements(v.deviations) d
    where v.agreement_id = current_setting('t.ae')::uuid and d ->> 'key' in ('discount_percent', 'discount_months')
    group by v.lines),
  '2/true', 'Ο Ιδιοκτήτης (βλέπει ποσά) βλέπει την έκπτωση και την ένδειξη'
);

-- Σύνδεσμος με τιμές: στέλνει μόνο όποιος βλέπει ποσά, και μόνο εκείνος παίρνει τον Σύνδεσμο από τα εξερχόμενα.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.agreement_send(%L) $$, current_setting('t.b1')),
  '42501', null, 'Ο e8 (συντάσσει, χωρίς «Βλέπει ποσά») δεν στέλνει: ο Σύνδεσμος θα έδειχνε τιμές που δεν βλέπει'
);
select is((select v ->> 'path' from (select public.agreement_view(current_setting('t.b1')::uuid) as v) x), 'draft', 'Η πρόταση μένει σε Σύνταξη');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.b1')), 'Ο Ιδιοκτήτης στέλνει την πρόταση του e8');
select set_config('t.tokb1', public.t_token(current_setting('t.b1')::uuid), true);
select is(current_setting('t.tokb1') ~ '^[0-9a-f]{64}$', true, 'Ο Ιδιοκτήτης παίρνει τον Σύνδεσμο από τα εξερχόμενα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.agreement_outbox_view(current_setting('t.b1')::uuid) where kind = 'proposal_link' and status = 'pending'), 1,
  'Ο e8 βλέπει ότι το μήνυμα περιμένει'
);
select is(
  (select count(*)::int from public.agreement_outbox_view(current_setting('t.b1')::uuid) where link_path is not null or code is not null), 0,
  'Αλλά όχι τον Σύνδεσμο ή τον κωδικό (που ανοίγουν την πρόταση με τις τιμές)'
);
select throws_ok(
  format($$ select public.agreement_reissue_link((select (r -> 'link' ->> 'id')::uuid from jsonb_array_elements(public.agreement_view(%L) -> 'recipients') r limit 1)) $$, current_setting('t.b1')),
  '42501', null, 'Ούτε νέο Σύνδεσμο εκδίδει'
);
select throws_ok(format($$ select public.agreement_extend(%L, null) $$, current_setting('t.b1')), '42501', null, 'Ούτε Παράταση (νέοι Σύνδεσμοι)');

-- Ο πελάτης ανοίγει τον Σύνδεσμο και ζητά αλλαγές: μόνο όσοι συντάσσουν ή «Παρεκκλίνουν» το βλέπουν.
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tokb1')) ->> 'status', 'active', 'Ο πελάτης ανοίγει τον Σύνδεσμο');
select is(public.agreement_public_request_changes(current_setting('t.tokb1'), 'Μια ερώτηση για τις τιμές', '') ->> 'status', 'ok', 'Και ζητά αλλαγές');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select (links_opened >= 1 and change_requests_open >= 1 and links_total >= 1 and outbox_pending >= 1)
     from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000cb')),
  true, 'Ο Ιδιοκτήτης βλέπει στην Ευκαιρία Συνδέσμους, ανοίγματα, αιτήματα και εξερχόμενα'
);
select is(
  (select (links_opened >= 1 and change_requests_open >= 1) from public.agreements_list() where id = current_setting('t.b1')::uuid),
  true, 'Και στη λίστα Συμφωνιών (D1)'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is(
  (select links_total || '|' || links_opened || '|' || change_requests_open || '|' || outbox_pending
     from public.agreement_for_opportunity('00000000-0000-0000-0000-0000000000cb')),
  '0|0|0|0', 'Ο Λογιστής (μόνο βλέπει) δεν βλέπει Συνδέσμους, ανοίγματα, αιτήματα και εξερχόμενα στην Ευκαιρία'
);
select is(
  (select links_opened || '|' || change_requests_open from public.agreements_list() where id = current_setting('t.b1')::uuid),
  '0|0', 'Ούτε στη λίστα Συμφωνιών (D1)'
);

-- Ίχνος: το αντίγραφο κόστους της υπογραφής φέρει και την τιμή, άρα θέλει και «Βλέπει ποσά».
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ea","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.audit_log where entity = 'agreement_costs'), 0,
  'Ελεγκτής με «Βλέπει κόστος» αλλά χωρίς «Βλέπει ποσά» δεν βλέπει το αντίγραφο κόστους (έχει τιμή και τιμή με έκπτωση)'
);
select is(
  (select count(*)::int > 0 from public.audit_log where entity = 'agreement_line_costs'), true,
  'Βλέπει όμως το κόστος των γραμμών'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(
  (select count(*)::int > 0 from public.audit_log where entity = 'agreement_costs'), true,
  'Ο Ιδιοκτήτης (κόστος και ποσά) το βλέπει'
);

-- Πλαφόν κωδικών: το πολύ 20 ανά Σύνδεσμο για πάντα (5 προσπάθειες ο καθένας), ό,τι κι αν περάσει από τα όρια ανά ώρα.
reset role;
do $$
declare
  i integer;
begin
  for i in 1..20 loop
    perform public.agreement_public_request_code(current_setting('t.tokb1'), 'Κώστας Αρμύρας', true, '');
    update public.agreement_otps set created_at = now() - interval '2 hours'
     where link_id = (select l.id from public.agreement_links l where l.token_hash = authz.token_hash(current_setting('t.tokb1')));
  end loop;
end;
$$;
select is(
  (select count(*)::int from public.agreement_otps o join public.agreement_links l on l.id = o.link_id where l.token_hash = authz.token_hash(current_setting('t.tokb1'))),
  20, '20 κωδικοί εκδόθηκαν στον Σύνδεσμο (με τα όρια ανά ώρα να μην εμποδίζουν)'
);
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(
  public.agreement_public_request_code(current_setting('t.tokb1'), 'Κώστας Αρμύρας', true, '') ->> 'status', 'locked',
  'Ο 21ος κωδικός δεν εκδίδεται: ο Σύνδεσμος κλειδώνει και η ομάδα εκδίδει νέο'
);

-- Μέγιστη Ισχύς: 90 μέρες από σήμερα, στη σύνταξη και στην Παράταση.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'el', (now() at time zone 'Europe/Athens')::date + 91, null, 6) $$, current_setting('t.a11')),
  'P0001', 'Η Ισχύς της πρότασης δεν μπορεί να ξεπερνά τις 90 μέρες από σήμερα', 'Ισχύς πάνω από 90 μέρες δεν γίνεται'
);
select lives_ok(
  format($$ select public.agreement_update_basics(%L, 'Χ', 'el', (now() at time zone 'Europe/Athens')::date + 90, null, 6) $$, current_setting('t.a11')),
  'Ακριβώς 90 μέρες γίνεται'
);
reset role;
update public.agreements set valid_until = (now() at time zone 'Europe/Athens')::date - 1 where id = current_setting('t.b1')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.agreement_extend(%L, 91) $$, current_setting('t.b1')),
  'P0001', 'Η Ισχύς της πρότασης δεν μπορεί να ξεπερνά τις 90 μέρες από σήμερα', 'Ούτε η Παράταση ξεπερνά τις 90 μέρες'
);
select lives_ok(format($$ select public.agreement_extend(%L, 90) $$, current_setting('t.b1')), 'Παράταση 90 μερών γίνεται');

-- ───────────── Δικαιώματα εκτέλεσης ───────────
select throws_ok($$ select authz.agreement_do_send('00000000-0000-0000-0000-000000000001') $$, '42501', null, 'Οι εσωτερικές συναρτήσεις δεν καλούνται από την εφαρμογή');
select throws_ok($$ select authz.agreement_win_opportunity('00000000-0000-0000-0000-0000000000c9') $$, '42501', null, 'Ούτε το κλείσιμο της Ευκαιρίας ως κερδισμένης: μόνο μέσα από την υπογραφή');
select throws_ok($$ select * from public.agreement_outbox_claim(5) $$, '42501', null, 'Ο αποστολέας email δεν είναι για την εφαρμογή');
select throws_ok($$ select public.agreements_tick() $$, '42501', null, 'Ούτε ο έλεγχος «σήμερα»');
select throws_ok($$ select authz.agreement_figures('00000000-0000-0000-0000-000000000001') $$, '42501', null, 'Ούτε οι υπολογισμοί κόστους');
select throws_ok($$ update public.opportunities set outcome = 'won', closed_at = now() where id = '00000000-0000-0000-0000-0000000000c9' $$, '42501', null, 'Η Ευκαιρία δεν κερδίζεται από την εφαρμογή απευθείας');

-- ───────────── Ο πάροχος email (σημείο επέκτασης) ───────────
reset role;
set local role service_role;
select is((select count(*)::int from public.agreement_outbox_claim(50)), 0, 'Όσο ο πάροχος email δεν είναι συνδεδεμένος, ο αποστολέας δεν παίρνει τίποτα');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  $$ update public.agreement_defaults set email_sender_connected = true $$, 'P0001', 'Η σύνδεση του παρόχου email γίνεται μόνο από το στήσιμο του συστήματος',
  'Χρήστης της εφαρμογής δεν «συνδέει» τον πάροχο email'
);
select set_config('request.jwt.claims', '', true);
update public.agreement_defaults set email_sender_connected = true;
set local role service_role;
select set_config('t.claimed', (
  select jsonb_build_object('n', count(*), 'copies', count(*) filter (where kind = 'signed_copy'),
                            'docs', count(*) filter (where kind = 'signed_copy' and document is not null))::text
    from public.agreement_outbox_claim(100)), true);
select is((current_setting('t.claimed')::jsonb ->> 'n')::int > 3, true, 'Συνδεδεμένος πάροχος: ο αποστολέας παίρνει τα μηνύματα που περιμένουν');
select is(
  (current_setting('t.claimed')::jsonb ->> 'copies') = (current_setting('t.claimed')::jsonb ->> 'docs') and (current_setting('t.claimed')::jsonb ->> 'copies')::int >= 1,
  true, 'Το αντίγραφο της υπογεγραμμένης Συμφωνίας έρχεται με το έγγραφο που υπέγραψε ο πελάτης'
);
reset role;
select is(
  (select count(*)::int from public.agreement_outbox where status = 'pending' and attempts = 1),
  (current_setting('t.claimed')::jsonb ->> 'n')::int, 'Κάθε παραλαβή μετρά μία προσπάθεια'
);
select set_config('t.o1', (select id::text from public.agreement_outbox where status = 'pending' and attempts = 1 order by id limit 1), true);
select set_config('t.o2', (select id::text from public.agreement_outbox where status = 'pending' and attempts = 1 and id::text <> current_setting('t.o1') order by id limit 1), true);
set local role service_role;
select lives_ok(format($$ select public.agreement_outbox_done(%L, true) $$, current_setting('t.o1')), 'Στάλθηκε');
select lives_ok(format($$ select public.agreement_outbox_done(%L, false, 'smtp timeout') $$, current_setting('t.o2')), 'Απέτυχε');
reset role;
select is(
  (select status || '|' || payload::text from public.agreement_outbox where id = current_setting('t.o1')::uuid), 'sent|{}', 'Το μήνυμα σημειώθηκε ως εστάλη και τα μυστικά σβήστηκαν'
);
select is(
  (select status || '|' || last_error from public.agreement_outbox where id = current_setting('t.o2')::uuid), 'pending|smtp timeout', 'Η αποτυχία κρατά το μήνυμα για νέα προσπάθεια'
);
update public.agreement_outbox set attempts = 5 where id = current_setting('t.o2')::uuid;
set local role service_role;
select lives_ok(format($$ select public.agreement_outbox_done(%L, false, 'smtp timeout') $$, current_setting('t.o2')), 'Πέμπτη αποτυχία');
reset role;
select is((select status from public.agreement_outbox where id = current_setting('t.o2')::uuid), 'failed', 'Μετά από 5 αποτυχίες το μήνυμα σημαίνεται «απέτυχε»');

-- Με συνδεδεμένο πάροχο ο κωδικός δεν εμφανίζεται στην ομάδα.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.a4_tok', public.t_token(current_setting('t.a4')::uuid, 'maria@kypseli.example.gr'), true);
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_view(current_setting('t.tok4c')) ->> 'code_channel', 'email', 'Η σελίδα του πελάτη λέει ότι ο κωδικός θα έρθει με email');
select is(public.agreement_public_request_code(current_setting('t.tok4c'), 'Μαρία Παπαδάκη', true, '') ->> 'channel', 'email', 'Ο κωδικός θα σταλεί με email');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select is(public.t_code(current_setting('t.a4')::uuid), null, 'Και η ομάδα δεν τον βλέπει πια');

select * from finish();
rollback;
