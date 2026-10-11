-- Τιμολογητέα (Iβ, #151): ό,τι πρέπει να τιμολογηθεί, γεννιέται αυτόματα από Περιόδους, δόσεις, έξτρα και ρήτρα λύσης.
-- Δεν είναι οφειλή· ο πελάτης δεν τα βλέπει (BP07). Αρχές: πίνακας κλειστός (RLS χωρίς policies)· γραμμές δεν διαγράφονται·
-- η γεννήτρια είναι idempotent και τρέχει μόνο με service_role (cron)· τα ποσά μόνο με finance.amounts.
-- Η κάλυψη από Τιμολόγια μπαίνει στο Iγ· εδώ authz.billable_covered είναι κενή (όλα ανοιχτά).

create table public.billables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  agreement_id uuid not null references public.agreements (id),
  reason text not null check (reason in ('period', 'milestone', 'extra_deliverable', 'extra_revision', 'extra_filming', 'dissolution_fee')),
  -- Η πηγή: Περίοδος, δόση, Παραδοτέο, αίτημα, Γύρισμα ή η ίδια η Συμφωνία (ρήτρα λύσης).
  source_id uuid not null,
  label text not null check (length(trim(label)) > 0 and length(label) <= 300),
  billable_on date not null,
  net numeric(12, 2) not null check (net > 0 and net < 10000000),
  created_at timestamptz not null default now(),
  unique (reason, source_id)
);

create index billables_client_idx on public.billables (client_id, billable_on);
create index billables_agreement_idx on public.billables (agreement_id);

alter table public.billables enable row level security;
revoke all on table public.billables from anon, authenticated;

create trigger billables_audit_insert after insert on public.billables
  for each row execute function authz.audit_row('id');

-- ───────────── Βοηθητικές ─────────────

create function authz.greek_month(p_day date) returns text
language sql immutable set search_path = ''
as $$
  select (array['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
                'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'])[extract(month from p_day)::integer]
         || ' ' || to_char(p_day, 'YYYY');
$$;

create function authz.milestone_text(p_trigger text) returns text
language sql immutable set search_path = ''
as $$
  select case p_trigger
    when 'signature' then 'υπογραφής'
    when 'date' then 'ημερομηνίας'
    when 'filming_done' then 'μετά το Γύρισμα'
    when 'delivered' then 'παράδοσης'
  end;
$$;

-- Το ορόσημο έχει συμβεί. signature: η γεννήτρια φιλτράρει πρώτα τις υπογεγραμμένες Συμφωνίες.
create function authz.milestone_reached(p_agreement uuid, p_trigger text, p_due date, p_today date) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_trigger
    when 'signature' then true
    when 'date' then p_due <= p_today
    when 'filming_done' then exists (
      select 1 from public.filmings f join public.productions pr on pr.id = f.production_id
       where pr.agreement_id = p_agreement and f.state = 'done')
    when 'delivered' then exists (
      select 1 from public.productions pr where pr.agreement_id = p_agreement and pr.state = 'delivered')
    else false
  end;
$$;

-- Τιμή μίας μονάδας έξτρα Παροχής: γραμμή Υπηρεσίας (όχι Πακέτο) της Συμφωνίας που δίνει ΜΟΝΟ αυτή την Παροχή,
-- τιμή ÷ ποσότητα Παροχής ανά μονάδα γραμμής· αλλιώς η μοναδική Υπηρεσία Καταλόγου που δίνει μόνο αυτή την Παροχή.
-- Αλλιώς null: δεν γεννιέται Τιμολογητέο (ασαφής τιμή).
create function authz.billable_extra_price(p_agreement uuid, p_kind uuid) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select round(la.unit_price / lp.quantity, 2)
       from public.agreement_lines l
       join public.agreement_line_provisions lp on lp.line_id = l.id and lp.kind_id = p_kind
       join public.agreement_line_amounts la on la.line_id = l.id
      where l.agreement_id = p_agreement and l.line_kind = 'service'
        and not exists (select 1 from public.agreement_line_provisions o where o.line_id = l.id and o.kind_id <> p_kind)
      order by l.position
      limit 1),
    (select case when count(*) = 1 then round(min(ca.price / cp.quantity), 2) end
       from public.catalogue_items ci
       join public.catalogue_item_amounts ca on ca.item_id = ci.id
       join public.catalogue_item_provisions cp on cp.item_id = ci.id and cp.kind_id = p_kind
      where ci.kind = 'service' and ci.retired_at is null
        and not exists (select 1 from public.catalogue_item_provisions o where o.item_id = ci.id and o.kind_id <> p_kind))
  );
$$;

-- ───────────── Γεννήτριες (κάθε μία: idempotent, επιστρέφει πόσα γράφτηκαν) ─────────────

create function authz.billables_from_periods(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select o.client_id, a.id, 'period', p.id, 'Περίοδος ' || authz.greek_month(p.starts), p_today, x.net
      from public.agreements a
      join public.opportunities o on o.id = a.opportunity_id
      join public.agreement_periods p on p.agreement_id = a.id
      cross join lateral (select round(authz.production_period_price(a.id, p.id), 2) as net) x
     where a.kind = 'monthly' and a.state in ('signed', 'active', 'expired')
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

create function authz.billables_from_milestones(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select o.client_id, a.id, 'milestone', m.id,
           'Δόση ' || authz.milestone_text(m.trigger) || ' '
             || trim(trailing '.' from trim(trailing '0' from m.percent::text)) || '%',
           p_today, x.net
      from public.agreement_milestones m
      join public.agreements a on a.id = m.agreement_id and a.kind = 'one_off' and a.state in ('signed', 'active', 'expired')
      join public.opportunities o on o.id = a.opportunity_id
      cross join lateral authz.agreement_figures(a.id) f
      -- Η τελευταία δόση παίρνει το υπόλοιπο, ώστε οι δόσεις να αθροίζουν ακριβώς την τιμή (χωρίς λεπτά από στρογγύλεμα).
      cross join lateral (select case
          when m.position = (select max(m2.position) from public.agreement_milestones m2 where m2.agreement_id = a.id)
            then round(f.price * (select sum(m3.percent) from public.agreement_milestones m3 where m3.agreement_id = a.id) / 100, 2)
                 - coalesce((select sum(round(f.price * m4.percent / 100, 2)) from public.agreement_milestones m4
                              where m4.agreement_id = a.id and m4.position <> m.position), 0)
          else round(f.price * m.percent / 100, 2) end as net) x
     where authz.milestone_reached(a.id, m.trigger, m.due_on, p_today)
       and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

create function authz.billables_from_extra_deliverables(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_deliverable', d.id, 'Έξτρα Παραδοτέο · ' || d.title, p_today, x.net
      from public.deliverables d
      join public.productions pr on pr.id = d.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired')
      cross join lateral (select authz.billable_extra_price(a.id, d.kind_id) as net) x
     where d.charge = 'charged' and d.cancelled_at is null and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

create function authz.billables_from_extra_revisions(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_revision', r.id, 'Έξτρα αναθεώρηση · ' || d.title, p_today, x.net
      from public.deliverable_requests r
      join public.deliverables d on d.id = r.deliverable_id
      join public.productions pr on pr.id = d.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired')
      cross join lateral (select authz.billable_extra_price(a.id, d.kind_id) as net) x
     where r.decision = 'charged' and d.cancelled_at is null and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

-- Έξτρα Γύρισμα: μόνο όταν η Παροχή μετράει ανά Γύρισμα (μία μονάδα = ένα Γύρισμα). Ανά ώρα ή ημέρα η μονάδα δεν είναι καθαρή.
create function authz.billables_from_extra_filmings(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_filming', f.id, 'Έξτρα Γύρισμα · ' || k.label, p_today, x.net
      from public.filmings f
      join public.productions pr on pr.id = f.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired')
      join public.provision_kinds k on k.id = f.kind_id and k.measure = 'per_filming'
      cross join lateral (select authz.billable_extra_price(a.id, f.kind_id) as net) x
     where f.is_extra and f.state = 'done' and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

create function authz.billables_from_dissolution(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select o.client_id, a.id, 'dissolution_fee', a.id, 'Ρήτρα λύσης', p_today, am.dissolution_fee
      from public.agreements a
      join public.opportunities o on o.id = a.opportunity_id
      join public.agreement_amounts am on am.agreement_id = a.id
     where a.state = 'dissolved' and am.dissolution_fee > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

-- Η ουρά αποφάσεων χρέωσης ακολουθεί την ίδια την απόφαση (Π2): finance.amounts αντί για finance.cost.
-- Είναι λίστα όλων των Παραγωγών, άρα θέλει Εύρος «όλα» (οι Πωλήσεις βλέπουν ποσά μόνο «με αφορά»).
create or replace function public.deliverables_pending_charges() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(authz.deliverable_card(d.id) order by d.created_at, d.id), '[]'::jsonb)
      from public.deliverables d
      join public.productions p on p.id = d.production_id
     where d.charge = 'pending' and d.cancelled_at is null and p.state = 'open'
  );
end;
$$;

-- Το cron (service_role) καλεί τη γεννήτρια πριν από τον worker. Επιστρέφει πόσα Τιμολογητέα γράφτηκαν.
-- Λυμένη Συμφωνία: μόνο η ρήτρα της. Καμία ροή δεν βάζει ακόμη 'dissolved'· όταν μπει η Λύση (με ημερομηνία),
-- οι γεννήτριες πρέπει να δέχονται και Περιόδους/έξτρα πριν από τη λύση.
create function public.billables_generate() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
begin
  return authz.billables_from_periods(v_today)
    + authz.billables_from_milestones(v_today)
    + authz.billables_from_extra_deliverables(v_today)
    + authz.billables_from_extra_revisions(v_today)
    + authz.billables_from_extra_filmings(v_today)
    + authz.billables_from_dissolution(v_today);
end;
$$;

-- ───────────── Κάλυψη (hook για το Iγ) και μέρες υπενθύμισης ─────────────

-- Το Iγ θα επιστρέφει εδώ την κάλυψη από Τιμολόγια. Ως τότε όλα είναι ανοιχτά.
create function authz.billable_covered(p_client uuid) returns table (billable_id uuid, covered numeric)
language sql stable security definer set search_path = ''
as $$
  select cast(null as uuid), cast(null as numeric) where false;
$$;

-- Σταθερό {7, 14} προς το παρόν· το K θα το αντικαταστήσει με ρύθμιση.
create function authz.billable_reminder_days() returns integer[]
language sql immutable set search_path = ''
as $$ select array[7, 14]; $$;

-- Ανοιχτά Τιμολογητέα με τα ονόματα Πελάτη και Συμφωνίας, και τις μέρες που είναι ανοιχτά.
create function authz.billables_open(p_today date)
returns table (
  id uuid, client_id uuid, client_name text, agreement_id uuid, agreement_title text, reason text, label text,
  billable_on date, net numeric, open_amount numeric, days_open integer
)
language sql stable security definer set search_path = ''
as $$
  select b.id, b.client_id, c.name, b.agreement_id, a.title, b.reason, b.label, b.billable_on, b.net,
         b.net - coalesce(cov.covered, 0), (p_today - b.billable_on)::integer
    from public.billables b
    join public.clients c on c.id = b.client_id
    join public.agreements a on a.id = b.agreement_id
    left join lateral authz.billable_covered(b.client_id) cov on cov.billable_id = b.id
   where b.net - coalesce(cov.covered, 0) > 0;
$$;

-- ───────────── Ανάγνωση «Προς τιμολόγηση» (I1) ─────────────
-- Θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· αλλιώς 42501, πριν από οτιδήποτε άλλο.

create function public.billables_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  return (
    with items as (
      select o.client_id, o.client_name, o.days_open, o.open_amount, o.billable_on, o.id,
             jsonb_build_object(
               'id', o.id, 'billableOn', o.billable_on, 'agreementId', o.agreement_id,
               'agreementTitle', o.agreement_title, 'reason', o.reason, 'label', o.label,
               'net', o.net, 'open', o.open_amount, 'daysOpen', o.days_open,
               'reminders', (select coalesce(jsonb_agg(d order by d), '[]'::jsonb)
                               from unnest(authz.billable_reminder_days()) d
                              where o.days_open >= d)
             ) as item
        from authz.billables_open(v_today) o
    ), grouped as (
      select i.client_id, i.client_name, sum(i.open_amount) as open_total, count(*) as item_count,
             max(i.days_open) as oldest_days, jsonb_agg(i.item order by i.billable_on, i.id) as items
        from items i
       group by i.client_id, i.client_name
    )
    select jsonb_build_object(
      'total', coalesce(sum(g.open_total), 0),
      'count', coalesce(sum(g.item_count), 0),
      'clients', coalesce(jsonb_agg(jsonb_build_object(
          'clientId', g.client_id, 'clientName', g.client_name, 'open', g.open_total, 'count', g.item_count,
          'oldestDays', g.oldest_days, 'beyond', 0, 'items', g.items)
        order by g.oldest_days desc, g.client_name), '[]'::jsonb)
    )
      from grouped g
  );
end;
$$;

-- ───────────── Ίχνος και χρέωση Παραδοτέων ─────────────
-- Το Ίχνος των ποσών: ο πίνακας billables μπαίνει στη λίστα του audit (παρακάτω).
-- Η απόφαση «χρεώνεται» θέλει «Βλέπει ποσά» (finance.amounts), όχι «Βλέπει κόστος» (finance.cost).

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
    when 'billables' then authz.has('finance.amounts')
    else false
  end;
$$;

create or replace function authz.deliverable_viewer_can(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_state text := authz.deliverable_state(p_deliverable);
  v_work boolean := authz.deliverable_in_scope(p_deliverable, 'deliverables.work');
  v_review boolean := authz.deliverable_in_scope(p_deliverable, 'deliverables.review');
  v_internal boolean;
  v_open boolean;
  v_pending boolean;
begin
  select p.client_id is null, p.state = 'open' into v_internal, v_open
    from public.deliverables d join public.productions p on p.id = d.production_id
   where d.id = p_deliverable;
  v_pending := exists (select 1 from public.deliverables d where d.id = p_deliverable and d.charge = 'pending');
  return jsonb_build_object(
    'addVersion', coalesce(v_open, false) and v_work and v_state not in ('approved', 'cancelled'),
    'send', coalesce(v_open, false) and v_review and v_state = 'in_review' and not coalesce(v_internal, true),
    'return', coalesce(v_open, false) and v_review and v_state = 'in_review',
    'approveInternal', coalesce(v_open, false) and v_review and coalesce(v_internal, false) and v_state = 'in_review',
    'cancel', coalesce(v_open, false) and v_work and v_state not in ('approved', 'cancelled'),
    'comment', coalesce(v_open, false) and v_work and v_state not in ('draft', 'cancelled'),
    'decideCharge', authz.has('finance.amounts') and v_pending and coalesce(v_open, false) and v_state <> 'cancelled',
    'edit', coalesce(v_open, false) and v_work and v_state <> 'cancelled'
  );
end;
$$;

create or replace function public.deliverable_charge_decide(p_id uuid, p_charge text, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_charge text;
begin
  perform authz.deliverable_gate(p_id, 'finance.amounts');
  perform authz.require_deliverable_open(p_id);
  select d.charge into v_charge from public.deliverables d where d.id = p_id for update;
  if authz.deliverable_state(p_id) = 'cancelled' then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if v_charge <> 'pending' then
    raise exception 'Η χρέωση έχει ήδη αποφασιστεί' using errcode = 'P0001';
  end if;
  if p_charge not in ('charged', 'free') then
    raise exception 'Η χρέωση θέλει «χρεώνεται» ή «χωρίς χρέωση»' using errcode = 'P0001';
  end if;
  if p_charge = 'free' and v_reason is null then
    raise exception 'Το «χωρίς χρέωση» θέλει λόγο' using errcode = 'P0001';
  end if;
  update public.deliverables d
     set charge = p_charge, charge_reason = case when p_charge = 'free' then v_reason end
   where d.id = p_id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.greek_month(date), authz.milestone_text(text), authz.milestone_reached(uuid, text, date, date),
  authz.billable_extra_price(uuid, uuid), authz.billables_from_periods(date), authz.billables_from_milestones(date),
  authz.billables_from_extra_deliverables(date), authz.billables_from_extra_revisions(date),
  authz.billables_from_extra_filmings(date), authz.billables_from_dissolution(date),
  authz.billable_covered(uuid), authz.billable_reminder_days(), authz.billables_open(date)
  from public, anon, authenticated;

revoke all on function public.billables_generate(), public.billables_view() from public, anon, authenticated;
grant execute on function public.billables_view() to authenticated;
grant execute on function public.billables_generate() to service_role;
