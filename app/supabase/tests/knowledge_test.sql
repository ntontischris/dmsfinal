-- Γνώση Lα #190: Διαχείριση (knowledge.manage), ορατότητα από το Κοινό, δημοσίευση, αναζήτηση, αρχεία, hook του Lβ.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Τα αρχεία «ανεβαίνουν» με γραμμή στο storage.objects.
begin;
select plan(107);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση (έχει knowledge.manage) · a3 Πωλήσεις · a4 Παραγωγή
-- b1 Χρήστης πελάτη Α «Πλήρης» · b2 Χρήστης πελάτη Β με άλλον Ρόλο πελάτη · b3 και στους δύο Πελάτες
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'prod@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-b.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-ab.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Δήμητρα', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'prod@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Βασικός (τεστ)', 'Τεστ: άλλος Ρόλος πελάτη.', 'client', false, false);
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Βασικός (τεστ)' and r.kind = 'client'), true),
  -- b3: δύο συμμετοχές· τρέχων ο Πελάτης Β (άλλος Ρόλος), ο Πελάτης Α με «Πλήρης» όχι τρέχων.
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', 'Ρένα',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), false),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Ρένα',
   (select r.id from public.roles r where r.name = 'Βασικός (τεστ)' and r.kind = 'client'), true);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_role(p_name text, p_kind text) returns uuid
language sql
as $$ select r.id from public.roles r where r.name = p_name and r.kind = p_kind; $$;

create function public.t_id(p_key text) returns uuid
language sql
as $$ select current_setting('t.' || p_key)::uuid; $$;

-- Νέο στοιχείο (Άρθρο ή Αρχείο) στην Ενότητα t.s1· κρατά το id στο t.<key>.
create function public.t_item(p_key text, p_kind text, p_title text, p_summary text, p_body text default 'Κείμενο.') returns void
language plpgsql
as $$
begin
  perform set_config('t.' || p_key, public.knowledge_item_save(jsonb_build_object(
    'sectionId', current_setting('t.s1'), 'kind', p_kind, 'title', p_title, 'summary', p_summary, 'body', p_body))->>'id', true);
end;
$$;

-- «Ανεβάζει» ένα αρχείο (γραμμή στο storage.objects).
create function public.t_up(p_path text, p_meta jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into storage.objects (bucket_id, name, metadata) values ('knowledge', p_path, p_meta);
end;
$$;

-- Τα id των στοιχείων που βρίσκει ο τρέχων Χρήστης στη Γνώση του (A8).
create function public.t_library_ids() returns uuid[]
language sql
as $$
  select coalesce(array_agg((i->>'id')::uuid), '{}')
    from jsonb_array_elements(public.knowledge_library()->'sections') s, jsonb_array_elements(s->'items') i;
$$;

create function public.t_search_ids(p_q text) returns uuid[]
language sql
as $$
  select coalesce(array_agg((i->>'id')::uuid), '{}') from jsonb_array_elements(public.knowledge_search(p_q)->'items') i;
$$;

create function public.t_version(p_key text) returns integer
language sql
as $$ select i.content_version from public.knowledge_items i where i.id = public.t_id(p_key); $$;

-- Το hook του Lβ όπως θα το στήσει: after update … when (old.content_version is distinct from new.content_version).
create table public.t_hook (item_id uuid not null);
create function public.t_hook_fn() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.t_hook (item_id) values (new.id);
  return null;
end;
$$;
create trigger t_hook_update after update on public.knowledge_items
  for each row when (old.content_version is distinct from new.content_version) execute function public.t_hook_fn();

create function public.t_hook_reset() returns void
language sql security definer set search_path = ''
as $$ delete from public.t_hook; $$;

create function public.t_hook_fired(p_key text) returns boolean
language sql security definer set search_path = ''
as $$ select exists (select 1 from public.t_hook h where h.item_id = current_setting('t.' || p_key)::uuid); $$;

create function public.t_img() returns text
language sql
as $$ select 'img-33333333-3333-4333-8333-333333333333.png'; $$;

-- ───────────── Άρνηση: ανώνυμος ─────────────
set local role anon;
select throws_ok($$ select public.knowledge_section_save('{"name":"x"}') $$, '42501', null, 'Ο ανώνυμος δεν φτιάχνει Ενότητα');
select throws_ok($$ select public.knowledge_item_save('{"kind":"article","title":"x"}') $$, '42501', null, 'Ο ανώνυμος δεν γράφει στοιχείο');
select throws_ok($$ select public.knowledge_item_publish(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν δημοσιεύει');
select throws_ok($$ select public.knowledge_manage_list() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τη Διαχείριση');
select throws_ok($$ select public.knowledge_library() $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει τη Γνώση (A8)');
select throws_ok($$ select public.knowledge_item_get(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει στοιχείο');
select throws_ok($$ select public.knowledge_search('x') $$, '42501', null, 'Ο ανώνυμος δεν ψάχνει');
select throws_ok($$ select public.knowledge_upload_slot(gen_random_uuid(), 'file', 'application/pdf', 10) $$, '42501', null, 'Ο ανώνυμος δεν ανεβάζει');
reset role;

-- ───────────── Άρνηση: χωρίς knowledge.manage (Πωλήσεις) και πελάτης ─────────────
select public.t_as('a3');
select throws_ok($$ select public.knowledge_section_save('{"name":"x"}') $$, '42501', null, 'Πωλήσεις: όχι Ενότητα');
select throws_ok($$ select public.knowledge_section_delete(gen_random_uuid()) $$, '42501', null, 'Πωλήσεις: όχι διαγραφή Ενότητας');
select throws_ok($$ select public.knowledge_section_reorder(gen_random_uuid(), 'up') $$, '42501', null, 'Πωλήσεις: όχι σειρά');
select throws_ok($$ select public.knowledge_item_save('{"kind":"article","title":"x"}') $$, '42501', null, 'Πωλήσεις: όχι στοιχείο');
select throws_ok($$ select public.knowledge_item_publish(gen_random_uuid()) $$, '42501', null, 'Πωλήσεις: όχι δημοσίευση');
select throws_ok($$ select public.knowledge_item_unpublish(gen_random_uuid()) $$, '42501', null, 'Πωλήσεις: όχι απόσυρση');
select throws_ok($$ select public.knowledge_item_delete(gen_random_uuid()) $$, '42501', null, 'Πωλήσεις: όχι διαγραφή');
select throws_ok($$ select public.knowledge_item_set_audience(gen_random_uuid(), '{}', true) $$, '42501', null, 'Πωλήσεις: όχι Κοινό');
select throws_ok($$ select public.knowledge_manage_list() $$, '42501', null, 'Πωλήσεις: όχι λίστα Διαχείρισης');
select throws_ok($$ select public.knowledge_manage_item(gen_random_uuid()) $$, '42501', null, 'Πωλήσεις: όχι επεξεργαστής');
select throws_ok($$ select public.knowledge_upload_slot(gen_random_uuid(), 'file', 'application/pdf', 10) $$, '42501', null, 'Πωλήσεις: όχι ανέβασμα');
select throws_ok($$ select public.knowledge_item_attach_file(gen_random_uuid(), 'x', 'x.pdf') $$, '42501', null, 'Πωλήσεις: όχι Αρχείο');

select public.t_as('b1');
select throws_ok($$ select public.knowledge_section_save('{"name":"x"}') $$, '42501', null, 'Πελάτης: όχι Ενότητα');
select throws_ok($$ select public.knowledge_item_save('{"kind":"article","title":"x"}') $$, '42501', null, 'Πελάτης: όχι στοιχείο');
select throws_ok($$ select public.knowledge_manage_list() $$, '42501', null, 'Πελάτης: όχι λίστα Διαχείρισης');

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.knowledge_sections $$, '42501', null, 'Ο πίνακας Ενοτήτων είναι κλειστός');
select throws_ok($$ select * from public.knowledge_items $$, '42501', null, 'Ο πίνακας στοιχείων είναι κλειστός');
select throws_ok($$ select * from public.knowledge_item_audience $$, '42501', null, 'Ο πίνακας Κοινού είναι κλειστός');
reset role;

-- ───────────── Ενότητες (Διαχείριση) ─────────────
select public.t_as('a2');
select lives_ok($$ select set_config('t.s1', public.knowledge_section_save('{"name":"Οδηγοί πελάτη","description":"Ό,τι χρειάζεται ένας πελάτης."}')->>'id', true) $$, 'Η Διαχείριση φτιάχνει Ενότητα');
select lives_ok($$ select set_config('t.s2', public.knowledge_section_save('{"name":"Εσωτερικά"}')->>'id', true) $$, 'Δεύτερη Ενότητα');
select throws_ok($$ select public.knowledge_section_save($j${"name":"Οδηγοί πελάτη"}$j$) $$, 'P0001', 'Υπάρχει ήδη Ενότητα με αυτό το όνομα', 'Ίδιο όνομα απορρίπτεται');
select throws_ok($$ select public.knowledge_section_save('{"name":"  "}') $$, 'P0001', null, 'Κενό όνομα απορρίπτεται');
select lives_ok($$ select public.knowledge_section_reorder(public.t_id('s2'), 'up') $$, 'Η δεύτερη Ενότητα ανεβαίνει');
select is((public.knowledge_manage_list()->'sections'->0->>'id')::uuid, public.t_id('s2'), 'Η σειρά άλλαξε');
select lives_ok($$ select public.knowledge_section_reorder(public.t_id('s2'), 'up') $$, 'Στην κορυφή, το «πάνω» δεν αλλάζει τίποτα');

-- ───────────── Δημοσίευση ─────────────
select lives_ok($$ select public.t_item('x', 'article', 'Πώς κλείνω Γύρισμα', '') $$, 'Άρθρο χωρίς Περίληψη (πρόχειρο)');
select throws_ok($$ select public.knowledge_item_publish(public.t_id('x')) $$, 'P0001', 'Γράψε Περίληψη πριν από τη δημοσίευση', 'Χωρίς Περίληψη δεν δημοσιεύεται');
select public.t_hook_reset();
select lives_ok(
  format($$ select public.knowledge_item_save(jsonb_build_object('id', %L, 'sectionId', %L, 'title', 'Πώς κλείνω Γύρισμα',
    'summary', 'Τα βήματα για να ζητήσεις Γύρισμα.', 'body', 'Ανοίγεις την **Κράτηση** και διαλέγεις μέρα.')) $$,
    current_setting('t.x'), current_setting('t.s1')),
  'Γράφεται η Περίληψη');
select ok(public.t_hook_fired('x'), 'Hook Lβ: πυροδοτείται στην αποθήκευση');
select throws_ok($$ select public.knowledge_item_publish(public.t_id('x')) $$, 'P0001', 'Διάλεξε Κοινό πριν από τη δημοσίευση', 'Χωρίς Κοινό δεν δημοσιεύεται');
select lives_ok($$ select public.knowledge_item_set_audience(public.t_id('x'), array[public.t_role('Πλήρης', 'client')], false) $$, 'Κοινό: ο Ρόλος πελάτη «Πλήρης»');
select set_config('t.v0', public.t_version('x')::text, true);
select public.t_hook_reset();
select lives_ok($$ select public.knowledge_item_publish(public.t_id('x')) $$, 'Με Περίληψη και Κοινό δημοσιεύεται');
select ok(public.t_version('x') > current_setting('t.v0')::integer, 'Η δημοσίευση αλλάζει το content_version (hook του Lβ)');
select ok(public.t_hook_fired('x'), 'Hook Lβ: πυροδοτείται στη δημοσίευση');
select throws_ok($$ select public.knowledge_item_publish(public.t_id('x')) $$, 'P0001', 'Το στοιχείο είναι ήδη δημοσιευμένο', 'Δεύτερη δημοσίευση απορρίπτεται');
select throws_ok(
  format($$ select public.knowledge_item_save(jsonb_build_object('id', %L, 'sectionId', %L, 'title', 'Τίτλος', 'summary', '', 'body', 'x')) $$,
    current_setting('t.x'), current_setting('t.s1')),
  'P0001', 'Δημοσιευμένο στοιχείο δεν μένει χωρίς Περίληψη', 'Δημοσιευμένο δεν χάνει την Περίληψη');
select throws_ok($$ select public.knowledge_item_set_audience(public.t_id('x'), '{}', false) $$, 'P0001', null, 'Δημοσιευμένο δεν μένει χωρίς Κοινό');
select throws_ok($$ select public.knowledge_item_delete(public.t_id('x')) $$, 'P0001', 'Δημοσιευμένο στοιχείο δεν διαγράφεται· απόσυρέ το πρώτα', 'Δημοσιευμένο δεν διαγράφεται');
select throws_ok($$ select public.knowledge_section_delete(public.t_id('s1')) $$, 'P0001', 'Η Ενότητα έχει στοιχεία· μετακίνησέ τα πρώτα σε άλλη Ενότητα', 'Ενότητα με στοιχεία δεν διαγράφεται');
select throws_ok(
  format($$ select public.knowledge_item_save(jsonb_build_object('id', %L, 'sectionId', %L, 'kind', 'file', 'title', 'x', 'summary', 'x')) $$,
    current_setting('t.x'), current_setting('t.s1')),
  'P0001', 'Το είδος του στοιχείου δεν αλλάζει', 'Το είδος δεν αλλάζει');

-- Πρόχειρο με Κοινό «Πλήρης»· δημόσιο· στοιχείο ομάδας (Πωλήσεις).
select lives_ok($$ select public.t_item('d', 'article', 'Πρόχειρος οδηγός Γυρίσματος', 'Δεν έχει δημοσιευτεί.') $$, 'Πρόχειρο Άρθρο');
select public.knowledge_item_set_audience(public.t_id('d'), array[public.t_role('Πλήρης', 'client')], false);
select lives_ok($$ select public.t_item('p', 'article', 'Ωράριο', 'Πότε δουλεύουμε.', 'Δευτέρα με Παρασκευή.') $$, 'Δημόσιο Άρθρο');
select public.knowledge_item_set_audience(public.t_id('p'), '{}', true);
select public.knowledge_item_publish(public.t_id('p'));
select lives_ok($$ select public.t_item('t', 'article', 'Σενάριο πωλήσεων', 'Για την ομάδα πωλήσεων.', 'Γύρισμα και τιμή: δείτε τον Κατάλογο.') $$, 'Άρθρο ομάδας');
select public.knowledge_item_set_audience(public.t_id('t'), array[public.t_role('Πωλήσεις', 'team')], false);
select public.knowledge_item_publish(public.t_id('t'));

-- Το content_version αλλάζει με το Κοινό, όχι με το text_status (που γράφει το Lβ).
select set_config('t.v1', public.t_version('t')::text, true);
select public.t_hook_reset();
select public.knowledge_item_set_audience(public.t_id('t'), array[public.t_role('Πωλήσεις', 'team'), public.t_role('Παραγωγή', 'team')], false);
select ok(public.t_version('t') > current_setting('t.v1')::integer, 'Η αλλαγή Κοινού αλλάζει το content_version');
select ok(public.t_hook_fired('t'), 'Hook Lβ: πυροδοτείται στην αλλαγή Κοινού');
select public.knowledge_item_set_audience(public.t_id('t'), array[public.t_role('Πωλήσεις', 'team')], false);
select set_config('t.v2', public.t_version('t')::text, true);
select public.knowledge_item_set_audience(public.t_id('t'), array[public.t_role('Πωλήσεις', 'team')], false);
select is(public.t_version('t'), current_setting('t.v2')::integer, 'Ίδιο Κοινό: καμία αλλαγή');

-- ───────────── Ορατότητα ─────────────
select public.t_as('b1');
select ok(public.t_id('x') = any (public.t_library_ids()), 'Πελάτης με Ρόλο «Πλήρης» βλέπει το Άρθρο του Κοινού του');
select lives_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, 'Και το ανοίγει');
select is(public.knowledge_item_get(public.t_id('x'))->>'textStatus', null, 'Ο πελάτης δεν βλέπει το text_status');
select throws_ok($$ select public.knowledge_item_get(public.t_id('d')) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Το πρόχειρο δεν φαίνεται στον πελάτη');
select throws_ok($$ select public.knowledge_item_get(gen_random_uuid()) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ανύπαρκτο: ίδιο μήνυμα');
select throws_ok($$ select public.knowledge_item_get(public.t_id('t')) $$, '42501', null, 'Ο πελάτης δεν βλέπει Γνώση της ομάδας');
select ok(public.t_id('p') = any (public.t_library_ids()), 'Το δημόσιο το βλέπει ο πελάτης');
select ok(public.t_id('x') = any (public.t_search_ids('Γύρισμα')) and not public.t_id('d') = any (public.t_search_ids('Γύρισμα')),
  'Η αναζήτηση βρίσκει το δημοσιευμένο, όχι το πρόχειρο');
select ok(not public.t_id('t') = any (public.t_search_ids('Γύρισμα')), 'Η αναζήτηση δεν δίνει στοιχεία άλλου Κοινού');

select is(public.knowledge_image_path(public.t_id('x'), public.t_img()), current_setting('t.x') || '/' || public.t_img(), 'Εικόνα ορατού Άρθρου: δίνεται');
select throws_ok($$ select public.knowledge_image_path(public.t_id('d'), public.t_img()) $$, '42501', null, 'Εικόνα πρόχειρου: όχι για μη διαχειριστή');

select public.t_as('b3');
select throws_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, '42501', null, 'Μετράει ο Ρόλος του τρέχοντος Πελάτη, όχι άλλης συμμετοχής');
update public.client_users set is_current = false where user_id = '00000000-0000-0000-0000-0000000000b3';
update public.client_users set is_current = true
 where user_id = '00000000-0000-0000-0000-0000000000b3' and client_id = '00000000-0000-0000-0000-0000000000c1';
select lives_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, 'Με τρέχοντα τον Πελάτη του «Πλήρης» το βλέπει');

select public.t_as('b2');
select throws_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, '42501', null, 'Πελάτης με άλλον Ρόλο δεν βλέπει το Άρθρο');
select throws_ok($$ select public.knowledge_image_path(public.t_id('x'), public.t_img()) $$, '42501', null, 'Εικόνα μη ορατού Άρθρου: όχι');
select is(public.t_library_ids(), array[public.t_id('p')], 'Ο πελάτης με άλλον Ρόλο βλέπει μόνο το δημόσιο');
select is(public.t_search_ids('Γύρισμα'), '{}'::uuid[], 'Και η αναζήτηση δεν του δίνει το Άρθρο');

select public.t_as('a3');
select throws_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, '42501', null, 'Χρήστης ομάδας χωρίς τον Ρόλο δεν βλέπει το Άρθρο πελάτη');
select lives_ok($$ select public.knowledge_item_get(public.t_id('t')) $$, 'Πωλήσεις: βλέπει το Άρθρο των Πωλήσεων');
select lives_ok($$ select public.knowledge_item_get(public.t_id('p')) $$, 'Πωλήσεις: βλέπει το δημόσιο');

select public.t_as('a4');
select throws_ok($$ select public.knowledge_item_get(public.t_id('t')) $$, '42501', null, 'Παραγωγή: δεν βλέπει το Άρθρο των Πωλήσεων');

-- Ακόμα και η Διαχείριση και ο Ιδιοκτήτης βλέπουν στο A8 μόνο το Κοινό τους, ποτέ πρόχειρο.
select public.t_as('a2');
select throws_ok($$ select public.knowledge_item_get(public.t_id('d')) $$, '42501', null, 'Η Διαχείριση δεν βλέπει πρόχειρο στο A8');
select lives_ok($$ select public.knowledge_image_path(public.t_id('d'), public.t_img()) $$, 'Η Διαχείριση βλέπει εικόνα πρόχειρου (προεπισκόπηση)');
select throws_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, '42501', null, 'Η Διαχείριση δεν βλέπει Άρθρο άλλου Κοινού στο A8');
select public.t_as('a1');
select is(public.t_library_ids(), array[public.t_id('p')], 'Ο Ιδιοκτήτης βλέπει στο A8 μόνο ό,τι έχει το Κοινό του');

-- Επισκέπτης (p_uid = null): μόνο δημόσια.
select ok(authz.knowledge_item_visible(null, public.t_id('p')), 'Ο Επισκέπτης βλέπει το δημόσιο');
select ok(not authz.knowledge_item_visible(null, public.t_id('x')), 'Ο Επισκέπτης δεν βλέπει Άρθρο Ρόλου');
select is((select count(*)::integer from authz.knowledge_visible_to(null)), 1, 'Ο Επισκέπτης έχει μόνο ένα ορατό στοιχείο');

-- ───────────── Απόσυρση και διαγραφή ─────────────
select public.t_as('a2');
select public.t_hook_reset();
select lives_ok($$ select public.knowledge_item_unpublish(public.t_id('x')) $$, 'Απόσυρση');
select ok(public.t_hook_fired('x'), 'Hook Lβ: πυροδοτείται στην απόσυρση');
select public.t_as('b1');
select throws_ok($$ select public.knowledge_item_get(public.t_id('x')) $$, '42501', null, 'Μετά την απόσυρση ο πελάτης δεν το βλέπει');
select public.t_as('a2');
select throws_ok($$ select public.knowledge_item_unpublish(public.t_id('x')) $$, 'P0001', 'Το στοιχείο είναι ήδη πρόχειρο', 'Δεύτερη απόσυρση απορρίπτεται');
select is(public.knowledge_item_delete(public.t_id('d')), '{"removedPaths": []}'::jsonb, 'Το πρόχειρο διαγράφεται οριστικά');
select is(public.knowledge_manage_list('draft')->'counts'->>'draft', '1', 'Μένει ένα πρόχειρο');

-- ───────────── Αρχεία ─────────────
select lives_ok($$ select public.t_item('f', 'file', 'Παρουσίαση εταιρείας', 'Η εταιρεία σε 10 διαφάνειες.') $$, 'Στοιχείο Αρχείο');
select is((select body_md from public.knowledge_items where id = public.t_id('f')), null, 'Το Αρχείο δεν έχει κείμενο Markdown');
select public.knowledge_item_set_audience(public.t_id('f'), array[public.t_role('Πλήρης', 'client')], false);
select throws_ok($$ select public.knowledge_item_publish(public.t_id('f')) $$, 'P0001', 'Ανέβασε το Αρχείο πριν από τη δημοσίευση', 'Αρχείο χωρίς ανεβασμένο αρχείο δεν δημοσιεύεται');
select throws_ok($$ select public.knowledge_upload_slot(public.t_id('f'), 'file', 'application/zip', 10) $$, 'P0001', 'Επιτρέπονται PDF, DOCX, PPTX και εικόνες', 'Μη επιτρεπτό είδος');
select throws_ok($$ select public.knowledge_upload_slot(public.t_id('f'), 'file', 'application/pdf', 26214401) $$, 'P0001', 'Το αρχείο ξεπερνά τα 25 MB', 'Πάνω από 25 MB');
select throws_ok($$ select public.knowledge_upload_slot(public.t_id('f'), 'image', 'image/png', 10) $$, 'P0001', null, 'Εικόνα Άρθρου όχι σε Αρχείο');
select set_config('t.path', public.knowledge_upload_slot(public.t_id('f'), 'file', 'application/pdf', 1000)->>'path', true);
select ok(current_setting('t.path') ~ ('^' || current_setting('t.f') || '/file-[0-9a-f-]{36}[.]pdf$'), 'Η διαδρομή έχει το στοιχείο και επέκταση από το mime');
select throws_ok($$ select public.knowledge_item_attach_file(public.t_id('f'), current_setting('t.path'), 'εταιρεία.pdf') $$, 'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Χωρίς ανεβασμένο αρχείο απορρίπτεται');
select set_config('t.nosize', public.knowledge_upload_slot(public.t_id('f'), 'file', 'application/pdf', 1000)->>'path', true);
select public.t_up(current_setting('t.nosize'), '{"mimetype":"application/pdf"}');
select throws_ok($$ select public.knowledge_item_attach_file(public.t_id('f'), current_setting('t.nosize'), 'x.pdf') $$, 'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Χωρίς μέγεθος στο Storage απορρίπτεται');
select public.t_up(current_setting('t.path'), '{"size":4321,"mimetype":"application/pdf"}');
select public.t_hook_reset();
select lives_ok($$ select public.knowledge_item_attach_file(public.t_id('f'), current_setting('t.path'), 'εταιρεία.pdf') $$, 'Το Αρχείο γράφεται στο στοιχείο');
select ok(public.t_hook_fired('f'), 'Hook Lβ: πυροδοτείται στο ανέβασμα Αρχείου');
select is((select text_status || ':' || size_bytes from public.knowledge_items where id = public.t_id('f')), 'pending:4321', 'text_status pending και μέγεθος από το Storage');
select lives_ok($$ select public.knowledge_item_publish(public.t_id('f')) $$, 'Το Αρχείο δημοσιεύεται');

select public.t_as('b1');
select is(public.knowledge_file_path(public.t_id('f'))->>'path', current_setting('t.path'), 'Ο πελάτης του Κοινού παίρνει το Αρχείο');
select public.t_as('a3');
select throws_ok($$ select public.knowledge_file_path(public.t_id('f')) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Εκτός Κοινού δεν παίρνει το Αρχείο');
select throws_ok($$ select public.knowledge_image_path(public.t_id('p'), '../x.png') $$, '42501', null, 'Άκυρο όνομα εικόνας');

-- Το text_status (Lβ) δεν αλλάζει το content_version και δεν γράφεται στο Ίχνος.
select set_config('t.v3', public.t_version('f')::text, true);
select public.t_hook_reset();
update public.knowledge_items set text_status = 'ok' where id = public.t_id('f');
select ok(not public.t_hook_fired('f'), 'Hook Lβ: ΔΕΝ πυροδοτείται στο text_status');
select is(public.t_version('f'), current_setting('t.v3')::integer, 'Το text_status δεν αλλάζει το content_version');
select ok((select count(*) from public.audit_log l where l.entity = 'knowledge_items' and l.entity_id = current_setting('t.f')) >= 1, 'Οι αλλαγές στοιχείων γράφονται στο Ίχνος');

select * from finish();
rollback;
