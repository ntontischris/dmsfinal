-- Υπογραφή μέσα στην εφαρμογή (b11): ο Χρήστης πελάτη υπογράφει την πρόταση από τη Σελίδα Συμφωνίας με τον κωδικό 6 ψηφίων,
-- και η κάρτα «Για υπογραφή» της Σήμερα. Πραγματική ροή: ο Ιδιοκτήτης γράφει και στέλνει την πρόταση από τα RPC.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι κλειστοί πίνακες διαβάζονται μόνο ως postgres.
begin;
select plan(41);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · b1 «Πλήρης» στον Πελάτη 1, ο Υπογράφων · b2 Πελάτης 1 χωρίς «Υπογράφει Συμφωνία»
-- b3 «Πλήρης» στον Πελάτη 2 · b4 «Πλήρης» στον Πελάτη 1, όχι Υπογράφων
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'sign@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'nosign@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@client-two.example.gr'),
  ('00000000-0000-0000-0000-0000000000b4', 'other@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com');
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a1', r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Κώστας Υπογράφων', 'sign@client-one.example.gr', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Βλέπει χωρίς υπογραφή (τεστ)', 'Τεστ: βλέπει Συμφωνίες, δεν υπογράφει.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.agreements', 'all' from public.roles r where r.name = 'Βλέπει χωρίς υπογραφή (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, true
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', 'Πλήρης'),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Λία', 'Βλέπει χωρίς υπογραφή (τεστ)'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος', 'Πλήρης'),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b4', 'Άρης', 'Πλήρης')
  ) as x (client_id, user_id, name, role_name)
  join public.roles r on r.name = x.role_name and r.kind = 'client';

insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο social',
       (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
insert into public.catalogue_items (id, kind, billing, name, name_en, unit) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαία Παρουσία', 'Monthly Presence', '');
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d1', 1300);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost)
values ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0);
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

-- ───────────── Βοηθητικά (ως postgres) ─────────────
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
-- Ο κωδικός και το token από τα εξερχόμενα, όπως τα βλέπει η ομάδα.
create function public.t_code(p_agreement uuid) returns text
language sql stable
as $$
  select v.code from public.agreement_outbox_view(p_agreement) v
   where v.kind = 'signing_code' and v.status = 'pending' order by v.created_at desc limit 1;
$$;
create function public.t_token(p_agreement uuid) returns text
language sql stable
as $$
  select substr(v.link_path, 4) from public.agreement_outbox_view(p_agreement) v
   where v.kind = 'proposal_link' and v.status = 'pending' order by v.created_at desc limit 1;
$$;

-- ───────────── Ο Ιδιοκτήτης στέλνει την πρόταση (Υπογράφων με κεφαλαία στο email: η σύγκριση αγνοεί πεζά/κεφαλαία) ─────────────
set local role authenticated;
select public.t_as('a1');
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000e1', 'monthly', null)::text, true);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a')::uuid,
  '[{"name":"Κώστας Υπογράφων","email":"SIGN@client-one.example.gr","is_signatory":true}]');
select lives_ok(format($$ select public.agreement_send(%L) $$, current_setting('t.a')), 'Ο Ιδιοκτήτης στέλνει την πρόταση');
select set_config('t.token', public.t_token(current_setting('t.a')::uuid), true);

-- ───────────── Άρνηση ─────────────
set local role anon;
select set_config('request.jwt.claims', '', true);
select throws_ok(format($$ select public.agreement_client_can_sign(%L) $$, current_setting('t.a')), '42501', null,
  'Ο ανώνυμος δεν ρωτά αν υπογράφει');
select throws_ok(format($$ select public.agreement_client_request_code(%L, 'Κ', true) $$, current_setting('t.a')), '42501', null,
  'Ο ανώνυμος δεν ζητά κωδικό ως Χρήστης πελάτη');
select throws_ok(format($$ select public.agreement_client_sign(%L, '123456') $$, current_setting('t.a')), '42501', null,
  'Ο ανώνυμος δεν υπογράφει ως Χρήστης πελάτη');
select is(public.agreement_public_request_code('όχι-token', 'Κ', true, '1.2.3.4') ->> 'status', 'unknown',
  'Ο Σύνδεσμος (περιτύλιγμα): άγνωστο token → unknown');

set local role authenticated;
select public.t_as('a1');
select throws_ok(format($$ select public.agreement_client_can_sign(%L) $$, current_setting('t.a')), '42501', null,
  'Η ομάδα δεν έχει υπογραφή Χρήστη πελάτη (ερώτηση)');
select throws_ok(format($$ select public.agreement_client_request_code(%L, 'Κ', true) $$, current_setting('t.a')), '42501', null,
  'Η ομάδα δεν ζητά κωδικό ως Χρήστης πελάτη');

select public.t_as('b2');
select is(public.agreement_client_can_sign(current_setting('t.a')::uuid), false,
  'Χωρίς «Υπογράφει Συμφωνία»: δεν υπογράφει εδώ (false, όχι σφάλμα)');
select throws_ok(format($$ select public.agreement_client_request_code(%L, 'Λία', true) $$, current_setting('t.a')), '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Υπογράφει Συμφωνία»: δεν ζητά κωδικό');
select throws_ok(format($$ select public.agreement_client_sign(%L, '123456') $$, current_setting('t.a')), '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Υπογράφει Συμφωνία»: δεν υπογράφει');

select public.t_as('b3');
select is(public.agreement_client_can_sign(current_setting('t.a')::uuid), false, 'Άλλος Πελάτης: δεν υπογράφει');
select is(public.agreement_client_request_code(current_setting('t.a')::uuid, 'Πάνος', true) ->> 'status', 'unknown',
  'Άλλος Πελάτης: η πρόταση δεν υπάρχει γι’ αυτόν');
select is(public.agreement_client_sign(current_setting('t.a')::uuid, '123456') ->> 'status', 'unknown',
  'Άλλος Πελάτης: ούτε υπογραφή');

select public.t_as('b4');
select is(public.agreement_client_can_sign(current_setting('t.a')::uuid), false, 'Ίδιος Πελάτης, άλλο email: δεν υπογράφει');
select is(public.agreement_client_request_code(current_setting('t.a')::uuid, 'Άρης', true) ->> 'status', 'not_signatory',
  'Ίδιος Πελάτης, άλλο email: not_signatory');

-- ───────────── Η κάρτα «Για υπογραφή» (ως postgres) ─────────────
reset role;
select is(authz.today_count_client_sign(public.t_uid('b1'), public.t_uid('c1'), now()), 1, 'Για υπογραφή: μία πρόταση για τον Υπογράφοντα');
select is((authz.today_items_client_sign(public.t_uid('b1'), public.t_uid('c1'), now()) -> 0 ->> 'id'), current_setting('t.a'),
  'Για υπογραφή: η πρόταση');
select is((authz.today_items_client_sign(public.t_uid('b1'), public.t_uid('c1'), now()) -> 0 ->> 'link'), '/app/agreements/' || current_setting('t.a'),
  'Για υπογραφή: πάει στη Σελίδα Συμφωνίας');
select is((authz.today_items_client_sign(public.t_uid('b1'), public.t_uid('c1'), now()) -> 0 ->> 'urgent')::boolean, false,
  'Για υπογραφή: δεν είναι επείγουσα όσο η Ισχύς απέχει');
update public.agreements set valid_until = (now() at time zone 'Europe/Athens')::date + 1 where id = current_setting('t.a')::uuid;
select is((authz.today_items_client_sign(public.t_uid('b1'), public.t_uid('c1'), now()) -> 0 ->> 'urgent')::boolean, true,
  'Για υπογραφή: επείγουσα όταν λήγει μέσα σε 2 ημέρες');
select is(authz.today_count_client_sign(public.t_uid('b4'), public.t_uid('c1'), now()), 0, 'Όχι Υπογράφων: καμία πρόταση');
select is(authz.today_count_client_sign(public.t_uid('b2'), public.t_uid('c1'), now()), null, 'Χωρίς «Υπογράφει Συμφωνία»: χωρίς κάρτα');
select throws_ok($$ select authz.today_items_client_sign(public.t_uid('b2'), public.t_uid('c1'), now()) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Υπογράφει Συμφωνία»: οι γραμμές 42501');
select is(authz.today_count_client_sign(public.t_uid('b3'), public.t_uid('c1'), now()), null, 'Άλλος Πελάτης: χωρίς κάρτα');
select is(authz.today_count_client_sign(public.t_uid('a1'), public.t_uid('c1'), now()), null, 'Η ομάδα: χωρίς κάρτα πελάτη');

-- ───────────── Ο Υπογράφων υπογράφει μέσα στην εφαρμογή ─────────────
set local role authenticated;
select public.t_as('b1');
select is((select (c ->> 'count')::integer from jsonb_array_elements(public.today_counts() -> 'cards') c where c ->> 'code' = 'client_sign'), 1,
  'Στη Σήμερα του Υπογράφοντα: «Για υπογραφή» 1');
select is(public.agreement_client_can_sign(current_setting('t.a')::uuid), true, 'Ο Υπογράφων υπογράφει εδώ');
select is(public.agreement_client_request_code(current_setting('t.a')::uuid, 'Κώστας Υπογράφων', false) ->> 'status', 'not_accepted',
  'Χωρίς «Αποδέχομαι» δεν στέλνεται κωδικός');
select set_config('t.rc', public.agreement_client_request_code(current_setting('t.a')::uuid, 'Κώστας Υπογράφων', true, '1.2.3.4')::text, true);
select is(current_setting('t.rc')::jsonb ->> 'status', 'sent', 'Ο κωδικός στάλθηκε');
select is(current_setting('t.rc')::jsonb ? 'code', false, 'Ο κωδικός δεν επιστρέφεται ποτέ στον πελάτη');

-- Τα όρια είναι ανά Σύνδεσμο, κοινά με τον Σύνδεσμο του email.
set local role anon;
select set_config('request.jwt.claims', '', true);
select is(public.agreement_public_request_code(current_setting('t.token'), 'Κώστας Υπογράφων', true, '1.2.3.4') ->> 'status', 'rate_limited',
  'Ο Σύνδεσμος μοιράζεται το όριο των 60″ με την εφαρμογή');

set local role authenticated;
select public.t_as('a1');
select set_config('t.code', public.t_code(current_setting('t.a')::uuid), true);
select is(current_setting('t.code') ~ '^[0-9]{6}$', true, 'Η ομάδα βλέπει τον κωδικό στα εξερχόμενα');

select public.t_as('b4');
select is(public.agreement_client_sign(current_setting('t.a')::uuid, current_setting('t.code')) ->> 'status', 'not_signatory',
  'Με τον σωστό κωδικό, άλλο email: δεν υπογράφει');

select public.t_as('b1');
select is(
  public.agreement_client_sign(current_setting('t.a')::uuid,
    case when current_setting('t.code') = '000000' then '000001' else '000000' end, '1.2.3.4', 'test') ->> 'status',
  'wrong_code', 'Λάθος κωδικός');
select is(public.agreement_client_sign(current_setting('t.a')::uuid, current_setting('t.code'), '1.2.3.4', 'e2e-agent') ->> 'status',
  'signed', 'Ο Υπογράφων υπογράφει με τον σωστό κωδικό');
select is(public.agreement_client_can_sign(current_setting('t.a')::uuid), false, 'Μετά την υπογραφή: τίποτα να υπογραφεί');
select is(public.agreement_client_request_code(current_setting('t.a')::uuid, 'Κώστας Υπογράφων', true) ->> 'status', 'signed',
  'Μετά την υπογραφή: νέος κωδικός → signed');

reset role;
select is((select a.state <> 'proposal' from public.agreements a where a.id = current_setting('t.a')::uuid), true,
  'Η πρόταση έγινε Συμφωνία');
select is(
  (select s.method || '|' || s.signed_name || '|' || s.user_agent || '|' || (l.recipient_email = 'SIGN@client-one.example.gr')::text
     from public.agreement_signatures s join public.agreement_links l on l.id = s.link_id
    where s.agreement_id = current_setting('t.a')::uuid),
  'link|Κώστας Υπογράφων|e2e-agent|true', 'Η υπογραφή γράφεται όπως του Συνδέσμου, με τον Σύνδεσμο του Υπογράφοντα');
select is(authz.today_count_client_sign(public.t_uid('b1'), public.t_uid('c1'), now()), 0, 'Μετά την υπογραφή: «Για υπογραφή» 0');
select is((select count(*)::integer from public.today_cards c where c.code = 'client_sign' and c.grp = 'client' and c.audience = 'client'), 1,
  'Η κάρτα «Για υπογραφή» είναι στο μητρώο του πελάτη');

select * from finish();
rollback;
