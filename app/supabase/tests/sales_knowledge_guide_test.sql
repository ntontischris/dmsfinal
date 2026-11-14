-- «Οδηγός πωλήσεων» (b15): ποια Ενότητα της Γνώσης ανοίγει από τον χώρο Πωλήσεων.
-- MIG 20261114143000_sales_knowledge_guide.sql. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(12);

-- a1 Ιδιοκτήτης · a3 Άννα (Πωλήσεις, χωρίς «Διαχειρίζεται Ρυθμίσεις»)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

set local session_replication_role = replica;
insert into public.knowledge_sections (id, name, description, sort) values
  ('00000000-0000-0000-0000-0000000000d1', 'Οδηγός Πωλήσεων Τεστ', 'Σενάρια και απαντήσεις.', -2),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικά Τεστ', '', -1);
set local session_replication_role = origin;

select is((select knowledge_section_id from public.sales_settings), null, 'Χωρίς Οδηγό μέχρι να διαλέξει ο Ιδιοκτήτης');

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.sales_guide_sections() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τις Ενότητες');
select throws_ok($$ select knowledge_section_id from public.sales_settings $$, '42501', null,
  'Ο ανώνυμος δεν διαβάζει τη ρύθμιση');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.sales_guide_sections() $$, '42501', null, 'Οι Πωλήσεις δεν διαλέγουν Οδηγό');
update public.sales_settings set knowledge_section_id = '00000000-0000-0000-0000-0000000000d2' where id;
reset role;
select is((select knowledge_section_id from public.sales_settings), null, 'Η αλλαγή από τις Πωλήσεις δεν γράφει τίποτα');

-- ───────────── Ο Ιδιοκτήτης διαλέγει ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select string_agg(x ->> 'name', '|' order by n)
             from jsonb_array_elements(public.sales_guide_sections()) with ordinality s (x, n)
            where x ->> 'name' like '%Τεστ'),
          'Οδηγός Πωλήσεων Τεστ|Εσωτερικά Τεστ', 'Ο Ιδιοκτήτης βλέπει τις Ενότητες με τη σειρά τους');
select lives_ok($$ update public.sales_settings set knowledge_section_id = '00000000-0000-0000-0000-0000000000d1' where id $$,
  'Ο Ιδιοκτήτης ορίζει τον Οδηγό');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((select knowledge_section_id::text from public.sales_settings), '00000000-0000-0000-0000-0000000000d1',
  'Οι Πωλήσεις βλέπουν ποιος είναι ο Οδηγός');
reset role;

-- ───────────── Διαγραφή Ενότητας ─────────────
-- Η φόρμα πάει στην Άννα, που μετά χάνει τον Ρόλο της: η διαγραφή της Ενότητας αδειάζει τον δείκτη χωρίς να σκοντάψει.
set local session_replication_role = replica;
update public.sales_settings set form_routing = 'person', form_assignee_id = '00000000-0000-0000-0000-0000000000a3' where id;
delete from public.team_user_roles where user_id = '00000000-0000-0000-0000-0000000000a3';
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$ select public.knowledge_section_delete('00000000-0000-0000-0000-0000000000d1') $$,
  'Η Ενότητα του Οδηγού διαγράφεται');
select is((select knowledge_section_id from public.sales_settings), null, 'Ο Οδηγός αδειάζει μαζί της');
select lives_ok($$ update public.sales_settings set form_assignee_id = '00000000-0000-0000-0000-0000000000a1' where id $$,
  'Η φόρμα πάει σε πρόσωπο με Δικαίωμα');
select throws_ok($$ update public.sales_settings set form_assignee_id = '00000000-0000-0000-0000-0000000000a3' where id $$,
  'P0001', null, 'Νέο πρόσωπο χωρίς Δικαίωμα απορρίπτεται όπως πριν');
reset role;

select * from finish();
rollback;
