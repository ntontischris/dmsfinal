-- Ομάδα Νγ (#209): Ενσωματώσεις και συνδρομές (N5, μόνο Ιδιοκτήτης). Δέσμη Ν9–Ν10.
--
--  • Κατάσταση συνδέσεων: public.integrations_view(p_now) δίνει στον server ΜΟΝΟ γεγονότα της βάσης (job_runs, email_log,
--    google_calendar, ai_usage + πλαφόν, τελευταίοι έλεγχοι, GA4/Pixel). Η κατάσταση (λειτουργεί / προσοχή / δεν λειτουργεί /
--    δεν έχει στηθεί) βγαίνει στον server από αυτά και από το αν υπάρχει η μεταβλητή περιβάλλοντος (ποτέ η τιμή της). Μόνο ο
--    Ιδιοκτήτης· η Υγεία (P2) θα διευρύνει την πύλη σε health.view όταν φτιαχτεί.
--  • «Έλεγχος τώρα»: integration_checks (κλειστός πίνακας), μία γραμμή ανά σύνδεση (google, email, ai). Το
--    integration_check_begin επιτρέπει το πολύ μία έναρξη το λεπτό ανά σύνδεση (στη βάση, με κλείδωμα γραμμής), το
--    integration_check_finish γράφει την τελευταία επιτυχία ή αποτυχία του ελέγχου που ξεκίνησε. Οι public εκδοχές
--    χρησιμοποιούν πάντα now(), ώστε ο καλών να μην παρακάμπτει το όριο· οι authz.* παίρνουν p_now για τα τεστ.
--  • GA4 (G-…) και Meta Pixel (ψηφία) στα company_settings, με έλεγχο μορφής. Τα αλλάζει μόνο ο Ιδιοκτήτης
--    (company_analytics_save και ο φύλακας του πίνακα). Είναι δημόσια αναγνωριστικά, όχι κλειδιά.
--  • Μητρώο συνδρομών (subscriptions): RLS μόνο για τον Ιδιοκτήτη, σύνολα ανά νόμισμα ISO στη βάση (subscriptions_view),
--    χωρίς μετατροπή. Ίχνος σε κάθε αλλαγή (μόνο ο Ιδιοκτήτης το βλέπει).
--  • Γεγονός 59 «Η συνδρομή ανανεώνεται σε 7 μέρες» (subscription.renewing, ΣΤ, με ημερομηνία): άγκυρα η ημερομηνία
--    ανανέωσης. Αρχικός Αυτοματισμός: Ειδοποίηση στους Ιδιοκτήτες, 7 μέρες πριν στις 09:00, ενεργός. Τα Προγραμματισμένα
--    (K3) δείχνουν τις υπενθυμίσεις συνδρομών μόνο στον Ιδιοκτήτη, και το authz.event_visible_to δεν τις αφήνει να φτάσουν σε
--    κανέναν άλλον, όποιον παραλήπτη κι αν ορίσει η Διαχείριση σε έναν Αυτοματισμό.
--  • Ξαναγράφονται από τους ΤΕΛΕΥΤΑΙΟΥΣ ορισμούς: authz.guard_company_settings (20261007181517_company_settings.sql),
--    authz.timed_cases, authz.event_visible_to και public.automations_upcoming (20261015140100_automation_timing.sql), authz.audit_entity_allowed
--    (20261017160000_reports_export.sql).

-- ───────────── GA4 και Meta Pixel στα στοιχεία της Εταιρείας ─────────────

alter table public.company_settings
  add column ga4_measurement_id text not null default ''
    check (ga4_measurement_id = '' or ga4_measurement_id ~ '^G-[A-Z0-9]{4,16}$'),
  add column meta_pixel_id text not null default ''
    check (meta_pixel_id = '' or meta_pixel_id ~ '^[0-9]{6,20}$');

-- Όπως το 20261007181517, και τα GA4 / Pixel στα «μόνο Ιδιοκτήτης».
create or replace function authz.guard_company_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not authz.is_owner() and (
    new.tax_id is distinct from old.tax_id
    or new.tax_office is distinct from old.tax_office
    or new.gemi is distinct from old.gemi
    or new.vat_rate is distinct from old.vat_rate
    or new.ai_monthly_cap_usd is distinct from old.ai_monthly_cap_usd
    or new.ai_widget_share is distinct from old.ai_widget_share
    or new.ga4_measurement_id is distinct from old.ga4_measurement_id
    or new.meta_pixel_id is distinct from old.meta_pixel_id
  ) then
    raise exception 'Τα φορολογικά στοιχεία, τον ΦΠΑ, το πλαφόν AI και τα αναγνωριστικά στατιστικών τα αλλάζει μόνο ο Ιδιοκτήτης'
      using errcode = 'P0001';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create function authz.require_owner() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Μόνο ο Ιδιοκτήτης (έλεγχος πρώτος). Κενό = δεν έχει οριστεί. → { ga4, pixel, updatedAt }
create function public.company_analytics_save(p_ga4 text, p_pixel text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_ga4 text := upper(trim(coalesce(p_ga4, '')));
  v_pixel text := trim(coalesce(p_pixel, ''));
  v_at timestamptz;
begin
  perform authz.require_owner();
  if v_ga4 <> '' and v_ga4 !~ '^G-[A-Z0-9]{4,16}$' then
    raise exception 'Το Measurement ID του Google Analytics έχει τη μορφή G-XXXXXXXXXX' using errcode = 'P0001';
  end if;
  if v_pixel <> '' and v_pixel !~ '^[0-9]{6,20}$' then
    raise exception 'Το Meta Pixel ID έχει μόνο ψηφία (6 έως 20)' using errcode = 'P0001';
  end if;
  update public.company_settings c set ga4_measurement_id = v_ga4, meta_pixel_id = v_pixel
   where c.id
  returning c.updated_at into v_at;
  return jsonb_build_object('ga4', v_ga4, 'pixel', v_pixel, 'updatedAt', v_at);
end;
$$;

-- ───────────── «Έλεγχος τώρα» ─────────────

create table public.integration_checks (
  connection text primary key check (connection in ('google', 'email', 'ai')),
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_ok_at timestamptz,
  last_failed_at timestamptz,
  -- Μόνο κωδικός ή σύντομη περιγραφή (π.χ. «Resend 401»)· ποτέ κλειδί, URL ή σώμα απάντησης.
  last_error text check (last_error is null or length(last_error) <= 300)
);

alter table public.integration_checks enable row level security;
revoke all on table public.integration_checks from anon, authenticated;

-- Έναρξη ελέγχου: το πολύ μία φορά το λεπτό ανά σύνδεση. → { startedAt, calendarId? } (το id του ημερολογίου μόνο για το
-- Google, για την κλήση του server· δεν φτάνει στον browser).
create function authz.integration_check_begin(p_connection text, p_now timestamptz) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_at timestamptz;
begin
  perform authz.require_owner();
  if p_connection is null or p_connection not in ('google', 'email', 'ai') then
    raise exception 'Αυτή η σύνδεση δεν ελέγχεται από εδώ' using errcode = 'P0001';
  end if;
  insert into public.integration_checks as c (connection, last_started_at) values (p_connection, v_now)
  on conflict (connection) do update set last_started_at = excluded.last_started_at
   where c.last_started_at is null or c.last_started_at <= excluded.last_started_at - interval '1 minute'
  returning c.last_started_at into v_at;
  if v_at is null then
    raise exception 'Ο έλεγχος έγινε πριν από λιγότερο από ένα λεπτό. Δοκίμασε ξανά σε λίγο.' using errcode = 'P0001';
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'startedAt', v_now,
    'calendarId', case when p_connection = 'google' then (select g.calendar_id from public.google_calendar g where g.id) end));
end;
$$;

-- Αποτέλεσμα του ελέγχου που ξεκίνησε (τα τελευταία 2 λεπτά, χωρίς αποτέλεσμα ακόμα).
create function authz.integration_check_finish(p_connection text, p_ok boolean, p_error text, p_now timestamptz) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_ok boolean := coalesce(p_ok, false);
begin
  perform authz.require_owner();
  update public.integration_checks c
     set last_finished_at = v_now,
         last_ok_at = case when v_ok then v_now else c.last_ok_at end,
         last_failed_at = case when v_ok then c.last_failed_at else v_now end,
         last_error = case when v_ok then null else left(coalesce(nullif(trim(p_error), ''), 'Άγνωστο σφάλμα'), 300) end
   where c.connection = p_connection
     and c.last_started_at <= v_now and c.last_started_at > v_now - interval '2 minutes'
     and (c.last_finished_at is null or c.last_finished_at < c.last_started_at);
  if not found then
    raise exception 'Δεν υπάρχει έλεγχος σε εξέλιξη για αυτή τη σύνδεση' using errcode = 'P0001';
  end if;
end;
$$;

create function public.integration_check_begin(p_connection text) returns jsonb
language sql security definer set search_path = ''
as $$ select authz.integration_check_begin(p_connection, now()); $$;

create function public.integration_check_finish(p_connection text, p_ok boolean, p_error text default null) returns void
language sql security definer set search_path = ''
as $$ select authz.integration_check_finish(p_connection, p_ok, p_error, now()); $$;

-- ───────────── Τα γεγονότα πίσω από την κατάσταση (μία πηγή για N5 και, αργότερα, P2) ─────────────

-- { now, email: { jobOkAt, lastSentAt, sentToday, failedToday },
--   google: { calendarConnected, lastSyncAt, lastError, errorSince, pendingWrites },
--   ai: { month, spentMicros, capMicros, lastUsedAt },
--   checks: { <σύνδεση>: { lastStartedAt, lastOkAt, lastFailedAt, lastError } },
--   analytics: { ga4, pixel } }
-- Η «σημερινή» μέρα είναι ώρα Ελλάδας. Ό,τι γράφτηκε μετά το p_now δεν μετρά.
create function authz.integrations_view(p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_day timestamptz := date_trunc('day', v_now at time zone 'Europe/Athens') at time zone 'Europe/Athens';
  g public.google_calendar;
  v_budget jsonb;
begin
  perform authz.require_owner();
  select x.* into g from public.google_calendar x where x.id;
  v_budget := authz.ai_budget(v_now);
  return jsonb_build_object(
    'now', v_now,
    'email', jsonb_build_object(
      'jobOkAt', (select j.last_ok_at from public.job_runs j where j.job = 'outbox'),
      'lastSentAt', (select max(l.sent_at) from public.email_log l where l.status = 'sent' and l.sent_at <= v_now),
      'sentToday', (select count(*) from public.email_log l
                     where l.status = 'sent' and l.sent_at >= v_day and l.sent_at <= v_now),
      'failedToday', (select count(*) from public.email_log l
                       where l.status = 'failed' and l.sent_at >= v_day and l.sent_at <= v_now)),
    'google', jsonb_build_object(
      'calendarConnected', g.calendar_id is not null,
      'lastSyncAt', g.last_sync_at,
      'lastError', g.last_error,
      'errorSince', g.error_since,
      'pendingWrites', (select count(*) from public.google_outbox o where o.done_at is null)),
    'ai', jsonb_build_object(
      'month', v_budget ->> 'month',
      'spentMicros', (v_budget ->> 'spentMicros')::bigint,
      'capMicros', (v_budget ->> 'capMicros')::bigint,
      'lastUsedAt', (select max(u.at) from public.ai_usage u where u.at <= v_now)),
    'checks', coalesce((
      select jsonb_object_agg(c.connection, jsonb_build_object(
               'lastStartedAt', c.last_started_at, 'lastOkAt', c.last_ok_at,
               'lastFailedAt', c.last_failed_at, 'lastError', c.last_error))
        from public.integration_checks c), '{}'::jsonb),
    'analytics', (select jsonb_build_object('ga4', s.ga4_measurement_id, 'pixel', s.meta_pixel_id)
                    from public.company_settings s where s.id));
end;
$$;

create function public.integrations_view(p_now timestamptz default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.integrations_view(p_now); $$;

-- ───────────── Μητρώο συνδρομών ─────────────

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (length(trim(provider)) between 1 and 80),
  covers text not null default '' check (length(covers) <= 200),
  plan text not null default '' check (length(plan) <= 80),
  monthly_cost numeric(10, 2) not null check (monthly_cost >= 0 and monthly_cost < 100000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  renews_on date,
  account text not null default '' check (length(account) <= 120),
  paid_by text not null default '' check (length(paid_by) <= 120),
  link text not null default '' check (link = '' or (link ~ '^https://[^[:space:]]+$' and length(link) <= 500)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index subscriptions_renews_idx on public.subscriptions (renews_on) where renews_on is not null;

alter table public.subscriptions enable row level security;
revoke all on table public.subscriptions from anon;

create function authz.subscriptions_stamp() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger subscriptions_stamp before insert or update on public.subscriptions
  for each row execute function authz.subscriptions_stamp();
create trigger subscriptions_audit after insert or update or delete on public.subscriptions
  for each row execute function authz.audit_row('id');

create policy "Τις συνδρομές τις βλέπει μόνο ο Ιδιοκτήτης"
  on public.subscriptions for select to authenticated using (authz.is_owner());
create policy "Συνδρομές προσθέτει μόνο ο Ιδιοκτήτης"
  on public.subscriptions for insert to authenticated with check (authz.is_owner());
create policy "Συνδρομές αλλάζει μόνο ο Ιδιοκτήτης"
  on public.subscriptions for update to authenticated using (authz.is_owner()) with check (authz.is_owner());
create policy "Συνδρομές διαγράφει μόνο ο Ιδιοκτήτης"
  on public.subscriptions for delete to authenticated using (authz.is_owner());

-- { items: [{ id, provider, covers, plan, monthlyCost, currency, renewsOn, account, paidBy, link, updatedAt }],
--   totals: [{ currency, total, count }] } — ένα σύνολο ανά νόμισμα, χωρίς μετατροπή.
create function public.subscriptions_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_owner();
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'provider', s.provider, 'covers', s.covers, 'plan', s.plan, 'monthlyCost', s.monthly_cost,
               'currency', s.currency, 'renewsOn', s.renews_on, 'account', s.account, 'paidBy', s.paid_by,
               'link', s.link, 'updatedAt', s.updated_at)
             order by lower(s.provider), s.id)
        from public.subscriptions s), '[]'::jsonb),
    'totals', coalesce((
      select jsonb_agg(jsonb_build_object('currency', t.currency, 'total', t.total, 'count', t.n) order by t.currency)
        from (select s.currency, sum(s.monthly_cost) as total, count(*) as n
                from public.subscriptions s group by s.currency) t), '[]'::jsonb));
end;
$$;

-- ───────────── Γεγονός 59: η συνδρομή ανανεώνεται ─────────────

insert into public.event_types
  (number, code, grp, kind, label_el, label_en, case_of, variables, relatives, has_visitor, is_cost_only, is_client_facing, is_wired, sort)
select 59, 'subscription.renewing', 'ΣΤ', 'dated', 'Η συνδρομή ανανεώνεται σε 7 μέρες', 'A subscription renews in 7 days',
       'η συνδρομή και η ημερομηνία ανανέωσής της', authz.ev_vars('subscription', 'plan', 'renewsOn', 'amount'),
       '{owner}', false, false, false, true, max(t.sort) + 1
  from public.event_types t;

insert into public.automations (event_type, channel, recipient_kind, recipient_relative, timing, offset_days, send_time,
                                body_el, body_en, is_essential, is_enabled, is_initial, sort)
values ('subscription.renewing', 'notification', 'relative', 'owner', 'offset', -7, '09:00',
        'Η συνδρομή {subscription} ανανεώνεται στις {renewsOn} ({amount} τον μήνα). Αν θες να την ακυρώσεις ή να αλλάξεις πλάνο, κάνε το στον πάροχο πριν από τότε.',
        'The {subscription} subscription renews on {renewsOn} ({amount} per month). To cancel it or change the plan, do it with the provider before then.',
        false, true, true, 1);

-- Ποσό με ελληνική μορφή και το νόμισμά του: 1.234,50 USD.
create function authz.ev_money_in(p numeric, p_currency text) returns text
language sql immutable set search_path = ''
as $$ select replace(replace(replace(to_char(p, 'FM999,999,990.00'), ',', '#'), '.', ','), '#', '.') || ' ' || p_currency; $$;

create function authz.ev_ctx_subscription(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'subscription', s.provider, 'plan', nullif(s.plan, ''), 'renewsOn', authz.ev_date(s.renews_on),
    'amount', authz.ev_money_in(s.monthly_cost, s.currency), 'link', '/app/settings/integrations'))
    from public.subscriptions s
   where s.id = p_id;
$$;

-- 59: συνδρομή με ημερομηνία ανανέωσης. Άγκυρα: τα μεσάνυχτα (Αθήνας) της ανανέωσης. Νέα ημερομηνία = νέα περίπτωση.
create function authz.ts_subscription_renewing(p_from timestamptz, p_to timestamptz) returns setof public.events
language sql stable security definer set search_path = ''
as $$
  select c.* from public.subscriptions s
   cross join lateral authz.timed_case('subscription.renewing', 'subscriptions', s.id, 'subscription.renewing:' || s.id,
                                       null, authz.ev_ctx_subscription(s.id), authz.athens_midnight(s.renews_on)) c
   where s.renews_on is not null and authz.athens_midnight(s.renews_on) between p_from and p_to;
$$;

-- Όπως το 20261015140100, και το 59.
create or replace function authz.timed_cases(p_type text, p_from timestamptz, p_to timestamptz) returns setof public.events
language plpgsql stable security definer set search_path = ''
as $$
begin
  case p_type
    when 'proposal.link_expiring' then return query select * from authz.ts_link_expiring(p_from, p_to);
    when 'proposal.expired' then return query select * from authz.ts_proposal_expired(p_from, p_to);
    when 'opportunity.next_step_due' then return query select * from authz.ts_next_step(p_from, p_to);
    when 'agreement.expiring' then return query select * from authz.ts_agreement_expiring(p_from, p_to);
    when 'period.opening' then return query select * from authz.ts_period_opening(p_from, p_to);
    when 'filming.day' then return query select * from authz.ts_filming_day(p_from, p_to);
    when 'filming.not_done' then return query select * from authz.ts_filming_not_done(p_from, p_to);
    when 'filming.approval_waiting' then return query select * from authz.ts_filming_approval(p_from, p_to);
    when 'deliverable.deadline' then return query select * from authz.ts_deliverable_deadline(p_from, p_to);
    when 'deliverable.client_waiting' then return query select * from authz.ts_deliverable_waiting(p_from, p_to);
    when 'invoice.overdue' then return query select * from authz.ts_invoice_overdue(p_from, p_to);
    when 'holiday.greeting' then return query select * from authz.ts_holiday(p_from, p_to);
    when 'message.unread_waiting' then return query select * from authz.ts_message_unread(p_from, p_to);
    when 'request.open_waiting' then return query select * from authz.ts_request_open(p_from, p_to);
    when 'subscription.renewing' then return query select * from authz.ts_subscription_renewing(p_from, p_to);
    else return;
  end case;
end;
$$;

-- ───────────── Ορατότητα: η υπενθύμιση συνδρομής φτάνει μόνο σε Ιδιοκτήτη ─────────────
-- Όπως το 20261015140100 (τελευταίος ορισμός), και οι συνδρομές μόνο για Ιδιοκτήτη. Ισχύει για Ειδοποίηση και email, για
-- κάθε είδος παραλήπτη (σχετικός, ονομαστικά, «όσοι έχουν Δικαίωμα»), γιατί όλα περνούν από το authz.ev_recipients.
create or replace function authz.event_visible_to(e public.events, p_user uuid, p_is_client boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when e.entity in ('messages', 'message_requests')
         and not exists (select 1 from public.messages m where m.id = e.entity_id and m.deleted_at is null) then false
    when e.entity in ('messages', 'message_requests') and p_is_client then
      authz.ev_client_has(p_user, e.client_id, array['c.chatRead'])
      and (e.type <> 'message.created' or e.payload ->> 'author_kind' = 'team')
    when e.entity in ('messages', 'message_requests') then
      (authz.message_visible_to(p_user, e.entity_id)
       or (e.type = 'message.mentioned' and authz.message_mentionable(p_user)
           and exists (select 1 from public.messages m where m.id = e.entity_id and p_user = any (m.mentions))))
      and (e.type <> 'message.created' or e.payload ->> 'author_kind' = 'client')
    -- Συνδρομές (59): μόνο ο Ιδιοκτήτης, όποιον παραλήπτη κι αν ορίσει ένας Αυτοματισμός.
    when e.entity = 'subscriptions' then not p_is_client and authz.user_is_owner(p_user)
    when not p_is_client then true
    when e.type = 'message.unread_waiting' then authz.ev_client_has(p_user, e.client_id, array['c.chatRead'])
    when e.type = 'deliverable.client_waiting' then authz.ev_client_has(p_user, e.client_id, array['c.approve'])
    when e.entity in ('deliverables', 'productions') then authz.ev_client_has(p_user, e.client_id, array['c.productions', 'c.approve'])
    when e.entity = 'filmings' then authz.ev_client_has(p_user, e.client_id, array['c.book', 'c.productions'])
    when e.entity in ('agreements', 'agreement_costs') then authz.ev_client_has(p_user, e.client_id, array['c.agreements'])
    when e.entity = 'agreement_periods' then authz.ev_client_has(p_user, e.client_id, array['c.agreements', 'c.book'])
    when e.entity = 'invoices' then authz.ev_client_has(p_user, e.client_id, array['c.finance'])
    else true
  end;
$$;

-- Όπως το 20261015140100, και οι υπενθυμίσεις συνδρομών μόνο για τον Ιδιοκτήτη (και το service_role).
create or replace function public.automations_upcoming(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_service boolean := coalesce(auth.role(), '') = 'service_role';
  v_finance boolean;
  v_owner boolean;
begin
  if not v_service and not (authz.has('automations.manage') or authz.has('health.view')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '31 days' then
    raise exception 'Το διάστημα είναι έως 31 μέρες' using errcode = 'P0001';
  end if;
  v_finance := v_service or authz.has('finance.amounts') or authz.has('finance.invoices');
  v_owner := v_service or authz.is_owner();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'automationId', a.id, 'eventType', a.event_type, 'eventLabel', t.label_el, 'channel', a.channel,
             'dueAt', x.due_at,
             'caseKey', case when a.event_type = 'message.unread_waiting' then null else (x.e).case_key end,
             'entity', (x.e).entity, 'entityId', (x.e).entity_id,
             'clientId', (x.e).client_id, 'clientName', (x.e).payload ->> 'clientName', 'link', (x.e).payload ->> 'link',
             'recipients', (select count(*) from authz.ev_recipients(a, x.e)))
           order by x.due_at, t.sort, a.sort, (x.e).case_key)
      from authz.timed_automations() a
      join public.event_types t on t.code = a.event_type
     cross join lateral authz.timed_due(a, p_from, p_to) x
     where (v_finance or (x.e).entity <> 'invoices')
       and (v_owner or (x.e).entity <> 'subscriptions')
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Ίχνος: οι συνδρομές μόνο για τον Ιδιοκτήτη ─────────────
-- Ξαναγράφεται ολόκληρο από τον τελικό ορισμό (20261017160000_reports_export.sql), με τις συνδρομές.

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
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.require_owner(), authz.integration_check_begin(text, timestamptz),
  authz.integration_check_finish(text, boolean, text, timestamptz), authz.integrations_view(timestamptz),
  authz.subscriptions_stamp(), authz.ev_money_in(numeric, text), authz.ev_ctx_subscription(uuid),
  authz.ts_subscription_renewing(timestamptz, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.company_analytics_save(text, text), public.integration_check_begin(text),
  public.integration_check_finish(text, boolean, text), public.integrations_view(timestamptz), public.subscriptions_view()
  from public, anon;
grant execute on function
  public.company_analytics_save(text, text), public.integration_check_begin(text),
  public.integration_check_finish(text, boolean, text), public.integrations_view(timestamptz), public.subscriptions_view()
  to authenticated;
