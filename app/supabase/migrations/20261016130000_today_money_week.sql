-- Σήμερα Σδ (#183): οι κάρτες «Τα χρήματα» και «Η εβδομάδα».
--
--  • Μόνο γραμμές στο μητρώο (public.today_cards) και δικές τους συναρτήσεις, κατά τη σύμβαση του 20261016100000_today.sql.
--    Καμία κοινή συνάρτηση δεν ξαναγράφεται.
--  • Δικαίωμα και Εύρος κάθε κάρτας = ό,τι φρουρεί τη σελίδα-ουρά της:
--      rounds_over_limit  H1 «Αποφάσεις χρέωσης» (deliverables_pending_charges): Παραδοτέα (work ή review) και
--                         «Βλέπει ποσά» με Εύρος «όλα».
--      to_invoice         I1 (billables_view): «Βλέπει Οικονομικά» και «Βλέπει ποσά» με Εύρος «όλα».
--      overdue_invoices   I2 με φίλτρο «overdue» (invoices_view): ίδιο με το I1.
--      cost_hours         G3 (production_costs_view): «Βλέπει κόστος».
--      week_filming       E1 (filmings_view): «Βλέπει Γυρίσματα», με το Εύρος του (authz.can_see_filming, για δοσμένο Χρήστη).
--  • Επείγον (κανόνας 5): Τιμολογητέο 14 ημερών και πάνω, κάθε ληξιπρόθεσμο, Υπέρβαση κόστους, προθεσμία Παραδοτέου σε
--    έως 1 μέρα ή περασμένη. Τα Γυρίσματα της εβδομάδας δεν είναι επείγοντα.
--  • Ποσά μόνο όπου η ουρά τα δείχνει, άρα μόνο με «Βλέπει ποσά» (to_invoice, overdue_invoices).
--  • «Σήμερα» = η ημέρα Αθήνας του p_now.

-- ───────────── Βοηθητικά ─────────────

-- I1 και I2: «Βλέπει Οικονομικά» και «Βλέπει ποσά» με Εύρος «όλα», μόνο για κάρτα ομάδας.
create function authz.today_finance_all(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_client is null
     and authz.user_scope(p_uid, 'finance.view') is not null
     and authz.user_scope(p_uid, 'finance.amounts') is not distinct from 'all';
$$;

-- H1 «Αποφάσεις χρέωσης»: η σελίδα θέλει Παραδοτέα (work ή review), η λίστα «Βλέπει ποσά» με Εύρος «όλα».
create function authz.today_charges_allowed(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_client is null
     and (authz.user_scope(p_uid, 'deliverables.work') is not null
          or authz.user_scope(p_uid, 'deliverables.review') is not null)
     and authz.user_scope(p_uid, 'finance.amounts') is not distinct from 'all';
$$;

create function authz.today_days_text(p_days integer) returns text
language sql immutable set search_path = ''
as $$ select case when p_days = 1 then '1 μέρα' else p_days || ' μέρες' end; $$;

-- ───────────── Κάρτα «Γύροι πέρα από το όριο» (H1, αποφάσεις χρέωσης) ─────────────

-- Ό,τι δείχνει η ουρά αποφάσεων χρέωσης: «χρεώνεται;» σε ανοιχτή Παραγωγή, μη ακυρωμένο.
create function authz.today_pending_charges(p_now timestamptz)
returns table (id uuid, title text, subtitle text, deadline date, urgent boolean, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select d.id, d.title, concat_ws(' · ', c.name, p.title), d.deadline,
         coalesce(d.deadline <= (p_now at time zone 'Europe/Athens')::date + 1, false), d.created_at
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    left join public.clients c on c.id = p.client_id
   where d.charge = 'pending' and d.cancelled_at is null and p.state = 'open';
$$;

create function authz.today_count_rounds_over_limit(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_charges_allowed(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_pending_charges(p_now));
end;
$$;

create function authz.today_items_rounds_over_limit(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_charges_allowed(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', null,
                                        'urgent', r.urgent, 'link', '/app/deliverables/' || r.id)
                     order by r.urgent desc, r.deadline nulls last, r.created_at, r.id)
      from (select * from authz.today_pending_charges(p_now) x
             order by x.urgent desc, x.deadline nulls last, x.created_at, x.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Προς τιμολόγηση» (I1) ─────────────

create function authz.today_count_to_invoice(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_finance_all(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.billables_open((p_now at time zone 'Europe/Athens')::date));
end;
$$;

-- Ανά Πελάτη, όπως η ουρά: το παλαιότερο πρώτο. Επείγον όταν το παλαιότερο είναι 14 ημερών και πάνω.
create function authz.today_items_to_invoice(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_finance_all(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', g.client_id, 'title', g.client_name,
             'subtitle', case when g.n = 1 then '1 Τιμολογητέο' else g.n || ' Τιμολογητέα' end
                         || ' · το παλαιότερο ' || authz.today_days_text(g.oldest),
             'at', null, 'urgent', g.oldest >= 14, 'amount_cents', round(g.open_total * 100)::bigint,
             'link', '/app/finance/to-invoice')
           order by g.oldest desc, g.client_name, g.client_id)
      from (select o.client_id, o.client_name, count(*)::integer as n, max(o.days_open) as oldest,
                   sum(o.open_amount) as open_total
              from authz.billables_open((p_now at time zone 'Europe/Athens')::date) o
             group by o.client_id, o.client_name
             order by max(o.days_open) desc, o.client_name, o.client_id
             limit 3) g),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Ληξιπρόθεσμα Τιμολόγια» (I2, φίλτρο overdue) ─────────────

create function authz.today_overdue(p_now timestamptz)
returns table (id uuid, client_name text, number text, due_date date, remaining numeric, days integer)
language sql stable security definer set search_path = ''
as $$
  select i.id, c.name, i.number, i.due_date, s.remaining,
         ((p_now at time zone 'Europe/Athens')::date - i.due_date)::integer
    from authz.invoice_standings(null, (p_now at time zone 'Europe/Athens')::date) s
    join public.invoices i on i.id = s.invoice_id
    join public.clients c on c.id = i.client_id
   where s.status = 'overdue';
$$;

create function authz.today_count_overdue_invoices(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_finance_all(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_overdue(p_now));
end;
$$;

-- Όλα επείγοντα· πρώτο όποιο έληξε νωρίτερα.
create function authz.today_items_overdue_invoices(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_finance_all(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', o.id, 'title', o.client_name || ', ' || o.number,
             'subtitle', 'έληξε πριν από ' || authz.today_days_text(o.days),
             'at', null, 'urgent', true, 'amount_cents', round(o.remaining * 100)::bigint,
             'link', '/app/finance/invoices/' || o.id)
           order by o.due_date, o.number, o.id)
      from (select * from authz.today_overdue(p_now) x order by x.due_date, x.number, x.id limit 3) o),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Ώρες και Υπέρβαση κόστους» (G3) ─────────────

-- Οι Παραγωγές των ομάδων «Θέλουν πραγματικές ώρες» και «Υπέρβαση» της G3 (μη ακυρωμένες).
create function authz.today_cost_rows()
returns table (id uuid, title text, client text, grp text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select x.id, x.cost_row ->> 'title', x.cost_row ->> 'client', authz.production_cost_group(x.cost_row), x.created_at
    from (select p.id, p.created_at, authz.production_cost_row(p.id) as cost_row
            from public.productions p
           where p.state <> 'cancelled') x
   where authz.production_cost_group(x.cost_row) in ('needs_hours', 'overrun');
$$;

create function authz.today_count_cost_hours(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'finance.cost') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_cost_rows());
end;
$$;

-- Πρώτα οι Υπερβάσεις (επείγουσες), μετά όσες θέλουν ώρες· οι νεότερες πρώτα, όπως η G3.
create function authz.today_items_cost_hours(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'finance.cost') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id,
             'title', case when r.grp = 'overrun' then 'Υπέρβαση: ' else 'Θέλει πραγματικές ώρες: ' end || r.title,
             'subtitle', r.client, 'at', null, 'urgent', r.grp = 'overrun',
             'link', '/app/productions/costs?group=' || r.grp)
           order by r.grp = 'overrun' desc, r.created_at desc, r.id)
      from (select * from authz.today_cost_rows() x
             order by x.grp = 'overrun' desc, x.created_at desc, x.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Γυρίσματα των επόμενων 7 ημερών» (E1) ─────────────

-- Ανοιχτά Γυρίσματα από σήμερα ως και σε 6 μέρες (Αθήνα) που βλέπει ο Χρήστης. Ίδιος κανόνας με το
-- authz.can_see_filming (ομάδα), για δοσμένο Χρήστη: Εύρος «όλα», ή «με αφορά» = Συνεργείο, Υπεύθυνος ή Μέλος της
-- Παραγωγής, Υπεύθυνος του Πελάτη.
create function authz.today_week_filmings(p_uid uuid, p_now timestamptz)
returns table (id uuid, title text, state text, starts_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with v as (
    select authz.user_scope(p_uid, 'filming.view') as scope, (p_now at time zone 'Europe/Athens')::date as today
  )
  select f.id, concat_ws(', ', coalesce(c.name, p.title), f.location), f.state, f.starts_at
    from public.filmings f
    cross join v
    join public.productions p on p.id = f.production_id
    left join public.clients c on c.id = f.client_id
   where f.state in ('pending', 'scheduled')
     and (f.starts_at at time zone 'Europe/Athens')::date between v.today and v.today + 6
     and (v.scope = 'all'
          or (v.scope = 'mine'
              and (p.owner_id = p_uid
                   or exists (select 1 from public.production_members m where m.production_id = p.id and m.user_id = p_uid)
                   or exists (select 1 from public.filming_crew fc where fc.filming_id = f.id and fc.user_id = p_uid)
                   or c.manager_id = p_uid)));
$$;

create function authz.today_count_week_filming(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.view') is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_week_filmings(p_uid, p_now));
end;
$$;

create function authz.today_items_week_filming(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.view') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', w.id, 'title', w.title,
             'subtitle', case when w.state = 'pending' then 'αναμένει έγκριση' end,
             'at', w.starts_at, 'urgent', false, 'link', '/app/filming/' || w.id)
           order by w.starts_at, w.id)
      from (select * from authz.today_week_filmings(p_uid, p_now) x order by x.starts_at, x.id limit 3) w),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('rounds_over_limit', 'money', 'action', 'team', 310, 'Γύροι πέρα από το όριο', 'Rounds over the limit',
   '/app/deliverables',
   'authz.today_count_rounds_over_limit(uuid, uuid, timestamptz)', 'authz.today_items_rounds_over_limit(uuid, uuid, timestamptz)'),
  ('to_invoice', 'money', 'action', 'team', 320, 'Προς τιμολόγηση', 'To invoice', '/app/finance/to-invoice',
   'authz.today_count_to_invoice(uuid, uuid, timestamptz)', 'authz.today_items_to_invoice(uuid, uuid, timestamptz)'),
  ('overdue_invoices', 'money', 'action', 'team', 330, 'Ληξιπρόθεσμα Τιμολόγια', 'Overdue invoices',
   '/app/finance/invoices?filter=overdue',
   'authz.today_count_overdue_invoices(uuid, uuid, timestamptz)', 'authz.today_items_overdue_invoices(uuid, uuid, timestamptz)'),
  ('cost_hours', 'money', 'action', 'team', 340, 'Ώρες και Υπέρβαση κόστους', 'Hours and cost overrun',
   '/app/productions/costs',
   'authz.today_count_cost_hours(uuid, uuid, timestamptz)', 'authz.today_items_cost_hours(uuid, uuid, timestamptz)'),
  ('week_filming', 'week', 'week', 'team', 510, 'Γυρίσματα των επόμενων 7 ημερών', 'Filmings in the next 7 days',
   '/app/filming',
   'authz.today_count_week_filming(uuid, uuid, timestamptz)', 'authz.today_items_week_filming(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_finance_all(uuid, uuid), authz.today_charges_allowed(uuid, uuid), authz.today_days_text(integer),
  authz.today_pending_charges(timestamptz),
  authz.today_count_rounds_over_limit(uuid, uuid, timestamptz), authz.today_items_rounds_over_limit(uuid, uuid, timestamptz),
  authz.today_count_to_invoice(uuid, uuid, timestamptz), authz.today_items_to_invoice(uuid, uuid, timestamptz),
  authz.today_overdue(timestamptz),
  authz.today_count_overdue_invoices(uuid, uuid, timestamptz), authz.today_items_overdue_invoices(uuid, uuid, timestamptz),
  authz.today_cost_rows(),
  authz.today_count_cost_hours(uuid, uuid, timestamptz), authz.today_items_cost_hours(uuid, uuid, timestamptz),
  authz.today_week_filmings(uuid, timestamptz),
  authz.today_count_week_filming(uuid, uuid, timestamptz), authz.today_items_week_filming(uuid, uuid, timestamptz)
  from public, anon, authenticated;
