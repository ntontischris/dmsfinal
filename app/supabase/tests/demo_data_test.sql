-- Δεδομένα επίδειξης (δέσμη Δ1–Δ6): γέμισμα και σβήσιμο με τον κατάλογο public.demo_rows.
-- Οι γραμμές του γεμίσματος υπολογίζονται από τη «σήμερα» της βάσης (sales_today), άρα το τεστ δεν εξαρτάται από τη μέρα.
-- Το ίδιο τρέχουν και οι έλεγχοι χρονισμών (automations_scan με now()). Όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(39);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή · a3 Πωλήσεις · b1 λογαριασμός πελάτη (μπαίνει στον πρώτο Πελάτη επίδειξης)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client.example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Βοηθητικά (ως postgres) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Πλήθος γραμμών κάθε πίνακα του public (εκτός από το Ίχνος, που δεν σβήνεται ποτέ).
create function public.t_counts() returns table (t text, n bigint)
language plpgsql
as $$
declare
  v_rel text;
begin
  for v_rel in
    select c.relname::text from pg_class c join pg_namespace s on s.oid = c.relnamespace
     where s.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'audit_log' order by 1
  loop
    t := v_rel;
    execute format('select count(*) from public.%I', v_rel) into n;
    return next;
  end loop;
end;
$$;

-- Ο μετρητής μιας κάρτας του Σήμερα για τον τρέχοντα Χρήστη.
create function public.t_card(p_code text) returns integer
language sql
as $$ select (c ->> 'count')::integer from jsonb_array_elements(public.today_counts() -> 'cards') c where c ->> 'code' = p_code; $$;

create temp table t_before as select * from public.t_counts();

-- ───────────── Δικαιώματα ─────────────
select ok(not has_function_privilege('anon', 'public.demo_seed(date, text[])', 'execute'), 'anon δεν γεμίζει');
select ok(not has_function_privilege('authenticated', 'public.demo_seed(date, text[])', 'execute'), 'authenticated δεν γεμίζει');
select ok(not has_function_privilege('anon', 'public.demo_purge(boolean)', 'execute'), 'anon δεν σβήνει');
select ok(not has_function_privilege('authenticated', 'public.demo_purge(boolean)', 'execute'), 'authenticated δεν σβήνει');
select ok(not has_table_privilege('anon', 'public.demo_rows', 'select'), 'anon δεν διαβάζει τον κατάλογο');
select ok(not has_table_privilege('authenticated', 'public.demo_rows', 'select'), 'authenticated δεν διαβάζει τον κατάλογο');

-- ───────────── Γέμισμα ─────────────
select is(public.demo_purge(), '{}'::jsonb, 'σβήσιμο χωρίς δεδομένα επίδειξης: τίποτα');
select lives_ok($$ select public.demo_seed(public.sales_today(), array['B1@client.example.com']) $$, 'γέμισμα');
select ok((select count(*) from public.demo_rows) > 400, 'ο κατάλογος έχει όλες τις γραμμές');
select throws_ok($$ select public.demo_seed() $$, 'P0001', null, 'δεύτερο γέμισμα: άρνηση');
select is((select count(*)::integer from public.clients c
            where exists (select 1 from public.demo_rows d where d.table_name = 'clients' and d.row_id = c.id::text)
              and c.contact_email not like '%@example.invalid'), 0, 'email πελατών μόνο @example.invalid');
select is((select count(*)::integer from public.invoices i
            where exists (select 1 from public.demo_rows d where d.table_name = 'invoices' and d.row_id = i.id::text)
              and i.number not like 'DEMO-%'), 0, 'Τιμολόγια επίδειξης μόνο με DEMO-');
select is((select count(*)::integer from public.client_users cu where cu.user_id = '00000000-0000-0000-0000-0000000000b1'), 1,
          'ο λογαριασμός πελάτη μπήκε στον πρώτο Πελάτη');

-- Πληρότητα: ό,τι διαβάζουν οι οθόνες με inner join.
select is((select count(*)::integer from public.productions p
            where exists (select 1 from public.demo_rows d where d.table_name = 'productions' and d.row_id = p.id::text)
              and not exists (select 1 from public.production_costs c where c.production_id = p.id)), 0,
          'κάθε Παραγωγή έχει εκτίμηση κόστους');
select is((select count(*)::integer from public.agreements a
            where exists (select 1 from public.demo_rows d where d.table_name = 'agreements' and d.row_id = a.id::text)
              and (not exists (select 1 from public.agreement_amounts m where m.agreement_id = a.id)
                   or not exists (select 1 from public.agreement_baselines b where b.agreement_id = a.id))), 0,
          'κάθε Συμφωνία έχει ποσά και βάση');
select ok((select count(*) from public.filmings f
            where f.state = 'scheduled' and (f.starts_at at time zone 'Europe/Athens')::date = public.sales_today()) >= 2,
          'Γυρίσματα σήμερα');

-- Οι οθόνες έχουν περιεχόμενο: το Σήμερα του Ιδιοκτήτη και του πελάτη, και λίστες.
select public.t_as('a1');
select ok(public.t_card('week_filming') > 0, 'Σήμερα: Γυρίσματα της εβδομάδας');
select ok(public.t_card('filming_approvals') > 0, 'Σήμερα: κρατήσεις για έγκριση');
select ok(public.t_card('next_steps_due') > 0, 'Σήμερα: Επόμενα βήματα που πέρασαν');
select ok(public.t_card('proposal_approvals') > 0, 'Σήμερα: προτάσεις για Έγκριση');
select ok(public.t_card('unassigned') > 0, 'Σήμερα: χωρίς υπεύθυνο');
select ok(public.t_card('my_deliverables') > 0, 'Σήμερα: Παραδοτέα');
select ok(public.t_card('overdue_invoices') > 0, 'Σήμερα: ληξιπρόθεσμα');
select ok(public.t_card('to_invoice') > 0, 'Σήμερα: προς τιμολόγηση');
select ok(public.t_card('unread_messages') > 0, 'Σήμερα: αδιάβαστα Μηνύματα');
select ok(public.filmings_view('open', 100)::text like '%"id"%', 'λίστα Γυρισμάτων');
select public.t_as('b1');
select ok(public.t_card('client_waiting') > 0, 'πελάτης: περιμένει την έγκρισή σου');
select ok(public.t_card('client_owes') > 0, 'πελάτης: υπόλοιπο');
select set_config('request.jwt.claims', '', true);

-- ───────────── Κανένα email, καμία ουρά Google ─────────────
select public.automations_scan(now());
select public.events_process();
select is((select count(*)::integer from public.email_outbox where status = 'pending'), 0,
          'οι έλεγχοι χρονισμών δεν βάζουν email από δεδομένα επίδειξης');
select is((select count(*)::integer from public.agreement_outbox where status = 'pending'), 0, 'καμία πρόταση σε αναμονή');
insert into public.email_outbox (kind, to_email, payload) values ('test', 'someone@example.invalid', '{}');
select is((select status from public.email_outbox where to_email = 'someone@example.invalid'), 'cancelled',
          'email προς @example.invalid γεννιέται ακυρωμένο');
delete from public.email_outbox where to_email = 'someone@example.invalid';
insert into public.google_outbox (entity, entity_id, op)
select 'filming', d.row_id::uuid, 'upsert' from public.demo_rows d where d.table_name = 'filmings' limit 1;
select is((select count(*)::integer from public.google_outbox), 0, 'Γύρισμα επίδειξης δεν μπαίνει στην ουρά Google');

-- ───────────── Σβήσιμο ─────────────
-- Κάτι πραγματικό σε Πελάτη επίδειξης: σταματά το σβήσιμο, εκτός αν ζητηθεί μαζί.
insert into public.messages (client_id, author_id, author_kind, body)
select d.row_id::uuid, '00000000-0000-0000-0000-0000000000a1', 'team', 'Πραγματικό μήνυμα σε Πελάτη επίδειξης'
  from public.demo_rows d join public.clients c on c.id::text = d.row_id where d.table_name = 'clients' order by c.name limit 1;
select throws_ok($$ select public.demo_purge(false) $$, 'P0001', null, 'πραγματικό Μήνυμα σε Πελάτη επίδειξης: σταματά');
-- Πραγματικό Άρθρο σε Ενότητα επίδειξης (κοινόχρηστη): σταματά πάντα.
insert into public.knowledge_items (section_id, kind, title, body_md)
select d.row_id::uuid, 'article', 'Πραγματικό άρθρο', 'Κείμενο' from public.demo_rows d where d.table_name = 'knowledge_sections';
select throws_ok($$ select public.demo_purge(true) $$, 'P0001', null, 'πραγματικό Άρθρο σε Ενότητα επίδειξης: σταματά πάντα');
delete from public.knowledge_items where title = 'Πραγματικό άρθρο';
select lives_ok($$ select public.demo_purge(true) $$, 'σβήσιμο μαζί με όσα μπήκαν σε δεδομένα επίδειξης');
select is((select count(*)::integer from public.demo_rows), 0, 'ο κατάλογος άδειασε');
select is((select count(*)::integer from (select * from public.t_counts() except select * from t_before) x), 0,
          'κάθε πίνακας έχει όσες γραμμές είχε πριν (καμία παραπάνω)');
select is((select count(*)::integer from (select * from t_before except select * from public.t_counts()) x), 0,
          'κάθε πίνακας έχει όσες γραμμές είχε πριν (καμία λιγότερη)');
select is((select count(*)::integer from public.client_users), 0, 'ο λογαριασμός πελάτη βγήκε από τον Πελάτη επίδειξης');

select * from finish();
rollback;
