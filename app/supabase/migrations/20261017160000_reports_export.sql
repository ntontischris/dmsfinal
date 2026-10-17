-- Αναφορές Ργ (#200) και Ρδ (#201): Εξαγωγή δεδομένων (M2), Εξαγωγή κάθε Αναφοράς της M1, Ιστορικό εξαγωγών και
-- Πακέτο λογιστή. Κεφ. 2 «Αναφορές: λεπτομέρειες κανόνων» (Εξαγωγή M2, Πακέτο λογιστή, Ίχνος), Δέσμη Ρ (Ρ6–Ρ8).
--
-- Αρχές:
--  • Καμία νέα αποθήκευση: ο server δίνει μόνο γραμμές· τα αρχεία (.xlsx, .csv, .zip) φτιάχνονται στον browser (Ρ6).
--  • Κάθε εξαγωγή θέλει «Εξάγει δεδομένα» (reports.export) ΚΑΙ το «Βλέπει» της πηγής (Ρ7): Τιμολόγια, Εισπράξεις,
--    Τιμολογητέα, Καρτέλες → finance.view· Πελάτες → clients.view (με το Εύρος του)· Συμφωνίες → agreements.view (με το
--    Εύρος του)· Έξοδα → finance.cost. Αλλιώς 42501. Η Κερδοφορία δεν εξάγεται ακόμα: η I7 δεν υπάρχει.
--  • Ποσά όπως στις οθόνες: οικονομικά ποσά μόνο με «Βλέπει ποσά» Εύρος «όλα» (όπως η I2, η Καρτέλα και οι Αναφορές)·
--    Συμφωνίες με «Βλέπει ποσά» (όπως η D1)· Έξοδα με «Βλέπει κόστος» (όπως η G3). Αλλιώς οι στήλες ποσών είναι null.
--  • Ίχνος πριν από τα δεδομένα (Ρ7): το RPC υπολογίζει τις γραμμές, γράφει στο audit_log (ποιος, τι, φίλτρα, γραμμές,
--    μορφή) και ΜΕΤΑ τις επιστρέφει, στην ίδια συναλλαγή. entity = 'report_exports', entity_id = ο Χρήστης.
--  • Ιστορικό εξαγωγών: ολόκληρο για όποιον «Βλέπει ίχνος ενεργειών» (Ιδιοκτήτης, Διαχείριση), αλλιώς μόνο τα δικά του,
--    μέσω RPC: το audit_log μένει κλειστό.
--  • Εξαγωγή Αναφοράς (M1): γενική. Καλεί το ίδιο το public.report_* RPC της Αναφοράς (που ελέγχει τα δικά του
--    Δικαιώματα, Ρ1) με τα ίδια φίλτρα, γράφει Ίχνος και επιστρέφει το JSON του. Νέες Αναφορές (Ρβ) δεν αλλάζουν αυτό το αρχείο.
--  • Πακέτο λογιστή (Ρ8): Τιμολόγια και Εισπράξεις ενός μήνα, με τη διαδρομή του PDF μόνο για όποιον κατεβάζει PDF
--    (finance.view + «Βλέπει ποσά» «όλα», όπως η invoice_pdf_path). Τα signed URLs τα φτιάχνει ο server (service role,
--    finance/invoice-storage) ΜΟΝΟ για τις διαδρομές που έδωσε αυτό το RPC.
--  • Το p_today των authz.export_* υπάρχει για τα τεστ με σταθερές ημερομηνίες· τα public RPC δίνουν σήμερα ώρα Ελλάδας.

-- ───────────── Πρόσβαση ─────────────

create function authz.export_require() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(authz.has('reports.export'), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Τα σύνολα δεδομένων, με τη σειρά της M2.
create function authz.export_dataset_codes() returns text[]
language sql immutable set search_path = ''
as $$ select array['invoices', 'receipts', 'billables', 'ledgers', 'clients', 'agreements', 'expenses']; $$;

-- Βλέπει ο Χρήστης την πηγή του συνόλου; (Ρ7)
create function authz.export_dataset_allowed(p_dataset text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(case p_dataset
    when 'invoices' then authz.has('finance.view')
    when 'receipts' then authz.has('finance.view')
    when 'billables' then authz.has('finance.view')
    when 'ledgers' then authz.has('finance.view')
    when 'clients' then authz.has('clients.view')
    when 'agreements' then authz.has('agreements.view')
    when 'expenses' then authz.has('finance.cost')
  end, false);
$$;

-- Πελάτες και Συμφωνίες εξάγονται ολόκληρα (όσα βλέπει ο Χρήστης), χωρίς Περίοδο.
create function authz.export_dataset_uses_period(p_dataset text) returns boolean
language sql immutable set search_path = ''
as $$ select p_dataset not in ('clients', 'agreements'); $$;

-- Ποσά όπως η οθόνη της πηγής.
create function authz.export_dataset_amounts(p_dataset text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_dataset = 'agreements' then coalesce(authz.has('finance.amounts'), false)
    when p_dataset = 'expenses' then coalesce(authz.has('finance.cost'), false)
    else authz.scope('finance.amounts') is not distinct from 'all'
  end;
$$;

create function authz.export_check_format(p_format text) returns void
language plpgsql immutable set search_path = ''
as $$
begin
  if p_format is null or p_format not in ('xlsx', 'csv') then
    raise exception 'Άγνωστη μορφή αρχείου' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Ίχνος ─────────────

-- Μία γραμμή στο Ίχνος για κάθε εξαγωγή. Χωρίς ποσά: μόνο τι, με ποια φίλτρα, πόσες γραμμές, σε ποια μορφή.
create function authz.export_log(p_kind text, p_subject text, p_filters jsonb, p_rows integer, p_format text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'report_exports', auth.uid()::text,
          jsonb_build_object('event', 'exported', 'kind', p_kind, 'subject', p_subject,
                             'filters', coalesce(p_filters, '{}'::jsonb), 'rows', p_rows, 'format', p_format));
end;
$$;

-- ───────────── Γραμμές των συνόλων ─────────────

-- Τα μη ακυρωμένα Τιμολόγια με έκδοση από p_from ως p_to, με κατάσταση και υπόλοιπο από το authz.invoice_standings.
-- p_pdf: προσθέτει id και pdfPath (για το Πακέτο λογιστή· pdfPath μόνο με ποσά, όπως η invoice_pdf_path).
create function authz.export_invoice_rows(p_from date, p_to date, p_today date, p_amounts boolean, p_pdf boolean)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'number', i.number,
           'kind', case i.kind when 'invoice' then 'Τιμολόγιο' when 'receipt' then 'Απόδειξη' else 'Πιστωτικό' end,
           'clientName', c.name, 'clientAfm', c.afm,
           'issueDate', i.issue_date, 'dueDate', i.due_date,
           'net', case when p_amounts then i.net end,
           'vat', case when p_amounts then i.vat end,
           'total', case when p_amounts then i.total end,
           'remaining', case when p_amounts and i.kind <> 'credit' then s.remaining end,
           'status', case s.status when 'paid' then 'Εξοφλημένο' when 'partial' then 'Μερικώς εξοφλημένο'
                                   when 'overdue' then 'Ληξιπρόθεσμο' when 'unpaid' then 'Ανεξόφλητο' else 'Πιστωτικό' end,
           'creditFor', orig.number, 'mark', i.mark
         ) || case when p_pdf then jsonb_build_object('id', i.id, 'pdfPath', case when p_amounts then i.pdf_path end)
                   else '{}'::jsonb end
         order by i.issue_date, i.created_at, i.id), '[]'::jsonb)
    from authz.invoice_standings(null, p_today) s
    join public.invoices i on i.id = s.invoice_id
    join public.clients c on c.id = i.client_id
    left join public.invoices orig on orig.id = i.credit_for
   where i.issue_date between p_from and p_to;
$$;

-- Οι μη διαγραμμένες Εισπράξεις (με ΦΠΑ) με ημερομηνία από p_from ως p_to.
create function authz.export_receipt_rows(p_from date, p_to date, p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'receivedOn', r.received_on, 'clientName', c.name, 'clientAfm', c.afm,
           'amount', case when p_amounts then r.amount end,
           'method', m.label, 'note', nullif(r.note, '')
         ) order by r.received_on, r.created_at, r.id), '[]'::jsonb)
    from public.receipts r
    join public.clients c on c.id = r.client_id
    join public.payment_methods m on m.id = r.method_id
   where r.deleted_at is null and r.received_on between p_from and p_to;
$$;

-- Τα Τιμολογητέα της Περιόδου, με την κάλυψή τους από Τιμολόγια (ίδια με την I1).
create function authz.export_billable_rows(p_from date, p_to date, p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'billableOn', b.billable_on, 'clientName', c.name, 'agreementTitle', a.title,
           'reason', case b.reason when 'period' then 'Περίοδος' when 'milestone' then 'Δόση'
                                   when 'extra_deliverable' then 'Έξτρα Παραδοτέο' when 'extra_revision' then 'Έξτρα αναθεώρηση'
                                   when 'extra_filming' then 'Έξτρα Γύρισμα' else 'Ρήτρα λύσης' end,
           'label', b.label,
           'net', case when p_amounts then b.net end,
           'covered', case when p_amounts then coalesce(cov.covered, 0) end,
           'open', case when p_amounts then b.net - coalesce(cov.covered, 0) end,
           'state', case when b.net - coalesce(cov.covered, 0) > 0 then 'Προς τιμολόγηση' else 'Τιμολογήθηκε' end
         ) order by b.billable_on, c.name, b.created_at, b.id), '[]'::jsonb)
    from public.billables b
    join public.clients c on c.id = b.client_id
    join public.agreements a on a.id = b.agreement_id
    left join lateral authz.billable_covered(b.client_id) cov on cov.billable_id = b.id
   where b.billable_on between p_from and p_to;
$$;

-- Οι Καρτέλες όλων των Πελατών: οι κινήσεις της Περιόδου με το υπόλοιπο μετά από κάθε κίνηση (από την αρχή),
-- ίδιες κινήσεις και ίδια σειρά με την client_ledger_view.
create function authz.export_ledger_rows(p_from date, p_to date, p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with moves as (
    select i.client_id, i.issue_date as d,
           case i.kind when 'invoice' then 'Τιμολόγιο ' when 'receipt' then 'Απόδειξη ' else 'Πιστωτικό ' end || i.number as label,
           case when i.kind = 'credit' then 0::numeric else i.total end as debit,
           case when i.kind = 'credit' then i.total else 0::numeric end as credit,
           i.created_at, i.id
      from public.invoices i
     where i.voided_at is null
    union all
    select r.client_id, r.received_on,
           case when r.note <> '' then 'Είσπραξη (' || r.note || ')' else 'Είσπραξη' end,
           0::numeric, r.amount, r.created_at, r.id
      from public.receipts r
     where r.deleted_at is null
  ), run as (
    select m.*,
           sum(m.debit - m.credit) over (
             partition by m.client_id
             order by m.d, case when m.debit > 0 then 0 else 1 end, m.created_at, m.id
             rows between unbounded preceding and current row) as running
      from moves m
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'clientName', c.name, 'clientAfm', c.afm, 'date', r.d, 'label', r.label,
           'debit', case when p_amounts then r.debit end,
           'credit', case when p_amounts then r.credit end,
           'balance', case when p_amounts then r.running end
         ) order by c.name, c.id, r.d, case when r.debit > 0 then 0 else 1 end, r.created_at, r.id), '[]'::jsonb)
    from run r
    join public.clients c on c.id = r.client_id
   where r.d between p_from and p_to;
$$;

-- Οι Πελάτες που βλέπει ο Χρήστης (Εύρος, ADR 0007), χωρίς τους συγχωνευμένους.
create function authz.export_client_rows() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', c.name, 'legalName', nullif(c.legal_name, ''), 'afm', c.afm, 'city', nullif(c.city, ''),
           'contactName', c.contact_name, 'contactEmail', c.contact_email, 'contactPhone', nullif(c.contact_phone, ''),
           'managerName', u.name,
           'status', case when c.archived_at is null then 'Ενεργός' else 'Αρχειοθετημένος' end,
           'createdOn', (c.created_at at time zone 'Europe/Athens')::date
         ) order by c.name, c.id), '[]'::jsonb)
    from public.clients c
    left join public.team_users u on u.user_id = c.manager_id
   where c.merged_into_id is null and authz.can_see_client(c.id, c.manager_id);
$$;

-- Οι Συμφωνίες που βλέπει ο Χρήστης με «Βλέπει Συμφωνίες» (Εύρος). Τιμή = η τιμή της D1 (μηνιαία ή εφάπαξ).
create function authz.export_agreement_rows(p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'clientName', c.name, 'title', a.title,
           'kind', case a.kind when 'monthly' then 'Μηνιαία' else 'Εφάπαξ' end,
           'state', case authz.agreement_eff_state(a)
                      when 'proposal' then 'Πρόταση · ' || case authz.agreement_eff_path(a)
                        when 'draft' then 'πρόχειρη' when 'awaiting_approval' then 'αναμένει έγκριση'
                        when 'sent' then 'στάλθηκε' when 'expired' then 'έληξε' when 'lost' then 'χάθηκε'
                        else authz.agreement_eff_path(a) end
                      when 'signed' then 'Υπογεγραμμένη' when 'active' then 'Ενεργή' when 'expired' then 'Έληξε'
                      else 'Λύθηκε' end,
           'revision', a.revision,
           'signatory', (select r.name from public.agreement_recipients r where r.agreement_id = a.id and r.is_signatory),
           'signedOn', (a.signed_at at time zone 'Europe/Athens')::date,
           'startOn', a.start_on, 'endOn', a.end_on, 'validUntil', a.valid_until,
           'monthlyPrice', case when p_amounts and a.kind = 'monthly' then f.price end,
           'oneOffPrice', case when p_amounts and a.kind = 'one_off' then f.price end
         ) order by c.name, a.title, a.id), '[]'::jsonb)
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
    join public.clients c on c.id = o.client_id
    cross join lateral authz.agreement_figures(a.id) f
   where authz.agreement_in_scope(a.opportunity_id, 'agreements.view');
$$;

-- Τα Έξοδα ανά μήνα (G3), για τους μήνες της Περιόδου.
create function authz.export_expense_rows(p_from date, p_to date, p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'month', to_char(m.month, 'YYYY-MM'),
           'expenses', case when p_amounts then m.expenses_total end,
           'productiveHours', m.productive_hours,
           'hourCost', case when p_amounts then m.hour_cost end
         ) order by m.month), '[]'::jsonb)
    from public.cost_months m
   where m.month between date_trunc('month', p_from)::date and p_to;
$$;

-- Οι γραμμές ενός συνόλου (το Δικαίωμα έχει ήδη ελεγχθεί).
create function authz.export_rows(p_dataset text, p_from date, p_to date, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.export_dataset_amounts(p_dataset);
begin
  return case p_dataset
    when 'invoices' then authz.export_invoice_rows(p_from, p_to, p_today, v_amounts, false)
    when 'receipts' then authz.export_receipt_rows(p_from, p_to, v_amounts)
    when 'billables' then authz.export_billable_rows(p_from, p_to, v_amounts)
    when 'ledgers' then authz.export_ledger_rows(p_from, p_to, v_amounts)
    when 'clients' then authz.export_client_rows()
    when 'agreements' then authz.export_agreement_rows(v_amounts)
    when 'expenses' then authz.export_expense_rows(p_from, p_to, v_amounts)
  end;
end;
$$;

-- ───────────── M2: τα σύνολα και το πλήθος γραμμών (χωρίς Ίχνος: δεν βγαίνουν δεδομένα) ─────────────

-- { today, period, items: [{ code, usesPeriod, rowCount }] }: μόνο τα σύνολα που βλέπει ο Χρήστης.
create function authz.export_datasets(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_from date;
  v_to date;
begin
  perform authz.export_require();
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return jsonb_build_object(
    'today', p_today,
    'period', authz.report_period_json(p_period, p_today),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', d.code,
               'usesPeriod', authz.export_dataset_uses_period(d.code),
               'rowCount', jsonb_array_length(authz.export_rows(d.code, v_from, v_to, p_today))
             ) order by d.n)
        from unnest(authz.export_dataset_codes()) with ordinality d (code, n)
       where authz.export_dataset_allowed(d.code)
    ), '[]'::jsonb)
  );
end;
$$;

-- ───────────── M2: εξαγωγή συνόλου ─────────────

-- { dataset, period | null, amounts, rows: [...] }. Ίχνος πριν από τα δεδομένα.
create function authz.export_dataset(p_dataset text, p_period text, p_format text, p_today date) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_period jsonb;
  v_from date;
  v_to date;
  v_rows jsonb;
begin
  perform authz.export_require();
  if p_dataset is null or not (p_dataset = any (authz.export_dataset_codes())) then
    raise exception 'Άγνωστο σύνολο δεδομένων' using errcode = 'P0001';
  end if;
  if not authz.export_dataset_allowed(p_dataset) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.export_check_format(p_format);
  if authz.export_dataset_uses_period(p_dataset) then
    select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
    v_period := authz.report_period_json(p_period, p_today);
  end if;
  v_rows := authz.export_rows(p_dataset, v_from, v_to, p_today);
  perform authz.export_log('dataset', p_dataset,
    jsonb_strip_nulls(jsonb_build_object('period', v_period ->> 'code', 'from', v_period ->> 'from', 'to', v_period ->> 'to')),
    jsonb_array_length(v_rows), p_format);
  return jsonb_build_object('dataset', p_dataset, 'period', v_period,
                            'amounts', authz.export_dataset_amounts(p_dataset), 'rows', v_rows);
end;
$$;

-- ───────────── M1: εξαγωγή μιας Αναφοράς όπως φαίνεται ─────────────

-- Καλεί το public.report_* RPC της Αναφοράς με τα ίδια φίλτρα (p_args: p_period, p_client, p_seller). Το RPC ελέγχει
-- τα δικά του Δικαιώματα (Ρ1)· δέχεται μόνο RPC που η εφαρμογή ήδη καλεί (authenticated) και επιστρέφουν jsonb.
-- p_rows_key = ο πίνακας γραμμών στο JSON (για το πλήθος του Ίχνους). Επιστρέφει το JSON της Αναφοράς όπως είναι.
create function authz.export_report(p_report text, p_rpc text, p_args jsonb, p_rows_key text, p_format text) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_args jsonb := coalesce(p_args, '{}'::jsonb);
  v_call text;
  v_data jsonb;
begin
  perform authz.export_require();
  perform authz.export_check_format(p_format);
  if p_report is null or p_report !~ '^[a-z0-9-]{1,60}$' or p_rpc is null or p_rpc !~ '^report_[a-z0-9_]{1,60}$'
     or p_rows_key is null or p_rows_key !~ '^[A-Za-z]{1,40}$' or jsonb_typeof(v_args) <> 'object'
     or not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = p_rpc and p.prorettype = 'jsonb'::regtype
          and pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))
     or exists (select 1 from jsonb_object_keys(v_args) k where k not in ('p_period', 'p_client', 'p_seller')) then
    raise exception 'Αυτή η Αναφορά δεν εξάγεται' using errcode = 'P0001';
  end if;
  v_call := format('select public.%I(%s)', p_rpc, concat_ws(', ',
    case when v_args ? 'p_period' then 'p_period => $1' end,
    case when v_args ? 'p_client' then 'p_client => $2' end,
    case when v_args ? 'p_seller' then 'p_seller => $3' end));
  execute v_call into v_data
    using v_args ->> 'p_period', (v_args ->> 'p_client')::uuid, (v_args ->> 'p_seller')::uuid;
  if jsonb_typeof(v_data -> p_rows_key) is distinct from 'array' then
    raise exception 'Αυτή η Αναφορά δεν εξάγεται' using errcode = 'P0001';
  end if;
  perform authz.export_log('report', p_report,
    jsonb_strip_nulls(jsonb_build_object(
      'period', v_data #>> '{period,code}', 'from', v_data #>> '{period,from}', 'to', v_data #>> '{period,to}',
      'client', v_args ->> 'p_client', 'seller', v_args ->> 'p_seller')),
    jsonb_array_length(v_data -> p_rows_key), p_format);
  return v_data;
end;
$$;

-- ───────────── Πακέτο λογιστή (Ρ8) ─────────────

-- { month: 'YYYY-MM', isPartial, amounts, pdfs, invoices: [... + id, pdfPath], receipts: [...] }
-- pdfs = ο Χρήστης κατεβάζει PDF (finance.view + «Βλέπει ποσά» «όλα»)· αλλιώς pdfPath = null σε όλα.
-- Μήνας που δεν έχει αρχίσει → P0001. Ίχνος πριν από τα δεδομένα.
create function authz.export_accountant_pack(p_month text, p_today date) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.scope('finance.amounts') is not distinct from 'all';
  v_from date;
  v_to date;
  v_invoices jsonb;
  v_receipts jsonb;
begin
  perform authz.export_require();
  if not coalesce(authz.has('finance.view'), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Άγνωστος μήνας' using errcode = 'P0001';
  end if;
  v_from := to_date(p_month || '-01', 'YYYY-MM-DD');
  if v_from > p_today then
    raise exception 'Ο μήνας δεν έχει αρχίσει ακόμα' using errcode = 'P0001';
  end if;
  v_to := (v_from + interval '1 month - 1 day')::date;
  v_invoices := authz.export_invoice_rows(v_from, v_to, p_today, v_amounts, true);
  v_receipts := authz.export_receipt_rows(v_from, v_to, v_amounts);
  perform authz.export_log('accountant_pack', 'accountant-pack',
    jsonb_build_object('month', p_month, 'invoices', jsonb_array_length(v_invoices),
                       'receipts', jsonb_array_length(v_receipts)),
    jsonb_array_length(v_invoices) + jsonb_array_length(v_receipts), 'zip');
  return jsonb_build_object('month', p_month, 'isPartial', p_today <= v_to, 'amounts', v_amounts, 'pdfs', v_amounts,
                            'invoices', v_invoices, 'receipts', v_receipts);
end;
$$;

-- ───────────── Ιστορικό εξαγωγών ─────────────

-- { all, items: [{ at, actorName, isMine, kind, subject, filters, rows, format }] }, νεότερο πρώτο, έως 200.
-- all = «Βλέπει ίχνος ενεργειών» (Ιδιοκτήτης, Διαχείριση): όλες οι εξαγωγές· αλλιώς μόνο του Χρήστη.
-- Διαβάζει το Ίχνος με security definer ΕΣΚΕΜΕΝΑ (παρακάμπτει το RLS του audit_log)· οι γραμμές δεν έχουν ποσά.
create function authz.export_history(p_limit integer) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_all boolean := coalesce(authz.has('audit.view'), false);
  v_me text := auth.uid()::text;
begin
  perform authz.export_require();
  return jsonb_build_object(
    'all', v_all,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'at', h.at, 'actorName', coalesce(u.name, '—'), 'isMine', h.entity_id = v_me,
               'kind', h.after ->> 'kind', 'subject', h.after ->> 'subject',
               'filters', coalesce(h.after -> 'filters', '{}'::jsonb),
               'rows', coalesce((h.after ->> 'rows')::integer, 0), 'format', h.after ->> 'format'
             ) order by h.at desc, h.id desc)
        from (
          select a.id, a.at, a.entity_id, a.actor_id, a.after
            from public.audit_log a
           where a.entity = 'report_exports' and (v_all or a.entity_id = v_me)
           order by a.at desc, a.id desc
           limit greatest(1, least(coalesce(p_limit, 50), 200))
        ) h
        left join public.team_users u on u.user_id = h.actor_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ───────────── RPC της εφαρμογής (σήμερα = ώρα Ελλάδας) ─────────────

create function public.export_datasets(p_period text default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.export_datasets(p_period, public.sales_today()); $$;

create function public.export_dataset(p_dataset text, p_period text default null, p_format text default 'xlsx')
returns jsonb
language sql volatile security definer set search_path = ''
as $$ select authz.export_dataset(p_dataset, p_period, p_format, public.sales_today()); $$;

create function public.export_report(p_report text, p_rpc text, p_args jsonb, p_rows_key text, p_format text default 'xlsx')
returns jsonb
language sql volatile security definer set search_path = ''
as $$ select authz.export_report(p_report, p_rpc, p_args, p_rows_key, p_format); $$;

create function public.export_accountant_pack(p_month text) returns jsonb
language sql volatile security definer set search_path = ''
as $$ select authz.export_accountant_pack(p_month, public.sales_today()); $$;

create function public.export_history(p_limit integer default 50) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.export_history(p_limit); $$;

-- ───────────── Το Ίχνος δείχνει τις εξαγωγές σε όποιον «Βλέπει ίχνος ενεργειών» ─────────────
-- Ξαναγράφεται ολόκληρο από τον τελικό ορισμό (20261017100000_knowledge.sql), με τις εξαγωγές (χωρίς ποσά).

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
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.export_require(), authz.export_dataset_codes(), authz.export_dataset_allowed(text),
  authz.export_dataset_uses_period(text), authz.export_dataset_amounts(text), authz.export_check_format(text),
  authz.export_log(text, text, jsonb, integer, text),
  authz.export_invoice_rows(date, date, date, boolean, boolean), authz.export_receipt_rows(date, date, boolean),
  authz.export_billable_rows(date, date, boolean), authz.export_ledger_rows(date, date, boolean),
  authz.export_client_rows(), authz.export_agreement_rows(boolean), authz.export_expense_rows(date, date, boolean),
  authz.export_rows(text, date, date, date), authz.export_datasets(text, date),
  authz.export_dataset(text, text, text, date), authz.export_report(text, text, jsonb, text, text),
  authz.export_accountant_pack(text, date), authz.export_history(integer)
  from public, anon, authenticated;

revoke all on function
  public.export_datasets(text), public.export_dataset(text, text, text),
  public.export_report(text, text, jsonb, text, text), public.export_accountant_pack(text), public.export_history(integer)
  from public, anon, authenticated;

grant execute on function
  public.export_datasets(text), public.export_dataset(text, text, text),
  public.export_report(text, text, jsonb, text, text), public.export_accountant_pack(text), public.export_history(integer)
  to authenticated;
