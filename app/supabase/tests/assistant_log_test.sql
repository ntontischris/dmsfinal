-- Γνώση Lδ #192: Συζητήσεις Βοηθού, Αναπάντητες (ομαδοποίηση, κλείσιμο), διαγραφή, καθαρισμός 12 μηνών, κάρτα Σήμερα.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Σταθερά vectors και σταθερό p_now.
begin;
select plan(58);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a3 Πωλήσεις (χωρίς knowledge.manage) · a4 Παραγωγή · b1 Χρήστης πελάτη Α · b2 Χρήστης πελάτη Β
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'prod@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-b.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'prod@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_id(p_key text) returns uuid
language sql
as $$ select current_setting('t.' || p_key)::uuid; $$;

create function public.t_set(p_key text, p_value text) returns void
language sql
as $$ select set_config('t.' || p_key, p_value, true); $$;

-- Vector 1536 διαστάσεων με τις δύο πρώτες συνιστώσες (a, b) και μηδενικά.
create function public.t_vec(a double precision, b double precision) returns extensions.vector
language sql
as $$ select ('[' || a || ',' || b || repeat(',0', 1534) || ']')::extensions.vector; $$;

create function public.t_count(p_key text) returns integer
language sql
as $$ select u.count from public.assistant_unanswered u where u.id = public.t_id(p_key); $$;

create function public.t_status(p_key text) returns text
language sql
as $$ select u.status from public.assistant_unanswered u where u.id = public.t_id(p_key); $$;

create function public.t_now() returns timestamptz
language sql
as $$ select '2026-10-13 12:00:00+00'::timestamptz; $$;

-- ───────────── Άρνηση: ανώνυμος ─────────────
set local role anon;
select throws_ok($$ select public.assistant_conversation_start('el') $$, '42501', null, 'Ο ανώνυμος δεν ξεκινά Συζήτηση');
select throws_ok($$ select public.assistant_conversations_list() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Συζητήσεις');
select throws_ok($$ select public.assistant_unanswered_list('open') $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Αναπάντητες');
select throws_ok($$ select public.assistant_public_conversation_start('el') $$, '42501', null, 'Ο ανώνυμος δεν καλεί τις συναρτήσεις του server');
select throws_ok($$ select public.assistant_purge() $$, '42501', null, 'Ο ανώνυμος δεν καθαρίζει');
reset role;

-- ───────────── Κλειστοί πίνακες και συναρτήσεις service_role ─────────────
select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.assistant_conversations $$, '42501', null, 'Ο πίνακας Συζητήσεων είναι κλειστός');
select throws_ok($$ select * from public.assistant_messages $$, '42501', null, 'Ο πίνακας μηνυμάτων είναι κλειστός');
select throws_ok($$ select * from public.assistant_unanswered $$, '42501', null, 'Ο πίνακας Αναπάντητων είναι κλειστός');
select throws_ok($$ select * from public.assistant_unanswered_asks $$, '42501', null, 'Ο πίνακας «ρωτήθηκε» είναι κλειστός');
select throws_ok($$ select public.assistant_public_conversation_start('el') $$, '42501', null, 'Ο Χρήστης δεν ξεκινά Συζήτηση Επισκέπτη');
select throws_ok($$ select public.assistant_purge() $$, '42501', null, 'Ο Χρήστης δεν καλεί τον καθαρισμό');
reset role;

-- ───────────── Συζητήσεις: ποιος γράφει ─────────────
select public.t_as('a3');
select public.t_set('ct', public.assistant_conversation_start('el')->>'id');
select public.t_set('ct2', public.assistant_conversation_start('en')->>'id');
select public.t_set('ct3', public.assistant_conversation_start('el')->>'id');
select is((select c.audience || '/' || c.language from public.assistant_conversations c where c.id = public.t_id('ct')),
  'team/el', 'Χρήστης ομάδας → Συζήτηση ομάδας');
select throws_ok($$ select public.assistant_conversation_start('fr') $$, 'P0001', 'Άγνωστη γλώσσα Συζήτησης', 'Άγνωστη γλώσσα απορρίπτεται');

select public.t_as('b1');
select public.t_set('cb', public.assistant_conversation_start('el')->>'id');
select is((select c.audience || '/' || c.client_id from public.assistant_conversations c where c.id = public.t_id('cb')),
  'client/00000000-0000-0000-0000-0000000000c1', 'Χρήστης πελάτη → Συζήτηση πελάτη με τον τρέχοντα Πελάτη');
select throws_ok(format('select public.assistant_message_append(%L, %L, %L)', public.t_id('ct'), 'user', 'γεια'),
  '42501', null, 'Ο πελάτης δεν γράφει σε ξένη Συζήτηση');
select throws_ok(format('select public.assistant_unanswered_record(%L, null, %L)', public.t_id('ct'), 'x'),
  '42501', null, 'Ο πελάτης δεν γράφει Αναπάντητη σε ξένη Συζήτηση');
select throws_ok(format('select public.assistant_message_append(%L, %L, %L)', gen_random_uuid(), 'user', 'γεια'),
  '42501', null, 'Ανύπαρκτη Συζήτηση: ίδια άρνηση');
select throws_ok($$ select public.assistant_conversations_list() $$, '42501', null, 'Ο πελάτης δεν βλέπει Συζητήσεις');

select public.t_as('a3');
select public.t_set('m1', public.assistant_message_append(public.t_id('ct'), 'user', 'Κάνετε γάμους;')->>'id');
select ok((select c.last_message_at >= c.started_at from public.assistant_conversations c where c.id = public.t_id('ct')),
  'Το μήνυμα ανανεώνει το τελευταίο μήνυμα της Συζήτησης');
select throws_ok(format('select public.assistant_message_append(%L, %L, %L, %L::jsonb)', public.t_id('ct'), 'assistant', 'x',
  '[{"kind":"blog","id":"1","title":"x"}]'), 'P0001', 'Οι πηγές του μηνύματος δεν είναι έγκυρες', 'Άκυρες πηγές απορρίπτονται');
select throws_ok(format('select public.assistant_public_message_append(%L, %L, %L)', public.t_id('ct'), 'user', 'x'),
  '42501', null, 'Η συνάρτηση Επισκέπτη δεν γράφει σε Συζήτηση ομάδας');

-- ───────────── Χωρίς knowledge.manage (Πωλήσεις) ─────────────
select throws_ok($$ select public.assistant_conversations_list() $$, '42501', null, 'Πωλήσεις: όχι Συζητήσεις');
select throws_ok(format('select public.assistant_conversation_get(%L)', public.t_id('ct')), '42501', null, 'Πωλήσεις: όχι Συζήτηση');
select throws_ok(format('select public.assistant_conversation_delete(%L)', public.t_id('ct')), '42501', null, 'Πωλήσεις: όχι διαγραφή');
select throws_ok($$ select public.assistant_unanswered_list('open') $$, '42501', null, 'Πωλήσεις: όχι Αναπάντητες');
select throws_ok($$ select public.assistant_unanswered_open_count() $$, '42501', null, 'Πωλήσεις: όχι πλήθος');
select throws_ok(format('select public.assistant_unanswered_cover(%L, %L)', gen_random_uuid(), gen_random_uuid()),
  '42501', null, 'Πωλήσεις: όχι «Καλύφθηκε»');

-- ───────────── Ομαδοποίηση ─────────────
select public.t_set('u1', public.assistant_unanswered_record(public.t_id('ct'), public.t_id('m1'), 'Πόσο κοστίζει ένα reel;', public.t_vec(1, 0))->>'id');
select is(public.assistant_unanswered_record(public.t_id('ct2'), null, 'Τι τιμή έχει ένα reel', public.t_vec(0.95, 0.3122498999))->>'id',
  public.t_id('u1')::text, 'Ομοιότητα ≥ 0,90: μπαίνει στην ίδια γραμμή');
select is(public.t_count('u1'), 2, '«ρωτήθηκε 2 φορές»');
select is((public.assistant_unanswered_record(public.t_id('ct'), null, 'Έχετε drone;', public.t_vec(0.8, 0.6))->>'isNew')::boolean,
  true, 'Ομοιότητα < 0,90: νέα γραμμή');
select public.t_as('b1');
select is((public.assistant_unanswered_record(public.t_id('cb'), null, 'Πόσο κοστίζει ένα reel;', public.t_vec(1, 0))->>'isNew')::boolean,
  true, 'Άλλο Κοινό: νέα γραμμή');
select public.t_as('a3');
select public.t_set('ug', public.assistant_unanswered_record(public.t_id('ct'), null, 'Κάνετε γάμους;')->>'id');
select is(public.assistant_unanswered_record(public.t_id('ct2'), null, '  κάνετε   γάμους ')->>'id',
  public.t_id('ug')::text, 'Χωρίς embedding: ίδιο κανονικοποιημένο κείμενο, ίδια γραμμή');
select public.t_set('uo', public.assistant_unanswered_record(public.t_id('ct3'), null, 'Μόνο από εδώ;')->>'id');
select throws_ok(format('select public.assistant_unanswered_record(%L, %L, %L)', public.t_id('ct2'), public.t_id('m1'), 'x'),
  'P0001', 'Το μήνυμα δεν ανήκει στη Συζήτηση', 'Μήνυμα άλλης Συζήτησης απορρίπτεται');
select throws_ok(format('select public.assistant_unanswered_record(%L, null, %L, %L::extensions.vector)', public.t_id('ct'), 'x', '[1,0,0]'),
  'P0001', 'Το embedding πρέπει να έχει 1536 διαστάσεις', 'Λάθος διαστάσεις απορρίπτονται');

-- Επισκέπτης (service_role· εδώ ως ιδιοκτήτης της βάσης).
select public.t_set('cp', public.assistant_public_conversation_start('el')->>'id');
select public.t_set('mp', public.assistant_public_message_append(public.t_id('cp'), 'user', 'Κάνετε εκδηλώσεις;')->>'id');
select public.t_set('up', public.assistant_public_unanswered_record(public.t_id('cp'), public.t_id('mp'), 'Κάνετε εκδηλώσεις;')->>'id');
select is((select u.audience from public.assistant_unanswered u where u.id = public.t_id('up')), 'public',
  'Η ερώτηση Επισκέπτη μπαίνει στο Κοινό «δημόσιο»');

-- ───────────── Κλείσιμο (Ιδιοκτήτης) ─────────────
select public.t_as('a1');
select public.t_set('s1', public.knowledge_section_save('{"name":"Βοηθός τεστ"}')->>'id');
select public.t_set('draft', public.knowledge_item_save(jsonb_build_object('sectionId', public.t_id('s1'), 'kind', 'article',
  'title', 'Πρόχειρο', 'summary', 'Περίληψη.', 'body', 'Κείμενο.'))->>'id');
select public.t_set('pub', public.knowledge_item_save(jsonb_build_object('sectionId', public.t_id('s1'), 'kind', 'article',
  'title', 'Τιμές reel', 'summary', 'Δείτε τον Κατάλογο.', 'body', 'Κείμενο.'))->>'id');
select public.knowledge_item_set_audience(public.t_id('pub'),
  array[(select r.id from public.roles r where r.name = 'Πωλήσεις' and r.kind = 'team')], false);
select public.knowledge_item_publish(public.t_id('pub'));

select throws_ok(format('select public.assistant_unanswered_cover(%L, %L)', public.t_id('u1'), public.t_id('draft')),
  'P0001', 'Διάλεξε δημοσιευμένο στοιχείο της Γνώσης', '«Καλύφθηκε» με πρόχειρο: P0001');
select is(public.assistant_unanswered_cover(public.t_id('up'), public.t_id('pub'))->>'warning', 'not_public',
  'Ερώτηση Επισκέπτη, στοιχείο χωρίς «δημόσιο»: προειδοποίηση');
select is(public.assistant_unanswered_cover(public.t_id('u1'), public.t_id('pub'))->>'warning', null,
  'Ερώτηση ομάδας: καμία προειδοποίηση');
select is(public.t_status('u1'), 'covered', 'Καλύφθηκε');
select throws_ok(format('select public.assistant_unanswered_cover(%L, %L)', public.t_id('u1'), public.t_id('pub')),
  'P0001', 'Η ερώτηση είναι ήδη κλεισμένη', 'Κλεισμένη δεν ξανακλείνει');
select throws_ok(format('select public.assistant_unanswered_ignore(%L, %L)', public.t_id('ug'), 'boring'),
  'P0001', 'Διάλεξε λόγο', 'Άγνωστος λόγος απορρίπτεται');
select public.assistant_unanswered_ignore(public.t_id('ug'), 'off_topic');
select is(public.t_status('ug'), 'ignored', 'Αγνοήθηκε με λόγο');
select public.assistant_unanswered_reopen(public.t_id('ug'));
select is(public.t_status('ug'), 'open', 'Ξανάνοιξε');

-- Κλεισμένη που ξαναρωτιέται → νέα ανοιχτή.
select public.t_as('a3');
select isnt(public.assistant_unanswered_record(public.t_id('ct'), null, 'Πόσο κοστίζει ένα reel;', public.t_vec(1, 0))->>'id',
  public.t_id('u1')::text, 'Κλεισμένη που ξαναρωτιέται: νέα ανοιχτή');

-- ───────────── Λίστες (Ιδιοκτήτης) ─────────────
select public.t_as('a1');
select is((public.assistant_conversations_list('team')->>'total')::integer, 3, 'Τρεις Συζητήσεις ομάδας');
select is(public.assistant_unanswered_open_count(), 5, 'Πέντε ανοιχτές');
select public.t_as('a3');
select public.assistant_message_append(public.t_id('ct'), 'assistant', 'Δείτε:',
  jsonb_build_array(jsonb_build_object('kind', 'item', 'id', public.t_id('pub'), 'title', 'Τιμές reel'),
                    jsonb_build_object('kind', 'item', 'id', public.t_id('draft'), 'title', 'Πρόχειρο'),
                    jsonb_build_object('kind', 'package', 'id', gen_random_uuid(), 'title', 'Πακέτο που έφυγε')));
select public.t_as('a1');
select is((select jsonb_agg(s->'gone') from jsonb_array_elements(
             (public.assistant_conversation_get(public.t_id('ct'))->'messages'->1->'sources')) s),
  '[false, true, true]'::jsonb, 'Πηγή πρόχειρη ή ανύπαρκτη: «δεν υπάρχει πια»');
select is(public.assistant_conversation_get(public.t_id('ct'))->>'who', 'Άννα', 'Η Συζήτηση λέει ποιος ρώτησε');

-- ───────────── Διαγραφή Συζήτησης ─────────────
select public.assistant_conversation_delete(public.t_id('ct2'));
select is(public.t_count('ug'), 1, 'Κοινή Αναπάντητη: το πλήθος μειώνεται');
select public.assistant_conversation_delete(public.t_id('ct3'));
select is((select count(*)::integer from public.assistant_unanswered u where u.id = public.t_id('uo')), 0,
  'Αναπάντητη μόνο από αυτή τη Συζήτηση: σβήνει');
select throws_ok(format('select public.assistant_conversation_delete(%L)', public.t_id('ct3')),
  'P0001', 'Η Συζήτηση δεν βρέθηκε', 'Ανύπαρκτη Συζήτηση: P0001');

-- ───────────── Κάρτα Σήμερα ─────────────
select is(authz.today_count_unanswered('00000000-0000-0000-0000-0000000000a3', null, public.t_now()), null,
  'Κάρτα: null χωρίς knowledge.manage');
select is(authz.today_count_unanswered('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1',
  public.t_now()), null, 'Κάρτα ομάδας με Πελάτη: null');
select is(authz.today_count_unanswered('00000000-0000-0000-0000-0000000000a1', null, public.t_now()), 4,
  'Κάρτα: οι ανοιχτές');
select is(authz.today_items_unanswered('00000000-0000-0000-0000-0000000000a1', null, public.t_now())->0->>'link',
  '/app/knowledge/unanswered', 'Οι γραμμές οδηγούν στο L3');
select public.t_as('a3');
select throws_ok($$ select public.today_card('unanswered', '2026-10-13 12:00:00+00'::timestamptz) $$, '42501', null,
  'Πωλήσεις: η κάρτα δεν ανοίγει');

-- ───────────── Καθαρισμός 12 μηνών ─────────────
update public.assistant_conversations c
   set last_message_at = case when c.id = public.t_id('ct') then '2025-10-01 00:00:00+00'::timestamptz
                              else '2026-10-01 00:00:00+00'::timestamptz end;
select is(public.assistant_purge(public.t_now())->>'conversations', '1', 'Σβήνει μόνο τη Συζήτηση 12 μηνών');
select is((select count(*)::integer from public.assistant_unanswered_asks a where a.conversation_id = public.t_id('ct')), 0,
  'Μαζί σβήνουν και τα «ρωτήθηκε» της');

select * from finish();
rollback;
