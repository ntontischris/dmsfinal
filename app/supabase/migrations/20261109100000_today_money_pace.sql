-- Σήμερα ως ενημέρωση, κομμάτι 3 (#241 Σ4): δίκαιος ρυθμός του μήνα στο today_money (εγκρίθηκε από τον Ιδιοκτήτη).
--
-- «Περιμένουμε τον μήνα» = το ποσό (μετά τα Πιστωτικά) όλων των Τιμολογίων που λήγουν μέσα στον τρέχοντα μήνα της Αθήνας,
-- πληρωμένων ή όχι. «Μπήκαν» = το εξοφλημένο μέρος των ΙΔΙΩΝ Τιμολογίων (κατανομή του authz.invoice_standings). Έτσι το
-- «μπήκαν» δεν ξεπερνά ποτέ το «περιμένουμε», και το παλιό ληξιπρόθεσμο χρέος δεν μπαίνει στον ρυθμό: μένει μόνο στο σύνολο
-- των ληξιπρόθεσμων από πάνω. Χωρίς Τιμολόγια που λήγουν τον μήνα: expected 0 (η εφαρμογή λέει «δεν λήγει κανένα»).
-- Το «πού θα έπρεπε να είμαστε» = μέρα του μήνα / μέρες του μήνα (την υπολογίζει η εφαρμογή από τα day και days).
-- Τα υπόλοιπα πεδία μένουν ίδια με το 20261108100000_today_briefing.sql.
create or replace function authz.today_money(p_uid uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Athens')::date;
  v_first date := date_trunc('month', (p_now at time zone 'Europe/Athens'))::date;
  v_last date := (date_trunc('month', (p_now at time zone 'Europe/Athens')) + interval '1 month - 1 day')::date;
  v_collected numeric;
  v_expected numeric;
begin
  if not authz.today_finance_all(p_uid, null) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(sum(s.paid), 0), coalesce(sum(s.owed), 0) into v_collected, v_expected
    from authz.invoice_standings(null, v_today) s
    join public.invoices i on i.id = s.invoice_id
   where i.kind <> 'credit' and i.due_date between v_first and v_last;
  return (
    with o as (
      select i.client_id, c.name, s.remaining, i.due_date
        from authz.invoice_standings(null, v_today) s
        join public.invoices i on i.id = s.invoice_id
        join public.clients c on c.id = i.client_id
       where s.status = 'overdue'
    ), d as (
      select o.client_id, o.name, sum(o.remaining) as amount, (v_today - min(o.due_date))::integer as days
        from o group by o.client_id, o.name
    )
    select jsonb_build_object(
      'overdue_cents', (select coalesce(round(sum(o.remaining) * 100), 0)::bigint from o),
      'overdue_count', (select count(*)::integer from o),
      'client_count', (select count(distinct o.client_id)::integer from o),
      'debtors', coalesce((
        select jsonb_agg(jsonb_build_object('client_id', x.client_id, 'name', x.name,
                                            'amount_cents', round(x.amount * 100)::bigint, 'days', x.days,
                                            'link', '/app/finance/ledger?client=' || x.client_id)
                         order by x.amount desc, x.name, x.client_id)
          from (select * from d order by d.amount desc, d.name, d.client_id limit 3) x), '[]'::jsonb),
      'month', jsonb_build_object(
        'month', extract(month from v_today)::integer,
        'day', extract(day from v_today)::integer,
        'days', extract(day from v_last)::integer,
        'collected_cents', round(v_collected * 100)::bigint,
        'expected_cents', round(v_expected * 100)::bigint))
  );
end;
$$;

revoke all on function authz.today_money(uuid, timestamptz) from public, anon, authenticated;
