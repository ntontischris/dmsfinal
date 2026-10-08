-- Κατάλογος (C1, C2), Κόστος ώρας και Εύρος τιμής, Ρυθμίσεις › Συμφωνίες (Είδη Παροχής) και Οικονομικά (κόστος).
-- Κεφ. 3 (Κατάλογος, Συμφωνία, κόστος), κεφ. 5, ADR 0007, 0008, 0015, 0017, 0018.
--
-- Αρχές:
--  • Τα ποσά και το κόστος κρύβονται στα δεδομένα, όχι μόνο στην οθόνη (ADR 0007): η τιμή ζει σε δικό της πίνακα
--    (catalogue_item_amounts, «Βλέπει ποσά»), οι ώρες και το Άμεσο κόστος σε άλλον (catalogue_item_costs, «Βλέπει κόστος και
--    κερδοφορία»). Οι πίνακες του Καταλόγου και του κόστους είναι κλειστοί για την εφαρμογή: διαβάζονται μόνο από τη
--    public.catalogue_items_view και τις public.cost_*, που δίνουν null σε ό,τι ο Χρήστης δεν δικαιούται.
--  • Εγγραφές μόνο μέσα από συναρτήσεις (security definer, με έλεγχο Δικαιώματος στο σώμα τους). Εξαίρεση: η λίστα
--    «Είδη Παροχής» (provision_kinds), που γράφεται με RLS από όποιον «Διαχειρίζεται Ρυθμίσεις», όπως οι λίστες Πωλήσεων.
--  • Κανένα νέο Δικαίωμα: catalogue.view / catalogue.manage, finance.amounts, finance.cost, finance.costManage υπάρχουν ήδη.
--      τιμή:  βλέπει finance.amounts · γράφει catalogue.manage ΚΑΙ finance.amounts
--      ώρες:  βλέπει finance.cost · γράφει finance.costManage ΚΑΙ finance.cost
--      Άμεσο κόστος: βλέπει finance.cost · γράφει catalogue.manage ΚΑΙ finance.cost
--    (Κανείς δεν γράφει τυφλά ό,τι δεν βλέπει.)
--  • Πακέτο και Υπηρεσία δεν διαγράφονται ποτέ: αρχειοθετούνται (retired_at). Το είδος τους (Πακέτο μηνιαίο, εφάπαξ,
--    Υπηρεσία) δεν αλλάζει μετά τη δημιουργία, γιατί οι γραμμές μιας Συμφωνίας είναι ομοιογενείς (κεφ. 3).
--  • Μόνο προς τα εμπρός (ADR 0015): ο Κατάλογος δεν έχει πίνακα που να αναφέρεται στην τιμή του· η Συμφωνία αντιγράφει
--    τιμή, ώρες και κόστος όταν φτιάχνεται. Το Κόστος ώρας είναι ανά μήνα: ο κλεισμένος μήνας δεν αλλάζει ποτέ.
--  • Σημεία επέκτασης για τα επόμενα modules (με create or replace):
--      public.catalogue_item_uses(item)   Συμφωνίες: πόσες γραμμές Συμφωνίας (σε οποιαδήποτε κατάσταση) αντέγραψαν το στοιχείο
--      public.provision_kind_uses(kind)   Συμφωνίες: προσθέτει τις Παροχές των γραμμών και των Παραδοτέων
--      authz.audit_entity_allowed(entity) Οικονομικά και κάθε νέος πίνακας με ποσά ή κόστος: προσθέτει τον πίνακά του
--      authz.readiness_items()            Οικονομικά: η γραμμή «costs» θέλει και τα έξοδα ανά κατηγορία
--    Επίσης οι ώρες/Κόστος ώρας που θα διαβάσει το module Παραγωγές είναι οι public.cost_months και public.cost_settings.

-- ───────────── Είδη Παροχής (λίστα Ρυθμίσεων, ADR 0015) ─────────────
-- Τι δουλειά δίνει μια Παροχή: Γύρισμα, reel, φωτογραφία… Φτάνει σε πελάτη, άρα ελληνικά ΚΑΙ αγγλικά (κεφ. 5).
-- Ο Τρόπος μέτρησης και η προεπιλεγμένη διάρκεια είναι για τα Γυρίσματα· τα άλλα πεδία του είδους (Όριο αλλαγών, προθεσμία)
-- τα προσθέτουν τα modules Συμφωνίες και Παραδοτέα στα δικά τους migrations.

create table public.provision_kinds (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  label text not null check (length(trim(label)) > 0),
  label_en text not null check (length(trim(label_en)) > 0),
  unit text not null check (length(trim(unit)) > 0),
  unit_en text not null check (length(trim(unit_en)) > 0),
  -- null = μετράει σε πλήθος. Οι τρεις τρόποι είναι σταθεροί (κεφ. 5).
  measure text check (measure in ('per_filming', 'per_hour', 'per_day')),
  default_hours numeric(4, 1) check (default_hours > 0 and default_hours <= 24),
  sort integer not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  check (default_hours is null or measure is not null)
);

create unique index provision_kinds_label_active on public.provision_kinds (lower(label)) where retired_at is null;

-- ───────────── Κατάλογος: Πακέτα και Υπηρεσίες ─────────────
-- Εδώ μένουν μόνο όσα δεν είναι ποσά ή κόστος. Η Υπηρεσία έχει μονάδα («ανά reel»), το Πακέτο έχει είδος χρέωσης.

create table public.catalogue_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('package', 'service')),
  billing text check (billing in ('monthly', 'one_off')),
  name text not null check (length(trim(name)) > 0),
  name_en text not null default '',
  -- Εσωτερική περιγραφή. Ό,τι βλέπει ο πελάτης ή ο Επισκέπτης γράφεται στο description_public.
  description text not null default '',
  unit text not null default '',
  is_public boolean not null default false,
  shows_price boolean not null default false,
  description_public text not null default '',
  description_public_en text not null default '',
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((kind = 'package') = (billing is not null)),
  check ((kind = 'service') = (length(trim(unit)) > 0)),
  check (kind = 'package' or (not is_public and not shows_price)),
  check (not is_public or (length(trim(description_public)) > 0 and retired_at is null))
);

create unique index catalogue_items_name_active on public.catalogue_items (lower(name)) where retired_at is null;

-- Τιμή χωρίς ΦΠΑ. Ο ΦΠΑ δεν αποθηκεύεται στο στοιχείο (κεφ. 3).
create table public.catalogue_item_amounts (
  item_id uuid primary key references public.catalogue_items (id),
  price numeric(12, 2) not null default 0 check (price >= 0 and price < 10000000)
);

-- Εκτιμώμενες ώρες (γυρίσματος, μοντάζ) και Άμεσο κόστος. Εσωτερικά: ο πελάτης βλέπει Παροχές, όχι ώρες.
create table public.catalogue_item_costs (
  item_id uuid primary key references public.catalogue_items (id),
  hours_shoot numeric(6, 1) not null default 0 check (hours_shoot >= 0 and hours_shoot <= 999),
  hours_edit numeric(6, 1) not null default 0 check (hours_edit >= 0 and hours_edit <= 999),
  direct_cost numeric(12, 2) not null default 0 check (direct_cost >= 0 and direct_cost < 10000000),
  direct_cost_note text not null default ''
);

-- Παροχές ανά περίοδο (μηνιαίο Πακέτο) ή συνολικά (εφάπαξ). Στην Υπηρεσία: όσα δίνει η μία μονάδα.
create table public.catalogue_item_provisions (
  item_id uuid not null references public.catalogue_items (id),
  kind_id uuid not null references public.provision_kinds (id),
  quantity integer not null check (quantity between 1 and 999),
  primary key (item_id, kind_id)
);

create index catalogue_item_provisions_kind_idx on public.catalogue_item_provisions (kind_id);

-- ───────────── Κόστος ώρας ανά μήνα και πολλαπλασιαστές του Εύρους ─────────────
-- Το Κόστος ώρας ενός μήνα = έξοδα του μήνα ÷ αναμενόμενες παραγωγικές ώρες. Ισχύει για τον μήνα και μετά, μέχρι να οριστεί
-- νεότερος μήνας. Τα έξοδα εδώ είναι ένα σύνολο· η ανάλυση σε κατηγορίες και υπο-γραμμές έρχεται με το module Οικονομικά.

create table public.cost_months (
  month date primary key check (extract(day from month) = 1),
  expenses_total numeric(12, 2) not null check (expenses_total >= 0 and expenses_total < 100000000),
  productive_hours numeric(7, 1) not null check (productive_hours > 0 and productive_hours <= 10000),
  hour_cost numeric(10, 2) generated always as (round(expenses_total / productive_hours, 2)) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Μία γραμμή. Το Ελάχιστο περιθώριο δεν έχει δική του ρύθμιση: βγαίνει από τον ελάχιστο πολλαπλασιαστή (ADR 0017).
create table public.cost_settings (
  id boolean primary key default true check (id),
  multiplier_min numeric(4, 2) not null default 1.30,
  multiplier_target numeric(4, 2) not null default 1.60,
  multiplier_max numeric(4, 2) not null default 2.00,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (multiplier_min >= 1 and multiplier_min <= multiplier_target and multiplier_target <= multiplier_max and multiplier_max <= 20)
);

insert into public.cost_settings default values;

alter table public.provision_kinds enable row level security;
alter table public.catalogue_items enable row level security;
alter table public.catalogue_item_amounts enable row level security;
alter table public.catalogue_item_costs enable row level security;
alter table public.catalogue_item_provisions enable row level security;
alter table public.cost_months enable row level security;
alter table public.cost_settings enable row level security;

-- ───────────── Αρχικές τιμές (ADR 0015: προτεινόμενες τιμές στο πρώτο στήσιμο) ─────────────

insert into public.provision_kinds (code, label, label_en, unit, unit_en, measure, default_hours, sort) values
  ('shoot', 'Γύρισμα', 'Shoot', 'Γυρίσματα', 'shoots', 'per_filming', 4.0, 10),
  ('reel', 'reel', 'Reel', 'reels', 'reels', null, null, 20),
  ('video', 'βίντεο', 'Video', 'βίντεο', 'videos', null, null, 30),
  ('photo', 'φωτογραφία', 'Photo', 'φωτογραφίες', 'photos', null, null, 40),
  ('podcast_episode', 'επεισόδιο podcast', 'Podcast episode', 'επεισόδια podcast', 'podcast episodes', null, null, 50);

-- ───────────── Βοηθητικές συναρτήσεις ─────────────
-- Εσωτερικές: δεν δίνονται σε κανέναν ρόλο εφαρμογής (βλ. τέλος του αρχείου).

-- Ο τρέχων μήνας στην Ελλάδα (η «ώρα» της επιχείρησης είναι πάντα ώρα Ελλάδας, κεφ. 5).
create function authz.athens_month_start() returns date
language sql stable set search_path = ''
as $$ select date_trunc('month', now() at time zone 'Europe/Athens')::date; $$;

-- Σημείο επέκτασης (Συμφωνίες): πόσες γραμμές Συμφωνίας, σε οποιαδήποτε κατάσταση, αντέγραψαν το στοιχείο.
create function public.catalogue_item_uses(p_item uuid) returns bigint
language sql stable security definer set search_path = ''
as $$ select 0::bigint; $$;

-- Πόσα στοιχεία Καταλόγου έχουν αυτό το είδος Παροχής. Οι Συμφωνίες προσθέτουν τις δικές τους χρήσεις.
create function public.provision_kind_uses(p_kind uuid) returns bigint
language sql stable security definer set search_path = ''
as $$ select count(*) from public.catalogue_item_provisions p where p.kind_id = p_kind; $$;

-- Βλέπει ο Χρήστης τον Κατάλογο; Όποιος «Διαχειρίζεται Κατάλογο» τον βλέπει και χωρίς το «Βλέπει Κατάλογο».
create function authz.can_view_catalogue() returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.has('catalogue.view') or authz.has('catalogue.manage'); $$;

-- Το κόστος γράφει μόνο όποιος «Διαχειρίζεται κόστος» και το βλέπει («Βλέπει κόστος και κερδοφορία»).
create function authz.can_manage_cost() returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.has('finance.costManage') and authz.has('finance.cost'); $$;

-- Ίχνος ενεργειών: οι γραμμές με ποσά ή κόστος φαίνονται μόνο σε όποιον βλέπει και τα ίδια τα ποσά ή το κόστος (ADR 0007).
-- Σημείο επέκτασης: κάθε νέος πίνακας με χρήματα προσθέτει τον εαυτό του εδώ.
create function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    else true
  end;
$$;

-- ───────────── Κανόνες που ισχύουν για όλους, και για τον service role (triggers) ─────────────

-- Είδη Παροχής: ό,τι χρησιμοποιήθηκε δεν διαγράφεται, αποσύρεται (ADR 0015). Η λίστα δεν μένει χωρίς ενεργή τιμή.
create function authz.guard_provision_kind() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  active_others integer;
begin
  if tg_op = 'INSERT' then
    -- Ο Χρήστης της εφαρμογής δεν ορίζει αναγνωριστικό ή απόσυρση: αυτά μπαίνουν μόνο από migration/service.
    if auth.uid() is not null then
      new.code := null;
      new.retired_at := null;
    end if;
    new.created_at := now();
    new.created_by := auth.uid();
    return new;
  end if;

  if tg_op = 'DELETE' then
    if public.provision_kind_uses(old.id) > 0 then
      raise exception 'Το είδος Παροχής «%» έχει ήδη χρησιμοποιηθεί και δεν διαγράφεται· αποσύρεται', old.label
        using errcode = 'P0001';
    end if;
  elsif new.code is distinct from old.code or new.created_at is distinct from old.created_at then
    raise exception 'Το αναγνωριστικό ενός είδους Παροχής δεν αλλάζει' using errcode = 'P0001';
  end if;

  if old.retired_at is null and (tg_op = 'DELETE' or new.retired_at is not null) then
    select count(*) into active_others from public.provision_kinds k where k.retired_at is null and k.id <> old.id;
    if active_others = 0 then
      raise exception 'Χρειάζεται τουλάχιστον ένα ενεργό είδος Παροχής' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger provision_kinds_guard before insert or update or delete on public.provision_kinds
  for each row execute function authz.guard_provision_kind();

-- Στοιχείο Καταλόγου: το είδος δεν αλλάζει, δεν διαγράφεται, το αρχειοθετημένο δεν είναι δημόσιο.
create function authz.guard_catalogue_item() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Ο Κατάλογος δεν διαγράφει Πακέτα και Υπηρεσίες· τα αρχειοθετεί' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    if new.id <> old.id or new.kind <> old.kind or new.billing is distinct from old.billing
       or new.created_at is distinct from old.created_at then
      raise exception 'Το είδος ενός Πακέτου ή μιας Υπηρεσίας δεν αλλάζει μετά τη δημιουργία' using errcode = 'P0001';
    end if;
  end if;
  if new.retired_at is not null then
    new.is_public := false;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger catalogue_items_guard before insert or update or delete on public.catalogue_items
  for each row execute function authz.guard_catalogue_item();

-- Κόστος ώρας: ο κλεισμένος μήνας δεν αλλάζει και κανένας μήνας δεν σβήνεται (ADR 0015, 0017). Ισχύει και για τον service role.
-- Μόνο μια εισαγωγή από migration/service (auth.uid() null) μπορεί να βάλει μήνα που πέρασε, π.χ. ιστορικά δεδομένα.
create function authz.guard_cost_month() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Το Κόστος ώρας ενός μήνα δεν σβήνεται' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    if new.month <> old.month or new.created_at is distinct from old.created_at then
      raise exception 'Ο μήνας ενός Κόστους ώρας δεν αλλάζει' using errcode = 'P0001';
    end if;
    if old.month < authz.athens_month_start() then
      raise exception 'Ο μήνας έχει κλείσει· το Κόστος ώρας του δεν αλλάζει' using errcode = 'P0001';
    end if;
  else
    if auth.uid() is not null and new.month < authz.athens_month_start() then
      raise exception 'Ο μήνας έχει κλείσει· δεν ανοίγει Κόστος ώρας για μήνα που πέρασε' using errcode = 'P0001';
    end if;
    new.created_at := now();
    new.created_by := auth.uid();
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger cost_months_guard before insert or update or delete on public.cost_months
  for each row execute function authz.guard_cost_month();

create function authz.guard_cost_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger cost_settings_guard before update on public.cost_settings
  for each row execute function authz.guard_cost_settings();

-- ───────────── Ανάγνωση (το μόνο που διαβάζει η εφαρμογή για τον Κατάλογο και το κόστος) ─────────────

-- Η λίστα και η σελίδα στοιχείου (C1, C2): μία συνάρτηση. Τιμή μόνο με «Βλέπει ποσά», ώρες και Άμεσο κόστος μόνο με «Βλέπει
-- κόστος και κερδοφορία», χρήσεις και αρχειοθετημένα μόνο με «Διαχειρίζεται Κατάλογο». Χωρίς δικαίωμα: καμία γραμμή.
-- Οι Παροχές έρχονται ως [{kind_id, quantity}] με τη σειρά της λίστας Ειδών Παροχής.
create function public.catalogue_items_view(p_item uuid default null, p_with_retired boolean default false)
returns table (
  id uuid, kind text, billing text, name text, name_en text, description text, unit text,
  is_public boolean, shows_price boolean, description_public text, description_public_en text, is_retired boolean,
  price numeric, hours_shoot numeric, hours_edit numeric, direct_cost numeric, direct_cost_note text,
  provisions jsonb, uses bigint, updated_at timestamptz, updated_by_name text
)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.kind, i.billing, i.name, i.name_en, i.description, i.unit,
         i.is_public, i.shows_price, i.description_public, i.description_public_en,
         coalesce(i.retired_at is not null, false),
         case when authz.has('finance.amounts') then a.price end,
         case when authz.has('finance.cost') then c.hours_shoot end,
         case when authz.has('finance.cost') then c.hours_edit end,
         case when authz.has('finance.cost') then c.direct_cost end,
         case when authz.has('finance.cost') then c.direct_cost_note end,
         coalesce((
           select jsonb_agg(jsonb_build_object('kind_id', p.kind_id, 'quantity', p.quantity) order by k.sort, k.id)
             from public.catalogue_item_provisions p
             join public.provision_kinds k on k.id = p.kind_id
            where p.item_id = i.id
         ), '[]'::jsonb),
         case when authz.has('catalogue.manage') then public.catalogue_item_uses(i.id) end,
         i.updated_at,
         u.name
    from public.catalogue_items i
    left join public.catalogue_item_amounts a on a.item_id = i.id
    left join public.catalogue_item_costs c on c.item_id = i.id
    left join public.team_users u on u.user_id = i.updated_by
   where authz.can_view_catalogue()
     and (p_item is null or i.id = p_item)
     and (i.retired_at is null or (authz.has('catalogue.manage') and (p_with_retired or p_item is not null)))
   order by i.kind, lower(i.name), i.id;
$$;

-- Μήνες Κόστους ώρας (νεότερος πρώτος). Μόνο «Βλέπει κόστος και κερδοφορία».
create function public.cost_months_view()
returns table (
  month date, expenses_total numeric, productive_hours numeric, hour_cost numeric,
  is_closed boolean, updated_at timestamptz, updated_by_name text
)
language sql stable security definer set search_path = ''
as $$
  select m.month, m.expenses_total, m.productive_hours, m.hour_cost,
         coalesce(m.month < authz.athens_month_start(), false),
         m.updated_at, u.name
    from public.cost_months m
    left join public.team_users u on u.user_id = m.updated_by
   where authz.has('finance.cost')
   order by m.month desc;
$$;

-- Ό,τι χρειάζεται η ένδειξη κόστους και περιθωρίου (C1, C2): το Κόστος ώρας που ισχύει σήμερα (του τρέχοντος μήνα ή, αν δεν
-- έχει οριστεί ακόμα, του πιο πρόσφατου μήνα πριν από αυτόν) και οι τρεις πολλαπλασιαστές. Μία γραμμή, μόνο με «Βλέπει κόστος».
create function public.cost_hint()
returns table (
  hour_cost_month date, hour_cost numeric, multiplier_min numeric, multiplier_target numeric, multiplier_max numeric
)
language sql stable security definer set search_path = ''
as $$
  select m.month, m.hour_cost, s.multiplier_min, s.multiplier_target, s.multiplier_max
    from public.cost_settings s
    left join lateral (
      select cm.month, cm.hour_cost
        from public.cost_months cm
       where cm.month <= authz.athens_month_start()
       order by cm.month desc
       limit 1
    ) m on true
   where authz.has('finance.cost');
$$;

-- Χρήσεις ανά είδος Παροχής (για Ρυθμίσεις › Συμφωνίες): «Σε χρήση σε N» ή «Νέα».
create function public.catalogue_kind_usage()
returns table (kind_id uuid, uses bigint)
language sql stable security definer set search_path = ''
as $$
  select k.id, public.provision_kind_uses(k.id)
    from public.provision_kinds k
   where authz.has('settings.manage');
$$;

-- ───────────── Εγγραφή: Κατάλογος ─────────────

-- Οι Παροχές ενός στοιχείου, ως [{kind_id, quantity}]: αντικαθιστούν τις υπάρχουσες, αλλά αλλάζουν μόνο ό,τι διαφέρει.
-- Αποσυρμένο είδος Παροχής δεν μπαίνει σε στοιχείο που δεν το έχει ήδη. Το Πακέτο θέλει τουλάχιστον μία Παροχή.
create function authz.apply_provisions(p_item uuid, p_provisions jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
  v_ids uuid[];
  v_qty integer[];
  v_bad text;
begin
  select i.kind into v_kind from public.catalogue_items i where i.id = p_item;
  if v_kind is null then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν υπάρχει' using errcode = 'P0001';
  end if;
  if p_provisions is null or jsonb_typeof(p_provisions) <> 'array' then
    raise exception 'Οι Παροχές δεν διαβάστηκαν· δοκίμασε ξανά' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(x.kind_id), '{}'), coalesce(array_agg(x.quantity), '{}')
    into v_ids, v_qty
    from jsonb_to_recordset(p_provisions) as x (kind_id uuid, quantity integer);
  if exists (select 1 from unnest(v_qty) q where q is null or q < 1 or q > 999) then
    raise exception 'Η ποσότητα κάθε Παροχής είναι ακέραιος από 1 έως 999' using errcode = 'P0001';
  end if;
  if (select count(distinct k) from unnest(v_ids) k) <> cardinality(v_ids) then
    raise exception 'Κάθε είδος Παροχής μπαίνει μία φορά' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(v_ids) u (id) where not exists (select 1 from public.provision_kinds k where k.id = u.id)) then
    raise exception 'Άγνωστο είδος Παροχής' using errcode = 'P0001';
  end if;
  select k.label into v_bad
    from public.provision_kinds k
   where k.id = any (v_ids) and k.retired_at is not null
     and not exists (select 1 from public.catalogue_item_provisions p where p.item_id = p_item and p.kind_id = k.id)
   limit 1;
  if v_bad is not null then
    raise exception 'Το είδος Παροχής «%» έχει αποσυρθεί και δεν επιλέγεται σε νέα στοιχεία', v_bad using errcode = 'P0001';
  end if;
  if v_kind = 'package' and cardinality(v_ids) = 0 then
    raise exception 'Ένα Πακέτο έχει τουλάχιστον μία Παροχή' using errcode = 'P0001';
  end if;

  delete from public.catalogue_item_provisions p where p.item_id = p_item and not (p.kind_id = any (v_ids));
  insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
  select p_item, u.id, u.q from unnest(v_ids, v_qty) as u (id, q)
  on conflict (item_id, kind_id) do update set quantity = excluded.quantity
    where public.catalogue_item_provisions.quantity is distinct from excluded.quantity;
end;
$$;

-- Νέο Πακέτο (p_kind 'package' + p_billing) ή Υπηρεσία (p_kind 'service' + p_unit). Η τιμή είναι προαιρετική και θέλει
-- «Βλέπει ποσά»· χωρίς αυτήν το στοιχείο ξεκινά με 0 και η τιμή μπαίνει αργότερα από όποιον τη δικαιούται.
create function public.catalogue_create_item(
  p_kind text, p_billing text, p_name text, p_description text, p_unit text,
  p_price numeric default null, p_provisions jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform authz.require('catalogue.manage');
  if p_kind not in ('package', 'service') then
    raise exception 'Διάλεξε Πακέτο ή Υπηρεσία' using errcode = 'P0001';
  end if;
  if p_kind = 'package' and coalesce(p_billing, '') not in ('monthly', 'one_off') then
    raise exception 'Διάλεξε αν το Πακέτο είναι μηνιαίο ή εφάπαξ' using errcode = 'P0001';
  end if;
  if p_kind = 'service' and length(trim(coalesce(p_unit, ''))) = 0 then
    raise exception 'Η Υπηρεσία θέλει μονάδα (π.χ. ανά reel)' using errcode = 'P0001';
  end if;
  if p_price is not null then
    perform authz.require('finance.amounts');
    -- Μήνυμα στα ελληνικά αντί για το 22003 της numeric(12,2) που θα έβλεπε ο Χρήστης.
    if round(p_price, 2) >= 10000000 then
      raise exception 'Η τιμή πρέπει να είναι μικρότερη από 10.000.000 €' using errcode = 'P0001';
    end if;
  end if;

  insert into public.catalogue_items (kind, billing, name, description, unit)
  values (
    p_kind,
    case when p_kind = 'package' then p_billing end,
    trim(coalesce(p_name, '')),
    trim(coalesce(p_description, '')),
    case when p_kind = 'service' then trim(p_unit) else '' end
  )
  returning id into v_id;
  insert into public.catalogue_item_amounts (item_id, price) values (v_id, coalesce(p_price, 0));
  insert into public.catalogue_item_costs (item_id) values (v_id);
  perform authz.apply_provisions(v_id, p_provisions);
  return v_id;
end;
$$;

-- Όνομα, περιγραφή, μονάδα (Υπηρεσία) και τιμή. Η τιμή (null = δεν αλλάζει) θέλει «Βλέπει ποσά» και ισχύει για νέες προτάσεις:
-- οι Συμφωνίες κρατούν το αντίγραφό τους.
create function public.catalogue_update_item(
  p_item uuid, p_name text, p_description text, p_unit text, p_price numeric default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
  v_price_rows integer := 0;
  v_name text := trim(coalesce(p_name, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_unit text;
begin
  perform authz.require('catalogue.manage');
  select i.kind into v_kind from public.catalogue_items i where i.id = p_item for update;
  if v_kind is null then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν υπάρχει' using errcode = 'P0001';
  end if;
  if v_kind = 'service' and length(trim(coalesce(p_unit, ''))) = 0 then
    raise exception 'Η Υπηρεσία θέλει μονάδα (π.χ. ανά reel)' using errcode = 'P0001';
  end if;
  v_unit := case when v_kind = 'service' then trim(p_unit) else '' end;
  if p_price is not null then
    perform authz.require('finance.amounts');
    if round(p_price, 2) >= 10000000 then
      raise exception 'Η τιμή πρέπει να είναι μικρότερη από 10.000.000 €' using errcode = 'P0001';
    end if;
    update public.catalogue_item_amounts a set price = p_price where a.item_id = p_item and a.price is distinct from p_price;
    get diagnostics v_price_rows = row_count;
  end if;
  -- Το «τελευταία αλλαγή» ανεβαίνει μόνο όταν κάτι άλλαξε πραγματικά (τιμή ή στοιχεία), όχι σε αποθήκευση χωρίς αλλαγή.
  update public.catalogue_items i
     set name = v_name, description = v_description, unit = v_unit
   where i.id = p_item
     and (v_price_rows > 0 or (i.name, i.description, i.unit) is distinct from (v_name, v_description, v_unit));
end;
$$;

create function public.catalogue_set_provisions(p_item uuid, p_provisions jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('catalogue.manage');
  perform 1 from public.catalogue_items i where i.id = p_item for update;
  perform authz.apply_provisions(p_item, p_provisions);
  update public.catalogue_items i set updated_at = now() where i.id = p_item;
end;
$$;

-- Ώρες γυρίσματος/μοντάζ (null = δεν αλλάζουν): μόνο όποιος «Διαχειρίζεται κόστος» και βλέπει τον Κατάλογο.
-- Άμεσο κόστος και σημείωση (null = δεν αλλάζουν): όποιος «Διαχειρίζεται Κατάλογο» και «Βλέπει κόστος και κερδοφορία».
create function public.catalogue_set_cost(
  p_item uuid, p_hours_shoot numeric default null, p_hours_edit numeric default null,
  p_direct_cost numeric default null, p_direct_cost_note text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows integer;
  v_changed boolean := false;
begin
  if not authz.can_view_catalogue() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  -- Καμία τιμή προς αλλαγή: όποιος δεν δικαιούται να γράψει κανένα πεδίο παίρνει άρνηση, στους υπόλοιπους δεν γίνεται τίποτα.
  -- Έτσι το «τελευταία αλλαγή» δεν αγγίζεται ποτέ χωρίς αλλαγή που επιτρέπεται.
  if p_hours_shoot is null and p_hours_edit is null and p_direct_cost is null and p_direct_cost_note is null then
    if not (authz.can_manage_cost() or (authz.has('catalogue.manage') and authz.has('finance.cost'))) then
      raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
    end if;
    return;
  end if;
  perform 1 from public.catalogue_items i
   where i.id = p_item and (i.retired_at is null or authz.has('catalogue.manage')) for update;
  if not found then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν υπάρχει' using errcode = 'P0001';
  end if;
  if p_hours_shoot is not null or p_hours_edit is not null then
    if not authz.can_manage_cost() then
      raise exception 'Τις ώρες τις αλλάζει όποιος «Διαχειρίζεται κόστος»' using errcode = '42501';
    end if;
    if round(p_hours_shoot, 1) > 999 or round(p_hours_edit, 1) > 999 then
      raise exception 'Οι ώρες δεν μπορούν να ξεπερνούν τις 999' using errcode = 'P0001';
    end if;
    update public.catalogue_item_costs c
       set hours_shoot = coalesce(p_hours_shoot, c.hours_shoot), hours_edit = coalesce(p_hours_edit, c.hours_edit)
     where c.item_id = p_item
       and (c.hours_shoot, c.hours_edit)
           is distinct from (round(coalesce(p_hours_shoot, c.hours_shoot), 1), round(coalesce(p_hours_edit, c.hours_edit), 1));
    get diagnostics v_rows = row_count;
    v_changed := v_changed or v_rows > 0;
  end if;
  if p_direct_cost is not null or p_direct_cost_note is not null then
    if not (authz.has('catalogue.manage') and authz.has('finance.cost')) then
      raise exception 'Το Άμεσο κόστος το αλλάζει όποιος «Διαχειρίζεται Κατάλογο» και «Βλέπει κόστος και κερδοφορία»'
        using errcode = '42501';
    end if;
    if round(p_direct_cost, 2) >= 10000000 then
      raise exception 'Το Άμεσο κόστος πρέπει να είναι μικρότερο από 10.000.000 €' using errcode = 'P0001';
    end if;
    update public.catalogue_item_costs c
       set direct_cost = coalesce(p_direct_cost, c.direct_cost),
           direct_cost_note = coalesce(trim(p_direct_cost_note), c.direct_cost_note)
     where c.item_id = p_item
       and (c.direct_cost, c.direct_cost_note)
           is distinct from (round(coalesce(p_direct_cost, c.direct_cost), 2), coalesce(trim(p_direct_cost_note), c.direct_cost_note));
    get diagnostics v_rows = row_count;
    v_changed := v_changed or v_rows > 0;
  end if;
  if v_changed then
    update public.catalogue_items i set updated_at = now() where i.id = p_item;
  end if;
end;
$$;

-- «Δημόσιο» στην Ιστοσελίδα, με ή χωρίς ένδειξη «από Χ € + ΦΠΑ», και τα κείμενα που βλέπει ο Επισκέπτης.
-- Ελληνικά υποχρεωτικά για δημόσιο Πακέτο· αγγλικά προαιρετικά (χωρίς αυτά δεν φαίνεται στο /en, κεφ. 9).
create function public.catalogue_set_public(
  p_item uuid, p_is_public boolean, p_shows_price boolean, p_name_en text,
  p_description_public text, p_description_public_en text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
  v_retired timestamptz;
begin
  perform authz.require('catalogue.manage');
  select i.kind, i.retired_at into v_kind, v_retired from public.catalogue_items i where i.id = p_item for update;
  if v_kind is null then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν υπάρχει' using errcode = 'P0001';
  end if;
  if v_kind <> 'package' then
    raise exception 'Μόνο τα Πακέτα γίνονται δημόσια' using errcode = 'P0001';
  end if;
  if coalesce(p_is_public, false) and v_retired is not null then
    raise exception 'Ένα αρχειοθετημένο Πακέτο δεν γίνεται δημόσιο' using errcode = 'P0001';
  end if;
  if coalesce(p_is_public, false) and length(trim(coalesce(p_description_public, ''))) = 0 then
    raise exception 'Ένα δημόσιο Πακέτο θέλει σύντομη περιγραφή στα ελληνικά' using errcode = 'P0001';
  end if;
  update public.catalogue_items i
     set is_public = coalesce(p_is_public, false),
         shows_price = coalesce(p_shows_price, false),
         name_en = trim(coalesce(p_name_en, '')),
         description_public = trim(coalesce(p_description_public, '')),
         description_public_en = trim(coalesce(p_description_public_en, ''))
   where i.id = p_item;
end;
$$;

-- Αρχειοθέτηση: φεύγει από τις νέες προτάσεις και από την Ιστοσελίδα· οι Συμφωνίες που το έχουν συνεχίζουν. Δεν υπάρχει διαγραφή.
create function public.catalogue_retire_item(p_item uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('catalogue.manage');
  update public.catalogue_items i set retired_at = now() where i.id = p_item and i.retired_at is null;
  if not found then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν υπάρχει ή είναι ήδη αρχειοθετημένο' using errcode = 'P0001';
  end if;
end;
$$;

-- Επαναφορά: ξανά διαθέσιμο σε νέες προτάσεις. Δεν γίνεται αυτόματα δημόσιο.
create function public.catalogue_restore_item(p_item uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('catalogue.manage');
  update public.catalogue_items i set retired_at = null where i.id = p_item and i.retired_at is not null;
  if not found then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν υπάρχει ή δεν είναι αρχειοθετημένο' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Εγγραφή: Ρυθμίσεις › Συμφωνίες (Είδη Παροχής) ─────────────

-- Αλλαγή σειράς: ανταλλάσσει θέση με τη γειτονική ενεργή τιμή. p_direction: up | down.
create function public.catalogue_move_kind(p_id uuid, p_direction text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  cur integer;
  other_id uuid;
  other_sort integer;
begin
  perform authz.require('settings.manage');
  if p_direction not in ('up', 'down') then
    raise exception 'Άγνωστη κατεύθυνση' using errcode = 'P0001';
  end if;
  select k.sort into cur from public.provision_kinds k where k.id = p_id;
  if cur is null then
    raise exception 'Το είδος Παροχής δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_direction = 'up' then
    select k.id, k.sort into other_id, other_sort from public.provision_kinds k
     where k.retired_at is null and (k.sort, k.id) < (cur, p_id) order by k.sort desc, k.id desc limit 1;
  else
    select k.id, k.sort into other_id, other_sort from public.provision_kinds k
     where k.retired_at is null and (k.sort, k.id) > (cur, p_id) order by k.sort, k.id limit 1;
  end if;
  if other_id is null then
    return;
  end if;
  update public.provision_kinds k set sort = other_sort where k.id = p_id;
  update public.provision_kinds k set sort = cur where k.id = other_id;
end;
$$;

-- ───────────── Εγγραφή: Ρυθμίσεις › Οικονομικά (κόστος) ─────────────

-- Έξοδα και παραγωγικές ώρες ενός μήνα (άρα και Κόστος ώρας). Μόνο ο τρέχων μήνας και οι επόμενοι: αλλαγή ισχύει από τον
-- τρέχοντα μήνα και μετά, ο κλεισμένος μήνας δεν αλλάζει. Όποιος «Διαχειρίζεται κόστος» (αρχικά μόνο ο Ιδιοκτήτης).
create function public.cost_save_month(p_month date, p_expenses_total numeric, p_productive_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date;
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_month is null then
    raise exception 'Διάλεξε μήνα' using errcode = 'P0001';
  end if;
  if p_expenses_total is null or p_expenses_total < 0 or p_productive_hours is null or p_productive_hours <= 0 then
    raise exception 'Τα έξοδα δεν είναι αρνητικά και οι παραγωγικές ώρες είναι πάνω από 0' using errcode = 'P0001';
  end if;
  v_month := p_month - (extract(day from p_month)::integer - 1);
  if v_month < authz.athens_month_start() then
    raise exception 'Ο μήνας έχει κλείσει· το Κόστος ώρας του δεν αλλάζει' using errcode = 'P0001';
  end if;
  insert into public.cost_months (month, expenses_total, productive_hours)
  values (v_month, p_expenses_total, p_productive_hours)
  on conflict (month) do update
    set expenses_total = excluded.expenses_total, productive_hours = excluded.productive_hours
    -- Ίδιες τιμές: καμία εγγραφή, άρα ούτε «τελευταία αλλαγή» ούτε γραμμή στο Ίχνος.
    where (public.cost_months.expenses_total, public.cost_months.productive_hours)
          is distinct from (excluded.expenses_total, excluded.productive_hours);
end;
$$;

-- Οι τρεις πολλαπλασιαστές του Εύρους τιμής. Το Ελάχιστο περιθώριο βγαίνει από τον ελάχιστο: δεν έχει δική του ρύθμιση.
create function public.cost_save_multipliers(p_min numeric, p_target numeric, p_max numeric) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_min is null or p_target is null or p_max is null
     or p_min < 1 or p_min > p_target or p_target > p_max or p_max > 20 then
    raise exception 'Οι πολλαπλασιαστές ξεκινούν από 1 και ανεβαίνουν: ελάχιστη, στόχος, μέγιστη' using errcode = 'P0001';
  end if;
  update public.cost_settings s
     set multiplier_min = p_min, multiplier_target = p_target, multiplier_max = p_max
   where s.id
     and (s.multiplier_min, s.multiplier_target, s.multiplier_max)
         is distinct from (round(p_min, 2), round(p_target, 2), round(p_max, 2));
end;
$$;

-- ───────────── Έλεγχος ετοιμότητας: τα δύο «module:…» που κλείνουν εδώ ─────────────
-- Ίδιος ορισμός με το 20261007181517_company_settings.sql· αλλάζουν μόνο οι γραμμές «catalogue» και «costs».
--   catalogue: υπάρχει ενεργό στοιχείο και κανένα ενεργό δεν έχει μείνει χωρίς τιμή (κεφ. 5: «Πακέτα, Υπηρεσίες, τιμές»).
--   costs:     ο μήνας που ισχύει σήμερα (ο πιο πρόσφατος ως τον τρέχοντα) έχει έξοδα· ένας παλιός μήνας με έξοδα δεν σώζει τον τρέχοντα με 0. Το module Οικονομικά θα θέλει και τα έξοδα ανά κατηγορία.

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
  select 'booking_hours', false, 'module:filming'
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
  select 'knowledge', false, 'module:knowledge'
  union all
  select 'legal_texts', exists (select 1 from public.readiness_confirmations r where r.item = 'legal_texts'), 'confirm'
  union all
  select 'identity_values', exists (select 1 from public.readiness_confirmations r where r.item = 'identity_values'), 'confirm'
  union all
  select 'automation_texts', false, 'module:automations';
$$;

-- ───────────── Δικαιώματα εκτέλεσης συναρτήσεων ─────────────
-- Αρχικά κανείς. Μετά ανοίγουν ρητά μόνο οι συναρτήσεις που χρειάζεται η εφαρμογή.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname = 'public' and (p.proname like 'catalogue\_%' or p.proname like 'cost\_%' or p.proname like 'provision\_kind%'))
        or (n.nspname = 'authz' and p.proname in (
              'athens_month_start', 'can_view_catalogue', 'can_manage_cost', 'audit_entity_allowed',
              'guard_provision_kind', 'guard_catalogue_item', 'guard_cost_month', 'guard_cost_settings', 'apply_provisions'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- Ο κανόνας RLS του Ίχνους την καλεί με τα δικαιώματα του χρήστη.
grant execute on function authz.audit_entity_allowed(text) to authenticated;

grant execute on function
  public.catalogue_items_view(uuid, boolean),
  public.cost_months_view(),
  public.cost_hint(),
  public.catalogue_kind_usage(),
  public.catalogue_create_item(text, text, text, text, text, numeric, jsonb),
  public.catalogue_update_item(uuid, text, text, text, numeric),
  public.catalogue_set_provisions(uuid, jsonb),
  public.catalogue_set_cost(uuid, numeric, numeric, numeric, text),
  public.catalogue_set_public(uuid, boolean, boolean, text, text, text),
  public.catalogue_retire_item(uuid),
  public.catalogue_restore_item(uuid),
  public.catalogue_move_kind(uuid, text),
  public.cost_save_month(date, numeric, numeric),
  public.cost_save_multipliers(numeric, numeric, numeric)
  to authenticated;

-- ───────────── Δικαιώματα πινάκων ─────────────
-- Ο ανώνυμος επισκέπτης δεν αγγίζει τίποτα. Οι πίνακες του Καταλόγου και του κόστους είναι κλειστοί και για τους authenticated:
-- διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω. Τα Είδη Παροχής γράφονται με RLS.

revoke all on table
  public.provision_kinds, public.catalogue_items, public.catalogue_item_amounts, public.catalogue_item_costs,
  public.catalogue_item_provisions, public.cost_months, public.cost_settings
  from anon;

revoke all on table
  public.catalogue_items, public.catalogue_item_amounts, public.catalogue_item_costs,
  public.catalogue_item_provisions, public.cost_months, public.cost_settings
  from authenticated;

revoke truncate on table public.provision_kinds from authenticated;

-- ───────────── Ίχνος ενεργειών (μετά τα αρχικά δεδομένα) ─────────────

create trigger provision_kinds_audit after insert or update or delete on public.provision_kinds
  for each row execute function authz.audit_row('id');
create trigger catalogue_items_audit_insert after insert on public.catalogue_items
  for each row execute function authz.audit_row('id');
-- Μια αλλαγή που αγγίζει μόνο τα σημάδια «πότε/ποιος» (π.χ. όταν άλλαξε μόνο η τιμή, ή αποθήκευση χωρίς αλλαγή) δεν γράφει γραμμή.
-- Το ίδιο ισχύει για κόστη, μήνες και πολλαπλασιαστές· το WHEN δεν επιτρέπεται σε insert trigger, γι αυτό τα insert είναι χωριστά.
create trigger catalogue_items_audit_update after update on public.catalogue_items
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('id');
create trigger catalogue_item_amounts_audit after insert or update on public.catalogue_item_amounts
  for each row execute function authz.audit_row('item_id');
create trigger catalogue_item_costs_audit_insert after insert on public.catalogue_item_costs
  for each row execute function authz.audit_row('item_id');
create trigger catalogue_item_costs_audit_update after update on public.catalogue_item_costs
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('item_id');
create trigger catalogue_item_provisions_audit after insert or update or delete on public.catalogue_item_provisions
  for each row execute function authz.audit_row('item_id');
create trigger cost_months_audit_insert after insert on public.cost_months
  for each row execute function authz.audit_row('month');
create trigger cost_months_audit_update after update on public.cost_months
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('month');
create trigger cost_settings_audit after update on public.cost_settings
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('id');

-- ───────────── Κανόνες πρόσβασης (RLS) ─────────────

-- Το Ίχνος: οι γραμμές με ποσά ή κόστος φαίνονται μόνο σε όποιον βλέπει και τα ίδια τα ποσά ή το κόστος.
drop policy "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών»" on public.audit_log;
create policy "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών», χωρίς ποσά και κόστος που δεν δικαιούται"
  on public.audit_log for select to authenticated
  using (authz.has('audit.view') and authz.audit_entity_allowed(entity));

-- Τα Είδη Παροχής φαίνονται στην ομάδα (είναι ονόματα)· γράφονται από όποιον «Διαχειρίζεται Ρυθμίσεις».
-- Οι υπόλοιποι πίνακες του module δεν έχουν policies: είναι κλειστοί, βλ. παραπάνω.
create policy "Τα Είδη Παροχής τα βλέπει η ομάδα"
  on public.provision_kinds for select to authenticated using (authz.is_team_user());
create policy "Είδη Παροχής προσθέτει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.provision_kinds for insert to authenticated with check (authz.has('settings.manage'));
create policy "Είδη Παροχής αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.provision_kinds for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));
create policy "Είδη Παροχής διαγράφει όποιος «Διαχειρίζεται Ρυθμίσεις» (μόνο αν δεν χρησιμοποιήθηκαν)"
  on public.provision_kinds for delete to authenticated using (authz.has('settings.manage'));
