-- Κανόνες Γυρισμάτων σε εκτέλεση (χωρίς απάντηση, «έγινε» αυτόματα), στοιχεία χώρου, κατάσταση Google και χρέωση στη
-- σελίδα Γυρίσματος (L2: c6, c7, c9). Φανταστικοί Χρήστες και στοιχεία· όλα μέσα στη συναλλαγή.
begin;
select plan(43);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή · e3 Πωλήσεις · e4 μέλος ομάδας χωρίς Ρόλο (μοντέρ) · e5 Διαχείριση · e6 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'maria@kypseli.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Λίνα', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'manager@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e5', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο καφέ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d1', 1000);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

select public.t_as('e1');
select set_config('t.today', ((now() at time zone 'Europe/Athens')::date)::text, true);
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο καφέ')::text, true);
select public.agreement_update_basics(current_setting('t.a1')::uuid, 'Μηνιαίο καφέ', 'el', current_setting('t.today')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a1')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a1')::uuid, current_setting('t.today')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');
select set_config('t.pa1', (select pr.id::text from public.productions pr
                              join public.agreement_periods pe on pe.id = pr.period_id
                             where pe.agreement_id = current_setting('t.a1')::uuid and pe.n = 1), true);
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2');
select set_config('t.pi', public.production_create_internal('Showreel τεστ', '00000000-0000-0000-0000-0000000000e1')::text, true);
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

-- Ώρα Ελλάδας: η μέρα «σήμερα + n» στις «hh:mm».
create function public.t_at(p_days integer, p_time time) returns timestamptz
language sql stable
as $$ select (((now() at time zone 'Europe/Athens')::date + p_days) + p_time) at time zone 'Europe/Athens'; $$;
-- Πόσα αυτόματα γεγονότα ενός είδους έγραψε το Ίχνος για ένα Γύρισμα.
create function public.t_events(p_filming text, p_event text) returns bigint
language sql stable
as $$ select count(*) from public.audit_log l where l.entity = 'filmings' and l.entity_id = p_filming
          and l.action = 'event' and l.after ->> 'event' = p_event and coalesce((l.after ->> 'auto')::boolean, false); $$;

-- Γυρίσματα (Εσωτερική Παραγωγή): a1, a2 αναμένουν · a3 χθες, προγραμματισμένο · a4 σήμερα νωρίς, προγραμματισμένο.
-- a5 του Πελάτη f1: έξτρα, έγινε πριν δύο μέρες.
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000a1', current_setting('t.pi')::uuid, public.t_at(3, '10:00'), 2, 'team', 'pending'),
  ('00000000-0000-0000-0000-0000000000a2', current_setting('t.pi')::uuid, public.t_at(4, '10:00'), 2, 'team', 'pending'),
  ('00000000-0000-0000-0000-0000000000a3', current_setting('t.pi')::uuid, public.t_at(-1, '10:00'), 2.5, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000a4', current_setting('t.pi')::uuid, public.t_at(0, '00:30'), 1, 'team', 'scheduled');
insert into public.filmings (id, production_id, client_id, kind_id, starts_at, hours, origin, state, is_extra, done_at, actual_hours)
values ('00000000-0000-0000-0000-0000000000a5', current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000f1',
        (select k.id from public.provision_kinds k where k.code = 'shoot'), public.t_at(-2, '10:00'), 2, 'team', 'done',
        true, now(), 2);

-- ───────────── Κανόνες: μόνο το service role ─────────────
set local role authenticated;
select throws_ok($$ select public.filming_rules_apply(now()) $$, '42501', null, 'Χρήστης δεν τρέχει τους Κανόνες');
reset role;

select is(public.filming_rules_apply(now() + interval '48 hours'), '{"approved":0,"rejected":0,"done":0}'::jsonb,
  'Με τους προεπιλεγμένους Κανόνες τίποτα δεν αλλάζει');
select is((select state from public.filmings where id = '00000000-0000-0000-0000-0000000000a3'), 'scheduled',
  'Με «έγινε» με το χέρι το χθεσινό μένει προγραμματισμένο');

-- ───────────── Χωρίς απάντηση: έγκριση ─────────────
update public.filming_settings set no_answer_action = 'approve', no_answer_hours = 24 where id;
select is(public.filming_rules_apply(now() + interval '23 hours') ->> 'approved', '0', 'Πριν τις 24 ώρες δεν εγκρίνεται');
update public.filmings set state = 'rejected', rejected_at = now(), rejected_reason = 'Εκτός τεστ'
 where id = '00000000-0000-0000-0000-0000000000a2';
select is(public.filming_rules_apply(now() + interval '25 hours') ->> 'approved', '1', 'Μετά τις 24 ώρες εγκρίνεται');
select is((select state from public.filmings where id = '00000000-0000-0000-0000-0000000000a1'), 'scheduled',
  'Το αναμένον έγινε προγραμματισμένο');
select is(public.t_events('00000000-0000-0000-0000-0000000000a1', 'approved'), 1::bigint, 'Το Ίχνος γράφει αυτόματη έγκριση');
select is(public.filming_rules_apply(now() + interval '25 hours') ->> 'approved', '0', 'Δεύτερη εκτέλεση: τίποτα νέο');

-- ───────────── Χωρίς απάντηση: απόρριψη ─────────────
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000a6', current_setting('t.pi')::uuid, public.t_at(5, '10:00'), 1, 'team', 'pending');
update public.filming_settings set no_answer_action = 'reject', no_answer_hours = 2 where id;
select is(public.filming_rules_apply(now() + interval '1 hour') ->> 'rejected', '0', 'Πριν τις 2 ώρες δεν απορρίπτεται');
select is(public.filming_rules_apply(now() + interval '3 hours') ->> 'rejected', '1', 'Μετά τις 2 ώρες απορρίπτεται');
select is((select rejected_reason from public.filmings where id = '00000000-0000-0000-0000-0000000000a6'),
  'Αυτόματα: χωρίς απάντηση σε 2 ώρες', 'Ο λόγος λέει ότι έγινε αυτόματα');
select is(public.t_events('00000000-0000-0000-0000-0000000000a6', 'rejected'), 1::bigint, 'Το Ίχνος γράφει αυτόματη απόρριψη');

-- ───────────── «Έγινε» αυτόματα ─────────────
update public.filming_settings set no_answer_action = 'none', done_marking = 'auto' where id;
select is(public.filming_rules_apply(now()) ->> 'done', '1', 'Κλείνει μόνο το χθεσινό');
select is((select state || ':' || actual_hours from public.filmings where id = '00000000-0000-0000-0000-0000000000a3'),
  'done:2.5', 'Έγινε με τις προγραμματισμένες ώρες');
select is((select state from public.filmings where id = '00000000-0000-0000-0000-0000000000a4'), 'scheduled',
  'Το σημερινό περιμένει να περάσει η μέρα');
select is((select state from public.filmings where id = '00000000-0000-0000-0000-0000000000a1'), 'scheduled',
  'Το μελλοντικό δεν αγγίζεται');
select is(public.t_events('00000000-0000-0000-0000-0000000000a3', 'done'), 1::bigint, 'Το Ίχνος γράφει αυτόματο «έγινε»');
select is(public.filming_rules_apply(now() + interval '1 day') ->> 'done', '1', 'Την επόμενη μέρα κλείνει και το σημερινό');

-- Αναίρεση με το χέρι: δεν ξανακλείνει αυτόματα.
select public.t_as('e1');
select lives_ok($$ select public.filming_undo_outcome('00000000-0000-0000-0000-0000000000a3', 'Δεν έγινε τελικά') $$,
  'Ο Ιδιοκτήτης αναιρεί το αυτόματο «έγινε»');
select is(public.filming_rules_apply(now() + interval '2 days') ->> 'done', '0', 'Το αναιρεμένο δεν ξανακλείνει αυτόματα');
select is((select state from public.filmings where id = '00000000-0000-0000-0000-0000000000a3'), 'scheduled',
  'Μένει προγραμματισμένο για απόφαση με το χέρι');
update public.filming_settings set done_marking = 'manual' where id;

-- ───────────── Στοιχεία χώρου ─────────────
set local role authenticated;
select lives_ok($$ select public.filming_details_save('00000000-0000-0000-0000-0000000000a1', ' Ελένη ', '210 0000000',
  'https://drive.example.com/folder/123') $$, 'Ο Ιδιοκτήτης γράφει επαφή, τηλέφωνο και σύνδεσμο');
select is((public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'details') - 'updatedAt',
  '{"contactName":"Ελένη","contactPhone":"210 0000000","filesUrl":"https://drive.example.com/folder/123"}'::jsonb,
  'Η σελίδα δείχνει τα στοιχεία χώρου');
select throws_ok($$ select public.filming_details_save('00000000-0000-0000-0000-0000000000a1', null, null, 'ftp://x') $$,
  'P0001', 'Ο σύνδεσμος αρχείων πρέπει να ξεκινά με https://', 'Μόνο σύνδεσμος https');
select lives_ok($$ select public.filming_details_save('00000000-0000-0000-0000-0000000000a5', null, null,
  'https://drive.example.com/done') $$, 'Ο σύνδεσμος αρχείων μπαίνει και σε κλεισμένο Γύρισμα');
select is(public.filming_view('00000000-0000-0000-0000-0000000000a5') -> 'team' -> 'details' ->> 'filesUrl',
  'https://drive.example.com/done', 'Το κλεισμένο Γύρισμα δείχνει τον σύνδεσμο');
select lives_ok($$ select public.filming_details_save('00000000-0000-0000-0000-0000000000a1', '', null, null) $$,
  'Κενά πεδία σβήνουν τα στοιχεία');
select is(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'details' ->> 'contactName', null,
  'Η επαφή σβήστηκε');
select is((public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' ->> 'canEditDetails')::boolean, true,
  'Ο Ιδιοκτήτης μπορεί να τα αλλάξει');
reset role;

-- Αρνήσεις: μέλος ομάδας χωρίς Ρόλο, Πελάτης, ανάγνωση του πίνακα.
select public.t_as('e4');
set local role authenticated;
select throws_ok($$ select public.filming_details_save('00000000-0000-0000-0000-0000000000a1', 'Χ', null, null) $$,
  '42501', null, 'Μέλος χωρίς Ρόλο δεν γράφει στοιχεία χώρου');
select throws_ok($$ select * from public.filming_details $$, '42501', null, 'Ο πίνακας είναι κλειστός');
reset role;
select public.t_as('e6');
set local role authenticated;
select throws_ok($$ select public.filming_details_save('00000000-0000-0000-0000-0000000000a5', 'Χ', null, null) $$,
  '42501', null, 'Ο Πελάτης δεν γράφει στοιχεία χώρου');
select is(public.filming_view('00000000-0000-0000-0000-0000000000a5') -> 'team', 'null'::jsonb,
  'Ο Πελάτης δεν βλέπει τα στοιχεία της ομάδας');
reset role;

-- ───────────── Google ─────────────
select public.t_as('e1');
set local role authenticated;
select is(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'google' ->> 'state', 'off',
  'Χωρίς ημερολόγιο Google: off');
reset role;
update public.google_calendar set calendar_id = 'team@example.com' where id;
insert into public.google_outbox (entity, entity_id, op) values ('filming', '00000000-0000-0000-0000-0000000000a1', 'upsert');
set local role authenticated;
select is(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'google' ->> 'state', 'queued',
  'Στην ουρά: queued');
reset role;
update public.google_outbox set attempts = 2, last_error = 'Google 503'
 where entity_id = '00000000-0000-0000-0000-0000000000a1' and done_at is null;
set local role authenticated;
select is((public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'google') - 'at',
  '{"state":"error","error":"Google 503"}'::jsonb, 'Αποτυχία: error με το μήνυμα');
reset role;
update public.google_outbox set done_at = now() where entity_id = '00000000-0000-0000-0000-0000000000a1';
insert into public.google_links (entity, entity_id, event_id) values ('filming', '00000000-0000-0000-0000-0000000000a1', 'ev1');
set local role authenticated;
select is(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'google' ->> 'state', 'synced',
  'Γραμμένο στο Google: synced');
select is(public.filming_view('00000000-0000-0000-0000-0000000000a4') -> 'team' -> 'google' ->> 'state', 'none',
  'Χωρίς εγγραφή στο Google: none');

-- ───────────── Χρέωση ─────────────
select is(public.filming_view('00000000-0000-0000-0000-0000000000a5') -> 'team' -> 'outcome' ->> 'billable', 'none',
  'Χωρίς Τιμολογητέο: none');
select is((public.filming_view('00000000-0000-0000-0000-0000000000a5') -> 'team' -> 'outcome' ->> 'noShowBurns')::boolean, true,
  'Η Συμφωνία καίει την Παροχή στο «δεν έγινε»');
select is((public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'outcome' ->> 'noShowBurns')::boolean, false,
  'Εσωτερικό Γύρισμα: δεν καίγεται Παροχή');
select is((public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'team' -> 'outcome' ->> 'extraBillable')::boolean, false,
  'Εσωτερικό Γύρισμα: δεν βγάζει Τιμολογητέο');
reset role;
insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
values ('00000000-0000-0000-0000-0000000000f1', current_setting('t.a1')::uuid, 'extra_filming',
        '00000000-0000-0000-0000-0000000000a5', 'Έξτρα Γύρισμα (τεστ)', current_setting('t.today')::date, 100);
set local role authenticated;
select is(public.filming_view('00000000-0000-0000-0000-0000000000a5') -> 'team' -> 'outcome' ->> 'billable', 'pending',
  'Τιμολογητέο που δεν τιμολογήθηκε: pending');
reset role;

select * from finish();
rollback;
