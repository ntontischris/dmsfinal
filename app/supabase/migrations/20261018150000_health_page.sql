-- Υγεία Pβ (#215, PRD #213, δέσμη Υ6–Υ10): η σελίδα Υγείας συστήματος (P2), οι ενέργειές της και ο εξωτερικός έλεγχος.
--
--  • Υ6 Κατάλογος εργασιών (authz.health_job_catalog): κάθε cron και κάθε βήμα του cron της ουράς που τρέχει μόνο του
--    (Γεγονότα, υπενθυμίσεις/ληξιπρόθεσμα/Αργίες, Τιμολογητέα, καθαρισμός 12 μηνών), με ετικέτα, συχνότητα και όριο «άργησε»
--    ανάλογα με τη συχνότητα. Ένα βήμα που ανήκει σε άλλη εργασία (parent) δεν μετρά χωριστά όσο έχει αργήσει η ίδια η
--    εργασία του: μία αιτία, ένα «θέλει προσοχή» και ένα Γεγονός 50. Ετικέτα, όριο, job_run_mark και το check του job_runs
--    βγαίνουν από τον κατάλογο.
--  • Υ6 public.health_view(p_now) (health.view, έλεγχος πρώτος → 42501): εργασίες, αποστολές που απέτυχαν (χωρίς τις
--    αγνοημένες, με τους κανόνες ορατότητας της κάρτας Σήμερα), Google με τις αλλαγές σε ουρά, Γεγονότα που κόλλησαν, πλαφόν
--    Βοηθού, και το σύνολο «θέλουν προσοχή». Όλα υπολογίζονται τη στιγμή της κλήσης· τίποτα δεν αποθηκεύεται.
--    Η δαπάνη AI και το πλαφόν έρχονται μέσα στην health_view· το ai_spend_view μένει «Διαχειρίζεται Ρυθμίσεις» και το
--    πλαφόν το αλλάζει μόνο ο Ιδιοκτήτης. Η N5 (integrations_view) μένει μόνο για τον Ιδιοκτήτη (PRD #206 Ν9)· η P2 παίρνει
--    για το Google μόνο ό,τι χρειάζεται (authz.health_google_view: σύνδεση, συγχρονισμός, σύντομος λόγος, ουρά).
--    Γεγονότα που ο θεατής δεν βλέπει (ποσά, κόστος: authz.send_hidden_types) δεν φαίνονται και δεν ξαναδοκιμάζονται.
--  • Υ7 Ενέργειες, όλες στο Ίχνος:
--      «Ξαναστείλε» (send_retry): health.view ή automations.manage, μία φορά όπως πριν (η νέα γραμμή της ουράς γράφεται
--      στο Ίχνος από το email_outbox_audit).
--      «Αγνόησε» (send_ignore, health.view): νέα κατάσταση 'ignored' σε αποτυχημένο email της ουράς ή του email_log, με ποιος
--      και πότε. Μένει στο Ιστορικό αποστολών («αγνοήθηκε») και φεύγει από την Υγεία, τα «Απέτυχαν» και την κάρτα Σήμερα. Το
--      Ίχνος τη γράφει ως αλλαγή κατάστασης (email_outbox_audit, νέο email_log_audit_status).
--      «Ξαναδοκίμασε» (event_retry, health.view): Γεγονός (όχι Υγείας) με 5 αποτυχημένες προσπάθειες ξαναμπαίνει στην ουρά με
--      μηδέν προσπάθειες. Όσοι το πήραν ήδη δεν το ξαναπαίρνουν: το σημάδι automation_sends είναι μοναδικό ανά (Αυτοματισμό,
--      περίπτωση, παραλήπτη). Γραμμή 'event' στο Ίχνος (entity 'events').
--  • Υ8 public.health_ok() (anon και authenticated): μόνο boolean, «η εργασία της ουράς πέτυχε μέσα στα 10′». Χωρίς
--    παράμετρο, ώστε κανείς απέξω να μη μαντεύει την ώρα της τελευταίας εκτέλεσης. Το /api/health το καλεί χωρίς service role.
--  • Υ10 Η κάρτα Υγείας στο Σήμερα ανοίγει την P2 (/app/health), και οι γραμμές της επίσης. Οι αγνοημένες αποστολές δεν
--    μετρούν (η authz.today_failed_sends κοιτά μόνο status 'failed').
--  • Ξαναγράφονται από τους ΤΕΛΕΥΤΑΙΟΥΣ ορισμούς: το check του job_runs, authz.health_job_label, authz.health_job_grace,
--    public.job_run_mark, authz.health_jobs, authz.today_health_rows (20261017130000_assistant.sql),
--    authz.send_state, authz.send_reason, authz.sends_history, public.send_retry (20261015160000_send_history.sql),
--    authz.audit_entity_allowed
--    (20261018130000_gdpr.sql· το 20261018140000_audit_trail.sql δεν την αλλάζει), με τα 'events' και τη γραμμή τους στον
--    κατάλογο public.audit_entities (περιοχή «Υγεία συστήματος»).

-- ───────────── Κατάλογος εργασιών ─────────────

-- Μία γραμμή ανά εργασία: ετικέτα, πότε τρέχει, μετά από πόσο «άργησε», σε ποια εργασία ανήκει, σειρά της σελίδας.
-- Τα cron του vercel.json: outbox, google, knowledge-index (κάθε λεπτό), assistant-purge (κάθε μέρα). Τα υπόλοιπα είναι
-- βήματα του cron της ουράς που γράφουν μόνα τους πότε έτρεξαν.
create function authz.health_job_catalog()
returns table (job text, label text, schedule text, grace interval, parent text, sort integer)
language sql immutable set search_path = ''
as $$
  select * from (values
    ('outbox', 'Ουρά email και Αυτοματισμοί', 'κάθε λεπτό', interval '10 minutes', null::text, 10),
    ('events_process', 'Γεγονότα προς τους Αυτοματισμούς', 'κάθε λεπτό, με την ουρά', interval '10 minutes', 'outbox', 20),
    ('automations_scan', 'Υπενθυμίσεις, ληξιπρόθεσμα και ευχές Αργιών', 'κάθε λεπτό, με την ουρά', interval '10 minutes',
     'outbox', 30),
    ('billables', 'Τιμολογητέα', 'κάθε λεπτό, με την ουρά', interval '10 minutes', 'outbox', 40),
    ('sends_cleanup', 'Καθαρισμός Ιστορικού αποστολών (12 μήνες)', 'μία φορά τη μέρα, 03:00', interval '26 hours', 'outbox', 50),
    ('google', 'Συγχρονισμός Google', 'κάθε λεπτό', interval '10 minutes', null, 60),
    ('knowledge_index', 'Μνήμη του Βοηθού', 'κάθε λεπτό', interval '10 minutes', null, 70),
    ('assistant_purge', 'Καθαρισμός Συζητήσεων Βοηθού', 'μία φορά τη μέρα, τη νύχτα', interval '26 hours', null, 80)
  ) as c (job, label, schedule, grace, parent, sort);
$$;

alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs add constraint job_runs_job_check
  check (job in ('outbox', 'events_process', 'automations_scan', 'billables', 'sends_cleanup', 'google', 'knowledge_index',
                 'assistant_purge'));

create or replace function authz.health_job_label(p_job text) returns text
language sql immutable set search_path = ''
as $$ select coalesce((select c.label from authz.health_job_catalog() c where c.job = p_job), p_job); $$;

create or replace function authz.health_job_grace(p_job text) returns interval
language sql immutable set search_path = ''
as $$ select coalesce((select c.grace from authz.health_job_catalog() c where c.job = p_job), interval '10 minutes'); $$;

-- p_ok null = έναρξη, true = πέτυχε, false = σφάλμα (με p_error). Το p_now (null = τώρα) υπάρχει για τα τεστ.
create or replace function public.job_run_mark(
  p_job text, p_ok boolean, p_error text default null, p_now timestamptz default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  if not exists (select 1 from authz.health_job_catalog() c where c.job = p_job) then
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

-- Η κατάσταση κάθε εργασίας του καταλόγου τη στιγμή p_now. is_late: πέτυχε κάποτε και όχι μέσα στο όριό της.
-- is_counted: άργησε και η εργασία στην οποία ανήκει δεν έχει αργήσει (αλλιώς το λέει εκείνη).
create function authz.health_job_rows(p_now timestamptz)
returns table (job text, label text, schedule text, sort integer, last_ok_at timestamptz, last_error text,
               last_error_at timestamptz, is_late boolean, is_counted boolean)
language sql stable security definer set search_path = ''
as $$
  with r as (
    select c.job, c.label, c.schedule, c.sort, c.parent, j.last_ok_at, j.last_error, j.last_error_at,
           coalesce(j.last_ok_at < p_now - c.grace, false) as is_late
      from authz.health_job_catalog() c
      left join public.job_runs j on j.job = c.job
  )
  select r.job, r.label, r.schedule, r.sort, r.last_ok_at, r.last_error, r.last_error_at, r.is_late,
         r.is_late and not coalesce((select p.is_late from r p where p.job = r.parent), false)
    from r;
$$;

-- 50: κάθε εργασία ελέγχει τις άλλες. Μία που έτρεχε και δεν πέτυχε για πάνω από το όριό της (ένα Γεγονός ανά αιτία).
create or replace function authz.health_jobs(p_job text, p_now timestamptz) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  j record;
  v_count integer := 0;
begin
  for j in select * from authz.health_job_rows(p_now) x where x.job <> p_job and x.is_counted order by x.sort loop
    if authz.health_emit('health.job_missed', 'job_runs', null,
         'health.job_missed:' || j.job || ':'
           || to_char((j.last_ok_at + authz.health_job_grace(j.job)) at time zone 'Europe/Athens', 'YYYYMMDD'),
         j.label, j.last_error, authz.health_when(j.last_ok_at), '/app/health') then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ───────────── «Αγνοήθηκε»: νέα κατάσταση αποστολής ─────────────

alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check (status in ('pending', 'sent', 'failed', 'suppressed', 'cancelled', 'ignored'));
alter table public.email_outbox add column ignored_at timestamptz, add column ignored_by uuid;
alter table public.email_outbox add constraint email_outbox_ignored_check check ((status = 'ignored') = (ignored_at is not null));

alter table public.email_log drop constraint email_log_status_check;
alter table public.email_log add constraint email_log_status_check check (status in ('sent', 'failed', 'suppressed', 'ignored'));
alter table public.email_log add column ignored_at timestamptz, add column ignored_by uuid;
alter table public.email_log add constraint email_log_ignored_check check ((status = 'ignored') = (ignored_at is not null));

-- Το email_log γράφεται στο Ίχνος μόνο όταν μπαίνει· τώρα και όταν αλλάζει η κατάστασή του (μόνο το «Αγνόησε» την αλλάζει).
create trigger email_log_audit_status after update of status on public.email_log
  for each row execute function authz.audit_row('id');

-- Η κατάσταση μιας γραμμής της ουράς email (όπως στο 20261015160000, με το «αγνοήθηκε»).
create or replace function authz.send_state(p_status text, p_attempts integer, p_error text) returns text
language sql immutable set search_path = ''
as $$
  select case p_status
    when 'pending' then case when p_attempts > 0 and coalesce(p_error, '') <> '' then 'retrying' else 'scheduled' end
    when 'sent' then 'sent'
    when 'failed' then 'failed'
    when 'ignored' then 'ignored'
    else 'not_sent'
  end;
$$;

create or replace function authz.send_reason(p_status text, p_error text) returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_status = 'cancelled' then 'Ακυρώθηκε πριν φύγει'
    when p_status = 'suppressed' then coalesce(nullif(p_error, ''), 'Εκτός επιτρεπόμενων διευθύνσεων')
    when p_status = 'ignored' then 'Αγνοήθηκε από την Υγεία συστήματος'
    when p_status in ('failed', 'pending') then nullif(p_error, '')
  end;
$$;

-- Όπως στο 20261015160000, με το «αγνοήθηκε» και στο σκέλος του email_log.
create or replace function authz.sends_history(p authz.send_filter) returns setof authz.send_row
language plpgsql stable security definer set search_path = ''
as $$
begin
  return query
  (select 'a' || lpad(s.id::text, 19, '0'), s.created_at, 'automation'::text, a.event_type, null::text, s.channel,
          s.recipient_key, null::integer, o.to_name, o.to_email, s.client_id,
          case when s.channel = 'notification' then case when s.notification_id is null then 'not_sent' else 'sent' end
               when o.id is null then 'not_sent'
               else authz.send_state(o.status, o.attempts, o.last_error) end,
          case when s.channel = 'notification' then case when s.notification_id is null then 0 else 1 end
               else coalesce(o.attempts, 0) end,
          case when (s.channel = 'notification' and s.notification_id is null) or (s.channel = 'email' and o.id is null)
               then 'Το είχε ήδη λάβει' else authz.send_reason(o.status, o.last_error) end,
          o.id
     from public.automation_sends s
     join public.automations a on a.id = s.automation_id
     left join public.email_outbox o on o.id = s.email_outbox_id
    where (p.channel is null or s.channel = p.channel)
      and (p.client is null or s.client_id = p.client)
      and (s.client_id is null or authz.send_client_ok(p, s.client_id))
      and not (a.event_type = any (p.hidden))
      and (not p.client_only
           or exists (select 1 from public.client_users cu where cu.client_id = p.client and cu.user_id::text = s.recipient_key))
      and (p.tab <> 'failed' or o.status = 'failed')
      and (p.tab = 'all' or o.id is null or authz.send_state(o.status, o.attempts, o.last_error) <> 'scheduled')
      and (p.before_at is null or s.created_at < p.before_at
           or (s.created_at = p.before_at and 'a' || lpad(s.id::text, 19, '0') < p.before_id))
    order by s.created_at desc, s.id desc
    limit p.lim + 1)
  union all
  (select 'o' || o.id::text, o.created_at, case when o.kind = 'automation' then 'automation' else 'system' end, a.event_type,
          case when o.kind = 'automation' then null else o.kind end, 'email'::text, null::text, null::integer,
          o.to_name, o.to_email, s2.client_id,
          authz.send_state(o.status, o.attempts, o.last_error), o.attempts, authz.send_reason(o.status, o.last_error), o.id
     from public.email_outbox o
     left join public.automations a on o.kind = 'automation' and a.id = authz.outbox_automation(o.payload)
     left join public.automation_sends s2 on o.retry_of is not null and s2.email_outbox_id = o.retry_of
    where not exists (select 1 from public.automation_sends s where s.email_outbox_id = o.id)
      and (p.channel is null or p.channel = 'email')
      and case when s2.client_id is not null then authz.send_client_ok(p, s2.client_id) else o.kind = 'automation' or p.sys end
      and not (coalesce(a.event_type, '') = any (p.hidden))
      and (p.finance or o.kind not in ('invoice_registered', 'invoice_overdue'))
      and (p.client is null
           or (authz.send_client_ok(p, p.client)
               and (s2.client_id = p.client
                    or (s2.client_id is null and authz.send_email_of_client(o.to_email, p.client, p.client_only)))))
      and (p.tab <> 'failed' or o.status = 'failed')
      and (p.tab = 'all' or authz.send_state(o.status, o.attempts, o.last_error) <> 'scheduled')
      and (p.before_at is null or o.created_at < p.before_at
           or (o.created_at = p.before_at and 'o' || o.id::text < p.before_id))
    order by o.created_at desc, o.id desc
    limit p.lim + 1)
  union all
  (select 'l' || l.id::text, l.sent_at, 'system'::text, null::text, l.kind, 'email'::text, null::text, null::integer,
          null::text, l.to_email, null::uuid,
          case l.status when 'sent' then 'sent' when 'failed' then 'failed' when 'ignored' then 'ignored' else 'not_sent' end, 1,
          case l.status when 'failed' then nullif(l.error, '')
                        when 'ignored' then authz.send_reason('ignored', null)
                        when 'suppressed' then coalesce(nullif(l.error, ''), 'Εκτός επιτρεπόμενων διευθύνσεων') end,
          null::uuid
     from public.email_log l
    where not l.via_outbox and p.sys
      and (p.channel is null or p.channel = 'email')
      and (p.finance or l.kind not in ('invoice_registered', 'invoice_overdue'))
      and (p.client is null
           or (authz.send_client_ok(p, p.client) and authz.send_email_of_client(l.to_email, p.client, p.client_only)))
      and (p.tab <> 'failed' or l.status = 'failed')
      and (p.before_at is null or l.sent_at < p.before_at
           or (l.sent_at = p.before_at and 'l' || l.id::text < p.before_id))
    order by l.sent_at desc, l.id desc
    limit p.lim + 1);
end;
$$;

-- ───────────── Ενέργειες ─────────────

-- «Ξαναστείλε» (όπως στο 20261015160000): πλέον με automations.manage ή health.view. Μία φορά ανά αποστολή.
create or replace function public.send_retry(p_ref uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  o public.email_outbox;
  v_problem text;
  v_id uuid;
begin
  if not (authz.has('automations.manage') or authz.has('health.view')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select x.* into o from public.email_outbox x where x.id = p_ref for update;
  if not found or o.status <> 'failed'
     or coalesce((select a.event_type from public.automations a where a.id = authz.outbox_automation(o.payload)), '')
          = any (authz.send_hidden_types())
     or (o.kind in ('invoice_registered', 'invoice_overdue') and not (authz.has('finance.amounts') or authz.has('finance.invoices'))) then
    raise exception 'Ξαναστέλνεται μόνο email που απέτυχε' using errcode = 'P0001';
  end if;
  v_problem := authz.send_retry_problem(o);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;
  begin
    insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by, retry_of)
    values (o.kind, o.to_name, o.to_email, o.locale, o.payload, auth.uid(), o.id)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Αυτό το email ξαναστάλθηκε ήδη μία φορά' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

-- «Αγνόησε» (health.view): μόνο μια αποτυχημένη αποστολή που φαίνεται στην Υγεία του θεατή (ίδιοι κανόνες με την κάρτα
-- Σήμερα). p_ref = το id της γραμμής της ουράς, ή 'l' + το id του email_log. Ίδιο λάθος για «δεν υπάρχει» και «δεν φαίνεται».
create function public.send_ignore(p_ref text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform authz.require('health.view');
  if p_ref is null or length(p_ref) > 40
     or not exists (select 1 from authz.today_failed_sends(v_uid, now()) s where s.id = p_ref) then
    raise exception 'Αγνοείται μόνο αποστολή που απέτυχε' using errcode = 'P0001';
  end if;
  if p_ref like 'l%' then
    update public.email_log set status = 'ignored', ignored_at = now(), ignored_by = v_uid
     where id = substr(p_ref, 2)::uuid and status = 'failed';
  else
    update public.email_outbox set status = 'ignored', ignored_at = now(), ignored_by = v_uid
     where id = p_ref::uuid and status = 'failed';
  end if;
end;
$$;

-- «Ξαναδοκίμασε» (health.view): Γεγονός που κόλλησε (5 αποτυχημένες προσπάθειες, όχι Υγείας) ξαναμπαίνει στην ουρά.
-- Όσοι το πήραν ήδη δεν το ξαναπαίρνουν (μοναδικό σημάδι ανά Αυτοματισμό, περίπτωση, παραλήπτη). Γεγονός που ο θεατής δεν
-- βλέπει (ποσά, κόστος): το ίδιο λάθος. Γραμμή στο Ίχνος χωρίς τον τύπο του Γεγονότος (μόνο id και προσπάθειες).
create function public.event_retry(p_event bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e public.events;
begin
  perform authz.require('health.view');
  select x.* into e from public.events x where x.id = p_event for update;
  if not found or e.processed_at is not null or e.attempts < 5 or e.type like 'health.%'
     or e.type = any (authz.send_hidden_types()) then
    raise exception 'Ξαναδοκιμάζεται μόνο Γεγονός που κόλλησε' using errcode = 'P0001';
  end if;
  update public.events set attempts = 0, last_error = null, locked_until = null where id = p_event;
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (auth.uid(), 'event', 'events', p_event::text, jsonb_build_object('attempts', e.attempts),
          jsonb_build_object('event', 'Ξαναδοκιμή Γεγονότος', 'attempts', 0));
end;
$$;

-- ───────────── Η σελίδα (health.view) ─────────────

-- Οι αποτυχημένες αποστολές της Υγείας: της κάρτας Σήμερα (7 μέρες, ό,τι φαίνεται στον θεατή, όχι αγνοημένες ή
-- ξαναστάλμένες), με παραλήπτη, λόγο και αν επιτρέπεται το «Ξαναστείλε». Ποτέ θέμα, σώμα ή link.
create function authz.health_sends(p_uid uuid, p_now timestamptz)
returns table (id text, at timestamptz, item jsonb)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.at,
         jsonb_build_object(
           'id', s.id, 'what', s.title, 'at', s.at,
           'recipient', coalesce(nullif(o.to_name, ''), o.to_email, l.to_email),
           'email', coalesce(o.to_email, l.to_email),
           'reason', left(coalesce(nullif(o.last_error, ''), nullif(l.error, '')), 200),
           'retryRef', case when o.id is null then null when authz.send_retry_problem(o) is null then o.id end)
    from authz.today_failed_sends(p_uid, p_now) s
    left join public.email_outbox o on o.id = case when s.id like 'l%' then null else s.id::uuid end
    left join public.email_log l on l.id = case when s.id like 'l%' then substr(s.id, 2)::uuid end;
$$;

-- Το Google για την P2: μόνο σύνδεση, τελευταίος συγχρονισμός, από πότε κρατά το σφάλμα, σύντομος λόγος, «σταμάτησε» (30′,
-- ο κανόνας του Γεγονότος 52) και αλλαγές σε ουρά. Ποτέ το κείμενο του σφάλματος ή στοιχεία άλλων συνδέσεων.
create function authz.health_google_view(p_now timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with g as (
    select x.calendar_id is not null as connected, x.last_sync_at, x.error_since, x.last_error
      from public.google_calendar x where x.id
  ), s as (
    select g.*, coalesce(g.connected and (g.last_sync_at < p_now - interval '30 minutes'
                                          or g.error_since < p_now - interval '30 minutes'), false) as stopped
      from g
  )
  select jsonb_build_object(
    'connected', coalesce((select s.connected from s), false),
    'lastSyncAt', (select s.last_sync_at from s),
    'errorSince', (select s.error_since from s),
    'stopped', coalesce((select s.stopped from s), false),
    'reason', (select case
                 when not s.connected then null
                 when s.error_since < p_now - interval '30 minutes' then 'Ο συγχρονισμός αποτυγχάνει για πάνω από 30 λεπτά.'
                 when s.stopped then 'Δεν έχει γίνει συγχρονισμός τα τελευταία 30 λεπτά.'
                 when s.last_error is not null then 'Ο τελευταίος συγχρονισμός είχε σφάλμα.'
               end from s),
    'pendingWrites', (select count(*) from public.google_outbox o where o.done_at is null));
$$;

-- { now, attention, jobs: [...], sends: { items, total }, google: {...}, events: { stuck, waiting }, ai: {...} }
-- Το p_now (null = τώρα) υπάρχει για τα τεστ.
create function public.health_view(p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_uid uuid := auth.uid();
  v_google jsonb;
  v_budget jsonb;
  v_jobs jsonb;
  v_late integer;
  v_sends jsonb;
  v_sends_total integer;
  v_stuck jsonb;
  v_stuck_total integer;
  v_waiting integer;
  v_google_stopped boolean;
  v_ai_alert boolean;
  v_hidden text[] := authz.send_hidden_types();
begin
  if not authz.has('health.view') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'job', r.job, 'label', r.label, 'schedule', r.schedule, 'lastOkAt', r.last_ok_at,
           'lastErrorAt', r.last_error_at, 'lastError', left(r.last_error, 200),
           'state', case when r.is_late then 'late' when r.last_ok_at is null then 'never' else 'ok' end)
           order by r.sort), '[]'::jsonb),
         count(*) filter (where r.is_counted)
    into v_jobs, v_late
    from authz.health_job_rows(v_now) r;
  select coalesce(jsonb_agg(x.item order by x.at desc, x.id) filter (where x.n <= 50), '[]'::jsonb), count(*)
    into v_sends, v_sends_total
    from (select h.*, row_number() over (order by h.at desc, h.id) as n from authz.health_sends(v_uid, v_now) h) x;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'what', coalesce(t.label_el, x.type), 'at', x.occurred_at, 'attempts', x.attempts,
           'reason', left(x.last_error, 200)) order by x.occurred_at, x.id) filter (where x.n <= 50), '[]'::jsonb),
         count(*)
    into v_stuck, v_stuck_total
    from (select e.*, row_number() over (order by e.occurred_at, e.id) as n from public.events e
           where e.processed_at is null and e.type not like 'health.%' and e.attempts >= 5
             and not (e.type = any (v_hidden))) x
    left join public.event_types t on t.code = x.type;
  select count(*) into v_waiting from public.events e
   where e.processed_at is null and e.type not like 'health.%' and e.attempts < 5 and not (e.type = any (v_hidden))
     and e.occurred_at < v_now - interval '15 minutes'
     and not exists (select 1 from authz.health_job_rows(v_now) r where r.job = 'outbox' and r.is_late);
  v_google := authz.health_google_view(v_now);
  v_google_stopped := (v_google ->> 'stopped')::boolean;
  v_budget := authz.ai_budget(v_now);
  v_ai_alert := coalesce((v_budget ->> 'capMicros')::bigint > 0
    and (v_budget ->> 'spentMicros')::bigint * 100 >= (v_budget ->> 'capMicros')::bigint * 80, false);
  return jsonb_build_object(
    'now', v_now,
    'attention', v_late + v_sends_total + v_stuck_total + (v_waiting > 0)::integer + v_google_stopped::integer
                 + v_ai_alert::integer,
    'jobs', v_jobs,
    'sends', jsonb_build_object('items', v_sends, 'total', v_sends_total),
    'google', v_google,
    'events', jsonb_build_object('stuck', v_stuck, 'stuckTotal', v_stuck_total, 'waiting', v_waiting),
    'ai', jsonb_build_object(
      'month', v_budget ->> 'month', 'spentMicros', (v_budget ->> 'spentMicros')::bigint,
      'capMicros', (v_budget ->> 'capMicros')::bigint, 'publicShare', (v_budget ->> 'publicShare')::integer,
      'alert', v_ai_alert));
end;
$$;

-- ───────────── Εξωτερικός έλεγχος (anon) ─────────────

-- Η εργασία της ουράς πέτυχε μέσα στα 10′ πριν από το p_now;
create function authz.health_ok(p_now timestamptz) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.job_runs j
                  where j.job = 'outbox' and j.last_ok_at >= p_now - interval '10 minutes' and j.last_ok_at <= p_now);
$$;

-- Μόνο ναι/όχι, πάντα για το τώρα. Το καλεί το δημόσιο /api/health χωρίς σύνδεση.
create function public.health_ok() returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.health_ok(now()); $$;

-- ───────────── Σήμερα: η κάρτα Υγείας ανοίγει την P2 ─────────────

update public.today_cards set link = '/app/health' where code = 'health';

-- Όπως στο 20261017130000, με τις εργασίες του καταλόγου (μία ανά αιτία) και όλες τις γραμμές προς την P2.
create or replace function authz.today_health_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, link text, n integer)
language sql stable security definer set search_path = ''
as $$
  select 'job:' || j.job, 'Δεν έτρεξε: ' || j.label, nullif(left(coalesce(j.last_error, ''), 120), ''),
         j.last_ok_at, '/app/health', 1
    from authz.health_job_rows(p_now) j
   where j.is_counted
  union all
  select 'google', 'Ο συγχρονισμός Google σταμάτησε', nullif(left(coalesce(g.last_error, ''), 120), ''),
         g.last_sync_at, '/app/health', 2
    from public.google_calendar g
   where g.id and g.calendar_id is not null
     and (g.last_sync_at < p_now - interval '30 minutes' or g.error_since < p_now - interval '30 minutes')
  union all
  select 'events', 'Γεγονότα δεν επεξεργάστηκαν', count(*) || ' σε αναμονή', min(e.occurred_at), '/app/health', 3
    from public.events e
   where e.processed_at is null and e.type not like 'health.%'
     and (e.attempts >= 5
          or (e.occurred_at < p_now - interval '15 minutes'
              and not exists (select 1 from public.job_runs j
                               where j.job = 'outbox' and j.last_ok_at is not null
                                 and j.last_ok_at < p_now - interval '10 minutes')))
  having count(*) > 0
  union all
  select s.id, 'Δεν στάλθηκε: ' || s.title, null, s.at, '/app/health', 4
    from authz.today_failed_sends(p_uid, p_now) s;
$$;

-- ───────────── Ίχνος: το «Ξαναδοκίμασε» ─────────────
-- Ξαναγράφεται ολόκληρο από τον τελικό ορισμό (20261018130000_gdpr.sql), με τα 'events' (μόνο τύπος και προσπάθειες).

create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'production_costs' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    -- Πρόσβαση και Ρυθμίσεις
    when 'roles' then true
    when 'role_permissions' then true
    when 'team_users' then true
    when 'team_user_roles' then true
    when 'company_settings' then true
    when 'bank_accounts' then true
    when 'readiness_confirmations' then true
    when 'system_state' then true
    -- Πωλήσεις: λίστες και ρυθμίσεις
    when 'sales_stages' then true
    when 'sales_sources' then true
    when 'sales_loss_reasons' then true
    when 'sales_activity_kinds' then true
    when 'sales_settings' then true
    -- Πωλήσεις: Πελάτες και Ευκαιρίες (το Εύρος κρίνεται ανά εγγραφή στο authz.audit_row_allowed)
    when 'clients' then true
    when 'client_duplicate_flags' then true
    when 'opportunities' then true
    when 'access_requests' then true
    -- Κατάλογος
    when 'provision_kinds' then true
    when 'catalogue_items' then true
    when 'catalogue_item_provisions' then true
    -- Συμφωνίες: ποσά και κόστος
    when 'agreement_line_costs' then authz.has('finance.cost')
    when 'agreement_costs' then authz.has('finance.cost') and authz.has('finance.amounts')
    when 'agreement_amounts' then authz.has('finance.amounts')
    when 'agreement_line_amounts' then authz.has('finance.amounts')
    when 'agreement_defaults' then authz.has('finance.amounts')
    -- Συμφωνίες: χωρίς ποσά (Σύνδεσμοι, κωδικοί, εξερχόμενα, έγγραφα και αναθεωρήσεις δεν γράφονται ποτέ στο Ίχνος)
    when 'agreements' then true
    when 'agreement_revision_limits' then true
    when 'agreement_milestones' then true
    when 'agreement_lines' then true
    when 'agreement_line_provisions' then true
    when 'agreement_recipients' then true
    when 'agreement_signatures' then true
    -- Εξοπλισμός: χωρίς ποσά
    when 'equipment_categories' then true
    when 'equipment_items' then true
    when 'equipment_templates' then true
    when 'equipment_template_items' then true
    -- Περίοδοι και Παραγωγές: χωρίς ποσά
    when 'agreement_periods' then true
    when 'agreement_period_provisions' then true
    when 'productions' then true
    when 'production_members' then true
    -- Γυρίσματα: χωρίς ποσά
    when 'filmings' then true
    when 'filming_crew' then true
    when 'filming_equipment' then true
    when 'crew_templates' then true
    when 'crew_template_members' then true
    when 'filming_settings' then true
    -- Ωράριο κρατήσεων: μόνο για όσους ορίζουν το Ωράριο
    when 'booking_week' then authz.has('settings.manage')
    when 'booking_exceptions' then authz.has('settings.manage')
    -- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): χωρίς ποσά· το email μόνο για τον Ιδιοκτήτη
    when 'access' then true
    when 'invitations' then true
    when 'client_users' then true
    when 'email_outbox' then authz.is_owner()
    when 'email_log' then authz.is_owner()
    -- Κλεισμένος χρόνος: με τίτλο μόνο για όσους κλείνουν χρόνο άλλων
    when 'blocked_times' then authz.has('calendar.block_others')
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    -- Παραδοτέα (#140): χωρίς ποσά
    when 'deliverables' then true
    when 'deliverable_versions' then true
    when 'deliverable_comments' then true
    -- Κανόνες Παραδοτέων (#141): χωρίς ποσά
    when 'deliverable_settings' then true
    -- Αιτήματα μετά την έγκριση (#142): χωρίς ποσά
    when 'deliverable_requests' then true
    -- Εργασίες Παραγωγής (#143): χωρίς ποσά
    when 'production_tasks' then true
    -- Οικονομικά (#150, #151, #152): οι Τρόποι δεν έχουν ποσά· Εισπράξεις, Τιμολογητέα και Τιμολόγια μόνο με «Βλέπει ποσά»
    when 'payment_methods' then true
    when 'receipts' then authz.has('finance.amounts')
    when 'billables' then authz.has('finance.amounts')
    when 'invoices' then authz.has('finance.amounts')
    -- Αιτήματα Μηνυμάτων (#163): το κλείσιμο έχει κείμενο προς τον πελάτη, άρα όπως τα Μηνύματα
    when 'message_requests' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Μηνύματα (#160): περιέχουν κείμενο Συνομιλίας, άρα μόνο όσοι βλέπουν όλες τις Συνομιλίες
    when 'messages' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Ρυθμίσεις Μηνυμάτων (#164): αριθμοί χωρίς κείμενο ή ποσά
    when 'message_settings' then authz.has('audit.view')
    -- Αυτοματισμοί (#170): κείμενα και παραλήπτες, χωρίς ποσά
    when 'automations' then authz.has('automations.manage') or authz.has('audit.view')
    -- Αργίες (#172): ονόματα και ημερομηνίες
    when 'holiday_greetings' then authz.has('automations.manage') or authz.has('audit.view')
    -- Μηνύματα συστήματος (#173): κείμενα, χωρίς σύνδεσμους ή κωδικούς
    when 'system_messages' then authz.has('automations.manage') or authz.has('audit.view')
    -- Γνώση (#190): περιέχει πρόχειρα, άρα μόνο όσοι διαχειρίζονται τη Γνώση
    when 'knowledge_sections' then authz.has('knowledge.manage')
    when 'knowledge_items' then authz.has('knowledge.manage')
    when 'knowledge_item_audience' then authz.has('knowledge.manage')
    -- Εξαγωγές (#200, #201): τι, φίλτρα, γραμμές· χωρίς ποσά
    when 'report_exports' then true
    -- Συνδρομές (#209): πάροχοι και κόστος, μόνο ο Ιδιοκτήτης
    when 'subscriptions' then authz.is_owner()
    -- GDPR (#208): αιτήματα, εξαγωγές και ανωνυμοποιήσεις, μόνο για τον Ιδιοκτήτη (ποτέ η Διαχείριση)
    when 'gdpr_requests' then authz.is_owner()
    when 'gdpr' then authz.is_owner()
    -- Υγεία (#215): «Ξαναδοκίμασε» ενός Γεγονότος που κόλλησε· μόνο τύπος και προσπάθειες
    when 'events' then true
    else false
  end;
$$;

-- Ο κατάλογος του Ίχνους (20261018140000_audit_trail.sql): το «Ξαναδοκίμασε» στην περιοχή Υγεία. Το «Αγνόησε» και το
-- «Ξαναστείλε» γράφονται στα email_outbox / email_log, που είναι ήδη στον κατάλογο (μόνο Ιδιοκτήτης).
insert into public.audit_entities (entity, area, label, parent, amount_keys, cost_keys, visibility)
values ('events', 'health', 'Ξαναδοκιμή Γεγονότος', null, '{}', '{}', 'rule');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.health_job_catalog(), authz.health_job_rows(timestamptz), authz.health_sends(uuid, timestamptz),
  authz.health_google_view(timestamptz),
  authz.health_ok(timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.send_ignore(text), public.event_retry(bigint), public.health_view(timestamptz)
  from public, anon;
grant execute on function
  public.send_ignore(text), public.event_retry(bigint), public.health_view(timestamptz)
  to authenticated;

revoke all on function public.health_ok() from public;
grant execute on function public.health_ok() to anon, authenticated;
