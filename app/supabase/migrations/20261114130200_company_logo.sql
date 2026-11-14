-- Λογότυπο εταιρείας (e1): ένα αρχείο εικόνας στις Ρυθμίσεις › Εταιρεία, που φαίνεται στο κέλυφος και στα email.
--  • Το αρχείο ζει στο ιδιωτικό bucket «company-logo». Καμία policy στο storage.objects: γράφει και διαβάζει μόνο ο server
--    με service role, αφού η βάση δώσει θέση (company_logo_slot) και ελέγξει το Δικαίωμα «Διαχειρίζεται Ρυθμίσεις».
--  • Το σερβίρει το route /company-logo (δημόσιο, γιατί το χρειάζονται τα email)· χωρίς λογότυπο δείχνει το προεπιλεγμένο.
--  • Μόνο PNG, JPG ή WebP (όχι SVG: δεν σερβίρεται ενεργό περιεχόμενο από το origin της εφαρμογής).
--  • Ο Έλεγχος ετοιμότητας: η γραμμή «logo» γίνεται «έτοιμο» όταν υπάρχει λογότυπο.

alter table public.company_settings
  add column logo_path text check (logo_path is null or logo_path ~ '^logo/[0-9a-f-]{36}\.(png|jpg|webp)$'),
  add column logo_type text check (logo_type is null or logo_type in ('image/png', 'image/jpeg', 'image/webp')),
  add column logo_updated_at timestamptz,
  add check ((logo_path is null) = (logo_type is null));

-- ───────────── Bucket ─────────────

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
    values ('company-logo', 'company-logo', false, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;
  else
    insert into storage.buckets (id, name, public) values ('company-logo', 'company-logo', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ───────────── Ενέργειες ─────────────

create function authz.require_logo_writer() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(authz.has('settings.manage'), false) then
    raise exception 'Το λογότυπο το αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»' using errcode = '42501';
  end if;
end;
$$;

-- Βήμα 1: θέση για το νέο αρχείο (το ανεβάζει ο server).
create function public.company_logo_slot(p_ext text) returns text
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_logo_writer();
  if p_ext is null or p_ext not in ('png', 'jpg', 'webp') then
    raise exception 'Ανέβασε PNG, JPG ή WebP' using errcode = 'P0001';
  end if;
  return 'logo/' || gen_random_uuid()::text || '.' || p_ext;
end;
$$;

-- Βήμα 2: καταχώριση (ή αντικατάσταση). Επιστρέφει την παλιά διαδρομή, για να σβηστεί το παλιό αρχείο.
create function public.company_logo_attach(p_path text, p_type text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text;
begin
  perform authz.require_logo_writer();
  if p_path is null or p_path !~ '^logo/[0-9a-f-]{36}\.(png|jpg|webp)$' then
    raise exception 'Η θέση του αρχείου δεν είναι έγκυρη' using errcode = 'P0001';
  end if;
  if p_type is null or p_type not in ('image/png', 'image/jpeg', 'image/webp') then
    raise exception 'Ανέβασε PNG, JPG ή WebP' using errcode = 'P0001';
  end if;
  select c.logo_path into v_old from public.company_settings c where c.id for update;
  update public.company_settings
     set logo_path = p_path, logo_type = p_type, logo_updated_at = now()
   where id;
  return v_old;
end;
$$;

-- Αφαίρεση: πίσω στο προεπιλεγμένο. Επιστρέφει τη διαδρομή του αρχείου που σβήνεται.
create function public.company_logo_remove() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text;
begin
  perform authz.require_logo_writer();
  select c.logo_path into v_old from public.company_settings c where c.id for update;
  update public.company_settings
     set logo_path = null, logo_type = null, logo_updated_at = now()
   where id;
  return v_old;
end;
$$;

-- Για το κέλυφος (ομάδα και πελάτες): πότε άλλαξε το λογότυπο, ή null αν δεν υπάρχει. Δεν δίνει τη διαδρομή.
create function public.company_logo_version() returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select case when c.logo_path is not null then c.logo_updated_at end
    from public.company_settings c where c.id;
$$;

-- ───────────── Έλεγχος ετοιμότητας ─────────────

-- Ίδιος ορισμός με το 20261013150000_invoice_corrections.sql· αλλάζει μόνο η γραμμή «logo».
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
  select 'logo', c.logo_path is not null, null from c
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

revoke all on function authz.require_logo_writer() from public;
revoke all on function
  public.company_logo_slot(text),
  public.company_logo_attach(text, text),
  public.company_logo_remove(),
  public.company_logo_version()
from public, anon;
grant execute on function
  public.company_logo_slot(text),
  public.company_logo_attach(text, text),
  public.company_logo_remove(),
  public.company_logo_version()
to authenticated;
