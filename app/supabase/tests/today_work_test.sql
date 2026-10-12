-- Σήμερα Σγ #182: οι κάρτες «Η δουλειά μου». Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Σταθερό p_now:
-- 2026-03-03 10:00 UTC (Τρίτη 3 Μαρτίου στην Ελλάδα).
begin;
select plan(48);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή · a3 Πωλήσεις (Άννα) · a4 Πωλήσεις (Νίκος) · a5 Λογιστής · b1 Χρήστης πελάτη του Πελάτη 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'nikos@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Λένα', 'accountant@example.com', true, null);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a5', 'Λογιστής')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a4');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- ───────────── Βοηθητικά (ως postgres) ─────────────
create function public.tw_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.tw_uid(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

-- Πλήθος μιας κάρτας για έναν Χρήστη ομάδας (p_client null) στο σταθερό p_now.
create function public.tw_count(p_code text, p_last text, p_client uuid default null) returns integer
language plpgsql
as $$
declare
  v integer;
begin
  execute format('select authz.today_count_%s($1, $2, $3)', p_code)
    into v using public.tw_uid(p_last), p_client, timestamptz '2026-03-03 10:00+00';
  return v;
end;
$$;

create function public.tw_items(p_code text, p_last text) returns jsonb
language plpgsql
as $$
declare
  v jsonb;
begin
  execute format('select authz.today_items_%s($1, null, $2)', p_code)
    into v using public.tw_uid(p_last), timestamptz '2026-03-03 10:00+00';
  return v;
end;
$$;

create function public.tw_field(p jsonb, p_key text) returns text[]
language sql immutable
as $$ select coalesce(array_agg(i ->> p_key order by n), '{}') from jsonb_array_elements(p) with ordinality x (i, n); $$;

-- ───────────── Δεδομένα ─────────────
-- Ευκαιρίες: o1 (Άννα, έληξε 1/3) · o2 (Νίκος, έληξε 2/3) · o3 (Άννα, σήμερα: δεν έληξε)
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, x.client::uuid, x.title, (select s.id from public.sales_stages s where s.code = 'new'),
       (select s.id from public.sales_sources s where s.code = 'phone'), x.manager::uuid, x.step, x.due::date
  from (values
    ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000000c1', 'Βίντεο Α', '00000000-0000-0000-0000-0000000000a3', 'Τηλεφώνημα', '2026-03-01'),
    ('00000000-0000-0000-0000-00000000ab02', '00000000-0000-0000-0000-0000000000c2', 'Βίντεο Β', '00000000-0000-0000-0000-0000000000a4', 'Προσφορά', '2026-03-02'),
    ('00000000-0000-0000-0000-00000000ab03', '00000000-0000-0000-0000-0000000000c1', 'Βίντεο Γ', '00000000-0000-0000-0000-0000000000a3', 'Συνάντηση', '2026-03-03')
  ) x (id, client, title, manager, step, due);

-- Προτάσεις που στάλθηκαν: g1 λήγει αύριο · g2 λήγει σε 17 μέρες αλλά την άνοιξε ο πελάτης · g3 λήγει σε 22 μέρες, κλειστή
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns)
select x.id::uuid, x.opp::uuid, 'one_off', x.title, 'proposal', 'sent', x.until::date, 15, 'lost', 48, 24, true, true
  from (values
    ('00000000-0000-0000-0000-00000000a901', '00000000-0000-0000-0000-00000000ab01', 'Πρόταση Α', '2026-03-04'),
    ('00000000-0000-0000-0000-00000000a902', '00000000-0000-0000-0000-00000000ab02', 'Πρόταση Β', '2026-03-20'),
    ('00000000-0000-0000-0000-00000000a903', '00000000-0000-0000-0000-00000000ab03', 'Πρόταση Γ', '2026-03-25')
  ) x (id, opp, title, until);
insert into public.agreement_links (agreement_id, recipient_name, recipient_email, is_signatory, revision, token_hash,
                                    first_opened_at, last_opened_at, open_count) values
  ('00000000-0000-0000-0000-00000000a902', 'Νίκος Κίνης', 'two@example.com', true, 1, 'tw-hash-1',
   timestamptz '2026-03-02 08:00+00', timestamptz '2026-03-02 08:00+00', 1);

-- Παραγωγές: Εσωτερική (υπεύθυνος a1) και του Πελάτη 1 στην Πρόταση Α (υπεύθυνος a2).
insert into public.productions (id, title, client_id, agreement_id, owner_id) values
  ('00000000-0000-0000-0000-00000000aa01', 'Showreel', null, null, '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000aa02', 'Reels Μαρτίου', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-00000000a901', '00000000-0000-0000-0000-0000000000a2');
-- d1 (Πελάτη 1, a2, αύριο) · d2 (Εσωτερική, a1, σε μία βδομάδα) · d3 (χωρίς προθεσμία) · d4 (σε έλεγχο, προθεσμία χθες)
insert into public.deliverables (id, production_id, kind_id, title, assignee_id, charge, deadline)
select x.id::uuid, x.production::uuid, k.id, x.title, x.assignee::uuid, 'included', x.deadline::date
  from (select id from public.provision_kinds order by code limit 1) k
 cross join (values
   ('00000000-0000-0000-0000-00000000dd01', '00000000-0000-0000-0000-00000000aa02', 'Reel 1', '00000000-0000-0000-0000-0000000000a2', '2026-03-04'),
   ('00000000-0000-0000-0000-00000000dd02', '00000000-0000-0000-0000-00000000aa01', 'Reel 2', '00000000-0000-0000-0000-0000000000a1', '2026-03-10'),
   ('00000000-0000-0000-0000-00000000dd03', '00000000-0000-0000-0000-00000000aa01', 'Reel 3', null, null),
   ('00000000-0000-0000-0000-00000000dd04', '00000000-0000-0000-0000-00000000aa01', 'Reel 4', null, '2026-03-02')
 ) x (id, production, title, assignee, deadline);
insert into public.deliverable_versions (deliverable_id, number, url, host, state, created_at) values
  ('00000000-0000-0000-0000-00000000dd04', 1, 'https://vimeo.com/1', 'vimeo.com', 'in_review', timestamptz '2026-03-02 09:00+00');
insert into public.deliverable_requests (id, deliverable_id, body, created_at, created_by) values
  ('00000000-0000-0000-0000-00000000dc01', '00000000-0000-0000-0000-00000000dd01', 'Αλλαγή μουσικής',
   timestamptz '2026-03-01 12:00+00', '00000000-0000-0000-0000-0000000000b1');

-- Μηνύματα: e1 Αίτημα του πελάτη στην Παραγωγή του a2 · e2 Εσωτερικό στον Πελάτη 2 που αναφέρει τον a2 · e3 του πελάτη χωρίς ετικέτα
insert into public.messages (id, client_id, production_id, author_id, author_kind, body, is_internal, mentions, created_at) values
  ('00000000-0000-0000-0000-00000000ee01', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000aa02',
   '00000000-0000-0000-0000-0000000000b1', 'client', 'Θέλουμε ένα reel ακόμα', false, '{}', timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-00000000ee02', '00000000-0000-0000-0000-0000000000c2', null,
   '00000000-0000-0000-0000-0000000000a4', 'team', 'Πέτρο, δες το αυτό', true, array['00000000-0000-0000-0000-0000000000a2'::uuid],
   timestamptz '2026-03-02 09:00+00'),
  ('00000000-0000-0000-0000-00000000ee03', '00000000-0000-0000-0000-0000000000c1', null,
   '00000000-0000-0000-0000-0000000000b1', 'client', 'Ευχαριστούμε', false, '{}', timestamptz '2026-03-02 12:00+00');
insert into public.message_requests (message_id, kind, assignee_id, declared_by, declared_user, declared_at) values
  ('00000000-0000-0000-0000-00000000ee01', 'deliverable', '00000000-0000-0000-0000-0000000000a2', 'client',
   '00000000-0000-0000-0000-0000000000b1', timestamptz '2026-03-01 10:00+00');

-- ───────────── Μητρώο και κλειστές συναρτήσεις ─────────────
select is((select array_agg(c.code order by c.sort) from public.today_cards c where c.grp = 'work'),
  array['my_deliverables', 'versions_to_review', 'requests_mentions', 'unread_messages', 'next_steps_due', 'proposals_in_progress'],
  'Οι έξι κάρτες «Η δουλειά μου» στη σειρά του κανόνα 2');
set local role anon;
select throws_ok($$ select public.today_card('my_deliverables') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει κάρτα');
reset role;
select public.tw_as('a1');
set local role authenticated;
select throws_ok($$ select authz.today_count_my_deliverables(auth.uid(), null, now()) $$, '42501', null,
  'Οι συναρτήσεις κάρτας δεν καλούνται απευθείας ως authenticated');
reset role;

-- ───────────── Παραδοτέα για μένα ─────────────
select is(public.tw_count('my_deliverables', 'a1'), 3, 'Ιδιοκτήτης (Εύρος όλα): τα τρία πρόχειρα');
select is(public.tw_field(public.tw_items('my_deliverables', 'a1'), 'id'),
  array['00000000-0000-0000-0000-00000000dd01', '00000000-0000-0000-0000-00000000dd02', '00000000-0000-0000-0000-00000000dd03'],
  'Κατά προθεσμία, χωρίς προθεσμία στο τέλος');
select is(public.tw_field(public.tw_items('my_deliverables', 'a1'), 'urgent'), array['true', 'false', 'false'],
  'Επείγον: προθεσμία σε έως 1 μέρα');
select is(public.tw_count('my_deliverables', 'a2'), 1, 'Παραγωγή (Εύρος mine): μόνο ό,τι τον αφορά');
select is(public.tw_count('my_deliverables', 'a3'), null, 'Πωλήσεις χωρίς deliverables.work: null');
select throws_ok($$ select public.tw_items('my_deliverables', 'a3') $$, '42501', null, 'Χωρίς Δικαίωμα: οι γραμμές δίνουν 42501');
select is(public.tw_count('my_deliverables', 'b1', '00000000-0000-0000-0000-0000000000c1'), null, 'Ο πελάτης: null');
select is(public.tw_count('my_deliverables', 'b1', '00000000-0000-0000-0000-0000000000c2'), null, 'Πελάτης άλλου Πελάτη: null');

-- ───────────── Εκδόσεις προς έλεγχο ─────────────
select is(public.tw_count('versions_to_review', 'a1'), 1, 'Ιδιοκτήτης: η Έκδοση σε εσωτερικό έλεγχο');
select is(public.tw_items('versions_to_review', 'a1') -> 0 ->> 'subtitle', 'Showreel · Έκδοση 1', 'Με την Έκδοση');
select is(public.tw_items('versions_to_review', 'a1') -> 0 ->> 'urgent', 'true', 'Η περασμένη προθεσμία είναι επείγουσα');
select is(public.tw_count('versions_to_review', 'a2'), null, 'Χωρίς deliverables.review: null');

-- ───────────── Αιτήματα και @αναφορές ─────────────
select is(public.tw_count('requests_mentions', 'a2'), 3, 'a2: το Αίτημά του, η αλλαγή της Παραγωγής του, η @αναφορά');
select is(public.tw_field(public.tw_items('requests_mentions', 'a2'), 'id'),
  array['r:00000000-0000-0000-0000-00000000ee01', 'c:00000000-0000-0000-0000-00000000dc01', 'm:00000000-0000-0000-0000-00000000ee02'],
  'Πρώτα τα Αιτήματα (τα παλαιότερα), μετά οι @αναφορές');
select is(public.tw_count('requests_mentions', 'a1'), 0, 'Ιδιοκτήτης: τίποτα ανατεθειμένο, 0 και όχι null');
select is(public.tw_count('requests_mentions', 'a5'), null, 'Λογιστής χωρίς messages.chat: null');

-- ───────────── Αδιάβαστα Μηνύματα ─────────────
select is(public.tw_count('unread_messages', 'a1'), 3, 'Ιδιοκτήτης: όλα τα αδιάβαστα');
select is(public.tw_items('unread_messages', 'a1') -> 0 ->> 'subtitle', '2 νέα', 'Ανά Συνομιλία, η πιο πρόσφατη πρώτη');
select is(public.tw_count('unread_messages', 'a2'), 2, 'a2: μόνο όσα βλέπει (Παραγωγή του και @αναφορά)');
select is(public.tw_count('unread_messages', 'a3'), 2, 'Άννα: η Συνομιλία του Πελάτη της');
select is(public.tw_count('unread_messages', 'a5'), null, 'Λογιστής: null');

insert into public.message_reads (user_id, client_id, read_at)
values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c2', timestamptz '2026-03-02 10:00+00');
select is(public.tw_count('requests_mentions', 'a2'), 2, 'Η @αναφορά που διαβάστηκε φεύγει');
select is(public.tw_count('unread_messages', 'a2'), 1, 'Το «ως πού διάβασα» μετρά');

-- ───────────── Επόμενα βήματα που έληξαν ─────────────
select is(public.tw_count('next_steps_due', 'a1'), 2, 'Ιδιοκτήτης: τα δύο που έληξαν (όχι το σημερινό)');
select is(public.tw_field(public.tw_items('next_steps_due', 'a1'), 'id'),
  array['00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-00000000ab02'], 'Το παλαιότερο πρώτο');
select is(public.tw_field(public.tw_items('next_steps_due', 'a1'), 'urgent'), array['true', 'true'], 'Όλα επείγοντα');
select is(public.tw_count('next_steps_due', 'a3'), 1, 'Η Άννα μετρά μόνο τα δικά της');
select is(public.tw_count('next_steps_due', 'a4'), 1, 'Ο Νίκος μετρά μόνο τα δικά του');
select is(public.tw_count('next_steps_due', 'a5'), null, 'Λογιστής χωρίς clients.manage: null');
select is(public.tw_count('next_steps_due', 'a2'), null, 'Παραγωγή: null');

-- ───────────── Προτάσεις σε εξέλιξη ─────────────
select is(public.tw_count('proposals_in_progress', 'a1'), 2, 'Ιδιοκτήτης: αυτή που λήγει και αυτή που άνοιξε ο πελάτης');
select is(public.tw_field(public.tw_items('proposals_in_progress', 'a1'), 'id'),
  array['00000000-0000-0000-0000-00000000a901', '00000000-0000-0000-0000-00000000a902'], 'Κατά λήξη');
select is(public.tw_field(public.tw_items('proposals_in_progress', 'a1'), 'urgent'), array['true', 'false'],
  'Επείγον: λήγει σε έως 1 μέρα');
select is(public.tw_items('proposals_in_progress', 'a1') -> 1 ->> 'subtitle', 'την άνοιξε ο πελάτης', 'Σημειώνεται το άνοιγμα');
select is(public.tw_count('proposals_in_progress', 'a3'), 1, 'Η Άννα: μόνο η δική της');
select is(public.tw_count('proposals_in_progress', 'a4'), 1, 'Ο Νίκος: η δική του, που την άνοιξε ο πελάτης');
select is(public.tw_count('proposals_in_progress', 'a5'), 1, 'Λογιστής (μόνο «Βλέπει»): χωρίς το άνοιγμα, μόνο αυτή που λήγει');
select is(public.tw_count('proposals_in_progress', 'a2'), null, 'Παραγωγή: null');
select is(public.tw_count('proposals_in_progress', 'b1', '00000000-0000-0000-0000-0000000000c1'), null, 'Ο πελάτης: null');

-- ───────────── Ποσά ─────────────
select is((select count(*)::integer
             from unnest(array['my_deliverables', 'versions_to_review', 'requests_mentions', 'unread_messages', 'next_steps_due',
                               'proposals_in_progress']) c (code)
            cross join lateral jsonb_array_elements(public.tw_items(c.code, 'a1')) i
            where i ? 'amount_cents'), 0, 'Καμία κάρτα «Η δουλειά μου» δεν δείχνει ποσά, ούτε στον Ιδιοκτήτη');

-- ───────────── Μέσα από τα public RPC ─────────────
select public.tw_as('a2');
set local role authenticated;
select is(public.today_card('my_deliverables', timestamptz '2026-03-03 10:00+00') ->> 'count', '1',
  'a2 ανοίγει την κάρτα του');
select is(public.today_card('my_deliverables', timestamptz '2026-03-03 10:00+00') -> 'items' -> 0 ->> 'link',
  '/app/deliverables/00000000-0000-0000-0000-00000000dd01', 'Η γραμμή οδηγεί στο Παραδοτέο');
select throws_ok($$ select public.today_card('versions_to_review') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Χωρίς Δικαίωμα: 42501');
select is((select array_agg(c ->> 'code' order by n)
             from jsonb_array_elements(public.today_counts(timestamptz '2026-03-03 10:00+00') -> 'cards') with ordinality x (c, n)
            where c ->> 'grp' = 'work'),
  array['my_deliverables', 'requests_mentions', 'unread_messages'], 'Η Παραγωγή βλέπει μόνο τις κάρτες των ουρών της');
reset role;
select public.tw_as('b1');
set local role authenticated;
select throws_ok($$ select public.today_card('my_deliverables') $$, '42501', null, 'Ο πελάτης δεν ανοίγει κάρτα ομάδας');
reset role;

select * from finish();
rollback;
