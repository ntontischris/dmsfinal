-- Σήμερα Σα #180: μητρώο καρτών, πλήθη, μία κάρτα, Προσαρμογή, Υγεία και Ετοιμότητα.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Τα πλήθη παίρνουν σταθερό p_now.
begin;
select plan(53);

-- ───────────── Σύμβαση μητρώου (για κάθε γραμμή, και όσες προσθέσουν τα Σβ–Σε) ─────────────
select is(
  (select count(*)::integer
     from public.today_cards c
     cross join lateral (values (c.count_fn, 'today_count_' || c.code, 'integer'::regtype),
                                (c.items_fn, 'today_items_' || c.code, 'jsonb'::regtype)) f (fn, name, ret)
     join pg_catalog.pg_proc p on p.oid = f.fn
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where not (n.nspname = 'authz' and p.proname = f.name and p.prorettype = f.ret and p.prosecdef
               and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_uid uuid, p_client uuid, p_now timestamp with time zone'
               and 'search_path=""' = any (coalesce(p.proconfig, '{}'))
               and not pg_catalog.has_function_privilege('authenticated', p.oid, 'execute')
               and not pg_catalog.has_function_privilege('anon', p.oid, 'execute'))),
  0, 'Κάθε κάρτα: authz.today_count_/today_items_<code>, (p_uid, p_client, p_now), security definer, κλειστές');
select ok((select count(*) from public.today_cards c where c.code in ('health', 'readiness')) = 2,
  'Οι κάρτες Υγεία και Ετοιμότητα είναι στο μητρώο');
-- Οι κάρτες άλλων κομματιών ελέγχονται στα δικά τους τεστ (εδώ, μέσα στη συναλλαγή, μένουν μόνο Υγεία και Ετοιμότητα).
delete from public.today_cards where code not in ('health', 'readiness');

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (χωρίς health.view και settings.manage) · b1 Χρήστης πελάτη (Πλήρης) του Πελάτη 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', true, null);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com',
   '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Μόνο οι κάρτες αυτού του τεστ (Υγεία, Ετοιμότητα, t_*): τα Σβ–Σε προσθέτουν δικές τους, με δικά τους τεστ.
create function public.t_codes(p jsonb) returns text[]
language sql immutable
as $$ select coalesce(array_agg(c ->> 'code' order by n), '{}') from jsonb_array_elements(p -> 'cards') with ordinality x (c, n)
       where c ->> 'code' in ('health', 'readiness') or c ->> 'code' like 't\_%'; $$;

create function public.t_hidden(p jsonb) returns text[]
language sql immutable
as $$ select coalesce(array_agg(c ->> 'code' order by n), '{}') from jsonb_array_elements(p -> 'cards') with ordinality x (c, n)
       where (c ->> 'hidden')::boolean and (c ->> 'code' in ('health', 'readiness') or c ->> 'code' like 't\_%'); $$;

create function public.t_card(p jsonb, p_code text) returns jsonb
language sql immutable
as $$ select c from jsonb_array_elements(p -> 'cards') c where c ->> 'code' = p_code; $$;

-- Κάρτες μόνο για το τεστ: μία για δεύτερο άνθρωπο, μία πελάτη, μία που αποτυγχάνει.
create function authz.today_count_t_solo(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language sql as $$ select case when p_client is null and authz.user_is_team(p_uid) then 1 end; $$;
create function authz.today_count_t_client(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language sql as $$ select case when p_client is not null then 2 end; $$;
create function authz.today_count_t_new(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language sql as $$ select case when p_client is null then 0 end; $$;
create function authz.today_count_t_boom(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql as $$ begin raise exception 'boom'; end; $$;
create function authz.today_count_t_deny(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql as $$ begin raise exception 'Δεν έχεις Δικαίωμα' using errcode = '42501'; end; $$;
create function authz.today_items_t(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language sql as $$ select '[]'::jsonb; $$;

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn, needs_second_person)
values
  ('t_solo', 'decide', 'action', 'team', 150, 'Χωρίς υπεύθυνο', 'Unassigned', '/app/unassigned',
   'authz.today_count_t_solo(uuid, uuid, timestamptz)', 'authz.today_items_t(uuid, uuid, timestamptz)', true),
  ('t_client', 'client', 'action', 'client', 600, 'Περιμένουν εσένα', 'Waiting for you', '/app',
   'authz.today_count_t_client(uuid, uuid, timestamptz)', 'authz.today_items_t(uuid, uuid, timestamptz)', false);

-- ───────────── Ανώνυμος, κλειστοί πίνακες και συναρτήσεις ─────────────
set local role anon;
select throws_ok($$ select public.today_counts() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τη Σήμερα');
select throws_ok($$ select public.today_card('health') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει κάρτα');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.today_cards $$, '42501', null, 'Ο πίνακας today_cards είναι κλειστός');
select throws_ok($$ select * from public.today_prefs $$, '42501', null, 'Ο πίνακας today_prefs είναι κλειστός');
select throws_ok($$ select authz.today_count_health(auth.uid(), null, now()) $$, '42501', null,
  'Οι συναρτήσεις κάρτας δεν καλούνται απευθείας');
select lives_ok($$ select public.today_counts() $$, 'Ως authenticated: τα πλήθη φορτώνουν');
select throws_ok($$ select public.today_card('nope') $$, '42501', null, 'Ως authenticated: άγνωστη κάρτα 42501');
reset role;
-- Πελάτης άλλου Πελάτη: τα RPC δεν δέχονται Πελάτη ως όρισμα· ο Πελάτης είναι πάντα ο τρέχων του θεατή
-- (authz.client_user_client_id), άρα δεν υπάρχει τρόπος να ζητηθεί κάρτα άλλου Πελάτη.

-- ───────────── Ποιος βλέπει ποιες κάρτες ─────────────
select public.t_as('a1');
select is(public.t_codes(public.today_counts(timestamptz '2026-03-03 10:00+00')), array['health', 'readiness', 't_solo'],
  'Ιδιοκτήτης: Υγεία, Ετοιμότητα και η κάρτα δεύτερου ανθρώπου, στην κοινή σειρά');
select is((public.t_card(public.today_counts(timestamptz '2026-03-03 10:00+00'), 'health') ->> 'count')::integer, 0,
  'Υγεία χωρίς προβλήματα: 0, αλλά η κάρτα υπάρχει');
select is((public.t_card(public.today_counts(timestamptz '2026-03-03 10:00+00'), 'readiness') ->> 'count')::integer,
  (select count(*)::integer from authz.readiness_items() r where not r.done), 'Ετοιμότητα: τα εκκρεμή βήματα');
select is(public.today_counts() ->> 'customized', 'false', 'Χωρίς Προτιμήσεις: προεπιλογή');
select is(public.today_counts() ->> 'unread_notifications', '0', 'Καμία αδιάβαστη Ειδοποίηση');

select is(authz.today_count_health('00000000-0000-0000-0000-0000000000a2', null, now()), null,
  'Χωρίς health.view: null');
select is(authz.today_count_readiness('00000000-0000-0000-0000-0000000000a2', null, now()), null,
  'Χωρίς settings.manage: null');
select public.t_as('a2');
select is(public.t_codes(public.today_counts()), array['t_solo'], 'Παραγωγή: ούτε Υγεία ούτε Ετοιμότητα');
select throws_ok($$ select public.today_card('health') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Μη επιτρεπτή κάρτα: 42501');
select throws_ok($$ select public.today_card('nope') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Άγνωστη κάρτα: 42501 με το ίδιο μήνυμα');

select public.t_as('b1');
select is(public.t_codes(public.today_counts()), array['t_client'], 'Ο πελάτης βλέπει μόνο κάρτες πελάτη');
select throws_ok($$ select public.today_card('health') $$, '42501', null, 'Ο πελάτης δεν ανοίγει την Υγεία');
select is(public.today_card('t_client') ->> 'count', '2', 'Ο πελάτης ανοίγει τη δική του κάρτα');
select public.t_as('a1');
select throws_ok($$ select public.today_card('t_client') $$, '42501', null, 'Η ομάδα δεν ανοίγει κάρτα πελάτη');

-- ───────────── Ένας άνθρωπος (κανόνας 8) ─────────────
select is(public.today_card('t_solo') ->> 'count', '1', 'Με δύο Χρήστες ομάδας: η κάρτα δεύτερου ανθρώπου ανοίγει');
update public.team_users set is_active = false, deactivated_at = now() where user_id = '00000000-0000-0000-0000-0000000000a2';
select is(public.t_codes(public.today_counts()), array['health', 'readiness'], 'Με έναν Χρήστη ομάδας: χωρίς t_solo');
select throws_ok($$ select public.today_card('t_solo') $$, '42501', null, 'Με έναν Χρήστη ομάδας: 42501');
update public.team_users set is_active = true, deactivated_at = null where user_id = '00000000-0000-0000-0000-0000000000a2';

-- ───────────── Υγεία με προβλήματα ─────────────
insert into public.email_outbox (id, kind, to_email, status, attempts, last_error, handled_at, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', 'test', 'owner@example.com', 'failed', 5, 'Bounce',
   timestamptz '2026-03-02 10:00+00', timestamptz '2026-03-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f2', 'test', 'owner@example.com', 'failed', 5, 'Bounce',
   timestamptz '2026-03-01 10:00+00', timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f3', 'test', 'owner@example.com', 'failed', 5, 'Bounce',
   timestamptz '2026-02-01 10:00+00', timestamptz '2026-02-01 10:00+00');
insert into public.email_outbox (kind, to_email, retry_of) values ('test', 'owner@example.com', '00000000-0000-0000-0000-0000000000f2');
insert into public.job_runs (job, last_ok_at, last_error) values ('outbox', timestamptz '2026-03-03 09:00+00', 'Timeout');
select is((public.t_card(public.today_counts(timestamptz '2026-03-03 10:00+00'), 'health') ->> 'count')::integer, 2,
  'Υγεία: η εργασία που δεν έτρεξε και η αποστολή που δεν ξαναστάλθηκε (όχι η ξαναστάλμένη ούτε η παλιά)');
select is(public.today_card('health', timestamptz '2026-03-03 10:00+00') -> 'items' -> 0 ->> 'id', 'job:outbox',
  'Πρώτα η εργασία');
select is((select count(*)::integer from jsonb_array_elements(public.today_card('health', timestamptz '2026-03-03 10:00+00') -> 'items') i
            where (i ->> 'urgent')::boolean), 2, 'Κάθε κόκκινο της Υγείας είναι επείγον');
select is(public.today_card('health', timestamptz '2026-03-03 10:00+00') -> 'items' -> 1 ->> 'link', '/app/settings/sends?tab=failed',
  'Η αποτυχημένη αποστολή οδηγεί στα «Απέτυχαν»');

select ok(not (public.today_card('readiness') -> 'items' -> 0 ? 'title'), 'Ετοιμότητα: μόνο κωδικοί, οι ετικέτες στην εφαρμογή');
select is(public.today_card('readiness') -> 'items' -> 0 ->> 'id',
  (select x.item from authz.readiness_items() x where not x.done
    order by array_position(authz.today_readiness_order(), x.item) limit 1),
  'Ετοιμότητα: τα βήματα στη σειρά της O7');

-- ───────────── Υγεία: μόνο οι Πελάτες που βλέπει ο θεατής ─────────────
-- a3: health.view + clients.view «mine» (και clients.manage «mine», που χρειάζεται για να είναι Υπεύθυνος), Υπεύθυνος του Πελάτη 2. Βλέπει την αποτυχία του Πελάτη 2, όχι του Πελάτη 1.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a3', 'health@example.com');
insert into public.team_users (user_id, name, email, is_active, deactivated_at)
values ('00000000-0000-0000-0000-0000000000a3', 'Ελένη', 'health@example.com', true, null);
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Υγεία και δικοί μου Πελάτες (τεστ)', 'Τεστ: health.view και clients.view mine.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, x.perm, x.scope from public.roles r
 cross join (values ('health.view', 'all'), ('clients.view', 'mine'), ('clients.manage', 'mine')) x (perm, scope)
 where r.name = 'Υγεία και δικοί μου Πελάτες (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a3', r.id from public.roles r where r.name = 'Υγεία και δικοί μου Πελάτες (τεστ)';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a3');
insert into public.email_outbox (id, kind, to_email, status, attempts, last_error, handled_at, created_at) values
  ('00000000-0000-0000-0000-0000000000f4', 'test', 'one@example.com', 'failed', 5, 'Bounce',
   timestamptz '2026-03-02 11:00+00', timestamptz '2026-03-02 11:00+00'),
  ('00000000-0000-0000-0000-0000000000f5', 'test', 'two@example.com', 'failed', 5, 'Bounce',
   timestamptz '2026-03-02 12:00+00', timestamptz '2026-03-02 12:00+00');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, email_outbox_id, client_id)
select a.id, x.case_key, x.recipient, 'email', x.outbox::uuid, x.client::uuid
  from (select id from public.automations order by id limit 1) a
 cross join (values ('t:f4', 'one@example.com', '00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c1'),
                    ('t:f5', 'two@example.com', '00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c2'))
       x (case_key, recipient, outbox, client);
select is(authz.today_count_health('00000000-0000-0000-0000-0000000000a1', null, timestamptz '2026-03-03 10:00+00'), 4,
  'Ιδιοκτήτης: και οι δύο αποτυχίες Πελατών');
select is(authz.today_count_health('00000000-0000-0000-0000-0000000000a3', null, timestamptz '2026-03-03 10:00+00'), 3,
  'health.view με clients.view mine: όχι η αποτυχία Πελάτη που δεν βλέπει');
select is(authz.today_items_health('00000000-0000-0000-0000-0000000000a3', null, timestamptz '2026-03-03 10:00+00') -> 0 ->> 'id',
  'job:outbox', 'Πρώτα η εργασία και για τον a3');
update public.google_calendar set calendar_id = 'cal@example.com', last_sync_at = timestamptz '2026-03-03 08:00+00' where id;
select is((select i ->> 'link' from jsonb_array_elements(authz.today_items_health('00000000-0000-0000-0000-0000000000a1', null,
            timestamptz '2026-03-03 10:00+00')) i where i ->> 'id' = 'google'), '/app/settings/integrations',
  'Google: ο Ιδιοκτήτης πηγαίνει στις Ενσωματώσεις');
select is((select i ->> 'link' from jsonb_array_elements(authz.today_items_health('00000000-0000-0000-0000-0000000000a3', null,
            timestamptz '2026-03-03 10:00+00')) i where i ->> 'id' = 'google'), '/app/settings/sends',
  'Google: οι άλλοι πηγαίνουν στο Ιστορικό αποστολών');
delete from public.automation_sends where case_key in ('t:f4', 't:f5');
delete from public.email_outbox where id in ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f5');
update public.google_calendar set calendar_id = null, last_sync_at = null where id;
update public.team_users set is_active = false, deactivated_at = now() where user_id = '00000000-0000-0000-0000-0000000000a3';

-- ───────────── Προτιμήσεις ─────────────
select lives_ok($$ select public.today_prefs_set(array['t_solo', 'health', 'readiness', 'zzz'], array['readiness', 'zzz']) $$,
  'Αποθήκευση σειράς και κρυφών');
select is(public.t_codes(public.today_counts()), array['t_solo', 'health', 'readiness'], 'Η σειρά του Χρήστη');
select is(public.t_hidden(public.today_counts()), array['readiness'], 'Η κρυφή κάρτα σημειώνεται, δεν χάνεται');
select is(public.today_counts() ->> 'customized', 'true', 'Με Προτιμήσεις');
select is((select p.card_order from public.today_prefs p where p.user_id = '00000000-0000-0000-0000-0000000000a1'),
  array['t_solo', 'health', 'readiness'], 'Ο άγνωστος κωδικός αγνοείται');

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('t_new', 'work', 'action', 'team', 1, 'Νέα κάρτα', 'New card', '/app',
   'authz.today_count_t_new(uuid, uuid, timestamptz)', 'authz.today_items_t(uuid, uuid, timestamptz)');
select is(public.t_codes(public.today_counts()), array['t_solo', 'health', 'readiness', 't_new'],
  'Νέα κάρτα μπαίνει στο τέλος της σειράς του Χρήστη');

select lives_ok($$ select public.today_prefs_reset() $$, 'Επαναφορά προεπιλογής');
select is(public.t_codes(public.today_counts()), array['t_new', 'health', 'readiness', 't_solo'], 'Μετά την επαναφορά: η κοινή σειρά');
select is(public.t_hidden(public.today_counts()), '{}'::text[], 'Μετά την επαναφορά: καμία κρυφή');

select public.t_as('b1');
select public.today_prefs_set(array['health', 't_client'], array['health']);
select is((select p.card_order || p.hidden from public.today_prefs p where p.user_id = '00000000-0000-0000-0000-0000000000b1'),
  array['t_client'], 'Ο πελάτης αποθηκεύει μόνο κάρτες που βλέπει');

-- ───────────── Κάρτα που αποτυγχάνει δεν ρίχνει τη σελίδα ─────────────
select public.t_as('a1');
insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('t_boom', 'work', 'action', 'team', 2, 'Χαλασμένη', 'Broken', '/app',
   'authz.today_count_t_boom(uuid, uuid, timestamptz)', 'authz.today_items_t(uuid, uuid, timestamptz)');
select is(public.t_card(public.today_counts(), 't_boom') ->> 'failed', 'true', 'Η κάρτα που απέτυχε σημειώνεται failed');
select is(public.t_codes(public.today_counts()), array['t_new', 't_boom', 'health', 'readiness', 't_solo'],
  'Οι υπόλοιπες κάρτες μετρούν κανονικά');

-- Κάρτα που αρνείται μέσα στη συνάρτηση (42501): παραλείπεται σαν null, και δεν αποθηκεύεται στις Προτιμήσεις.
insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('t_deny', 'work', 'action', 'team', 3, 'Χωρίς Δικαίωμα', 'Denied', '/app',
   'authz.today_count_t_deny(uuid, uuid, timestamptz)', 'authz.today_items_t(uuid, uuid, timestamptz)');
select is(public.t_codes(public.today_counts()), array['t_new', 't_boom', 'health', 'readiness', 't_solo'],
  'Η κάρτα που ρίχνει 42501 δεν εμφανίζεται');
select public.today_prefs_set(array['t_deny', 'health'], array['t_deny']);
select is((select p.card_order || p.hidden from public.today_prefs p where p.user_id = '00000000-0000-0000-0000-0000000000a1'),
  array['health'], 'Η κάρτα που ρίχνει 42501 δεν θεωρείται επιτρεπτή στις Προτιμήσεις');
select throws_ok($$ select public.today_card('t_deny') $$, '42501', null, 'Ούτε ανοίγει');

-- ───────────── Μετά το «Άνοιγμα σε πελάτες» η Ετοιμότητα φεύγει ─────────────
alter table public.system_state disable trigger system_state_guard;
update public.system_state set opened_at = now() where id;
select is(public.t_card(public.today_counts(), 'readiness'), null, 'Μετά το άνοιγμα: χωρίς κάρτα Ετοιμότητας');

select * from finish();
rollback;
