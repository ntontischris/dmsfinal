-- Ειδοποιήσεις Kβ (#171), μέρος 2: οι ενέργειες των modules δεν γράφουν πια email.
--
--  • Ξαναγράφονται από τον ΤΕΛΕΥΤΑΙΟ ορισμό τους, χωρίς τις κλήσεις authz.email_*: έγκριση/απόρριψη Γυρίσματος, απόφαση
--    μετάθεσης, έκδοση Δελτίου, «δεν μπορώ», νέα Έκδοση και αποστολή της, παράδοση Παραγωγής, καταχώρηση Τιμολογίου.
--    Το email φεύγει πλέον μόνο από τον αρχικό Αυτοματισμό του Γεγονότος (μέρος 1).
--  • Η απόφαση μετάθεσης γράφει στο Γεγονός τον αιτούντα (requested_by), τον παραλήπτη του email της απόφασης.
--  • Η καταχώρηση Τιμολογίου γράφει το Γεγονός 36 (invoice.registered) στην ίδια συναλλαγή.
--  • Το trigger κλεισίματος Αιτήματος και οι βοηθητικές authz.email_* σβήνουν. Τα παλιά kinds μένουν στο check και στο
--    dispatch της εφαρμογής, για γραμμές που ήδη περιμένουν στην ουρά.

create or replace function public.filming_approve(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'pending' then
    raise exception 'Μόνο γύρισμα που αναμένει έγκριση εγκρίνεται' using errcode = 'P0001';
  end if;
  update public.filmings x set state = 'scheduled', approved_at = now(), approved_by = auth.uid() where x.id = p_id;
  perform authz.filming_event(p_id, 'approved', '{}'::jsonb);
end;
$$;

create or replace function public.filming_reject(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  if v_reason is null then
    raise exception 'Η απόρριψη θέλει λόγο' using errcode = 'P0001';
  end if;
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'pending' then
    raise exception 'Μόνο γύρισμα που αναμένει έγκριση απορρίπτεται' using errcode = 'P0001';
  end if;
  update public.filmings x
     set state = 'rejected', rejected_at = now(), rejected_by = auth.uid(), rejected_reason = v_reason
   where x.id = p_id;
  perform authz.filming_event(p_id, 'rejected', jsonb_build_object('reason', v_reason));
end;
$$;

create or replace function public.filming_decide_reschedule(p_id uuid, p_accept boolean, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_problem text;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  perform pg_advisory_xact_lock(hashtext('dms.booking'));
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.reschedule_starts_at is null then
    raise exception 'Δεν υπάρχει αίτημα μετάθεσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if coalesce(p_accept, false) then
    if f.reschedule_starts_at <= now() then
      raise exception 'Η νέα ώρα πέρασε' using errcode = 'P0001';
    end if;
    v_problem := authz.slot_problem(f.reschedule_starts_at, f.reschedule_hours, p_id, true);
    if v_problem is not null then
      raise exception '%', v_problem using errcode = 'P0001';
    end if;
    perform authz.filming_move(p_id, f.reschedule_starts_at, f.reschedule_hours);
    -- Ο αιτών μπαίνει στο Γεγονός: το filming_move τον μηδενίζει, και το email της απόφασης πάει σε αυτόν.
    perform authz.filming_event(p_id, 'reschedule_decided', jsonb_build_object(
      'accepted', true, 'from', f.starts_at, 'requested_by', f.reschedule_requested_by));
    return;
  end if;
  if v_reason is null then
    raise exception 'Η απόρριψη θέλει λόγο' using errcode = 'P0001';
  end if;
  update public.filmings x
     set reschedule_starts_at = null, reschedule_hours = null, reschedule_requested_at = null, reschedule_requested_by = null
   where x.id = p_id;
  perform authz.filming_event(p_id, 'reschedule_decided', jsonb_build_object(
    'accepted', false, 'reason', v_reason, 'requested_by', f.reschedule_requested_by));
end;
$$;

create or replace function authz.sheet_issue(p_filming uuid, p_change text) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_version integer;
  v_change text := nullif(trim(coalesce(p_change, '')), '');
  v_snapshot jsonb;
  v_reset boolean;
begin
  perform 1 from public.filmings f where f.id = p_filming for update;
  perform authz.require_open_filming(p_filming);
  if not exists (select 1 from public.filming_crew c where c.filming_id = p_filming) then
    raise exception 'Πρόσθεσε Συνεργείο πριν από την έκδοση' using errcode = 'P0001';
  end if;
  v_version := (select coalesce(max(v.version), 0) + 1 from public.filming_sheet_versions v where v.filming_id = p_filming);
  if v_version = 1 then
    v_change := null;
  elsif v_change is null then
    raise exception 'Γράψε τι άλλαξε' using errcode = 'P0001';
  elsif length(v_change) > 300 then
    raise exception 'Η περιγραφή αλλαγής έχει έως 300 χαρακτήρες' using errcode = 'P0001';
  end if;
  v_snapshot := authz.sheet_snapshot(p_filming);
  insert into public.filming_sheet_versions (filming_id, version, issued_by, change, snapshot)
  values (p_filming, v_version, case when authz.is_team_user() then auth.uid() end, v_change, v_snapshot);
  select coalesce(s.change_resets_confirmations, false) and v_version > 1 into v_reset
    from public.filming_settings s where s.id;
  if v_reset then
    update public.filming_crew c set response = 'pending', reason = null, responded_at = null, version = null
     where c.filming_id = p_filming;
  end if;
  perform authz.filming_event(p_filming, 'sheet_issued', jsonb_build_object('version', v_version, 'change', v_change));
  return v_version;
end;
$$;

create or replace function public.filming_crew_respond(p_id uuid, p_response text, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not exists (select 1 from public.filming_crew c where c.filming_id = p_id and c.user_id = auth.uid()) then
    raise exception 'Δεν είσαι στο Συνεργείο αυτού του Γυρίσματος' using errcode = '42501';
  end if;
  if p_response not in ('confirmed', 'declined') then
    raise exception 'Άγνωστη απάντηση' using errcode = 'P0001';
  end if;
  if p_response = 'declined' and v_reason is null then
    raise exception 'Το «δεν μπορώ» θέλει λόγο' using errcode = 'P0001';
  end if;
  perform authz.require_open_filming(p_id);
  update public.filming_crew c
     set response = p_response,
         reason = case when p_response = 'declined' then v_reason else null end,
         responded_at = now(),
         version = (select max(v.version) from public.filming_sheet_versions v where v.filming_id = p_id)
   where c.filming_id = p_id and c.user_id = auth.uid();
  if p_response = 'declined' then
    perform authz.filming_event(p_id, 'crew_declined', jsonb_build_object('user_id', auth.uid(), 'reason', v_reason));
  end if;
end;
$$;

create or replace function public.deliverable_version_add(p_id uuid, p_url text, p_note text) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := trim(coalesce(p_url, ''));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_host text;
  v_number integer;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  perform authz.require_deliverable_open(p_id);
  perform 1 from public.deliverables d where d.id = p_id for update;
  if authz.deliverable_state(p_id) in ('approved', 'cancelled') then
    raise exception 'Το Παραδοτέο δεν δέχεται νέα Έκδοση' using errcode = 'P0001';
  end if;
  v_host := authz.deliverable_host(v_url);
  v_number := coalesce(authz.deliverable_current_number(p_id), 0) + 1;
  if authz.deliverable_goes_direct(p_id) then
    update public.deliverable_versions v
       set state = 'superseded'
     where v.deliverable_id = p_id and v.state in ('in_review', 'awaiting_client');
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_by, sent_at, sent_by)
    values (p_id, v_number, v_url, v_host, 'awaiting_client', v_note, auth.uid(), now(), auth.uid());
  else
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_by)
    values (p_id, v_number, v_url, v_host, 'in_review', v_note, auth.uid());
  end if;
  return v_number;
end;
$$;

create or replace function public.deliverable_version_send(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_number integer;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.review');
  perform authz.require_deliverable_open(p_id);
  perform 1 from public.deliverables d where d.id = p_id for update;
  if not exists (
       select 1 from public.deliverables d join public.productions p on p.id = d.production_id
        where d.id = p_id and p.client_id is not null
     ) then
    raise exception 'Η Εσωτερική Παραγωγή δεν στέλνεται στον πελάτη' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) <> 'in_review' then
    raise exception 'Μόνο Έκδοση σε εσωτερικό έλεγχο στέλνεται' using errcode = 'P0001';
  end if;
  v_number := authz.deliverable_current_number(p_id);
  update public.deliverable_versions v
     set state = 'superseded'
   where v.deliverable_id = p_id and v.state = 'awaiting_client' and v.number < v_number;
  update public.deliverable_versions v
     set state = 'awaiting_client', sent_at = now(), sent_by = auth.uid()
   where v.deliverable_id = p_id and v.number = v_number;
end;
$$;

create or replace function authz.production_mark_delivered(p_production uuid, p_note text, p_auto boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.productions p
     set state = 'delivered', delivered_at = now(), delivered_by = auth.uid(), delivered_note = p_note
   where p.id = p_production;
  perform authz.production_event(p_production, 'delivered',
    jsonb_build_object('note', p_note) || case when p_auto then '{"auto": true}'::jsonb else '{}'::jsonb end);
end;
$$;

create or replace function public.invoice_register(p jsonb) returns jsonb
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
  perform authz.emit_event('invoice.registered', 'invoices', v_id, 'invoice.registered:' || v_id, v_client,
    jsonb_build_object('invoice', v_number, 'dueOn', authz.ev_date(v_due),
                       'link', '/app/finance/invoices?invoice=' || v_id, 'client_link', '/app/finance/invoices'));
  return jsonb_build_object('id', v_id);
end;
$$;

-- ───────────── Ό,τι δεν χρησιμοποιείται πια ─────────────

drop trigger message_requests_closed_email on public.message_requests;
drop function authz.request_closed_notify();
drop function authz.email_client_about(uuid, text, jsonb);
drop function authz.email_team_user(uuid, text, jsonb);
drop function authz.email_client_deliverable_version(uuid, integer);
drop function authz.email_production_delivered(uuid);
drop function authz.email_invoice_registered(uuid);
