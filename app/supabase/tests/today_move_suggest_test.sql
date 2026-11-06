-- Σήμερα ως ενημέρωση, κομμάτι 4 (#241 Σ9): η θέση που αδειάζει από ακύρωση προτείνεται σε ανοιχτό αίτημα μετάθεσης.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Σταθερό p_now: 2026-03-10 10:00 UTC (Αθήνα: Τρίτη 10/3, 12:00).
-- Χωρητικότητα 1, Ωράριο Τρίτη–Πέμπτη 08:00–22:00 (Αθήνα = UTC+2).
begin;
select plan(20);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a4 ομάδα χωρίς Ρόλο · b1 Χρήστης πελάτη του Πελάτη 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nobody@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Πέτρος', 'nobody@example.com', true, null);
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a1', r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers) ─────────────
set local session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', null),
  ('00000000-0000-0000-0000-0000000000c2', 'Ξενοδοχείο Γαλάζιο Ακρογιάλι', 'Νίκος Ακρογιαλίτης', 'nikos@akrogiali.example.gr', null),
  ('00000000-0000-0000-0000-0000000000c3', 'Φούρνος Ζύμη', 'Ελένη Ζύμη', 'eleni@zymi.example.gr', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns, signed_at)
select x.id::uuid, x.opp::uuid, 'one_off', x.title, 'signed', 'signed', date '2026-12-31', 30, 'lost', 24, 24, false, false,
       timestamptz '2026-01-10 10:00+00'
  from (values ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-0000000000e1', 'Εφάπαξ Αθηνά'),
               ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-0000000000e2', 'Εφάπαξ Ακρογιάλι'),
               ('00000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-0000000000e3', 'Εφάπαξ Ζύμη'))
       as x (id, opp, title);
insert into public.productions (id, title, client_id, agreement_id, owner_id, state) values
  ('00000000-0000-0000-0000-0000000000d1', 'Βίντεο Αθηνά', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-0000000000a1', 'open'),
  ('00000000-0000-0000-0000-0000000000d2', 'Βίντεο Ακρογιάλι', '00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-0000000000a1', 'open'),
  ('00000000-0000-0000-0000-0000000000d3', 'Βίντεο Ζύμη', '00000000-0000-0000-0000-0000000000c3',
   '00000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-0000000000a1', 'open');

-- Ακυρώσεις (θέσεις που αδειάζουν):
--  k1 Αθηνά ζητά ακύρωση: Τετάρτη 11/3 10:00 UTC, 3 ώρες · k2 Αθηνά ζητά ακύρωση: Τετάρτη 16:00, 1 ώρα
--  · k3 Αθηνά ζητά ακύρωση: Πέμπτη 12/3 08:00, 2 ώρες (o1 της Ζύμης την ίδια ώρα: γεμάτη)
--  · x1 Ζύμη, ήδη ακυρωμένο: Πέμπτη 14:00, 2 ώρες · x2 Ζύμη, ακυρωμένο, αλλά σήμερα το πρωί (πέρασε)
insert into public.filmings (id, production_id, client_id, is_extra, starts_at, hours, origin, state, approved_at,
                             cancel_request_at, cancel_request_reason, cancelled_at, cancelled_side, created_at)
select x.id::uuid, x.production_id::uuid, x.client_id::uuid, true, x.starts_at::timestamptz, x.hours, 'client', x.state,
       timestamptz '2026-02-20 10:00+00', x.req::timestamptz, case when x.req is not null then 'Άλλαξε το πρόγραμμα' end,
       x.cancelled_at::timestamptz, case when x.cancelled_at is not null then 'client' end, timestamptz '2026-02-01 10:00+00'
  from (values
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
     '2026-03-11 10:00+00', 3, 'scheduled', '2026-03-08 10:00+00', null),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
     '2026-03-11 16:00+00', 1, 'scheduled', '2026-03-08 11:00+00', null),
    ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
     '2026-03-12 08:00+00', 2, 'scheduled', '2026-03-08 12:00+00', null),
    ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3',
     '2026-03-12 14:00+00', 2, 'cancelled', null, '2026-03-09 10:00+00'),
    ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3',
     '2026-03-10 07:00+00', 2, 'cancelled', null, '2026-03-09 10:00+00'),
    ('00000000-0000-0000-0000-000000000036', '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3',
     '2026-03-12 08:30+00', 1, 'scheduled', null, null)
  ) as x (id, production_id, client_id, starts_at, hours, state, req, cancelled_at);

-- Αιτήματα μετάθεσης (τώρα όλα την Παρασκευή 13/3, κλειστή μέρα):
--  m1 Ακρογιάλι: ζητά Τετάρτη 10:00, 2 ώρες (ακριβώς τη θέση του k1) · m2 Ζύμη: ζητά Τετάρτη 18:00, 2 ώρες
--  · m3 Ακρογιάλι: ζητά Τρίτη 17/3, 2 ώρες · m4 Αθηνά (ίδιος Πελάτης με τις ακυρώσεις): ζητά Τρίτη 17/3, 1 ώρα
insert into public.filmings (id, production_id, client_id, is_extra, starts_at, hours, origin, state, approved_at,
                             reschedule_starts_at, reschedule_hours, reschedule_requested_at, reschedule_requested_by, created_at)
select x.id::uuid, x.production_id::uuid, x.client_id::uuid, true, timestamptz '2026-03-13 08:00+00', 2, 'client', 'scheduled',
       timestamptz '2026-02-20 10:00+00', x.new_at::timestamptz, x.new_hours, x.req::timestamptz,
       '00000000-0000-0000-0000-0000000000b1', timestamptz '2026-02-01 10:00+00'
  from (values
    ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2',
     '2026-03-11 10:00+00', 2, '2026-03-09 08:00+00'),
    ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c3',
     '2026-03-11 18:00+00', 2, '2026-03-09 09:00+00'),
    ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2',
     '2026-03-17 08:00+00', 2, '2026-03-09 10:00+00'),
    ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
     '2026-03-17 12:00+00', 1, '2026-03-09 07:00+00')
  ) as x (id, production_id, client_id, new_at, new_hours, req);

update public.filming_settings set booking_hours_set_at = timestamptz '2026-03-01 10:00+00', capacity = 1 where id;
insert into public.booking_week (dow, is_open, opens, closes) values
  (2, true, time '08:00', time '22:00'), (3, true, time '08:00', time '22:00'), (4, true, time '08:00', time '22:00');

set local session_replication_role = origin;

create function public.t_now() returns timestamptz
language sql immutable as $$ select timestamptz '2026-03-10 10:00+00'; $$;
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_fid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_suggest(p_id text, p_kind text) returns jsonb
language sql as $$ select authz.today_move_suggestion(public.t_fid(p_id), p_kind, public.t_now()); $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_card('filming_approvals') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει την κάρτα');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.today_card('filming_approvals') $$, '42501', null, 'Ο Χρήστης πελάτη δεν ανοίγει την κάρτα');
select throws_ok($$ select authz.today_move_suggestion(gen_random_uuid(), 'cancel', now()) $$, '42501', null,
  'Η πρόταση δεν καλείται απευθείας');
select throws_ok($$ select authz.today_slot_fits(now(), 1, array[]::uuid[]) $$, '42501', null,
  'Ο έλεγχος θέσης δεν καλείται απευθείας');
reset role;

select throws_ok($$ select authz.today_items_filming_approvals(public.t_uid('a4'), null, public.t_now()) $$, '42501', null,
  'Χωρίς filming.approve: 42501');
select throws_ok($$ select authz.today_items_filming_approvals(public.t_uid('a1'), '00000000-0000-0000-0000-0000000000c1',
                                                              public.t_now()) $$, '42501', null,
  'Με Πελάτη (Σήμερα του πελάτη): 42501');

-- ───────────── Χωράει ─────────────
select is(public.t_suggest('31', 'cancel'),
  jsonb_build_object('filming_id', '00000000-0000-0000-0000-000000000041', 'client', 'Ξενοδοχείο Γαλάζιο Ακρογιάλι',
                     'starts_at', timestamptz '2026-03-11 10:00+00', 'is_freed', false,
                     'link', '/app/filming/00000000-0000-0000-0000-000000000041'),
  'k1: η θέση που αδειάζει χωρά τη μετάθεση του Ακρογιάλι (ζήτησε ακριβώς αυτή την ώρα: δεν μετρά δύο φορές)');
select is(public.t_suggest('41', 'reschedule'),
  jsonb_build_object('filming_id', '00000000-0000-0000-0000-000000000041', 'client', 'Ξενοδοχείο Γαλάζιο Ακρογιάλι',
                     'starts_at', timestamptz '2026-03-11 10:00+00', 'is_freed', false,
                     'link', '/app/filming/00000000-0000-0000-0000-000000000041'),
  'm1: η γραμμή της μετάθεσης δείχνει την ίδια θέση');
select is(public.t_suggest('43', 'reschedule'),
  jsonb_build_object('filming_id', '00000000-0000-0000-0000-000000000043', 'client', 'Ξενοδοχείο Γαλάζιο Ακρογιάλι',
                     'starts_at', timestamptz '2026-03-12 14:00+00', 'is_freed', true,
                     'link', '/app/filming/00000000-0000-0000-0000-000000000043'),
  'm3: η πρώτη θέση που χωρά είναι του ήδη ακυρωμένου x1 (k1 γεμάτη από το m1, k2 μικρή, k3 γεμάτη, x2 πέρασε)');

-- ───────────── Δεν χωράει ─────────────
select is(public.t_suggest('32', 'cancel'), null, 'k2 (1 ώρα): οι μεταθέσεις άλλων Πελατών θέλουν 2 ώρες· όχι η Αθηνά στην Αθηνά');
select is(public.t_suggest('33', 'cancel'), null, 'k3: η Χωρητικότητα είναι γεμάτη από το o1');
select is(public.t_suggest('42', 'reschedule'), null,
  'm2: k1 γεμάτη (το m1 ζήτησε την ίδια ώρα), k2 μικρή, k3 γεμάτη· x1 ανήκει στον ίδιο Πελάτη (Ζύμη)');
select is((public.t_suggest('44', 'reschedule') ->> 'starts_at')::timestamptz, timestamptz '2026-03-12 14:00+00',
  'm4 (Αθηνά, 1 ώρα): όχι οι ακυρώσεις της ίδιας της Αθηνάς (το k2 θα χωρούσε, νωρίτερα), μόνο το x1 άλλου Πελάτη');
select is(public.t_suggest('34', 'cancel'), null, 'Ήδη ακυρωμένο Γύρισμα: δεν είναι γραμμή ακύρωσης');

-- ───────────── Μαντεία ─────────────
select is(authz.today_slot_fits(timestamptz '2026-03-12 14:00+00', 2, array[public.t_fid('34'), public.t_fid('43')]),
  authz.slot_problem(timestamptz '2026-03-12 14:00+00', 2, public.t_fid('43'), false) is null,
  'Ήδη ακυρωμένη θέση: ίδιο αποτέλεσμα με το authz.slot_problem');
select is(authz.slot_problem(timestamptz '2026-03-12 08:00+00', 2, public.t_fid('41'), false), 'Η ώρα είναι γεμάτη',
  'k3: και το authz.slot_problem τη βρίσκει γεμάτη');
select is(authz.slot_load_without(timestamptz '2026-03-11 10:00+00', timestamptz '2026-03-11 12:00+00', array[]::uuid[]),
  authz.slot_load(timestamptz '2026-03-11 10:00+00', timestamptz '2026-03-11 12:00+00', null),
  'Χωρίς εξαιρέσεις: ίδιο φορτίο με το authz.slot_load');
select ok(not authz.today_slot_fits(timestamptz '2026-03-13 10:00+00', 1, array[]::uuid[]),
  'Κλειστή μέρα (Παρασκευή): δεν χωρά');

-- ───────────── Στην κάρτα ─────────────
select is((select array_agg(i ->> 'id' order by n)
             from jsonb_array_elements(authz.today_items_filming_approvals(public.t_uid('a1'), null, public.t_now()))
                  with ordinality x (i, n) where i ? 'suggest'),
  array['cancel:00000000-0000-0000-0000-000000000031', 'reschedule:00000000-0000-0000-0000-000000000041'],
  'Στις τρεις γραμμές της κάρτας: η πρόταση μόνο στο ζεύγος k1 ↔ m1 (όχι στο k2)');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.today_card('filming_approvals', public.t_now()) -> 'items' -> 0 -> 'suggest' ->> 'client',
  'Ξενοδοχείο Γαλάζιο Ακρογιάλι', 'Μέσα από το public.today_card');

select * from finish();
rollback;
