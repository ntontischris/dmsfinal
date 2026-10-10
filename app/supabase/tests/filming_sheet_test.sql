-- Δελτίο γυρίσματος (C2γ, #136): στιγμιότυπο, λήψεις, εκδόσεις, Συνεργείο με έκδοση στις απαντήσεις, email.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες σταθερές (Ιανουάριος 2027, Ώρα Ελλάδας)
-- ώστε το τεστ να περνά οποιαδήποτε μέρα τρέξει. Γύρισματα εσωτερικής Παραγωγής (χωρίς Συμφωνία).
begin;
select plan(63);

-- ───────────── Βοηθητικά ─────────────
create function public.t_as(p_user uuid) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Συνεργείο (filming.crew και filming.view, όλα) · e4 Λογιστής (μέλος χωρίς Δικαίωμα Συνεργείου)
-- e6 Πελάτης (χωρίς Χρήστη ομάδας) · e7 μέλος Συνεργείου χωρίς ρόλο · e8 Χρήστης ομάδας χωρίς ρόλο και εκτός Συνεργείου
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'outsider@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Νίκος', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'Μαρία', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'Άκης', 'outsider@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e4', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.roles (name, kind) values ('Συνεργείο τεστ', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, p.perm, 'all'
  from public.roles r
  cross join (values ('filming.crew'), ('filming.view')) as p (perm)
 where r.name = 'Συνεργείο τεστ';
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e2', r.id from public.roles r where r.name = 'Συνεργείο τεστ';

-- ───────────── Παραγωγή και Γυρίσματα ─────────────
-- a1: Συνεργείο e7 + e4, ανοιχτό. a2: χωρίς Συνεργείο. a3: κλεισμένο (done) με e7. a4: e7 επιβεβαίωσε, χωρίς έκδοση.
insert into public.productions (id, title, owner_id)
values ('00000000-0000-0000-0000-0000000000b1', 'Εσωτερική Παραγωγή', '00000000-0000-0000-0000-0000000000e1');
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', timestamptz '2027-01-05 09:00:00+02', 2, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b1', timestamptz '2027-01-06 10:00:00+02', 2, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b1', timestamptz '2027-01-07 09:00:00+02', 2, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000b1', timestamptz '2027-01-08 09:00:00+02', 2, 'team', 'scheduled');
insert into public.filming_crew (filming_id, user_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e7'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e4'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e7');
insert into public.filming_crew (filming_id, user_id, response, responded_at) values
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000e7', 'confirmed', now());
update public.filmings set state = 'done', done_at = now(), actual_hours = 2
 where id = '00000000-0000-0000-0000-0000000000a3';

-- ───────────── Δικαιώματα: 42501 ─────────────
set local role anon;
select throws_ok($$ select public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το Δελτίο');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', '[]'::jsonb, null) $$, '42501', null, 'Ο ανώνυμος δεν αποθηκεύει το Δελτίο');
select throws_ok($$ select public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a1', null) $$, '42501', null, 'Ο ανώνυμος δεν εκδίδει το Δελτίο');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e6');
set local role authenticated;
select throws_ok($$ select public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο πελάτης δεν βλέπει το Δελτίο');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e8');
set local role authenticated;
select throws_ok($$ select public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χρήστης ομάδας εκτός Συνεργείου δεν βλέπει το Δελτίο');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', '[]'::jsonb, null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χρήστης ομάδας εκτός Συνεργείου δεν αποθηκεύει το Δελτίο');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e4');
set local role authenticated;
select lives_ok($$ select public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') $$, 'Μέλος του Συνεργείου χωρίς Δικαίωμα βλέπει το Δελτίο');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') ->> 'canEdit', 'false', 'Μέλος χωρίς Δικαίωμα δεν επεξεργάζεται το Δελτίο');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', '[]'::jsonb, null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Μέλος χωρίς Δικαίωμα δεν αποθηκεύει το Δελτίο');
select throws_ok($$ select public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a1', null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Μέλος χωρίς Δικαίωμα δεν εκδίδει το Δελτίο');
reset role;

-- ───────────── Κλειστοί πίνακες ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e2');
set local role authenticated;
select throws_ok($$ select count(*) from public.filming_sheets $$, '42501', null, 'Οι λήψεις δεν διαβάζονται απευθείας');
select throws_ok($$ select count(*) from public.filming_sheet_versions $$, '42501', null, 'Οι εκδόσεις δεν διαβάζονται απευθείας');
reset role;

-- ───────────── Λήψεις και σημείωση ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select lives_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1',
  jsonb_build_array(
    jsonb_build_object('text', 'Είσοδος'),
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000000c1', 'text', '  Πάγκος  ')
  ), 'Φέρτε φακούς') $$, 'Η ομάδα αποθηκεύει λήψεις και σημείωση');
select is(jsonb_array_length(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') -> 'shots'), 2, 'Οι λήψεις αποθηκεύονται με τη σειρά τους');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') ->> 'crewNote', 'Φέρτε φακούς', 'Η σημείωση για το Συνεργείο αποθηκεύεται');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') -> 'shots' -> 1 ->> 'text', 'Πάγκος', 'Το κείμενο λήψης κόβεται στα άκρα');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') -> 'shots' -> 1 ->> 'id', '00000000-0000-0000-0000-0000000000c1', 'Το id της λήψης μένει');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', jsonb_build_array(jsonb_build_object('text', '   ')), null) $$, 'P0001', 'Κάθε λήψη θέλει κείμενο από 1 έως 300 χαρακτήρες', 'Κενή λήψη απορρίπτεται');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', jsonb_build_array(jsonb_build_object('text', repeat('α', 301))), null) $$, 'P0001', 'Κάθε λήψη θέλει κείμενο από 1 έως 300 χαρακτήρες', 'Λήψη πάνω από 300 χαρακτήρες απορρίπτεται');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', (select jsonb_agg(jsonb_build_object('text', 'λήψη')) from generate_series(1, 101)), null) $$, 'P0001', 'Έως 100 λήψεις στο Δελτίο', 'Πάνω από 100 λήψεις απορρίπτονται');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000000c1', 'text', 'α'),
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000000c1', 'text', 'β')), null) $$, 'P0001', 'Κάθε στοιχείο μπαίνει μία φορά', 'Διπλό id λήψης απορρίπτεται');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a1', '[]'::jsonb, repeat('α', 2001)) $$, 'P0001', 'Η σημείωση για το Συνεργείο έχει έως 2000 χαρακτήρες', 'Σημείωση πάνω από 2000 χαρακτήρες απορρίπτεται');
select throws_ok($$ select public.filming_sheet_save('00000000-0000-0000-0000-0000000000a3', '[]'::jsonb, null) $$, 'P0001', 'Το Γύρισμα έχει κλείσει και δεν αλλάζει', 'Κλεισμένο Γύρισμα δεν αποθηκεύεται');

-- ───────────── Έκδοση ─────────────
select throws_ok($$ select public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a2', null) $$, 'P0001', 'Πρόσθεσε Συνεργείο πριν από την έκδοση', 'Χωρίς Συνεργείο δεν εκδίδεται Δελτίο');
select throws_ok($$ select public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a3', 'Αλλαγή') $$, 'P0001', 'Το Γύρισμα έχει κλείσει και δεν αλλάζει', 'Κλεισμένο Γύρισμα δεν εκδίδεται Δελτίο');
select is(public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a1', null), 1, 'Η πρώτη έκδοση δεν θέλει περιγραφή');
select is((select count(*)::int from public.email_outbox where kind = 'sheet_issued' and payload ->> 'filmingId' = '00000000-0000-0000-0000-0000000000a1' and payload ->> 'version' = '1'), 2, 'Η πρώτη έκδοση στέλνει email σε κάθε μέλος του Συνεργείου');
select is((select to_name from public.email_outbox where kind = 'sheet_issued' and to_email = 'crew@example.com'), 'Μαρία', 'Το email της έκδοσης έχει το όνομα του μέλους');
select throws_ok($$ select public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a1', null) $$, 'P0001', 'Γράψε τι άλλαξε', 'Η δεύτερη έκδοση θέλει περιγραφή αλλαγής');
select public.t_as('00000000-0000-0000-0000-0000000000e7');
select lives_ok($$ select public.filming_crew_respond('00000000-0000-0000-0000-0000000000a1', 'confirmed', null) $$, 'Το μέλος επιβεβαιώνει την έκδοση 1');
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select is((select x ->> 'version' from jsonb_array_elements(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'crew') x where x ->> 'userId' = '00000000-0000-0000-0000-0000000000e7'), '1', 'Η απάντηση φέρει την έκδοση στην οποία έγινε');
select is(public.filming_sheet_issue('00000000-0000-0000-0000-0000000000a1', 'Άλλαξε η λήψη'), 2, 'Η δεύτερη έκδοση με περιγραφή βγαίνει');
select is((select x ->> 'response' from jsonb_array_elements(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'crew') x where x ->> 'userId' = '00000000-0000-0000-0000-0000000000e7'), 'pending', 'Η νέα έκδοση μηδενίζει τις απαντήσεις');
select is((select count(*)::int from public.audit_log where entity = 'filmings' and entity_id = '00000000-0000-0000-0000-0000000000a1' and after ->> 'event' = 'sheet_issued'), 2, 'Κάθε έκδοση γράφει γεγονός στο Ίχνος');
select throws_ok($$ update public.filming_sheet_versions set change = 'Αλλαγή' where filming_id = '00000000-0000-0000-0000-0000000000a1' and version = 2 $$, 'P0001', 'Η έκδοση του Δελτίου είναι αμετάβλητη', 'Η έκδοση δεν ενημερώνεται');
select throws_ok($$ delete from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a1' $$, 'P0001', 'Η έκδοση του Δελτίου είναι αμετάβλητη', 'Η έκδοση δεν σβήνεται');

-- ───────────── Χωρίς αλλαγές, και «δεν μπορώ» ─────────────
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') ->> 'hasChanges', 'false', 'Μετά την έκδοση δεν υπάρχουν αλλαγές');
select public.t_as('00000000-0000-0000-0000-0000000000e4');
select throws_ok($$ select public.filming_crew_respond('00000000-0000-0000-0000-0000000000a1', 'declined', null) $$, 'P0001', 'Το «δεν μπορώ» θέλει λόγο', '«Δεν μπορώ» χωρίς λόγο απορρίπτεται');
select lives_ok($$ select public.filming_crew_respond('00000000-0000-0000-0000-0000000000a1', 'declined', 'Αρρώστησα') $$, 'Το μέλος λέει «δεν μπορώ» με λόγο');
select is((select count(*)::int from public.email_outbox where kind = 'crew_declined' and to_email = 'editor@example.com' and payload ->> 'member' = 'Κώστας'), 1, '«Δεν μπορώ» στέλνει email στον εκδότη της τελευταίας έκδοσης');
select public.t_as('00000000-0000-0000-0000-0000000000e7');
select lives_ok($$ select public.filming_crew_respond('00000000-0000-0000-0000-0000000000a1', 'confirmed', null) $$, 'Το μέλος επιβεβαιώνει την έκδοση 2');

-- ───────────── Μετακίνηση με έκδοση και «με το χέρι» ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ select public.filming_reschedule('00000000-0000-0000-0000-0000000000a1', timestamptz '2027-01-05 11:00:00+02', 2) $$, 'Η μετακίνηση με έκδοση και «με το χέρι» περνά');
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select is((select x ->> 'response' from jsonb_array_elements(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'crew') x where x ->> 'userId' = '00000000-0000-0000-0000-0000000000e7'), 'confirmed', 'Η μετακίνηση με έκδοση δεν μηδενίζει τις απαντήσεις');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') ->> 'hasChanges', 'true', 'Μετά τη μετακίνηση υπάρχουν αλλαγές');
select is(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'sheet' ->> 'hasChanges', 'true', 'Το E3 δείχνει ότι υπάρχουν αλλαγές');
select is(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'sheet' ->> 'version', '2', 'Το E3 δείχνει την τρέχουσα έκδοση');

-- ───────────── Αυτόματη έκδοση ─────────────
update public.filming_settings set sheet_sending = 'auto' where id;
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ select public.filming_reschedule('00000000-0000-0000-0000-0000000000a1', timestamptz '2027-01-05 12:00:00+02', 2) $$, 'Με αυτόματη αποστολή, η μετακίνηση περνά');
select is((select count(*)::int from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a1'), 3, 'Με αυτόματη αποστολή η μετακίνηση βγάζει έκδοση 3');
select is((select change from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a1' and version = 3), 'Άλλαξε η μέρα ή η ώρα', 'Η αυτόματη έκδοση γράφει την αιτία');
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') ->> 'hasChanges', 'false', 'Μετά την αυτόματη έκδοση δεν υπάρχουν αλλαγές');
select is((select x ->> 'response' from jsonb_array_elements(public.filming_view('00000000-0000-0000-0000-0000000000a1') -> 'crew') x where x ->> 'userId' = '00000000-0000-0000-0000-0000000000e7'), 'pending', 'Η αυτόματη έκδοση μηδενίζει τις απαντήσεις');
select lives_ok($$ select public.filming_crew_set('00000000-0000-0000-0000-0000000000a1', array['00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e2']::uuid[]) $$, 'Η ομάδα προσθέτει μέλος στο Συνεργείο');
select is((select count(*)::int from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a1'), 4, 'Η αλλαγή Συνεργείου βγάζει αυτόματα έκδοση 4');
select is((select change from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a1' and version = 4), 'Άλλαξε το Συνεργείο', 'Η έκδοση Συνεργείου γράφει την αιτία');
select lives_ok($$ select public.filming_crew_set('00000000-0000-0000-0000-0000000000a1', array['00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e2']::uuid[]) $$, 'Ορισμός ίδιου Συνεργείου ξανά');
select is((select count(*)::int from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a1'), 4, 'Χωρίς αλλαγή στιγμιοτύπου δεν βγαίνει έκδοση');
select is(jsonb_array_length(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') -> 'versions'), 4, 'Το ιστορικό έχει τέσσερις εκδόσεις');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') -> 'latest' ->> 'production', 'Εσωτερική Παραγωγή', 'Το τελευταίο στιγμιότυπο φέρει την παραγωγή');
select is(public.filming_sheet_view('00000000-0000-0000-0000-0000000000a1') ->> 'canEdit', 'true', 'Η ομάδα με Δικαίωμα επεξεργάζεται ανοιχτό Δελτίο');

-- ───────────── Χωρίς έκδοση: η μετακίνηση μηδενίζει όπως πριν ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ select public.filming_reschedule('00000000-0000-0000-0000-0000000000a4', timestamptz '2027-01-08 10:00:00+02', 2) $$, 'Μετακίνηση Γυρίσματος χωρίς έκδοση');
select is((select response from public.filming_crew where filming_id = '00000000-0000-0000-0000-0000000000a4' and user_id = '00000000-0000-0000-0000-0000000000e7'), 'pending', 'Χωρίς έκδοση η μετακίνηση μηδενίζει τις απαντήσεις');
select is((select count(*)::int from public.filming_sheet_versions where filming_id = '00000000-0000-0000-0000-0000000000a4'), 0, 'Χωρίς έκδοση δεν βγαίνει νέα έκδοση');

-- ───────────── Ίχνος ─────────────
select ok(authz.audit_entity_allowed('filming_sheets') and authz.audit_entity_allowed('filming_sheet_versions'), 'Το Ίχνος βλέπει τα Δελτία χωρίς ποσά');

select * from finish();
rollback;
