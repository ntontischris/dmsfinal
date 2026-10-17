-- Γνώση Lβ #191: ουρά μάθησης, κομμάτια, hybrid search (RRF, Κοινό, version), worker μόνο service_role, Υγεία, κόστος AI.
-- Φανταστικά δεδομένα και σταθερά vectors (1 σε μία ή δύο θέσεις)· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(57);

-- ───────────── Χρήστες ─────────────
-- a2 Διαχείριση (knowledge.manage) · a3 Πωλήσεις · b1 Χρήστης πελάτη Α «Πλήρης» · b2 Χρήστης πελάτη Β, άλλος Ρόλος
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-b.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'Δήμητρα', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a3');
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Βασικός (τεστ)', 'Τεστ: άλλος Ρόλος πελάτη.', 'client', false, false);
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος',
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

create function public.t_item(p_key text, p_kind text, p_title text, p_summary text, p_body text default 'Κείμενο.') returns void
language plpgsql
as $$
begin
  perform set_config('t.' || p_key, public.knowledge_item_save(jsonb_build_object(
    'sectionId', current_setting('t.s1'), 'kind', p_kind, 'title', p_title, 'summary', p_summary, 'body', p_body))->>'id', true);
end;
$$;

-- Δημοσιευμένο Άρθρο με Κοινό τον Ρόλο p_role.
create function public.t_published(p_key text, p_title text, p_body text, p_role uuid) returns void
language plpgsql
as $$
begin
  perform public.t_item(p_key, 'article', p_title, 'Περίληψη: ' || p_title, p_body);
  perform public.knowledge_item_set_audience(public.t_id(p_key), array[p_role], false);
  perform public.knowledge_item_publish(public.t_id(p_key));
end;
$$;

create function public.t_up(p_path text, p_meta jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into storage.objects (bucket_id, name, metadata) values ('knowledge', p_path, p_meta);
end;
$$;

create function public.t_version(p_key text) returns integer
language sql security definer set search_path = ''
as $$ select i.content_version from public.knowledge_items i where i.id = current_setting('t.' || p_key)::uuid; $$;

-- Η γραμμή της ουράς: το version της, ή null αν δεν είναι στην ουρά.
create function public.t_queued(p_key text) returns integer
language sql security definer set search_path = ''
as $$ select q.content_version from public.knowledge_index_queue q where q.item_id = current_setting('t.' || p_key)::uuid; $$;

-- Όλη η γραμμή της ουράς (attempts, next_try_at, last_error).
create function public.t_q(p_key text) returns public.knowledge_index_queue
language sql security definer set search_path = ''
as $$ select q from public.knowledge_index_queue q where q.item_id = current_setting('t.' || p_key)::uuid; $$;

create function public.t_chunks(p_key text) returns integer
language sql security definer set search_path = ''
as $$ select count(*)::integer from public.knowledge_chunks c where c.item_id = current_setting('t.' || p_key)::uuid; $$;

-- Σταθερό vector 1536 διαστάσεων με 1 στις θέσεις p_a (και p_b).
create function public.t_arr(p_a integer, p_b integer default null) returns real[]
language sql immutable
as $$ select array_agg(case when g = p_a or g = p_b then 1 else 0 end::real order by g) from generate_series(1, 1536) g; $$;

create function public.t_vec(p_a integer, p_b integer default null) returns extensions.vector
language sql immutable
as $$ select public.t_arr(p_a, p_b)::extensions.vector; $$;

-- Γράφει ένα κομμάτι (όπως ο worker) για το τρέχον version του στοιχείου.
create function public.t_store(p_key text, p_content text, p_a integer, p_b integer default null, p_status text default null)
returns jsonb
language sql
as $$
  select public.knowledge_index_store(public.t_id(p_key), public.t_version(p_key), p_status, 'openai/text-embedding-3-small',
    jsonb_build_array(jsonb_build_object('content', p_content, 'embedding', to_jsonb(public.t_arr(p_a, p_b)))));
$$;

-- Τα στοιχεία που βρίσκει ο τρέχων Χρήστης με το hybrid search του A8, με τη σειρά τους.
create function public.t_found(p_q text, p_embedding extensions.vector) returns uuid[]
language sql
as $$
  select coalesce(array_agg((i->>'id')::uuid order by o), '{}')
    from jsonb_array_elements(public.knowledge_search_hybrid(p_q, p_embedding)->'items') with ordinality as x (i, o);
$$;

-- ───────────── Άρνηση: ανώνυμος ─────────────
set local role anon;
select throws_ok($$ select public.knowledge_search_hybrid('x', null) $$, '42501', null, 'Ο ανώνυμος δεν ψάχνει');
select throws_ok($$ select public.knowledge_index_rebuild() $$, '42501', null, 'Ο ανώνυμος δεν ξαναφτιάχνει τη μνήμη');
select throws_ok($$ select public.knowledge_index_claim() $$, '42501', null, 'Ο ανώνυμος δεν παίρνει από την ουρά');
reset role;

-- ───────────── Άρνηση: συνδεδεμένος Χρήστης (worker και κόστος μόνο service_role, πίνακες κλειστοί) ─────────────
select public.t_as('a2');
set local role authenticated;
select throws_ok($$ select public.knowledge_index_claim() $$, '42501', null, 'Worker: claim μόνο service_role');
select throws_ok($$ select public.knowledge_index_store(gen_random_uuid(), 1, null, 'm', '[]') $$, '42501', null, 'Worker: store μόνο service_role');
select throws_ok($$ select public.knowledge_index_fail(gen_random_uuid(), 1, 'x') $$, '42501', null, 'Worker: fail μόνο service_role');
select throws_ok($$ select public.knowledge_index_mark(true) $$, '42501', null, 'Υγεία μνήμης μόνο service_role');
select throws_ok($$ select public.ai_usage_record('embed', 'm', 1, 0, 1, 'team') $$, '42501', null, 'Κόστος AI μόνο service_role');
select throws_ok($$ select * from public.knowledge_chunks $$, '42501', null, 'Ο πίνακας κομματιών είναι κλειστός');
select throws_ok($$ select * from public.knowledge_index_queue $$, '42501', null, 'Ο πίνακας ουράς είναι κλειστός');
select throws_ok($$ select * from public.ai_usage $$, '42501', null, 'Ο πίνακας κόστους AI είναι κλειστός');
reset role;

select public.t_as('a3');
select throws_ok($$ select public.knowledge_index_rebuild() $$, '42501', null, 'Πωλήσεις: όχι «ξαναφτιάξε τη μνήμη»');
select public.t_as('b1');
select throws_ok($$ select public.knowledge_index_rebuild() $$, '42501', null, 'Πελάτης: όχι «ξαναφτιάξε τη μνήμη»');

-- ───────────── Ουρά: δημοσίευση, αλλαγή, Κοινό, Αρχείο ─────────────
select public.t_as('a2');
select set_config('t.s1', public.knowledge_section_save('{"name":"Οδηγοί"}')->>'id', true);

select public.t_item('d', 'article', 'Πρόχειρο Γυρίσματος', 'Δεν έχει δημοσιευτεί.', 'Γύρισμα σε πρόχειρο.');
select is(public.t_queued('d'), null, 'Πρόχειρο: όχι στην ουρά');

select public.t_published('x', 'Πώς κλείνω Γύρισμα', 'Ανοίγεις την Κράτηση για Γύρισμα.', public.t_role('Πλήρης', 'client'));
select is(public.t_queued('x'), public.t_version('x'), 'Δημοσίευση: στην ουρά με το τρέχον version');

select public.t_published('t', 'Σενάριο πωλήσεων', 'Τα βήματα μιας πώλησης.', public.t_role('Πωλήσεις', 'team'));
select public.t_store('t', 'Οδηγοί · Σενάριο πωλήσεων · Τα βήματα μιας πώλησης.', 1);
select is(public.t_queued('t'), null, 'Μετά την εγγραφή κομματιών φεύγει από την ουρά');
select public.knowledge_item_set_audience(public.t_id('t'), array[public.t_role('Πωλήσεις', 'team'), public.t_role('Πλήρης', 'client')], false);
select is(public.t_queued('t'), public.t_version('t'), 'Αλλαγή Κοινού: ξανά στην ουρά με το νέο version');

select public.knowledge_item_save(jsonb_build_object('id', public.t_id('x'), 'sectionId', public.t_id('s1'),
  'title', 'Πώς κλείνω Γύρισμα', 'summary', 'Περίληψη: Πώς κλείνω Γύρισμα', 'body', 'Νέο κείμενο για το Γύρισμα.'));
select is(public.t_queued('x'), public.t_version('x'), 'Αλλαγή κειμένου δημοσιευμένου: στην ουρά με το νέο version');

-- Αρχείο: δημοσίευση, νέο αρχείο (αλλάζει το version), text_status από τον worker (δεν αλλάζει το version).
select public.t_item('f', 'file', 'Παρουσίαση εταιρείας', 'Ποιοι είμαστε.');
select set_config('t.p1', public.t_id('f') || '/file-11111111-1111-4111-8111-111111111111.pdf', true);
select public.t_up(current_setting('t.p1'), '{"mimetype":"application/pdf","size":1000}');
select public.knowledge_item_attach_file(public.t_id('f'), current_setting('t.p1'), 'εταιρεία.pdf');
select public.knowledge_item_set_audience(public.t_id('f'), array[public.t_role('Πλήρης', 'client')], false);
select public.knowledge_item_publish(public.t_id('f'));
select set_config('t.fv', public.t_version('f')::text, true);
select set_config('t.p2', public.t_id('f') || '/file-22222222-2222-4222-8222-222222222222.pdf', true);
select public.t_up(current_setting('t.p2'), '{"mimetype":"application/pdf","size":2000}');
select public.knowledge_item_attach_file(public.t_id('f'), current_setting('t.p2'), 'εταιρεία-2.pdf');
select ok(public.t_queued('f') > current_setting('t.fv')::integer, 'Νέο Αρχείο σε δημοσιευμένο: στην ουρά με νέο version');
select set_config('t.fv', public.t_version('f')::text, true);
select is(public.t_store('f', 'Οδηγοί · Παρουσίαση εταιρείας · Ποιοι είμαστε.', 3, null, 'image_only')->>'stored', 'true',
  'Ο worker γράφει το κομμάτι του Αρχείου');
select is((select i.text_status from public.knowledge_items i where i.id = public.t_id('f')), 'image_only', 'Το text_status γράφεται');
select is(public.t_version('f'), current_setting('t.fv')::integer, 'Το text_status δεν αλλάζει το version');
select is(public.t_queued('f'), null, 'Και δεν ξαναμπαίνει στην ουρά');
select throws_ok($$ select public.t_store('f', 'x', 3, null, 'weird') $$, 'P0001', 'Άγνωστη κατάσταση κειμένου', 'Άγνωστο text_status απορρίπτεται');

-- ───────────── Κομμάτια: version, απόσυρση, διαγραφή ─────────────
select set_config('t.xv', public.t_version('x')::text, true);
select public.t_store('x', 'Οδηγοί · Πώς κλείνω Γύρισμα · Ανοίγεις την Κράτηση για Γύρισμα.', 1);
select is(public.knowledge_index_store(public.t_id('x'), current_setting('t.xv')::integer - 1, null, 'm',
  jsonb_build_array(jsonb_build_object('content', 'παλιό', 'embedding', to_jsonb(public.t_arr(1)))))->>'stored', 'false',
  'Κομμάτια παλιού version δεν γράφονται');
select is(public.t_chunks('x'), 1, 'Μένει το κομμάτι του τρέχοντος version');
select throws_ok($$ select public.knowledge_index_store(public.t_id('x'), public.t_version('x'), null, 'm', '[]') $$,
  'P0001', 'Τα κομμάτια θέλουν από 1 έως 500', 'Χωρίς κομμάτια απορρίπτεται');

select public.t_as('b1');
select ok(public.t_id('x') = any (public.t_found('', public.t_vec(1))), 'Hybrid: ο πελάτης βρίσκει με vector το Άρθρο του Κοινού του');
select ok(public.t_id('f') = any (public.t_found('', public.t_vec(3))), 'Hybrid: και το Αρχείο (κομμάτι μόνο από Περίληψη)');
select ok(not public.t_id('t') = any (public.t_found('', public.t_vec(1))), 'Hybrid: όχι κομμάτι παλιού version (το Κοινό άλλαξε)');
select public.t_as('b2');
select is(public.t_found('Γύρισμα', public.t_vec(1)), '{}'::uuid[], 'Hybrid: άλλος Ρόλος πελάτη δεν βρίσκει τίποτα');
select public.t_as('a3');
select ok(not public.t_id('x') = any (public.t_found('Γύρισμα', public.t_vec(1))), 'Hybrid: η ομάδα δεν βρίσκει Άρθρο μόνο για πελάτες');

select public.t_as('a2');
select public.knowledge_item_unpublish(public.t_id('x'));
select is(public.t_chunks('x'), 0, 'Απόσυρση: τα κομμάτια σβήνουν αμέσως');
select is(public.t_queued('x'), null, 'Απόσυρση: εκτός ουράς');
select public.t_as('b1');
select ok(not public.t_id('x') = any (public.t_found('Γύρισμα', public.t_vec(1))), 'Hybrid: πρόχειρο δεν βρίσκεται');
select public.t_as('a2');
select public.knowledge_item_publish(public.t_id('x'));
select is((select count(*)::integer from authz.knowledge_hybrid('00000000-0000-0000-0000-0000000000b1', 'Γύρισμα', null, 10) h
            where h.item_id = public.t_id('x') and h.chunk_id is null), 1,
  'Χωρίς κομμάτια ακόμα: βρίσκεται με full-text του στοιχείου (chunk_id null)');

select public.t_store('x', 'Οδηγοί · Πώς κλείνω Γύρισμα · Γύρισμα.', 1);
delete from public.knowledge_items i where i.id = public.t_id('x');
select is(public.t_chunks('x'), 0, 'Διαγραφή: τα κομμάτια σβήνουν');

-- ───────────── RRF και full-text ─────────────
-- y: κείμενο + vector λίγο μακριά· z: μόνο vector, ακριβώς πάνω στην ερώτηση. Το y κερδίζει (δύο λίστες).
select public.t_published('y', 'Φωτισμός στούντιο', 'Ο φωτισμός του στούντιο.', public.t_role('Πωλήσεις', 'team'));
select public.t_store('y', 'Οδηγοί · Φωτισμός στούντιο · Ο φωτισμός του στούντιο.', 5, 6);
select public.t_published('z', 'Μικρόφωνα', 'Τα μικρόφωνα της ομάδας.', public.t_role('Πωλήσεις', 'team'));
select public.t_store('z', 'Οδηγοί · Μικρόφωνα · Τα μικρόφωνα της ομάδας.', 5);
select public.t_published('w', 'Άσχετο', 'Κάτι άλλο εντελώς.', public.t_role('Πωλήσεις', 'team'));
select public.t_store('w', 'Οδηγοί · Άσχετο · Κάτι άλλο εντελώς.', 9);

select public.t_as('a3');
select is((public.t_found('φωτισμός', public.t_vec(5)))[1:2], array[public.t_id('y'), public.t_id('z')],
  'RRF: πρώτο αυτό που βρίσκουν και οι δύο λίστες, μετά το πιο κοντινό vector');
select ok(not public.t_id('w') = any (public.t_found('φωτισμός', public.t_vec(5))), 'Μακρινό vector χωρίς λέξεις: δεν βρίσκεται');
select is(public.t_found('φωτισμός', null), array[public.t_id('y')], 'Χωρίς embedding: μόνο full-text');
select is(public.t_found('', null), '{}'::uuid[], 'Χωρίς λέξεις και embedding: τίποτα');
select is((select array_agg(k order by k) from jsonb_object_keys(public.knowledge_search_hybrid('φωτισμός', null)->'items'->0) k),
  array['id', 'kind', 'sectionName', 'summary', 'title'], 'Το σχήμα είναι αυτό του knowledge_search');

-- ───────────── Worker: claim, backoff, κλείδωμα ─────────────
select public.t_as('a2');
select public.knowledge_item_save(jsonb_build_object('id', public.t_id('y'), 'sectionId', public.t_id('s1'),
  'title', 'Φωτισμός στούντιο', 'summary', 'Περίληψη: Φωτισμός στούντιο', 'body', 'Ο φωτισμός, νέα έκδοση.'));
-- Η αποθήκευση βάζει το στοιχείο στην ουρά με το πραγματικό now()· το claim εδώ τρέχει με σταθερή ώρα, άρα η σειρά της
-- ουράς στερεώνεται σε αυτή (αλλιώς το τεστ σπάει μόλις η πραγματική ώρα περάσει τη σταθερή).
update public.knowledge_index_queue set next_try_at = '2026-10-17 10:00+03' where item_id = public.t_id('y');
select is(public.knowledge_index_claim(10, public.t_id('y'), '2026-10-17 10:00+03')->'items'->0->>'attempts', '1',
  'Claim: η προσπάθεια μετριέται από πριν');
select is((public.t_q('y')).next_try_at, '2026-10-17 10:01+03'::timestamptz,
  'Claim: η επόμενη προσπάθεια ορίζεται από πριν (1′), ώστε ένα στοιχείο που ρίχνει τον worker να μην ξαναπαίρνεται αμέσως');
select is(public.knowledge_index_claim(10, public.t_id('y'), '2026-10-17 10:00:30+03')->'items', '[]'::jsonb,
  'Κλειδωμένο: δεν δίνεται δεύτερη φορά');
select public.knowledge_index_fail(public.t_id('y'), public.t_version('y'), 'Gateway δεν απάντησε');
select ok((public.t_q('y')).attempts = 1 and (public.t_q('y')).last_error = 'Gateway δεν απάντησε',
  'Αποτυχία: κρατά το σφάλμα, δεν ξαναμετρά την προσπάθεια');
select is(public.knowledge_index_claim(10, public.t_id('y'), '2026-10-17 10:00:45+03')->'items', '[]'::jsonb,
  'Πριν περάσει το backoff δεν δίνεται');
select is(public.knowledge_index_claim(10, public.t_id('y'), '2026-10-17 10:01:30+03')->'items'->0->>'itemId',
  public.t_id('y')::text, 'Μετά το backoff δίνεται, με τα στοιχεία του');
select ok((public.t_q('y')).attempts = 2 and (public.t_q('y')).next_try_at = '2026-10-17 10:03:30+03'::timestamptz,
  'Δεύτερη προσπάθεια: backoff 2′');
select is(public.knowledge_index_claim(10, public.t_id('y'), '2026-10-17 10:04:00+03')->'items', '[]'::jsonb,
  'Χωρίς fail (ο worker έπεσε): περιμένει να λήξει το κλείδωμα των 5′');

-- ───────────── Υγεία και «ξαναφτιάξε όλα» ─────────────
select is(public.knowledge_index_mark(true, null, now())->>'stuck', '0', 'Ουρά χωρίς κόλλημα');
select ok((select j.last_ok_at is not null and j.last_error is null from public.job_runs j where j.job = 'knowledge_index'),
  'Επιτυχής εκτέλεση στο job_runs');
update public.knowledge_index_queue set attempts = 5 where item_id = public.t_id('y');
select public.knowledge_index_mark(true, null, now() + interval '1 minute');
select ok((select j.last_error like 'Η μνήμη του Βοηθού κόλλησε: 1 στοιχεία%' from public.job_runs j where j.job = 'knowledge_index'),
  'Κολλημένη ουρά: σφάλμα στο job_runs (φαίνεται στην Υγεία)');

select is((public.knowledge_index_rebuild()->>'queued')::integer,
  (select count(*)::integer from public.knowledge_items i where i.status = 'published'), 'Η Διαχείριση ξαναβάζει όλα τα δημοσιευμένα');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok($$ select public.knowledge_index_rebuild() $$, 'Και το service_role');

-- ───────────── Κόστος AI ─────────────
select public.ai_usage_record('search', 'openai/text-embedding-3-small', 12, 0, 1, 'client');
select is((select u.cost_micros from public.ai_usage u where u.purpose = 'search'), 1::bigint, 'Η κλήση AI καταγράφεται');
select throws_ok($$ select public.ai_usage_record('other', 'm', 1, 0, 1, 'team') $$, '23514', null, 'Άγνωστος σκοπός απορρίπτεται');

select * from finish();
rollback;
