-- Εισπράξεις και Τρόποι είσπραξης (I4, #150): Τρόποι (seed 4, απόσυρση χωρίς διαγραφή), Εισπράξεις (καταχώρηση,
-- διόρθωση και διαγραφή με λόγο, soft delete), προεπισκόπηση «Θα εξοφλήσει» και ο αλγόριθμος κατανομής (παλαιότερο πρώτα).
-- Κεφ. 7 (Τιμολόγια και Εισπράξεις), Δέσμη I (#150): Π10, Π11, Π12.
--
-- Αρχές:
--  • Οι πίνακες είναι κλειστοί για την εφαρμογή (RLS χωρίς policies, χωρίς grants)· διαβάζονται και γράφονται μόνο από
--    τα public.payment_method_* και public.receipt_* RPC, που ελέγχουν το Δικαίωμα ΠΡΩΤΑ (security definer, search_path = '').
--  • Δικαιώματα: καταχώρηση, διόρθωση και διαγραφή Είσπραξης → finance.receipts· λίστα Εισπράξεων → finance.view +
--    finance.amounts· Τρόποι: ανάγνωση → finance.view ή finance.receipts· αλλαγή → finance.cost + finance.costManage
--    (ό,τι αλλάζει η σελίδα Ρυθμίσεων › Οικονομικά σήμερα). Κανένα νέο Δικαίωμα.
--  • Η κατανομή δεν αποθηκεύεται: υπολογίζεται κάθε φορά από τα ανοιχτά Τιμολόγια (authz.client_open_invoices, που
--    σε αυτό το ticket είναι κενό· το Iγ θα το γεμίσει). Όσο δεν υπάρχουν Τιμολόγια, όλο το ποσό είναι «υπέρ του Πελάτη».
--  • Η διόρθωση και η διαγραφή γράφουν παλιό → νέο και τον λόγο στο Ίχνος (γραμμή action = 'event').
--  • Ο αποσυρμένος Τρόπος δεν δέχεται νέες Εισπράξεις· οι παλιές κρατούν τον τρόπο τους.

-- ───────────── Τρόποι είσπραξης ─────────────

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  sort integer not null default 0,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Ονομασία μοναδική μόνο στους ενεργούς Τρόπους (ο αποσυρμένος αφήνει ελεύθερη την ονομασία).
create unique index payment_methods_label_active on public.payment_methods (lower(label)) where retired_at is null;

alter table public.payment_methods enable row level security;

insert into public.payment_methods (label, sort) values
  ('Τραπεζική κατάθεση', 1),
  ('Κωδικός RF', 2),
  ('Μετρητά', 3),
  ('Κάρτα (POS)', 4);

-- ───────────── Εισπράξεις ─────────────

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  received_on date not null,
  -- Ποσό με ΦΠΑ (ακέραιο ή με 2 δεκαδικά)· το ΦΠΑ φαίνεται μόνο στην Καρτέλα.
  amount numeric(12, 2) not null check (amount > 0 and amount < 10000000),
  method_id uuid not null references public.payment_methods (id),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  delete_reason text check (delete_reason is null or char_length(btrim(delete_reason)) between 1 and 500),
  check ((deleted_at is null and delete_reason is null) or (deleted_at is not null and delete_reason is not null))
);

create index receipts_client_idx on public.receipts (client_id, received_on desc);

alter table public.receipts enable row level security;

-- ───────────── Βοηθητικές authz ─────────────

-- Ποσό, ημερομηνία και σημείωση μιας Είσπραξης. Τα μηνύματα είναι για τον Χρήστη.
create function authz.receipt_check_input(p_amount numeric, p_received_on date, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 or p_amount >= 10000000 then
    raise exception 'Γράψε ποσό μεγαλύτερο από 0 € και κάτω από 10.000.000 €' using errcode = 'P0001';
  end if;
  if p_received_on is null then
    raise exception 'Γράψε την ημερομηνία της Είσπραξης' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) > 500 then
    raise exception 'Η σημείωση έχει το πολύ 500 χαρακτήρες' using errcode = 'P0001';
  end if;
end;
$$;

-- Ο λόγος διόρθωσης ή διαγραφής είναι υποχρεωτικός. Επιστρέφει τον λόγο καθαρισμένο.
create function authz.receipt_reason(p_reason text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) = 0 or char_length(v_reason) > 500 then
    raise exception 'Γράψε τον λόγο (έως 500 χαρακτήρες)' using errcode = 'P0001';
  end if;
  return v_reason;
end;
$$;

create function authz.require_active_method(p_method uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.payment_methods m where m.id = p_method and m.retired_at is null) then
    raise exception 'Ο τρόπος είσπραξης δεν βρέθηκε ή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
end;
$$;

create function authz.require_client_exists(p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Ανοιχτά Τιμολόγια του Πελάτη, για την κατανομή. Κενό σε αυτό το ticket (τα Τιμολόγια έρχονται με το Iγ).
create function authz.client_open_invoices(p_client uuid)
returns table (invoice_id uuid, number text, issue_date date, remaining numeric)
language sql stable security definer set search_path = ''
as $$
  select null::uuid, null::text, null::date, null::numeric where false;
$$;

-- Κατανομή Είσπραξης: εξοφλεί τα παλαιότερα ανοιχτά Τιμολόγια πρώτα· ό,τι περισσεύει είναι «υπέρ του Πελάτη».
create function authz.receipt_allocation(p_client uuid, p_amount numeric) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_left numeric := p_amount;
  v_take numeric;
  v_settles jsonb := '[]'::jsonb;
  v_open record;
begin
  for v_open in
    select o.invoice_id, o.number, o.remaining
      from authz.client_open_invoices(p_client) o
     order by o.issue_date, o.number
  loop
    exit when v_left <= 0;
    v_take := least(v_left, v_open.remaining);
    continue when v_take <= 0;
    v_settles := v_settles || jsonb_build_array(
      jsonb_build_object('invoiceId', v_open.invoice_id, 'number', v_open.number, 'amount', v_take)
    );
    v_left := v_left - v_take;
  end loop;
  return jsonb_build_object('settles', v_settles, 'surplus', v_left);
end;
$$;

-- Γραμμή Ίχνους για διόρθωση ή διαγραφή: παλιό και νέο, με τον λόγο.
create function authz.receipt_event(p_id uuid, p_event text, p_before jsonb, p_after jsonb, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (
    auth.uid(), 'event', 'receipts', p_id::text, p_before,
    jsonb_build_object('event', p_event, 'reason', p_reason) || p_after
  );
end;
$$;

-- ───────────── Τρόποι: RPC ─────────────

create function public.payment_methods_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  if not (authz.has('finance.view') or authz.has('finance.receipts')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(
           jsonb_build_object('id', m.id, 'label', m.label, 'retired', m.retired_at is not null)
           order by m.retired_at is not null, m.sort, m.label
         ), '[]'::jsonb)
    into v_rows
    from public.payment_methods m;
  return v_rows;
end;
$$;

-- Προσθήκη (p_id null) ή μετονομασία. Το ίδιο Δικαίωμα με τις υπόλοιπες αλλαγές της σελίδας Ρυθμίσεων › Οικονομικά.
create function public.payment_method_save(p_id uuid, p_label text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_id uuid;
begin
  perform authz.require('finance.cost');
  perform authz.require('finance.costManage');
  if char_length(v_label) not between 1 and 60 then
    raise exception 'Γράψε ονομασία τρόπου από 1 έως 60 χαρακτήρες' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.payment_methods m
     where lower(m.label) = lower(v_label) and m.retired_at is null and m.id is distinct from p_id
  ) then
    raise exception 'Υπάρχει ήδη ενεργός τρόπος με αυτή την ονομασία' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.payment_methods (label, sort, updated_by)
    values (v_label, (select coalesce(max(m.sort), 0) + 1 from public.payment_methods m), auth.uid())
    returning id into v_id;
    return v_id;
  end if;
  update public.payment_methods m
     set label = v_label, updated_at = now(), updated_by = auth.uid()
   where m.id = p_id
  returning m.id into v_id;
  if v_id is null then
    raise exception 'Ο τρόπος δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

create function public.payment_method_retire(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('finance.cost');
  perform authz.require('finance.costManage');
  update public.payment_methods m
     set retired_at = now(), updated_at = now(), updated_by = auth.uid()
   where m.id = p_id and m.retired_at is null;
  if not found then
    raise exception 'Ο τρόπος δεν βρέθηκε ή είναι ήδη αποσυρμένος' using errcode = 'P0001';
  end if;
end;
$$;

create function public.payment_method_restore(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text;
begin
  perform authz.require('finance.cost');
  perform authz.require('finance.costManage');
  select m.label into v_label from public.payment_methods m where m.id = p_id and m.retired_at is not null;
  if not found then
    raise exception 'Ο τρόπος δεν βρέθηκε ή είναι ενεργός' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.payment_methods m
     where lower(m.label) = lower(v_label) and m.retired_at is null and m.id <> p_id
  ) then
    raise exception 'Υπάρχει ήδη ενεργός τρόπος με αυτή την ονομασία' using errcode = 'P0001';
  end if;
  update public.payment_methods m
     set retired_at = null, updated_at = now(), updated_by = auth.uid()
   where m.id = p_id;
end;
$$;

-- ───────────── Εισπράξεις: RPC ─────────────

create function public.receipt_register(
  p_client uuid, p_received_on date, p_amount numeric, p_method uuid, p_note text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform authz.require('finance.receipts');
  perform authz.require_client_exists(p_client);
  perform authz.receipt_check_input(p_amount, p_received_on, p_note);
  perform authz.require_active_method(p_method);
  insert into public.receipts (client_id, received_on, amount, method_id, note, created_by, updated_by)
  values (p_client, p_received_on, p_amount, p_method, btrim(coalesce(p_note, '')), auth.uid(), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Διόρθωση με λόγο. Ο αποσυρμένος Τρόπος περνά μόνο αν δεν αλλάζει (η παλιά Είσπραξη κρατά τον τρόπο της).
create function public.receipt_correct(
  p_id uuid, p_received_on date, p_amount numeric, p_method uuid, p_note text, p_reason text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text;
  v_before public.receipts;
  v_after public.receipts;
begin
  perform authz.require('finance.receipts');
  v_reason := authz.receipt_reason(p_reason);
  select r.* into v_before from public.receipts r where r.id = p_id and r.deleted_at is null;
  if not found then
    raise exception 'Η Είσπραξη δεν βρέθηκε ή έχει διαγραφεί' using errcode = 'P0001';
  end if;
  perform authz.receipt_check_input(p_amount, p_received_on, p_note);
  if p_method is distinct from v_before.method_id then
    perform authz.require_active_method(p_method);
  end if;
  update public.receipts r
     set received_on = p_received_on, amount = p_amount, method_id = p_method,
         note = btrim(coalesce(p_note, '')), updated_at = now(), updated_by = auth.uid()
   where r.id = p_id
  returning r.* into v_after;
  perform authz.receipt_event(p_id, 'corrected', to_jsonb(v_before), to_jsonb(v_after), v_reason);
end;
$$;

-- Διαγραφή (soft) με λόγο: φεύγει από την Καρτέλα και τα σύνολα, μένει στο Ίχνος.
create function public.receipt_delete(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text;
  v_before public.receipts;
  v_after public.receipts;
begin
  perform authz.require('finance.receipts');
  v_reason := authz.receipt_reason(p_reason);
  select r.* into v_before from public.receipts r where r.id = p_id and r.deleted_at is null;
  if not found then
    raise exception 'Η Είσπραξη δεν βρέθηκε ή έχει ήδη διαγραφεί' using errcode = 'P0001';
  end if;
  update public.receipts r
     set deleted_at = now(), deleted_by = auth.uid(), delete_reason = v_reason,
         updated_at = now(), updated_by = auth.uid()
   where r.id = p_id
  returning r.* into v_after;
  perform authz.receipt_event(p_id, 'deleted', to_jsonb(v_before), to_jsonb(v_after), v_reason);
end;
$$;

-- Λίστα Εισπράξεων, φθίνουσα ημερομηνία. Τα διαγραμμένα τα βλέπει μόνο όποιος καταχωρεί Εισπράξεις (για το Ίχνος).
create function public.receipts_view(p_client uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', r.id,
             'clientId', r.client_id,
             'clientName', c.name,
             'receivedOn', r.received_on,
             'amount', r.amount,
             'methodId', r.method_id,
             'methodLabel', m.label,
             'note', r.note,
             'createdByName', coalesce(tu.name, ''),
             'deleted', r.deleted_at is not null,
             'deleteReason', r.delete_reason,
             'can', jsonb_build_object('edit', r.deleted_at is null and authz.has('finance.receipts'))
           )
           order by r.received_on desc, r.created_at desc
         ), '[]'::jsonb)
    into v_rows
    from public.receipts r
    join public.clients c on c.id = r.client_id
    join public.payment_methods m on m.id = r.method_id
    left join public.team_users tu on tu.user_id = r.created_by
   where (p_client is null or r.client_id = p_client)
     and (r.deleted_at is null or authz.has('finance.receipts'));
  return v_rows;
end;
$$;

-- Προεπισκόπηση πριν την καταχώρηση: «Θα εξοφλήσει» και το υπόλοιπο υπέρ του Πελάτη.
create function public.receipt_preview(p_client uuid, p_amount numeric) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('finance.receipts');
  perform authz.require_client_exists(p_client);
  perform authz.receipt_check_input(p_amount, current_date, '');
  return authz.receipt_allocation(p_client, p_amount);
end;
$$;

-- ───────────── Ίχνος ─────────────

create trigger payment_methods_audit after insert or update on public.payment_methods
  for each row execute function authz.audit_row('id');
create trigger receipts_audit after insert or update on public.receipts
  for each row execute function authz.audit_row('id');

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
    -- Εισπράξεις (#150): τα ποσά μόνο για όσους βλέπουν ποσά· οι Τρόποι δεν έχουν ποσά
    when 'payment_methods' then true
    when 'receipts' then authz.has('finance.amounts')
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.receipt_check_input(numeric, date, text), authz.receipt_reason(text), authz.require_active_method(uuid),
  authz.require_client_exists(uuid), authz.client_open_invoices(uuid), authz.receipt_allocation(uuid, numeric),
  authz.receipt_event(uuid, text, jsonb, jsonb, text)
  from public, anon, authenticated;

revoke all on function
  public.payment_methods_view(), public.payment_method_save(uuid, text), public.payment_method_retire(uuid),
  public.payment_method_restore(uuid), public.receipt_register(uuid, date, numeric, uuid, text),
  public.receipt_correct(uuid, date, numeric, uuid, text, text), public.receipt_delete(uuid, text),
  public.receipts_view(uuid), public.receipt_preview(uuid, numeric)
  from public, anon;

grant execute on function
  public.payment_methods_view(), public.payment_method_save(uuid, text), public.payment_method_retire(uuid),
  public.payment_method_restore(uuid), public.receipt_register(uuid, date, numeric, uuid, text),
  public.receipt_correct(uuid, date, numeric, uuid, text, text), public.receipt_delete(uuid, text),
  public.receipts_view(uuid), public.receipt_preview(uuid, numeric)
  to authenticated;

-- Οι πίνακες είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.payment_methods, public.receipts from anon, authenticated;
