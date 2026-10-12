-- Σήμερα Σα (#180): το θεμέλιο της A1. Μητρώο καρτών, πλήθη, μία κάρτα, Προσαρμογή, και οι κάρτες Υγεία και Ετοιμότητα.
--
--  • Μητρώο (public.today_cards): μία γραμμή ανά κάρτα. Τα Σβ–Σε προσθέτουν ΜΟΝΟ γραμμές και δικές τους συναρτήσεις· δεν
--    αγγίζουν τις κοινές συναρτήσεις αυτού του αρχείου.
--  • Σύμβαση συναρτήσεων κάρτας (την ελέγχει το supabase/tests/today_test.sql για κάθε γραμμή του μητρώου):
--      authz.today_count_<code>(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
--        null = ο Χρήστης δεν έχει πρόσβαση (Δικαίωμα + Εύρος, ίδια με τη σελίδα-ουρά)· αλλιώς το πλήθος με το Εύρος του.
--        p_client = ο τρέχων Πελάτης για κάρτα audience 'client', null για κάρτα ομάδας. Κάρτα ομάδας με p_client
--        μη null, ή κάρτα πελάτη με null, επιστρέφει null.
--      authz.today_items_<code>(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
--        Έως 3 πιο επείγοντα: [{ id, title?, subtitle, at, urgent, amount_cents?, link }]. id/title κείμενο (χωρίς title ο
--        renderer της κάρτας βρίσκει την ετικέτα από το id), subtitle κείμενο
--        ή null, at timestamptz ή null, link εσωτερική διαδρομή /app/…. amount_cents μόνο αν ο Χρήστης έχει finance.amounts.
--        Ίδιος έλεγχος πρόσβασης με το count· αν δεν έχει, 42501.
--      Επείγον (κανόνας 5): προθεσμία σε έως 1 μέρα ή περασμένη, Επόμενο βήμα που έληξε, ληξιπρόθεσμο, Τιμολογητέο 14 ημερών
--      και πάνω, διαγραφή Google με λιγότερες από 12 ώρες, Υπέρβαση κόστους, κάθε κόκκινο της Υγείας.
--      Το p_now χρησιμεύει μόνο για παράθυρα χρόνου και για το «επείγον», ποτέ για την πρόσβαση.
--      Ο έλεγχος Δικαιώματος γίνεται ΠΡΩΤΟΣ. Αν το count ρίξει 42501, η κάρτα παραλείπεται σαν να επέστρεψε null. Οι συναρτήσεις είναι security definer, set search_path = '', και αμέσως μετά
--      τη δημιουργία τους: revoke all … from public, anon, authenticated (τις καλούν μόνο τα public RPC εδώ).
--  • Στήλες μητρώου: grp (health | decide | work | money | knowledge | week | client), kind (action | week | health),
--    audience (team | client), sort (η κοινή σειρά του κανόνα 2), needs_second_person (κανόνας 8). Ζώνες sort ανά ομάδα:
--    health 0–99, decide 100–199, work 200–299, money 300–399, knowledge 400–499, week 500–599, client 600–699.
--  • public.today_counts: τα πλήθη των καρτών που επιτρέπονται, στη σειρά του Χρήστη, με τις κρυφές σημειωμένες.
--    public.today_card: μία κάρτα (πλήθος + 3 γραμμές). Άγνωστη ή μη επιτρεπτή: 42501 με το ίδιο μήνυμα.
--  • Προτιμήσεις (public.today_prefs): ανά Χρήστη (και για τον Χρήστη πελάτη, όχι ανά Πελάτη). Κάρτα εκτός σειράς μπαίνει στο
--    τέλος (κανόνας 7). Οι Προτιμήσεις είναι προσωπικές ρυθμίσεις προβολής· δεν γράφονται στο Ίχνος.

-- ───────────── Πίνακες ─────────────

create table public.today_cards (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{0,39}$'),
  grp text not null check (grp in ('health', 'decide', 'work', 'money', 'knowledge', 'week', 'client')),
  kind text not null check (kind in ('action', 'week', 'health')),
  audience text not null check (audience in ('team', 'client')),
  sort integer not null,
  label_el text not null check (length(trim(label_el)) between 1 and 80),
  label_en text not null check (length(trim(label_en)) between 1 and 80),
  link text not null check (link ~ '^/app(/|$)' and length(link) <= 300),
  count_fn regprocedure not null,
  items_fn regprocedure not null,
  needs_second_person boolean not null default false
);

create table public.today_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  card_order text[] not null default '{}',
  hidden text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.today_cards enable row level security;
alter table public.today_prefs enable row level security;

-- ───────────── Βοηθητικά ─────────────

-- Το όνομα (σχήμα.όνομα) μιας συνάρτησης του μητρώου, για το δυναμικό execute.
create function authz.today_fn_name(p_fn regprocedure) returns text
language sql stable security definer set search_path = ''
as $$
  select format('%I.%I', n.nspname, p.proname)
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where p.oid = p_fn;
$$;

-- Κανόνας 8: με έναν μόνο ενεργό Χρήστη ομάδας δεν υπάρχουν οι κάρτες που αφορούν δεύτερο άνθρωπο.
create function authz.today_is_solo() returns boolean
language sql stable security definer set search_path = ''
as $$ select (select count(*) from public.team_users u where u.is_active) < 2; $$;

-- Ο τρέχων Πελάτης του θεατή: null για την ομάδα (η ομάδα κερδίζει, όπως στο καμπανάκι).
create function authz.today_client() returns uuid
language sql stable security definer set search_path = ''
as $$ select case when authz.is_team_user() then null else authz.client_user_client_id() end; $$;

-- Οι κάρτες που επιτρέπονται στον Χρήστη, με το πλήθος τους. Κάρτα που απέτυχε να μετρήσει μένει (count null, failed),
-- ώστε η δική της φόρτωση να δείξει «Ξαναδοκίμασε»· οι υπόλοιπες δεν επηρεάζονται.
create function authz.today_cards_for(p_uid uuid, p_client uuid, p_now timestamptz)
returns table (code text, grp text, kind text, label text, link text, sort integer, count integer, failed boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  c public.today_cards;
  v_solo boolean := authz.today_is_solo();
  v_count integer;
begin
  for c in
    select * from public.today_cards t
     where t.audience = case when p_client is null then 'team' else 'client' end
       and not (t.needs_second_person and v_solo)
     order by t.sort, t.code
  loop
    begin
      execute format('select %s($1, $2, $3)', authz.today_fn_name(c.count_fn)) into v_count using p_uid, p_client, p_now;
      if v_count is not null then
        return query select c.code, c.grp, c.kind, c.label_el, c.link, c.sort, v_count, false;
      end if;
    exception when insufficient_privilege then
      -- Άρνηση μέσα στη συνάρτηση: η κάρτα δεν επιτρέπεται (όπως το null).
      null;
    when others then
      raise warning 'today: η κάρτα % δεν μέτρησε: %', c.code, sqlerrm;
      return query select c.code, c.grp, c.kind, c.label_el, c.link, c.sort, null::integer, true;
    end;
  end loop;
end;
$$;

-- Κρατά μόνο τους κωδικούς που επιτρέπονται, χωρίς διπλούς, με την πρώτη τους θέση.
create function authz.today_keep(p_codes text[], p_allowed text[]) returns text[]
language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(x.code order by x.n), '{}')
    from (select u.code, min(u.n) as n from unnest(coalesce(p_codes, '{}')) with ordinality u (code, n)
           where u.code = any (p_allowed) group by u.code) x;
$$;

-- ───────────── Κάρτα «Υγεία συστήματος» (health.view) ─────────────

-- Ο Χρήστης p_uid βλέπει τον Πελάτη; Ίδιος κανόνας με το authz.can_see_client, για δοσμένο Χρήστη και όχι για τον auth.uid().
create function authz.today_sees_client(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.user_is_team(p_uid) and (
    coalesce(authz.user_scope(p_uid, 'clients.view'), '') = 'all'
    or coalesce(authz.user_scope(p_uid, 'clients.manage'), '') = 'all'
    or authz.user_scope(p_uid, 'clients.transfer') is not null
    or authz.user_scope(p_uid, 'clients.merge') is not null
    or ((authz.user_scope(p_uid, 'clients.view') is not null or authz.user_scope(p_uid, 'clients.manage') is not null)
        and (exists (select 1 from public.clients c where c.id = p_client and c.manager_id = p_uid)
             or exists (select 1 from public.opportunities o where o.client_id = p_client and o.manager_id = p_uid))));
$$;

-- Οι αποστολές που απέτυχαν τις τελευταίες 7 μέρες και δεν ξαναστάλθηκαν. Ό,τι κρύβει το K3 από τον θεατή (Τιμολόγια χωρίς
-- ποσά, κόστος χωρίς «Βλέπει κόστος», Πελάτης που δεν βλέπει) δεν μετρά. Ο Πελάτης βγαίνει από το σημάδι του email ή του
-- email που ξαναστάλθηκε, όπως στο authz.sends_failed_count. Ποτέ παραλήπτης, θέμα ή περιεχόμενο: μόνο τι ήταν και πότε.
create function authz.today_failed_sends(p_uid uuid, p_now timestamptz)
returns table (id text, title text, at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with v as (
    select authz.user_scope(p_uid, 'finance.amounts') is not null or authz.user_scope(p_uid, 'finance.invoices') is not null as finance,
           authz.user_scope(p_uid, 'finance.cost') is not null as cost
  )
  select o.id::text, authz.outbox_what(o), o.created_at
    from public.email_outbox o
    cross join v
    left join public.automations a on a.id = authz.outbox_automation(o.payload)
    left join public.event_types t on t.code = a.event_type
    left join lateral (select s.client_id from public.automation_sends s
                        where s.client_id is not null
                          and (s.email_outbox_id = o.id or (o.retry_of is not null and s.email_outbox_id = o.retry_of))
                        limit 1) sc on true
   where o.status = 'failed' and o.created_at >= p_now - interval '7 days' and o.created_at <= p_now
     and not exists (select 1 from public.email_outbox x where x.retry_of = o.id)
     and (v.finance or (o.kind not in ('invoice_registered', 'invoice_overdue')
                        and coalesce(a.event_type, '') not in ('billable.created', 'billable.open_waiting',
                                                                'invoice.registered', 'invoice.overdue', 'receipt.registered')))
     and (v.cost or not coalesce(t.is_cost_only, false))
     and (sc.client_id is null or authz.today_sees_client(p_uid, sc.client_id))
  union all
  select 'l' || l.id::text, 'email «' || l.kind || '»', l.sent_at
    from public.email_log l cross join v
   where l.status = 'failed' and not l.via_outbox and l.sent_at >= p_now - interval '7 days' and l.sent_at <= p_now
     and (v.finance or l.kind not in ('invoice_registered', 'invoice_overdue'));
$$;

-- Ό,τι κοκκίνισε στην Υγεία, όπως το ξέρει ο έλεγχος του Kε: εργασίες που δεν πέτυχαν για > 10′, Google που σταμάτησε
-- (> 30′), Γεγονότα που κόλλησαν, και οι αποτυχημένες αποστολές. Σειρά: εργασίες, Google, Γεγονότα, αποστολές (νεότερες).
create function authz.today_health_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, link text, n integer)
language sql stable security definer set search_path = ''
as $$
  select 'job:' || j.job, 'Δεν έτρεξε: ' || authz.health_job_label(j.job), nullif(left(coalesce(j.last_error, ''), 120), ''),
         j.last_ok_at, '/app/settings/sends', 1
    from public.job_runs j
   where j.last_ok_at is not null and j.last_ok_at < p_now - interval '10 minutes'
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

create function authz.today_count_health(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'health.view') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_health_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_health(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'health.view') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', true, 'link', r.link) order by r.n, r.at desc nulls last, r.id)
      from (select * from authz.today_health_rows(p_uid, p_now) h order by h.n, h.at desc nulls last, h.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Έλεγχος ετοιμότητας» (settings.manage, ως το «Άνοιγμα σε πελάτες») ─────────────

-- Η σειρά των βημάτων, ίδια με την οθόνη O7. Οι ετικέτες ζουν στην εφαρμογή (READINESS)· εδώ μόνο οι κωδικοί.
create function authz.today_readiness_order() returns text[]
language sql immutable set search_path = ''
as $$
  select array['company_details', 'tax_details', 'bank_account', 'logo', 'booking_hours', 'catalogue', 'costs',
               'payment_methods', 'knowledge', 'legal_texts', 'identity_values', 'automation_texts'];
$$;

create function authz.today_readiness_open(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_client is null and authz.user_scope(p_uid, 'settings.manage') is not null
     and not exists (select 1 from public.system_state s where s.id and s.opened_at is not null);
$$;

create function authz.today_count_readiness(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_readiness_open(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.readiness_items() r where not r.done);
end;
$$;

create function authz.today_items_readiness(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_readiness_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.item, 'urgent', false, 'link', '/app/settings/readiness') order by r.n)
      from (select x.item, coalesce(array_position(authz.today_readiness_order(), x.item), 1000) as n
              from authz.readiness_items() x
             where not x.done order by 2, 1 limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο: οι δύο πρώτες κάρτες ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('health', 'health', 'health', 'team', 10, 'Υγεία συστήματος', 'System health', '/app/settings/sends?tab=failed',
   'authz.today_count_health(uuid, uuid, timestamptz)', 'authz.today_items_health(uuid, uuid, timestamptz)'),
  ('readiness', 'health', 'action', 'team', 20, 'Έλεγχος ετοιμότητας', 'Readiness check', '/app/settings/readiness',
   'authz.today_count_readiness(uuid, uuid, timestamptz)', 'authz.today_items_readiness(uuid, uuid, timestamptz)');

-- ───────────── Public RPC (authenticated) ─────────────

-- { cards: [{ code, grp, kind, label, link, count, failed, hidden }], unread_notifications, customized }
-- Στη σειρά του Χρήστη: πρώτα όσες έχει στη σειρά του, μετά οι υπόλοιπες με την κοινή σειρά. count null μόνο όταν failed.
create function public.today_counts(p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team boolean := authz.is_team_user();
  v_client uuid := authz.today_client();
  p public.today_prefs;
begin
  perform authz.require_notification_user();
  select * into p from public.today_prefs x where x.user_id = v_user;
  return jsonb_build_object(
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object('code', c.code, 'grp', c.grp, 'kind', c.kind, 'label', c.label, 'link', c.link,
                                          'count', c.count, 'failed', c.failed,
                                          'hidden', c.code = any (coalesce(p.hidden, '{}')))
                       order by array_position(coalesce(p.card_order, '{}'), c.code) nulls last, c.sort, c.code)
        from authz.today_cards_for(v_user, v_client, coalesce(p_now, now())) c), '[]'::jsonb),
    'unread_notifications', (select count(*) from public.notifications n
                              where n.user_id = v_user and (v_team or n.client_id is null or n.client_id = v_client)
                                and n.read_at is null),
    'customized', p.user_id is not null);
end;
$$;

-- { code, count, items: [{ id, title, subtitle, at, urgent, amount_cents?, link }] }
create function public.today_card(p_code text, p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_client uuid;
  v_now timestamptz := coalesce(p_now, now());
  c public.today_cards;
  v_count integer;
  v_items jsonb;
begin
  perform authz.require_notification_user();
  v_client := authz.today_client();
  select * into c from public.today_cards t
   where t.code = p_code and t.audience = case when v_client is null then 'team' else 'client' end;
  if found and not (c.needs_second_person and authz.today_is_solo()) then
    execute format('select %s($1, $2, $3)', authz.today_fn_name(c.count_fn)) into v_count using v_user, v_client, v_now;
  end if;
  if v_count is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  execute format('select %s($1, $2, $3)', authz.today_fn_name(c.items_fn)) into v_items using v_user, v_client, v_now;
  return jsonb_build_object('code', c.code, 'count', v_count, 'items', coalesce(v_items, '[]'::jsonb));
end;
$$;

-- Αποθηκεύει σειρά και κρυφές. Κρατά μόνο τους κωδικούς που ο Χρήστης βλέπει τώρα· οι άγνωστοι αγνοούνται.
create function public.today_prefs_set(p_order text[], p_hidden text[]) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_allowed text[];
begin
  perform authz.require_notification_user();
  if coalesce(cardinality(p_order), 0) > 200 or coalesce(cardinality(p_hidden), 0) > 200 then
    raise exception 'Πάρα πολλές κάρτες στην Προσαρμογή' using errcode = 'P0001';
  end if;
  v_allowed := array(select c.code from authz.today_cards_for(v_user, authz.today_client(), now()) c);
  insert into public.today_prefs as x (user_id, card_order, hidden, updated_at)
  values (v_user, authz.today_keep(p_order, v_allowed), authz.today_keep(p_hidden, v_allowed), now())
  on conflict (user_id) do update
     set card_order = excluded.card_order, hidden = excluded.hidden, updated_at = excluded.updated_at;
end;
$$;

-- «Επαναφορά προεπιλογής»: η κοινή σειρά, καμία κρυφή.
create function public.today_prefs_reset() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_notification_user();
  delete from public.today_prefs x where x.user_id = auth.uid();
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_fn_name(regprocedure), authz.today_is_solo(), authz.today_client(),
  authz.today_cards_for(uuid, uuid, timestamptz), authz.today_keep(text[], text[]),
  authz.today_failed_sends(uuid, timestamptz), authz.today_health_rows(uuid, timestamptz),
  authz.today_count_health(uuid, uuid, timestamptz), authz.today_items_health(uuid, uuid, timestamptz),
  authz.today_sees_client(uuid, uuid), authz.today_readiness_order(), authz.today_readiness_open(uuid, uuid),
  authz.today_count_readiness(uuid, uuid, timestamptz), authz.today_items_readiness(uuid, uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.today_counts(timestamptz), public.today_card(text, timestamptz),
  public.today_prefs_set(text[], text[]), public.today_prefs_reset()
  from public, anon;
grant execute on function
  public.today_counts(timestamptz), public.today_card(text, timestamptz),
  public.today_prefs_set(text[], text[]), public.today_prefs_reset()
  to authenticated;

revoke all on table public.today_cards, public.today_prefs from anon, authenticated;
