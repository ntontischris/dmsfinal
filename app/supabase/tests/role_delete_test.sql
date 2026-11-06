-- Διαγραφή Ρόλου με μετακίνηση (20261111100000_role_delete): ελεύθερος Ρόλος σβήνεται· Ρόλος που τον έχουν θέλει
-- προορισμό· η μετακίνηση πάει Χρήστες ομάδας (και απενεργοποιημένους), Χρήστες πελάτη, ανοιχτές προσκλήσεις και κοινό
-- της Γνώσης στον προορισμό χωρίς διπλές εγγραφές· Ιδιοκτήτης και «Πλήρης» ποτέ· μόνο ο Ιδιοκτήτης.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(31);

-- ───────────── Χρήστες και Ρόλοι ─────────────
-- a1 Ιδιοκτήτης · a3 Διαχείριση · a5 Νίκος (Μοντέρ) · a6 Ρένα (Μοντέρ + Μοντάζ 2) · a7 απενεργοποιημένη Λένα (Μοντέρ)
-- b1 Χρήστης πελάτη (Λίγος) · b2 αφαιρεμένος Χρήστης πελάτη (Λίγος)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'rena@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'gone@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@client-one.example.gr');
insert into public.roles (name, kind) values
  ('Σκρατς (τεστ)', 'team'), ('Μοντέρ (τεστ)', 'team'), ('Μοντάζ 2 (τεστ)', 'team'), ('Λίγος (τεστ)', 'client'),
  ('Κοινό (τεστ)', 'team');
insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true),
  ('00000000-0000-0000-0000-0000000000a3', 'Δημήτρης', 'admin@example.com', true),
  ('00000000-0000-0000-0000-0000000000a5', 'Νίκος', 'nikos@example.com', true),
  ('00000000-0000-0000-0000-0000000000a6', 'Ρένα', 'rena@example.com', true),
  ('00000000-0000-0000-0000-0000000000a7', 'Λένα', 'gone@example.com', false);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a5', 'Μοντέρ (τεστ)'),
               ('00000000-0000-0000-0000-0000000000a6', 'Μοντέρ (τεστ)'),
               ('00000000-0000-0000-0000-0000000000a6', 'Μοντάζ 2 (τεστ)'),
               ('00000000-0000-0000-0000-0000000000a7', 'Μοντέρ (τεστ)')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_role(p_name text) returns uuid
language sql stable
as $$ select r.id from public.roles r where r.name = p_name; $$;

grant execute on function public.t_role(text) to authenticated;

-- ───────────── Πελάτης, προσκλήσεις, Γνώση (άμεσες εγγραφές, χωρίς triggers) ─────────────
set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Κυψέλη Καφέ', 'Μαρία Παπαδάκη', 'one@example.com');
insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', public.t_role('Λίγος (τεστ)'), true, null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Ελένη', public.t_role('Λίγος (τεστ)'), false, now());
-- d1: Μοντέρ + Παραγωγή (εκκρεμής) · d2: Μοντέρ + Μοντάζ 2 (ληγμένη) · d3: αποδεκτή (ιστορικό) · d4: πελάτη (εκκρεμής)
insert into public.invitations (id, kind, email, name, role_ids, client_id, status, accepted_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'team', 'new1@example.com', 'Νέος Ένα',
   array[public.t_role('Μοντέρ (τεστ)'), (select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')], null, 'pending', null),
  ('00000000-0000-0000-0000-0000000000d2', 'team', 'new2@example.com', 'Νέος Δύο',
   array[public.t_role('Μοντέρ (τεστ)'), public.t_role('Μοντάζ 2 (τεστ)')], null, 'expired', null),
  ('00000000-0000-0000-0000-0000000000d3', 'team', 'nikos@example.com', 'Νίκος',
   array[public.t_role('Μοντέρ (τεστ)')], null, 'accepted', now()),
  ('00000000-0000-0000-0000-0000000000d4', 'client', 'new3@client-one.example.gr', 'Νέα Τρία',
   array[public.t_role('Λίγος (τεστ)')], '00000000-0000-0000-0000-0000000000c1', 'pending', null);
insert into public.knowledge_sections (id, name, sort) values
  ('00000000-0000-0000-0000-0000000000e1', 'Οδηγοί (τεστ)', 1);
insert into public.knowledge_items (id, section_id, kind, title, body_md) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'article', 'Μοντάζ βήμα βήμα', 'κείμενο'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e1', 'article', 'Χρώμα', 'κείμενο'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000e1', 'article', 'Ήχος', 'κείμενο');
insert into public.knowledge_item_audience (item_id, role_id) values
  ('00000000-0000-0000-0000-0000000000f1', public.t_role('Μοντέρ (τεστ)')),
  ('00000000-0000-0000-0000-0000000000f2', public.t_role('Μοντέρ (τεστ)')),
  ('00000000-0000-0000-0000-0000000000f2', public.t_role('Μοντάζ 2 (τεστ)')),
  ('00000000-0000-0000-0000-0000000000f3', public.t_role('Κοινό (τεστ)'));
set local session_replication_role = origin;

-- Oracle: τα πλήθη υπολογισμένα εδώ, ανεξάρτητα από τη συνάρτηση.
select set_config('t.r1', public.t_role('Μοντέρ (τεστ)')::text, true);
select set_config('t.t1', public.t_role('Μοντάζ 2 (τεστ)')::text, true);
select set_config('t.c1', public.t_role('Λίγος (τεστ)')::text, true);
select set_config('t.full', (select r.id from public.roles r where r.system_key = 'client_full')::text, true);
select set_config('t.oracle_r1', jsonb_build_object(
  'teamUsers', (select count(*) from public.team_user_roles where role_id = public.t_role('Μοντέρ (τεστ)')),
  'clientUsers', 0,
  'invitations', (select count(*) from public.invitations
                   where public.t_role('Μοντέρ (τεστ)') = any (role_ids) and status in ('pending', 'expired')),
  'knowledge', (select count(*) from public.knowledge_item_audience where role_id = public.t_role('Μοντέρ (τεστ)')))::text, true);

-- ───────────── Μόνο ο Ιδιοκτήτης ─────────────
set local role authenticated;
select public.t_as('a3');
select throws_ok($$ select public.role_delete(public.t_role('Σκρατς (τεστ)')) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν διαγράφει Ρόλους');
select throws_ok($$ select public.role_delete(gen_random_uuid()) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ίδιο σφάλμα για Ρόλο που δεν υπάρχει');
select throws_ok($$ select public.role_usage() $$, '42501', null, 'Η Διαχείριση δεν βλέπει τα πλήθη των Ρόλων');
select public.t_as('b1');
select throws_ok($$ select public.role_delete(public.t_role('Σκρατς (τεστ)')) $$, '42501', null,
  'Ο Χρήστης πελάτη δεν διαγράφει Ρόλους');
reset role;
set local role anon;
select throws_ok($$ select public.role_delete(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν διαγράφει Ρόλους');
reset role;

-- ───────────── Ρόλοι που δεν σβήνονται και λάθος προορισμοί ─────────────
set local role authenticated;
select public.t_as('a1');
select is(public.role_usage() -> current_setting('t.r1'), current_setting('t.oracle_r1')::jsonb,
  'Τα πλήθη της οθόνης = oracle (απενεργοποιημένοι μετράνε, η αποδεκτή πρόσκληση όχι)');
select is(public.role_usage() -> current_setting('t.c1'),
  '{"teamUsers": 0, "clientUsers": 2, "invitations": 1, "knowledge": 0}'::jsonb,
  'Ρόλος πελάτη: και ο αφαιρεμένος Χρήστης πελάτη μετράει');
select throws_ok($$ select public.role_delete((select r.id from public.roles r where r.is_owner)) $$, 'P0001',
  'Ο Ρόλος Ιδιοκτήτης δεν αλλάζει και δεν διαγράφεται', 'Ο Ιδιοκτήτης δεν διαγράφεται');
select throws_ok($$ select public.role_delete(current_setting('t.full')::uuid, current_setting('t.c1')::uuid) $$, 'P0001',
  'Ο Ρόλος «Πλήρης» είναι ο Ρόλος της αυτόματης πρόσκλησης και δεν διαγράφεται', 'Ο «Πλήρης» δεν διαγράφεται, ούτε με προορισμό');
select throws_ok($$ select public.role_delete(gen_random_uuid()) $$, 'P0001', 'Ο Ρόλος δεν βρέθηκε', 'Άγνωστος Ρόλος');
select throws_ok($$ select public.role_delete(current_setting('t.r1')::uuid, current_setting('t.full')::uuid) $$, 'P0001',
  'Ο Ρόλος όπου θα πάνε πρέπει να είναι του ίδιου είδους', 'Προορισμός άλλου είδους');
select throws_ok($$ select public.role_delete(current_setting('t.r1')::uuid, current_setting('t.r1')::uuid) $$, 'P0001',
  'Διάλεξε άλλον Ρόλο από αυτόν που διαγράφεται', 'Προορισμός ο ίδιος Ρόλος');
select throws_ok($$ select public.role_delete(current_setting('t.r1')::uuid, (select r.id from public.roles r where r.is_owner)) $$,
  'P0001', 'Στον Ρόλο Ιδιοκτήτης δεν μετακινείται κανείς με διαγραφή Ρόλου', 'Προορισμός ο Ιδιοκτήτης');
select throws_ok($$ select public.role_delete(current_setting('t.r1')::uuid, gen_random_uuid()) $$, 'P0001',
  'Ο Ρόλος όπου θα πάνε δεν βρέθηκε', 'Άγνωστος προορισμός');
select throws_ok($$ select public.role_delete(current_setting('t.r1')::uuid) $$, 'P0001',
  'Τον Ρόλο «Μοντέρ (τεστ)» τον έχουν ακόμα 3 Χρήστες ομάδας, 2 ανοιχτές προσκλήσεις και 2 στοιχεία της Γνώσης. Διάλεξε σε ποιον Ρόλο θα μετακινηθούν.',
  'Ρόλος που τον έχουν, χωρίς προορισμό: άρνηση με τα πλήθη');
select throws_ok($$ select public.role_delete(current_setting('t.c1')::uuid) $$, 'P0001',
  'Τον Ρόλο «Λίγος (τεστ)» τον έχουν ακόμα 2 Χρήστες πελάτη και 1 ανοιχτή πρόσκληση. Διάλεξε σε ποιον Ρόλο θα μετακινηθούν.',
  'Ρόλος πελάτη που τον έχουν, χωρίς προορισμό: άρνηση');

-- ───────────── Ελεύθερος Ρόλος ─────────────
select is(public.role_delete(public.t_role('Σκρατς (τεστ)')),
  '{"teamUsers": 0, "clientUsers": 0, "invitations": 0, "knowledge": 0}'::jsonb, 'Ο ελεύθερος Ρόλος σβήνεται χωρίς προορισμό');

-- ───────────── Μετακίνηση και διαγραφή ─────────────
select is(public.role_delete(current_setting('t.r1')::uuid, current_setting('t.t1')::uuid), current_setting('t.oracle_r1')::jsonb,
  'Μετακίνηση και διαγραφή: επιστρέφει όσα μετακινήθηκαν');
select is(public.role_delete(current_setting('t.c1')::uuid, current_setting('t.full')::uuid),
  '{"teamUsers": 0, "clientUsers": 2, "invitations": 1, "knowledge": 0}'::jsonb, 'Ο Ρόλος πελάτη μετακινείται στον «Πλήρη»');
reset role;

select is((select count(*)::integer from public.roles where name in ('Σκρατς (τεστ)', 'Μοντέρ (τεστ)', 'Λίγος (τεστ)')), 0,
  'Οι τρεις Ρόλοι διαγράφηκαν');
select is((select array_agg(ur.user_id::text order by ur.user_id) from public.team_user_roles ur
            where ur.role_id = current_setting('t.t1')::uuid),
  array['00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a7'],
  'Οι Χρήστες ομάδας (και η απενεργοποιημένη) έχουν τώρα τον προορισμό');
select is((select count(*)::integer from public.team_user_roles where user_id = '00000000-0000-0000-0000-0000000000a6'), 1,
  'Η Ρένα, που είχε ήδη τον προορισμό, δεν τον πήρε δύο φορές');
select is((select array_agg(cu.role_id::text order by cu.user_id) from public.client_users cu
            where cu.client_id = '00000000-0000-0000-0000-0000000000c1'),
  array[current_setting('t.full'), current_setting('t.full')], 'Οι Χρήστες πελάτη (και ο αφαιρεμένος) πήγαν στον «Πλήρη»');
select is((select role_ids from public.invitations where id = '00000000-0000-0000-0000-0000000000d1'),
  array[current_setting('t.t1')::uuid, (select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')],
  'Εκκρεμής πρόσκληση: ο Ρόλος αντικαταστάθηκε στη θέση του');
select is((select role_ids from public.invitations where id = '00000000-0000-0000-0000-0000000000d2'),
  array[current_setting('t.t1')::uuid], 'Ληγμένη πρόσκληση που είχε ήδη τον προορισμό: χωρίς διπλό');
select is((select role_ids from public.invitations where id = '00000000-0000-0000-0000-0000000000d3'),
  array[current_setting('t.r1')::uuid], 'Η αποδεκτή πρόσκληση μένει όπως ήταν (ιστορικό)');
select is((select role_ids from public.invitations where id = '00000000-0000-0000-0000-0000000000d4'),
  array[current_setting('t.full')::uuid], 'Η πρόσκληση πελάτη πήγε στον «Πλήρη»');
select is((select array_agg(a.item_id::text || ':' || a.role_id::text order by a.item_id) from public.knowledge_item_audience a
            where a.item_id <> '00000000-0000-0000-0000-0000000000f3'),
  array['00000000-0000-0000-0000-0000000000f1:' || current_setting('t.t1'), '00000000-0000-0000-0000-0000000000f2:' || current_setting('t.t1')],
  'Το κοινό της Γνώσης πήγε στον προορισμό, χωρίς διπλό');
select is((select a.after ->> 'movedToName' from public.audit_log a
            where a.entity = 'access' and a.entity_id = current_setting('t.r1') and a.after ->> 'event' = 'role_deleted'),
  'Μοντάζ 2 (τεστ)', 'Η διαγραφή γράφτηκε ως Γεγονός πρόσβασης, με τον προορισμό');

-- ───────────── Η Γνώση δεν σβήνει πια σιωπηλά ─────────────
-- Ο «Κοινό (τεστ)» είναι μόνο κοινό του f3: τίποτα άλλο δεν τον κρατά.
select throws_ok($$ delete from public.roles where name = 'Κοινό (τεστ)' $$, '23503', null,
  'Απευθείας διαγραφή Ρόλου που είναι κοινό στη Γνώση: αρνείται (όχι σιωπηλό σβήσιμο)');
select is((select count(*)::integer from public.knowledge_item_audience where item_id = '00000000-0000-0000-0000-0000000000f3'), 1,
  'Το κοινό της Γνώσης έμεινε');

select * from finish();
rollback;
