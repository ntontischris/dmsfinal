-- Ρυθμίσεις › Εταιρεία (O1) και Έλεγχος ετοιμότητας (O7). Κεφ. 5, ADR 0015.
-- Μία πηγή: ό,τι διαβάζουν οι Ρυθμίσεις το διαβάζουν και τα modules. Κάθε αλλαγή γράφεται στο Ίχνος.
-- «Μόνο Ιδιοκτήτης» (ΑΦΜ, ΔΟΥ, ΓΕΜΗ, ΦΠΑ, πλαφόν AI, λογαριασμοί τραπέζης): το επιβάλλει η βάση.

-- ───────────── Στοιχεία εταιρείας: μία γραμμή ─────────────

create table public.company_settings (
  id boolean primary key default true check (id),
  legal_name text not null default '',
  trade_name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  reply_to_email text not null default '',
  signatory_name text not null default '',
  signatory_title text not null default '',
  -- Μόνο ο Ιδιοκτήτης
  tax_id text not null default '' check (tax_id = '' or tax_id ~ '^[0-9]{9}$'),
  tax_office text not null default '',
  gemi text not null default '' check (gemi = '' or gemi ~ '^[0-9]{9,12}$'),
  vat_rate numeric(5, 2) not null default 24 check (vat_rate >= 0 and vat_rate < 100),
  ai_monthly_cap_usd numeric(8, 2) not null default 30 check (ai_monthly_cap_usd >= 0),
  ai_widget_share integer not null default 80 check (ai_widget_share between 0 and 100),
  -- Όποιος «Διαχειρίζεται Ρυθμίσεις»
  widget_messages_per_conversation integer not null default 15 check (widget_messages_per_conversation > 0),
  widget_messages_per_ip_day integer not null default 40 check (widget_messages_per_ip_day > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.company_settings default values;

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null check (length(trim(bank_name)) > 0),
  holder text not null check (length(trim(holder)) > 0),
  iban text not null check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  is_default boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  check (not (is_default and retired_at is not null))
);

create unique index bank_accounts_single_default on public.bank_accounts (is_default) where is_default;
create unique index bank_accounts_iban_unique on public.bank_accounts (iban) where retired_at is null;

-- ───────────── Έλεγχος ετοιμότητας ─────────────

-- Όσα δεν φαίνονται στα δεδομένα τα επιβεβαιώνει με το χέρι ο Ιδιοκτήτης (νομικά κείμενα, τελικές τιμές ταυτότητας κ.ά.).
create table public.readiness_confirmations (
  item text primary key check (item in ('legal_texts', 'identity_values', 'automation_texts')),
  confirmed_by uuid not null,
  confirmed_at timestamptz not null default now()
);

-- Το «Άνοιγμα σε πελάτες»: μία φορά, δεν αναιρείται.
create table public.system_state (
  id boolean primary key default true check (id),
  opened_at timestamptz,
  opened_by uuid
);

insert into public.system_state default values;

alter table public.company_settings enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.readiness_confirmations enable row level security;
alter table public.system_state enable row level security;

-- ───────────── Κανόνες ─────────────

-- Τα πεδία του Ιδιοκτήτη αλλάζουν μόνο από Ιδιοκτήτη. Ισχύει και όταν η οθόνη αφήσει κάποιον να δοκιμάσει.
create function authz.guard_company_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not authz.is_owner() and (
    new.tax_id is distinct from old.tax_id
    or new.tax_office is distinct from old.tax_office
    or new.gemi is distinct from old.gemi
    or new.vat_rate is distinct from old.vat_rate
    or new.ai_monthly_cap_usd is distinct from old.ai_monthly_cap_usd
    or new.ai_widget_share is distinct from old.ai_widget_share
  ) then
    raise exception 'Τα φορολογικά στοιχεία, τον ΦΠΑ και το πλαφόν AI τα αλλάζει μόνο ο Ιδιοκτήτης' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger company_settings_guard before update on public.company_settings
  for each row execute function authz.guard_company_settings();

-- Ο Έλεγχος ετοιμότητας (O7): μία γραμμή ανά «εκκρεμεί», υπολογισμένη από τα δεδομένα. Μία πηγή για την οθόνη
-- και για τον φραγμό του ανοίγματος. Κάθε module που χτίζεται αντικαθιστά τη δική του γραμμή «module:…».
create function authz.readiness_items()
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
  select 'booking_hours', false, 'module:filming'
  union all
  select 'catalogue', false, 'module:catalogue'
  union all
  select 'costs', false, 'module:finance'
  union all
  select 'knowledge', false, 'module:knowledge'
  union all
  select 'legal_texts', exists (select 1 from public.readiness_confirmations r where r.item = 'legal_texts'), 'confirm'
  union all
  select 'identity_values', exists (select 1 from public.readiness_confirmations r where r.item = 'identity_values'), 'confirm'
  union all
  select 'automation_texts', false, 'module:automations';
$$;

create function public.readiness()
returns table (item text, done boolean, note text)
language sql stable security definer set search_path = ''
as $$
  select r.item, r.done, r.note from authz.readiness_items() r where authz.has('settings.manage');
$$;

revoke all on function authz.readiness_items() from public;
revoke all on function public.readiness() from public, anon;
grant execute on function public.readiness() to authenticated;

-- Το άνοιγμα γίνεται μία φορά και δεν αναιρείται.
create function authz.guard_system_state() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.opened_at is not null then
    raise exception 'Το σύστημα έχει ήδη ανοίξει σε πελάτες· το άνοιγμα δεν αναιρείται' using errcode = 'P0001';
  end if;
  if new.opened_at is not null and exists (select 1 from authz.readiness_items() r where not r.done) then
    raise exception 'Υπάρχουν ακόμα «εκκρεμεί» στον Έλεγχο ετοιμότητας· το σύστημα δεν ανοίγει σε πελάτες' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger system_state_guard before update on public.system_state
  for each row execute function authz.guard_system_state();

create trigger company_settings_audit after update on public.company_settings
  for each row execute function authz.audit_row('id');
create trigger bank_accounts_audit after insert or update or delete on public.bank_accounts
  for each row execute function authz.audit_row('id');
create trigger readiness_confirmations_audit after insert or delete on public.readiness_confirmations
  for each row execute function authz.audit_row('item');
create trigger system_state_audit after update on public.system_state
  for each row execute function authz.audit_row('id');

-- ───────────── RLS ─────────────

-- Τα στοιχεία της εταιρείας τα βλέπει όλη η ομάδα (τυπώνονται σε Συμφωνίες, emails, Καρτέλα Πελάτη).
create policy "Τα στοιχεία εταιρείας τα βλέπει η ομάδα"
  on public.company_settings for select to authenticated using (authz.is_team_user());
create policy "Τα στοιχεία εταιρείας τα αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.company_settings for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));

create policy "Οι λογαριασμοί τραπέζης φαίνονται στην ομάδα"
  on public.bank_accounts for select to authenticated using (authz.is_team_user());
create policy "Λογαριασμούς τραπέζης προσθέτει μόνο ο Ιδιοκτήτης"
  on public.bank_accounts for insert to authenticated with check (authz.is_owner());
create policy "Λογαριασμούς τραπέζης αλλάζει μόνο ο Ιδιοκτήτης"
  on public.bank_accounts for update to authenticated using (authz.is_owner()) with check (authz.is_owner());

create policy "Ο Έλεγχος ετοιμότητας φαίνεται σε όποιον «Διαχειρίζεται Ρυθμίσεις»"
  on public.readiness_confirmations for select to authenticated using (authz.has('settings.manage'));
create policy "Επιβεβαιώνει μόνο ο Ιδιοκτήτης"
  on public.readiness_confirmations for insert to authenticated
  with check (authz.is_owner() and confirmed_by = auth.uid());
create policy "Αναιρεί επιβεβαίωση μόνο ο Ιδιοκτήτης"
  on public.readiness_confirmations for delete to authenticated using (authz.is_owner());

create policy "Η κατάσταση του συστήματος φαίνεται στην ομάδα"
  on public.system_state for select to authenticated using (authz.is_team_user());
create policy "Ανοίγει σε πελάτες μόνο ο Ιδιοκτήτης"
  on public.system_state for update to authenticated
  using (authz.is_owner()) with check (authz.is_owner() and opened_by = auth.uid());
