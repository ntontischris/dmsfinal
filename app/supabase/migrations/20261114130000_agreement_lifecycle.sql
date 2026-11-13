-- Κύκλος ζωής Συμφωνίας (b8, b9, b12): Λύση με ημερομηνία, «Χωρίς συνέχιση», αυτόματη συνέχιση, Ευκαιρία ανανέωσης,
-- υπογεγραμμένο αρχείο της υπογραφής εκτός συστήματος. CONTEXT: Λύση, Ανανέωση, Διάρκεια.
--
-- Αρχές:
--  • Η Λύση έχει ημερομηνία και λόγο. Από εκείνη τη μέρα η Συμφωνία είναι «λύθηκε»: καμία νέα Περίοδος ή Τιμολογητέο μετά,
--    όσα υπάρχουν μένουν, και η ρήτρα λύσης γίνεται Τιμολογητέο αν υπάρχει. Οι ανοιχτές Παραγωγές χωρίς δουλειά των
--    Περιόδων μετά τη Λύση ακυρώνονται («Λύση Συμφωνίας»)· όσες έχουν δουλειά μένουν για να κλείσουν με το χέρι.
--  • Αυτόματη συνέχιση ('auto'): η ίδια Συμφωνία συνεχίζει για άλλη μία Διάρκεια την επόμενη μέρα της λήξης — νέες Περίοδοι,
--    Παροχές και Παραγωγές, νέα λήξη. «Χωρίς συνέχιση» (Δικαίωμα «Λύει Συμφωνία») τη σταματά: λήγει στη λήξη της.
--  • Ανανέωση με νέα Ευκαιρία ('new_opportunity'): renewal_lead_days μέρες πριν από τη λήξη (ρύθμιση, προεπιλογή 30) ανοίγει
--    Ευκαιρία ανανέωσης με αντίγραφο της πρότασης στις τρέχουσες τιμές Καταλόγου. Και χειροκίνητα, «Ανανέωση τώρα».
--  • Ό,τι εξαρτάται από τη μέρα τρέχει από την public.agreements_run(p_today), που την καλεί η γεννήτρια Τιμολογητέων
--    (cron του outbox, κάθε λεπτό). Έτσι δεν χρειάζεται νέο cron ούτε νέα δουλειά στην Υγεία.
--  • Οι Περίοδοι μιας Συμφωνίας που συνεχίστηκε δεν βγαίνουν πια από (Έναρξη, Διάρκεια): η authz.agreement_rows διαβάζει τις
--    εγγραφές Περιόδων όταν υπάρχουν, και οι συναρτήσεις τιμής/μεριδίου/λίστας τη χρησιμοποιούν. Για Συμφωνία που δεν
--    συνεχίστηκε το αποτέλεσμα είναι ακριβώς το ίδιο με πριν.
--  • Οι νέοι πίνακες είναι κλειστοί (RLS χωρίς policies, χωρίς grants): μόνο από τις συναρτήσεις παρακάτω.
--    Στο Ίχνος μπαίνουν ως γεγονότα της Συμφωνίας (dissolution_recorded, continuation_stopped, renewal_opened, …).

-- ───────────── Πίνακες ─────────────

create table public.agreement_endings (
  agreement_id uuid primary key references public.agreements (id),
  no_continuation_at timestamptz,
  no_continuation_by uuid,
  no_continuation_note text check (no_continuation_note is null or length(no_continuation_note) <= 500),
  dissolved_on date,
  dissolution_reason text check (dissolution_reason is null or length(trim(dissolution_reason)) between 1 and 500),
  dissolved_at timestamptz,
  dissolved_by uuid,
  check ((dissolved_on is null) = (dissolution_reason is null)),
  check ((dissolved_on is null) = (dissolved_at is null))
);

create table public.agreement_renewals (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  -- Η λήξη της Διάρκειας για την οποία άνοιξε η ανανέωση (μία αυτόματη ανά λήξη).
  term_end date not null,
  opportunity_id uuid not null unique references public.opportunities (id),
  renewal_agreement_id uuid unique references public.agreements (id),
  is_automatic boolean not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index agreement_renewals_agreement_idx on public.agreement_renewals (agreement_id, term_end);

create table public.agreement_signed_files (
  agreement_id uuid primary key references public.agreements (id),
  path text not null check (length(path) between 1 and 300),
  file_name text not null check (length(trim(file_name)) between 1 and 200),
  content_type text not null check (content_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid
);

alter table public.agreement_endings enable row level security;
alter table public.agreement_renewals enable row level security;
alter table public.agreement_signed_files enable row level security;

revoke all on table public.agreement_endings, public.agreement_renewals, public.agreement_signed_files from anon, authenticated;

-- Χωρίς trigger Ίχνους: κάθε αλλαγή γράφεται ήδη ως γεγονός της Συμφωνίας (authz.agreement_event) και ως Δραστηριότητα.

alter table public.agreement_defaults
  add column renewal_lead_days integer not null default 30 check (renewal_lead_days between 1 and 365);

-- Το ιδιωτικό bucket των υπογεγραμμένων αρχείων. Καμία policy: πρόσβαση μόνο με service role, από τον server.
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) and exists (
    select 1 from information_schema.columns
     where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types'
  ) then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('agreement-files', 'agreement-files', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
    on conflict (id) do nothing;
  else
    insert into storage.buckets (id, name, public) values ('agreement-files', 'agreement-files', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ───────────── Κατάσταση «σήμερα» ─────────────

-- Λύση με ημερομηνία που ήρθε → 'dissolved'. Μηνιαία που πέρασε τη λήξη: λήγει όταν ανοίγει νέα Ευκαιρία ή έχει «Χωρίς
-- συνέχιση»· με αυτόματη συνέχιση μένει ενεργή (τη συνεχίζει η agreements_run). Security definer: διαβάζει κλειστό πίνακα.
create or replace function authz.agreement_eff_state(a public.agreements) returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
  select case
    when a.state in ('signed', 'active') and coalesce(e.dissolved_on <= public.sales_today(), false) then 'dissolved'
    when a.state in ('signed', 'active') and a.kind = 'monthly' and a.end_on < public.sales_today()
         and (a.renewal = 'new_opportunity' or e.no_continuation_at is not null) then 'expired'
    when a.state = 'signed' and a.start_on <= public.sales_today() then 'active'
    else a.state
  end
  from (select 1) one
  left join public.agreement_endings e on e.agreement_id = a.id
  );
end;
$$;

-- Οι Περίοδοι μιας Συμφωνίας: οι εγγραφές της αν υπάρχουν (μετά την υπογραφή, μαζί με όσες πρόσθεσε η συνέχιση),
-- αλλιώς το πλάνο από (Έναρξη, Διάρκεια). n από 0, μερίδιο όπως η authz.agreement_period_rows.
create function authz.agreement_rows(p_agreement uuid, p_start date, p_months integer)
returns table (n integer, starts date, ends date, share numeric, gives_provisions boolean)
language sql stable security definer set search_path = ''
as $$
  select r.n, r.starts, r.ends, r.share, r.gives_provisions
    from authz.agreement_period_rows(p_start, p_months) r
   where not exists (select 1 from public.agreement_periods pe where pe.agreement_id = p_agreement)
  union all
  select pe.n - 1, pe.starts, pe.ends,
         least(1::numeric, (pe.ends - pe.starts + 1)::numeric
           / ((date_trunc('month', pe.starts) + interval '1 month')::date - date_trunc('month', pe.starts)::date)::numeric),
         pe.gives_provisions
    from public.agreement_periods pe
   where pe.agreement_id = p_agreement
  order by 1;
$$;

-- ───────────── Κανόνας: τι αλλάζει μετά την υπογραφή ─────────────

-- Ίδιος με της 20261009100000, με δύο προσθήκες: η λήξη μεγαλώνει (μόνο με αυτόματη συνέχιση) και η Συμφωνία λύνεται.
create or replace function authz.guard_agreement() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Οι Συμφωνίες δεν διαγράφονται' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;

  if new.id <> old.id or new.opportunity_id <> old.opportunity_id or new.kind <> old.kind
     or new.created_at is distinct from old.created_at then
    raise exception 'Το είδος και η Ευκαιρία μιας Συμφωνίας δεν αλλάζουν' using errcode = 'P0001';
  end if;

  if old.state <> 'proposal' then
    if (to_jsonb(new) - 'state' - 'end_on' - 'updated_at' - 'updated_by')
       is distinct from (to_jsonb(old) - 'state' - 'end_on' - 'updated_at' - 'updated_by') then
      raise exception 'Η υπογεγραμμένη Συμφωνία δεν αλλάζει' using errcode = 'P0001';
    end if;
    if new.end_on is distinct from old.end_on and not (
         old.kind = 'monthly' and old.renewal = 'auto' and old.state in ('signed', 'active')
         and new.state = old.state and new.end_on > old.end_on) then
      raise exception 'Η λήξη αλλάζει μόνο με την αυτόματη συνέχιση' using errcode = 'P0001';
    end if;
    if new.state <> old.state and (old.state, new.state) not in (
        ('signed', 'active'), ('signed', 'expired'), ('active', 'expired'), ('signed', 'dissolved'), ('active', 'dissolved')) then
      raise exception 'Η κατάσταση της Συμφωνίας δεν γυρίζει πίσω' using errcode = 'P0001';
    end if;
  elsif old.path = 'lost' then
    if (to_jsonb(new) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(old) - 'updated_at' - 'updated_by') then
      raise exception 'Μια πρόταση που χάθηκε δεν αλλάζει' using errcode = 'P0001';
    end if;
  elsif new.path <> old.path and (old.path, new.path) not in (
      ('draft', 'awaiting_approval'), ('draft', 'sent'), ('draft', 'signed'), ('draft', 'lost'),
      ('awaiting_approval', 'draft'), ('awaiting_approval', 'lost'),
      ('sent', 'draft'), ('sent', 'expired'), ('sent', 'signed'), ('sent', 'lost'),
      ('expired', 'sent'), ('expired', 'draft'), ('expired', 'signed'), ('expired', 'lost')) then
    raise exception 'Αυτή η αλλαγή πορείας της πρότασης δεν επιτρέπεται' using errcode = 'P0001';
  end if;
  if new.revision < old.revision or new.revision > old.revision + 1 then
    raise exception 'Η αναθεώρηση ανεβαίνει ένα κάθε φορά' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- ───────────── Λύση: τι κλείνει ─────────────

-- Ακυρώνει τις ανοιχτές Παραγωγές χωρίς δουλειά που πέφτουν μετά τη Λύση (μηνιαία: Περίοδος που αρχίζει μετά· εφάπαξ: η Παραγωγή).
create function authz.agreement_wind_down(p_agreement uuid) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_on date;
  r record;
  v_count integer := 0;
begin
  select e.dissolved_on into v_on from public.agreement_endings e where e.agreement_id = p_agreement;
  if v_on is null then
    return 0;
  end if;
  for r in
    select p.id
      from public.productions p
      left join public.agreement_periods pe on pe.id = p.period_id
     where p.agreement_id = p_agreement and p.state = 'open'
       and (pe.id is null or pe.starts > v_on)
     order by pe.n nulls first
  loop
    continue when authz.production_has_work(r.id);
    update public.deliverables d
       set cancelled_at = now(), cancelled_by = auth.uid(),
           cancel_reason = 'Ακυρώθηκε η Παραγωγή', cancel_outcome = 'returned'
     where d.production_id = r.id and d.cancelled_at is null and d.approved_at is null;
    update public.productions
       set state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancelled_reason = 'Λύση Συμφωνίας'
     where id = r.id;
    perform authz.production_event(r.id, 'cancelled', jsonb_build_object('reason', 'Λύση Συμφωνίας'));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Ίδια με της 20261009100000· στη Λύση κλείνει και ό,τι πέφτει μετά.
create or replace function authz.agreement_settle(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_path text;
  v_state text;
  v_cancelled integer;
begin
  select * into a from public.agreements x where x.id = p_agreement for update;
  if not found then
    return;
  end if;
  v_path := authz.agreement_eff_path(a);
  v_state := authz.agreement_eff_state(a);
  if v_path <> a.path then
    update public.agreements set path = v_path where id = p_agreement;
    perform authz.agreement_log(p_agreement, 'Έληξε η πρόταση: οι Σύνδεσμοι δεν δουλεύουν πια. Η Ευκαιρία μένει ανοιχτή.');
    perform authz.agreement_event(p_agreement, 'proposal_expired');
  end if;
  if v_state <> a.state then
    update public.agreements set state = v_state where id = p_agreement;
    perform authz.agreement_event(p_agreement, 'agreement_' || v_state);
    if v_state = 'dissolved' then
      v_cancelled := authz.agreement_wind_down(p_agreement);
      perform authz.agreement_log(p_agreement, case when v_cancelled > 0
        then format('Η Συμφωνία λύθηκε. Ακυρώθηκαν %s Παραγωγές χωρίς δουλειά μετά τη Λύση.', v_cancelled)
        else 'Η Συμφωνία λύθηκε.' end);
    end if;
  end if;
end;
$$;

-- ───────────── Αυτόματη συνέχιση ─────────────

-- Μία ακόμη Διάρκεια από την επόμενη μέρα της λήξης: Περίοδοι (αρίθμηση συνεχίζει), Παροχές, Παραγωγές, νέα λήξη.
-- Τρέχει όσο η λήξη έχει περάσει (αν το cron έλειπε μέρες, καλύπτει όλες τις Διάρκειες που χρειάζονται).
create function authz.agreement_continue(p_agreement uuid, p_today date) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_client uuid;
  v_manager uuid;
  v_base integer;
  v_start date;
  v_period public.agreement_periods;
  v_terms integer := 0;
begin
  loop
    select * into a from public.agreements x where x.id = p_agreement for update;
    exit when not found or a.kind <> 'monthly' or a.renewal <> 'auto' or a.state not in ('signed', 'active')
      or a.end_on is null or a.end_on >= p_today or v_terms >= 120;
    exit when exists (
      select 1 from public.agreement_endings e
       where e.agreement_id = p_agreement and (e.no_continuation_at is not null or e.dissolved_on <= a.end_on));
    select o.client_id, o.manager_id into v_client, v_manager from public.opportunities o where o.id = a.opportunity_id;
    select coalesce(max(pe.n), 0) into v_base from public.agreement_periods pe where pe.agreement_id = p_agreement;
    v_start := a.end_on + 1;

    insert into public.agreement_periods (agreement_id, n, starts, ends, is_partial, gives_provisions)
    select a.id, v_base + r.n + 1, r.starts, r.ends, r.share < 1, r.gives_provisions
      from authz.agreement_period_rows(v_start, a.duration_months) r;

    with given_by_kind as (
      select lp.kind_id, sum(l.quantity * lp.quantity)::integer as given
        from public.agreement_lines l
        join public.agreement_line_provisions lp on lp.line_id = l.id
       where l.agreement_id = a.id
       group by lp.kind_id
    )
    insert into public.agreement_period_provisions (period_id, kind_id, given)
    select p.id, g.kind_id, g.given
      from public.agreement_periods p
      cross join given_by_kind g
     where p.agreement_id = a.id and p.n > v_base and p.gives_provisions;

    for v_period in select p.* from public.agreement_periods p where p.agreement_id = a.id and p.n > v_base order by p.n loop
      perform authz.insert_production(a.id, v_period.id, v_client, v_manager,
        a.title || ' — ' || authz.greek_month_year(v_period.starts));
    end loop;

    update public.agreements
       set end_on = ((v_start + make_interval(months => a.duration_months))::date - 1)
     where id = p_agreement;
    perform authz.agreement_log(p_agreement, format('Αυτόματη συνέχιση: η Συμφωνία συνεχίζει για %s μήνες, έως %s.',
      a.duration_months, to_char((v_start + make_interval(months => a.duration_months))::date - 1, 'DD/MM/YYYY')));
    perform authz.agreement_event(p_agreement, 'agreement_continued', jsonb_build_object('from', v_start));
    v_terms := v_terms + 1;
  end loop;
  return v_terms;
end;
$$;

-- ───────────── Ανανέωση με νέα Ευκαιρία ─────────────

-- Αντίγραφο της πρότασης για την ανανέωση, σε Σύνταξη: ίδιοι Όροι, Παραλήπτες, Όριο αλλαγών και γραμμές, με την τρέχουσα τιμή
-- Καταλόγου για όσα στοιχεία είναι ενεργά (τα αρχειοθετημένα και οι ελεύθερες γραμμές κρατούν την τιμή τους). Χωρίς έκπτωση.
create function authz.agreement_copy_for_renewal(p_source uuid, p_opportunity uuid, p_today date) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  d public.agreement_defaults;
  v_id uuid;
  l record;
  v_line uuid;
begin
  select * into a from public.agreements x where x.id = p_source;
  select * into d from public.agreement_defaults x where x.id;
  insert into public.agreements (
    opportunity_id, kind, title, language, valid_until, start_on, duration_months, renewal, payment_days, unused_provisions,
    grace_days, dissolution_notice_days, filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns)
  values (
    p_opportunity, a.kind, a.title, a.language, p_today + d.proposal_validity_days,
    case when a.end_on >= p_today then a.end_on + 1 end, a.duration_months, a.renewal, a.payment_days, a.unused_provisions,
    a.grace_days, a.dissolution_notice_days, a.filming_notice_hours, a.filming_cancel_hours, a.late_cancel_burns, a.no_show_burns)
  returning id into v_id;

  insert into public.agreement_amounts (agreement_id, dissolution_fee, vat_rate)
  select v_id, coalesce((select m.dissolution_fee from public.agreement_amounts m where m.agreement_id = p_source), 0),
         (select s.vat_rate from public.company_settings s where s.id);
  insert into public.agreement_revision_limits (agreement_id, kind_id, rounds)
  select v_id, r.kind_id, r.rounds from public.agreement_revision_limits r where r.agreement_id = p_source;
  insert into public.agreement_baselines (agreement_id, data)
  select v_id, b.data from public.agreement_baselines b where b.agreement_id = p_source;
  insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory)
  select v_id, r.position, r.name, r.email, r.is_signatory from public.agreement_recipients r where r.agreement_id = p_source;

  for l in
    select x.*, la.unit_price, la.catalog_price, lc.hours_shoot, lc.hours_edit, lc.direct_cost,
           (ci.id is not null) as is_live, cam.price as live_price
      from public.agreement_lines x
      left join public.agreement_line_amounts la on la.line_id = x.id
      left join public.agreement_line_costs lc on lc.line_id = x.id
      left join public.catalogue_items ci on ci.id = x.item_id and ci.retired_at is null
      left join public.catalogue_item_amounts cam on cam.item_id = ci.id
     where x.agreement_id = p_source
     order by x.position
  loop
    insert into public.agreement_lines (agreement_id, position, line_kind, item_id, description, description_en, unit, quantity, catalog_provisions)
    values (v_id, l.position, l.line_kind, l.item_id, l.description, l.description_en, l.unit, l.quantity, l.catalog_provisions)
    returning id into v_line;
    insert into public.agreement_line_amounts (line_id, unit_price, catalog_price)
    values (v_line,
            case when l.is_live then coalesce(l.live_price, 0) else coalesce(l.unit_price, 0) end,
            case when l.is_live then coalesce(l.live_price, 0) else l.catalog_price end);
    insert into public.agreement_line_costs (line_id, hours_shoot, hours_edit, direct_cost)
    values (v_line, coalesce(l.hours_shoot, 0), coalesce(l.hours_edit, 0), coalesce(l.direct_cost, 0));
    insert into public.agreement_line_provisions (line_id, kind_id, quantity)
    select v_line, lp.kind_id, lp.quantity from public.agreement_line_provisions lp where lp.line_id = l.id;
  end loop;

  insert into public.agreement_revisions (agreement_id, number, created_by, summary)
  values (v_id, 1, auth.uid(), 'Πρόταση ανανέωσης.');
  perform authz.agreement_log(v_id, format('Ξεκίνησε η πρόταση ανανέωσης «%s», με τις τρέχουσες τιμές Καταλόγου.', a.title));
  perform authz.agreement_event(v_id, 'agreement_created', jsonb_build_object('renewal_of', p_source));
  return v_id;
end;
$$;

-- Ανοίγει την Ευκαιρία ανανέωσης και την πρόταση. Πηγή και Υπεύθυνος της αρχικής, αν ισχύουν ακόμα.
create function authz.agreement_open_renewal(p_agreement uuid, p_today date, p_automatic boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  o public.opportunities;
  v_source uuid;
  v_manager uuid;
  v_opportunity uuid;
  v_new uuid;
begin
  select * into a from public.agreements x where x.id = p_agreement;
  select * into o from public.opportunities x where x.id = a.opportunity_id;
  select s.id into v_source from public.sales_sources s where s.id = o.source_id and s.retired_at is null;
  if v_source is null then
    select s.id into v_source from public.sales_sources s where s.retired_at is null order by s.sort, s.created_at, s.id limit 1;
  end if;
  if o.manager_id is not null and authz.user_scope(o.manager_id, 'clients.manage') is not null then
    v_manager := o.manager_id;
  end if;
  v_opportunity := public.sales_insert_opportunity(
    o.client_id, left('Ανανέωση · ' || a.title, 200), v_source,
    case when v_source = o.source_id then o.referred_by else '' end, v_manager,
    'Στείλε την πρόταση ανανέωσης', least(p_today + 7, greatest(a.end_on, p_today)), null);
  v_new := authz.agreement_copy_for_renewal(p_agreement, v_opportunity, p_today);
  insert into public.agreement_renewals (agreement_id, term_end, opportunity_id, renewal_agreement_id, is_automatic, created_by)
  values (p_agreement, a.end_on, v_opportunity, v_new, p_automatic, auth.uid());
  perform authz.agreement_log(p_agreement, case when p_automatic
    then format('Άνοιξε Ευκαιρία ανανέωσης, %s μέρες πριν από τη λήξη, με πρόταση στις τρέχουσες τιμές.', a.end_on - p_today)
    else 'Άνοιξε Ευκαιρία ανανέωσης, με πρόταση στις τρέχουσες τιμές.' end);
  perform authz.agreement_event(p_agreement, 'renewal_opened', jsonb_build_object('opportunity_id', v_opportunity));
  return jsonb_build_object('opportunityId', v_opportunity, 'agreementId', v_new);
end;
$$;

-- ───────────── Η καθημερινή δουλειά ─────────────

-- Συνέχιση, Ευκαιρίες ανανέωσης, και ό,τι αλλάζει «σήμερα» (έναρξη, λήξη, Λύση). Κάθε Συμφωνία χωριστά: ένα λάθος δεν
-- σταματά τις άλλες ούτε τη γεννήτρια Τιμολογητέων. Μόνο service role (μέσω της billables_generate).
create function public.agreements_run(p_today date) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_lead integer;
  v_count integer := 0;
begin
  select d.renewal_lead_days into v_lead from public.agreement_defaults d where d.id;

  for r in
    select a.id from public.agreements a
     where a.kind = 'monthly' and a.renewal = 'auto' and a.state in ('signed', 'active') and a.end_on < p_today
  loop
    begin
      v_count := v_count + authz.agreement_continue(r.id, p_today);
    exception when others then
      raise warning 'agreements_run continue %: %', r.id, sqlerrm;
    end;
  end loop;

  for r in
    select a.id from public.agreements a
      join public.opportunities o on o.id = a.opportunity_id
      join public.clients c on c.id = o.client_id and c.archived_at is null
     where a.kind = 'monthly' and a.renewal = 'new_opportunity' and a.state in ('signed', 'active')
       and a.end_on >= p_today and a.end_on - coalesce(v_lead, 30) <= p_today
       and not exists (select 1 from public.agreement_endings e where e.agreement_id = a.id
                         and (e.no_continuation_at is not null or e.dissolved_on is not null))
       and not exists (select 1 from public.agreement_renewals rn where rn.agreement_id = a.id and rn.term_end = a.end_on)
  loop
    begin
      perform authz.agreement_open_renewal(r.id, p_today, true);
      v_count := v_count + 1;
    exception when others then
      raise warning 'agreements_run renewal %: %', r.id, sqlerrm;
    end;
  end loop;

  for r in
    select a.id from public.agreements a
     where authz.agreement_eff_path(a) <> a.path or authz.agreement_eff_state(a) <> a.state
  loop
    begin
      perform authz.agreement_settle(r.id);
      v_count := v_count + 1;
    exception when others then
      raise warning 'agreements_run settle %: %', r.id, sqlerrm;
    end;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Ενέργειες της ομάδας ─────────────

create function authz.require_terminate(p_agreement uuid) returns public.agreements
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  if not coalesce(authz.has('agreements.terminate'), false) or not coalesce(authz.can_see_agreement(p_agreement), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement for update;
  return a;
end;
$$;

-- Λύση με ημερομηνία και λόγο. Σήμερα ή πριν: λύνεται αμέσως. Αργότερα: λύνεται εκείνη τη μέρα (μέχρι τότε ακυρώνεται).
create function public.agreement_dissolve(p_agreement uuid, p_on date, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_today date := public.sales_today();
begin
  a := authz.require_terminate(p_agreement);
  if a.state not in ('signed', 'active') then
    raise exception 'Λύεται μόνο υπογεγραμμένη ή ενεργή Συμφωνία' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.agreement_endings e where e.agreement_id = p_agreement and e.dissolved_on is not null) then
    raise exception 'Η Λύση έχει ήδη καταχωριστεί' using errcode = 'P0001';
  end if;
  if p_on is null then
    raise exception 'Διάλεξε την ημερομηνία της Λύσης' using errcode = 'P0001';
  end if;
  if v_reason is null then
    raise exception 'Η Λύση θέλει λόγο' using errcode = 'P0001';
  end if;
  if length(v_reason) > 500 then
    raise exception 'Ο λόγος είναι έως 500 χαρακτήρες' using errcode = 'P0001';
  end if;
  if p_on < coalesce(a.start_on, (a.signed_at at time zone 'Europe/Athens')::date) then
    raise exception 'Η Λύση δεν μπαίνει πριν από την Έναρξη' using errcode = 'P0001';
  end if;
  if a.kind = 'monthly' and p_on > a.end_on then
    raise exception 'Η ημερομηνία είναι μετά τη λήξη· για να μη συνεχίσει, διάλεξε «Χωρίς συνέχιση»' using errcode = 'P0001';
  end if;
  if p_on > v_today + 365 then
    raise exception 'Η Λύση μπαίνει έως έναν χρόνο μπροστά' using errcode = 'P0001';
  end if;
  insert into public.agreement_endings (agreement_id, dissolved_on, dissolution_reason, dissolved_at, dissolved_by)
  values (p_agreement, p_on, v_reason, now(), auth.uid())
  on conflict (agreement_id) do update
    set dissolved_on = excluded.dissolved_on, dissolution_reason = excluded.dissolution_reason,
        dissolved_at = excluded.dissolved_at, dissolved_by = excluded.dissolved_by;
  perform authz.agreement_log(p_agreement, format('Λύση από %s. Λόγος: %s', to_char(p_on, 'DD/MM/YYYY'), v_reason));
  perform authz.agreement_event(p_agreement, 'dissolution_recorded', jsonb_build_object('on', p_on));
  perform authz.agreement_settle(p_agreement);
end;
$$;

-- Λύση που δεν έχει έρθει ακόμα ακυρώνεται.
create function public.agreement_cancel_dissolution(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  a := authz.require_terminate(p_agreement);
  if a.state = 'dissolved' or not exists (
    select 1 from public.agreement_endings e where e.agreement_id = p_agreement and e.dissolved_on is not null) then
    raise exception 'Δεν υπάρχει Λύση που να μην έχει γίνει ακόμα' using errcode = 'P0001';
  end if;
  update public.agreement_endings
     set dissolved_on = null, dissolution_reason = null, dissolved_at = null, dissolved_by = null
   where agreement_id = p_agreement;
  perform authz.agreement_log(p_agreement, 'Η Λύση ακυρώθηκε· η Συμφωνία συνεχίζει κανονικά.');
  perform authz.agreement_event(p_agreement, 'dissolution_cancelled');
end;
$$;

-- «Χωρίς συνέχιση» (p_continue = false) ή επαναφορά. Αυτόματη συνέχιση: λήγει στη λήξη. Νέα Ευκαιρία: δεν ανοίγει Ευκαιρία.
create function public.agreement_set_continuation(p_agreement uuid, p_continue boolean, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  a := authz.require_terminate(p_agreement);
  if a.kind <> 'monthly' or a.state not in ('signed', 'active') then
    raise exception 'Η συνέχιση αφορά μόνο ενεργή μηνιαία Συμφωνία' using errcode = 'P0001';
  end if;
  if p_continue is null then
    raise exception 'Διάλεξε αν η Συμφωνία συνεχίζει' using errcode = 'P0001';
  end if;
  if length(coalesce(v_note, '')) > 500 then
    raise exception 'Η σημείωση είναι έως 500 χαρακτήρες' using errcode = 'P0001';
  end if;
  if not p_continue then
    insert into public.agreement_endings (agreement_id, no_continuation_at, no_continuation_by, no_continuation_note)
    values (p_agreement, now(), auth.uid(), v_note)
    on conflict (agreement_id) do update
      set no_continuation_at = excluded.no_continuation_at, no_continuation_by = excluded.no_continuation_by,
          no_continuation_note = excluded.no_continuation_note;
    perform authz.agreement_log(p_agreement, format('Χωρίς συνέχιση: η Συμφωνία λήγει στις %s.%s',
      to_char(a.end_on, 'DD/MM/YYYY'), coalesce(' ' || v_note, '')));
    perform authz.agreement_event(p_agreement, 'continuation_stopped');
  else
    update public.agreement_endings
       set no_continuation_at = null, no_continuation_by = null, no_continuation_note = null
     where agreement_id = p_agreement;
    perform authz.agreement_log(p_agreement, 'Η Συμφωνία συνεχίζει ξανά όπως ορίζει η Ανανέωσή της.');
    perform authz.agreement_event(p_agreement, 'continuation_restored');
  end if;
end;
$$;

-- «Ανανέωση τώρα»: Ευκαιρία ανανέωσης χωρίς να περιμένει τη μέρα. Μία ανοιχτή τη φορά.
create function public.agreement_renew(p_agreement uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  if not coalesce(authz.can_draft_agreement(p_agreement), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement for update;
  if a.kind <> 'monthly' or a.state not in ('signed', 'active', 'expired') then
    raise exception 'Ανανεώνεται μόνο υπογεγραμμένη μηνιαία Συμφωνία' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.agreement_renewals r join public.opportunities o on o.id = r.opportunity_id
     where r.agreement_id = p_agreement and o.outcome = 'open') then
    raise exception 'Υπάρχει ήδη ανοιχτή Ευκαιρία ανανέωσης' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.opportunities o join public.clients c on c.id = o.client_id
     where o.id = a.opportunity_id and c.archived_at is not null) then
    raise exception 'Ο Πελάτης έχει αρχειοθετηθεί' using errcode = 'P0001';
  end if;
  return authz.agreement_open_renewal(p_agreement, public.sales_today(), false);
end;
$$;

-- ───────────── Υπογεγραμμένο αρχείο (υπογραφή εκτός συστήματος) ─────────────

create function authz.require_signed_file_writer(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(authz.has('agreements.deviate'), false) or not coalesce(authz.can_see_agreement(p_agreement), false)
     or not exists (select 1 from public.agreements a where a.id = p_agreement and a.state <> 'proposal') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Η θέση του αρχείου στο bucket. Το ανέβασμα το κάνει ο server με service role, μετά από αυτόν τον έλεγχο.
create function public.agreement_signed_file_slot(p_agreement uuid, p_ext text) returns text
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_signed_file_writer(p_agreement);
  if p_ext is null or p_ext not in ('pdf', 'jpg', 'png') then
    raise exception 'Ανέβασε PDF, JPG ή PNG' using errcode = 'P0001';
  end if;
  return p_agreement::text || '/' || gen_random_uuid()::text || '.' || p_ext;
end;
$$;

-- Καταχώριση (ή αντικατάσταση) του αρχείου. Επιστρέφει την παλιά διαδρομή, για να σβηστεί το παλιό αρχείο.
create function public.agreement_signed_file_attach(
  p_agreement uuid, p_path text, p_name text, p_type text, p_size integer
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text;
  v_name text := left(trim(coalesce(p_name, '')), 200);
begin
  perform authz.require_signed_file_writer(p_agreement);
  if p_path is null or left(p_path, 37) <> p_agreement::text || '/' then
    raise exception 'Η θέση του αρχείου δεν ανήκει στη Συμφωνία' using errcode = 'P0001';
  end if;
  if v_name = '' then
    v_name := 'υπογεγραμμένο';
  end if;
  select f.path into v_old from public.agreement_signed_files f where f.agreement_id = p_agreement for update;
  insert into public.agreement_signed_files (agreement_id, path, file_name, content_type, size_bytes, uploaded_by)
  values (p_agreement, p_path, v_name, p_type, p_size, auth.uid())
  on conflict (agreement_id) do update
    set path = excluded.path, file_name = excluded.file_name, content_type = excluded.content_type,
        size_bytes = excluded.size_bytes, uploaded_at = now(), uploaded_by = excluded.uploaded_by;
  perform authz.agreement_log(p_agreement, format('Ανέβηκε το υπογεγραμμένο αρχείο «%s».', v_name));
  perform authz.agreement_event(p_agreement, 'signed_file_attached');
  return v_old;
end;
$$;

-- Η διαδρομή για λήψη: όποιος βλέπει τη Συμφωνία. Αλλιώς 42501 (και για ανύπαρκτο αρχείο: null).
create function public.agreement_signed_file_path(p_agreement uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(authz.can_see_agreement(p_agreement), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (select f.path from public.agreement_signed_files f where f.agreement_id = p_agreement);
end;
$$;

-- ───────────── Ανάγνωση για τη D2 ─────────────

-- Ό,τι χρειάζεται η σελίδα για Λύση, συνέχιση, ανανέωση και υπογεγραμμένο αρχείο. null για όποιον δεν βλέπει τη Συμφωνία.
create function public.agreement_lifecycle_view(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  e public.agreement_endings;
  v_state text;
  v_today date := public.sales_today();
  v_term boolean := coalesce(authz.has('agreements.terminate'), false);
  v_draft boolean;
  v_open_renewal boolean;
  v_live boolean;
begin
  if not coalesce(authz.can_see_agreement(p_agreement), false) then
    return null;
  end if;
  select * into a from public.agreements x where x.id = p_agreement;
  select * into e from public.agreement_endings x where x.agreement_id = p_agreement;
  v_state := authz.agreement_eff_state(a);
  v_live := v_state in ('signed', 'active');
  v_draft := coalesce(authz.can_draft_agreement(p_agreement), false);
  v_open_renewal := exists (
    select 1 from public.agreement_renewals r join public.opportunities o on o.id = r.opportunity_id
     where r.agreement_id = p_agreement and o.outcome = 'open');
  return jsonb_build_object(
    'state', v_state,
    'renewalLeadDays', (select d.renewal_lead_days from public.agreement_defaults d where d.id),
    'noticeDays', a.dissolution_notice_days,
    'noContinuation', case when e.no_continuation_at is not null then jsonb_build_object(
      'at', e.no_continuation_at, 'note', e.no_continuation_note,
      'byName', (select u.name from public.team_users u where u.user_id = e.no_continuation_by)) end,
    'dissolution', case when e.dissolved_on is not null then jsonb_build_object(
      'on', e.dissolved_on, 'reason', e.dissolution_reason,
      'byName', (select u.name from public.team_users u where u.user_id = e.dissolved_by)) end,
    'renewals', coalesce((
      select jsonb_agg(jsonb_build_object(
               'opportunityId', r.opportunity_id, 'opportunityTitle', o.title, 'outcome', o.outcome,
               'agreementId', r.renewal_agreement_id, 'termEnd', r.term_end, 'isAutomatic', r.is_automatic,
               'createdAt', r.created_at) order by r.created_at desc)
        from public.agreement_renewals r join public.opportunities o on o.id = r.opportunity_id
       where r.agreement_id = p_agreement), '[]'::jsonb),
    'signedFile', (select jsonb_build_object('name', f.file_name, 'type', f.content_type, 'size', f.size_bytes,
                                             'uploadedAt', f.uploaded_at)
                     from public.agreement_signed_files f where f.agreement_id = p_agreement),
    'can', jsonb_build_object(
      'dissolve', v_term and v_live and e.dissolved_on is null,
      'cancelDissolution', v_term and v_live and e.dissolved_on is not null and e.dissolved_on > v_today,
      'setContinuation', v_term and v_live and a.kind = 'monthly' and e.dissolved_on is null,
      'renew', v_draft and a.kind = 'monthly' and v_state in ('signed', 'active', 'expired') and not v_open_renewal,
      'attachFile', coalesce(authz.has('agreements.deviate'), false) and a.state <> 'proposal'
    )
  );
end;
$$;

-- ───────────── Ρυθμίσεις: μέρες πριν από τη λήξη για την Ευκαιρία ανανέωσης ─────────────

drop function public.agreements_defaults_view();
create function public.agreements_defaults_view()
returns table (
  proposal_validity_days integer, standard_discount_percent numeric, standard_discount_months integer, advance_percent numeric,
  payment_days_monthly integer, payment_days_one_off integer, unused_provisions text, grace_days integer, duration_months integer,
  renewal text, dissolution_notice_days integer, dissolution_fee numeric, filming_notice_hours integer, filming_cancel_hours integer,
  late_cancel_burns boolean, no_show_burns boolean, email_sender_connected boolean,
  open_proposals integer, live_agreements integer, updated_at timestamptz, renewal_lead_days integer
)
language sql stable security definer set search_path = ''
as $$
  select d.proposal_validity_days, d.standard_discount_percent, d.standard_discount_months, d.advance_percent,
         d.payment_days_monthly, d.payment_days_one_off, d.unused_provisions, d.grace_days, d.duration_months,
         d.renewal, d.dissolution_notice_days,
         case when authz.has('finance.amounts') then d.dissolution_fee end,
         d.filming_notice_hours, d.filming_cancel_hours, d.late_cancel_burns, d.no_show_burns, d.email_sender_connected,
         (select count(*)::integer from public.agreements a where a.state = 'proposal' and a.path in ('draft', 'awaiting_approval', 'sent', 'expired')),
         (select count(*)::integer from public.agreements a where a.state in ('signed', 'active')),
         d.updated_at, d.renewal_lead_days
    from public.agreement_defaults d
   where d.id and authz.has('settings.manage');
$$;

create function public.agreements_save_renewal_lead(p_days integer) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  if p_days is null or p_days not between 1 and 365 then
    raise exception 'Οι μέρες είναι από 1 έως 365' using errcode = 'P0001';
  end if;
  update public.agreement_defaults set renewal_lead_days = p_days where id;
end;
$$;

-- ───────────── Τιμολογητέα: η Λυμένη Συμφωνία ─────────────

-- Περίοδοι: και της Λυμένης, μόνο όσες αρχίζουν έως τη Λύση.
create or replace function authz.billables_from_periods(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select o.client_id, a.id, 'period', p.id, 'Περίοδος ' || authz.greek_month(p.starts), p_today, x.net
      from public.agreements a
      join public.opportunities o on o.id = a.opportunity_id
      join public.agreement_periods p on p.agreement_id = a.id
      left join public.agreement_endings e on e.agreement_id = a.id
      cross join lateral (select round(authz.production_period_price(a.id, p.id), 2) as net) x
     where a.kind = 'monthly' and a.state in ('signed', 'active', 'expired', 'dissolved')
       and (a.state <> 'dissolved' or p.starts <= e.dissolved_on)
       and p.starts <= p_today and x.net > 0
       -- Καμία Περίοδος πριν από τον μήνα καταγραφής της υπογραφής (μεταφορά πελάτη με παλιά έναρξη).
       and p.starts >= (select date_trunc('month', s.recorded_at at time zone 'Europe/Athens')::date
                          from public.agreement_signatures s where s.agreement_id = a.id)
       and not exists (
         select 1 from public.agreement_signatures s
          where s.agreement_id = a.id and s.month_invoiced
            and to_char(s.recorded_at at time zone 'Europe/Athens', 'YYYY-MM') = to_char(p.starts, 'YYYY-MM'))
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

-- Έξτρα που χρεώθηκαν: και της Λυμένης (η δουλειά έγινε).
create or replace function authz.billables_from_extra_deliverables(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_deliverable', d.id, 'Έξτρα Παραδοτέο · ' || d.title, p_today, x.net
      from public.deliverables d
      join public.productions pr on pr.id = d.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired', 'dissolved')
      cross join lateral (select authz.billable_extra_price(a.id, d.kind_id) as net) x
     where d.charge = 'charged' and d.cancelled_at is null and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

create or replace function authz.billables_from_extra_revisions(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_revision', r.id, 'Έξτρα αναθεώρηση · ' || d.title, p_today, x.net
      from public.deliverable_requests r
      join public.deliverables d on d.id = r.deliverable_id
      join public.productions pr on pr.id = d.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired', 'dissolved')
      cross join lateral (select authz.billable_extra_price(a.id, d.kind_id) as net) x
     where r.decision = 'charged' and d.cancelled_at is null and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

create or replace function authz.billables_from_extra_filmings(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_filming', f.id, 'Έξτρα Γύρισμα · ' || k.label, p_today, x.net
      from public.filmings f
      join public.productions pr on pr.id = f.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired', 'dissolved')
      join public.provision_kinds k on k.id = f.kind_id and k.measure = 'per_filming'
      cross join lateral (select authz.billable_extra_price(a.id, f.kind_id) as net) x
     where f.is_extra and f.state = 'done' and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

-- Το cron (service_role) καλεί πρώτα τον κύκλο ζωής των Συμφωνιών (συνέχιση, ανανέωση, Λύση) και μετά τις γεννήτριες.
create or replace function public.billables_generate() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
begin
  begin
    perform public.agreements_run(v_today);
  exception when others then
    raise warning 'agreements_run: %', sqlerrm;
  end;
  return authz.billables_from_periods(v_today)
    + authz.billables_from_milestones(v_today)
    + authz.billables_from_extra_deliverables(v_today)
    + authz.billables_from_extra_revisions(v_today)
    + authz.billables_from_extra_filmings(v_today)
    + authz.billables_from_dissolution(v_today);
end;
$$;

-- ───────────── Περίοδοι μετά τη συνέχιση: τιμή, μερίδιο, λίστα πελάτη ─────────────

create or replace function authz.production_period_price(p_agreement uuid, p_period uuid) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_list numeric;
  v_pct numeric := 0;
  v_months integer := 0;
  v_n integer;
  v_share numeric;
begin
  select * into a from public.agreements x where x.id = p_agreement;
  select coalesce(sum(l.quantity * la.unit_price), 0) into v_list
    from public.agreement_lines l join public.agreement_line_amounts la on la.line_id = l.id
   where l.agreement_id = p_agreement;
  select coalesce(m.discount_percent, 0), coalesce(m.discount_months, 0) into v_pct, v_months
    from public.agreement_amounts m where m.agreement_id = p_agreement;
  if a.kind = 'one_off' then
    return round(v_list * (1 - v_pct / 100), 2);
  end if;
  select r.n, r.share into v_n, v_share
    from authz.agreement_rows(a.id, a.start_on, a.duration_months) r
    join public.agreement_periods ap on ap.id = p_period and r.n + 1 = ap.n;
  return round(
    (case when v_n < v_months then round(v_list * (1 - v_pct / 100), 2) else v_list end) * v_share, 2);
end;
$$;

create or replace function authz.production_period_share(p_agreement uuid, p_period uuid) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
  select coalesce((
    select r.share
      from public.agreements a
      cross join lateral authz.agreement_rows(a.id, a.start_on, a.duration_months) r
      join public.agreement_periods ap on ap.id = p_period and r.n + 1 = ap.n
     where a.id = p_agreement and a.kind = 'monthly'
  ), 1)
  );
end;
$$;

create or replace function authz.client_agreement_periods(a public.agreements) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
  select coalesce(jsonb_agg(jsonb_build_object(
           'n', p.n + 1, 'starts', p.starts, 'ends', p.ends, 'isPartial', p.share < 1,
           'state', authz.period_state(p.starts, p.ends),
           'amount', round((case when p.n < coalesce((t.totals ->> 'discount_months')::integer, 0)
                                 then (t.totals ->> 'discounted_net')::numeric
                                 else (t.totals ->> 'net')::numeric end) * p.share, 2),
           'provisions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'kindId', b.value -> 'kind_id', 'label', b.value -> 'label', 'unit', b.value -> 'unit',
                      'given', b.value -> 'given', 'carried', b.value -> 'carried', 'used', b.value -> 'used',
                      'reserved', b.value -> 'reserved', 'balance', b.value -> 'balance') order by b.ord)
               from jsonb_array_elements(authz.period_balances(pe.id)) with ordinality as b (value, ord)
              where pe.id is not null), '[]'::jsonb)
         ) order by p.n), '[]'::jsonb)
    from (select authz.client_agreement_document(a) -> 'totals' as totals) t
    cross join authz.agreement_rows(a.id, a.start_on, a.duration_months) p
    left join public.agreement_periods pe on pe.agreement_id = a.id and pe.n = p.n + 1
   where a.kind = 'monthly' and a.state <> 'proposal' and a.start_on is not null and t.totals is not null
  );
end;
$$;

-- Ξαναγράφεται η public.agreement_view (της 20261009180000) μόνο για να διαβάζει τις Περιόδους από την authz.agreement_rows
-- (μετά τη συνέχιση η λίστα μεγαλώνει). Το υπόλοιπο σώμα είναι το ίδιο· το CREATE OR REPLACE κρατά τα Δικαιώματα εκτέλεσης.

create or replace function public.agreement_view(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  o public.opportunities;
  c public.clients;
  m public.agreement_amounts;
  v_base jsonb;
  v_today date := public.sales_today();
  v_amounts boolean := coalesce(authz.has('finance.amounts'), false);
  v_cost boolean := coalesce(authz.has('finance.cost'), false);
  v_manage_cost boolean := coalesce(authz.can_manage_cost(), false);
  v_deviate boolean := coalesce(authz.has('agreements.deviate'), false);
  v_draft boolean;
  v_internal boolean;
  v_path text;
  v_state text;
  v_fig record;
  v_sig public.agreement_signatures;
  v_lines jsonb;
  v_deviations jsonb := '[]'::jsonb;
  v_revisions jsonb;
  v_recipients jsonb;
  v_milestones jsonb;
  v_limits jsonb;
  v_periods jsonb := '[]'::jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_outbox integer := 0;
  v_has_lines boolean;
  v_needs boolean;
  v_editable boolean;
  v_period_start date;
begin
  if not coalesce(authz.can_see_agreement(p_agreement), false) then
    return null;
  end if;
  select * into a from public.agreements x where x.id = p_agreement;
  select * into o from public.opportunities x where x.id = a.opportunity_id;
  select * into c from public.clients x where x.id = o.client_id;
  select * into m from public.agreement_amounts x where x.agreement_id = p_agreement;
  select b.data into v_base from public.agreement_baselines b where b.agreement_id = p_agreement;
  v_draft := coalesce(authz.can_draft_agreement(p_agreement), false);
  v_internal := v_draft or v_deviate;
  v_path := authz.agreement_eff_path(a);
  v_state := authz.agreement_eff_state(a);
  select * into v_fig from authz.agreement_figures(p_agreement);
  select * into v_sig from public.agreement_signatures s where s.agreement_id = p_agreement;
  select exists (select 1 from public.agreement_lines l where l.agreement_id = p_agreement) into v_has_lines;
  v_editable := v_draft and a.state = 'proposal' and v_path in ('draft', 'awaiting_approval');

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id, 'position', l.position, 'kind', l.line_kind, 'item_id', l.item_id,
           'description', l.description, 'description_en', l.description_en, 'unit', l.unit, 'quantity', l.quantity,
           'unit_price', case when v_amounts then la.unit_price end,
           'catalog_price', case when v_amounts then la.catalog_price end,
           'line_total', case when v_amounts then round(l.quantity * la.unit_price, 2) end,
           'hours_shoot', case when v_cost then lc.hours_shoot end,
           'hours_edit', case when v_cost then lc.hours_edit end,
           'direct_cost', case when v_cost then lc.direct_cost end,
           'provisions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'kind_id', p.kind_id, 'quantity', p.quantity,
                      'catalog_quantity', (select (e ->> 'quantity')::integer from jsonb_array_elements(l.catalog_provisions) e
                                            where e ->> 'kind_id' = p.kind_id::text)) order by k.sort, k.id)
               from public.agreement_line_provisions p join public.provision_kinds k on k.id = p.kind_id
              where p.line_id = l.id), '[]'::jsonb)
         ) order by l.position, l.id), '[]'::jsonb)
    into v_lines
    from public.agreement_lines l
    join public.agreement_line_amounts la on la.line_id = l.id
    join public.agreement_line_costs lc on lc.line_id = l.id
   where l.agreement_id = p_agreement;

  if v_internal then
    select coalesce(jsonb_agg(jsonb_build_object(
             'key', d.key, 'kind', d.kind, 'subject', d.subject,
             'depth', case when not d.is_money or v_amounts then d.depth end,
             'base_value', case when not d.is_money or v_amounts then d.base_value end,
             'value', case when not d.is_money or v_amounts then d.value end,
             'status', coalesce(u.status, 'covered')) order by d.key), '[]'::jsonb)
      into v_deviations
      from authz.agreement_deviations(p_agreement) d
      left join authz.agreement_uncovered(p_agreement) u on u.key = d.key;
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', q.id, 'revision', q.revision, 'from_name', q.from_name, 'message', q.message, 'created_at', q.created_at)
             order by q.created_at desc), '[]'::jsonb)
      into v_changes from public.agreement_change_requests q where q.agreement_id = p_agreement;
    select count(*)::integer into v_outbox from public.agreement_outbox x where x.agreement_id = p_agreement and x.status = 'pending';
  end if;
  v_needs := v_draft and a.state = 'proposal' and coalesce(authz.agreement_needs_approval(p_agreement), false);

  select coalesce(jsonb_agg(jsonb_build_object(
           'number', r.number, 'created_at', r.created_at, 'created_by_name', cu.name, 'summary', r.summary, 'sent_at', r.sent_at,
           'approval', case when v_internal and r.approval_state is not null then jsonb_build_object(
             'state', r.approval_state, 'requested_at', r.requested_at, 'requested_by_name', ru.name,
             'decided_at', r.decided_at, 'decided_by_name', du.name, 'comment', r.comment) end
         ) order by r.number desc), '[]'::jsonb)
    into v_revisions
    from public.agreement_revisions r
    left join public.team_users cu on cu.user_id = r.created_by
    left join public.team_users ru on ru.user_id = r.requested_by
    left join public.team_users du on du.user_id = r.decided_by
   where r.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'name', r.name, 'email', r.email, 'is_signatory', r.is_signatory,
           'link', (
             select jsonb_build_object(
                      'id', l.id, 'status', authz.link_status(l, a), 'is_opened', l.first_opened_at is not null,
                      'open_count', l.open_count, 'first_opened_at', l.first_opened_at)
               from public.agreement_links l
              where l.agreement_id = p_agreement and lower(l.recipient_email) = lower(r.email)
              order by l.revision desc, l.issued_at desc limit 1)
         ) order by r.position, r.id), '[]'::jsonb)
    into v_recipients from public.agreement_recipients r where r.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', ms.id, 'trigger', ms.trigger, 'percent', ms.percent, 'due_on', ms.due_on,
           'amount', case when v_amounts then round(v_fig.price * ms.percent / 100, 2) end) order by ms.position, ms.id), '[]'::jsonb)
    into v_milestones from public.agreement_milestones ms where ms.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object(
           'kind_id', r.kind_id, 'label', k.label, 'label_en', k.label_en, 'rounds', r.rounds,
           'base_rounds', (v_base -> 'revision_limits' ->> r.kind_id::text)::integer) order by k.sort, k.id), '[]'::jsonb)
    into v_limits
    from public.agreement_revision_limits r join public.provision_kinds k on k.id = r.kind_id
   where r.agreement_id = p_agreement;

  if a.kind = 'monthly' then
    v_period_start := coalesce(a.start_on, v_today);
    select coalesce(jsonb_agg(jsonb_build_object(
             'n', p.n + 1, 'starts', p.starts, 'ends', p.ends, 'is_partial', p.share < 1, 'gives_provisions', p.gives_provisions,
             'production_id', (select r.id from public.productions r join public.agreement_periods pe on pe.id = r.period_id where pe.agreement_id = p_agreement and pe.n = p.n + 1),
             'is_discounted', p.n < m.discount_months,
             'state', case when p.ends < v_today then 'closed' when p.starts <= v_today then 'current' else 'next' end,
             'amount', case when v_amounts then round((case when p.n < m.discount_months then v_fig.discounted_price else v_fig.price end) * p.share, 2) end
           ) order by p.n), '[]'::jsonb)
      into v_periods from authz.agreement_rows(a.id, v_period_start, a.duration_months) p;
  end if;

  return jsonb_build_object(
    'id', a.id, 'kind', a.kind, 'title', a.title, 'language', a.language, 'state', v_state, 'path', v_path, 'revision', a.revision,
    'valid_until', a.valid_until, 'start_on', a.start_on, 'end_on', a.end_on, 'duration_months', a.duration_months,
    'signed_at', a.signed_at, 'updated_at', a.updated_at,
    'opportunity', jsonb_build_object('id', o.id, 'title', o.title, 'outcome', o.outcome, 'manager_id', o.manager_id,
      'manager_name', (select u.name from public.team_users u where u.user_id = o.manager_id)),
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'contact_name', c.contact_name, 'contact_email', c.contact_email),
    'terms', jsonb_build_object(
      'payment_days', a.payment_days, 'unused_provisions', a.unused_provisions, 'grace_days', a.grace_days, 'renewal', a.renewal,
      'dissolution_notice_days', a.dissolution_notice_days, 'filming_notice_hours', a.filming_notice_hours,
      'filming_cancel_hours', a.filming_cancel_hours, 'late_cancel_burns', a.late_cancel_burns, 'no_show_burns', a.no_show_burns),
    'money_terms', case when v_amounts then jsonb_build_object(
      'discount_percent', m.discount_percent, 'discount_months', m.discount_months, 'dissolution_fee', m.dissolution_fee, 'vat_rate', m.vat_rate) end,
    'baseline', case when v_internal then jsonb_build_object(
      'payment_days', v_base -> 'payment_days', 'unused_provisions', v_base -> 'unused_provisions', 'grace_days', v_base -> 'grace_days',
      'dissolution_notice_days', v_base -> 'dissolution_notice_days',
      'dissolution_fee', case when v_amounts then v_base -> 'dissolution_fee' end,
      'filming_notice_hours', v_base -> 'filming_notice_hours', 'filming_cancel_hours', v_base -> 'filming_cancel_hours',
      'late_cancel_burns', v_base -> 'late_cancel_burns', 'no_show_burns', v_base -> 'no_show_burns',
      'standard_discount_percent', v_base -> 'standard_discount_percent', 'standard_discount_months', v_base -> 'standard_discount_months',
      'advance_percent', v_base -> 'advance_percent') end,
    'lines', v_lines,
    'milestones', v_milestones,
    'milestones_total', (select coalesce(sum(ms.percent), 0) from public.agreement_milestones ms where ms.agreement_id = p_agreement),
    'revision_limits', v_limits,
    'recipients', v_recipients,
    'revisions', v_revisions,
    'deviations', v_deviations,
    'needs_approval', v_needs,
    'totals', case when v_amounts then jsonb_build_object(
      'price', v_fig.price, 'discounted_price', v_fig.discounted_price, 'vat_rate', m.vat_rate,
      'vat', round(v_fig.price * m.vat_rate / 100, 2), 'gross', round(v_fig.price * (1 + m.vat_rate / 100), 2)) end,
    'cost', case when v_cost then jsonb_build_object(
      'hour_cost', v_fig.hour_cost, 'hour_cost_month', v_fig.hour_cost_month, 'estimated_cost', v_fig.estimated_cost,
      'multiplier_min', v_fig.mult_min, 'multiplier_target', v_fig.mult_target, 'multiplier_max', v_fig.mult_max,
      'is_low_margin', coalesce(v_fig.is_low_margin, false), 'is_frozen', v_fig.is_frozen) end,
    'periods', v_periods,
    'change_requests', v_changes,
    'signature', case when v_sig.agreement_id is not null then jsonb_build_object(
      'method', v_sig.method, 'signed_name', v_sig.signed_name, 'signed_on', v_sig.signed_on, 'recorded_at', v_sig.recorded_at,
      'otp_delivery', v_sig.otp_delivery, 'document_hash', v_sig.document_hash,
      'reference', case when v_internal then v_sig.reference end,
      'ip', case when v_internal then v_sig.ip end,
      'used_provisions', case when v_internal then v_sig.used_provisions end,
      'month_invoiced', case when v_internal then v_sig.month_invoiced end) end,
    'document', (select jsonb_build_object('revision', d.revision, 'hash', d.hash, 'created_at', d.created_at)
                   from public.agreement_documents d where d.agreement_id = p_agreement and d.revision = a.revision),
    'outbox_pending', v_outbox,
    'email_sender_connected', coalesce((select d.email_sender_connected from public.agreement_defaults d where d.id), false),
    'proposal_validity_days', (select d.proposal_validity_days from public.agreement_defaults d where d.id),
    'can', jsonb_build_object(
      'see_amounts', v_amounts, 'see_cost', v_cost, 'manage_cost', v_manage_cost,
      'edit', v_editable,
      'edit_prices', v_editable and v_amounts,
      'edit_cost', v_editable and v_manage_cost,
      'send', v_editable and v_has_lines and not v_needs and v_amounts,
      'request_approval', v_editable and v_has_lines and v_needs,
      'withdraw_approval', v_draft and v_path = 'awaiting_approval',
      'decide', v_deviate and v_amounts and v_path = 'awaiting_approval',
      'new_revision', v_draft and a.state = 'proposal' and v_path in ('sent', 'expired'),
      'extend', v_draft and v_amounts and a.state = 'proposal' and v_path = 'expired',
      'close_lost', v_draft and a.state = 'proposal' and v_path = 'expired',
      'manage_links', v_draft and v_amounts and a.state = 'proposal' and v_path = 'sent',
      'sign_outside', v_deviate and v_has_lines and a.state = 'proposal' and v_path in ('draft', 'sent', 'expired')
    )
  );
end;
$$;

-- ───────────── Δικαιώματα εκτέλεσης ─────────────
-- Αρχικά κανείς· ανοίγουν ρητά μόνο όσα καλεί η εφαρμογή. Ο κύκλος ζωής «σήμερα» μόνο από service role.

revoke all on function
  authz.agreement_eff_state(public.agreements),
  authz.agreement_rows(uuid, date, integer),
  authz.agreement_wind_down(uuid),
  authz.agreement_continue(uuid, date),
  authz.agreement_copy_for_renewal(uuid, uuid, date),
  authz.agreement_open_renewal(uuid, date, boolean),
  authz.require_terminate(uuid),
  authz.require_signed_file_writer(uuid),
  public.agreements_run(date),
  public.agreement_dissolve(uuid, date, text),
  public.agreement_cancel_dissolution(uuid),
  public.agreement_set_continuation(uuid, boolean, text),
  public.agreement_renew(uuid),
  public.agreement_signed_file_slot(uuid, text),
  public.agreement_signed_file_attach(uuid, text, text, text, integer),
  public.agreement_signed_file_path(uuid),
  public.agreement_lifecycle_view(uuid),
  public.agreements_defaults_view(),
  public.agreements_save_renewal_lead(integer)
  from public, anon, authenticated;

grant execute on function
  public.agreement_dissolve(uuid, date, text),
  public.agreement_cancel_dissolution(uuid),
  public.agreement_set_continuation(uuid, boolean, text),
  public.agreement_renew(uuid),
  public.agreement_signed_file_slot(uuid, text),
  public.agreement_signed_file_attach(uuid, text, text, text, integer),
  public.agreement_signed_file_path(uuid),
  public.agreement_lifecycle_view(uuid),
  public.agreements_defaults_view(),
  public.agreements_save_renewal_lead(integer)
  to authenticated;

grant execute on function public.agreements_run(date) to service_role;
