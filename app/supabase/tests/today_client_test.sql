-- Σήμερα Σε #184: οι κάρτες του Χρήστη πελάτη. Δικαίωμα, Πελάτης, σειρά, επείγον, ποσά, κάρτες εβδομάδας και ο τρέχων Πελάτης.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Όλες οι ώρες είναι σταθερές και περνούν ως p_now.
begin;
select plan(45);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · b1 «Πλήρης» στον Πελάτη 1 (τρέχων) και στον Πελάτη 2 · b2 Πελάτης 1 μόνο «Βλέπει Συνομιλία»
-- b3 «Πλήρης» μόνο στον Πελάτη 2
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@client-two.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com');
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a1', r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο Συνομιλία (τεστ)', 'Τεστ: μόνο διαβάζει τη Συνομιλία.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.chatRead', 'all' from public.roles r where r.name = 'Μόνο Συνομιλία (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, x.is_current
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', 'Πλήρης', true),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', 'Πλήρης', false),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Λία', 'Μόνο Συνομιλία (τεστ)', true),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος', 'Πλήρης', true)
  ) as x (client_id, user_id, name, role_name, is_current)
  join public.roles r on r.name = x.role_name and r.kind = 'client';

-- ───────────── Συμφωνίες, Περίοδοι, Παραγωγές και εκκρεμότητες (άμεσες εγγραφές, χωρίς triggers) ─────────────
-- Και οι δύο Πελάτες: ενεργή μηνιαία Συμφωνία με Περίοδο Μαρτίου 2026 και 4 reel. Το «τώρα» είναι 10/3/2026 12:00 Αθήνα.
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Επόμενο', date '2027-06-01'
  from (values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Ένα'),
               ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c2', 'Μηνιαίο Δύο'))
       as x (id, client_id, title);

set local session_replication_role = replica;
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
select x.id::uuid, x.opp::uuid, 'monthly', x.title, 'active', 'signed', date '2026-02-20', date '2026-03-01', 12, date '2027-02-28',
       15, 'lost', 'new_opportunity', 48, 48, false, false, timestamptz '2026-02-25 10:00+00'
  from (values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'Μηνιαίο Ένα'),
               ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', 'Μηνιαίο Δύο')) as x (id, opp, title);
insert into public.agreement_lines (id, agreement_id, position, line_kind, description) values
  ('00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-0000000000f1', 1, 'free', 'Reels'),
  ('00000000-0000-0000-0000-000000000b21', '00000000-0000-0000-0000-0000000000f2', 1, 'free', 'Reels');
insert into public.agreement_line_provisions (line_id, kind_id, quantity)
select x.line::uuid, k.id, 4
  from (values ('00000000-0000-0000-0000-000000000b11'), ('00000000-0000-0000-0000-000000000b21')) as x (line)
  cross join public.provision_kinds k where k.code = 'reel';
insert into public.agreement_periods (id, agreement_id, n, starts, ends, is_partial, gives_provisions) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000f1', 1, date '2026-03-01', date '2026-03-31', false, true),
  ('00000000-0000-0000-0000-000000000a21', '00000000-0000-0000-0000-0000000000f2', 1, date '2026-03-01', date '2026-03-31', false, true);
insert into public.agreement_period_provisions (period_id, kind_id, given)
select x.period::uuid, k.id, 4
  from (values ('00000000-0000-0000-0000-000000000a11'), ('00000000-0000-0000-0000-000000000a21')) as x (period)
  cross join public.provision_kinds k where k.code = 'reel';
insert into public.productions (id, title, client_id, agreement_id, period_id, owner_id, state) values
  ('00000000-0000-0000-0000-0000000000d1', 'Μηνιαίο Μάρτιος', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000a1', 'open'),
  ('00000000-0000-0000-0000-0000000000d2', 'Μηνιαίο Μάρτιος Δύο', '00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000a21', '00000000-0000-0000-0000-0000000000a1', 'open');

-- Παραδοτέα: δύο σε αναμονή του Πελάτη 1 (το Β παλαιότερο), ένα σε έλεγχο, ένα του Πελάτη 2.
insert into public.deliverables (id, production_id, period_id, kind_id, title, charge)
select x.id::uuid, x.prod::uuid, x.period::uuid, k.id, x.title, 'included'
  from (values ('00000000-0000-0000-0000-00000000dd01', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000a11', 'Reel Α'),
               ('00000000-0000-0000-0000-00000000dd02', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000a11', 'Reel Β'),
               ('00000000-0000-0000-0000-00000000dd03', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000a11', 'Reel Γ'),
               ('00000000-0000-0000-0000-00000000dd05', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000a21', 'Reel Δύο'))
       as x (id, prod, period, title)
  cross join public.provision_kinds k where k.code = 'reel';
insert into public.deliverable_versions (deliverable_id, number, url, host, state, sent_at) values
  ('00000000-0000-0000-0000-00000000dd01', 1, 'https://vimeo.com/1', 'vimeo.com', 'awaiting_client', timestamptz '2026-03-02 10:00+00'),
  ('00000000-0000-0000-0000-00000000dd02', 1, 'https://vimeo.com/2', 'vimeo.com', 'changes_requested', timestamptz '2026-02-27 10:00+00'),
  ('00000000-0000-0000-0000-00000000dd02', 2, 'https://vimeo.com/3', 'vimeo.com', 'awaiting_client', timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-00000000dd03', 1, 'https://vimeo.com/4', 'vimeo.com', 'in_review', null),
  ('00000000-0000-0000-0000-00000000dd05', 1, 'https://vimeo.com/5', 'vimeo.com', 'awaiting_client', timestamptz '2026-03-01 10:00+00');

-- Τιμολόγια του Πελάτη 1: Τ-3 εξοφλημένο (η Είσπραξη πάει στο παλαιότερο), Τ-1 ληξιπρόθεσμο, Τ-2 με λήξη 31/3. Ένα του Πελάτη 2.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path) values
  ('00000000-0000-0000-0000-00000000ee03', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Τ-3',
   date '2026-01-01', date '2026-01-10', 50, 0, 50, 'invoices/today-t3.pdf'),
  ('00000000-0000-0000-0000-00000000ee01', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Τ-1',
   date '2026-02-01', date '2026-02-15', 100, 0, 100, 'invoices/today-t1.pdf'),
  ('00000000-0000-0000-0000-00000000ee02', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Τ-2',
   date '2026-03-01', date '2026-03-31', 202.02, 48.48, 250.50, 'invoices/today-t2.pdf'),
  ('00000000-0000-0000-0000-00000000ee05', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'Δ-1',
   date '2026-02-01', date '2026-02-15', 80, 0, 80, 'invoices/today-d1.pdf');
insert into public.receipts (client_id, received_on, amount, method_id)
select '00000000-0000-0000-0000-0000000000c1', date '2026-01-09', 50, m.id from public.payment_methods m order by m.sort limit 1;

-- Αιτήματα του Πελάτη 1: δύο ανοιχτά, ένα σε διαγραμμένο Μήνυμα (δεν μετρά), και μια αλλαγή μετά την έγκριση. Ένα του Πελάτη 2.
insert into public.messages (id, client_id, author_id, author_kind, body, created_at, deleted_at, deleted_by) values
  ('00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   'client', 'Θέλουμε reel για το event', timestamptz '2026-03-03 10:00+00', null, null),
  ('00000000-0000-0000-0000-00000000cc02', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   'client', 'Γύρισμα στο νέο κατάστημα', timestamptz '2026-03-05 10:00+00', null, null),
  ('00000000-0000-0000-0000-00000000cc03', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
   'client', 'Σβησμένο', timestamptz '2026-03-01 10:00+00', timestamptz '2026-03-01 11:00+00', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000cc05', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3',
   'client', 'Αίτημα Πελάτη Δύο', timestamptz '2026-03-03 10:00+00', null, null);
insert into public.message_requests (message_id, kind, state, declared_by, declared_user, declared_at)
select m.id, x.kind, 'open', 'client', m.author_id, m.created_at
  from (values ('00000000-0000-0000-0000-00000000cc01', 'other'), ('00000000-0000-0000-0000-00000000cc02', 'filming'),
               ('00000000-0000-0000-0000-00000000cc03', 'other'), ('00000000-0000-0000-0000-00000000cc05', 'other')) as x (id, kind)
  join public.messages m on m.id = x.id::uuid;
insert into public.deliverable_requests (id, deliverable_id, body, created_at, created_by) values
  ('00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000dd03', 'Πιο σύντομο τέλος',
   timestamptz '2026-03-04 10:00+00', '00000000-0000-0000-0000-0000000000b1');

-- Γυρίσματα (έξτρα, χωρίς Παροχή) του Πελάτη 1: ένα που αναμένει έγκριση (11/3), ένα προγραμματισμένο (12/3), ένα που πέρασε. Ένα του Πελάτη 2.
insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   timestamptz '2026-03-12 10:00 Europe/Athens', 2, 'Στούντιο Κυψέλης', 'team', 'scheduled', true),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   timestamptz '2026-03-11 10:00 Europe/Athens', 2, 'Καφέ Πλατεία', 'client', 'pending', true),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   timestamptz '2026-03-05 10:00 Europe/Athens', 2, 'Παλιό', 'team', 'scheduled', true),
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2',
   timestamptz '2026-03-13 10:00 Europe/Athens', 2, 'Γυμναστήριο', 'team', 'scheduled', true);
set local session_replication_role = origin;

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_uid(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

create function public.t_c(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

create function public.t_ids(p jsonb) returns text[]
language sql immutable
as $$ select coalesce(array_agg(i ->> 'id' order by n), '{}') from jsonb_array_elements(p) with ordinality x (i, n); $$;

create function public.t_count(p jsonb, p_code text) returns integer
language sql immutable
as $$ select (c ->> 'count')::integer from jsonb_array_elements(p -> 'cards') c where c ->> 'code' = p_code; $$;

-- ───────────── Μητρώο ─────────────
select is((select count(*)::integer from public.today_cards c
            where c.code in ('client_waiting', 'client_owes', 'client_requests', 'client_filming', 'client_allowance')
              and c.grp = 'client' and c.audience = 'client' and c.sort between 600 and 699),
  5, 'Πέντε κάρτες πελάτη, στη ζώνη 600–699');

-- ───────────── Πλήθη για τον «Πλήρη» του Πελάτη 1 ─────────────
select is(authz.today_count_client_waiting(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'), 2,
  'Περιμένουν εσένα: οι δύο Εκδόσεις σε αναμονή, όχι αυτή σε έλεγχο ούτε του άλλου Πελάτη');
select is(authz.today_count_client_owes(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'), 2,
  'Τι χρωστάς: τα δύο Τιμολόγια με υπόλοιπο, όχι το εξοφλημένο');
select is(authz.today_count_client_requests(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'), 3,
  'Αιτήματα: τα δύο ανοιχτά και η αλλαγή μετά την έγκριση, όχι του διαγραμμένου Μηνύματος');
select is(authz.today_count_client_filming(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'), 2,
  'Γυρίσματα: τα δύο επόμενα, όχι αυτό που πέρασε');
select is(authz.today_count_client_allowance(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'), 1,
  'Παροχές: μία γραμμή, το reel της τρέχουσας Περιόδου');

-- ───────────── Γραμμές: σειρά, επείγον, ποσά ─────────────
select is(public.t_ids(authz.today_items_client_waiting(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')),
  array['00000000-0000-0000-0000-00000000dd02', '00000000-0000-0000-0000-00000000dd01'],
  'Περιμένουν εσένα: η παλαιότερη αναμονή πρώτη');
select is(authz.today_items_client_waiting(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00') -> 0 ->> 'subtitle',
  'Έκδοση 2', 'Περιμένουν εσένα: η Έκδοση σε αναμονή');
select is(public.t_ids(authz.today_items_client_owes(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')),
  array['00000000-0000-0000-0000-00000000ee01', '00000000-0000-0000-0000-00000000ee02'],
  'Τι χρωστάς: το ληξιπρόθεσμο πρώτο');
select is((select array_agg((i ->> 'urgent')::boolean order by n)
             from jsonb_array_elements(authz.today_items_client_owes(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'))
                  with ordinality x (i, n)),
  array[true, false], 'Τι χρωστάς: επείγον μόνο το ληξιπρόθεσμο');
select is((select array_agg((i ->> 'amount_cents')::bigint order by n)
             from jsonb_array_elements(authz.today_items_client_owes(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00'))
                  with ordinality x (i, n)),
  array[10000::bigint, 25050::bigint], 'Τι χρωστάς: το υπόλοιπο σε λεπτά');
select is(authz.today_items_client_owes(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00') -> 0 ->> 'subtitle',
  'Ληξιπρόθεσμο από 15/02/2026', 'Τι χρωστάς: από πότε είναι ληξιπρόθεσμο');
select is(public.t_ids(authz.today_items_client_requests(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')),
  array['00000000-0000-0000-0000-00000000cc01', '00000000-0000-0000-0000-00000000cd01', '00000000-0000-0000-0000-00000000cc02'],
  'Αιτήματα: το παλαιότερο πρώτο, μαζί με την αλλαγή μετά την έγκριση');
select is(public.t_ids(authz.today_items_client_filming(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')),
  array['00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f001'],
  'Γυρίσματα: το πιο κοντινό πρώτο');
select is(authz.today_items_client_filming(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00') -> 0 ->> 'subtitle',
  'αναμένει έγκριση', 'Γυρίσματα: σήμα «αναμένει έγκριση»');
select is(authz.today_items_client_allowance(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00') -> 0 ->> 'title',
  (select (b ->> 'label') || ': μένουν ' || authz.today_num((b ->> 'balance')::numeric)
     from jsonb_array_elements(authz.period_balances('00000000-0000-0000-0000-000000000a11')) b),
  'Παροχές: ό,τι μένει, όπως το υπολογίζει η Περίοδος');
select is((select count(*)::integer
             from jsonb_array_elements(
                    authz.today_items_client_waiting(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')
                    || authz.today_items_client_requests(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')
                    || authz.today_items_client_filming(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')
                    || authz.today_items_client_allowance(public.t_uid('b1'), public.t_c('c1'), '2026-03-10 10:00+00')) i
            where (i ->> 'urgent')::boolean or i ? 'amount_cents'),
  0, 'Μόνο το «Τι χρωστάς» έχει ποσά και επείγον');

-- ───────────── Εβδομάδας: μένουν και άδειες ─────────────
select is(authz.today_count_client_filming(public.t_uid('b1'), public.t_c('c1'), '2027-01-01 10:00+00'), 0,
  'Γυρίσματα χωρίς επόμενα: 0, όχι null');
select is(authz.today_count_client_allowance(public.t_uid('b1'), public.t_c('c1'), '2027-01-01 10:00+00'), 0,
  'Παροχές χωρίς τρέχουσα Περίοδο: 0, όχι null');

-- ───────────── Χωρίς Δικαίωμα: null, και 42501 στις γραμμές ─────────────
select is(authz.today_count_client_waiting(public.t_uid('b2'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Χωρίς c.approve: χωρίς «Περιμένουν εσένα»');
select is(authz.today_count_client_owes(public.t_uid('b2'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Χωρίς c.finance: χωρίς «Τι χρωστάς» (ποσά μόνο με το Δικαίωμα)');
select is(authz.today_count_client_filming(public.t_uid('b2'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Χωρίς c.book: χωρίς Γυρίσματα');
select is(authz.today_count_client_allowance(public.t_uid('b2'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Χωρίς c.productions ή c.approve: χωρίς Παροχές');
select is(authz.today_count_client_requests(public.t_uid('b2'), public.t_c('c1'), '2026-03-10 10:00+00'), 3,
  'Με c.chatRead: τα Αιτήματα');
select throws_ok($$ select authz.today_items_client_owes(public.t_uid('b2'), public.t_c('c1'), '2026-03-10 10:00+00') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς c.finance: οι γραμμές 42501');
select is(authz.today_count_client_owes(public.t_uid('a1'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Χρήστης ομάδας: καμία κάρτα πελάτη');
select is(authz.today_count_client_owes(public.t_uid('b1'), null, '2026-03-10 10:00+00'), null,
  'Χωρίς Πελάτη: null');

-- ───────────── Πελάτης άλλου Πελάτη ─────────────
select is(authz.today_count_client_waiting(public.t_uid('b3'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Άλλος Πελάτης: χωρίς «Περιμένουν εσένα»');
select is(authz.today_count_client_owes(public.t_uid('b3'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Άλλος Πελάτης: χωρίς «Τι χρωστάς»');
select is(authz.today_count_client_requests(public.t_uid('b3'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Άλλος Πελάτης: χωρίς Αιτήματα');
select is(authz.today_count_client_filming(public.t_uid('b3'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Άλλος Πελάτης: χωρίς Γυρίσματα');
select is(authz.today_count_client_allowance(public.t_uid('b3'), public.t_c('c1'), '2026-03-10 10:00+00'), null,
  'Άλλος Πελάτης: χωρίς Παροχές');
select throws_ok($$ select authz.today_items_client_requests(public.t_uid('b3'), public.t_c('c1'), '2026-03-10 10:00+00') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Άλλος Πελάτης: οι γραμμές 42501, ίδιο μήνυμα');

-- ───────────── Μέσα από τα RPC: μόνο ο τρέχων Πελάτης ─────────────
select public.t_as('b1');
select is((select array_agg(c ->> 'code' order by n)
             from jsonb_array_elements(public.today_counts('2026-03-10 10:00+00') -> 'cards') with ordinality x (c, n)
            where c ->> 'code' like 'client\_%'),
  array['client_waiting', 'client_owes', 'client_requests', 'client_filming', 'client_allowance'],
  'Ο «Πλήρης» βλέπει τις πέντε κάρτες, στη σειρά του κανόνα 3');
select is(public.t_count(public.today_counts('2026-03-10 10:00+00'), 'client_requests'), 3,
  'Τρέχων ο Πελάτης 1: τα δικά του Αιτήματα');
select is(public.today_card('client_owes', '2026-03-10 10:00+00') -> 'items' -> 0 ->> 'amount_cents', '10000',
  'Η κάρτα «Τι χρωστάς» ανοίγει με ποσά για τον πελάτη με c.finance');
update public.client_users set is_current = false where user_id = '00000000-0000-0000-0000-0000000000b1';
update public.client_users set is_current = true
 where user_id = '00000000-0000-0000-0000-0000000000b1' and client_id = '00000000-0000-0000-0000-0000000000c2';
select is(public.t_count(public.today_counts('2026-03-10 10:00+00'), 'client_requests'), 1,
  'Τρέχων ο Πελάτης 2: μόνο τα δικά του Αιτήματα');
select is(public.t_ids(public.today_card('client_waiting', '2026-03-10 10:00+00') -> 'items'),
  array['00000000-0000-0000-0000-00000000dd05'], 'Τρέχων ο Πελάτης 2: μόνο οι δικές του Εκδόσεις');
select is(public.t_count(public.today_counts('2026-03-10 10:00+00'), 'client_owes'), 1,
  'Τρέχων ο Πελάτης 2: μόνο τα δικά του Τιμολόγια');
update public.client_users set is_current = false where user_id = '00000000-0000-0000-0000-0000000000b1';
update public.client_users set is_current = true
 where user_id = '00000000-0000-0000-0000-0000000000b1' and client_id = '00000000-0000-0000-0000-0000000000c1';

select public.t_as('b2');
select is((select array_agg(c ->> 'code' order by n)
             from jsonb_array_elements(public.today_counts('2026-03-10 10:00+00') -> 'cards') with ordinality x (c, n)
            where c ->> 'code' like 'client\_%'),
  array['client_requests'], 'Μόνο «Βλέπει Συνομιλία»: μόνο τα Αιτήματα');
select throws_ok($$ select public.today_card('client_owes', '2026-03-10 10:00+00') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Μόνο «Βλέπει Συνομιλία»: «Τι χρωστάς» 42501');

select public.t_as('a1');
select throws_ok($$ select public.today_card('client_waiting', '2026-03-10 10:00+00') $$,
  '42501', null, 'Η ομάδα δεν ανοίγει κάρτα πελάτη');

-- ───────────── Ανώνυμος και κλειστά ─────────────
set local role anon;
select throws_ok($$ select public.today_card('client_owes') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει κάρτα πελάτη');
reset role;
select public.t_as('b1');
set local role authenticated;
select throws_ok($$ select * from public.today_cards $$, '42501', null, 'Ο πίνακας today_cards μένει κλειστός');
select throws_ok($$ select authz.today_count_client_owes(auth.uid(), null, now()) $$, '42501', null,
  'Οι συναρτήσεις κάρτας πελάτη δεν καλούνται απευθείας');
reset role;

select * from finish();
rollback;
