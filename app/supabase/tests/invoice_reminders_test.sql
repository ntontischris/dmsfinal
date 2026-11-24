-- Τ4: «Στείλε υπενθύμιση» για ληξιπρόθεσμο Τιμολόγιο. Άρνηση ανά ρόλο, προεπισκόπηση, αποστολή μέσω του Αυτοματισμού
-- «Ληξιπρόθεσμο», υπενθυμίσεις στο Ίχνος (μόνο με «Βλέπει το Ίχνος»), μία ανά 24 ώρες, όχι για Πιστωτικό, όχι χωρίς επαφή
-- με email, όχι με κλειστό Αυτοματισμό.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(27);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a3 Πωλήσεις · a5 βλέπει Οικονομικά και ποσά, δεν καταχωρεί Τιμολόγια · b1 Χρήστης πελάτη Α «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-4000-8000-0000000000a5', 'viewer@example.com'),
  ('00000000-0000-4000-8000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-4000-8000-0000000000a5', 'Θέμης', 'viewer@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-4000-8000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-4000-8000-0000000000a3', 'Πωλήσεις'))
       as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Οικονομικά μόνο ανάγνωση (τεστ)', 'Τεστ: βλέπει ποσά, δεν καταχωρεί Τιμολόγια.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, p.permission, 'all'
  from public.roles r, (values ('finance.view'), ('finance.amounts')) as p (permission)
 where r.name = 'Οικονομικά μόνο ανάγνωση (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-4000-8000-0000000000a5'::uuid, r.id from public.roles r where r.name = 'Οικονομικά μόνο ανάγνωση (τεστ)';

-- Πελάτης Α (με Χρήστη πελάτη) και Πελάτης Β (χωρίς κανέναν).
insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-4000-8000-0000000000a3'),
  ('00000000-0000-4000-8000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-4000-8000-0000000000a3');
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

-- Βοηθητικά των τεστ (ως postgres): «ανεβάζει» PDF και καταχωρεί Τιμολόγιο με ρητή λήξη.
create function public.t_pdf() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_path text := 'pending/' || gen_random_uuid()::text || '.pdf';
begin
  insert into storage.objects (bucket_id, name) values ('invoices', v_path);
  return v_path;
end;
$$;
grant execute on function public.t_pdf() to authenticated;

create function public.t_reg(
  p_client uuid, p_kind text, p_number text, p_issue date, p_net numeric, p_vat numeric, p_total numeric,
  p_credit uuid default null, p_due date default null
) returns uuid
language sql
as $$
  select (public.invoice_register(jsonb_build_object(
    'clientId', p_client, 'kind', p_kind, 'number', p_number, 'issueDate', p_issue, 'dueDate', p_due,
    'net', p_net, 'vat', p_vat, 'total', p_total, 'creditFor', p_credit, 'pdfPath', public.t_pdf()
  ))->>'id')::uuid;
$$;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-4000-8000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Δεδομένα: A-1 ληξιπρόθεσμο (Πελάτης Α), Π-1 πιστωτικό του, B-1 ληξιπρόθεσμο (Πελάτης Β, χωρίς επαφή).
select public.t_as('a1');
select set_config('t.a1', public.t_reg('00000000-0000-4000-8000-0000000000c1', 'invoice', 'A-1', date '2026-03-01',
                                       1000, 240, 1240, null, date '2026-03-16')::text, true);
select set_config('t.cr', public.t_reg('00000000-0000-4000-8000-0000000000c1', 'credit', 'Π-1', date '2026-03-05',
                                       100, 24, 124, current_setting('t.a1')::uuid, null)::text, true);
select set_config('t.b1', public.t_reg('00000000-0000-4000-8000-0000000000c2', 'invoice', 'B-1', date '2026-03-01',
                                       500, 120, 620, null, date '2026-03-16')::text, true);

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.invoice_reminder_preview(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Ο ανώνυμος δεν βλέπει την υπενθύμιση');
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Ο ανώνυμος δεν στέλνει υπενθύμιση');
select throws_ok($$ select public.invoice_reminders(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Ο ανώνυμος δεν βλέπει τις υπενθυμίσεις');
reset role;

select public.t_as('b1');
select throws_ok($$ select public.invoice_reminder_preview(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Ο Χρήστης πελάτη δεν βλέπει την υπενθύμιση');
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Ο Χρήστης πελάτη δεν στέλνει υπενθύμιση');
select throws_ok($$ select public.invoice_reminders(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Ο Χρήστης πελάτη δεν βλέπει τις υπενθυμίσεις');

select public.t_as('a3');
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Οι Πωλήσεις δεν στέλνουν υπενθύμιση');
select throws_ok($$ select public.invoice_reminders(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Οι Πωλήσεις δεν βλέπουν τις υπενθυμίσεις');

select public.t_as('a5');
select throws_ok($$ select public.invoice_reminder_preview(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Όποιος δεν καταχωρεί Τιμολόγια δεν βλέπει την υπενθύμιση');
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Όποιος δεν καταχωρεί Τιμολόγια δεν στέλνει υπενθύμιση');
select throws_ok($$ select public.invoice_reminders(current_setting('t.a1')::uuid) $$, '42501', null,
                 'Όποιος βλέπει ποσά αλλά όχι το Ίχνος δεν βλέπει τις υπενθυμίσεις');

-- ───────────── Προεπισκόπηση ─────────────
select public.t_as('a1');
select is(public.invoice_reminder_preview(current_setting('t.a1')::uuid) -> 'recipients',
          '[{"name":"Κώστας","email":"k1@client-a.example.gr"}]'::jsonb,
          'Παραλήπτης: ο Χρήστης πελάτη, όπως στην αυτόματη υπενθύμιση');
select ok(public.invoice_reminder_preview(current_setting('t.a1')::uuid) ->> 'subject' like '%A-1%',
          'Το θέμα γράφει τον αριθμό του Τιμολογίου');
select ok(public.invoice_reminder_preview(current_setting('t.a1')::uuid) ->> 'body' like '%Κώστας%1.116%',
          'Το κείμενο έχει όνομα και υπόλοιπο μετά το πιστωτικό');
select ok(public.invoice_reminder_preview(current_setting('t.a1')::uuid) ->> 'lastAt' is null,
          'Καμία υπενθύμιση ακόμα');

-- ───────────── Αποστολή ─────────────
select is(public.invoice_reminder_send(current_setting('t.a1')::uuid) ->> 'sent', '1', 'Φεύγει ένα email');
select is((public.invoice_reminders(current_setting('t.a1')::uuid) -> 0) - 'at',
          '{"manual":true,"byName":"Γιώργος","recipients":1}'::jsonb,
          'Η υπενθύμιση γράφεται στο Ίχνος: με το χέρι, από ποιον, σε πόσους');
select ok(public.invoice_reminder_preview(current_setting('t.a1')::uuid) ->> 'lastAt' is not null,
          'Η προεπισκόπηση δείχνει πότε έφυγε η τελευταία');

-- ───────────── Μία ανά 24 ώρες ─────────────
select throws_like($$ select public.invoice_reminder_send(current_setting('t.a1')::uuid) $$,
                   'Στάλθηκε υπενθύμιση πριν από λίγο (στις %). Ξαναδοκίμασε αύριο.',
                   'Δεύτερο πάτημα στο ίδιο δευτερόλεπτο: «στάλθηκε πριν από λίγο», όχι «δεν έχει επαφή»');
select ok(public.invoice_reminder_preview(current_setting('t.a1')::uuid) ->> 'recentAt' is not null,
          'Η προεπισκόπηση ξέρει ότι έφυγε υπενθύμιση τις τελευταίες 24 ώρες');
reset role;
update public.automation_sends set created_at = created_at - interval '25 hours'
 where case_key like 'invoice.overdue:' || current_setting('t.a1') || ':manual:%';
select public.t_as('a1');
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.a1')::uuid) $$, 'P0001',
                 'Η υπενθύμιση δεν μπήκε στην ουρά (ίσως έφυγε ήδη). Δες το Ίχνος.',
                 'Ίδια περίπτωση ήδη στην ουρά: «δεν μπήκε στην ουρά», όχι «δεν έχει επαφή»');

-- ───────────── Όχι για Πιστωτικό, όχι χωρίς επαφή ─────────────
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.cr')::uuid) $$, 'P0001',
                 'Υπενθύμιση στέλνεται μόνο για ληξιπρόθεσμο Τιμολόγιο', 'Όχι για Πιστωτικό');
select is(jsonb_array_length(public.invoice_reminder_preview(current_setting('t.b1')::uuid) -> 'recipients'), 0,
          'Πελάτης χωρίς επαφή: η προεπισκόπηση δεν έχει παραλήπτες');
select throws_ok($$ select public.invoice_reminder_send(current_setting('t.b1')::uuid) $$, 'P0001',
                 'Ο Πελάτης δεν έχει επαφή με email για τα Οικονομικά', 'Πελάτης χωρίς επαφή: δεν φεύγει τίποτα');
select is(jsonb_array_length(public.invoice_reminders(current_setting('t.b1')::uuid)), 0,
          'Πελάτης χωρίς επαφή: καμία υπενθύμιση στο Ίχνος');

-- ───────────── Κλειστός Αυτοματισμός ─────────────
reset role;
update public.automations set is_enabled = false
 where event_type = 'invoice.overdue' and channel = 'email' and recipient_kind = 'relative' and recipient_relative = 'client';
select public.t_as('a1');
select ok(not (public.invoice_reminder_preview(current_setting('t.b1')::uuid) ->> 'isEnabled')::boolean,
          'Κλειστός Αυτοματισμός: η προεπισκόπηση το λέει');
select throws_like($$ select public.invoice_reminder_send(current_setting('t.b1')::uuid) $$,
                   'Ο Αυτοματισμός «Ληξιπρόθεσμο» είναι κλειστός%',
                   'Κλειστός Αυτοματισμός: δεν φεύγει υπενθύμιση ούτε με το χέρι');

select * from finish();
rollback;
