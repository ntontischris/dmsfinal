-- Τιμολόγια (I2) και Καταχώρηση (I3), Iγ #152: πίνακας Τιμολογίων, ιδιωτικό bucket PDF, καταχώρηση με προειδοποιήσεις (Π4–Π6),
-- κάλυψη Τιμολογητέων (καθαρό, παλαιότερο πρώτα), κατανομή Εισπράξεων (μικτό, παλαιότερο πρώτα), καταστάσεις και email με PDF (Π7).
-- Κεφ. 7 (Τιμολόγια και Εισπράξεις), Δέσμη I (#152): Π3–Π7, Π13.
--
-- Αρχές:
--  • Ο πίνακας είναι κλειστός για την εφαρμογή (RLS χωρίς policies, χωρίς grants)· διαβάζεται και γράφεται μόνο από τα
--    public.invoice* RPC, που ελέγχουν το Δικαίωμα ΠΡΩΤΑ (security definer, search_path = '').
--  • Δικαιώματα: καταχώρηση και υπόδειγμα → finance.invoices· λίστα → finance.view + finance.amounts (Εύρος «όλα»)·
--    λήψη PDF → ομάδα με finance.view + finance.amounts, ή Χρήστης πελάτη με c.finance μόνο για τον δικό του Πελάτη.
--  • Το PDF ζει σε ιδιωτικό bucket χωρίς policies: ανεβαίνει μόνο από τον server (service role), σε διαδρομή pending/<uuid>.pdf
--    που δίνει η invoice_upload_slot. Η λήψη γίνεται με signed URL 60″ από τον server.
--  • Οι καταστάσεις, η κάλυψη των Τιμολογητέων και η κατανομή των Εισπράξεων ΥΠΟΛΟΓΙΖΟΝΤΑΙ, δεν αποθηκεύονται.
--  • Η ακύρωση και η διόρθωση στοιχείων μπαίνουν στο Iε· εδώ υπάρχουν μόνο οι στήλες ακύρωσης.

-- ───────────── Email ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined', 'deliverable_version_sent',
                  'production_delivered', 'deliverable_reminder', 'invoice_registered'));

-- ───────────── Πίνακας Τιμολογίων ─────────────

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  -- τιμολόγιο, απόδειξη παροχής υπηρεσιών, πιστωτικό
  kind text not null check (kind in ('invoice', 'receipt', 'credit')),
  number text not null check (char_length(btrim(number)) between 1 and 40),
  issue_date date not null,
  due_date date,
  net numeric(12, 2) not null check (net >= 0 and net < 10000000),
  vat numeric(12, 2) not null check (vat >= 0 and vat < 10000000),
  total numeric(12, 2) not null check (total > 0 and total < 10000000),
  -- Προαιρετικό: δεσμευμένο για τη μετάβαση στο myDATA.
  mark text check (mark is null or mark ~ '^[0-9]{1,20}$'),
  -- Το ΑΦΜ που διαβάστηκε από το PDF (για τον έλεγχο με το ΑΦΜ του Πελάτη).
  pdf_tax_id text check (pdf_tax_id is null or char_length(pdf_tax_id) <= 40),
  credit_for uuid references public.invoices (id),
  pdf_path text not null check (char_length(pdf_path) between 1 and 200),
  created_at timestamptz not null default now(),
  created_by uuid,
  -- Ακύρωση καταχώρισης (Π9): οι στήλες υπάρχουν από τώρα, η ροή μπαίνει στο Iε.
  voided_at timestamptz,
  voided_by uuid,
  void_reason text check (void_reason is null or char_length(btrim(void_reason)) between 1 and 500),
  check (due_date is null or due_date >= issue_date),
  check ((kind = 'credit') = (credit_for is not null)),
  check ((kind = 'credit') = (due_date is null)),
  check ((voided_at is null and void_reason is null) or (voided_at is not null and void_reason is not null))
);

create unique index invoices_pdf_path_unique on public.invoices (pdf_path);
create index invoices_client_idx on public.invoices (client_id, issue_date);
create index invoices_credit_for_idx on public.invoices (credit_for) where credit_for is not null;

alter table public.invoices enable row level security;

-- ───────────── Ιδιωτικό bucket ─────────────
-- Ο τοπικός Supabase του CI μπορεί να μην έχει ακόμα έτοιμο το storage όταν τρέχουν τα migrations· τότε ο server
-- φτιάχνει το bucket με την πρώτη καταχώρηση. Καμία policy στο storage.objects: πρόσβαση μόνο με service role.

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
    values ('invoices', 'invoices', false, 4194304, array['application/pdf'])
    on conflict (id) do nothing;
  else
    insert into storage.buckets (id, name, public) values ('invoices', 'invoices', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ───────────── Καταστάσεις ─────────────

-- Οφειλή, εξοφλημένο και υπόλοιπο ανά Τιμολόγιο. p_client null = όλοι οι Πελάτες.
-- owed = σύνολο − μη ακυρωμένα πιστωτικά του. Οι Εισπράξεις (μη διαγραμμένες) κάθε Πελάτη κατανέμονται στα μη ακυρωμένα
-- Τιμολόγια που δεν είναι πιστωτικά, κατά ημερομηνία έκδοσης και μετά δημιουργίας, παλαιότερο πρώτα.
-- Το p_today (null = σήμερα στην Αθήνα) υπάρχει για τα τεστ με σταθερές ημερομηνίες.
create function authz.invoice_standings(p_client uuid, p_today date default null)
returns table (invoice_id uuid, client_id uuid, owed numeric, paid numeric, remaining numeric, status text)
language sql stable security definer set search_path = ''
as $$
  with live as (
    select i.id, i.client_id, i.kind, i.issue_date, i.created_at, i.due_date,
           case when i.kind = 'credit' then 0::numeric
                else greatest(
                  i.total - coalesce((select sum(c.total) from public.invoices c
                                       where c.credit_for = i.id and c.voided_at is null), 0), 0)
           end as owed
      from public.invoices i
     where i.voided_at is null and (p_client is null or i.client_id = p_client)
  ), pool as (
    select r.client_id, sum(r.amount) as total
      from public.receipts r
     where r.deleted_at is null and (p_client is null or r.client_id = p_client)
     group by r.client_id
  ), stacked as (
    select l.id, l.client_id, l.due_date, l.owed,
           coalesce(sum(l.owed) over (
             partition by l.client_id order by l.issue_date, l.created_at, l.id
             rows between unbounded preceding and 1 preceding), 0) as before
      from live l
     where l.kind <> 'credit'
  ), allocated as (
    select s.id, s.client_id, s.due_date, s.owed,
           least(s.owed, greatest(coalesce(p.total, 0) - s.before, 0)) as paid
      from stacked s
      left join pool p on p.client_id = s.client_id
  )
  select a.id, a.client_id, a.owed, a.paid, a.owed - a.paid,
         case when a.paid >= a.owed then 'paid'
              when a.due_date < coalesce(p_today, public.sales_today()) then 'overdue'
              when a.paid > 0 then 'partial'
              else 'unpaid'
         end
    from allocated a
  union all
  select l.id, l.client_id, 0::numeric, 0::numeric, 0::numeric, 'credit'
    from live l
   where l.kind = 'credit';
$$;

-- Ανοιχτά Τιμολόγια του Πελάτη, για την κατανομή (hook του #150, ίδια υπογραφή): παλαιότερο πρώτα.
create or replace function authz.client_open_invoices(p_client uuid)
returns table (invoice_id uuid, number text, issue_date date, remaining numeric)
language sql stable security definer set search_path = ''
as $$
  select s.invoice_id, i.number, i.issue_date, s.remaining
    from authz.invoice_standings(p_client) s
    join public.invoices i on i.id = s.invoice_id
   where s.remaining > 0
   order by i.issue_date, i.created_at, i.id;
$$;

-- ───────────── Κάλυψη Τιμολογητέων ─────────────

-- Το καθαρό των μη ακυρωμένων Τιμολογίων (όχι πιστωτικών) του Πελάτη καλύπτει τα Τιμολογητέα κατά ημερομηνία, παλαιότερο πρώτα.
-- Τα πιστωτικά δεν ξανανοίγουν Τιμολογητέα (hook του #151, ίδια υπογραφή).
create or replace function authz.billable_covered(p_client uuid) returns table (billable_id uuid, covered numeric)
language sql stable security definer set search_path = ''
as $$
  with invoiced as (
    select coalesce(sum(i.net), 0) as net
      from public.invoices i
     where i.client_id = p_client and i.kind <> 'credit' and i.voided_at is null
  ), stacked as (
    select b.id, b.net,
           coalesce(sum(b.net) over (
             order by b.billable_on, b.created_at, b.id
             rows between unbounded preceding and 1 preceding), 0) as before
      from public.billables b
     where b.client_id = p_client
  )
  select s.id, least(s.net, greatest(v.net - s.before, 0))
    from stacked s
   cross join invoiced v;
$$;

-- Τιμολογήθηκε πέρα από τα Τιμολογητέα: καθαρό Τιμολογίων − άθροισμα Τιμολογητέων, όπου είναι > 0.
create function authz.invoices_beyond() returns table (client_id uuid, beyond numeric)
language sql stable security definer set search_path = ''
as $$
  select i.client_id, i.net_total - coalesce(b.net_total, 0)
    from (select x.client_id, sum(x.net) as net_total
            from public.invoices x
           where x.kind <> 'credit' and x.voided_at is null
           group by x.client_id) i
    left join (select y.client_id, sum(y.net) as net_total
                 from public.billables y
                group by y.client_id) b on b.client_id = i.client_id
   where i.net_total - coalesce(b.net_total, 0) > 0;
$$;

-- ───────────── Προσυμπλήρωση (Π5) ─────────────

-- Η Συμφωνία που δίνει όρους: του παλαιότερου ανοιχτού Τιμολογητέου, αλλιώς η ενεργή (υπογεγραμμένη) Συμφωνία του Πελάτη.
create function authz.client_pricing_agreement(p_client uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select o.agreement_id
       from authz.billables_open(public.sales_today()) o
      where o.client_id = p_client
      order by o.billable_on, o.id
      limit 1),
    (select a.id
       from public.agreements a
       join public.opportunities op on op.id = a.opportunity_id
      where op.client_id = p_client and a.state in ('signed', 'active')
      order by a.signed_at desc nulls last, a.created_at desc
      limit 1)
  );
$$;

-- Μέρες πληρωμής: της Συμφωνίας, αλλιώς των Όρων (agreement_defaults).
create function authz.invoice_payment_days(p_client uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select a.payment_days from public.agreements a where a.id = authz.client_pricing_agreement(p_client)),
    (select d.payment_days_monthly from public.agreement_defaults d),
    15
  );
$$;

-- Αναμενόμενος ΦΠΑ %: της Συμφωνίας, αλλιώς της εταιρείας.
create function authz.invoice_vat_rate(p_client uuid) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select m.vat_rate from public.agreement_amounts m where m.agreement_id = authz.client_pricing_agreement(p_client)),
    (select s.vat_rate from public.company_settings s),
    24
  );
$$;

-- ───────────── Email προς τον πελάτη (Π7) ─────────────

-- Μία γραμμή ουράς ανά Χρήστη πελάτη του Πελάτη με «Βλέπει Οικονομικά». Το PDF το επισυνάπτει ο worker από το bucket.
create function authz.email_invoice_registered(p_invoice uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  select 'invoice_registered', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'),
         jsonb_build_object(
           'invoiceId', i.id, 'kind', i.kind, 'number', i.number, 'issueDate', i.issue_date,
           'dueDate', i.due_date, 'total', i.total, 'pdfPath', i.pdf_path
         ),
         auth.uid()
    from public.invoices i
    join public.client_users cu on cu.client_id = i.client_id and cu.removed_at is null
    join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.finance'
    join auth.users u on u.id = cu.user_id
    left join public.team_users t on t.user_id = cu.user_id
   where i.id = p_invoice and coalesce(u.email, '') <> '';
end;
$$;

-- ───────────── RPC: PDF ─────────────

-- Η θέση του PDF πριν από την καταχώρηση. Ο server ανεβάζει εκεί με service role.
create function public.invoice_upload_slot() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('finance.invoices');
  return jsonb_build_object('path', 'pending/' || gen_random_uuid()::text || '.pdf');
end;
$$;

-- Η διαδρομή του PDF για λήψη. Ομάδα με finance.view + finance.amounts (Εύρος «όλα»): ναι. Χρήστης πελάτη με c.finance: μόνο του Πελάτη του
-- και μη ακυρωμένο. Αλλιώς 42501, με το ίδιο μήνυμα και για ανύπαρκτο Τιμολόγιο (χωρίς oracle ύπαρξης).
create function public.invoice_pdf_path(p_id uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_path text;
begin
  if authz.has('finance.view') and authz.scope('finance.amounts') = 'all' then
    select i.pdf_path into v_path from public.invoices i where i.id = p_id;
    if not found then
      raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
    end if;
    return v_path;
  end if;
  if authz.client_user_has('c.finance') then
    select i.pdf_path into v_path
      from public.invoices i
     where i.id = p_id and i.client_id = authz.client_user_client_id() and i.voided_at is null;
    if found then
      return v_path;
    end if;
  end if;
  raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
end;
$$;

-- ───────────── RPC: καταχώρηση ─────────────

-- Καταχώρηση Τιμολογίου από PDF που ανέβηκε ήδη στη θέση της invoice_upload_slot.
-- Οι προειδοποιήσεις (σύνολο, ΦΠΑ, ποσό, διπλός αριθμός) δεν μπλοκάρουν· μόνο το άλλο ΑΦΜ θέλει επιβεβαίωση (Π4).
-- p: { clientId, kind, number, issueDate, dueDate, net, vat, total, mark, pdfTaxId, creditFor, pdfPath, taxIdConfirmed }
create function public.invoice_register(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_kind text;
  v_number text;
  v_issue date;
  v_due date;
  v_net numeric;
  v_vat numeric;
  v_total numeric;
  v_mark text;
  v_pdf_tax text;
  v_credit_for uuid;
  v_path text;
  v_confirmed boolean;
  v_afm text;
  v_target public.invoices;
  v_credited numeric;
  v_id uuid;
begin
  perform authz.require('finance.invoices');
  begin
    v_client := nullif(p ->> 'clientId', '')::uuid;
    v_kind := p ->> 'kind';
    v_number := btrim(coalesce(p ->> 'number', ''));
    v_issue := nullif(p ->> 'issueDate', '')::date;
    v_due := nullif(p ->> 'dueDate', '')::date;
    v_net := nullif(p ->> 'net', '')::numeric;
    v_vat := nullif(p ->> 'vat', '')::numeric;
    v_total := nullif(p ->> 'total', '')::numeric;
    v_mark := nullif(btrim(coalesce(p ->> 'mark', '')), '');
    v_pdf_tax := nullif(btrim(coalesce(p ->> 'pdfTaxId', '')), '');
    v_credit_for := nullif(p ->> 'creditFor', '')::uuid;
    v_path := p ->> 'pdfPath';
    v_confirmed := coalesce((p ->> 'taxIdConfirmed')::boolean, false);
  exception when others then
    raise exception 'Τα στοιχεία του Τιμολογίου δεν είναι έγκυρα. Έλεγξε τα πεδία.' using errcode = 'P0001';
  end;
  if v_client is null then
    raise exception 'Διάλεξε Πελάτη' using errcode = 'P0001';
  end if;
  perform authz.require_client_exists(v_client);
  if v_kind is null or v_kind not in ('invoice', 'receipt', 'credit') then
    raise exception 'Διάλεξε είδος: τιμολόγιο, απόδειξη ή πιστωτικό' using errcode = 'P0001';
  end if;
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
  if v_path is null or v_path !~ '^pending/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' then
    raise exception 'Το PDF δεν ανέβηκε σωστά. Ανέβασέ το ξανά.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'invoices' and o.name = v_path) then
    raise exception 'Το PDF δεν ανέβηκε σωστά. Ανέβασέ το ξανά.' using errcode = 'P0001';
  end if;
  select c.afm into v_afm from public.clients c where c.id = v_client;
  if v_pdf_tax is not null and v_afm is not null and v_pdf_tax <> v_afm and not v_confirmed then
    raise exception 'Το ΑΦΜ στο PDF (%) διαφέρει από το ΑΦΜ του Πελάτη (%). Επιβεβαίωσε ότι είναι σωστό.', v_pdf_tax, v_afm
      using errcode = 'P0001';
  end if;
  if v_kind = 'credit' then
    if v_credit_for is null then
      raise exception 'Διάλεξε το Τιμολόγιο που διορθώνει το πιστωτικό' using errcode = 'P0001';
    end if;
    select i.* into v_target
      from public.invoices i
     where i.id = v_credit_for and i.client_id = v_client and i.kind <> 'credit' and i.voided_at is null
       for update;
    if not found then
      raise exception 'Το Τιμολόγιο που διορθώνει δεν βρέθηκε για αυτόν τον Πελάτη' using errcode = 'P0001';
    end if;
    select coalesce(sum(c.total), 0) into v_credited
      from public.invoices c where c.credit_for = v_target.id and c.voided_at is null;
    if v_credited + v_total > v_target.total then
      raise exception 'Τα πιστωτικά ξεπερνούν το σύνολο του Τιμολογίου %', v_target.number using errcode = 'P0001';
    end if;
    v_due := null;
  else
    if v_credit_for is not null then
      raise exception 'Μόνο το πιστωτικό δένεται με άλλο Τιμολόγιο' using errcode = 'P0001';
    end if;
    v_due := coalesce(v_due, v_issue + authz.invoice_payment_days(v_client));
    if v_due < v_issue then
      raise exception 'Η λήξη δεν μπορεί να είναι πριν από την έκδοση' using errcode = 'P0001';
    end if;
  end if;
  begin
    insert into public.invoices (
      client_id, kind, number, issue_date, due_date, net, vat, total, mark, pdf_tax_id, credit_for, pdf_path, created_by
    ) values (
      v_client, v_kind, v_number, v_issue, v_due, v_net, v_vat, v_total, v_mark, v_pdf_tax, v_credit_for, v_path, auth.uid()
    ) returning id into v_id;
  exception when unique_violation then
    raise exception 'Αυτό το PDF έχει ήδη καταχωρηθεί' using errcode = 'P0001';
  end;
  perform authz.email_invoice_registered(v_id);
  return jsonb_build_object('id', v_id);
end;
$$;

-- Υπόδειγμα για τη φόρμα: Πελάτης, ΑΦΜ, ΦΠΑ και μέρες πληρωμής (Π5), «Προς τιμολόγηση» και υπάρχοντα Τιμολόγια.
-- Οι προειδοποιήσεις υπολογίζονται στον client από αυτά.
create function public.invoice_draft_context(p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
  v_name text;
  v_afm text;
begin
  perform authz.require('finance.invoices');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select c.name, c.afm into v_name, v_afm from public.clients c where c.id = p_client;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'clientName', v_name,
    'clientTaxId', v_afm,
    'vatRate', authz.invoice_vat_rate(p_client),
    'paymentDays', authz.invoice_payment_days(p_client),
    'toInvoice', (select coalesce(sum(o.open_amount), 0)
                    from authz.billables_open(v_today) o where o.client_id = p_client),
    'openBillables', (select coalesce(jsonb_agg(
                        jsonb_build_object('id', o.id, 'label', o.label, 'billableOn', o.billable_on, 'open', o.open_amount)
                        order by o.billable_on, o.id), '[]'::jsonb)
                        from authz.billables_open(v_today) o where o.client_id = p_client),
    'existingNumbers', (select coalesce(jsonb_agg(i.number order by i.issue_date, i.created_at), '[]'::jsonb)
                          from public.invoices i where i.client_id = p_client and i.voided_at is null),
    'invoices', (select coalesce(jsonb_agg(
                   jsonb_build_object('id', i.id, 'number', i.number, 'kind', i.kind)
                   order by i.issue_date desc, i.created_at desc), '[]'::jsonb)
                   from public.invoices i
                  where i.client_id = p_client and i.kind <> 'credit' and i.voided_at is null)
  );
end;
$$;

-- ───────────── RPC: λίστα I2 ─────────────

-- p_filter: all | unpaid | overdue | credit. Τα ακυρωμένα εξαιρούνται. Λίστα όλων των Πελατών: finance.amounts με Εύρος «όλα».
-- Ο Τζίρος μήνα = καθαρό Τιμολογίων του τρέχοντος μήνα (Αθήνα) − καθαρό πιστωτικών του. Για Χρήστη πελάτη θα υπάρχει
-- ξεχωριστό RPC στο Iδ.
create function public.invoices_view(p_filter text default 'all') returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
  v_month date := date_trunc('month', public.sales_today())::date;
  v_next date := (date_trunc('month', public.sales_today()) + interval '1 month')::date;
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_filter is null or p_filter not in ('all', 'unpaid', 'overdue', 'credit') then
    raise exception 'Άγνωστο φίλτρο Τιμολογίων' using errcode = 'P0001';
  end if;
  return (
    with inv_rows as (
      select i.id, i.number, i.kind, i.client_id, c.name as client_name, i.issue_date, i.due_date, i.net, i.total,
             i.created_at, s.paid, s.remaining, s.status, orig.number as credit_for_number
        from authz.invoice_standings(null, v_today) s
        join public.invoices i on i.id = s.invoice_id
        join public.clients c on c.id = i.client_id
        left join public.invoices orig on orig.id = i.credit_for
    ), shown as (
      select r.*
        from inv_rows r
       where case
               when p_filter = 'unpaid' then r.kind <> 'credit' and r.remaining > 0
               when p_filter = 'overdue' then r.status = 'overdue'
               when p_filter = 'credit' then r.kind = 'credit'
               else true
             end
    )
    select jsonb_build_object(
      'totals', jsonb_build_object(
        'turnoverMonth', coalesce((select sum(case when r.kind = 'credit' then -r.net else r.net end)
                                     from inv_rows r where r.issue_date >= v_month and r.issue_date < v_next), 0),
        'unpaid', coalesce((select sum(r.remaining) from inv_rows r where r.kind <> 'credit' and r.remaining > 0), 0),
        'unpaidCount', (select count(*) from inv_rows r where r.kind <> 'credit' and r.remaining > 0),
        'overdue', coalesce((select sum(r.remaining) from inv_rows r where r.status = 'overdue'), 0),
        'overdueCount', (select count(*) from inv_rows r where r.status = 'overdue')
      ),
      'counts', jsonb_build_object(
        'all', (select count(*) from inv_rows),
        'unpaid', (select count(*) from inv_rows r where r.kind <> 'credit' and r.remaining > 0),
        'overdue', (select count(*) from inv_rows r where r.status = 'overdue'),
        'credit', (select count(*) from inv_rows r where r.kind = 'credit')
      ),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id, 'number', r.number, 'kind', r.kind, 'clientId', r.client_id, 'clientName', r.client_name,
                 'issueDate', r.issue_date, 'dueDate', r.due_date, 'total', r.total, 'paid', r.paid,
                 'remaining', r.remaining, 'status', r.status, 'creditForNumber', r.credit_for_number
               ) order by r.issue_date desc, r.created_at desc, r.id)
          from shown r
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ───────────── «Προς τιμολόγηση» με το «πέρα από τα Τιμολογητέα» ─────────────
-- Ίδιο με το #151, με beyond από το authz.invoices_beyond. Ένας Πελάτης χωρίς ανοιχτά Τιμολογητέα φαίνεται αν τιμολογήθηκε πέρα.

create or replace function public.billables_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
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
    ), beyond as (
      select b.client_id, c.name as client_name, b.beyond
        from authz.invoices_beyond() b
        join public.clients c on c.id = b.client_id
    ), merged as (
      select coalesce(g.client_id, b.client_id) as client_id,
             coalesce(g.client_name, b.client_name) as client_name,
             coalesce(g.open_total, 0) as open_total,
             coalesce(g.item_count, 0) as item_count,
             coalesce(g.oldest_days, 0) as oldest_days,
             coalesce(b.beyond, 0) as beyond,
             coalesce(g.items, '[]'::jsonb) as items
        from grouped g
        full join beyond b on b.client_id = g.client_id
    )
    select jsonb_build_object(
      'total', coalesce(sum(m.open_total), 0),
      'count', coalesce(sum(m.item_count), 0),
      'clients', coalesce(jsonb_agg(jsonb_build_object(
          'clientId', m.client_id, 'clientName', m.client_name, 'open', m.open_total, 'count', m.item_count,
          'oldestDays', m.oldest_days, 'beyond', m.beyond, 'items', m.items)
        order by m.oldest_days desc, m.client_name), '[]'::jsonb)
    )
      from merged m
  );
end;
$$;

-- ───────────── Ίχνος ─────────────

create trigger invoices_audit after insert on public.invoices
  for each row execute function authz.audit_row('id');
create trigger invoices_audit_update after update on public.invoices
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

-- Ολόκληρη η λίστα (default deny): ό,τι προστίθεται εδώ είναι ρητό.
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
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.invoice_standings(uuid, date), authz.client_open_invoices(uuid), authz.billable_covered(uuid),
  authz.invoices_beyond(), authz.client_pricing_agreement(uuid), authz.invoice_payment_days(uuid),
  authz.invoice_vat_rate(uuid), authz.email_invoice_registered(uuid)
  from public, anon, authenticated;

revoke all on function
  public.invoice_upload_slot(), public.invoice_pdf_path(uuid), public.invoice_register(jsonb),
  public.invoice_draft_context(uuid), public.invoices_view(text), public.billables_view()
  from public, anon;

grant execute on function
  public.invoice_upload_slot(), public.invoice_pdf_path(uuid), public.invoice_register(jsonb),
  public.invoice_draft_context(uuid), public.invoices_view(text), public.billables_view()
  to authenticated;

-- Ο πίνακας είναι κλειστός: διαβάζεται και γράφεται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.invoices from anon, authenticated;
