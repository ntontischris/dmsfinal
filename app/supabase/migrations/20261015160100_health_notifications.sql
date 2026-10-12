-- Ειδοποιήσεις Kε (#174), μέρος 2: Υγεία (δέσμη Α14). Γεγονότα 50–53 με Ειδοποίηση σε όσους «Βλέπουν Υγεία συστήματος».
--
--  • job_runs: μία γραμμή ανά προγραμματισμένη εργασία (outbox, google). Τα δύο cron γράφουν έναρξη, επιτυχία ή σφάλμα με το
--    public.job_run_mark (μόνο service_role) και κάθε cron ελέγχει το άλλο με το public.health_check.
--  • Τα Γεγονότα γράφονται μέσα από το authz.emit_event, με case_key που δεν ξαναγράφεται όσο κρατά το ίδιο πρόβλημα (ο έλεγχος
--    τρέχει κάθε λεπτό):
--      50 Εργασία δεν έτρεξε: η άλλη εργασία δεν πέτυχε για πάνω από 10′. Περίπτωση = (εργασία, μέρα έναρξης του προβλήματος).
--      51 Αποστολή απέτυχε οριστικά: όταν το email_outbox_done κλείνει γραμμή ως failed. Περίπτωση = η γραμμή.
--      52 Συγχρονισμός Google σταμάτησε: ενώ υπάρχει ημερολόγιο, ο τελευταίος συγχρονισμός είναι > 30′ πίσω ή το σφάλμα κρατά
--         > 30′ (google_calendar.error_since). Περίπτωση = η μέρα Αθήνας που ξεκίνησε το επεισόδιο. Στιγμιαίο σφάλμα: τίποτα.
--      53 Γεγονός κόλλησε: 5 αποτυχημένες προσπάθειες → περίπτωση = το Γεγονός. Ανεπεξέργαστα > 15′ → μία περίπτωση τη μέρα με
--         το πλήθος, και καθόλου όσο η εργασία outbox είναι ήδη πίσω (το λέει το 50).
--  • Ποτέ Ειδοποίηση Υγείας για Ειδοποίηση Υγείας: το 53 αγνοεί τα Γεγονότα Υγείας, το 51 τα email Αυτοματισμών Υγείας.
--  • Αρχικοί Αυτοματισμοί: μία Ειδοποίηση ανά Γεγονός προς health.view, ενεργή. Το 51 λέει μόνο την ετικέτα του Γεγονότος (ποτέ
--    ποσά ή θέμα).
--  • Το 50 γράφεται όταν η ίδια η εκτέλεση του cron αποτύχει ή δεν τρέξει· ένα βήμα που επιστρέφει σφάλμα δεν μετρά.
--  • Διατήρηση 12 μηνών (sends_cleanup, service_role, μία φορά τη μέρα στις 03:xx Αθήνας): σημάδια, email_log και τελικές γραμμές
--    της ουράς. Μένουν τα σημάδια που χρειάζεται ακόμα το «μία φορά»: το ληξιπρόθεσμο Τιμολόγιο που έχει υπόλοιπο.
--  • Ξαναγράφεται από τον ΤΕΛΕΥΤΑΙΟ ορισμό (20261009230000_invitations_and_email.sql): public.email_outbox_done.

-- ───────────── Πίνακας ─────────────

create table public.job_runs (
  job text primary key check (job in ('outbox', 'google')),
  last_started_at timestamptz,
  last_ok_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_error_at timestamptz,
  -- Η μέρα (Αθήνας) του τελευταίου καθαρισμού 12 μηνών (μόνο στη γραμμή outbox).
  cleaned_on date
);

alter table public.job_runs enable row level security;

-- Από πότε κρατά το σφάλμα του Google: γράφεται όταν εμφανιστεί και σβήνει όταν καθαρίσει (το google_mark_sync ανανεώνει το
-- last_error_at σε κάθε αποτυχία, άρα εκείνο δεν λέει πότε ξεκίνησε).
alter table public.google_calendar add column error_since timestamptz;
update public.google_calendar set error_since = last_error_at where last_error is not null;

create function authz.google_error_since() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.last_error is null then
    new.error_since := null;
  elsif old.last_error is null then
    new.error_since := now();
  end if;
  return new;
end;
$$;

create trigger google_calendar_error_since before update of last_error on public.google_calendar
  for each row execute function authz.google_error_since();

-- ───────────── Κατάλογος και αρχικοί Αυτοματισμοί ─────────────

update public.event_types set is_wired = true
 where code in ('health.job_missed', 'health.send_failed', 'health.google_stopped', 'health.event_stuck');

insert into public.automations (event_type, channel, recipient_kind, recipient_permission, body_el, body_en, is_enabled, is_initial, sort)
values
  ('health.job_missed', 'notification', 'permission', 'health.view',
   'Η εργασία «{job}» δεν έτρεξε από τις {time}. {error}', 'The job "{job}" has not run since {time}. {error}', true, true, 1),
  ('health.send_failed', 'notification', 'permission', 'health.view',
   'Αποστολή απέτυχε οριστικά: {job}. {error}', 'A send failed permanently: {job}. {error}', true, true, 1),
  ('health.google_stopped', 'notification', 'permission', 'health.view',
   'Ο συγχρονισμός του Google σταμάτησε. Τελευταίος επιτυχής: {time}. {error}',
   'Google sync stopped. Last successful sync: {time}. {error}', true, true, 1),
  ('health.event_stuck', 'notification', 'permission', 'health.view',
   'Γεγονότα δεν επεξεργάστηκαν: {job} (από {time}). {error}', 'Events were not processed: {job} (since {time}). {error}', true, true, 1);

-- ───────────── Βοηθητικά ─────────────

create function authz.health_job_label(p_job text) returns text
language sql immutable set search_path = ''
as $$
  select case p_job when 'outbox' then 'Ουρά email και Αυτοματισμοί' when 'google' then 'Συγχρονισμός Google' else p_job end;
$$;

create function authz.health_when(p timestamptz) returns text
language sql stable set search_path = ''
as $$ select case when p is null then 'ποτέ' else authz.ev_day(p) || ' ' || authz.ev_time(p) end; $$;

-- Γράφει ένα Γεγονός Υγείας μόνο αν η περίπτωση δεν υπάρχει ήδη. true = γράφτηκε.
create function authz.health_emit(
  p_type text, p_entity text, p_entity_id uuid, p_case text, p_job text, p_error text, p_time text, p_link text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.events e where e.case_key = p_case) then
    return false;
  end if;
  return authz.emit_event(p_type, p_entity, p_entity_id, p_case, null,
    jsonb_build_object('job', p_job, 'error', coalesce(nullif(trim(p_error), ''), ''), 'time', p_time, 'link', p_link)) is not null;
end;
$$;

-- Το email ανήκει σε Αυτοματισμό Υγείας; (τότε η αποτυχία του δεν γράφει νέο Γεγονός Υγείας)
create function authz.outbox_is_health(o public.email_outbox) returns boolean
language sql stable security definer set search_path = ''
as $$
  select o.kind = 'automation' and exists (
    select 1 from public.automations a where a.id = authz.outbox_automation(o.payload) and a.event_type like 'health.%');
$$;

-- Τι ήταν το email που απέτυχε: μόνο η ετικέτα του Γεγονότος του Αυτοματισμού ή το είδος του Μηνύματος συστήματος.
create function authz.outbox_what(o public.email_outbox) returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(
           (select t.label_el from public.automations a join public.event_types t on t.code = a.event_type
             where o.kind = 'automation' and a.id = authz.outbox_automation(o.payload)),
           'email «' || o.kind || '»');
$$;

-- ───────────── Αποτέλεσμα αποστολής (ξαναγραμμένο από το 20261009230000_invitations_and_email.sql) ─────────────
-- Ίδιο, με δύο προσθήκες: η γραμμή του email_log σημειώνεται via_outbox και η οριστική αποτυχία γράφει το Γεγονός 51
-- (όχι για email Αυτοματισμού Υγείας).

create or replace function public.email_outbox_done(
  p_outbox uuid, p_ok boolean, p_subject text default '', p_error text default '',
  p_provider_id text default '', p_suppressed boolean default false
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.email_outbox;
  v_subject text := left(coalesce(p_subject, ''), 200);
  v_error text := left(coalesce(p_error, ''), 500);
  v_provider text := left(coalesce(p_provider_id, ''), 200);
begin
  select * into o from public.email_outbox x where x.id = p_outbox for update;
  if not found or o.status <> 'pending' then
    return;
  end if;
  update public.email_outbox set locked_until = null where id = p_outbox;
  if coalesce(p_suppressed, false) then
    update public.email_outbox set status = 'suppressed', handled_at = now(), last_error = v_error where id = p_outbox;
    insert into public.email_log (kind, to_email, subject, status, error, via_outbox)
    values (o.kind, o.to_email, v_subject, 'suppressed', v_error, true);
  elsif coalesce(p_ok, false) then
    update public.email_outbox set status = 'sent', handled_at = now(), provider_id = v_provider, last_error = '' where id = p_outbox;
    insert into public.email_log (kind, to_email, subject, status, provider_id, via_outbox)
    values (o.kind, o.to_email, v_subject, 'sent', v_provider, true);
    perform authz.mark_sender_connected(v_provider);
  elsif o.attempts >= 5 then
    update public.email_outbox set status = 'failed', handled_at = now(), last_error = v_error where id = p_outbox;
    insert into public.email_log (kind, to_email, subject, status, error, via_outbox)
    values (o.kind, o.to_email, v_subject, 'failed', v_error, true);
    if not authz.outbox_is_health(o) then
      perform authz.health_emit('health.send_failed', 'email_outbox', o.id, 'health.send_failed:' || o.id,
        authz.outbox_what(o), v_error, authz.health_when(now()), '/app/settings/sends?tab=failed');
    end if;
  else
    update public.email_outbox set last_error = v_error where id = p_outbox;
  end if;
end;
$$;

-- ───────────── Εργασίες (service_role) ─────────────

-- p_ok null = έναρξη, true = πέτυχε, false = σφάλμα (με p_error). Το p_now (null = τώρα) υπάρχει για τα τεστ.
create function public.job_run_mark(
  p_job text, p_ok boolean, p_error text default null, p_now timestamptz default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  if coalesce(p_job, '') not in ('outbox', 'google') then
    raise exception 'Άγνωστη εργασία' using errcode = 'P0001';
  end if;
  insert into public.job_runs as j (job, last_started_at, last_ok_at, last_error, last_error_at)
  values (p_job, case when p_ok is null then v_now end, case when p_ok then v_now end,
          case when not p_ok then left(coalesce(nullif(trim(p_error), ''), 'Άγνωστο σφάλμα'), 500) end,
          case when not p_ok then v_now end)
  on conflict (job) do update
     set last_started_at = coalesce(excluded.last_started_at, j.last_started_at),
         last_ok_at = coalesce(excluded.last_ok_at, j.last_ok_at),
         last_error = case when p_ok is null then j.last_error else excluded.last_error end,
         last_error_at = case when p_ok is null then j.last_error_at else excluded.last_error_at end;
end;
$$;

-- 50: κάθε εργασία ελέγχει τις άλλες. Μία που έτρεχε (last_ok_at) και δεν πέτυχε για πάνω από 10′.
create function authz.health_jobs(p_job text, p_now timestamptz) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  j public.job_runs;
  v_count integer := 0;
begin
  for j in
    select * from public.job_runs x
     where x.job <> p_job and x.last_ok_at is not null and x.last_ok_at < p_now - interval '10 minutes'
  loop
    if authz.health_emit('health.job_missed', 'job_runs', null,
         'health.job_missed:' || j.job || ':'
           || to_char((j.last_ok_at + interval '10 minutes') at time zone 'Europe/Athens', 'YYYYMMDD'),
         authz.health_job_label(j.job), j.last_error, authz.health_when(j.last_ok_at), '/app/settings/sends') then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- 52: υπάρχει ημερολόγιο και ο τελευταίος συγχρονισμός είναι > 30′ πίσω ή το σφάλμα κρατά > 30′. Περίπτωση = η μέρα Αθήνας
-- έναρξης του επεισοδίου (ο παλαιότερος από τους δύο λόγους που ισχύουν). Ημερολόγιο που μόλις συνδέθηκε δεν μετρά.
create function authz.health_google(p_now timestamptz) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  g public.google_calendar;
  v_start timestamptz;
begin
  select * into g from public.google_calendar x where x.id;
  if not found or g.calendar_id is null then
    return 0;
  end if;
  v_start := least(case when g.last_sync_at < p_now - interval '30 minutes' then g.last_sync_at end,
                   case when g.error_since < p_now - interval '30 minutes' then g.error_since end);
  if v_start is null then
    return 0;
  end if;
  return case when authz.health_emit('health.google_stopped', 'google_calendar', null,
                     'health.google_stopped:' || to_char(v_start at time zone 'Europe/Athens', 'YYYYMMDD'),
                     authz.health_job_label('google'), g.last_error, authz.health_when(g.last_sync_at),
                     '/app/settings/integrations')
              then 1 else 0 end;
end;
$$;

-- 53: Γεγονός (όχι Υγείας) με 5 αποτυχημένες προσπάθειες → ένα ανά Γεγονός (έως 20 ανά έλεγχο). Ανεπεξέργαστα > 15′ → μία
-- περίπτωση τη μέρα με το πλήθος, εκτός αν η εργασία outbox είναι ήδη πίσω (τότε το λέει το 50).
create function authz.health_events(p_now timestamptz) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  e public.events;
  v_count integer := 0;
  v_waiting integer;
  v_oldest timestamptz;
begin
  for e in
    select * from public.events x
     where x.processed_at is null and x.type not like 'health.%' and x.attempts >= 5
       and not exists (select 1 from public.events h where h.case_key = 'health.event_stuck:' || x.id)
     order by x.id
     limit 20
  loop
    if authz.health_emit('health.event_stuck', 'events', null, 'health.event_stuck:' || e.id,
         coalesce((select t.label_el from public.event_types t where t.code = e.type), e.type) || ', 5 προσπάθειες',
         e.last_error, authz.health_when(e.occurred_at), '/app/settings/sends') then
      v_count := v_count + 1;
    end if;
  end loop;
  if exists (select 1 from public.job_runs j
              where j.job = 'outbox' and j.last_ok_at is not null and j.last_ok_at < p_now - interval '10 minutes') then
    return v_count;
  end if;
  select count(*), min(x.occurred_at) into v_waiting, v_oldest from public.events x
   where x.processed_at is null and x.type not like 'health.%' and x.attempts < 5
     and x.occurred_at < p_now - interval '15 minutes';
  if v_waiting > 0 and authz.health_emit('health.event_stuck', 'events', null,
       'health.event_stuck:day:' || to_char(p_now at time zone 'Europe/Athens', 'YYYYMMDD'),
       v_waiting || ' ανεπεξέργαστα πάνω από 15′', null, authz.health_when(v_oldest), '/app/settings/sends') then
    v_count := v_count + 1;
  end if;
  return v_count;
end;
$$;

-- Ο έλεγχος Υγείας του cron p_job (κάθε λεπτό): οι άλλες εργασίες, το Google και τα κολλημένα Γεγονότα.
-- { jobs, google, events }: πόσα Γεγονότα Υγείας γράφτηκαν. Το p_now (null = τώρα) υπάρχει για τα τεστ.
create function public.health_check(p_job text, p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  if coalesce(p_job, '') not in ('outbox', 'google') then
    raise exception 'Άγνωστη εργασία' using errcode = 'P0001';
  end if;
  return jsonb_build_object('jobs', authz.health_jobs(p_job, v_now), 'google', authz.health_google(v_now),
                            'events', authz.health_events(v_now));
end;
$$;

-- ───────────── Διατήρηση 12 μηνών (service_role, cron της ουράς) ─────────────

-- { sends, logs, outbox } πόσα σβήστηκαν, ή { skipped: true }. Μία φορά τη μέρα, στις 03:xx Αθήνας (job_runs.cleaned_on).
-- Μένουν τα σημάδια του ληξιπρόθεσμου Τιμολογίου που έχει ακόμα υπόλοιπο (αλλιώς το «μία φορά» θα ξανάστελνε) και οι γραμμές
-- της ουράς που δείχνουν. Οι Ειδοποιήσεις σβήνονται στις 90 μέρες (events_process).
create function public.sends_cleanup(p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_today date := (v_now at time zone 'Europe/Athens')::date;
  v_cut timestamptz := v_now - interval '12 months';
  v_sends integer;
  v_logs integer;
  v_outbox integer;
begin
  if extract(hour from v_now at time zone 'Europe/Athens') <> 3
     or exists (select 1 from public.job_runs j where j.job = 'outbox' and j.cleaned_on = v_today) then
    return jsonb_build_object('skipped', true);
  end if;
  insert into public.job_runs as j (job, cleaned_on) values ('outbox', v_today)
  on conflict (job) do update set cleaned_on = excluded.cleaned_on;
  delete from public.automation_sends s
   where s.created_at < v_cut
     and not (s.case_key like 'invoice.overdue:%'
              and exists (select 1 from authz.invoice_standings(null, null) st
                           where st.invoice_id::text = split_part(s.case_key, ':', 2) and st.remaining > 0));
  get diagnostics v_sends = row_count;
  delete from public.email_log l where l.sent_at < v_cut;
  get diagnostics v_logs = row_count;
  delete from public.email_outbox o
   where o.status <> 'pending' and coalesce(o.handled_at, o.created_at) < v_cut
     and not exists (select 1 from public.automation_sends s where s.email_outbox_id = o.id);
  get diagnostics v_outbox = row_count;
  return jsonb_build_object('sends', v_sends, 'logs', v_logs, 'outbox', v_outbox);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.google_error_since(), authz.health_job_label(text), authz.health_when(timestamptz),
  authz.health_emit(text, text, uuid, text, text, text, text, text), authz.outbox_is_health(public.email_outbox),
  authz.outbox_what(public.email_outbox), authz.health_jobs(text, timestamptz), authz.health_google(timestamptz),
  authz.health_events(timestamptz)
  from public, anon, authenticated;

revoke all on function public.job_run_mark(text, boolean, text, timestamptz), public.health_check(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.job_run_mark(text, boolean, text, timestamptz), public.health_check(text, timestamptz)
  to service_role;

revoke all on function public.sends_cleanup(timestamptz) from public, anon, authenticated;
grant execute on function public.sends_cleanup(timestamptz) to service_role;

revoke all on table public.job_runs from anon, authenticated;
