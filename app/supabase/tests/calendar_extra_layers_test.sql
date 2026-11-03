-- Ημερολόγιο (A5, owner 02.1): Επόμενα βήματα των Ευκαιριών, προθεσμίες Παραδοτέων και τα στοιχεία του φίλτρου ατόμου.
-- Φανταστικά δεδομένα. Εβδομάδα 2027-01-04 έως 2027-01-10 (Ώρα Ελλάδας, +02:00 τον Ιανουάριο).
begin;
select plan(19);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή · a3 Πωλήσεις · a4 Λογιστής · a5 Χρήστης πελάτη του c1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Ελένη', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Κώστας', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Λογιστής')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Τα id μιας στρώσης, με τη σειρά τους.
create function public.t_ids(p_rows jsonb) returns uuid[]
language sql immutable
as $$ select coalesce(array_agg((e ->> 'id')::uuid order by o), '{}'::uuid[]) from jsonb_array_elements(p_rows) with ordinality x (e, o); $$;

-- ───────────── Πελάτες και Ευκαιρίες ─────────────
-- c1 με Υπεύθυνη την a3 · c2 με Υπεύθυνο τον a1
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Κυψέλη Καφέ', 'Μαρία', 'maria@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Ταβέρνα Αρμύρα', 'Νίκος', 'nikos@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.roles (name, kind) values ('Χωρίς δικαιώματα', 'client');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a5', 'Μαρία', r.id, true
  from public.roles r where r.name = 'Χωρίς δικαιώματα' and r.kind = 'client';

-- o1 (a3, 05/01) · o2 (a1, 06/01) · o3 (a3, εκτός εβδομάδας) · o4 (a1, 05/01, χάνεται παρακάτω)
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), o.manager::uuid, o.step, o.due::date
  from (values
    ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο καφέ', '00000000-0000-0000-0000-0000000000a3', 'Τηλέφωνο για την πρόταση', '2027-01-05'),
    ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c2', 'Βίντεο ταβέρνας', '00000000-0000-0000-0000-0000000000a1', 'Ραντεβού στο μαγαζί', '2027-01-06'),
    ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', 'Podcast', '00000000-0000-0000-0000-0000000000a3', 'Email', '2027-02-15'),
    ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c2', 'Χαμένη', '00000000-0000-0000-0000-0000000000a1', 'Τίποτα', '2027-01-05')
  ) as o (id, client, title, manager, step, due);
update public.opportunities
   set outcome = 'lost', closed_at = now(), loss_reason_id = (select l.id from public.sales_loss_reasons l where l.retired_at is null order by l.sort limit 1)
 where id = '00000000-0000-0000-0000-0000000000e4';

-- ───────────── Παραγωγή, Γύρισμα, Παραδοτέα ─────────────
insert into public.productions (id, title) values ('00000000-0000-0000-0000-0000000000d0', 'Εσωτερική Παραγωγή');
-- Το Συνεργείο μπαίνει όσο το Γύρισμα είναι ανοιχτό· ο a1 λέει «δεν μπορώ».
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d0', '2027-01-05 09:00+02', 2, 'team', 'scheduled');
insert into public.filming_crew (filming_id, user_id, response, reason, responded_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'pending', null, null),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'declined', 'Δοκιμή', now());

-- f1 (a2, 05/01) · f2 (a1, 07/01) · f3 ακυρωμένο · f4 εγκεκριμένο · f5 εκτός εβδομάδας (όλα πλην f2 της a2)
insert into public.deliverables (id, production_id, kind_id, title, charge, assignee_id, deadline)
select x.id::uuid, '00000000-0000-0000-0000-0000000000d0', (select k.id from public.provision_kinds k where k.code = 'reel'),
       x.title, 'included', x.assignee::uuid, x.deadline::date
  from (values
    ('00000000-0000-0000-0000-0000000000f1', 'Reel Ιανουαρίου', '00000000-0000-0000-0000-0000000000a2', '2027-01-05'),
    ('00000000-0000-0000-0000-0000000000f2', 'Teaser', '00000000-0000-0000-0000-0000000000a1', '2027-01-07'),
    ('00000000-0000-0000-0000-0000000000f3', 'Ακυρωμένο', '00000000-0000-0000-0000-0000000000a2', '2027-01-05'),
    ('00000000-0000-0000-0000-0000000000f4', 'Εγκεκριμένο', '00000000-0000-0000-0000-0000000000a2', '2027-01-05'),
    ('00000000-0000-0000-0000-0000000000f5', 'Αργότερα', '00000000-0000-0000-0000-0000000000a2', '2027-03-01')
  ) as x (id, title, assignee, deadline);
update public.deliverables set cancelled_at = now(), cancel_reason = 'Δοκιμή', cancel_outcome = 'returned'
 where id = '00000000-0000-0000-0000-0000000000f3';
update public.deliverables set approved_at = now() where id = '00000000-0000-0000-0000-0000000000f4';

-- ───────────── Άρνηση: ο Λογιστής δεν βλέπει Ευκαιρίες ούτε Παραδοτέα ─────────────
set local role authenticated;
select public.t_as('a4');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'nextSteps', '[]'::jsonb, 'Ο Λογιστής δεν βλέπει Επόμενα βήματα');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'deadlines', '[]'::jsonb, 'Ο Λογιστής δεν βλέπει προθεσμίες');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'people', '[]'::jsonb,
  'Χωρίς διαθεσιμότητα ομάδας δεν παίρνει άτομα για φίλτρο');

select public.t_as('a5');
select ok(not (public.calendar_view(date '2027-01-04', date '2027-01-10') ?| array['nextSteps', 'deadlines', 'people']),
  'Ο Χρήστης πελάτη δεν παίρνει καμία από τις νέες στρώσεις');

-- ───────────── Ιδιοκτήτης: όλα ─────────────
select public.t_as('a1');
select is(public.t_ids(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'nextSteps'),
  array['00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2']::uuid[],
  'Ο Ιδιοκτήτης βλέπει όλα τα ανοιχτά Επόμενα βήματα της εβδομάδας, όχι της χαμένης');
select is(public.t_ids(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'deadlines'),
  array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2']::uuid[],
  'Ο Ιδιοκτήτης βλέπει όλες τις προθεσμίες, χωρίς ακυρωμένα και εγκεκριμένα');
select is((select s - 'id' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'nextSteps') s
            where s ->> 'id' = '00000000-0000-0000-0000-0000000000e1'),
  jsonb_build_object('day', '2027-01-05', 'step', 'Τηλέφωνο για την πρόταση', 'opportunityTitle', 'Μηνιαίο καφέ',
                     'clientName', 'Κυψέλη Καφέ', 'managerId', '00000000-0000-0000-0000-0000000000a3',
                     'managerName', 'Ελένη', 'isMine', false),
  'Επόμενο βήμα: μέρα, βήμα, Ευκαιρία, Πελάτης και Υπεύθυνος');
select is((select d - 'id' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'deadlines') d
            where d ->> 'id' = '00000000-0000-0000-0000-0000000000f1'),
  jsonb_build_object('day', '2027-01-05', 'title', 'Reel Ιανουαρίου', 'clientName', 'Εσωτερική Παραγωγή',
                     'assigneeId', '00000000-0000-0000-0000-0000000000a2', 'assigneeName', 'Πέτρος', 'isMine', false),
  'Προθεσμία: μέρα, τίτλος, Πελάτης (ή Παραγωγή) και ανατεθειμένος');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings' -> 0 -> 'crewIds',
  '["00000000-0000-0000-0000-0000000000a2"]'::jsonb, 'Το Γύρισμα δίνει το Συνεργείο του, χωρίς όσους είπαν «δεν μπορώ»');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'people'), 4,
  'Ο Ιδιοκτήτης παίρνει όλα τα ενεργά μέλη για το φίλτρο');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') ->> 'me', '00000000-0000-0000-0000-0000000000a1',
  'Το Ημερολόγιο λέει ποιος είναι ο Χρήστης («Εγώ»)');

-- ───────────── Παραγωγή: μόνο τα δικά της Παραδοτέα ─────────────
select public.t_as('a2');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'nextSteps', '[]'::jsonb,
  'Η Παραγωγή δεν βλέπει Επόμενα βήματα Πωλήσεων');
select is(public.t_ids(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'deadlines'),
  array['00000000-0000-0000-0000-0000000000f1']::uuid[], 'Η Παραγωγή βλέπει μόνο τις προθεσμίες που της ανατέθηκαν');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'deadlines' -> 0 ->> 'isMine', 'true',
  'Η δική της προθεσμία σημειώνεται ως δική της');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings' -> 0 -> 'crewIds',
  '["00000000-0000-0000-0000-0000000000a2"]'::jsonb, 'Στο Συνεργείο βλέπει το Συνεργείο του Γυρίσματος');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'people'), 4,
  'Με διαθεσιμότητα ομάδας παίρνει τα μέλη για το φίλτρο');

-- ───────────── Πωλήσεις: μόνο οι δικές της Ευκαιρίες ─────────────
select public.t_as('a3');
select is(public.t_ids(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'nextSteps'),
  array['00000000-0000-0000-0000-0000000000e1']::uuid[], 'Οι Πωλήσεις βλέπουν μόνο τα Επόμενα βήματα που τους αφορούν');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'nextSteps' -> 0 ->> 'isMine', 'true',
  'Το δικό τους Επόμενο βήμα σημειώνεται ως δικό τους');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'deadlines', '[]'::jsonb,
  'Χωρίς Δικαίωμα στα Παραδοτέα δεν βλέπουν προθεσμίες');

select * from finish();
rollback;
