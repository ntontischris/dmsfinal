-- Κύκλος ζωής Συμφωνίας (b8, b9, b12): Λύση, «Χωρίς συνέχιση», αυτόματη συνέχιση, Ευκαιρία ανανέωσης, υπογεγραμμένο αρχείο.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες είναι σχετικές με το «σήμερα» της Αθήνας.
begin;
select plan(59);

-- ───────────── Χρήστες, Πελάτες, Κατάλογος ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή · e3 Πωλήσεις · e4 Λογιστής (ανάγνωση) · e6 χωρίς ομάδα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Ελένη', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

select set_config('t.today', (now() at time zone 'Europe/Athens')::date::text, true);
select set_config('t.month', date_trunc('month', (now() at time zone 'Europe/Athens')::date)::date::text, true);

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Καφέ Αθηνά', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@athina.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Γυμναστήριο Κίνηση', '', 'Αθήνα', null, 'Νίκος Κίνης', 'nikos@kinisi.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000e1');

insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id, o.client_id, o.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       o.manager_id, 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1'::uuid, '00000000-0000-0000-0000-0000000000f1'::uuid, 'Συνεχές Αθηνά', '00000000-0000-0000-0000-0000000000e3'::uuid),
    ('00000000-0000-0000-0000-0000000000c2'::uuid, '00000000-0000-0000-0000-0000000000f1'::uuid, 'Ανανέωση Αθηνά', '00000000-0000-0000-0000-0000000000e3'::uuid),
    ('00000000-0000-0000-0000-0000000000c3'::uuid, '00000000-0000-0000-0000-0000000000f2'::uuid, 'Λύση Κίνηση', '00000000-0000-0000-0000-0000000000e1'::uuid)
  ) as o (id, client_id, title, manager_id);

insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d1', 1000);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select '00000000-0000-0000-0000-0000000000d1', k.id, 2 from public.provision_kinds k where k.code = 'shoot';

create function public.t_monthly(p_opp uuid, p_title text, p_months integer) returns uuid
language plpgsql
as $$
declare
  v_id uuid := public.agreement_create(p_opp, 'monthly', p_title);
begin
  perform public.agreement_update_basics(v_id, p_title, 'el', current_setting('t.today')::date + 5, null, p_months);
  perform public.agreement_add_catalogue_line(v_id, '00000000-0000-0000-0000-0000000000d1', 1);
  perform public.agreement_set_recipients(v_id, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
  return v_id;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Αυτόματη συνέχιση ─────────────
-- Έναρξη πριν από 3 μήνες, Διάρκεια 2: η λήξη ήταν πριν από 2 μήνες· μία συνέχιση φτάνει ως το τέλος του τρέχοντος μήνα.
select set_config('t.a', public.t_monthly('00000000-0000-0000-0000-0000000000c1', 'Συνεχές Αθηνά', 2)::text, true);
update public.agreements set renewal = 'auto' where id = current_setting('t.a')::uuid;
select public.agreement_sign_outside(current_setting('t.a')::uuid, current_setting('t.today')::date, 'Μαρία Παπαδάκη',
  (current_setting('t.month')::date - interval '3 months')::date, 'contract-a.pdf');
select set_config('t.a_prod', (select count(*)::text from public.productions p where p.agreement_id = current_setting('t.a')::uuid), true);

select is(public.agreement_lifecycle_view(current_setting('t.a')::uuid)->>'state', 'active',
  'Με αυτόματη συνέχιση η Συμφωνία μένει ενεργή και μετά τη λήξη');
select ok(public.agreements_run(current_setting('t.today')::date) >= 1, 'Η καθημερινή δουλειά τρέχει');
select is((select a.end_on from public.agreements a where a.id = current_setting('t.a')::uuid),
  (current_setting('t.month')::date + interval '1 month')::date - 1,
  'Η συνέχιση προσθέτει μία Διάρκεια από την επόμενη μέρα της λήξης');
select is((select max(p.n) from public.agreement_periods p where p.agreement_id = current_setting('t.a')::uuid), 4,
  'Οι νέες Περίοδοι συνεχίζουν την αρίθμηση');
select is((select count(*)::int from public.productions p where p.agreement_id = current_setting('t.a')::uuid),
  current_setting('t.a_prod')::int + 2, 'Κάθε νέα Περίοδος έχει την Παραγωγή της');
select is((select count(*)::int from public.agreement_period_provisions pp join public.agreement_periods p on p.id = pp.period_id
            where p.agreement_id = current_setting('t.a')::uuid and p.n > 2), 2, 'Οι νέες Περίοδοι δίνουν Παροχές');
select is(public.agreements_run(current_setting('t.today')::date) >= 0 and
  (select a.end_on from public.agreements a where a.id = current_setting('t.a')::uuid)
    = (current_setting('t.month')::date + interval '1 month')::date - 1, true,
  'Δεύτερη εκτέλεση την ίδια μέρα δεν ξανασυνεχίζει');

-- «Χωρίς συνέχιση»: στη λήξη λήγει.
select public.agreement_set_continuation(current_setting('t.a')::uuid, false, 'Ο πελάτης σταματά');
select is(public.agreement_lifecycle_view(current_setting('t.a')::uuid)->'noContinuation'->>'byName', 'Γιώργος',
  'Το «Χωρίς συνέχιση» φαίνεται με το όνομα');
set session_replication_role = replica;
update public.agreements set end_on = current_setting('t.today')::date - 1 where id = current_setting('t.a')::uuid;
reset session_replication_role;
select public.agreements_run(current_setting('t.today')::date);
select is((select a.end_on from public.agreements a where a.id = current_setting('t.a')::uuid),
  current_setting('t.today')::date - 1, 'Με «Χωρίς συνέχιση» η Συμφωνία δεν συνεχίζει');
select is(public.agreement_lifecycle_view(current_setting('t.a')::uuid)->>'state', 'expired', 'Με «Χωρίς συνέχιση» λήγει');
select throws_ok(
  format($$ select public.agreement_set_continuation(%L, true, null) $$, current_setting('t.a')),
  'P0001', null, 'Η συνέχιση δεν αλλάζει σε Συμφωνία που έληξε');

-- «Ανανέωση τώρα» από τις Πωλήσεις, σε Συμφωνία που έληξε.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select set_config('t.ar', public.agreement_renew(current_setting('t.a')::uuid)->>'opportunityId', true);
reset role;
select is((select o.manager_id from public.opportunities o where o.id = current_setting('t.ar')::uuid),
  '00000000-0000-0000-0000-0000000000e3'::uuid, 'Οι Πωλήσεις ανοίγουν Ευκαιρία ανανέωσης με τον ίδιο Υπεύθυνο');
select is((select a.start_on from public.agreements a join public.agreement_renewals r on r.renewal_agreement_id = a.id
            where r.opportunity_id = current_setting('t.ar')::uuid), null::date,
  'Πρόταση ανανέωσης για Συμφωνία που έληξε: η Έναρξη μένει ανοιχτή');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Ευκαιρία ανανέωσης Ν μέρες πριν από τη λήξη ─────────────
-- Διάρκεια 1 από σήμερα: λήγει σε λιγότερες από 30 μέρες (η προεπιλογή).
select set_config('t.r', public.t_monthly('00000000-0000-0000-0000-0000000000c2', 'Ανανέωση Αθηνά', 1)::text, true);
select public.agreement_sign_outside(current_setting('t.r')::uuid, current_setting('t.today')::date, 'Μαρία Παπαδάκη',
  current_setting('t.today')::date, 'contract-r.pdf');
update public.catalogue_item_amounts set price = 1100 where item_id = '00000000-0000-0000-0000-0000000000d1';

select public.agreements_run(current_setting('t.today')::date);
select is((select count(*)::int from public.agreement_renewals r where r.agreement_id = current_setting('t.r')::uuid), 1,
  'Πριν από τη λήξη ανοίγει μία Ευκαιρία ανανέωσης');
select set_config('t.rn', (select r.renewal_agreement_id::text from public.agreement_renewals r
                            where r.agreement_id = current_setting('t.r')::uuid), true);
select is((select o.title || ' · ' || o.outcome || ' · ' || o.client_id from public.opportunities o
            join public.agreement_renewals r on r.opportunity_id = o.id where r.agreement_id = current_setting('t.r')::uuid),
  'Ανανέωση · Ανανέωση Αθηνά · open · 00000000-0000-0000-0000-0000000000f1', 'Η Ευκαιρία ανανέωσης είναι ανοιχτή, στον ίδιο Πελάτη');
select is((select a.state || '/' || a.path from public.agreements a where a.id = current_setting('t.rn')::uuid), 'proposal/draft',
  'Η πρόταση ανανέωσης είναι σε Σύνταξη');
select is((select la.unit_price from public.agreement_line_amounts la join public.agreement_lines l on l.id = la.line_id
            where l.agreement_id = current_setting('t.rn')::uuid), 1100::numeric, 'Η πρόταση ανανέωσης παίρνει την τρέχουσα τιμή Καταλόγου');
select is((select a.start_on from public.agreements a where a.id = current_setting('t.rn')::uuid),
  (select a.end_on + 1 from public.agreements a where a.id = current_setting('t.r')::uuid), 'Η ανανέωση αρχίζει την επόμενη μέρα της λήξης');
select is((select r.is_automatic from public.agreement_renewals r where r.agreement_id = current_setting('t.r')::uuid), true,
  'Η Ευκαιρία σημειώνεται αυτόματη');
select public.agreements_run(current_setting('t.today')::date);
select is((select count(*)::int from public.agreement_renewals r where r.agreement_id = current_setting('t.r')::uuid), 1,
  'Δεύτερη εκτέλεση δεν ανοίγει δεύτερη Ευκαιρία');
select throws_ok(
  format($$ select public.agreement_renew(%L) $$, current_setting('t.r')),
  'P0001', 'Υπάρχει ήδη ανοιχτή Ευκαιρία ανανέωσης', 'Μία ανοιχτή Ευκαιρία ανανέωσης τη φορά');
select is((public.agreement_lifecycle_view(current_setting('t.r')::uuid)->'can'->>'renew')::boolean, false,
  'Η σελίδα δεν δείχνει «Ανανέωση» όσο υπάρχει ανοιχτή Ευκαιρία');
select is(jsonb_array_length(public.agreement_lifecycle_view(current_setting('t.r')::uuid)->'renewals'), 1,
  'Η σελίδα δείχνει την Ευκαιρία ανανέωσης');

-- Οι Πωλήσεις βλέπουν, αλλά δεν λύνουν ούτε ανεβάζουν αρχείο.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select is((public.agreement_lifecycle_view(current_setting('t.r')::uuid)->'can'->>'dissolve')::boolean, false,
  'Οι Πωλήσεις δεν βλέπουν «Λύση»');
select throws_ok(
  format($$ select public.agreement_dissolve(%L, %L::date, 'Τέλος') $$, current_setting('t.r'), current_setting('t.today')),
  '42501', null, 'Οι Πωλήσεις δεν λύνουν Συμφωνία');
select throws_ok(
  format($$ select public.agreement_set_continuation(%L, false, null) $$, current_setting('t.r')),
  '42501', null, 'Οι Πωλήσεις δεν αλλάζουν τη συνέχιση');
select throws_ok(
  format($$ select public.agreement_signed_file_slot(%L, 'pdf') $$, current_setting('t.r')),
  '42501', null, 'Οι Πωλήσεις δεν ανεβάζουν υπογεγραμμένο αρχείο');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Λύση ─────────────
-- Διάρκεια 3 από την 1η του μήνα: τρεις Περίοδοι, τρεις Παραγωγές.
select set_config('t.d', public.t_monthly('00000000-0000-0000-0000-0000000000c3', 'Λύση Κίνηση', 3)::text, true);
select public.agreement_sign_outside(current_setting('t.d')::uuid, current_setting('t.today')::date, 'Νίκος Κίνης',
  current_setting('t.month')::date, 'contract-d.pdf');

select throws_ok(
  format($$ select public.agreement_dissolve(%L, %L::date, '  ') $$, current_setting('t.d'), current_setting('t.today')),
  'P0001', 'Η Λύση θέλει λόγο', 'Η Λύση θέλει λόγο');
select throws_ok(
  format($$ select public.agreement_dissolve(%L, %L::date, 'Τέλος') $$, current_setting('t.d'),
    (current_setting('t.month')::date + interval '3 months')::date),
  'P0001', null, 'Λύση μετά τη λήξη δεν μπαίνει');
select throws_ok(
  format($$ select public.agreement_dissolve(%L, %L::date, 'Τέλος') $$, current_setting('t.d'),
    current_setting('t.month')::date - 1),
  'P0001', 'Η Λύση δεν μπαίνει πριν από την Έναρξη', 'Λύση πριν από την Έναρξη δεν μπαίνει');

-- Μελλοντική Λύση: μέχρι τότε ενεργή, και ακυρώνεται.
select public.agreement_dissolve(current_setting('t.d')::uuid,
  (current_setting('t.month')::date + interval '1 month')::date + 4, 'Ο πελάτης μετακομίζει');
select is(public.agreement_lifecycle_view(current_setting('t.d')::uuid)->>'state', 'active', 'Με μελλοντική Λύση μένει ενεργή');
select is((public.agreement_lifecycle_view(current_setting('t.d')::uuid)->'can'->>'cancelDissolution')::boolean, true,
  'Η μελλοντική Λύση ακυρώνεται');
select throws_ok(
  format($$ select public.agreement_dissolve(%L, %L::date, 'Ξανά') $$, current_setting('t.d'), current_setting('t.today')),
  'P0001', 'Η Λύση έχει ήδη καταχωριστεί', 'Δεύτερη Λύση δεν μπαίνει');
select public.agreement_cancel_dissolution(current_setting('t.d')::uuid);
select is(public.agreement_lifecycle_view(current_setting('t.d')::uuid)->'dissolution', 'null'::jsonb, 'Η Λύση ακυρώθηκε');

-- Λύση σήμερα: λύνεται τώρα και ακυρώνονται οι Παραγωγές που δεν άρχισαν.
select public.agreement_dissolve(current_setting('t.d')::uuid, current_setting('t.today')::date, 'Ο πελάτης σταματά');
select is((select a.state from public.agreements a where a.id = current_setting('t.d')::uuid), 'dissolved', 'Η Λύση σήμερα λύνει τη Συμφωνία');
select is((select count(*)::int from public.productions p where p.agreement_id = current_setting('t.d')::uuid
            and p.state = 'cancelled' and p.cancelled_reason = 'Λύση Συμφωνίας'), 2,
  'Οι Παραγωγές των Περιόδων μετά τη Λύση ακυρώνονται');
select is((select count(*)::int from public.productions p where p.agreement_id = current_setting('t.d')::uuid
            and p.state <> 'cancelled'), 1, 'Η Παραγωγή της τρέχουσας Περιόδου μένει');
select throws_ok(
  format($$ select public.agreement_cancel_dissolution(%L) $$, current_setting('t.d')),
  'P0001', null, 'Λύση που έγινε δεν ακυρώνεται');
select public.billables_generate();
select is((select count(*)::int from public.billables b where b.agreement_id = current_setting('t.d')::uuid and b.reason = 'period'), 1,
  'Η Λυμένη Συμφωνία χρεώνει μόνο την Περίοδο έως τη Λύση');

-- ───────────── Υπογεγραμμένο αρχείο ─────────────
select throws_ok(
  format($$ select public.agreement_signed_file_slot(%L, 'exe') $$, current_setting('t.d')),
  'P0001', 'Ανέβασε PDF, JPG ή PNG', 'Μόνο PDF, JPG ή PNG');
select set_config('t.f1', public.agreement_signed_file_slot(current_setting('t.d')::uuid, 'pdf'), true);
select ok(current_setting('t.f1') like current_setting('t.d') || '/%.pdf', 'Η θέση του αρχείου είναι μέσα στη Συμφωνία');
select throws_ok(
  format($$ select public.agreement_signed_file_attach(%L, %L, 'x.pdf', 'application/pdf', 100) $$,
    current_setting('t.d'), current_setting('t.r') || '/x.pdf'),
  'P0001', null, 'Αρχείο άλλης Συμφωνίας δεν καταχωρείται');
select is(public.agreement_signed_file_attach(current_setting('t.d')::uuid, current_setting('t.f1'), 'Σύμβαση.pdf', 'application/pdf', 1000),
  null, 'Το πρώτο αρχείο καταχωρείται');
select set_config('t.f2', public.agreement_signed_file_slot(current_setting('t.d')::uuid, 'png'), true);
select is(public.agreement_signed_file_attach(current_setting('t.d')::uuid, current_setting('t.f2'), 'Σύμβαση.png', 'image/png', 2000),
  current_setting('t.f1'), 'Η αντικατάσταση επιστρέφει το παλιό αρχείο για σβήσιμο');
select is(public.agreement_lifecycle_view(current_setting('t.d')::uuid)->'signedFile'->>'name', 'Σύμβαση.png',
  'Η σελίδα δείχνει το υπογεγραμμένο αρχείο');
select throws_ok(
  format($$ select public.agreement_signed_file_slot(%L, 'pdf') $$, current_setting('t.rn')),
  '42501', null, 'Πρόταση που δεν υπογράφηκε δεν παίρνει υπογεγραμμένο αρχείο');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
set local role authenticated;
select is(public.agreement_signed_file_path(current_setting('t.d')::uuid), current_setting('t.f2'), 'Ο Λογιστής κατεβάζει το αρχείο');
select throws_ok(
  format($$ select public.agreement_signed_file_slot(%L, 'pdf') $$, current_setting('t.d')),
  '42501', null, 'Ο Λογιστής δεν ανεβάζει αρχείο');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  format($$ select public.agreement_signed_file_path(%L) $$, current_setting('t.d')),
  '42501', null, 'Η Παραγωγή δεν κατεβάζει το αρχείο της Συμφωνίας');
select is(public.agreement_lifecycle_view(current_setting('t.d')::uuid), null, 'Η Παραγωγή δεν βλέπει τον κύκλο ζωής');
reset role;

-- ───────────── Κλειστοί πίνακες και άρνηση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select count(*) from public.agreement_endings $$, '42501', null, 'Οι Λύσεις δεν διαβάζονται απευθείας');
select throws_ok($$ select count(*) from public.agreement_renewals $$, '42501', null, 'Οι ανανεώσεις δεν διαβάζονται απευθείας');
select throws_ok($$ select count(*) from public.agreement_signed_files $$, '42501', null, 'Τα αρχεία δεν διαβάζονται απευθείας');
select throws_ok(
  format($$ select public.agreements_run(%L::date) $$, current_setting('t.today')),
  '42501', null, 'Η καθημερινή δουλειά δεν τρέχει από την εφαρμογή');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  format($$ select public.agreement_dissolve(%L, %L::date, 'Τέλος') $$, current_setting('t.r'), current_setting('t.today')),
  '42501', null, 'Χρήστης χωρίς ομάδα δεν λύνει Συμφωνία');
reset role;

set local role anon;
select throws_ok(
  format($$ select public.agreement_lifecycle_view(%L) $$, current_setting('t.r')),
  '42501', null, 'Ο ανώνυμος δεν διαβάζει τον κύκλο ζωής');
reset role;

-- ───────────── Ρύθμιση: μέρες πριν από τη λήξη ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.agreements_save_renewal_lead(0) $$, 'P0001', null, 'Οι μέρες είναι από 1 έως 365');
select public.agreements_save_renewal_lead(45);
select is((select d.renewal_lead_days from public.agreements_defaults_view() d), 45, 'Ο Ιδιοκτήτης αλλάζει τις μέρες πριν από τη λήξη');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.agreements_save_renewal_lead(20) $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν τη ρύθμιση');
reset role;

select * from finish();
rollback;
