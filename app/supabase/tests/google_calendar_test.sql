-- Google Calendar (C2δ, #138): ουρά εγγραφών, παραλαβή και αποτέλεσμα, αλλαγές από το Google, διαγραφές, Κανόνες.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες σχετικές με το «σήμερα» (Ώρα Ελλάδας).
-- Ο worker τρέχει ως service_role· η εφαρμογή ως Χρήστης με Δικαίωμα ή χωρίς.
begin;
select plan(72);

-- ───────────── Βοηθητικά ─────────────

create function public.t_at(p_days integer, p_time time) returns timestamptz
language sql stable
as $$ select (((now() at time zone 'Europe/Athens')::date + p_days) + p_time) at time zone 'Europe/Athens'; $$;

create function public.t_as(p_user uuid) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

create function public.t_filming(p_id uuid, p_days integer, p_time time, p_state text) returns void
language sql
as $$
  insert into public.filmings (id, production_id, starts_at, hours, origin, state)
  values (p_id, '00000000-0000-0000-0000-0000000000a1', public.t_at(p_days, p_time), 2, 'team', p_state);
$$;

create function public.t_blocked(p_id uuid, p_user uuid, p_starts timestamptz, p_ends timestamptz) returns void
language sql
as $$
  insert into public.blocked_times (id, user_id, starts_at, ends_at, source)
  values (p_id, p_user, p_starts, p_ends, 'dms');
$$;

create function public.t_event(
  p_id text, p_etag text, p_starts timestamptz, p_ends timestamptz, p_status text, p_attendees text[], p_recurring boolean
) returns jsonb
language sql
as $$
  select jsonb_build_object(
    'id', p_id, 'etag', p_etag, 'status', p_status, 'summary', 'Δοκιμή',
    'start', p_starts, 'end', p_ends, 'allDay', false,
    'attendees', to_jsonb(p_attendees), 'organizer', '', 'recurring', p_recurring);
$$;

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 μέλος ομάδας (Κλεισμένος χρόνος) · e3 μέλος ενεργό (καλεσμένος) · e4 ανενεργό · e5 χωρίς Δικαιώματα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'peter@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'old@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'no-rights@example.com');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000e2', 'Νίκος', 'manager@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000e3', 'Πέτρος', 'peter@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'old@example.com', false, now()),
  ('00000000-0000-0000-0000-0000000000e5', 'Άννα', 'no-rights@example.com', true, null);
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e1', r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';

insert into public.productions (id, title, owner_id)
values ('00000000-0000-0000-0000-0000000000a1', 'Εσωτερική Παραγωγή', '00000000-0000-0000-0000-0000000000e3');

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.google_state() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει την κατάσταση του Google');
select throws_ok($$ select public.google_outbox_claim(5) $$, '42501', null, 'Ο ανώνυμος δεν παίρνει την ουρά');
select throws_ok($$ select public.google_outbox_done(1, null, null, null) $$, '42501', null, 'Ο ανώνυμος δεν σημειώνει αποτελέσματα');
select throws_ok($$ select public.google_apply_change('{}'::jsonb) $$, '42501', null, 'Ο ανώνυμος δεν στέλνει αλλαγές από το Google');
select throws_ok($$ select public.google_expire_deletions() $$, '42501', null, 'Ο ανώνυμος δεν λήγει διαγραφές');
select throws_ok($$ select public.google_mark_sync(true, null) $$, '42501', null, 'Ο ανώνυμος δεν σημειώνει συγχρονισμό');
select throws_ok($$ select public.google_channel_check('c', 't') $$, '42501', null, 'Ο ανώνυμος δεν ελέγχει το κανάλι');
select throws_ok($$ select public.google_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το Google');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e5');
set local role authenticated;
select throws_ok($$ select public.google_outbox_claim(5) $$, '42501', null, 'Ο χρήστης ομάδας δεν παίρνει την ουρά του worker');
select throws_ok($$ select public.google_view() $$, '42501', null, 'Χωρίς Δικαίωμα δεν βλέπει την κατάσταση του Google');
select throws_ok($$ select public.google_deletions_view() $$, '42501', null, 'Χωρίς Δικαίωμα δεν βλέπει τις διαγραφές');
select throws_ok($$ select public.google_settings_save('none', 12, false) $$, '42501', null, 'Χωρίς Δικαίωμα δεν αλλάζει τους Κανόνες');
select throws_ok($$ select public.google_resync_all() $$, '42501', null, 'Χωρίς Δικαίωμα δεν ξαναγράφει τίποτα');
select throws_ok($$ select public.google_deletion_resolve('00000000-0000-0000-0000-00000000f007', true, null) $$, '42501', null, 'Χωρίς Δικαίωμα δεν επαναφέρει Γύρισμα');
select throws_ok($$ select * from public.google_calendar $$, '42501', null, 'Ο πίνακας του Google κλείνει για την εφαρμογή');
select throws_ok($$ select * from public.google_outbox $$, '42501', null, 'Η ουρά κλείνει για την εφαρμογή');
select throws_ok($$ select * from public.google_links $$, '42501', null, 'Οι αντιστοιχίσεις κλείνουν για την εφαρμογή');
reset role;

-- ───────────── Ουρά: πότε μπαίνει μια εγγραφή ─────────────
-- Χωρίς ημερολόγιο (calendar_id) τίποτα δεν μπαίνει στην ουρά.
select public.t_filming('00000000-0000-0000-0000-00000000f001', 3, '10:00', 'pending');
select public.t_blocked('00000000-0000-0000-0000-0000000000b001', '00000000-0000-0000-0000-0000000000e2', public.t_at(2, '09:00'), public.t_at(2, '10:00'));
select is((select count(*)::int from public.google_outbox), 0, 'Χωρίς ημερολόγιο η ουρά μένει άδεια');

update public.google_calendar set calendar_id = 'cal-devre@group.calendar.google.com', shared_with = 'owner@example.com' where id;
update public.filmings set starts_at = public.t_at(3, '11:00') where id = '00000000-0000-0000-0000-00000000f001';
select is((select op from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f001' and done_at is null), 'upsert', 'Αλλαγή Γυρίσματος βάζει εγγραφή στην ουρά');
update public.filmings set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Ακύρωση δοκιμής'
 where id = '00000000-0000-0000-0000-00000000f001';
select is((select op from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f001' and done_at is null), 'delete', 'Ακύρωση Γυρίσματος γίνεται διαγραφή στο Google');
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f001' and done_at is null), 1, 'Η νέα εγγραφή κλείνει τις ανοιχτές του ίδιου Γυρίσματος');

-- Αναμένει και «αναμένει στο Google» κλειστό: τίποτα, αλλιώς διαγραφή μόνο όταν υπάρχει αντιστοίχιση.
update public.filming_settings set google_write_pending = false where id;
select public.t_filming('00000000-0000-0000-0000-00000000f002', 4, '10:00', 'pending');
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f002'), 0, 'Αναμένον Γύρισμα χωρίς «αναμένει στο Google» δεν μπαίνει στην ουρά');
insert into public.google_links (entity, entity_id, event_id, etag)
values ('filming', '00000000-0000-0000-0000-00000000f002', 'ev-f2', 'etag-f2-1');
update public.filmings set starts_at = public.t_at(4, '12:00') where id = '00000000-0000-0000-0000-00000000f002';
select is((select op from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f002' and done_at is null), 'delete', 'Αναμένον Γύρισμα με αντιστοίχιση και χωρίς «αναμένει στο Google» σβήνεται');
update public.filming_settings set google_write_pending = true where id;

-- Κλεισμένος χρόνος της ομάδας μπαίνει στην ουρά.
select public.t_blocked('00000000-0000-0000-0000-0000000000b002', '00000000-0000-0000-0000-0000000000e2', public.t_at(5, '09:00'), public.t_at(5, '10:00'));
select is((select op from public.google_outbox where entity = 'blocked' and entity_id = '00000000-0000-0000-0000-0000000000b002' and done_at is null), 'upsert', 'Κλεισμένος χρόνος της ομάδας μπαίνει στην ουρά');

-- Αλλαγή που ήρθε από το Google δεν ξαναγράφεται στο Google.
select public.t_filming('00000000-0000-0000-0000-00000000f003', 6, '10:00', 'pending');
update public.google_outbox set done_at = now() where entity_id = '00000000-0000-0000-0000-00000000f003';
select set_config('dms.google_apply', 'on', true);
update public.filmings set starts_at = public.t_at(6, '13:00') where id = '00000000-0000-0000-0000-00000000f003';
select set_config('dms.google_apply', 'off', true);
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f003' and done_at is null), 0, 'Αλλαγή υπό τη σημαία του Google δεν ξαναγράφεται');

-- ───────────── Παραλαβή και αποτέλεσμα ─────────────
update public.google_outbox set done_at = now() where done_at is null;
select public.t_filming('00000000-0000-0000-0000-00000000f004', 7, '10:00', 'pending');
update public.filmings set internal_note = 'Μυστική σημείωση' where id = '00000000-0000-0000-0000-00000000f004';
select public.t_blocked('00000000-0000-0000-0000-0000000000b003', '00000000-0000-0000-0000-0000000000e2', public.t_at(8, '09:00'), public.t_at(8, '10:00'));

set local role service_role;
select set_config('t.claim', public.google_outbox_claim(100)::text, true);
reset role;
select is(jsonb_array_length(current_setting('t.claim')::jsonb), 2, 'Η παραλαβή επιστρέφει τις ανοιχτές εγγραφές');
select is(current_setting('t.claim')::jsonb->0->>'entityId', '00000000-0000-0000-0000-00000000f004', 'Η παραλαβή κρατά τη σειρά των εγγραφών');
select is(current_setting('t.claim')::jsonb->0->'event'->>'summary', '(αναμένει) Εσωτερική Παραγωγή', 'Ο τίτλος του Γυρίσματος έχει το πρόθεμα «αναμένει»');
select is(current_setting('t.claim')::jsonb->0->'event'->>'description', '/app/filming/00000000-0000-0000-0000-00000000f004', 'Η περιγραφή έχει μόνο τη διαδρομή της εφαρμογής');
select is(position('Μυστική' in (current_setting('t.claim')::jsonb->0->'event')::text), 0, 'Η εσωτερική σημείωση δεν φεύγει προς το Google');
select is(current_setting('t.claim')::jsonb->1->'event'->>'summary', 'Νίκος: Απασχολημένος', 'Ο Κλεισμένος χρόνος φέρνει «<Όνομα>: Απασχολημένος»');
select is(current_setting('t.claim')::jsonb->0->>'eventId', null, 'Νέα εγγραφή χωρίς αντιστοίχιση δεν έχει γεγονός');

set local role service_role;
select public.google_outbox_done((current_setting('t.claim')::jsonb->0->>'id')::bigint, 'ev-f4', 'etag-f4-1', null);
select public.google_outbox_done((current_setting('t.claim')::jsonb->1->>'id')::bigint, null, null, 'timeout');
reset role;
select is((select event_id from public.google_links where entity = 'filming' and entity_id = '00000000-0000-0000-0000-00000000f004'), 'ev-f4', 'Η επιτυχία γράφει την αντιστοίχιση');
select ok(
  (select attempts = 1 and last_error = 'timeout' and next_attempt_at between now() + interval '30 seconds' and now() + interval '90 seconds'
     from public.google_outbox where id = (current_setting('t.claim')::jsonb->1->>'id')::bigint),
  'Η αποτυχία κάνει οπισθοχώρηση ενός λεπτού'
);
select is((select count(*)::int from public.google_links where entity = 'blocked' and entity_id = '00000000-0000-0000-0000-0000000000b003'), 0, 'Η αποτυχία δεν γράφει αντιστοίχιση');

-- ───────────── Αλλαγές από το Google ─────────────
-- Ίδιο etag: τίποτα.
select is(public.google_apply_change(public.t_event('ev-f4', 'etag-f4-1', public.t_at(7, '15:00'), public.t_at(7, '17:00'), 'confirmed', '{}', false))->>'action', 'noop', 'Ίδιο etag δεν κάνει τίποτα');
-- Μετακίνηση που περνά.
select is(public.google_apply_change(public.t_event('ev-f4', 'etag-f4-2', public.t_at(7, '15:00'), public.t_at(7, '17:00'), 'confirmed', '{}', false))->>'action', 'move_applied', 'Μετακίνηση με ελεύθερο Συνεργείο περνά');
select is((select starts_at from public.filmings where id = '00000000-0000-0000-0000-00000000f004'), public.t_at(7, '15:00'), 'Το Γύρισμα μετακινήθηκε στη νέα ώρα');
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f004' and done_at is null), 0, 'Η μετακίνηση που πέρασε δεν ξαναγράφεται στο Google');
select ok(exists (select 1 from public.google_activity where kind = 'move_applied' and filming_id = '00000000-0000-0000-0000-00000000f004'), 'Η μετακίνηση που πέρασε μπαίνει στα πρόσφατα');

-- Μετακίνηση με Συνεργείο απασχολημένο: επαναφορά στο Google.
select public.t_filming('00000000-0000-0000-0000-00000000f005', 9, '10:00', 'pending');
select public.t_filming('00000000-0000-0000-0000-00000000f006', 9, '14:00', 'pending');
insert into public.filming_crew (filming_id, user_id) values
  ('00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-00000000f006', '00000000-0000-0000-0000-0000000000e3');
insert into public.google_links (entity, entity_id, event_id, etag)
values ('filming', '00000000-0000-0000-0000-00000000f005', 'ev-f5', 'etag-f5-1');
update public.google_outbox set done_at = now() where done_at is null;
select is(public.google_apply_change(public.t_event('ev-f5', 'etag-f5-2', public.t_at(9, '14:30'), public.t_at(9, '15:30'), 'confirmed', '{}', false))->>'action', 'move_rejected', 'Μετακίνηση σε απασχολημένο Συνεργείο απορρίπτεται');
select is((select op from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f005' and done_at is null), 'upsert', 'Η απόρριψη ξαναγράφει την παλιά ώρα στο Google');

-- Διαγραφή στο Google: προθεσμία (≤ έναρξη), η αντιστοίχιση φεύγει.
select public.t_filming('00000000-0000-0000-0000-00000000f007', 4, '11:00', 'scheduled');
insert into public.google_links (entity, entity_id, event_id, etag)
values ('filming', '00000000-0000-0000-0000-00000000f007', 'ev-f6', 'etag-f6-1');
select is(public.google_apply_change(public.t_event('ev-f6', 'etag-f6-2', public.t_at(4, '11:00'), public.t_at(4, '13:00'), 'cancelled', '{}', false))->>'action', 'deletion_detected', 'Διαγραφή στο Google καταγράφεται ως διαγραφή σε εκκρεμότητα');
select ok((select d.deadline_at <= f.starts_at from public.google_deletions d join public.filmings f on f.id = d.filming_id where d.filming_id = '00000000-0000-0000-0000-00000000f007'), 'Η προθεσμία δεν ξεπερνά την έναρξη');
select is((select count(*)::int from public.google_links where entity = 'filming' and entity_id = '00000000-0000-0000-0000-00000000f007'), 0, 'Η διαγραφή στο Google σβήνει την αντιστοίχιση');

-- Άγνωστο γεγονός με καλεσμένο μέλος: Κλεισμένος χρόνος από το Google.
select is(public.google_apply_change(public.t_event('ev-new-1', 'etag-n-1', public.t_at(12, '09:00'), public.t_at(12, '11:00'), 'confirmed', array['peter@example.com'], false))->>'action', 'blocked_created', 'Άγνωστο γεγονός με μέλος φέρνει Κλεισμένο χρόνο');
select ok(exists (select 1 from public.blocked_times where user_id = '00000000-0000-0000-0000-0000000000e3' and source = 'google' and starts_at = public.t_at(12, '09:00')), 'Ο Κλεισμένος χρόνος από το Google έχει πηγή «google»');
select is((select count(*)::int from public.google_links where entity = 'blocked' and event_id = 'ev-new-1'), 1, 'Ο Κλεισμένος χρόνος από το Google αντιστοιχίζεται στο γεγονός');
select is(public.google_apply_change(public.t_event('ev-old-1', 'etag-o-1', public.t_at(12, '09:00'), public.t_at(12, '11:00'), 'confirmed', array['old@example.com'], false))->>'action', 'ignored_no_member', 'Γεγονός χωρίς ενεργό μέλος αγνοείται');
select is(public.google_apply_change(public.t_event('ev-rec-1', 'etag-r-1', public.t_at(12, '09:00'), public.t_at(12, '11:00'), 'confirmed', array['peter@example.com'], true))->>'action', 'ignored_recurring', 'Επαναλαμβανόμενο γεγονός αγνοείται');
update public.filming_settings set google_new_event = 'none' where id;
select is(public.google_apply_change(public.t_event('ev-none-1', 'etag-x-1', public.t_at(12, '09:00'), public.t_at(12, '11:00'), 'confirmed', array['peter@example.com'], false))->>'action', 'ignored_setting', 'Με κανόνα «τίποτα» δεν μπαίνει Κλεισμένος χρόνος');
update public.filming_settings set google_new_event = 'blocked' where id;
select is(public.google_apply_change(public.t_event('ev-new-1', 'etag-n-2', public.t_at(12, '13:00'), public.t_at(12, '14:00'), 'confirmed', array['peter@example.com'], false))->>'action', 'blocked_updated', 'Κλεισμένος χρόνος από το Google μετακινείται');
select is((select starts_at from public.blocked_times where source = 'google' and user_id = '00000000-0000-0000-0000-0000000000e3' and starts_at = public.t_at(12, '13:00')), public.t_at(12, '13:00'), 'Η νέα ώρα του Κλεισμένου χρόνου αποθηκεύεται');
select is(public.google_apply_change(public.t_event('ev-new-1', 'etag-n-3', public.t_at(12, '13:00'), public.t_at(12, '14:00'), 'cancelled', array['peter@example.com'], false))->>'action', 'blocked_deleted', 'Ακυρωμένος Κλεισμένος χρόνος από το Google σβήνεται');
select is((select count(*)::int from public.blocked_times where source = 'google' and user_id = '00000000-0000-0000-0000-0000000000e3' and starts_at = public.t_at(12, '13:00')), 0, 'Ο Κλεισμένος χρόνος σβήστηκε από τη βάση');

-- ───────────── Διαγραφές από το Google ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select public.google_deletion_resolve('00000000-0000-0000-0000-00000000f007', true, null);
reset role;
select is((select resolution from public.google_deletions where filming_id = '00000000-0000-0000-0000-00000000f007'), 'restored', 'Η επαναφορά σημειώνεται');
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f007' and op = 'upsert' and done_at is null), 1, 'Η επαναφορά ξαναγράφει το Γύρισμα στο Google');

select public.t_filming('00000000-0000-0000-0000-00000000f008', 13, '10:00', 'scheduled');
insert into public.google_links (entity, entity_id, event_id, etag)
values ('filming', '00000000-0000-0000-0000-00000000f008', 'ev-f7', 'etag-f7-1');
select public.google_apply_change(public.t_event('ev-f7', 'etag-f7-2', public.t_at(13, '10:00'), public.t_at(13, '12:00'), 'cancelled', '{}', false));
set local role authenticated;
select throws_ok($$ select public.google_deletion_resolve('00000000-0000-0000-0000-00000000f008', false, '  ') $$, 'P0001', null, 'Η επιβεβαίωση διαγραφής θέλει λόγο');
select public.google_deletion_resolve('00000000-0000-0000-0000-00000000f008', false, 'Ακύρωση από το Google');
reset role;
select is((select state from public.filmings where id = '00000000-0000-0000-0000-00000000f008'), 'cancelled', 'Η επιβεβαίωση ακυρώνει το Γύρισμα');
select is((select resolution from public.google_deletions where filming_id = '00000000-0000-0000-0000-00000000f008'), 'confirmed', 'Η επιβεβαίωση σημειώνεται');

-- Ληγμένη προθεσμία: ξαναγράφεται.
select public.t_filming('00000000-0000-0000-0000-00000000f009', 14, '10:00', 'scheduled');
insert into public.google_deletions (filming_id, event_id, detected_at, deadline_at)
values ('00000000-0000-0000-0000-00000000f009', 'ev-f8', now() - interval '2 days', now() - interval '1 hour');
set local role service_role;
select set_config('t.expired', public.google_expire_deletions()::text, true);
reset role;
select is(current_setting('t.expired')::int, 1, 'Η λήξη επιστρέφει τις ληγμένες διαγραφές');
select is((select resolution from public.google_deletions where filming_id = '00000000-0000-0000-0000-00000000f009'), 'expired', 'Η λήξη σημειώνεται');
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f009' and op = 'upsert' and done_at is null), 1, 'Η λήξη ξαναγράφει το Γύρισμα στο Google');

-- ───────────── Κανόνες και οθόνες ─────────────
update public.google_outbox set done_at = now() where done_at is null;
select public.t_filming('00000000-0000-0000-0000-00000000f00a', 15, '10:00', 'pending');
insert into public.google_links (entity, entity_id, event_id, etag)
values ('filming', '00000000-0000-0000-0000-00000000f00a', 'ev-f9', 'etag-f9-1');
update public.google_outbox set done_at = now() where done_at is null;

select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select public.google_settings_save('none', 12, false);
reset role;
select is((select count(*)::int from public.google_outbox where entity_id = '00000000-0000-0000-0000-00000000f00a' and op = 'delete' and done_at is null), 1, 'Αλλαγή του «αναμένει στο Google» ξαναγράφει τα αναμένοντα');
select is((select google_new_event || '|' || google_delete_hours || '|' || google_write_pending from public.filming_settings), 'none|12|false', 'Οι Κανόνες αποθηκεύονται');

set local role authenticated;
select throws_ok($$ select public.google_settings_save('άλλο', 12, true) $$, 'P0001', null, 'Ο κανόνας νέου γεγονότος ελέγχεται');
reset role;

select public.t_filming('00000000-0000-0000-0000-00000000f00b', 16, '10:00', 'scheduled');
insert into public.google_deletions (filming_id, event_id, detected_at, deadline_at)
values ('00000000-0000-0000-0000-00000000f00b', 'ev-f10', now(), now() + interval '1 day');
set local role authenticated;
select is(jsonb_array_length(public.google_deletions_view()), 1, 'Η οθόνη δείχνει τις διαγραφές σε εκκρεμότητα');
select is(public.google_deletions_view()->0->>'title', 'Εσωτερική Παραγωγή', 'Η διαγραφή δείχνει τον τίτλο του Γυρίσματος');
select is((public.google_view()->>'connected')::boolean, true, 'Η κάρτα Google δείχνει ότι το ημερολόγιο είναι συνδεδεμένο');
select ok(jsonb_array_length(public.google_view()->'activity') > 0, 'Η κάρτα Google δείχνει τα πρόσφατα από το Google');
select ok((public.calendar_view(current_date - 1, current_date + 1)->'google') ? 'stale', 'Το Ημερολόγιο δείχνει την κατάσταση Google στον Ιδιοκτήτη');
select ok(public.google_resync_all() >= 1, 'Η ξαναγραφή επιστρέφει πόσα μπήκαν στην ουρά');
reset role;

select * from finish();
rollback;
