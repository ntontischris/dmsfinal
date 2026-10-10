-- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): άρνηση ανά ρόλο (Δικαίωμα πρώτα), κανόνες email, κλιμάκωση,
-- αποδοχή με τον σύνδεσμο (η πρόσβαση γράφεται μόνο στην claim), κλείδωμα ουράς, Χρήστες πελάτη με πολλούς Πελάτες,
-- ίχνος (κεφ. 1, ADR 0016, ADR 0018). Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(159);

-- ───────────── Βοηθητικά (ζουν μόνο μέσα στη συναλλαγή) ─────────────
-- Ο συνδεδεμένος Χρήστης. Η αλλαγή του sub γίνεται με set_config τοπικά στη συναλλαγή.
create function public.t_as(p_sub text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
end;
$$;

-- Κλειδώνει τη λειτουργία του service role: χωρίς sub, το auth.uid() είναι null.
create function public.t_service() returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
end;
$$;

-- Ο επιλεγμένος Πελάτης του συνδεδεμένου, όπως φαίνεται στη δημόσια συνάρτηση (η authz δεν είναι δοσμένη στον authenticated).
create function public.t_current_client() returns uuid
language sql stable
as $$
  select (x ->> 'clientId')::uuid
    from jsonb_array_elements(public.my_client_memberships()) x
   where (x ->> 'isCurrent')::boolean;
$$;

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Διαχείριση · e3 «Πελάτες μου» (access.clientUsers «mine», Υπεύθυνος του f1)
-- e4 Πωλήσεις · e5 Λογιστής · ee Παραγωγή (χωρίς Δικαίωμα πελάτη) · e6 Χρήστης πελάτη του f1 («Πλήρης»)
-- e7 Χρήστης πελάτη του f2 («Πλήρης») · e8 Χρήστης πελάτη και των δύο · e9 απενεργοποιημένος Χρήστης ομάδας
-- ea νέος (παίρνει πρόσκληση ομάδας) · eb Χρήστης πελάτη του f1 χωρίς Δικαιώματα · ec Χρήστης πελάτη του f1 («Συνάδελφος»)
-- ed νέος Χρήστης πελάτη (παίρνει πρόσκληση πελάτη) · ef νέος (ακυρωμένη πρόσκληση) · ea1 νέος (λήγει)
-- ea2 νέος (κλεμμένο email) · ea3 νέος με email «stolen»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'mine@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'kypseli@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'armyra@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'both@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'gone@example.com'),
  ('00000000-0000-0000-0000-0000000000ea', 'new@example.com'),
  ('00000000-0000-0000-0000-0000000000eb', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000ec', 'booker@example.com'),
  ('00000000-0000-0000-0000-0000000000ed', 'colleague@example.com'),
  ('00000000-0000-0000-0000-0000000000ee', 'prod@example.com'),
  ('00000000-0000-0000-0000-0000000000ef', 'cancel-me@example.com'),
  ('00000000-0000-0000-0000-0000000000a1', 'expire-me@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'other-ei@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'stolen@example.com');
update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-0000000000e6';

insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com', true),
  ('00000000-0000-0000-0000-0000000000e2', 'Νίκος', 'manager@example.com', true),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'mine@example.com', true),
  ('00000000-0000-0000-0000-0000000000e4', 'Πέτρος', 'sales@example.com', true),
  ('00000000-0000-0000-0000-0000000000e5', 'Κώστας', 'accountant@example.com', true),
  ('00000000-0000-0000-0000-0000000000ee', 'Παραγωγός', 'prod@example.com', true),
  ('00000000-0000-0000-0000-0000000000e9', 'Μαρία', 'gone@example.com', false);

-- Ρόλοι: της ομάδας για Εύρος και περιορισμούς, του πελάτη για Δικαιώματα. Ο «Πελάτες μου» έχει clients.manage για να είναι Υπεύθυνος.
insert into public.roles (name, kind) values
  ('Πελάτες μου', 'team'), ('Τιμολόγια', 'team'),
  ('Κράτηση', 'client'), ('Συνάδελφος', 'client'), ('Χωρίς δικαιώματα', 'client');
insert into public.role_permissions (role_id, permission, scope) values
  ((select r.id from public.roles r where r.name = 'Πελάτες μου' and r.kind = 'team'), 'access.clientUsers', 'mine'),
  ((select r.id from public.roles r where r.name = 'Πελάτες μου' and r.kind = 'team'), 'clients.manage', 'mine'),
  ((select r.id from public.roles r where r.name = 'Τιμολόγια' and r.kind = 'team'), 'finance.invoices', 'all'),
  ((select r.id from public.roles r where r.name = 'Κράτηση' and r.kind = 'client'), 'c.book', 'all'),
  ((select r.id from public.roles r where r.name = 'Συνάδελφος' and r.kind = 'client'), 'c.colleagues', 'all'),
  ((select r.id from public.roles r where r.name = 'Συνάδελφος' and r.kind = 'client'), 'c.book', 'all');

insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πελάτες μου'),
    ('00000000-0000-0000-0000-0000000000e4', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e5', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000ee', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e9', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Τα id των ρόλων που χρειάζονται τα τεστ, διαβάζονται τώρα (οι Ρόλοι φαίνονται μόνο στην ομάδα).
select set_config('t.role_kraten', (select r.id::text from public.roles r where r.name = 'Κράτηση' and r.kind = 'client'), true);
select set_config('t.role_full', (select r.id::text from public.roles r where r.system_key = 'client_full'), true);
select set_config('t.role_prod', (select r.id::text from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team'), true);

-- Πελάτες: f1 (Υπεύθυνος η Άννα, e3) · f2 (Υπεύθυνος ο Νίκος, e2).
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', null, 'Κώστας Αρμύρας', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000e2');

insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη',
    (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e8', 'Νίκος Οικονόμου',
    (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e8', 'Νίκος Οικονόμου',
    (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), false),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e7', 'Κώστας Αρμύρας',
    (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000eb', 'Γιάννης Κρίκος',
    (select r.id from public.roles r where r.name = 'Χωρίς δικαιώματα' and r.kind = 'client'), false),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000ec', 'Ελένη Βούρη',
    (select r.id from public.roles r where r.name = 'Συνάδελφος' and r.kind = 'client'), false);

-- ───────────── Δομή, Ίχνος και κανόνες ένα είδος ανά Χρήστη ─────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('client_users', 'invitations', 'email_outbox', 'email_log')),
  4, 'RLS ενεργό στους τέσσερις νέους πίνακες'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('client_users', 'invitations', 'email_outbox', 'email_log')),
  0, 'Κανένα policy: οι πίνακες είναι κλειστοί'
);
select ok(
  authz.audit_entity_allowed('invitations') and authz.audit_entity_allowed('client_users')
  and not authz.audit_entity_allowed('email_outbox') and not authz.audit_entity_allowed('email_log'),
  'Το Ίχνος δείχνει τις προσκλήσεις, αλλά το email μόνο στον Ιδιοκτήτη'
);
select ok(authz.audit_entity_allowed('access'), 'Το Ίχνος καταγράφει τα γεγονότα πρόσβασης');
select throws_ok(
  $$ insert into public.team_users (user_id, name, email) values ('00000000-0000-0000-0000-0000000000e6', 'Μαρία', 'kypseli@example.com') $$,
  'P0001', 'Ο Χρήστης είναι ήδη Χρήστης πελάτη· ένας Χρήστης ανήκει σε ένα μόνο είδος',
  'Χρήστης πελάτη δεν γίνεται Χρήστης ομάδας'
);
select throws_ok(
  $$ insert into public.client_users (client_id, user_id, name, role_id)
     values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', 'Νίκος',
             (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client')) $$,
  'P0001', 'Ο Χρήστης είναι ήδη Χρήστης ομάδας· ένας Χρήστης ανήκει σε ένα μόνο είδος',
  'Χρήστης ομάδας δεν γίνεται Χρήστης πελάτη'
);
select throws_ok(
  $$ insert into public.client_users (client_id, user_id, name, role_id)
     values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e4', 'Πέτρος',
             (select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')) $$,
  'P0001', 'Ένας Χρήστης πελάτη παίρνει μόνο Ρόλους πελάτη', 'Χρήστης πελάτη παίρνει μόνο Ρόλο πελάτη'
);

-- ───────────── Ανώνυμος: καμία κλήση ─────────────
set local role anon;
select throws_ok($$ select public.invitations_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει προσκλήσεις');
select throws_ok(
  $$ select public.invitation_create_team('Χ', 'anon@example.com', 'el', array[gen_random_uuid()]) $$,
  '42501', null, 'Ο ανώνυμος δεν προσκαλεί'
);
select throws_ok($$ select * from public.email_outbox_claim(5) $$, '42501', null, 'Ο ανώνυμος δεν παίρνει την ουρά email');

-- ───────────── Πωλήσεις και Λογιστής: άρνηση ─────────────
set local role authenticated;
select public.t_as('00000000-0000-0000-0000-0000000000e4');
select throws_ok(
  $$ select public.invitation_create_team('Χ', 'sales-try@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν προσκαλούν Χρήστες ομάδας'
);
select throws_ok($$ select public.invitations_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν προσκλήσεις ομάδας');
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Χ', 'sales-client@example.com', 'el', null) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν προσκαλούν Χρήστες πελάτη'
);
select throws_ok(
  $$ select public.email_outbox_enqueue('test', 'Χ', 'sales@example.com', 'el', '{}'::jsonb) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν στέλνουν δοκιμαστικό email'
);
select public.t_as('00000000-0000-0000-0000-0000000000e5');
select throws_ok(
  $$ select public.client_users_view('00000000-0000-0000-0000-0000000000f1') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν βλέπει Χρήστες πελάτη'
);

-- ───────────── Ιδιοκτήτης: προσκλήσεις ομάδας και κανόνες email ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select set_config('t.inv_new', public.invitation_create_team(
  'Νέος Χρήστης', 'new@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]
)::text, true);
select ok(current_setting('t.inv_new') is not null, 'Ο Ιδιοκτήτης προσκαλεί Χρήστη ομάδας');
select throws_ok(
  $$ select public.invitation_create_team('Πελάτης', 'kypseli@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]) $$,
  'P0001', 'Το email ανήκει σε Χρήστη πελάτη', 'Email Χρήστη πελάτη δεν προσκαλείται ως Χρήστης ομάδας'
);
select throws_ok(
  $$ select public.invitation_create_team('Απενεργοποιημένος', 'gone@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]) $$,
  'P0001', 'Υπάρχει απενεργοποιημένος Χρήστης με αυτό το email: κάνε Επανενεργοποίηση',
  'Email απενεργοποιημένου Χρήστη ομάδας ζητά Επανενεργοποίηση'
);
select throws_ok(
  $$ select public.invitation_create_team('Νίκος', 'manager@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]) $$,
  'P0001', 'Υπάρχει ήδη Χρήστης ομάδας με αυτό το email', 'Ενεργός Χρήστης ομάδας δεν προσκαλείται ξανά'
);
select throws_ok(
  $$ select public.invitation_create_team('Νέος Χρήστης', 'new@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]) $$,
  'P0001', 'Υπάρχει ήδη εκκρεμής πρόσκληση για αυτό το email', 'Μία εκκρεμής πρόσκληση ανά email'
);
select throws_ok(
  $$ select public.invitation_create_team('Χωρίς Ρόλο', 'norole@example.com', 'el', '{}'::uuid[]) $$,
  'P0001', 'Θέλει τουλάχιστον έναν Ρόλο', 'Η πρόσκληση θέλει έναν Ρόλο τουλάχιστον'
);
select throws_ok(
  $$ select public.invitation_create_team('Πελάτης', 'clientrole@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Κράτηση' and r.kind = 'client')]) $$,
  'P0001', 'Ο Ρόλος δεν υπάρχει ή δεν είναι Ρόλος ομάδας', 'Ρόλος πελάτη δεν δίνεται σε Χρήστη ομάδας'
);
select throws_ok(
  $$ select public.invitation_create_team('', 'noname@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]) $$,
  'P0001', 'Το ονοματεπώνυμο είναι υποχρεωτικό', 'Η πρόσκληση θέλει ονοματεπώνυμο'
);
select is(
  (select x->'invitedBy'->>'name' from jsonb_array_elements(public.invitations_view()) x where x->>'email' = 'new@example.com'),
  'Γιώργος', 'Η ομάδα βλέπει ποιος προσκάλεσε'
);
select set_config('t.inv_owner2', public.invitation_create_team(
  'Δεύτερος Ιδιοκτήτης', 'owner-two@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team')]
)::text, true);
select ok(current_setting('t.inv_owner2') is not null, 'Ο Ιδιοκτήτης προσκαλεί άλλον Ιδιοκτήτη');

-- ───────────── Διαχείριση: κλιμάκωση ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok(
  $$ select public.invitation_create_team('Λογιστής', 'tries@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Τιμολόγια' and r.kind = 'team')]) $$,
  '42501', 'Δεν μπορείς να δώσεις έναν από αυτούς τους Ρόλους', 'Η Διαχείριση δεν δίνει Ρόλο με Τιμολόγια'
);
select throws_ok(
  $$ select public.invitation_create_team('Ιδιοκτήτης', 'owner-try@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team')]) $$,
  '42501', 'Δεν μπορείς να δώσεις έναν από αυτούς τους Ρόλους', 'Η Διαχείριση δεν δίνει τον Ρόλο Ιδιοκτήτη'
);
select set_config('t.inv_granted', public.invitation_create_team(
  'Παραγωγός', 'granted@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]
)::text, true);
select ok(current_setting('t.inv_granted') is not null, 'Η Διαχείριση προσκαλεί με Ρόλο Παραγωγής');
select throws_ok($$ select public.email_log_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν βλέπει το ιστορικό email');

-- ───────────── Πελάτες μου (e3, Υπεύθυνος του f1): προσκλήσεις Χρηστών πελάτη ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e3');
select set_config('t.inv_colleague', public.invitation_create_client(
  '00000000-0000-0000-0000-0000000000f1', 'Κώστας Παπαδάκης', 'colleague@example.com', 'el', null
)::text, true);
select ok(current_setting('t.inv_colleague') is not null, 'Ο Υπεύθυνος του Πελάτη προσκαλεί Χρήστη πελάτη με Ρόλο «Πλήρης»');
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f2', 'Χ', 'nope@example.com', 'el', null) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Υπεύθυνος δεν προσκαλεί σε Πελάτη άλλου'
);
select throws_ok(
  $$ select public.invitation_create_client(gen_random_uuid(), 'Χ', 'ghost@example.com', 'el', null) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ανύπαρκτος Πελάτης δίνει το ίδιο σφάλμα με τον ξένο'
);
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Νίκος', 'manager@example.com', 'el', null) $$,
  'P0001', 'Το email ανήκει σε Χρήστη ομάδας', 'Χρήστης ομάδας δεν προσκαλείται ως Χρήστης πελάτη'
);
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Μαρία', 'kypseli@example.com', 'el', null) $$,
  'P0001', 'Ο Χρήστης είναι ήδη Χρήστης αυτού του Πελάτη', 'Μέλος του Πελάτη δεν προσκαλείται ξανά'
);
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Κώστας', 'colleague@example.com', 'el', null) $$,
  'P0001', 'Υπάρχει ήδη εκκρεμής πρόσκληση για αυτό το email', 'Μία εκκρεμής πρόσκληση ανά email και για Πελάτες'
);
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Χ', 'roleteam@example.com', 'el', (select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')) $$,
  'P0001', 'Ο Ρόλος δεν υπάρχει ή δεν είναι Ρόλος πελάτη', 'Ρόλος ομάδας δεν δίνεται σε Χρήστη πελάτη'
);
select set_config('t.inv_armyra', public.invitation_create_client(
  '00000000-0000-0000-0000-0000000000f1', 'Κώστας Αρμύρας', 'armyra@example.com', 'el', null
)::text, true);
select ok(current_setting('t.inv_armyra') is not null, 'Χρήστης πελάτη άλλου Πελάτη προσκαλείται σε δεύτερο Πελάτη');
select is(
  (select x->'roles'->0->>'name' from jsonb_array_elements(public.invitations_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'email' = 'colleague@example.com'),
  'Πλήρης', 'Η προεπιλογή του Ρόλου πελάτη είναι «Πλήρης»'
);
select is(
  (select x->>'existingUserId' from jsonb_array_elements(public.invitations_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'email' = 'armyra@example.com'),
  '00000000-0000-0000-0000-0000000000e7', 'Η ομάδα βλέπει ποιος λογαριασμός υπάρχει ήδη'
);
select is(
  jsonb_array_length(public.client_users_view('00000000-0000-0000-0000-0000000000f1')), 4,
  'Η ομάδα βλέπει τους τέσσερις Χρήστες του Πελάτη'
);
select ok(
  (select (x->>'lastSignInAt') is not null from jsonb_array_elements(public.client_users_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'userId' = '00000000-0000-0000-0000-0000000000e6'),
  'Η ομάδα βλέπει την τελευταία είσοδο Χρήστη πελάτη'
);
select throws_ok(
  $$ select public.client_users_view('00000000-0000-0000-0000-0000000000f2') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Υπεύθυνος του f1 δεν βλέπει Χρήστες του f2'
);
select throws_ok(
  $$ select public.client_users_view(gen_random_uuid()) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Υπεύθυνος δεν βλέπει ανύπαρκτο Πελάτη με άλλο μήνυμα'
);

-- ───────────── Χρήστης πελάτη του f1 (e6, «Πλήρης»): προσκαλεί συναδέλφους ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select throws_ok($$ select public.invitations_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Πελάτης δεν βλέπει προσκλήσεις ομάδας');
select is(jsonb_array_length(public.invitations_view('00000000-0000-0000-0000-0000000000f1')), 2, 'Ο Πελάτης βλέπει τις προσκλήσεις του Πελάτη του');
select is(
  (select jsonb_typeof(x->'invitedBy') from jsonb_array_elements(public.invitations_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'email' = 'colleague@example.com'),
  'null', 'Ο Πελάτης δεν βλέπει ποιος μέλος της ομάδας προσκάλεσε'
);
select is(
  (select jsonb_typeof(x->'existingUserId') from jsonb_array_elements(public.invitations_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'email' = 'armyra@example.com'),
  'null', 'Ο Πελάτης δεν βλέπει id λογαριασμών'
);
select throws_ok(
  $$ select public.invitations_view('00000000-0000-0000-0000-0000000000f2') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Πελάτης δεν βλέπει προσκλήσεις άλλου Πελάτη'
);
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f2', 'Χ', 'other@example.com', 'el', null) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Πελάτης δεν προσκαλεί στον Πελάτη άλλου'
);
select set_config('t.inv_peer', public.invitation_create_client(
  '00000000-0000-0000-0000-0000000000f1', 'Συνάδελφος', 'peer@example.com', 'el', null
)::text, true);
select ok(current_setting('t.inv_peer') is not null, 'Ο «Πλήρης» προσκαλεί συνάδελφο στον δικό του Πελάτη');
select is(jsonb_array_length(public.client_users_view('00000000-0000-0000-0000-0000000000f1')), 4, 'Ο Πελάτης βλέπει τους συναδέλφους του');
select is(
  (select jsonb_typeof(x->'lastSignInAt') from jsonb_array_elements(public.client_users_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'userId' = '00000000-0000-0000-0000-0000000000e6'),
  'null', 'Ο Πελάτης δεν βλέπει τελευταία είσοδο συναδέλφου'
);
select throws_ok(
  $$ select public.client_users_view('00000000-0000-0000-0000-0000000000f2') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Πελάτης δεν βλέπει συναδέλφους άλλου Πελάτη'
);
select lives_ok($$ select public.invitation_cancel(current_setting('t.inv_peer')::uuid) $$, 'Ο Πελάτης ακυρώνει πρόσκληση συναδέλφου');

-- ───────────── Συνάδελφος (ec, c.colleagues + c.book): κλιμάκωση Ρόλου πελάτη ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000ec');
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Χ', 'upgrade@example.com', 'el', null) $$,
  '42501', 'Δεν μπορείς να δώσεις Ρόλο με περισσότερα Δικαιώματα από τα δικά σου', 'Ο Συνάδελφος δεν δίνει Ρόλο «Πλήρης»'
);
select set_config('t.inv_ec', public.invitation_create_client(
  '00000000-0000-0000-0000-0000000000f1', 'Κράτηση', 'booker-invite@example.com', 'el', current_setting('t.role_kraten')::uuid
)::text, true);
select ok(current_setting('t.inv_ec') is not null, 'Ο Συνάδελφος δίνει Ρόλο όσα έχει');

-- ───────────── Χωρίς Δικαιώματα (eb): καμία πρόσκληση ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000eb');
select throws_ok(
  $$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Χ', 'nope2@example.com', 'el', null) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χρήστης πελάτη χωρίς c.colleagues δεν προσκαλεί'
);

-- ───────────── Παραγωγή (ee) και Λογιστής (e5): άρνηση σε όλες τις ενέργειες Χρηστών πελάτη ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000ee');
select throws_ok($$ select public.client_users_view('00000000-0000-0000-0000-0000000000f1') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν βλέπει Χρήστες πελάτη');
select throws_ok($$ select public.client_users_view(gen_random_uuid()) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν βλέπει τυχαίο Πελάτη με άλλο μήνυμα');
select throws_ok($$ select public.client_user_remove('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000eb') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν αφαιρεί Χρήστη πελάτη');
select throws_ok($$ select public.invitation_cancel(current_setting('t.inv_ec')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν ακυρώνει πρόσκληση πελάτη');
select throws_ok($$ select public.invitation_cancel(gen_random_uuid()) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν ακυρώνει τυχαία πρόσκληση με άλλο μήνυμα');
select throws_ok($$ select public.invitation_resend(current_setting('t.inv_ec')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν επαναστέλνει πρόσκληση πελάτη');
select throws_ok($$ select public.invitation_resend(gen_random_uuid()) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν επαναστέλνει τυχαία πρόσκληση με άλλο μήνυμα');
select throws_ok($$ select public.client_role_choices('00000000-0000-0000-0000-0000000000f1') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν βλέπει Ρόλους πελάτη');
select public.t_as('00000000-0000-0000-0000-0000000000e5');
select throws_ok($$ select public.client_user_remove('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000eb') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν αφαιρεί Χρήστη πελάτη');
select throws_ok($$ select public.invitation_cancel(current_setting('t.inv_ec')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν ακυρώνει πρόσκληση πελάτη');
select throws_ok($$ select public.invitation_resend(current_setting('t.inv_ec')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν επαναστέλνει πρόσκληση πελάτη');
select throws_ok($$ select public.client_role_choices('00000000-0000-0000-0000-0000000000f1') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν βλέπει Ρόλους πελάτη');

-- ───────────── Δικαιώματα Πελάτη και σύνδεση πολλών Πελατών ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select is(
  (select count(*)::int from public.my_permissions() where permission = 'c.book'), 1,
  'Ο «Πλήρης» έχει c.book στον επιλεγμένο Πελάτη'
);
select is(
  (select count(*)::int from public.my_permissions() where permission like 'c.%'), 9,
  'Ο Χρήστης πελάτη βλέπει τα Δικαιώματα πελάτη του'
);
select is((select scope from public.my_permissions() where permission = 'c.book'), 'all', 'Το Δικαίωμα πελάτη έχει Εύρος όλα');
select public.t_as('00000000-0000-0000-0000-0000000000eb');
select is(
  (select count(*)::int from public.my_permissions() where permission = 'c.book'), 0,
  'Χωρίς Δικαιώματα: δεν έχει c.book'
);
select public.t_as('00000000-0000-0000-0000-0000000000e4');
select is(
  (select count(*)::int from public.my_permissions() where permission = 'c.book'), 0,
  'Η ομάδα δεν παίρνει Δικαιώματα πελάτη'
);
select public.t_as('00000000-0000-0000-0000-0000000000e8');
select is(jsonb_array_length(public.my_client_memberships()), 2, 'Ο Χρήστης με δύο Πελάτες τους βλέπει και τους δύο');
select is(public.t_current_client(), '00000000-0000-0000-0000-0000000000f1'::uuid, 'Ο επιλεγμένος Πελάτης είναι ο τρέχων');
select lives_ok($$ select public.client_user_select('00000000-0000-0000-0000-0000000000f2') $$, 'Αλλαγή επιλεγμένου Πελάτη');
select is(public.t_current_client(), '00000000-0000-0000-0000-0000000000f2'::uuid, 'Μετά την εναλλαγή ισχύει ο νέος Πελάτης');
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select throws_ok(
  $$ select public.client_user_select('00000000-0000-0000-0000-0000000000f2') $$,
  'P0001', 'Δεν ανήκεις σε αυτόν τον Πελάτη', 'Δεν επιλέγεις Πελάτη που δεν σου ανήκει'
);
select public.t_as('00000000-0000-0000-0000-0000000000e8');
select lives_ok($$ select public.client_user_select('00000000-0000-0000-0000-0000000000f1') $$, 'Επιστροφή στον πρώτο Πελάτη');
reset role;
update public.client_users set is_current = false where user_id = '00000000-0000-0000-0000-0000000000e8';
set local role authenticated;
select public.t_as('00000000-0000-0000-0000-0000000000e8');
select is(public.t_current_client(), null::uuid, 'Με δύο Πελάτες και κανέναν επιλεγμένο δεν ισχύει κανένας');
reset role;
update public.client_users set is_current = true
 where user_id = '00000000-0000-0000-0000-0000000000e8' and client_id = '00000000-0000-0000-0000-0000000000f1';
set local role authenticated;

-- ───────────── Ρόλοι πελάτη για πρόσκληση (client_role_choices) ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select is(jsonb_array_length(public.client_role_choices('00000000-0000-0000-0000-0000000000f1')), 4, 'Ο «Πλήρης» βλέπει όλους τους Ρόλους πελάτη');
select public.t_as('00000000-0000-0000-0000-0000000000ec');
select is(jsonb_array_length(public.client_role_choices('00000000-0000-0000-0000-0000000000f1')), 3, 'Ο Συνάδελφος βλέπει μόνο όσους δεν ξεπερνούν τα δικά του');
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select is(jsonb_array_length(public.client_role_choices('00000000-0000-0000-0000-0000000000f1')), 4, 'Η ομάδα βλέπει όλους τους Ρόλους πελάτη');

-- ───────────── Αφαίρεση Χρήστη πελάτη ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select throws_ok(
  $$ select public.client_user_remove('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6') $$,
  'P0001', 'Δεν αφαιρείς τον εαυτό σου· γράψε στη Συνομιλία', 'Ο Χρήστης πελάτη δεν αφαιρεί τον εαυτό του'
);
select throws_ok(
  $$ select public.client_user_remove('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e7') $$,
  'P0001', 'Ο Χρήστης δεν ανήκει σε αυτόν τον Πελάτη', 'Αφαιρείς μόνο Χρήστη του ίδιου Πελάτη'
);
select is(
  ((public.client_user_remove('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000eb'))->>'deactivate'),
  'true', 'Η αφαίρεση του τελευταίου Πελάτη απενεργοποιεί τον λογαριασμό'
);
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select is(
  ((public.client_user_remove('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e8'))->>'deactivate'),
  'false', 'Η αφαίρεση από έναν Πελάτη δεν απενεργοποιεί όταν μένει σε άλλον'
);
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select is(jsonb_array_length(public.client_users_view('00000000-0000-0000-0000-0000000000f1')), 3, 'Μετά την αφαίρεση, ο Πελάτης έχει τρεις Χρήστες');

-- ───────────── Αποδοχή πρόσκλησης ομάδας: μόνο με τον σύνδεσμο ─────────────
select public.t_service();
set local role service_role;
select public.invitation_attach_user(current_setting('t.inv_new')::uuid, '00000000-0000-0000-0000-0000000000ea');
reset role;
select set_config('t.snap_user', (select coalesce(user_id::text, 'null') from public.invitations where id = current_setting('t.inv_new')::uuid), true);
select set_config('t.snap_before', (select count(*)::text from public.team_users where user_id = '00000000-0000-0000-0000-0000000000ea'), true);
set local role authenticated;
select is(current_setting('t.snap_user'), '00000000-0000-0000-0000-0000000000ea', 'Η αποστολή δίνει μόνο τον λογαριασμό στην πρόσκληση');
select is(current_setting('t.snap_before'), '0', 'Πριν την αποδοχή ο Χρήστης δεν είναι ακόμα μέλος της ομάδας');
select public.t_as('00000000-0000-0000-0000-0000000000ea');
select is(public.claim_invitation(), true, 'Ο νέος Χρήστης αποδέχεται την πρόσκληση με την πρώτη είσοδο');
select is(public.claim_invitation(), false, 'Η δεύτερη αποδοχή δεν αλλάζει τίποτα');
select is((select count(*)::int from public.my_permissions()) > 0, true, 'Μετά την αποδοχή ο Χρήστης έχει Δικαιώματα ομάδας');
reset role;
select set_config('t.snap_roles', (select count(*)::text from public.team_user_roles where user_id = '00000000-0000-0000-0000-0000000000ea'), true);
select set_config('t.snap_status', (select status from public.invitations where id = current_setting('t.inv_new')::uuid), true);
set local role authenticated;
select is(current_setting('t.snap_roles'), '1', 'Η αποδοχή δίνει τους Ρόλους της πρόσκλησης');
select is(current_setting('t.snap_status'), 'accepted', 'Η πρόσκληση μένει αποδεκτή');

select public.t_service();
set local role service_role;
select public.invitation_attach_user(current_setting('t.inv_colleague')::uuid, '00000000-0000-0000-0000-0000000000ed');
select public.t_as('00000000-0000-0000-0000-0000000000ed');
select is(public.claim_invitation(), true, 'Ο Χρήστης πελάτη αποδέχεται την πρόσκληση');
reset role;
select set_config('t.snap_current', (select is_current::text from public.client_users
  where client_id = '00000000-0000-0000-0000-0000000000f1' and user_id = '00000000-0000-0000-0000-0000000000ed'), true);
set local role authenticated;
select is(current_setting('t.snap_current'), 'true', 'Νέος Χρήστης πελάτη, χωρίς άλλον Πελάτη, γίνεται ο επιλεγμένος');

select public.t_service();
set local role service_role;
select public.invitation_attach_user(current_setting('t.inv_armyra')::uuid, '00000000-0000-0000-0000-0000000000e7');
select public.t_as('00000000-0000-0000-0000-0000000000e7');
select is(public.claim_invitation(), true, 'Ο Χρήστης που προστέθηκε σε δεύτερο Πελάτη αποδέχεται');
reset role;
select set_config('t.snap_current2', (select is_current::text from public.client_users
  where client_id = '00000000-0000-0000-0000-0000000000f1' and user_id = '00000000-0000-0000-0000-0000000000e7'), true);
set local role authenticated;
select is(current_setting('t.snap_current2'), 'false', 'Δεύτερος Πελάτης δεν αλλάζει τον επιλεγμένο');
select public.t_as('00000000-0000-0000-0000-0000000000e6');
select is(jsonb_array_length(public.client_users_view('00000000-0000-0000-0000-0000000000f1')), 5, 'Ο Πελάτης έχει πέντε Χρήστες μετά τις αποδοχές');

-- Ακυρωμένη και ληγμένη πρόσκληση δεν δίνουν πρόσβαση, ούτε με τον λογαριασμό που έχει συνδεθεί.
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select set_config('t.inv_cancel', public.invitation_create_team(
  'Ακυρωμένος', 'cancel-me@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]
)::text, true);
select set_config('t.inv_expire', public.invitation_create_team(
  'Ληγμένος', 'expire-me@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]
)::text, true);
select set_config('t.inv_stolen', public.invitation_create_team(
  'Κλεμμένο', 'stolen@example.com', 'el', array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')]
)::text, true);
select public.t_service();
set local role service_role;
select public.invitation_attach_user(current_setting('t.inv_cancel')::uuid, '00000000-0000-0000-0000-0000000000ef');
select public.invitation_attach_user(current_setting('t.inv_expire')::uuid, '00000000-0000-0000-0000-0000000000a1');
select public.invitation_attach_user(current_setting('t.inv_stolen')::uuid, '00000000-0000-0000-0000-0000000000a2');
set local role authenticated;
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ select public.invitation_cancel(current_setting('t.inv_cancel')::uuid) $$, 'Ο Ιδιοκτήτης ακυρώνει πρόσκληση που έχει ήδη δοθεί σε λογαριασμό');
reset role;
update public.invitations set expires_at = now() - interval '1 day' where id = current_setting('t.inv_expire')::uuid;
set local role authenticated;
select public.t_as('00000000-0000-0000-0000-0000000000ef');
select is(public.claim_invitation(), false, 'Η ακυρωμένη πρόσκληση δεν γίνεται πρόσβαση');
select is((select count(*)::int from public.my_permissions()), 0, 'Ο ακυρωμένος Χρήστης δεν έχει Δικαιώματα');
select public.t_as('00000000-0000-0000-0000-0000000000a1');
select is(public.claim_invitation(), false, 'Η ληγμένη πρόσκληση δεν γίνεται πρόσβαση');
select is((select count(*)::int from public.my_permissions()), 0, 'Ο Χρήστης με ληγμένη πρόσκληση δεν έχει Δικαιώματα');
select public.t_as('00000000-0000-0000-0000-0000000000a3');
select is(public.claim_invitation(), false, 'Άλλος λογαριασμός με το ίδιο email δεν παίρνει την πρόσκληση');
select public.t_as('00000000-0000-0000-0000-0000000000a2');
select is(public.claim_invitation(), true, 'Ο λογαριασμός που δόθηκε στην πρόσκληση την αποδέχεται');
reset role;
select set_config('t.snap_cancel', (select count(*)::text from public.team_users where user_id in ('00000000-0000-0000-0000-0000000000ef', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a3')), true);
set local role authenticated;
select is(current_setting('t.snap_cancel'), '0', 'Ακυρωμένη και ληγμένη πρόσκληση δεν γράφουν μέλος ομάδας');

-- ───────────── Επαναποστολή, ακύρωση, λήξη ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ select public.invitation_resend(current_setting('t.inv_granted')::uuid) $$, 'Ο Ιδιοκτήτης επαναστέλνει εκκρεμή πρόσκληση');
reset role;
select set_config('t.snap_resend', (select count(*)::text from public.email_outbox
  where kind = 'invite_resend' and payload ->> 'invitationId' = current_setting('t.inv_granted')), true);
set local role authenticated;
select is(current_setting('t.snap_resend'), '1', 'Η επαναποστολή γράφει μία γραμμή στην ουρά email');
select throws_ok(
  $$ select public.invitation_resend(current_setting('t.inv_new')::uuid) $$,
  'P0001', 'Η πρόσκληση δεν επαναστέλνεται', 'Η αποδεκτή πρόσκληση δεν επαναστέλνεται'
);
select throws_ok(
  $$ select public.invitation_resend('00000000-0000-0000-0000-0000000000f2'::uuid) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η επαναποστολή ανύπαρκτης πρόσκλησης δίνει το ίδιο σφάλμα'
);
select throws_ok(
  $$ select public.invitation_cancel('00000000-0000-0000-0000-0000000000f2'::uuid) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η ακύρωση ανύπαρκτης πρόσκλησης δίνει το ίδιο σφάλμα'
);
select public.t_as('00000000-0000-0000-0000-0000000000e4');
select throws_ok(
  $$ select public.invitation_cancel(current_setting('t.inv_granted')::uuid) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν ακυρώνουν πρόσκληση ομάδας'
);
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$ select public.invitation_cancel(current_setting('t.inv_granted')::uuid) $$, 'Ο Ιδιοκτήτης ακυρώνει εκκρεμή πρόσκληση');
select set_config('t.inv_granted2', public.invitation_create_team('Παραγωγός', 'granted@example.com', 'el',
  array[(select r.id from public.roles r where r.name = 'Παραγωγή' and r.kind = 'team')])::text, true);
select ok(current_setting('t.inv_granted2') is not null, 'Μετά την ακύρωση το email προσκαλείται ξανά');

-- Η ληγμένη πρόσκληση Ιδιοκτήτη: η Διαχείριση δεν την επαναστέλνει με Ρόλο που δεν μπορεί να δώσει.
reset role;
update public.invitations set expires_at = now() - interval '1 day' where id = current_setting('t.inv_owner2')::uuid;
set local role authenticated;
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select public.invitations_view();
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok(
  $$ select public.invitation_resend(current_setting('t.inv_owner2')::uuid) $$,
  '42501', 'Δεν μπορείς να δώσεις έναν από αυτούς τους Ρόλους', 'Η Διαχείριση δεν επαναστέλνει πρόσκληση Ιδιοκτήτη'
);
reset role;
select set_config('t.snap_owner2', (select status from public.invitations where id = current_setting('t.inv_owner2')::uuid), true);
set local role authenticated;
select is(current_setting('t.snap_owner2'), 'expired', 'Η αποτυχημένη επαναποστολή αφήνει την πρόσκληση ληγμένη');

select public.t_as('00000000-0000-0000-0000-0000000000e1');
reset role;
update public.invitations set expires_at = now() - interval '1 day' where id = current_setting('t.inv_ec')::uuid;
set local role authenticated;
select is(
  (select x->>'status' from jsonb_array_elements(public.invitations_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'email' = 'booker-invite@example.com'),
  'expired', 'Η λήγουσα πρόσκληση εμφανίζεται ως ληγμένη'
);
select lives_ok($$ select public.invitation_resend(current_setting('t.inv_ec')::uuid) $$, 'Η ληγμένη πρόσκληση επαναστέλνεται');
select is(
  (select x->>'status' from jsonb_array_elements(public.invitations_view('00000000-0000-0000-0000-0000000000f1')) x where x->>'email' = 'booker-invite@example.com'),
  'pending', 'Μετά την επαναποστολή η πρόσκληση είναι εκκρεμής'
);

-- ───────────── Ουρά email και ιστορικό ─────────────
select set_config('t.mail1', public.email_outbox_enqueue('test', 'Γιώργος', 'owner@example.com', 'el', '{}'::jsonb)::text, true);
select set_config('t.mail2', public.email_outbox_enqueue('test', 'Γιώργος', 'owner@example.com', 'el', '{}'::jsonb)::text, true);
select set_config('t.mail3', public.email_outbox_enqueue('test', 'Γιώργος', 'owner@example.com', 'el', '{}'::jsonb)::text, true);
select ok(current_setting('t.mail1') is not null, 'Ο Ιδιοκτήτης στέλνει δοκιμαστικό email στον εαυτό του');
select throws_ok(
  $$ select public.email_outbox_enqueue('test', 'Χ', 'stranger@example.com', 'el', '{}'::jsonb) $$,
  'P0001', 'Το δοκιμαστικό email πάει μόνο στον λογαριασμό σου', 'Το δοκιμαστικό email δεν πάει σε τρίτους'
);
select throws_ok(
  $$ select public.email_outbox_enqueue('invite_resend', 'Χ', 'owner@example.com', 'el', '{}'::jsonb) $$,
  'P0001', 'Το δοκιμαστικό email πάει μόνο στον λογαριασμό σου', 'Ο Ιδιοκτήτης δεν βάζει άλλο είδος στην ουρά'
);
select throws_ok($$ select public.email_outbox_done(current_setting('t.mail1')::uuid, true) $$, '42501', null, 'Ο Ιδιοκτήτης δεν καταγράφει αποστολές');
select throws_ok($$ select * from public.email_outbox_claim(5) $$, '42501', null, 'Ο Ιδιοκτήτης δεν παίρνει την ουρά');
select throws_ok(
  $$ select public.email_log_record('invite', 'x@example.com', 'Θέμα', 'sent', '', '') $$,
  '42501', null, 'Η ομάδα δεν γράφει στο ιστορικό απευθείας'
);
select throws_ok($$ select public.invitation_attach_user(current_setting('t.inv_colleague')::uuid, '00000000-0000-0000-0000-0000000000ed') $$, '42501', null, 'Η προσθήκη λογαριασμού είναι μόνο για τον worker');
select throws_ok($$ select public.invitation_create_signatory(gen_random_uuid()) $$, '42501', null, 'Η πρόσκληση Υπογράφοντα είναι μόνο για τον worker');
select throws_ok($$ select public.invitation_fail(gen_random_uuid(), 'x') $$, '42501', null, 'Η αποτυχία αποστολής είναι μόνο για τον worker');
select throws_ok($$ select public.auth_user_id_by_email('kypseli@example.com') $$, '42501', null, 'Το id λογαριασμού με email είναι μόνο για τον worker');

reset role;
select set_config('t.snap_audit', (select count(*)::text from public.audit_log
  where entity = 'access' and after ->> 'event' = 'team_invited'), true);
set local role authenticated;
select ok(current_setting('t.snap_audit')::int >= 1, 'Τα γεγονότα πρόσβασης γράφονται στο Ίχνος');

-- Ο worker: παίρνει την ουρά· η δεύτερη παραλαβή αμέσως μετά δεν βρίσκει τίποτα (κλείδωμα).
select public.t_service();
set local role service_role;
select is((select count(*)::int from public.email_outbox_claim(10)), 5, 'Ο worker παίρνει τα εκκρεμή μηνύματα');
select is((select count(*)::int from public.email_outbox_claim(10)), 0, 'Η δεύτερη παραλαβή αμέσως μετά δεν παίρνει κλειδωμένα μηνύματα');
select public.email_outbox_done(current_setting('t.mail1')::uuid, true, 'Δοκιμαστικό', '', 're_123', false);
select public.email_outbox_done(current_setting('t.mail2')::uuid, false, 'Δοκιμαστικό', 'εκτός λίστας', '', true);
reset role;
update public.email_outbox set attempts = 5 where id = current_setting('t.mail3')::uuid;
set local role service_role;
select public.email_outbox_done(current_setting('t.mail3')::uuid, false, 'Δοκιμαστικό', 'boom', '', false);
select public.email_log_record('invite', 'x@example.com', 'Θέμα', 'sent', 'msg_1', '');
select throws_ok(
  $$ select public.email_log_record('invite', 'x@example.com', 'Θέμα', 'bogus', '', '') $$,
  'P0001', 'Άγνωστη κατάσταση αποστολής', 'Το ιστορικό δέχεται μόνο γνωστές καταστάσεις'
);
reset role;
select set_config('t.s_mail1', (select status from public.email_outbox where id = current_setting('t.mail1')::uuid), true);
select set_config('t.s_mail2', (select status from public.email_outbox where id = current_setting('t.mail2')::uuid), true);
select set_config('t.s_mail3', (select status from public.email_outbox where id = current_setting('t.mail3')::uuid), true);
select set_config('t.s_flag', (select email_sender_connected::text from public.agreement_defaults), true);
select set_config('t.s_log', (select count(*)::text from public.email_log), true);
set local role authenticated;
select is(current_setting('t.s_mail1'), 'sent', 'Η επιτυχής αποστολή μένει καταγεγραμμένη ως στάλθηκε');
select is(current_setting('t.s_mail2'), 'suppressed', 'Η αποστολή εκτός λίστας μπλοκάρεται');
select is(current_setting('t.s_mail3'), 'failed', 'Μετά από πέντε αποτυχίες το μήνυμα μένει αποτυχημένο');
select is(current_setting('t.s_flag'), 'true', 'Η πρώτη πραγματική αποστολή σηκώνει το flag του πάροχου');
select is(current_setting('t.s_log'), '4', 'Κάθε αποφασισμένη αποστολή έχει γραμμή στο ιστορικό');

-- Ιδιοκτήτης: ιστορικό. Οι υπόλοιποι δεν το βλέπουν, ούτε στο Ίχνος.
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select is(jsonb_array_length(public.email_log_view()), 4, 'Ο Ιδιοκτήτης βλέπει το ιστορικό αποστολών');
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$ select public.email_log_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν βλέπει το ιστορικό');
select is((select count(*)::int from public.audit_log where entity = 'email_log'), 0, 'Η Διαχείριση με Ίχνος δεν βλέπει γραμμές του ιστορικού email');
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select ok((select count(*) from public.audit_log where entity = 'email_log') > 0, 'Ο Ιδιοκτήτης βλέπει τις γραμμές του ιστορικού email στο Ίχνος');

-- ───────────── Διαχείριση προς Χρήστες ομάδας: ενεργοποίηση και απενεργοποίηση ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select lives_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000ee', false) $$, 'Η Διαχείριση απενεργοποιεί Χρήστη ομάδας');
reset role;
select set_config('t.snap_deact', (select count(*)::text from public.audit_log where entity = 'access'
  and entity_id = '00000000-0000-0000-0000-0000000000ee' and after ->> 'event' = 'user_deactivated'), true);
set local role authenticated;
select is(current_setting('t.snap_deact'), '1', 'Η απενεργοποίηση γράφει γεγονός');
select public.t_as('00000000-0000-0000-0000-0000000000e4');
select throws_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000ee', true) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν ενεργοποιούν Χρήστες');
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000e1', false) $$, 'P0001', 'Δεν απενεργοποιείς τον εαυτό σου', 'Ο Ιδιοκτήτης δεν απενεργοποιεί τον εαυτό του');
select public.t_as('00000000-0000-0000-0000-0000000000e2');
select lives_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000ee', true) $$, 'Η επανενεργοποίηση γίνεται με το ίδιο Δικαίωμα');
reset role;
select set_config('t.snap_react', (select count(*)::text from public.audit_log where entity = 'access'
  and entity_id = '00000000-0000-0000-0000-0000000000ee' and after ->> 'event' = 'user_reactivated'), true);
set local role authenticated;
select is(current_setting('t.snap_react'), '1', 'Η επανενεργοποίηση γράφει γεγονός');

-- ───────────── Μηνύματα Υπογράφοντα και ανάκτηση λογαριασμού (worker): μόνο service role ─────────────
select public.t_service();
set local role service_role;
select throws_ok(
  $$ select public.invitation_create_signatory(gen_random_uuid()) $$,
  'P0001', 'Η Συμφωνία δεν έχει Υπογράφοντα', 'Η Συμφωνία χωρίς Υπογράφοντα δεν γεννά πρόσκληση'
);
select is(public.client_invite_target(gen_random_uuid()), null::jsonb, 'Άγνωστη Συμφωνία δεν έχει Υπογράφοντα');
select is(public.auth_user_id_by_email('kypseli@example.com'), '00000000-0000-0000-0000-0000000000e6'::uuid, 'Ο worker βρίσκει το id λογαριασμού με email');
select lives_ok($$ select public.invitation_fail(current_setting('t.inv_granted2')::uuid, 'boom') $$, 'Ο worker κλείνει πρόσκληση που απέτυχε');
reset role;
select set_config('t.snap_fail', (select status || '|' || error from public.invitations where id = current_setting('t.inv_granted2')::uuid), true);
set local role authenticated;
select is(current_setting('t.snap_fail'), 'cancelled|boom', 'Η αποτυχημένη αποστολή κλείνει με το σφάλμα');

-- ───────────── Μετονομασία του Ρόλου «Πλήρης» δεν σπάει τη ροή ─────────────
reset role;
update public.roles set name = 'Πλήρης δοκιμή' where system_key = 'client_full';
set local role authenticated;
select public.t_as('00000000-0000-0000-0000-0000000000e3');
select lives_ok($$ select public.invitation_create_client('00000000-0000-0000-0000-0000000000f1', 'Μετονομασία', 'rename-test@example.com', 'el', null) $$, 'Η πρόσκληση Πελάτη βρίσκει τον Ρόλο με το σταθερό κλειδί');
reset role;
update public.roles set name = 'Πλήρης' where system_key = 'client_full';
select set_config('t.snap_rename', (select (role_ids[1] = current_setting('t.role_full')::uuid)::text from public.invitations where email = 'rename-test@example.com'), true);
set local role authenticated;
select is(current_setting('t.snap_rename'), 'true', 'Ο Ρόλος της πρόσκλησης είναι ο ίδιος μετά τη μετονομασία');
reset role;
select throws_ok(
  $$ delete from public.roles where system_key = 'client_full' $$,
  'P0001', 'Ο Ρόλος «Πλήρης» είναι ο Ρόλος της αυτόματης πρόσκλησης και δεν διαγράφεται',
  'Ο Ρόλος «Πλήρης» δεν διαγράφεται'
);
set local role authenticated;

select * from finish();
rollback;
