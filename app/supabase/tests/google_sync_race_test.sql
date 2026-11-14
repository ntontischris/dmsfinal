-- Google Calendar (c14): γραμμή της ουράς που αντικαταστάθηκε ενώ ο worker έγραφε στο Google.
-- Η αντικατεστημένη γραμμή δεν γράφει αντιστοίχιση· άρα η διαγραφή που ακολουθεί έρχεται χωρίς eventId και
-- ο worker σβήνει το σταθερό id (uuid χωρίς παύλες) ώστε να μη μείνει ορφανό γεγονός στο Google.
-- Φανταστικά στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com');
insert into public.team_users (user_id, name, email) values ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com');
insert into public.productions (id, title, owner_id)
values ('00000000-0000-0000-0000-0000000000a1', 'Εσωτερική Παραγωγή', '00000000-0000-0000-0000-0000000000e1');

-- ───────────── Δικαιώματα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.google_outbox_claim(5) $$, '42501', null, 'Ο Χρήστης δεν παίρνει την ουρά του worker');
select throws_ok($$ select public.google_outbox_done(1, 'ev', 'etag', null) $$, '42501', null, 'Ο Χρήστης δεν γράφει αποτέλεσμα');
reset role;

-- ───────────── Η σειρά ─────────────
update public.google_calendar set calendar_id = 'cal-test@group.calendar.google.com' where id;
insert into public.filmings (id, production_id, starts_at, hours, origin, state)
values ('00000000-0000-0000-0000-00000000f0a1', '00000000-0000-0000-0000-0000000000a1',
        ((now() at time zone 'Europe/Athens')::date + 9 + time '10:00') at time zone 'Europe/Athens', 2, 'team', 'scheduled');
select set_config('t.first', (select min(id)::text from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f0a1'), true);
select is((select op from public.google_outbox where id = current_setting('t.first')::bigint), 'upsert', 'Νέο Γύρισμα μπαίνει στην ουρά για εγγραφή');

-- Ο worker πήρε τη γραμμή· στο μεταξύ το Γύρισμα αλλάζει και η γραμμή αντικαθίσταται.
update public.filmings set starts_at = starts_at + interval '1 hour' where id = '00000000-0000-0000-0000-00000000f0a1';
select ok((select done_at is not null from public.google_outbox where id = current_setting('t.first')::bigint), 'Η αλλαγή κλείνει την παλιά γραμμή');

set local role service_role;
select public.google_outbox_done(current_setting('t.first')::bigint, '00000000000000000000000000000f0a1', 'etag-1', null);
reset role;
select is((select count(*)::int from public.google_links where entity_id = '00000000-0000-0000-0000-00000000f0a1'), 0,
          'Η αντικατεστημένη γραμμή δεν γράφει αντιστοίχιση, ακόμα κι αν το γεγονός γράφτηκε στο Google');

-- Ακύρωση πριν γραφτεί η νεότερη γραμμή: η διαγραφή έρχεται χωρίς eventId.
update public.filmings set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Ακύρωση δοκιμής'
 where id = '00000000-0000-0000-0000-00000000f0a1';
update public.google_outbox set done_at = now() where done_at is null and entity_id <> '00000000-0000-0000-0000-00000000f0a1';

set local role service_role;
select set_config('t.claim', public.google_outbox_claim(10)::text, true);
reset role;
select is(jsonb_array_length(current_setting('t.claim')::jsonb), 1, 'Μένει μία ανοιχτή γραμμή');
select is(current_setting('t.claim')::jsonb -> 0 ->> 'op', 'delete', 'Η ακύρωση γίνεται διαγραφή');
select is(current_setting('t.claim')::jsonb -> 0 -> 'eventId', 'null'::jsonb,
          'Χωρίς αντιστοίχιση η διαγραφή έρχεται χωρίς eventId (ο worker σβήνει το σταθερό id)');
select is(current_setting('t.claim')::jsonb -> 0 ->> 'entityId', '00000000-0000-0000-0000-00000000f0a1',
          'Η γραμμή φέρνει το id του Γυρίσματος, από το οποίο βγαίνει το σταθερό id');

set local role service_role;
select public.google_outbox_done((current_setting('t.claim')::jsonb -> 0 ->> 'id')::bigint, null, null, null);
reset role;
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f0a1' and done_at is null), 0,
          'Η διαγραφή κλείνει τη γραμμή');

select * from finish();
rollback;
