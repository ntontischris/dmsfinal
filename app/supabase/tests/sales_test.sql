-- Πελάτες, Ευκαιρίες και Ρυθμίσεις › Πωλήσεις (κεφ. 2, ADR 0007, 0009, 0015). Φανταστικοί Χρήστες και στοιχεία.
begin;
select plan(189);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση · a3 Άννα (Πωλήσεις) · a4 Νίκος (Πωλήσεις) · a5 Λογιστής
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'accountant@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Μαρία', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a5', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτες: b1, b2 της Άννας · b3, b4 του Νίκου.
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000b1', 'Κυψέλη Καφέ', 'Κυψέλη Καφέ Ι.Κ.Ε.', 'Αθήνα', '099999999', 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000b2', 'Γυμναστήριο Κίνηση', '', 'Πειραιάς', null, 'Πέτρος Νικολάου', 'info@kinisi.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000b3', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', '081234567', 'Ελένη Γεωργίου', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000a4'),
  ('00000000-0000-0000-0000-0000000000b4', 'Καφέ Αθηνά', '', 'Θεσσαλονίκη', null, 'Κώστας Σιμιτζής', 'kostas@athina-cafe.example.gr', '+30 2310 333 333', '00000000-0000-0000-0000-0000000000a4');

-- ───────────── Καθαρές συναρτήσεις: κανονικοποίηση και ταίριασμα ─────────────
select is(public.sales_norm_phone('+30 2310 123 456'), '2310123456', 'Τηλέφωνο: χωρίς +30, κενά');
select is(public.sales_norm_phone('0030 6944 123456'), '6944123456', 'Τηλέφωνο: χωρίς 0030');
select is(public.sales_norm_phone('123'), '', 'Πολύ κοντό τηλέφωνο δεν ταιριάζει με τίποτα');
select is(public.sales_norm_name('Καφέ «Αθήναιον» Ι.Κ.Ε.'), 'καφεαθηναιον', 'Όνομα: χωρίς τόνους, σημεία, νομική μορφή');
select ok(public.sales_names_alike('Καφέ Αθήναιον', 'Καφέ Αθηνά'), 'Παρόμοια ονόματα: «Αθήναιον» / «Αθηνά»');
select ok(not public.sales_names_alike('Γυμναστήριο Κίνηση', 'Καφέ Αθηνά'), 'Διαφορετικά ονόματα δεν μοιάζουν');
select ok(public.sales_is_free_mail('gmail.com') and not public.sales_is_free_mail('kypseli.example.gr'), 'Δωρεάν υπηρεσίες email');

select is((select kind || ':' || reason from public.sales_find_match('081234567', 'x@y.gr', '', 'Άσχετο')), 'exact:afm', 'Ακριβές ταίριασμα ΑΦΜ');
select is((select kind || ':' || reason from public.sales_find_match(null, 'ARMYRA@Example.com', '', 'Άσχετο')), 'exact:email', 'Ακριβές ταίριασμα email, χωρίς διάκριση πεζών');
select is((select kind || ':' || reason from public.sales_find_match(null, 'someone@gmail.com', '+30 2310 333333', 'Άσχετο')), 'similar:phone', 'Ίδιο τηλέφωνο: μοιάζει');
select is((select kind || ':' || reason from public.sales_find_match(null, 'nikos@athina-cafe.example.gr', '', 'Άσχετο')), 'similar:email_domain', 'Ίδιο domain email: μοιάζει');
select is((select count(*)::int from public.sales_find_match(null, 'someone@gmail.com', '', 'Άσχετο')), 0, 'Κοινό gmail δεν δείχνει κοινό Πελάτη');
select is((select kind || ':' || reason from public.sales_find_match(null, 'new@other.gr', '', 'Καφέ Αθήναιον')), 'similar:name', 'Παρόμοιο όνομα: μοιάζει');
select is((select kind from public.sales_find_match('081234567', 'new@other.gr', '+30 2310 333 333', 'Καφέ Αθήναιον')), 'exact', 'Το ακριβές ταίριασμα προηγείται του παρόμοιου');

-- ───────────── Αρχικές λίστες ─────────────
select is((select count(*)::int from public.sales_stages where retired_at is null), 5, '5 αρχικά Στάδια');
select is((select count(*)::int from public.sales_sources), 6, '6 αρχικές Πηγές');
select is((select count(*)::int from public.sales_loss_reasons), 5, '5 αρχικοί Λόγοι απώλειας');
select is((select count(*)::int from public.sales_activity_kinds), 4, '4 αρχικά είδη Δραστηριότητας');
select ok((select is_system from public.sales_sources where code = 'web'), 'Η Πηγή «Ιστοσελίδα» είναι του συστήματος');
select is((select form_routing from public.sales_settings), 'owner', 'Οι Ευκαιρίες της φόρμας πάνε αρχικά στον Ιδιοκτήτη');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('sales_stages', 'sales_sources', 'sales_loss_reasons', 'sales_activity_kinds', 'sales_settings',
                        'clients', 'client_duplicate_flags', 'opportunities', 'opportunity_activities', 'access_requests')),
  10, 'RLS ενεργό σε όλους τους πίνακες πωλήσεων'
);

set local role authenticated;

-- ───────────── Άννα (Πωλήσεις, Εύρος «όσα με αφορούν») ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);

-- «Ένας Πελάτης, ένας πωλητής»: οι άλλοι βλέπουν ότι υπάρχει και ποιος είναι ο Υπεύθυνος, τίποτε άλλο.
select is((select count(*)::int from public.clients), 2, 'Ο πίνακας Πελατών δείχνει στην Άννα μόνο τους δικούς της');
select is((select count(*)::int from public.sales_client_list()), 4, 'Η λίστα Πελατών δείχνει όλους τους Πελάτες');
select is(
  (select manager_name || ':' || can_open::text || ':' || city || ':' || coalesce(open_opportunities::text, 'null')
     from public.sales_client_list(null, 100, 0, '00000000-0000-0000-0000-0000000000b3')),
  'Νίκος:false::null', 'Πελάτης άλλου: μόνο όνομα και Υπεύθυνος, χωρίς πόλη και Ευκαιρίες'
);
select is((select can_open from public.sales_client_list(null, 100, 0, '00000000-0000-0000-0000-0000000000b1')), true, 'Δικός της Πελάτης: ανοίγει');
select is((select count(*)::int from public.sales_client_list('Κίνηση')), 1, 'Αναζήτηση με όνομα');
select is((select count(*)::int from public.sales_client_list('Ναύπλιο')), 0, 'Η πόλη ενός κατειλημμένου Πελάτη δεν αναζητείται');
select is((select count(*)::int from public.sales_client_list('Αθήνα')), 1, 'Η πόλη δικού της Πελάτη αναζητείται');
select is((select count(*)::int from public.client_duplicate_flags), 0, 'Το σήμα «Πιθανό διπλό» δεν φαίνεται στην Άννα');

-- Άμεση εγγραφή στους πίνακες δεν επιτρέπεται: μόνο μέσα από τις συναρτήσεις.
select throws_ok(
  $$ insert into public.clients (name, contact_name, contact_email) values ('Χακαρισμένος', 'Χ', 'x@example.com') $$,
  '42501', null, 'Δεν γράφεις Πελάτη απευθείας'
);
select throws_ok(
  $$ update public.clients set manager_id = '00000000-0000-0000-0000-0000000000a3' where id = '00000000-0000-0000-0000-0000000000b3' $$,
  '42501', null, 'Δεν αλλάζεις Υπεύθυνο απευθείας'
);

-- Νέα Ευκαιρία σε δικό της Πελάτη.
select set_config('t.r1', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b1', null, 'Βίντεο εγκαινίων',
  (select id from public.sales_sources where code = 'referral'), 'Καφέ Αθηνά',
  'Να στείλω πρόταση', current_date + 3)::text, true);
select is(current_setting('t.r1')::jsonb ->> 'status', 'created', 'Νέα Ευκαιρία σε δικό της Πελάτη');
select is(
  (select o.manager_id::text || ':' || o.outcome || ':' || s.code from public.opportunities o
     join public.sales_stages s on s.id = o.stage_id where o.id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid),
  '00000000-0000-0000-0000-0000000000a3:open:new', 'Ξεκινά ανοιχτή, στο πρώτο Στάδιο, με Υπεύθυνο την Άννα'
);
select is(
  (select count(*)::int from public.opportunity_activities
    where opportunity_id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid and event = 'created'),
  1, 'Η δημιουργία γράφεται ως Δραστηριότητα'
);
select throws_ok(
  format($$ select public.sales_create_opportunity('00000000-0000-0000-0000-0000000000b1', null, 'Χωρίς βήμα',
     %L, '', '', null) $$, (select id from public.sales_sources where code = 'phone')),
  '23514', null, 'Ανοιχτή Ευκαιρία χωρίς Επόμενο βήμα με ημερομηνία δεν γίνεται'
);

-- Πελάτης άλλου: μπλοκάρεται, με το όνομα του Υπεύθυνου.
select set_config('t.r2', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b3', null, 'Νέο βίντεο',
  (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select is(current_setting('t.r2')::jsonb ->> 'status', 'blocked', 'Νέα Ευκαιρία σε Πελάτη άλλου μπλοκάρεται');
select is(current_setting('t.r2')::jsonb ->> 'manager_name', 'Νίκος', 'Το μήνυμα λέει ποιος είναι ο Υπεύθυνος');
select is((select count(*)::int from public.opportunities where client_id = '00000000-0000-0000-0000-0000000000b3'), 0, 'Δεν δημιουργήθηκε τίποτα');

-- Ακριβές ταίριασμα με Πελάτη άλλου (ίδιο email) μπλοκάρεται και δεν φτιάχνει διπλό.
select set_config('t.r3', public.sales_create_opportunity(
  null, '{"name":"Αρμύρα","contact_name":"Ελένη","contact_email":"Armyra@example.com"}'::jsonb, 'Δοκιμή',
  (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select is(current_setting('t.r3')::jsonb ->> 'status', 'blocked', 'Ίδιο email με Πελάτη άλλου: μπλοκάρεται');
select is((select count(*)::int from public.sales_client_list()), 4, 'Δεν φτιάχτηκε νέος Πελάτης');

-- Νέος Πελάτης: ο δημιουργός γίνεται Υπεύθυνος.
select set_config('t.r4', public.sales_create_opportunity(
  null, '{"name":"Ζαχαροπλαστείο Μέλι","city":"Πάτρα","contact_name":"Σοφία Μέλη","contact_email":"sofia@meli.example.gr","contact_phone":"2610 444444"}'::jsonb,
  'Πακέτο podcast', (select id from public.sales_sources where code = 'instagram'), '', 'Πρώτη κλήση', current_date + 2)::text, true);
select is(current_setting('t.r4')::jsonb ->> 'status', 'created', 'Νέος Πελάτης με Ευκαιρία');
select ok((current_setting('t.r4')::jsonb ->> 'client_created')::boolean and not (current_setting('t.r4')::jsonb ->> 'flagged')::boolean,
  'Νέος Πελάτης χωρίς σήμα διπλού');
select is(
  (select manager_id::text from public.clients where id = (current_setting('t.r4')::jsonb ->> 'client_id')::uuid),
  '00000000-0000-0000-0000-0000000000a3', 'Ο δημιουργός γίνεται Υπεύθυνος του νέου Πελάτη'
);

-- Κάτι που μοιάζει (ίδιο τηλέφωνο με τον Πελάτη του Νίκου): νέος Πελάτης με σήμα, όχι ένωση.
select set_config('t.r5', public.sales_create_opportunity(
  null, '{"name":"Καφέ Αθήναιον","contact_name":"Γιάννης","contact_email":"giannis@athinaion.example.gr","contact_phone":"2310333333"}'::jsonb,
  'Πακέτο social', (select id from public.sales_sources where code = 'web'), '', 'Κλήση', current_date + 1)::text, true);
select ok((current_setting('t.r5')::jsonb ->> 'flagged')::boolean, 'Ίδιο τηλέφωνο: νέος Πελάτης με σήμα «Πιθανό διπλό»');

-- Δουλειά πάνω στην Ευκαιρία: Στάδιο, Δραστηριότητα, αποτυχία ξένου.
select public.sales_update_opportunity(
  (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid, 'Βίντεο εγκαινίων',
  (select id from public.sales_stages where code = 'proposal'), 'Ρώτα αν είδε την πρόταση', current_date + 4);
select is(
  (select count(*)::int from public.opportunity_activities
    where opportunity_id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid and event = 'stage_changed'
      and subject_id = (select id from public.sales_stages where code = 'proposal')),
  1, 'Η αλλαγή Σταδίου γράφεται ως Δραστηριότητα'
);
select lives_ok(
  format($$ select public.sales_move_stage(%L, %L) $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_stages where code = 'negotiation')),
  'Μετακίνηση στο pipeline (μόνο Στάδιο)'
);
select lives_ok(
  format($$ select public.sales_log_activity(%L, %L, 'Μίλησα στο τηλέφωνο') $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_activity_kinds where code = 'call')),
  'Χειροκίνητη Δραστηριότητα'
);
select throws_ok(
  format($$ select public.sales_log_activity(%L, %L, '   ') $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_activity_kinds where code = 'call')),
  '23514', null, 'Δραστηριότητα χωρίς κείμενο δεν γίνεται'
);
select throws_ok(
  $$ update public.opportunity_activities set body = 'αλλαγή' $$,
  '42501', null, 'Το ιστορικό δεν αλλάζει από τον χρήστη'
);

-- Κλείσιμο ως χαμένη: υποχρεωτικός Λόγος. Δεν ξανανοίγει.
select set_config('t.r6', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b2', null, 'Έξτρα reels',
  (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select throws_ok(
  format($$ select public.sales_close_lost(%L, null) $$, current_setting('t.r6')::jsonb ->> 'opportunity_id'),
  'P0001', null, 'Το κλείσιμο ως χαμένη θέλει Λόγο απώλειας'
);
select lives_ok(
  format($$ select public.sales_close_lost(%L, %L) $$, current_setting('t.r6')::jsonb ->> 'opportunity_id',
    (select id from public.sales_loss_reasons where code = 'price')),
  'Κλείσιμο ως χαμένη με Λόγο'
);
select is(
  (select outcome || ':' || (closed_at is not null)::text from public.opportunities
    where id = (current_setting('t.r6')::jsonb ->> 'opportunity_id')::uuid),
  'lost:true', 'Η Ευκαιρία έγινε χαμένη'
);
select is(
  (select count(*)::int from public.opportunity_activities
    where opportunity_id = (current_setting('t.r6')::jsonb ->> 'opportunity_id')::uuid and event = 'lost'),
  1, 'Η απώλεια γράφεται ως Δραστηριότητα'
);
select throws_ok(
  format($$ select public.sales_update_opportunity(%L, 'Έξτρα reels', %L, 'Κάτι', current_date + 1) $$,
    current_setting('t.r6')::jsonb ->> 'opportunity_id', (select id from public.sales_stages where code = 'meeting')),
  'P0001', null, 'Η χαμένη Ευκαιρία δεν αλλάζει'
);
select throws_ok(
  format($$ select public.sales_follow_up(%L, 'Συνέχεια', %L, 'Κλήση', current_date + 2) $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_sources where code = 'phone')),
  'P0001', null, '«Νέα Ευκαιρία από αυτήν» μόνο από χαμένη'
);
select set_config('t.f1', public.sales_follow_up(
  (current_setting('t.r6')::jsonb ->> 'opportunity_id')::uuid, 'Έξτρα reels, δεύτερη προσπάθεια',
  (select id from public.sales_sources where code = 'phone'), 'Κλήση', current_date + 5)::text, true);
select is(
  (select follows_opportunity_id::text from public.opportunities where id = current_setting('t.f1')::uuid),
  current_setting('t.r6')::jsonb ->> 'opportunity_id', 'Η νέα Ευκαιρία κρατά σύνδεσμο στη χαμένη'
);

-- Ο Νίκος δεν δουλεύει την Ευκαιρία της Άννας και δεν τη βλέπει.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select is((select count(*)::int from public.opportunities where id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid), 0,
  'Ο Νίκος δεν βλέπει τις Ευκαιρίες της Άννας');
select throws_ok(
  format($$ select public.sales_move_stage(%L, %L) $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_stages where code = 'meeting')),
  '42501', null, 'Ο Νίκος δεν μετακινεί την Ευκαιρία της Άννας'
);
select throws_ok(
  format($$ select public.sales_log_activity(%L, %L, 'Παρείσακτος') $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_activity_kinds where code = 'note')),
  '42501', null, 'Ο Νίκος δεν γράφει Δραστηριότητα στην Ευκαιρία της Άννας'
);

-- Η Άννα ζητά πρόσβαση στον Πελάτη του Νίκου.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('t.q1', public.sales_request_access(
  '00000000-0000-0000-0000-0000000000b3', 'Βίντεο για καμπάνια', 'Τον ξέρω από παλιά συνεργασία.',
  (select id from public.sales_sources where code = 'referral'))::text, true);
select ok(current_setting('t.q1')::uuid is not null, 'Αίτημα πρόσβασης');
select throws_ok(
  format($$ select public.sales_request_access('00000000-0000-0000-0000-0000000000b3', 'Ξανά', '', %L) $$,
    (select id from public.sales_sources where code = 'referral')),
  '23505', null, 'Ένα εκκρεμές Αίτημα ανά πωλητή και Πελάτη'
);
select throws_ok(
  format($$ select public.sales_request_access('00000000-0000-0000-0000-0000000000b1', 'Δικός μου', '', %L) $$,
    (select id from public.sales_sources where code = 'referral')),
  'P0001', null, 'Δεν χρειάζεται Αίτημα για δικό της Πελάτη'
);
select throws_ok(
  format($$ select public.sales_decide_access(%L, true, '') $$, current_setting('t.q1')),
  '42501', null, 'Ο πωλητής δεν αποφασίζει Αιτήματα πρόσβασης'
);
select is((select count(*)::int from public.access_requests), 1, 'Η Άννα βλέπει το δικό της Αίτημα');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select is((select count(*)::int from public.access_requests), 0, 'Ο Υπεύθυνος του Πελάτη δεν βλέπει το Αίτημα (ενημερώνεται, δεν αποφασίζει)');

-- Η Διαχείριση (Μεταβιβάζει Υπεύθυνο) εγκρίνει: ΜΙΑ Ευκαιρία για την Άννα, ο Πελάτης μένει στον Νίκο.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.access_requests where status = 'pending'), 1, 'Η Διαχείριση βλέπει το Αίτημα');
select set_config('t.o1', public.sales_decide_access(current_setting('t.q1')::uuid, true, '')::text, true);
select is(
  (select o.manager_id::text || ':' || c.manager_id::text from public.opportunities o join public.clients c on c.id = o.client_id
    where o.id = current_setting('t.o1')::uuid),
  '00000000-0000-0000-0000-0000000000a3:00000000-0000-0000-0000-0000000000a4',
  'Η Ευκαιρία ανήκει στην Άννα, ο Πελάτης μένει στον Νίκο'
);
select throws_ok(
  format($$ select public.sales_decide_access(%L, false, 'Όχι') $$, current_setting('t.q1')),
  'P0001', null, 'Ένα Αίτημα που αποφασίστηκε δεν αποφασίζεται ξανά'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.clients where id = '00000000-0000-0000-0000-0000000000b3'), 1,
  'Μετά την έγκριση η Άννα βλέπει τον Πελάτη');
select is((select count(*)::int from public.opportunities where client_id = '00000000-0000-0000-0000-0000000000b3'), 1,
  'Βλέπει μόνο τη δική της Ευκαιρία στον Πελάτη του Νίκου');

-- Απόρριψη: υποχρεωτικό σχόλιο.
select set_config('t.q2', public.sales_request_access(
  '00000000-0000-0000-0000-0000000000b4', 'Πακέτο podcast', '', (select id from public.sales_sources where code = 'phone'))::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.sales_decide_access(%L, false, '  ') $$, current_setting('t.q2')),
  'P0001', null, 'Η απόρριψη θέλει σχόλιο'
);
select lives_ok(
  format($$ select public.sales_decide_access(%L, false, 'Το έχει ήδη ο Νίκος.') $$, current_setting('t.q2')),
  'Απόρριψη με σχόλιο'
);
select is((select status from public.access_requests where id = current_setting('t.q2')::uuid), 'rejected', 'Το Αίτημα απορρίφθηκε');

-- Μεταβίβαση ολόκληρου του Πελάτη: οι ανοιχτές Ευκαιρίες του προηγούμενου Υπεύθυνου ακολουθούν.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select set_config('t.r7', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b4', null, 'Ανανέωση social',
  (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select throws_ok(
  $$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a3') $$,
  '42501', null, 'Ο πωλητής δεν μεταβιβάζει Πελάτη'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok(
  $$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a3') $$,
  'Η Διαχείριση μεταβιβάζει τον Πελάτη'
);
select is(
  (select o.manager_id::text from public.opportunities o where o.id = (current_setting('t.r7')::jsonb ->> 'opportunity_id')::uuid),
  '00000000-0000-0000-0000-0000000000a3', 'Η ανοιχτή Ευκαιρία ακολούθησε τον Πελάτη'
);
select ok(
  (select count(*) = 1 from public.opportunity_activities
    where opportunity_id = (current_setting('t.r7')::jsonb ->> 'opportunity_id')::uuid and event = 'assigned'
      and previous_id = '00000000-0000-0000-0000-0000000000a4' and subject_id = '00000000-0000-0000-0000-0000000000a3'),
  'Η μεταβίβαση γράφεται ως Δραστηριότητα'
);
select throws_ok(
  $$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a3') $$,
  'P0001', null, 'Μεταβίβαση στον ίδιο Υπεύθυνο δεν γίνεται'
);
select throws_ok(
  $$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a5') $$,
  'P0001', null, 'Υπεύθυνος γίνεται μόνο όποιος διαχειρίζεται Πελάτες (ο Λογιστής όχι)'
);

-- Μεταβίβαση με Αίτημα: ο νέος Υπεύθυνος είναι υποχρεωτικός και είναι αυτός που ζήτησε πρόσβαση.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select set_config('t.q3', public.sales_request_access(
  '00000000-0000-0000-0000-0000000000b4', 'Ανανέωση social', '', (select id from public.sales_sources where code = 'referral'))::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', null) $$,
  'P0001', null, 'Η μεταβίβαση θέλει νέο Υπεύθυνο'
);
select throws_ok(
  format($$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a2', %L) $$, current_setting('t.q3')),
  'P0001', null, 'Το Αίτημα κλείνει μεταβιβάζοντας μόνο σε αυτόν που το ζήτησε'
);
select lives_ok(
  format($$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', %L) $$, current_setting('t.q3')),
  'Μεταβίβαση στον πωλητή που ζήτησε πρόσβαση'
);
select is(
  (select status || ':' || resolution from public.access_requests where id = current_setting('t.q3')::uuid),
  'approved:transfer', 'Το Αίτημα έκλεισε ως μεταβίβαση'
);
select lives_ok(
  $$ select public.sales_transfer_client('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a3') $$,
  'Ο Πελάτης επιστρέφει στην Άννα για τα επόμενα τεστ'
);

-- Έγκριση Αιτήματος όταν η Πηγή του αποσύρθηκε μετά το Αίτημα: το Αίτημα ήταν έγκυρο όταν έγινε.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('t.q4', public.sales_request_access(
  '00000000-0000-0000-0000-0000000000b3', 'Δεύτερο βίντεο', '', (select id from public.sales_sources where code = 'referral'))::text, true);
select ok(current_setting('t.q4')::uuid is not null, 'Δεύτερο Αίτημα πρόσβασης της Άννας');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$ update public.sales_sources set retired_at = now() where code = 'referral' $$, 'Η Πηγή «Σύσταση» αποσύρεται');
select set_config('t.o2', public.sales_decide_access(current_setting('t.q4')::uuid, true, '')::text, true);
select is(
  (select s.code from public.opportunities o join public.sales_sources s on s.id = o.source_id where o.id = current_setting('t.o2')::uuid),
  'referral', 'Η έγκριση δέχεται την Πηγή που ίσχυε όταν έγινε το Αίτημα'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.sales_create_opportunity('00000000-0000-0000-0000-0000000000b1', null, 'Με αποσυρμένη Πηγή', %L, '', 'Κλήση', current_date + 1) $$,
    (select id from public.sales_sources where code = 'referral')),
  'P0001', null, 'Αλλού η αποσυρμένη Πηγή δεν διαλέγεται'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$ update public.sales_sources set retired_at = null where code = 'referral' $$, 'Η Πηγή «Σύσταση» ξαναενεργοποιείται');

-- ───────────── Φόρμα Ιστοσελίδας: διαδρομή και ουρά «Χωρίς υπεύθυνο» ─────────────
reset role;
set local role service_role;
select set_config('t.i1', public.sales_intake_form(
  '{"name":"Οδοντιατρείο Φως","contact_name":"Ελένη","contact_email":"eleni@fos.example.gr"}'::jsonb, 'Βίντεο γνωριμίας')::text, true);
select is(
  (select m.manager_id::text from public.opportunities m where m.id = current_setting('t.i1')::uuid),
  '00000000-0000-0000-0000-0000000000a1', 'Η φόρμα, με ρύθμιση «Ιδιοκτήτης», δίνει την Ευκαιρία στον Ιδιοκτήτη'
);
select is(
  (select s.code from public.opportunities m join public.sales_sources s on s.id = m.source_id where m.id = current_setting('t.i1')::uuid),
  'web', 'Η Πηγή της φόρμας είναι «Ιστοσελίδα»'
);
select set_config('t.i2', public.sales_intake_form(
  '{"name":"Κυψέλη","contact_name":"Μαρία","contact_email":"MARIA@kypseli.example.gr"}'::jsonb, 'Δεύτερο αίτημα')::text, true);
select is(
  (select m.client_id::text || ':' || m.manager_id::text from public.opportunities m where m.id = current_setting('t.i2')::uuid),
  '00000000-0000-0000-0000-0000000000b1:00000000-0000-0000-0000-0000000000a3',
  'Ίδιο email: η Ευκαιρία μπαίνει στον υπάρχοντα Πελάτη και στον Υπεύθυνό του'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$ select public.sales_intake_form('{"name":"Χ","contact_name":"Χ","contact_email":"x@example.com"}'::jsonb, 'Χ') $$,
  '42501', null, 'Η φόρμα δεν καλείται από συνδεδεμένο χρήστη'
);

-- Ρύθμιση: η ουρά.
select is((select count(*)::int from public.sales_assignable_users()), 0, 'Ο πωλητής δεν παίρνει τη λίστα με όσους αναθέτουν');
select lives_ok($$ update public.sales_settings set form_routing = 'queue' $$, 'Ο πωλητής δοκιμάζει να αλλάξει τη ρύθμιση');
select is((select form_routing from public.sales_settings), 'owner', 'Η ρύθμιση δεν άλλαξε: μόνο όποιος «Διαχειρίζεται Ρυθμίσεις»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$ update public.sales_settings set form_routing = 'queue' $$, 'Η Διαχείριση ορίζει την ουρά');
select throws_ok(
  $$ update public.sales_settings set form_routing = 'person' $$,
  '23514', null, 'Το «συγκεκριμένο πρόσωπο» θέλει πρόσωπο'
);
select throws_ok(
  $$ update public.sales_settings set form_routing = 'person', form_assignee_id = '00000000-0000-0000-0000-0000000000a5' $$,
  'P0001', null, 'Πρόσωπο που δεν διαχειρίζεται Πελάτες (Λογιστής) δεν ορίζεται'
);
select is((select count(*)::int from public.sales_assignable_users()), 4, 'Η Διαχείριση βλέπει όσους μπορούν να γίνουν Υπεύθυνοι (όχι τον Λογιστή)');

reset role;
set local role service_role;
select set_config('t.i3', public.sales_intake_form(
  '{"name":"Φούρνος Σπόρος","contact_name":"Νίκη","contact_email":"niki@sporos.example.gr"}'::jsonb, 'Πακέτο social', 'Πρώτη κλήση', current_date + 1)::text, true);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(
  (select m.manager_id is null from public.opportunities m where m.id = current_setting('t.i3')::uuid), true,
  'Με ρύθμιση «ουρά» η Ευκαιρία μένει χωρίς Υπεύθυνο'
);
select is(
  (select c.manager_id is null from public.clients c join public.opportunities m on m.client_id = c.id where m.id = current_setting('t.i3')::uuid), true,
  'Και ο νέος Πελάτης μένει χωρίς Υπεύθυνο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select count(*)::int from public.opportunities where id = current_setting('t.i3')::uuid), 0, 'Η ουρά δεν φαίνεται σε πωλητή');
select throws_ok(
  format($$ select public.sales_assign_opportunity(%L, '00000000-0000-0000-0000-0000000000a3') $$, current_setting('t.i3')),
  '42501', null, 'Ο πωλητής δεν αναθέτει από την ουρά'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok(
  format($$ select public.sales_assign_opportunity(%L, '00000000-0000-0000-0000-0000000000a4') $$, current_setting('t.i3')),
  'Η Διαχείριση αναθέτει από την ουρά'
);
select is(
  (select c.manager_id::text || ':' || m.manager_id::text from public.clients c join public.opportunities m on m.client_id = c.id where m.id = current_setting('t.i3')::uuid),
  '00000000-0000-0000-0000-0000000000a4:00000000-0000-0000-0000-0000000000a4',
  'Ο Πελάτης και η Ευκαιρία πήγαν στον νέο Υπεύθυνο'
);

-- Όταν ο Υπεύθυνος χάσει το Δικαίωμα να έχει Πελάτες (του αφαιρέθηκε ο Ρόλος), η φόρμα δεν σκάει: η Ευκαιρία πάει στην ουρά.
reset role;
update public.sales_settings set form_routing = 'person', form_assignee_id = '00000000-0000-0000-0000-0000000000a3';
delete from public.team_user_roles where user_id = '00000000-0000-0000-0000-0000000000a3';
set local role service_role;
select lives_ok(
  $$ select public.sales_intake_form('{"name":"Εργαστήριο Ήχου","contact_name":"Λίνα","contact_email":"lina@ichos.example.gr"}'::jsonb, 'Φόρμα χωρίς Υπεύθυνο') $$,
  'Η φόρμα με Υπεύθυνο που έχασε το Δικαίωμα δεν αποτυγχάνει'
);
select is(
  (select (m.manager_id is null)::text || ':' || (c.manager_id is null)::text
     from public.opportunities m join public.clients c on c.id = m.client_id where m.title = 'Φόρμα χωρίς Υπεύθυνο'),
  'true:true', 'Η Ευκαιρία και ο νέος Πελάτης μένουν στην ουρά'
);
select lives_ok(
  $$ select public.sales_intake_form('{"name":"Κυψέλη","contact_name":"Μαρία","contact_email":"maria@kypseli.example.gr"}'::jsonb, 'Φόρμα, ο Υπεύθυνος έχασε το Δικαίωμα') $$,
  'Ακριβές ταίριασμα με Πελάτη του οποίου ο Υπεύθυνος έχασε το Δικαίωμα δεν αποτυγχάνει'
);
select is(
  (select (m.manager_id is null)::text || ':' || m.client_id::text from public.opportunities m
    where m.title = 'Φόρμα, ο Υπεύθυνος έχασε το Δικαίωμα'),
  'true:' || '00000000-0000-0000-0000-0000000000b1', 'Η Ευκαιρία μπαίνει στον υπάρχοντα Πελάτη αλλά περιμένει Υπεύθυνο στην ουρά'
);
reset role;
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a3', r.id from public.roles r where r.name = 'Πωλήσεις' and r.kind = 'team';
update public.sales_settings set form_routing = 'queue', form_assignee_id = null;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

-- ───────────── Πιθανά διπλά και Συγχώνευση (B6) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('t.r8', public.sales_create_opportunity(
  null, '{"name":"Κίνηση Gym","contact_name":"Πέτρος","contact_email":"p@kinisi-gym.example.gr","contact_phone":"210 2222222"}'::jsonb,
  'Reels', (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select is(public.sales_duplicate_pairs(), '[]'::jsonb, 'Ο πωλητής δεν βλέπει τα Πιθανά διπλά');
select is((select bool_or(is_possible_duplicate) from public.sales_client_list()), false, 'Ο πωλητής δεν βλέπει το σήμα στη λίστα');
select is((select count(*)::int from public.sales_client_list() where can_open is null or is_possible_duplicate is null), 0, 'Ο Πελάτης χωρίς Υπεύθυνο δίνει «δεν ανοίγει», όχι κενό');
select throws_ok(
  $$ select public.sales_merge_clients('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b2') $$,
  '42501', null, 'Ο πωλητής δεν συγχωνεύει Πελάτες'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(jsonb_array_length(public.sales_duplicate_pairs()), 2, 'Η Διαχείριση βλέπει τα δύο Πιθανά διπλά');
select is(
  (select pair -> 'candidate' ->> 'name' || ' ~ ' || (pair -> 'existing' ->> 'name')
     from jsonb_array_elements(public.sales_duplicate_pairs()) pair
    where pair -> 'candidate' ->> 'name' = 'Κίνηση Gym'),
  'Κίνηση Gym ~ Γυμναστήριο Κίνηση', 'Κάθε εκκρεμότητα δείχνει τον νέο και τον υπάρχοντα Πελάτη'
);
select is((select count(*)::int from public.sales_client_list() where is_possible_duplicate), 2, 'Η Διαχείριση βλέπει το σήμα στη λίστα');
select lives_ok(
  format($$ select public.sales_resolve_duplicate(%L) $$,
    (select f.id from public.client_duplicate_flags f where f.client_id = (current_setting('t.r8')::jsonb ->> 'client_id')::uuid)),
  '«Είναι άλλος» κλείνει το σήμα'
);
select throws_ok(
  format($$ select public.sales_resolve_duplicate(%L) $$,
    (select f.id from public.client_duplicate_flags f where f.client_id = (current_setting('t.r8')::jsonb ->> 'client_id')::uuid)),
  'P0001', null, 'Το σήμα κλείνει μία φορά'
);
select is(
  (select resolution from public.client_duplicate_flags where client_id = (current_setting('t.r8')::jsonb ->> 'client_id')::uuid),
  'other', 'Η απόφαση καταγράφεται'
);
select is(
  (select count(*)::int from public.clients where id = (current_setting('t.r8')::jsonb ->> 'client_id')::uuid and archived_at is null),
  1, 'Οι Πελάτες μένουν χωριστοί'
);

-- Τρίτος Πελάτης που μοιάζει με αυτόν που θα απορροφηθεί (ίδιο domain email με τον «Καφέ Αθήναιον»).
select set_config('t.r10', public.sales_create_opportunity(
  null, '{"name":"Αθήναιον Catering","contact_name":"Κώστας","contact_email":"kostas@athinaion.example.gr"}'::jsonb,
  'Catering', (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select ok((current_setting('t.r10')::jsonb ->> 'flagged')::boolean, 'Ο τρίτος Πελάτης σημαίνεται ως πιθανό διπλό του «Καφέ Αθήναιον»');

-- Συγχώνευση: ο «Καφέ Αθήναιον» (r5) μπαίνει στον «Καφέ Αθηνά» (b4).
select lives_ok(
  format($$ select public.sales_merge_clients('00000000-0000-0000-0000-0000000000b4', %L) $$, current_setting('t.r5')::jsonb ->> 'client_id'),
  'Συγχώνευση δύο Πελατών'
);
select is(
  (select o.client_id::text from public.opportunities o where o.id = (current_setting('t.r5')::jsonb ->> 'opportunity_id')::uuid),
  '00000000-0000-0000-0000-0000000000b4', 'Η Ευκαιρία πέρασε στον Πελάτη που μένει'
);
select is(
  (select (archived_at is not null)::text || ':' || merged_into_id::text from public.clients where id = (current_setting('t.r5')::jsonb ->> 'client_id')::uuid),
  'true:00000000-0000-0000-0000-0000000000b4', 'Ο άλλος αρχειοθετήθηκε μέσα στον ενιαίο Πελάτη'
);
select is(
  (select count(*)::int from public.opportunity_activities where client_id = (current_setting('t.r5')::jsonb ->> 'client_id')::uuid),
  0, 'Το ιστορικό πέρασε στον ενιαίο Πελάτη'
);
select is(
  (select resolution from public.client_duplicate_flags where client_id = (current_setting('t.r5')::jsonb ->> 'client_id')::uuid),
  'merged', 'Το σήμα έκλεισε ως «συγχωνεύθηκε»'
);
select is(
  (select matches_client_id::text || ':' || (resolved_at is null)::text from public.client_duplicate_flags
    where client_id = (current_setting('t.r10')::jsonb ->> 'client_id')::uuid),
  '00000000-0000-0000-0000-0000000000b4:true'::text, 'Το σήμα τρίτου Πελάτη δείχνει πια στον Πελάτη που έμεινε και μένει ανοιχτό'
);
select throws_ok(
  format($$ select public.sales_merge_clients('00000000-0000-0000-0000-0000000000b4', %L) $$, current_setting('t.r5')::jsonb ->> 'client_id'),
  'P0001', null, 'Ο αρχειοθετημένος Πελάτης δεν συγχωνεύεται ξανά'
);
select throws_ok(
  $$ select public.sales_merge_clients('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b4') $$,
  'P0001', null, 'Συγχώνευση προϋποθέτει δύο διαφορετικούς Πελάτες'
);
select throws_ok(
  format($$ update public.clients set name = 'Άλλο' where id = %L $$, current_setting('t.r5')::jsonb ->> 'client_id'),
  '42501', null, 'Ο συγχωνευμένος Πελάτης δεν αλλάζει απευθείας'
);

-- ───────────── Λογιστής: βλέπει Πελάτες, όχι Ευκαιρίες ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select is((select count(*)::int from public.sales_client_list()), 10, 'Ο Λογιστής βλέπει όλους τους Πελάτες');
select is((select bool_and(can_open) from public.sales_client_list()), true, 'Και τα στοιχεία τους (Εύρος «όλα»)');
select is((select count(*)::int from public.opportunities), 0, 'Ο Λογιστής δεν βλέπει Ευκαιρίες');
select is((select count(*)::int from public.opportunity_activities), 0, 'Ούτε Δραστηριότητες');
select is(public.sales_duplicate_pairs(), '[]'::jsonb, 'Ούτε τα Πιθανά διπλά');
select throws_ok(
  format($$ select public.sales_create_opportunity('00000000-0000-0000-0000-0000000000b1', null, 'Χ', %L, '', 'Χ', current_date) $$,
    (select id from public.sales_sources where code = 'phone')),
  '42501', null, 'Ο Λογιστής δεν ανοίγει Ευκαιρίες'
);

-- ───────────── Όταν ο Υπεύθυνος απενεργοποιείται, ό,τι είχε επιστρέφει στην ουρά ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$ update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-0000000000a4' $$, 'Απενεργοποίηση του Νίκου');
select is(
  (select manager_id is null from public.clients where id = '00000000-0000-0000-0000-0000000000b3'), true,
  'Ο Πελάτης του Νίκου έμεινε χωρίς Υπεύθυνο'
);
select is(
  (select manager_id is null from public.opportunities where id = current_setting('t.i3')::uuid), true,
  'Η ανοιχτή Ευκαιρία του Νίκου γύρισε στην ουρά'
);
select is(
  (select manager_id::text from public.opportunities where id = current_setting('t.o1')::uuid),
  '00000000-0000-0000-0000-0000000000a3', 'Η Ευκαιρία της Άννας στον ίδιο Πελάτη δεν άλλαξε'
);
select is((select count(*)::int from public.opportunities where manager_id is null and outcome = 'open'), 3, 'Η ουρά έχει τρεις Ευκαιρίες (του Νίκου και οι δύο της φόρμας)');

-- ───────────── Λίστες Ρυθμίσεων: δημιουργία, μετονομασία, απόσυρση, διαγραφή ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.sales_stages (label, sort) values ('Δοκιμή', 60) $$,
  '42501', null, 'Ο πωλητής δεν προσθέτει Στάδιο'
);
select is((select count(*)::int from public.sales_list_usage()), 0, 'Ο πωλητής δεν βλέπει τη χρήση των τιμών');
select throws_ok(
  $$ select public.sales_retire_stage('00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'Ο πωλητής δεν αποσύρει Στάδιο'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$ insert into public.sales_stages (label, sort) values ('Δοκιμή', 60) $$, 'Η Διαχείριση προσθέτει Στάδιο');
select lives_ok($$ delete from public.sales_stages where label = 'Δοκιμή' $$, 'Στάδιο που δεν χρησιμοποιήθηκε διαγράφεται');
select throws_ok(
  $$ delete from public.sales_stages where code = 'negotiation' $$,
  'P0001', null, 'Στάδιο σε χρήση δεν διαγράφεται'
);
select throws_ok(
  $$ insert into public.sales_stages (label, sort) values ('TEST A', 70), ('test a', 80) $$,
  '23505', null, 'Δύο ενεργές τιμές με το ίδιο όνομα δεν γίνονται'
);
select lives_ok($$ update public.sales_stages set label = 'Διαπραγμάτευση 2' where code = 'negotiation' $$, 'Μετονομασία Σταδίου');
select is(
  (select s.label from public.opportunities o join public.sales_stages s on s.id = o.stage_id
    where o.id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid),
  'Διαπραγμάτευση 2', 'Η μετονομασία περνά σε όλες τις Ευκαιρίες'
);
select is(
  (select uses::int from public.sales_list_usage() where list = 'stages' and item_id = (select id from public.sales_stages where code = 'negotiation')),
  1, 'Η χρήση του Σταδίου μετριέται'
);
select throws_ok(
  $$ update public.sales_stages set retired_at = now() where code = 'new' $$,
  'P0001', null, 'Στάδιο με ανοιχτές Ευκαιρίες δεν αποσύρεται απευθείας'
);
select throws_ok(
  $$ select public.sales_retire_stage((select id from public.sales_stages where code = 'new'), null) $$,
  'P0001', null, 'Η απόσυρση θέλει Στάδιο προορισμού'
);
select set_config('t.moved', public.sales_retire_stage(
  (select id from public.sales_stages where code = 'new'), (select id from public.sales_stages where code = 'first_contact'))::text, true);
select ok(current_setting('t.moved')::int >= 1, 'Οι ανοιχτές Ευκαιρίες μεταφέρθηκαν');
select is(
  (select count(*)::int from public.opportunities o join public.sales_stages s on s.id = o.stage_id where s.code = 'new' and o.outcome = 'open'),
  0, 'Δεν έμεινε ανοιχτή Ευκαιρία στο αποσυρμένο Στάδιο'
);
select is((select (retired_at is not null) from public.sales_stages where code = 'new'), true, 'Το Στάδιο αποσύρθηκε');
select ok(
  (select count(*) >= 1 from public.opportunity_activities where event = 'stage_changed'
    and previous_id = (select id from public.sales_stages where code = 'new')
    and subject_id = (select id from public.sales_stages where code = 'first_contact')),
  'Η μεταφορά γράφεται ως Δραστηριότητα'
);
select throws_ok(
  format($$ select public.sales_update_opportunity(%L, 'Βίντεο εγκαινίων', %L, 'Κάτι', current_date + 1) $$,
    current_setting('t.r1')::jsonb ->> 'opportunity_id', (select id from public.sales_stages where code = 'new')),
  'P0001', null, 'Αποσυρμένο Στάδιο δεν διαλέγεται για νέα αλλαγή'
);

select lives_ok($$ select public.sales_move_list_item('stages', (select id from public.sales_stages where code = 'meeting'), 'up') $$, 'Αλλαγή σειράς');
select ok(
  (select m.sort < f.sort from public.sales_stages m, public.sales_stages f where m.code = 'meeting' and f.code = 'first_contact'),
  'Η «Συνάντηση» πήγε πριν την «Πρώτη επαφή»'
);

select throws_ok($$ update public.sales_sources set retired_at = now() where code = 'web' $$, 'P0001', null, 'Η Πηγή «Ιστοσελίδα» δεν αποσύρεται');
select throws_ok($$ delete from public.sales_sources where code = 'web' $$, 'P0001', null, 'Η Πηγή «Ιστοσελίδα» δεν διαγράφεται');
select throws_ok($$ delete from public.sales_loss_reasons where code = 'price' $$, 'P0001', null, 'Λόγος απώλειας σε χρήση δεν διαγράφεται');
select lives_ok($$ update public.sales_loss_reasons set retired_at = now() where code = 'price' $$, 'Λόγος απώλειας σε χρήση αποσύρεται');
select is(
  (select l.label from public.opportunities o join public.sales_loss_reasons l on l.id = o.loss_reason_id
    where o.id = (current_setting('t.r6')::jsonb ->> 'opportunity_id')::uuid),
  'Τιμή', 'Η κλεισμένη Ευκαιρία κρατά τον αποσυρμένο Λόγο'
);
select lives_ok($$ update public.sales_loss_reasons set retired_at = null where code = 'price' $$, 'Επανενεργοποίηση τιμής');
select lives_ok($$ delete from public.sales_activity_kinds where code = 'email' $$, 'Είδος Δραστηριότητας που δεν χρησιμοποιήθηκε διαγράφεται');

-- Τιμή που προσθέτει Χρήστης της εφαρμογής δεν γίνεται «του συστήματος», ούτε γεννιέται αποσυρμένη ή με αναγνωριστικό.
select lives_ok(
  $$ insert into public.sales_sources (label, sort, code, is_system, retired_at) values ('Εκδήλωση', 90, 'hack', true, now()) $$,
  'Η Διαχείριση προσθέτει Πηγή'
);
select is(
  (select is_system::text || ':' || coalesce(code, 'null') || ':' || (retired_at is null)::text from public.sales_sources where label = 'Εκδήλωση'),
  'false:null:true', 'Η νέα Πηγή δεν είναι του συστήματος, δεν έχει αναγνωριστικό και είναι ενεργή'
);

-- Η λίστα δεν μένει χωρίς ενεργή τιμή ούτε με διαγραφή (όπως δεν μένει με απόσυρση).
select lives_ok($$ update public.sales_activity_kinds set retired_at = now() where code = 'call' $$, 'Απόσυρση είδους που χρησιμοποιήθηκε');
select lives_ok($$ delete from public.sales_activity_kinds where code = 'meeting' $$, 'Διαγραφή είδους που δεν χρησιμοποιήθηκε, όσο υπάρχει άλλο ενεργό');
select throws_ok(
  $$ delete from public.sales_activity_kinds where code = 'note' $$,
  'P0001', null, 'Η τελευταία ενεργή τιμή μιας λίστας δεν διαγράφεται'
);
select lives_ok($$ update public.sales_activity_kinds set retired_at = null where code = 'call' $$, 'Επανενεργοποίηση του είδους');

-- Νέες Ευκαιρίες ξεκινούν από το πρώτο ΕΝΕΡΓΟ Στάδιο.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('t.r9', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b1', null, 'Μετά την απόσυρση',
  (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
select is(
  (select s.code from public.opportunities o join public.sales_stages s on s.id = o.stage_id
    where o.id = (current_setting('t.r9')::jsonb ->> 'opportunity_id')::uuid),
  'meeting', 'Η νέα Ευκαιρία μπαίνει στο πρώτο ενεργό Στάδιο'
);
select throws_ok(
  format($$ select public.sales_log_activity(%L, %L, 'Σε κλεισμένη') $$,
    current_setting('t.r6')::jsonb ->> 'opportunity_id', (select id from public.sales_activity_kinds where code = 'note')),
  'P0001', null, 'Δραστηριότητες γράφονται μόνο σε ανοιχτή Ευκαιρία'
);

-- ───────────── Ίχνος και ανώνυμος ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select ok(
  (select count(*) >= 1 from public.audit_log where entity = 'sales_stages' and action = 'update'
     and after ->> 'label' = 'Διαπραγμάτευση 2' and before ->> 'label' = 'Διαπραγμάτευση'),
  'Η μετονομασία γράφεται στο Ίχνος με το πριν και το μετά'
);
select ok((select count(*) >= 1 from public.audit_log where entity = 'clients' and action = 'insert'), 'Οι νέοι Πελάτες γράφονται στο Ίχνος');
select is((select count(*)::int from public.sales_client_list() where can_open), 10, 'Ο Ιδιοκτήτης (Εύρος όλα) ανοίγει όλους τους Πελάτες');
select ok((select count(*) from public.opportunities) >= 8, 'Και βλέπει όλες τις Ευκαιρίες');
select ok((select count(*) >= 1 from public.audit_log where entity = 'access_requests' and after ->> 'status' = 'approved'), 'Οι αποφάσεις Αιτημάτων γράφονται στο Ίχνος');
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.clients $$, '42501', null, 'Ο ανώνυμος επισκέπτης δεν διαβάζει Πελάτες');
reset role;

-- ───────────── Κανόνες που ισχύουν για όλους, και για τον service role ─────────────
select throws_ok(
  $$ update public.opportunities set outcome = 'open', closed_at = null, loss_reason_id = null
      where id = (select id from public.opportunities where outcome = 'lost' limit 1) $$,
  'P0001', null, 'Μια χαμένη Ευκαιρία δεν ξανανοίγει ποτέ'
);
select throws_ok(
  $$ update public.opportunities set outcome = 'won', closed_at = now() where id = current_setting('t.f1')::uuid $$,
  'P0001', null, 'Κερδισμένη δεν γίνεται με το χέρι'
);
select throws_ok(
  format($$ insert into public.opportunities (client_id, title, stage_id, source_id, manager_id, outcome, closed_at)
     values ('00000000-0000-0000-0000-0000000000b1', 'Έτοιμη κερδισμένη', %L, %L, '00000000-0000-0000-0000-0000000000a3', 'won', now()) $$,
     (select id from public.sales_stages where code = 'meeting'), (select id from public.sales_sources where code = 'phone')),
  'P0001', null, 'Μια Ευκαιρία δεν γεννιέται κερδισμένη'
);
select set_config('sales.system_close', 'on', true);
select lives_ok(
  $$ update public.opportunities set outcome = 'won', closed_at = now() where id = current_setting('t.f1')::uuid $$,
  'Το σύστημα (η υπογραφή Συμφωνίας) κλείνει ως κερδισμένη'
);
select set_config('sales.system_close', 'off', true);
select throws_ok(
  $$ update public.opportunities set outcome = 'open', closed_at = null where id = current_setting('t.f1')::uuid $$,
  'P0001', null, 'Ούτε η κερδισμένη ξανανοίγει'
);
select throws_ok(
  $$ update public.opportunities set client_id = '00000000-0000-0000-0000-0000000000b1'
      where id = (select id from public.opportunities where outcome = 'open' and client_id <> '00000000-0000-0000-0000-0000000000b1' limit 1) $$,
  'P0001', null, 'Ο Πελάτης μιας Ευκαιρίας δεν αλλάζει'
);
select throws_ok(
  $$ delete from public.opportunity_activities $$,
  'P0001', null, 'Το ιστορικό δέχεται μόνο προσθήκες, και από τον service role'
);

select * from finish();
rollback;
