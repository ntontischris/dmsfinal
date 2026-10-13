-- Γνώση Lγ (#193): ο Βοηθός (A9), το πλαφόν δαπάνης AI, οι Ρυθμίσεις του Βοηθού και τα follow-ups Υγείας του Lβ/Lδ.
--
--  • Ο Βοηθός (server της εφαρμογής) διαβάζει μόνο με το assistant_context (authenticated): τα κομμάτια Γνώσης που βλέπει ο
--    ερωτών (το hybrid search του Lβ με uid = auth.uid(), ΠΟΤΕ uid από το αίτημα), την ομοιότητα συνημιτόνου καθενός (το score
--    του RRF δεν είναι ομοιότητα· το κατώφλι «δεν ξέρω» ζει στον κώδικα) και τα δημόσια Πακέτα του Καταλόγου (τιμή μόνο όταν
--    «δείχνει τιμή»). Τομείς δεν υπάρχουν ακόμα στη βάση· μπαίνουν εδώ όταν φτιαχτεί ο πίνακάς τους.
--  • Πλαφόν (Γ3): μηνιαία δαπάνη = άθροισμα ai_usage.cost_micros από την 1η του μήνα, ώρα Ελλάδας (authz.ai_month_spend).
--    Τα company_settings.ai_monthly_cap_usd / ai_widget_share υπάρχουν από το O1. Χρήστες: ανοιχτό κάτω από το 100%· δημόσιο
--    widget: κάτω από το μερίδιο (αρχικά 80%). public.ai_budget (service_role) το διαβάζει ο server, public.ai_spend_view
--    (settings.manage) η κάρτα Βοηθού των Ρυθμίσεων. Το ποσό και το μερίδιο αλλάζουν ΜΟΝΟ από τον Ιδιοκτήτη
--    (assistant_cap_save, έλεγχος πρώτος → 42501)· τα όρια μηνυμάτων μένουν στην κάρτα του O1 (settings.manage).
--  • Γεγονός 57 «Πλαφόν του Βοηθού»: trigger στο ai_usage. Όταν η δαπάνη του μήνα φτάσει το 80% και το 100%, μία φορά ανά όριο
--    ανά μήνα (case_key assistant.cap_reached:YYYY-MM:80|100). Αρχικοί Αυτοματισμοί: Ειδοποίηση και email σε όσους «Βλέπουν Υγεία
--    συστήματος». Πλαφόν 0 = AI κλειστό, χωρίς Γεγονός.
--  • Υγεία: ετικέτες για knowledge_index και assistant_purge· νέα εργασία assistant_purge στο job_runs (το ημερήσιο cron γράφει
--    με το job_run_mark)· όριο «δεν έτρεξε» ανά εργασία (authz.health_job_grace: 26 ώρες για το purge, 10′ για τις υπόλοιπες,
--    όπως πριν). Ξαναγράφονται από τους ΤΕΛΕΥΤΑΙΟΥΣ ορισμούς: authz.health_job_label, authz.health_jobs, public.job_run_mark
--    (20261015160100_health_notifications.sql), authz.today_health_rows (20261016100000_today.sql), το check του job_runs
--    (20261017110000_knowledge_index.sql).
--  • Πίνακες: κανένας νέος. Το ai_usage και το job_runs μένουν κλειστά.

-- ───────────── Υγεία ─────────────

alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs add constraint job_runs_job_check
  check (job in ('outbox', 'google', 'knowledge_index', 'assistant_purge'));

create or replace function authz.health_job_label(p_job text) returns text
language sql immutable set search_path = ''
as $$
  select case p_job
    when 'outbox' then 'Ουρά email και Αυτοματισμοί'
    when 'google' then 'Συγχρονισμός Google'
    when 'knowledge_index' then 'Μνήμη του Βοηθού'
    when 'assistant_purge' then 'Καθαρισμός Συζητήσεων Βοηθού'
    else p_job end;
$$;

-- Πόση ώρα χωρίς επιτυχία μετρά ως «δεν έτρεξε». Το ημερήσιο purge έχει περιθώριο 2 ωρών πάνω από τη μέρα.
create function authz.health_job_grace(p_job text) returns interval
language sql immutable set search_path = ''
as $$ select case p_job when 'assistant_purge' then interval '26 hours' else interval '10 minutes' end; $$;

-- p_ok null = έναρξη, true = πέτυχε, false = σφάλμα (με p_error). Το p_now (null = τώρα) υπάρχει για τα τεστ.
create or replace function public.job_run_mark(
  p_job text, p_ok boolean, p_error text default null, p_now timestamptz default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  if coalesce(p_job, '') not in ('outbox', 'google', 'assistant_purge') then
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

-- 50: κάθε εργασία ελέγχει τις άλλες. Μία που έτρεχε (last_ok_at) και δεν πέτυχε για πάνω από το όριό της.
create or replace function authz.health_jobs(p_job text, p_now timestamptz) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  j public.job_runs;
  v_count integer := 0;
begin
  for j in
    select * from public.job_runs x
     where x.job <> p_job and x.last_ok_at is not null and x.last_ok_at < p_now - authz.health_job_grace(x.job)
  loop
    if authz.health_emit('health.job_missed', 'job_runs', null,
         'health.job_missed:' || j.job || ':'
           || to_char((j.last_ok_at + authz.health_job_grace(j.job)) at time zone 'Europe/Athens', 'YYYYMMDD'),
         authz.health_job_label(j.job), j.last_error, authz.health_when(j.last_ok_at), '/app/settings/sends') then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Ό,τι κοκκίνισε στην Υγεία (κάρτα Σήμερα). Ίδιο με το 20261016100000_today.sql, με το όριο ανά εργασία στην πρώτη γραμμή.
create or replace function authz.today_health_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, link text, n integer)
language sql stable security definer set search_path = ''
as $$
  select 'job:' || j.job, 'Δεν έτρεξε: ' || authz.health_job_label(j.job), nullif(left(coalesce(j.last_error, ''), 120), ''),
         j.last_ok_at, '/app/settings/sends', 1
    from public.job_runs j
   where j.last_ok_at is not null and j.last_ok_at < p_now - authz.health_job_grace(j.job)
  union all
  select 'google', 'Ο συγχρονισμός Google σταμάτησε', nullif(left(coalesce(g.last_error, ''), 120), ''),
         g.last_sync_at,
         case when authz.user_is_owner(p_uid) then '/app/settings/integrations' else '/app/settings/sends' end, 2
    from public.google_calendar g
   where g.id and g.calendar_id is not null
     and (g.last_sync_at < p_now - interval '30 minutes' or g.error_since < p_now - interval '30 minutes')
  union all
  select 'events', 'Γεγονότα δεν επεξεργάστηκαν', count(*) || ' σε αναμονή', min(e.occurred_at), '/app/settings/sends', 3
    from public.events e
   where e.processed_at is null and e.type not like 'health.%'
     and (e.attempts >= 5
          or (e.occurred_at < p_now - interval '15 minutes'
              and not exists (select 1 from public.job_runs j
                               where j.job = 'outbox' and j.last_ok_at is not null
                                 and j.last_ok_at < p_now - interval '10 minutes')))
  having count(*) > 0
  union all
  select s.id, 'Δεν στάλθηκε: ' || s.title, null, s.at, '/app/settings/sends?tab=failed', 4
    from authz.today_failed_sends(p_uid, p_now) s;
$$;

-- ───────────── Πλαφόν δαπάνης AI ─────────────

-- Δαπάνη του μήνα (Europe/Athens) που περιέχει το p_now, σε μικρο-δολάρια.
create function authz.ai_month_spend(p_now timestamptz default now()) returns bigint
language sql stable security definer set search_path = ''
as $$
  with m as (select date_trunc('month', coalesce(p_now, now()) at time zone 'Europe/Athens') as local_start)
  select coalesce(sum(u.cost_micros), 0)::bigint
    from public.ai_usage u, m
   where u.at >= m.local_start at time zone 'Europe/Athens'
     and u.at < (m.local_start + interval '1 month') at time zone 'Europe/Athens';
$$;

-- { month, spentMicros, capMicros, publicShare, publicLimitMicros, usersOpen, publicOpen }
create function authz.ai_budget(p_now timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with s as (select authz.ai_month_spend(coalesce(p_now, now())) as spent),
       c as (select round(x.ai_monthly_cap_usd * 1000000)::bigint as cap, x.ai_widget_share as share
               from public.company_settings x where x.id)
  select jsonb_build_object(
           'month', to_char(coalesce(p_now, now()) at time zone 'Europe/Athens', 'YYYY-MM'),
           'spentMicros', s.spent, 'capMicros', c.cap, 'publicShare', c.share,
           'publicLimitMicros', c.cap * c.share / 100,
           'usersOpen', s.spent < c.cap, 'publicOpen', s.spent < c.cap * c.share / 100)
    from s, c;
$$;

-- Ο server του Βοηθού (και η αναζήτηση A8) ρωτά αν επιτρέπεται κλήση AI.
create function public.ai_budget(p_now timestamptz default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.ai_budget(p_now); $$;

-- Η κάρτα Βοηθού των Ρυθμίσεων: δαπάνη μήνα και πλαφόν. Μόνο «Διαχειρίζεται Ρυθμίσεις».
create function public.ai_spend_view(p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  return authz.ai_budget(p_now);
end;
$$;

-- Πλαφόν και μερίδιο δημόσιου: μόνο ο Ιδιοκτήτης (έλεγχος πρώτος). p_version = το updated_at που είδε (null = χωρίς έλεγχο).
-- → { updatedAt }
create function public.assistant_cap_save(p_cap numeric, p_share integer, p_version timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_at timestamptz;
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_cap is null or p_cap < 0 or p_cap >= 1000000 then
    raise exception 'Το πλαφόν δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  if p_share is null or p_share not between 0 and 100 then
    raise exception 'Το μερίδιο είναι από 0 έως 100%%' using errcode = 'P0001';
  end if;
  update public.company_settings c
     set ai_monthly_cap_usd = round(p_cap, 2), ai_widget_share = p_share
   where c.id and (p_version is null or c.updated_at = p_version)
  returning c.updated_at into v_at;
  if v_at is null then
    raise exception 'Κάποιος άλλος άλλαξε τις Ρυθμίσεις στο μεταξύ. Ξαναφόρτωσε τη σελίδα.' using errcode = 'P0001';
  end if;
  return jsonb_build_object('updatedAt', v_at);
end;
$$;

-- Γεγονός 57: μετά από κάθε καταγραφή κόστους, αν η δαπάνη του μήνα έφτασε το 80% ή το 100% του πλαφόν και η περίπτωση
-- (μήνας, όριο) δεν υπάρχει ήδη. Το advisory lock κρατά το «μία φορά» και με ταυτόχρονες καταγραφές.
create function authz.ai_cap_watch() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cap bigint;
  v_spent bigint;
  v_level integer;
  v_case text;
begin
  select round(c.ai_monthly_cap_usd * 1000000)::bigint into v_cap from public.company_settings c where c.id;
  if coalesce(v_cap, 0) <= 0 then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtext('assistant.cap_reached'));
  v_spent := authz.ai_month_spend(new.at);
  foreach v_level in array array[80, 100] loop
    v_case := 'assistant.cap_reached:' || to_char(new.at at time zone 'Europe/Athens', 'YYYY-MM') || ':' || v_level;
    if v_spent * 100 >= v_cap * v_level and not exists (select 1 from public.events e where e.case_key = v_case) then
      perform authz.emit_event('assistant.cap_reached', 'ai_usage', null, v_case, null,
        jsonb_build_object('limit', v_level || '%', 'month', to_char(new.at at time zone 'Europe/Athens', 'MM/YYYY'),
                           'link', '/app/settings/company'));
    end if;
  end loop;
  return null;
end;
$$;

create trigger ai_usage_cap_watch after insert on public.ai_usage
  for each row execute function authz.ai_cap_watch();

update public.event_types set is_wired = true where code = 'assistant.cap_reached';

insert into public.automations (event_type, channel, recipient_kind, recipient_permission, subject_el, subject_en,
                                body_el, body_en, is_enabled, is_initial, sort)
values
  ('assistant.cap_reached', 'notification', 'permission', 'health.view', null, null,
   'Η δαπάνη AI του μήνα {month} έφτασε το {limit} του πλαφόν. Στο 80% σταματά ο Βοηθός της Ιστοσελίδας· στο 100% και ο Βοηθός μέσα στο σύστημα, ως την 1η του επόμενου μήνα.',
   'AI spend for {month} reached {limit} of the cap. At 80% the website Assistant stops; at 100% the in-app Assistant stops too, until the 1st of next month.',
   true, true, 1),
  ('assistant.cap_reached', 'email', 'permission', 'health.view', 'Πλαφόν του Βοηθού: {limit}', 'Assistant cap: {limit}',
   'Η δαπάνη AI του μήνα {month} έφτασε το {limit} του πλαφόν. Στο 80% σταματά ο Βοηθός της Ιστοσελίδας· στο 100% και ο Βοηθός μέσα στο σύστημα, ως την 1η του επόμενου μήνα. Το πλαφόν αλλάζει στις Ρυθμίσεις › Εταιρεία › Βοηθός.',
   'AI spend for {month} reached {limit} of the cap. At 80% the website Assistant stops; at 100% the in-app Assistant stops too, until the 1st of next month. The cap is in Settings › Company › Assistant.',
   true, true, 2);

-- ───────────── Ο Βοηθός: τι διαβάζει ─────────────

-- Τα δημόσια Πακέτα του Καταλόγου, όπως φαίνονται εκεί (τιμή χωρίς ΦΠΑ μόνο όταν «δείχνει τιμή»). matched = η ερώτηση έχει
-- έστω μία λέξη του Πακέτου (ελληνικό full-text, «ή»)· canOpen = ο ερωτών βλέπει τον Κατάλογο, άρα ανοίγει τη σελίδα του.
create function authz.assistant_packages(p_q text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with q as (
    select nullif(replace(plainto_tsquery('pg_catalog.greek'::regconfig, left(coalesce(p_q, ''), 1000))::text, ' & ', ' | '), '')::tsquery
             as query
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'name', i.name, 'nameEn', i.name_en, 'billing', i.billing,
           'description', i.description_public, 'descriptionEn', i.description_public_en,
           'price', case when i.shows_price then a.price end,
           'provisions', coalesce((
             select jsonb_agg(jsonb_build_object('label', k.label, 'labelEn', k.label_en, 'unit', k.unit,
                                                 'unitEn', k.unit_en, 'quantity', p.quantity) order by k.sort, k.id)
               from public.catalogue_item_provisions p
               join public.provision_kinds k on k.id = p.kind_id
              where p.item_id = i.id), '[]'::jsonb),
           'matched', coalesce(to_tsvector('pg_catalog.greek'::regconfig,
                                 i.name || ' ' || i.name_en || ' ' || i.description_public || ' ' || i.description_public_en)
                               @@ q.query, false),
           'canOpen', authz.can_view_catalogue())
         order by lower(i.name), i.id), '[]'::jsonb)
    from public.catalogue_items i
    left join public.catalogue_item_amounts a on a.item_id = i.id
    cross join q
   where i.kind = 'package' and i.is_public and i.retired_at is null;
$$;

-- Ό,τι χρειάζεται ο server του Βοηθού για μία ερώτηση. Μόνο Χρήστης ομάδας ή Χρήστης πελάτη με τρέχοντα Πελάτη (αλλιώς 42501).
-- p_embedding = το embedding της ερώτησης (1536). Τα κομμάτια είναι μόνο όσα βλέπει ο ερωτών (auth.uid()).
-- { chunks: [{ itemId, chunkId|null, kind, title, sectionName, content, similarity|null }],   (έως 12, το καλύτερο RRF πρώτο)
--   packages: [{ id, name, nameEn, billing, description, descriptionEn, price|null, provisions: [...], matched, canOpen }] }
create function public.assistant_context(p_q text, p_embedding extensions.vector) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not (authz.is_team_user() or authz.client_user_client_id() is not null) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_embedding is null or extensions.vector_dims(p_embedding) <> 1536 then
    raise exception 'Λείπει το embedding της ερώτησης' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'chunks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'itemId', h.item_id, 'chunkId', h.chunk_id, 'kind', i.kind, 'title', i.title, 'sectionName', s.name,
               'content', h.content,
               'similarity', case when c.id is not null then 1 - (c.embedding operator(extensions.<=>) p_embedding) end)
             order by h.score desc, h.item_id, h.chunk_id)
        from authz.knowledge_hybrid(v_uid, p_q, p_embedding, 12) h
        join public.knowledge_items i on i.id = h.item_id
        join public.knowledge_sections s on s.id = i.section_id
        left join public.knowledge_chunks c on c.id = h.chunk_id), '[]'::jsonb),
    'packages', authz.assistant_packages(p_q));
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.health_job_grace(text), authz.ai_month_spend(timestamptz), authz.ai_budget(timestamptz), authz.ai_cap_watch(),
  authz.assistant_packages(text)
  from public, anon, authenticated;

revoke all on function
  public.ai_spend_view(timestamptz), public.assistant_cap_save(numeric, integer, timestamptz),
  public.assistant_context(text, extensions.vector)
  from public, anon;
grant execute on function
  public.ai_spend_view(timestamptz), public.assistant_cap_save(numeric, integer, timestamptz),
  public.assistant_context(text, extensions.vector)
  to authenticated;

revoke all on function public.ai_budget(timestamptz) from public, anon, authenticated;
grant execute on function public.ai_budget(timestamptz) to service_role;
