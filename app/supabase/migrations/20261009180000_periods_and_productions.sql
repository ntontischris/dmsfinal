-- Περίοδοι και Παραγωγές (G1, G2): εγγραφές Περιόδων, Παροχές ανά Περίοδο, Παραγωγές, Μέλη. Κεφ. 3 (Περίοδοι, Παραγωγή), ADR 0007, 0008, 0010, 0018.
--
-- Αρχές:
--  • Οι Περίοδοι γίνονται εγγραφές τη στιγμή που η Συμφωνία παύει να είναι πρόταση, και ΟΛΕΣ μαζί με τις Παραγωγές τους.
--    Γεννιούνται από authz.agreement_materialize, που καλείται από trigger στην αλλαγή κατάστασης της Συμφωνίας.
--    Το trigger (και όχι κλήση μέσα στις δύο RPC υπογραφής) γιατί και οι δύο διαδρομές (Σύνδεσμος και εκτός συστήματος)
--    περνούν από την authz.agreement_finalize_signature και ενημερώνουν την ίδια γραμμή· έτσι δεν ξαναγράφονται
--    συναρτήσεις από παλαιότερη migration.
--  • Το υπόλοιπο μιας Περιόδου δεν αποθηκεύεται: υπολογίζεται (authz.period_balance) από Παροχές, μεταφερόμενο και
--    καταναλωμένο/δεσμευμένο. Το καταναλωμένο και το δεσμευμένο έρχονται από hooks που σήμερα επιστρέφουν 0 (Γυρίσματα).
--  • Οι πίνακες είναι κλειστοί για την εφαρμογή (RLS χωρίς policies, χωρίς grants): διαβάζονται και γράφονται μόνο από τα
--    public.production* RPC, που ελέγχουν το Δικαίωμα στο σώμα τους (security definer, search_path = '').
--  • Δικαίωμα: productions.manage (all = όλες· mine = όσες με αφορούν, δηλαδή Υπεύθυνος ή Μέλος). Κανένα νέο Δικαίωμα.
--  • Πελάτης βλέπει μόνο τις Παραγωγές του Πελάτη του, ποτέ Εσωτερικές, χωρίς Μέλη. Η σύνδεση Χρήστη με Πελάτη δεν υπάρχει
--    ακόμα (θα έρθει με τις Προσκλήσεις)· μέχρι τότε η authz.client_user_client_id() επιστρέφει null και ο Πελάτης αποκλείεται.
--  • Παραγωγές δεν σβήνονται· ακυρώνονται. Περίοδοι και Παροχές τους δεν αλλάζουν ποτέ.
--  • Ιστορικό = Ίχνος ενεργειών (audit_log). Κάθε μετάβαση γράφει γεγονός με τον λόγο της. Ποσά και κόστος δεν μπαίνουν εδώ.

-- ───────────── Πίνακες ─────────────

create table public.agreement_periods (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  -- Αύξων αριθμός από 1, όπως στη λίστα της Συμφωνίας.
  n integer not null check (n >= 1),
  starts date not null,
  ends date not null,
  is_partial boolean not null,
  -- Η τελευταία μερική Περίοδος δεν δίνει νέες Παροχές (κεφ. 3).
  gives_provisions boolean not null,
  created_at timestamptz not null default now(),
  check (ends >= starts),
  unique (agreement_id, n)
);

create table public.agreement_period_provisions (
  period_id uuid not null references public.agreement_periods (id),
  kind_id uuid not null references public.provision_kinds (id),
  -- Το άθροισμα των γραμμών της Συμφωνίας: γραμμή ποσότητα × Παροχή ποσότητα, ανά είδος.
  given integer not null check (given between 1 and 99999),
  primary key (period_id, kind_id)
);

create index agreement_period_provisions_kind_idx on public.agreement_period_provisions (kind_id);

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0 and length(title) <= 300),
  -- null client_id = Εσωτερική Παραγωγή (χωρίς Πελάτη, Συμφωνία και Περίοδο).
  client_id uuid references public.clients (id),
  agreement_id uuid references public.agreements (id),
  period_id uuid references public.agreement_periods (id),
  -- null = «Χωρίς υπεύθυνο» (Π5).
  owner_id uuid references public.team_users (user_id),
  state text not null default 'open' check (state in ('open', 'delivered', 'cancelled')),
  delivered_at timestamptz,
  delivered_by uuid,
  delivered_note text check (delivered_note is null or length(trim(delivered_note)) > 0),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancelled_reason text check (cancelled_reason is null or length(trim(cancelled_reason)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((client_id is null) = (agreement_id is null)),
  check (period_id is null or agreement_id is not null),
  check ((state = 'delivered') = (delivered_at is not null)),
  check (state <> 'delivered' or delivered_note is not null),
  check ((state = 'cancelled') = (cancelled_at is not null)),
  check (state <> 'cancelled' or cancelled_reason is not null)
);

-- Μία Παραγωγή ανά Περίοδο, μία ανά εφάπαξ Συμφωνία.
create unique index productions_period_key on public.productions (period_id) where period_id is not null;
create unique index productions_one_off_key on public.productions (agreement_id) where period_id is null and agreement_id is not null;
create index productions_client_idx on public.productions (client_id);
create index productions_owner_idx on public.productions (owner_id);

-- Μέλη με το χέρι. Ο Υπεύθυνος είναι Μέλος χωρίς να γράφεται εδώ.
create table public.production_members (
  production_id uuid not null references public.productions (id),
  user_id uuid not null references public.team_users (user_id),
  added_by uuid,
  added_at timestamptz not null default now(),
  primary key (production_id, user_id)
);

create index production_members_user_idx on public.production_members (user_id);

alter table public.agreement_periods enable row level security;
alter table public.agreement_period_provisions enable row level security;
alter table public.productions enable row level security;
alter table public.production_members enable row level security;

-- ───────────── Σημεία σύνδεσης (hooks) ─────────────

-- Καταναλωμένες Παροχές μιας Περιόδου. Το module Γυρισμάτων θα την αντικαταστήσει· μέχρι τότε δεν έχει καταναλωθεί τίποτα.
create function authz.period_provision_used(p_period uuid, p_kind uuid) returns integer
language sql stable security definer set search_path = ''
as $$ select 0; $$;

-- Δεσμευμένες Παροχές μιας Περιόδου (Γυρίσματα ανοιχτά). Σήμερα 0.
create function authz.period_provision_reserved(p_period uuid, p_kind uuid) returns integer
language sql stable security definer set search_path = ''
as $$ select 0; $$;

-- Έχει η Παραγωγή δουλειά (Γύρισμα, Εργασία, Παραδοτέο); Αν ναι δεν ακυρώνεται. Σήμερα όχι.
create function authz.production_has_work(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select false; $$;

-- Ο Πελάτης του συνδεδεμένου Χρήστη, μόνο αν ο Χρήστης έχει Δικαίωμα «Βλέπει Παραγωγές». Σήμερα κανείς δεν συνδέεται.
create function authz.client_user_client_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select null::uuid; $$;

-- ───────────── Βοηθητικές συναρτήσεις ─────────────

-- Κατάσταση Περιόδου από την ημερομηνία: κλειστή, τρέχουσα ή επόμενη.
create function authz.period_state(p_starts date, p_ends date) returns text
language sql stable set search_path = ''
as $$
  select case
    when p_ends < public.sales_today() then 'closed'
    when p_starts <= public.sales_today() then 'current'
    else 'next'
  end;
$$;

-- «Οκτώβριος 2026» για τον τίτλο προεπιλογής μηνιαίας Παραγωγής.
create function authz.greek_month_year(p_date date) returns text
language sql immutable set search_path = ''
as $$
  select (array['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
                'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'])[extract(month from p_date)::integer]
         || ' ' || extract(year from p_date)::integer::text;
$$;

-- Υπεύθυνος προεπιλογής: ο Υπεύθυνος της Ευκαιρίας, αν έχει Δικαίωμα Παραγωγών· αλλιώς κανείς.
create function authz.default_production_owner(p_manager uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select case when authz.user_scope(p_manager, 'productions.manage') is not null then p_manager end;
$$;

-- Με αφορά: Υπεύθυνος ή Μέλος της Παραγωγής (Π7).
create function authz.is_production_participant(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.productions p
     where p.id = p_production
       and (p.owner_id = auth.uid()
            or exists (select 1 from public.production_members m where m.production_id = p.id and m.user_id = auth.uid()))
  );
$$;

-- Βλέπει ο Χρήστης την Παραγωγή; Ομάδα: όλα, ή όσες με αφορούν. Πελάτης: μόνο οι Παραγωγές του, όχι Εσωτερικές.
create function authz.can_see_production(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.productions p
     where p.id = p_production
       and case
         when authz.is_team_user() then
           authz.scope('productions.manage') = 'all'
           or (authz.scope('productions.manage') = 'mine' and authz.is_production_participant(p.id))
         else p.client_id is not null and p.client_id = authz.client_user_client_id()
       end
  );
$$;

-- Διαχειρίζεται ο Χρήστης την Παραγωγή (γράφει, παραδίδει, αλλάζει Μέλη). Πάντα boolean, ποτέ null.
create function authz.can_manage_production(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    authz.scope('productions.manage') = 'all'
    or (authz.scope('productions.manage') = 'mine' and authz.is_production_participant(p_production)),
    false
  );
$$;

-- Θέλει όποιος «Βλέπει» Παραγωγές: Δικαίωμα ομάδας, ή σύνδεση Πελάτη. Αλλιώς 42501.
create function authz.require_production_viewer() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.is_team_user() then
    perform authz.require('productions.manage');
  elsif authz.client_user_client_id() is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Η Παραγωγή υπάρχει. Αλλιώς P0001 (και για null).
create function authz.require_production(p_production uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_production is null or not exists (select 1 from public.productions p where p.id = p_production) then
    raise exception 'Η Παραγωγή δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Γράφει την Παραγωγή: Δικαίωμα, ύπαρξη, και Εύρος (mine μόνο όσες με αφορούν). Αλλιώς 42501 ή P0001.
create function authz.production_writable(p_production uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('productions.manage');
  perform authz.require_production(p_production);
  if not authz.can_manage_production(p_production) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ο Υπεύθυνος πρέπει να είναι ενεργός Χρήστης με Δικαίωμα Παραγωγών. Το null επιτρέπεται εδώ («Χωρίς υπεύθυνο»).
create function authz.check_production_owner(p_owner uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_owner is null then
    return;
  end if;
  if not exists (select 1 from public.team_users u where u.user_id = p_owner and u.is_active) then
    raise exception 'Ο Υπεύθυνος δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if authz.user_scope(p_owner, 'productions.manage') is null then
    raise exception 'Ο Υπεύθυνος δεν έχει Δικαίωμα Παραγωγών' using errcode = 'P0001';
  end if;
end;
$$;

-- Γεγονός για το Ίχνος της Παραγωγής (action 'event'), με τον λόγο στο detail.
create function authz.production_event(p_production uuid, p_event text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'productions', p_production::text, jsonb_build_object('event', p_event) || coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Υπόλοιπο μιας Περιόδου για ένα είδος Παροχής (Π3). Δεν αποθηκεύεται.
-- Κάθε Περίοδος: given (από τις Παροχές της, 0 αν δεν δίνει)· leftover = given − used − reserved.
-- Μεταφερόμενο (carried) ακολουθεί τους Όρους της Συμφωνίας: lost = 0· next_period = leftover της αμέσως προηγούμενης·
-- accumulate = άθροισμα των leftover όλων των προηγούμενων. balance = given + carried − used − reserved.
create function authz.period_balance(p_period uuid, p_kind uuid)
returns table (given integer, carried integer, used integer, reserved integer, balance integer)
language sql stable security definer set search_path = ''
as $$
  with target as (
    select pe.agreement_id, pe.n from public.agreement_periods pe where pe.id = p_period
  ), ledger as (
    select pe.n,
           coalesce(pp.given, 0) as given_count,
           authz.period_provision_used(pe.id, p_kind) as used_count,
           authz.period_provision_reserved(pe.id, p_kind) as reserved_count
      from public.agreement_periods pe
      join target t on t.agreement_id = pe.agreement_id and pe.n <= t.n
      left join public.agreement_period_provisions pp on pp.period_id = pe.id and pp.kind_id = p_kind
  ), leftover as (
    select l.n, l.given_count, l.used_count, l.reserved_count,
           l.given_count - l.used_count - l.reserved_count as left_count
      from ledger l
  )
  select cur.given_count, carry.amount, cur.used_count, cur.reserved_count,
         cur.given_count + carry.amount - cur.used_count - cur.reserved_count
    from leftover cur
    join target t on t.n = cur.n
    join public.agreements a on a.id = t.agreement_id
    cross join lateral (
      select (case a.unused_provisions
        when 'next_period' then coalesce((select greatest(prev.left_count, 0) from leftover prev where prev.n = cur.n - 1), 0)
        when 'accumulate' then coalesce((select greatest(sum(prev.left_count), 0) from leftover prev where prev.n < cur.n), 0)
        else 0
      end)::integer as amount
    ) carry;
$$;

-- Υπόλοιπα όλων των ειδών Παροχής της Συμφωνίας για μία Περίοδο, ως JSON (χωρίς ποσά).
create function authz.period_balances(p_period uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind_id', k.id, 'code', k.code, 'label', k.label, 'unit', k.unit,
           'given', b.given, 'carried', b.carried, 'used', b.used, 'reserved', b.reserved, 'balance', b.balance
         ) order by k.sort, k.id), '[]'::jsonb)
    from public.provision_kinds k
    cross join lateral authz.period_balance(p_period, k.id) b
   where k.id in (
     select lp.kind_id
       from public.agreement_periods pe
       join public.agreement_lines l on l.agreement_id = pe.agreement_id
       join public.agreement_line_provisions lp on lp.line_id = l.id
      where pe.id = p_period
   );
$$;

-- Κάρτα Παραγωγής για λίστα και σελίδα. Ο Πελάτης βλέπει μόνο το όνομα του Υπευθύνου.
create function authz.production_card(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'client', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name) end,
    'period', case when pe.id is null then null
                   else jsonb_build_object('n', pe.n, 'starts', pe.starts, 'ends', pe.ends,
                                           'state', authz.period_state(pe.starts, pe.ends)) end,
    'owner', case when u.user_id is null then null
                  when authz.is_team_user() then jsonb_build_object('id', u.user_id, 'name', u.name)
                  else jsonb_build_object('name', u.name) end,
    'state', p.state,
    'isInternal', p.client_id is null
  )
  from public.productions p
  left join public.clients c on c.id = p.client_id
  left join public.agreement_periods pe on pe.id = p.period_id
  left join public.team_users u on u.user_id = p.owner_id
  where p.id = p_production;
$$;

-- Μέλη με το χέρι (ο Υπεύθυνος δεν μπαίνει εδώ· φαίνεται ως owner).
create function authz.production_members_json(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', u.user_id, 'name', u.name) order by lower(u.name), u.user_id), '[]'::jsonb)
    from public.production_members m
    join public.team_users u on u.user_id = m.user_id
   where m.production_id = p_production;
$$;

-- Ιστορικό από το Ίχνος (νεότερο πρώτο, έως 100). Διαβάζει το Ίχνος με security definer ΕΣΚΕΜΕΝΑ (παρακάμπτει το RLS του
-- audit_log)· καλείται μόνο για ομάδα. Κανένα ποσό ή κόστος δεν γράφεται στις οντότητες αυτές.
create function authz.production_history(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(h.entry order by h.at desc, h.id desc), '[]'::jsonb)
    from (
      select a.id, a.at, jsonb_build_object(
          'at', a.at, 'action', a.action, 'event', a.after ->> 'event',
          'actor_name', hu.name, 'before', a.before, 'after', a.after
        ) as entry
        from public.audit_log a
        left join public.team_users hu on hu.user_id = a.actor_id
       where a.entity in ('productions', 'production_members') and a.entity_id = p_production::text
       order by a.at desc, a.id desc
       limit 100
    ) h;
$$;

-- Τι μπορεί να κάνει ο Χρήστης στην Παραγωγή, με την κατάστασή της τώρα.
create function authz.production_viewer_can(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'deliver', p.state = 'open' and authz.can_manage_production(p.id),
    'reopen', p.state = 'delivered' and authz.can_manage_production(p.id),
    'cancel', p.state = 'open' and authz.can_manage_production(p.id) and not authz.production_has_work(p.id),
    'transfer', coalesce(authz.scope('productions.manage') = 'all', false),
    'members', authz.can_manage_production(p.id)
  )
  from public.productions p
  where p.id = p_production;
$$;

-- Τα στοιχεία της σελίδας πέρα από την κάρτα. Για Πελάτη: χωρίς Μέλη, Ιστορικό, σημειώσεις και ενέργειες.
create function authz.production_detail(p_production uuid, p_team boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'agreement', case when a.id is null then null else jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind) end,
    'balances', authz.period_balances(p.period_id),
    'deliveredAt', p.delivered_at,
    'deliveredNote', case when p_team then p.delivered_note end,
    'cancelledAt', p.cancelled_at,
    'cancelledReason', case when p_team then p.cancelled_reason end,
    'members', case when p_team then authz.production_members_json(p.id) else '[]'::jsonb end,
    'history', case when p_team then authz.production_history(p.id) else '[]'::jsonb end,
    'viewerCan', case when p_team then authz.production_viewer_can(p.id)
                      else jsonb_build_object('deliver', false, 'reopen', false, 'cancel', false, 'transfer', false, 'members', false) end
  )
  from public.productions p
  left join public.agreements a on a.id = p.agreement_id
  where p.id = p_production;
$$;

-- ───────────── Κανόνες (triggers, και για τον service role) ─────────────

-- Ίδιες στήλες ιχνηλασιμότητας με τα υπόλοιπα modules.
create trigger productions_stamp before insert or update on public.productions
  for each row execute function authz.stamp_equipment_row();

-- Σύνδεση Παραγωγής: Πελάτης της Συμφωνίας, Περίοδος της ίδιας Συμφωνίας, μηνιαία με Περίοδο, εφάπαξ χωρίς.
create function authz.guard_production_links() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
  v_client uuid;
begin
  if new.agreement_id is null then
    return new;
  end if;
  select a.kind, o.client_id into v_kind, v_client
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
   where a.id = new.agreement_id;
  if new.client_id is distinct from v_client then
    raise exception 'Ο Πελάτης της Παραγωγής δεν είναι της Συμφωνίας της' using errcode = 'P0001';
  end if;
  if v_kind = 'monthly' and new.period_id is null then
    raise exception 'Η μηνιαία Συμφωνία θέλει Περίοδο για κάθε Παραγωγή' using errcode = 'P0001';
  end if;
  if v_kind = 'one_off' and new.period_id is not null then
    raise exception 'Η εφάπαξ Συμφωνία δεν έχει Περιόδους' using errcode = 'P0001';
  end if;
  if new.period_id is not null and not exists (
    select 1 from public.agreement_periods pe where pe.id = new.period_id and pe.agreement_id = new.agreement_id
  ) then
    raise exception 'Η Περίοδος δεν ανήκει στη Συμφωνία της Παραγωγής' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger productions_links_guard before insert or update on public.productions
  for each row execute function authz.guard_production_links();

-- Παραγωγή δεν σβήνεται και δεν αλλάζει Πελάτη, Συμφωνία ή Περίοδο.
create function authz.guard_production_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Οι Παραγωγές δεν σβήνονται, ακυρώνονται' using errcode = 'P0001';
  end if;
  if new.client_id is distinct from old.client_id or new.agreement_id is distinct from old.agreement_id
     or new.period_id is distinct from old.period_id then
    raise exception 'Η Παραγωγή δεν αλλάζει Πελάτη, Συμφωνία ή Περίοδο' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger productions_change_guard before update or delete on public.productions
  for each row execute function authz.guard_production_change();

-- Περίοδοι και Παροχές τους δεν αλλάζουν ούτε σβήνονται ποτέ.
create function authz.guard_period_rows() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'Οι Περίοδοι και οι Παροχές τους δεν αλλάζουν' using errcode = 'P0001';
  return null;
end;
$$;

create trigger agreement_periods_immutable before update or delete on public.agreement_periods
  for each row execute function authz.guard_period_rows();
create trigger agreement_period_provisions_immutable before update or delete on public.agreement_period_provisions
  for each row execute function authz.guard_period_rows();

-- ───────────── Γέννηση: Περίοδοι και Παραγωγές ─────────────

-- Γεννά μία Παραγωγή (και γεγονός «created»). Η Περίοδος είναι null στην εφάπαξ.
create function authz.insert_production(
  p_agreement uuid, p_period uuid, p_client uuid, p_manager uuid, p_title text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.productions (title, client_id, agreement_id, period_id, owner_id)
  values (left(p_title, 300), p_client, p_agreement, p_period, authz.default_production_owner(p_manager))
  returning id into v_id;
  perform authz.production_event(v_id, 'created', '{}'::jsonb);
  return v_id;
end;
$$;

-- Μηνιαία Συμφωνία: μία Περίοδος ανά ημερολογιακό μήνα, Παροχές για όσες δίνουν, μία Παραγωγή ανά Περίοδο.
create function authz.agreement_materialize_periods(a public.agreements, p_client uuid, p_manager uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_period public.agreement_periods;
begin
  insert into public.agreement_periods (agreement_id, n, starts, ends, is_partial, gives_provisions)
  select a.id, r.n + 1, r.starts, r.ends, r.share < 1, r.gives_provisions
    from authz.agreement_period_rows(a.start_on, a.duration_months) r;

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
   where p.agreement_id = a.id and p.gives_provisions;

  for v_period in select p.* from public.agreement_periods p where p.agreement_id = a.id order by p.n loop
    perform authz.insert_production(a.id, v_period.id, p_client, p_manager,
      a.title || ' — ' || authz.greek_month_year(v_period.starts));
  end loop;
end;
$$;

-- Γεννά όλα όσα χρειάζεται η Συμφωνία που μόλις υπογράφηκε. Δεν κάνει τίποτα αν υπάρχουν ήδη (idempotent) ή αν είναι πρόταση.
-- Εφάπαξ: καμία Περίοδος, μία Παραγωγή. Μηνιαία: όλες οι Περίοδοι και όλες οι Παραγωγές μαζί.
create function authz.agreement_materialize(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_client uuid;
  v_manager uuid;
begin
  select * into a from public.agreements x where x.id = p_agreement;
  if not found or a.state = 'proposal' then
    return;
  end if;
  if exists (select 1 from public.agreement_periods pe where pe.agreement_id = p_agreement)
     or exists (select 1 from public.productions r where r.agreement_id = p_agreement) then
    return;
  end if;
  select o.client_id, o.manager_id into v_client, v_manager from public.opportunities o where o.id = a.opportunity_id;
  if a.kind = 'one_off' then
    perform authz.insert_production(p_agreement, null, v_client, v_manager, a.title);
    return;
  end if;
  perform authz.agreement_materialize_periods(a, v_client, v_manager);
end;
$$;

-- Trigger: η Συμφωνία παύει να είναι πρόταση (και στις δύο διαδρομές υπογραφής).
create function authz.agreement_signed_materialize() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.agreement_materialize(new.id);
  return null;
end;
$$;

create trigger agreements_materialize_on_sign after update of state on public.agreements
  for each row when (old.state = 'proposal' and new.state <> 'proposal')
  execute function authz.agreement_signed_materialize();

-- ───────────── Ίχνος ενεργειών ─────────────

create trigger agreement_periods_audit after insert or update or delete on public.agreement_periods
  for each row execute function authz.audit_row('id');
create trigger agreement_period_provisions_audit after insert or update or delete on public.agreement_period_provisions
  for each row execute function authz.audit_row('period_id');
create trigger productions_audit after insert or update or delete on public.productions
  for each row execute function authz.audit_row('id');
create trigger production_members_audit after insert or update or delete on public.production_members
  for each row execute function authz.audit_row('production_id');

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny). Προστέθηκαν οι τέσσερις πίνακες των Περιόδων και των Παραγωγών, χωρίς ποσά.
create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
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
    else false
  end;
$$;

-- ───────────── Ανάγνωση ─────────────

-- Λίστα Παραγωγών. Καταστάσεις: open, delivered, cancelled (null = όλες). p_internal: true μόνο Εσωτερικές, false μόνο των Πελατών.
create function public.productions_view(p_state text default null, p_internal boolean default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_list jsonb;
begin
  perform authz.require_production_viewer();
  if p_state is not null and p_state not in ('open', 'delivered', 'cancelled') then
    raise exception 'Άγνωστη κατάσταση Παραγωγής' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(authz.production_card(p.id) order by p.created_at desc, p.id), '[]'::jsonb)
    into v_list
    from public.productions p
   where authz.can_see_production(p.id)
     and (p_state is null or p.state = p_state)
     and (p_internal is null or (p.client_id is null) = p_internal);
  return v_list;
end;
$$;

-- Σελίδα Παραγωγής (G2): κάρτα, Συμφωνία, υπόλοιπα Περιόδου, Μέλη, ενέργειες και Ιστορικό.
create function public.production_view(p_production uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_team boolean := authz.is_team_user();
begin
  perform authz.require_production_viewer();
  perform authz.require_production(p_production);
  if not authz.can_see_production(p_production) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.production_card(p_production) || authz.production_detail(p_production, v_team);
end;
$$;

-- Υποψήφιοι Υπεύθυνοι (Π5): ενεργοί Χρήστες με Δικαίωμα Παραγωγών. Μόνο για Εύρος «όλα», όσοι μπορούν να μεταβιβάσουν.
create function public.productions_owner_candidates() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('productions.manage');
  if coalesce(authz.scope('productions.manage'), '') <> 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', u.user_id, 'name', u.name) order by lower(u.name), u.user_id), '[]'::jsonb)
      from public.team_users u
     where u.is_active and authz.user_scope(u.user_id, 'productions.manage') is not null
  );
end;
$$;

-- Υποψήφια Μέλη (Π6): όλοι οι ενεργοί Χρήστες ομάδας. Για όσους μπορούν να αλλάξουν Μέλη (Εύρος «όλα» ή «όσα με αφορούν»).
create function public.productions_member_candidates() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('productions.manage');
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', u.user_id, 'name', u.name) order by lower(u.name), u.user_id), '[]'::jsonb)
      from public.team_users u
     where u.is_active
  );
end;
$$;

-- ───────────── Εγγραφή ─────────────

-- Εσωτερική Παραγωγή (Π9): μόνο όποιος έχει Δικαίωμα Παραγωγών με Εύρος «όλα».
create function public.production_create_internal(p_title text, p_owner_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_id uuid;
begin
  perform authz.require('productions.manage');
  if coalesce(authz.scope('productions.manage'), '') <> 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if length(v_title) = 0 then
    raise exception 'Η Παραγωγή θέλει τίτλο' using errcode = 'P0001';
  end if;
  if length(v_title) > 300 then
    raise exception 'Ο τίτλος της Παραγωγής είναι πολύ μεγάλος' using errcode = 'P0001';
  end if;
  perform authz.check_production_owner(p_owner_id);
  insert into public.productions (title, owner_id) values (v_title, p_owner_id) returning id into v_id;
  perform authz.production_event(v_id, 'created', '{}'::jsonb);
  return v_id;
end;
$$;

-- Χειροκίνητη παράδοση (Π8). Το σχόλιο είναι υποχρεωτικό.
create function public.production_deliver(p_production uuid, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_state text;
begin
  perform authz.production_writable(p_production);
  if v_note is null then
    raise exception 'Η παράδοση θέλει σχόλιο: τι παραδόθηκε και πού' using errcode = 'P0001';
  end if;
  select p.state into v_state from public.productions p where p.id = p_production for update;
  if v_state <> 'open' then
    raise exception 'Η Παραγωγή δεν είναι ανοιχτή' using errcode = 'P0001';
  end if;
  update public.productions p
     set state = 'delivered', delivered_at = now(), delivered_by = auth.uid(), delivered_note = v_note
   where p.id = p_production;
  perform authz.production_event(p_production, 'delivered', jsonb_build_object('note', v_note));
end;
$$;

-- Επανάνοιξη με λόγο. Καθαρίζει τα στοιχεία της παράδοσης (μένουν στο Ίχνος).
create function public.production_reopen(p_production uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.production_writable(p_production);
  if v_reason is null then
    raise exception 'Η επανάνοιξη θέλει λόγο' using errcode = 'P0001';
  end if;
  select p.state into v_state from public.productions p where p.id = p_production for update;
  if v_state <> 'delivered' then
    raise exception 'Η Παραγωγή δεν είναι παραδομένη' using errcode = 'P0001';
  end if;
  update public.productions p
     set state = 'open', delivered_at = null, delivered_by = null, delivered_note = null
   where p.id = p_production;
  perform authz.production_event(p_production, 'reopened', jsonb_build_object('reason', v_reason));
end;
$$;

-- Ακύρωση με λόγο, μόνο όσο δεν έγινε δουλειά (Π8).
create function public.production_cancel(p_production uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.production_writable(p_production);
  if v_reason is null then
    raise exception 'Η ακύρωση θέλει λόγο' using errcode = 'P0001';
  end if;
  select p.state into v_state from public.productions p where p.id = p_production for update;
  if v_state <> 'open' then
    raise exception 'Μόνο ανοιχτή Παραγωγή ακυρώνεται' using errcode = 'P0001';
  end if;
  if authz.production_has_work(p_production) then
    raise exception 'Η Παραγωγή έχει δουλειά και δεν ακυρώνεται' using errcode = 'P0001';
  end if;
  update public.productions p
     set state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancelled_reason = v_reason
   where p.id = p_production;
  perform authz.production_event(p_production, 'cancelled', jsonb_build_object('reason', v_reason));
end;
$$;

-- Μεταβίβαση Υπευθύνου (Π5): μόνο με Εύρος «όλα», προς Χρήστη με Δικαίωμα Παραγωγών.
create function public.production_transfer(p_production uuid, p_owner_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_from uuid;
begin
  perform authz.require('productions.manage');
  if coalesce(authz.scope('productions.manage'), '') <> 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require_production(p_production);
  if p_owner_id is null then
    raise exception 'Η μεταβίβαση θέλει Υπεύθυνο' using errcode = 'P0001';
  end if;
  perform authz.check_production_owner(p_owner_id);
  select p.owner_id into v_from from public.productions p where p.id = p_production for update;
  if v_from is not distinct from p_owner_id then
    raise exception 'Η Παραγωγή έχει ήδη αυτόν τον Υπεύθυνο' using errcode = 'P0001';
  end if;
  update public.productions p set owner_id = p_owner_id where p.id = p_production;
  delete from public.production_members m where m.production_id = p_production and m.user_id = p_owner_id;
  perform authz.production_event(p_production, 'owner_transferred', jsonb_build_object('from', v_from, 'to', p_owner_id));
end;
$$;

-- Προσθήκη Μέλους με το χέρι. Ο Υπεύθυνος είναι ήδη Μέλος.
create function public.production_member_add(p_production uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.production_writable(p_production);
  if p_user_id is null or not authz.user_is_team(p_user_id) then
    raise exception 'Ο Χρήστης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.productions p where p.id = p_production and p.owner_id = p_user_id) then
    raise exception 'Ο Υπεύθυνος είναι ήδη μέλος της Παραγωγής' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.production_members m where m.production_id = p_production and m.user_id = p_user_id) then
    raise exception 'Ο Χρήστης είναι ήδη μέλος της Παραγωγής' using errcode = 'P0001';
  end if;
  insert into public.production_members (production_id, user_id, added_by) values (p_production, p_user_id, auth.uid());
  perform authz.production_event(p_production, 'member_added', jsonb_build_object('user_id', p_user_id));
end;
$$;

-- Αφαίρεση Μέλους: η πρόσβαση κόβεται με την επόμενη ανάγνωση. Ο Υπεύθυνος δεν αφαιρείται εδώ.
create function public.production_member_remove(p_production uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.production_writable(p_production);
  if p_user_id is not null and exists (select 1 from public.productions p where p.id = p_production and p.owner_id = p_user_id) then
    raise exception 'Ο Υπεύθυνος δεν αφαιρείται· μεταβίβασε πρώτα την Παραγωγή' using errcode = 'P0001';
  end if;
  delete from public.production_members m where m.production_id = p_production and m.user_id = p_user_id;
  if not found then
    raise exception 'Ο Χρήστης δεν είναι μέλος της Παραγωγής' using errcode = 'P0001';
  end if;
  perform authz.production_event(p_production, 'member_removed', jsonb_build_object('user_id', p_user_id));
end;
$$;

-- ───────────── Υπάρχουσες Συμφωνίες ─────────────

-- Όσες Συμφωνίες είναι ήδη υπογεγραμμένες ή ενεργές παίρνουν τις Περιόδους και τις Παραγωγές τους (idempotent).
do $$
declare
  v_agreement uuid;
begin
  for v_agreement in select a.id from public.agreements a where a.state in ('signed', 'active') loop
    perform authz.agreement_materialize(v_agreement);
  end loop;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Καμία συνάρτηση δεν καλείται από ανώνυμο ή συνδεδεμένο Χρήστη χωρίς τον έλεγχο στο σώμα της. Πρώτα κλείνουν όλες.
revoke all on function
  authz.period_provision_used(uuid, uuid),
  authz.period_provision_reserved(uuid, uuid),
  authz.production_has_work(uuid),
  authz.client_user_client_id(),
  authz.period_state(date, date),
  authz.greek_month_year(date),
  authz.default_production_owner(uuid),
  authz.is_production_participant(uuid),
  authz.can_see_production(uuid),
  authz.can_manage_production(uuid),
  authz.require_production_viewer(),
  authz.require_production(uuid),
  authz.production_writable(uuid),
  authz.check_production_owner(uuid),
  authz.production_event(uuid, text, jsonb),
  authz.period_balance(uuid, uuid),
  authz.period_balances(uuid),
  authz.production_card(uuid),
  authz.production_members_json(uuid),
  authz.production_history(uuid),
  authz.production_viewer_can(uuid),
  authz.production_detail(uuid, boolean),
  authz.guard_production_links(),
  authz.guard_production_change(),
  authz.guard_period_rows(),
  authz.insert_production(uuid, uuid, uuid, uuid, text),
  authz.agreement_materialize_periods(public.agreements, uuid, uuid),
  authz.agreement_materialize(uuid),
  authz.agreement_signed_materialize(),
  public.productions_view(text, boolean),
  public.production_view(uuid),
  public.production_create_internal(text, uuid),
  public.production_deliver(uuid, text),
  public.production_reopen(uuid, text),
  public.production_cancel(uuid, text),
  public.production_transfer(uuid, uuid),
  public.production_member_add(uuid, uuid),
  public.production_member_remove(uuid, uuid),
  public.productions_owner_candidates(),
  public.productions_member_candidates()
  from public, anon, authenticated;

grant execute on function
  public.productions_view(text, boolean),
  public.production_view(uuid),
  public.production_create_internal(text, uuid),
  public.production_deliver(uuid, text),
  public.production_reopen(uuid, text),
  public.production_cancel(uuid, text),
  public.production_transfer(uuid, uuid),
  public.production_member_add(uuid, uuid),
  public.production_member_remove(uuid, uuid),
  public.productions_owner_candidates(),
  public.productions_member_candidates()
  to authenticated;

-- Οι πίνακες είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table
  public.agreement_periods, public.agreement_period_provisions, public.productions, public.production_members
  from anon, authenticated;

-- ───────────── Σύνδεσμος Παραγωγής στο D (Συμφωνία, ανά Περίοδο) ─────────────

-- Ξαναγράφεται η public.agreement_view (της 20261009100000) μόνο για να φέρει production_id σε κάθε Περίοδο.
-- Η μόνη αλλαγή είναι η γραμμή 'production_id' στο πλάνο των Περιόδων· το υπόλοιπο σώμα είναι το ίδιο.
-- Το CREATE OR REPLACE κρατά τα Δικαιώματα εκτέλεσης που έχει ήδη.
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
      into v_periods from authz.agreement_period_rows(v_period_start, a.duration_months) p;
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
