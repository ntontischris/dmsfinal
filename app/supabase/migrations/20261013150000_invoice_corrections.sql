-- Διορθώσεις, ακύρωση και Ίχνος Τιμολογίων, Ετοιμότητα Οικονομικών, Iε #154.
-- Κεφ. 7 (Τιμολόγια και Εισπράξεις), Δέσμη I: Π8 (διόρθωση στοιχείων), Π9 (ακύρωση καταχώρισης).
--
-- Αρχές:
--  • Διόρθωση και ακύρωση θέλουν «Καταχωρεί Τιμολόγια». Ο έλεγχος Δικαιώματος γίνεται ΠΡΩΤΑ (42501, χωρίς oracle ύπαρξης).
--  • Καμία από τις δύο δεν στέλνει email. Λάθος μέσα στο ίδιο το Τιμολόγιο διορθώνεται με Πιστωτικό.
--  • Το Ίχνος γράφει παλιό → νέο: μία γραμμή 'event' με τον λόγο και τη λίστα αλλαγών, πέρα από τη γραμμή του trigger.
--  • Η κάλυψη των Τιμολογητέων και η κατανομή των Εισπράξεων υπολογίζονται· όλες οι όψεις εξαιρούν ήδη τα ακυρωμένα.
--  • Πολλά μερικά Πιστωτικά επιτρέπονται ως το σύνολο του Τιμολογίου, και μετά τη διόρθωση ποσού.

-- ───────────── Ίχνος ─────────────

-- Οι αλλαγές ανά πεδίο (παλιό → νέο) μεταξύ δύο γραμμών Τιμολογίου.
create function authz.invoice_changes(p_before jsonb, p_after jsonb) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('field', f.name, 'from', p_before -> f.col, 'to', p_after -> f.col)
                            order by f.o), '[]'::jsonb)
    from (values
      (1, 'number', 'number'), (2, 'issueDate', 'issue_date'), (3, 'dueDate', 'due_date'), (4, 'net', 'net'),
      (5, 'vat', 'vat'), (6, 'total', 'total'), (7, 'mark', 'mark')
    ) as f (o, name, col)
   where p_before -> f.col is distinct from p_after -> f.col;
$$;

-- Γραμμή Ίχνους για διόρθωση ή ακύρωση: παλιά γραμμή, νέα γραμμή, λόγος και αλλαγές.
create function authz.invoice_event(p_id uuid, p_event text, p_before jsonb, p_after jsonb, p_reason text, p_changes jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (
    auth.uid(), 'event', 'invoices', p_id::text, p_before,
    jsonb_build_object('event', p_event, 'reason', p_reason, 'changes', p_changes) || p_after
  );
end;
$$;

-- ───────────── Διόρθωση στοιχείων (Π8) ─────────────

-- Διορθώνει τα στοιχεία της καταχώρισης. p: { number, issueDate, dueDate, net, vat, total, mark } (όσα λείπουν μένουν όπως ήταν).
-- Ο λόγος είναι προαιρετικός. Το Πιστωτικό δεν έχει λήξη και μένει εντός του συνόλου του Τιμολογίου που διορθώνει.
create function public.invoice_correct(p_id uuid, p jsonb, p_reason text default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_before public.invoices;
  v_after public.invoices;
  v_number text;
  v_issue date;
  v_due date;
  v_net numeric;
  v_vat numeric;
  v_total numeric;
  v_mark text;
  v_target public.invoices;
  v_credited numeric;
  v_changes jsonb;
begin
  perform authz.require('finance.invoices');
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'Ο λόγος έχει έως 500 χαρακτήρες' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p) is distinct from 'object' then
    raise exception 'Τα στοιχεία της διόρθωσης δεν είναι έγκυρα' using errcode = 'P0001';
  end if;
  select i.* into v_before from public.invoices i where i.id = p_id for update;
  if not found then
    raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_before.voided_at is not null then
    raise exception 'Η καταχώριση είναι ακυρωμένη και δεν διορθώνεται' using errcode = 'P0001';
  end if;
  begin
    v_number := case when p ? 'number' then btrim(coalesce(p ->> 'number', '')) else v_before.number end;
    v_issue := case when p ? 'issueDate' then nullif(p ->> 'issueDate', '')::date else v_before.issue_date end;
    v_due := case when p ? 'dueDate' then nullif(p ->> 'dueDate', '')::date else v_before.due_date end;
    v_net := case when p ? 'net' then round(nullif(p ->> 'net', '')::numeric, 2) else v_before.net end;
    v_vat := case when p ? 'vat' then round(nullif(p ->> 'vat', '')::numeric, 2) else v_before.vat end;
    v_total := case when p ? 'total' then round(nullif(p ->> 'total', '')::numeric, 2) else v_before.total end;
    v_mark := case when p ? 'mark' then nullif(btrim(coalesce(p ->> 'mark', '')), '') else v_before.mark end;
  exception when others then
    raise exception 'Τα στοιχεία της διόρθωσης δεν είναι έγκυρα. Έλεγξε τα πεδία.' using errcode = 'P0001';
  end;
  if char_length(v_number) not between 1 and 40 then
    raise exception 'Γράψε αριθμό από 1 έως 40 χαρακτήρες' using errcode = 'P0001';
  end if;
  if v_issue is null then
    raise exception 'Γράψε την ημερομηνία έκδοσης' using errcode = 'P0001';
  end if;
  if v_net is null or v_vat is null or v_total is null
     or v_net < 0 or v_vat < 0 or v_total <= 0 or v_net >= 10000000 or v_vat >= 10000000 or v_total >= 10000000 then
    raise exception 'Γράψε καθαρό, ΦΠΑ και σύνολο σε ευρώ (το σύνολο μεγαλύτερο από 0)' using errcode = 'P0001';
  end if;
  if v_mark is not null and v_mark !~ '^[0-9]{1,20}$' then
    raise exception 'Ο ΜΑΡΚ έχει μόνο ψηφία (έως 20)' using errcode = 'P0001';
  end if;
  if v_before.kind = 'credit' then
    if v_due is not null then
      raise exception 'Το πιστωτικό δεν έχει λήξη' using errcode = 'P0001';
    end if;
    select t.* into v_target from public.invoices t where t.id = v_before.credit_for for update;
    select coalesce(sum(c.total), 0) into v_credited
      from public.invoices c where c.credit_for = v_target.id and c.voided_at is null and c.id <> p_id;
    if v_credited + v_total > v_target.total then
      raise exception 'Τα πιστωτικά ξεπερνούν το σύνολο του Τιμολογίου %', v_target.number using errcode = 'P0001';
    end if;
  else
    if v_due is null then
      raise exception 'Γράψε τη λήξη' using errcode = 'P0001';
    end if;
    if v_due < v_issue then
      raise exception 'Η λήξη δεν μπορεί να είναι πριν από την έκδοση' using errcode = 'P0001';
    end if;
    select coalesce(sum(c.total), 0) into v_credited
      from public.invoices c where c.credit_for = p_id and c.voided_at is null;
    if v_total < v_credited then
      raise exception 'Το σύνολο δεν μπορεί να γίνει μικρότερο από τα πιστωτικά του Τιμολογίου' using errcode = 'P0001';
    end if;
  end if;
  if (v_number, v_issue, v_due, v_net, v_vat, v_total, v_mark)
     is not distinct from (v_before.number, v_before.issue_date, v_before.due_date, v_before.net, v_before.vat,
                           v_before.total, v_before.mark) then
    raise exception 'Δεν άλλαξε τίποτα στην καταχώριση' using errcode = 'P0001';
  end if;
  update public.invoices i
     set number = v_number, issue_date = v_issue, due_date = v_due, net = v_net, vat = v_vat, total = v_total, mark = v_mark
   where i.id = p_id
  returning i.* into v_after;
  v_changes := authz.invoice_changes(to_jsonb(v_before), to_jsonb(v_after));
  perform authz.invoice_event(p_id, 'corrected', to_jsonb(v_before), to_jsonb(v_after), v_reason, v_changes);
end;
$$;

-- ───────────── Ακύρωση καταχώρισης (Π9) ─────────────

-- Ακυρώνει την καταχώριση με λόγο (υποχρεωτικός). Φεύγει από Καρτέλα, σύνολα και πελάτη· Τιμολογητέα και Εισπράξεις
-- ξαναμοιράζονται μόνα τους (υπολογισμός). Τιμολόγιο με μη ακυρωμένα Πιστωτικά δεν ακυρώνεται πριν από αυτά.
create function public.invoice_void(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text;
  v_before public.invoices;
  v_after public.invoices;
begin
  perform authz.require('finance.invoices');
  v_reason := authz.receipt_reason(p_reason);
  select i.* into v_before from public.invoices i where i.id = p_id for update;
  if not found then
    raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_before.voided_at is not null then
    raise exception 'Η καταχώριση είναι ήδη ακυρωμένη' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.invoices c where c.credit_for = p_id and c.voided_at is null) then
    raise exception 'Ακύρωσε πρώτα τα πιστωτικά του' using errcode = 'P0001';
  end if;
  update public.invoices i
     set voided_at = now(), voided_by = auth.uid(), void_reason = v_reason
   where i.id = p_id
  returning i.* into v_after;
  -- Τα email που περιμένουν ακόμα (π.χ. PDF σε λάθος Πελάτη) δεν φεύγουν.
  update public.email_outbox o
     set status = 'cancelled', handled_at = now()
   where o.status = 'pending' and o.kind in ('invoice_registered', 'invoice_overdue')
     and o.payload ->> 'invoiceId' = p_id::text;
  perform authz.invoice_event(p_id, 'voided', to_jsonb(v_before), to_jsonb(v_after), v_reason, '[]'::jsonb);
end;
$$;

-- ───────────── I3 με ?invoice= ─────────────

-- { id, kind, number, issueDate, dueDate, net, vat, total, mark, clientId, clientName, creditFor, creditForNumber,
--   voided: { at, by, reason } | null, trail: [{ at, byName, action, changes: [{ field, from, to }], reason }],
--   can: { correct, void } }
-- Το Ίχνος (registered | corrected | voided, παλαιότερο πρώτα) το βλέπει μόνο όποιος έχει «Βλέπει ίχνος ενεργειών»· αλλιώς [].
create function public.invoice_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select jsonb_build_object(
           'id', i.id, 'kind', i.kind, 'number', i.number, 'issueDate', i.issue_date, 'dueDate', i.due_date,
           'net', i.net, 'vat', i.vat, 'total', i.total, 'mark', i.mark,
           'clientId', i.client_id, 'clientName', c.name,
           'creditFor', i.credit_for, 'creditForNumber', orig.number,
           'voided', case when i.voided_at is null then null
                          else jsonb_build_object('at', i.voided_at, 'by', vu.name, 'reason', i.void_reason) end,
           'trail', case when authz.has('audit.view') then coalesce((
                      select jsonb_agg(jsonb_build_object(
                               'at', a.at, 'byName', au.name,
                               'action', case when a.action = 'insert' then 'registered' else a.after ->> 'event' end,
                               'changes', coalesce(a.after -> 'changes', '[]'::jsonb),
                               'reason', a.after ->> 'reason'
                             ) order by a.at, a.id)
                        from public.audit_log a
                        left join public.team_users au on au.user_id = a.actor_id
                       where a.entity = 'invoices' and a.entity_id = i.id::text and a.action in ('insert', 'event')
                    ), '[]'::jsonb) else '[]'::jsonb end,
           'can', jsonb_build_object(
             'correct', i.voided_at is null and authz.has('finance.invoices'),
             'void', i.voided_at is null and authz.has('finance.invoices'))
         )
    into v_result
    from public.invoices i
    join public.clients c on c.id = i.client_id
    left join public.invoices orig on orig.id = i.credit_for
    left join public.team_users vu on vu.user_id = i.voided_by
   where i.id = p_id;
  if v_result is null then
    raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_result;
end;
$$;

-- ───────────── I2: Ακυρωμένες καταχωρίσεις ─────────────

-- [{ id, number, kind, clientName, issueDate, total, voidedAt, voidedBy, reason }], νεότερη ακύρωση πρώτα. Μόνο για την ομάδα.
create function public.invoices_voided_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'number', i.number, 'kind', i.kind, 'clientName', c.name, 'issueDate', i.issue_date,
             'total', i.total, 'voidedAt', i.voided_at, 'voidedBy', vu.name, 'reason', i.void_reason
           ) order by i.voided_at desc, i.id)
      from public.invoices i
      join public.clients c on c.id = i.client_id
      left join public.team_users vu on vu.user_id = i.voided_by
     where i.voided_at is not null
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Ετοιμότητα ─────────────

-- Ίδιος ορισμός με το 20261010120000_booking.sql· προστίθεται η γραμμή «payment_methods» (Οικονομικά): τουλάχιστον ένας
-- ενεργός Τρόπος είσπραξης. Η γραμμή «costs» μένει όπως είναι (Κόστος ώρας).
create or replace function authz.readiness_items()
returns table (item text, done boolean, note text)
language sql stable security definer set search_path = ''
as $$
  with c as (select * from public.company_settings where id)
  select 'company_details', (
           c.legal_name <> '' and c.trade_name <> '' and c.address <> '' and c.phone <> ''
           and c.email <> '' and c.signatory_name <> '' and c.signatory_title <> ''), null::text
    from c
  union all
  select 'tax_details', (c.tax_id <> '' and c.tax_office <> '' and c.gemi <> ''), null from c
  union all
  select 'bank_account', exists (select 1 from public.bank_accounts b where b.is_default and b.retired_at is null), null
  union all
  select 'logo', false, 'module:files'
  union all
  select 'booking_hours', exists (select 1 from public.filming_settings s where s.id and s.booking_hours_set_at is not null), 'module:filming'
  union all
  select 'catalogue', (
           exists (select 1 from public.catalogue_items i where i.retired_at is null)
           and not exists (
             select 1
               from public.catalogue_items i
               join public.catalogue_item_amounts a on a.item_id = i.id
              where i.retired_at is null and a.price <= 0)), null
  union all
  select 'costs', coalesce((
           select m.expenses_total > 0 from public.cost_months m
            where m.month <= authz.athens_month_start()
            order by m.month desc limit 1), false), null
  union all
  select 'payment_methods', exists (select 1 from public.payment_methods m where m.retired_at is null), null
  union all
  select 'knowledge', false, 'module:knowledge'
  union all
  select 'legal_texts', exists (select 1 from public.readiness_confirmations r where r.item = 'legal_texts'), 'confirm'
  union all
  select 'identity_values', exists (select 1 from public.readiness_confirmations r where r.item = 'identity_values'), 'confirm'
  union all
  select 'automation_texts', false, 'module:automations';
$$;

-- ───────────── Ληξιπρόθεσμα: χωρίς παραλήπτη δεν κλείνει η ειδοποίηση ─────────────

-- Ίδιος ορισμός με το 20261013140000_ledger.sql· η γραμμή στο invoice_overdue_notices γράφεται μόνο αν υπάρχει τουλάχιστον ένας
-- Χρήστης πελάτη με c.finance (και email). Αν προστεθεί αργότερα, θα πάρει την ειδοποίηση στην επόμενη εκτέλεση.
create or replace function public.invoice_overdue_enqueue(p_now timestamptz default null) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_today date := (v_now at time zone 'Europe/Athens')::date;
  v_row record;
  v_payment jsonb;
  v_count integer := 0;
begin
  if extract(hour from v_now at time zone 'Europe/Athens') < 9 then
    return 0;
  end if;
  v_payment := (select jsonb_build_object('holder', b.holder, 'bank', b.bank_name, 'iban', b.iban)
                  from public.bank_accounts b where b.is_default and b.retired_at is null limit 1);
  for v_row in
    select s.invoice_id, s.client_id, s.remaining, i.number, i.due_date
      from authz.invoice_standings(null, v_today) s
      join public.invoices i on i.id = s.invoice_id
     where s.status = 'overdue'
       and not exists (select 1 from public.invoice_overdue_notices n where n.invoice_id = s.invoice_id)
     order by i.due_date, i.id
  loop
    continue when not exists (
      select 1
        from public.client_users cu
        join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.finance'
        join auth.users u on u.id = cu.user_id
       where cu.client_id = v_row.client_id and cu.removed_at is null and coalesce(u.email, '') <> ''
    );
    insert into public.invoice_overdue_notices (invoice_id) values (v_row.invoice_id)
    on conflict do nothing;
    continue when not found;
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    select 'invoice_overdue', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'),
           jsonb_strip_nulls(jsonb_build_object(
             'invoiceId', v_row.invoice_id, 'number', v_row.number, 'dueDate', v_row.due_date,
             'remaining', v_row.remaining, 'payment', v_payment))
      from public.client_users cu
      join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.finance'
      join auth.users u on u.id = cu.user_id
      left join public.team_users t on t.user_id = cu.user_id
     where cu.client_id = v_row.client_id and cu.removed_at is null and coalesce(u.email, '') <> '';
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.invoice_changes(jsonb, jsonb), authz.invoice_event(uuid, text, jsonb, jsonb, text, jsonb)
  from public, anon, authenticated;

revoke all on function
  public.invoice_correct(uuid, jsonb, text), public.invoice_void(uuid, text), public.invoice_detail(uuid),
  public.invoices_voided_view()
  from public, anon;

grant execute on function
  public.invoice_correct(uuid, jsonb, text), public.invoice_void(uuid, text), public.invoice_detail(uuid),
  public.invoices_voided_view()
  to authenticated;
