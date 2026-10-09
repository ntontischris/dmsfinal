-- Εξοπλισμός (F1, F2, F3): μητρώο αντικειμένων, Κατηγορίες και Πρότυπα εξοπλισμού. Κεφ. 3 (Εξοπλισμός), ADR 0015, 0017.
--
-- Αρχές:
--  • Ένα αντικείμενο δεν έχει ποσότητα, αξία ή κόστος: κανένας πίνακας του module δεν μπαίνει πίσω από finance.*.
--  • Οι πίνακες είναι κλειστοί για την εφαρμογή (RLS χωρίς policies, χωρίς grants): διαβάζονται και γράφονται μόνο από τα
--    public.equipment_* RPC, που ελέγχουν το Δικαίωμα στο σώμα τους (security definer, search_path = '').
--  • Δικαιώματα: equipment.view (ανάγνωση), equipment.manage (μητρώο, Κατηγορίες, Κατάσταση, διαγραφές),
--    equipment.reserve ή equipment.manage (Πρότυπα). Κανένα νέο Δικαίωμα.
--  • Αρχειοθέτηση, όχι διαγραφή: Κατηγορία με αντικείμενα αποσύρεται· αντικείμενο με Δέσμευση αποσύρεται (status retired).
--  • Ιστορικό αντικειμένου = Ίχνος ενεργειών (audit_log, entity equipment_items). Η αλλαγή Κατάστασης γράφει και γεγονός με τον λόγο.
--  • Δέσμευση: το σημείο σύνδεσης είναι η authz.equipment_item_reserved(p_item). Σήμερα επιστρέφει false· θα την αντικαταστήσει
--    το module Γυρισμάτων.

-- ───────────── Πίνακες ─────────────

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Το όνομα μοναδικό σε όλο το μητρώο, με και χωρίς αποσυρμένες Κατηγορίες, χωρίς διάκριση πεζών και κεφαλαίων.
create unique index equipment_categories_name_lower on public.equipment_categories (lower(name));

create table public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.equipment_categories (id),
  name text not null check (length(trim(name)) > 0),
  -- Κωδικός ή σειριακός: προαιρετικός, δεν είναι μοναδικός.
  code text check (code is null or length(trim(code)) > 0),
  note text check (note is null or length(trim(note)) > 0),
  status text not null default 'available' check (status in ('available', 'in_repair', 'retired')),
  status_note text check (status_note is null or length(trim(status_note)) > 0),
  -- Η επισκευή θέλει λόγο (κεφ. 3). Ο έλεγχος μένει και στη βάση, για κάθε γραφή.
  check (status <> 'in_repair' or length(trim(coalesce(status_note, ''))) > 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index equipment_items_name_lower on public.equipment_items (lower(name));
create index equipment_items_category_idx on public.equipment_items (category_id);

create table public.equipment_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  note text check (note is null or length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index equipment_templates_name_lower on public.equipment_templates (lower(name));

create table public.equipment_template_items (
  template_id uuid not null references public.equipment_templates (id),
  item_id uuid not null references public.equipment_items (id),
  primary key (template_id, item_id)
);

create index equipment_template_items_item_idx on public.equipment_template_items (item_id);

alter table public.equipment_categories enable row level security;
alter table public.equipment_items enable row level security;
alter table public.equipment_templates enable row level security;
alter table public.equipment_template_items enable row level security;

-- ───────────── Αρχικές Κατηγορίες ─────────────

insert into public.equipment_categories (name, sort_order) values
  ('Κάμερες', 1),
  ('Φακοί', 2),
  ('Φωτισμός', 3),
  ('Ήχος', 4),
  ('Στήριξη και σταθεροποίηση', 5),
  ('Drone', 6);

-- ───────────── Βοηθητικές συναρτήσεις (εσωτερικές, χωρίς grant σε κανέναν ρόλο εφαρμογής) ─────────────

-- Σημείο σύνδεσης για το module Γυρισμάτων: είναι το αντικείμενο δεσμευμένο σε ανοιχτό Γύρισμα; Μέχρι τότε δεν είναι.
create function authz.equipment_item_reserved(p_item uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select false; $$;

-- Θέλει όποιος «Δεσμεύει εξοπλισμό» ή «Διαχειρίζεται απόθεμα» τα Πρότυπα. Αλλιώς 42501.
create function authz.require_template_writer() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (authz.has('equipment.reserve') or authz.has('equipment.manage')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Γεγονός για το Ίχνος του αντικειμένου (action 'event'), με τον λόγο στο detail.
create function authz.equipment_event(p_item uuid, p_event text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'equipment_items', p_item::text, jsonb_build_object('event', p_event) || coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Λίστα Προτύπου: τουλάχιστον ένα αντικείμενο, κάθε αντικείμενο μία φορά, όλα υπάρχουν. Αποσυρμένο αντικείμενο περνά.
create function authz.equipment_check_template_items(p_ids uuid[]) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if cardinality(coalesce(p_ids, '{}'::uuid[])) = 0 then
    raise exception 'Ένα Πρότυπο θέλει τουλάχιστον ένα αντικείμενο' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(p_ids) x where x is null)
     or (select count(distinct x) from unnest(p_ids) x) <> cardinality(p_ids) then
    raise exception 'Κάθε αντικείμενο μπαίνει στο Πρότυπο μία φορά' using errcode = 'P0001';
  end if;
  if (select count(*) from public.equipment_items i where i.id = any (p_ids)) <> cardinality(p_ids) then
    raise exception 'Κάποιο αντικείμενο του Προτύπου δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Κανόνες (triggers, και για τον service role) ─────────────

-- Ίδιες στήλες ιχνηλασιμότητας στους τρεις πίνακες με αναγνωριστικό.
create function authz.stamp_equipment_row() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger equipment_categories_stamp before insert or update on public.equipment_categories
  for each row execute function authz.stamp_equipment_row();
create trigger equipment_items_stamp before insert or update on public.equipment_items
  for each row execute function authz.stamp_equipment_row();
create trigger equipment_templates_stamp before insert or update on public.equipment_templates
  for each row execute function authz.stamp_equipment_row();

-- Σε αποσυρμένη Κατηγορία δεν μπαίνουν νέα αντικείμενα, ούτε μεταφέρονται αντικείμενα σε αυτήν.
create function authz.guard_equipment_item_category() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return new;
  end if;
  if exists (select 1 from public.equipment_categories c where c.id = new.category_id and c.retired_at is not null) then
    raise exception 'Η Κατηγορία έχει αποσυρθεί, δεν δέχεται νέα αντικείμενα' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger equipment_items_category_guard before insert or update on public.equipment_items
  for each row execute function authz.guard_equipment_item_category();

-- Κατηγορία με αντικείμενα δεν διαγράφεται· αποσύρεται.
create function authz.guard_equipment_category_delete() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.equipment_items i where i.category_id = old.id) then
    raise exception 'Η Κατηγορία έχει αντικείμενα, αποσύρεται και δεν διαγράφεται' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger equipment_categories_delete_guard before delete on public.equipment_categories
  for each row execute function authz.guard_equipment_category_delete();

-- Αντικείμενο με έστω μία Δέσμευση δεν διαγράφεται· αποσύρεται (κεφ. 3).
create function authz.guard_equipment_item_delete() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.equipment_item_reserved(old.id) then
    raise exception 'Το αντικείμενο έχει Δέσμευση, αποσύρεται και δεν διαγράφεται' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger equipment_items_delete_guard before delete on public.equipment_items
  for each row execute function authz.guard_equipment_item_delete();

-- ───────────── Ίχνος ενεργειών ─────────────

create trigger equipment_categories_audit after insert or update or delete on public.equipment_categories
  for each row execute function authz.audit_row('id');
create trigger equipment_items_audit after insert or update or delete on public.equipment_items
  for each row execute function authz.audit_row('id');
create trigger equipment_templates_audit after insert or update or delete on public.equipment_templates
  for each row execute function authz.audit_row('id');
create trigger equipment_template_items_audit after insert or update or delete on public.equipment_template_items
  for each row execute function authz.audit_row('template_id');

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny). Προστέθηκαν μόνο οι τέσσερις πίνακες του Εξοπλισμού, χωρίς ποσά.
create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
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
    else false
  end;
$$;

-- ───────────── Ανάγνωση ─────────────

-- Μητρώο (F1). Οι αποσυρμένοι κρύβονται, εκτός αν ζητηθούν.
create function public.equipment_items_view(p_include_retired boolean default false)
returns table (
  id uuid, name text, code text, note text, status text, status_note text,
  category_id uuid, category_name text, category_retired boolean, updated_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.view');
  return query
    select i.id, i.name, i.code, i.note, i.status, i.status_note,
           c.id, c.name, c.retired_at is not null, i.updated_at
      from public.equipment_items i
      join public.equipment_categories c on c.id = i.category_id
     where p_include_retired or i.status <> 'retired'
     order by lower(i.name), i.id;
end;
$$;

-- Σελίδα αντικειμένου (F2): στοιχεία, Πρότυπα που το περιέχουν, και ιστορικό από το Ίχνος (νεότερο πρώτο, έως 100).
create function public.equipment_item_view(p_item uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_item jsonb;
begin
  perform authz.require('equipment.view');
  select jsonb_build_object(
      'id', i.id, 'name', i.name, 'code', i.code, 'note', i.note,
      'status', i.status, 'status_note', i.status_note,
      'category_id', c.id, 'category_name', c.name, 'category_retired', c.retired_at is not null,
      'updated_at', i.updated_at, 'updated_by_name', u.name,
      'templates', coalesce((
        select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by lower(t.name), t.id)
          from public.equipment_template_items ti
          join public.equipment_templates t on t.id = ti.template_id
         where ti.item_id = i.id
      ), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(h.entry order by h.at desc)
          from (
            select a.at, jsonb_build_object(
                'at', a.at, 'action', a.action, 'event', a.after ->> 'event',
                'actor_name', hu.name, 'before', a.before, 'after', a.after
              ) as entry
              from public.audit_log a
              left join public.team_users hu on hu.user_id = a.actor_id
             where a.entity = 'equipment_items' and a.entity_id = p_item::text
             order by a.at desc, a.id desc
             limit 100
          ) h
      ), '[]'::jsonb)
    )
    into v_item
    from public.equipment_items i
    join public.equipment_categories c on c.id = i.category_id
    left join public.team_users u on u.user_id = i.updated_by
   where i.id = p_item;
  if v_item is null then
    raise exception 'Το αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_item;
end;
$$;

-- Κατηγορίες με πλήθος αντικειμένων. Οι αποσυρμένες κρύβονται, εκτός αν ζητηθούν.
create function public.equipment_categories_view(p_include_retired boolean default false)
returns table (
  id uuid, name text, sort_order integer, is_retired boolean, item_count bigint, updated_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.view');
  return query
    select c.id, c.name, c.sort_order, c.retired_at is not null,
           (select count(*) from public.equipment_items i where i.category_id = c.id),
           c.updated_at
      from public.equipment_categories c
     where p_include_retired or c.retired_at is null
     order by c.sort_order, lower(c.name), c.id;
end;
$$;

-- Πρότυπα εξοπλισμού (F3) με τα αντικείμενά τους: [{id, name, status}]. Αποσυρμένο αντικείμενο μένει, με τη δική του κατάσταση.
create function public.equipment_templates_view()
returns table (id uuid, name text, note text, items jsonb, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.view');
  return query
    select t.id, t.name, t.note,
           coalesce((
             select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'status', i.status) order by lower(i.name), i.id)
               from public.equipment_template_items ti
               join public.equipment_items i on i.id = ti.item_id
              where ti.template_id = t.id
           ), '[]'::jsonb),
           t.updated_at
      from public.equipment_templates t
     order by lower(t.name), t.id;
end;
$$;

-- ───────────── Εγγραφή: Κατηγορίες ─────────────

create function public.equipment_category_create(p_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  perform authz.require('equipment.manage');
  if length(v_name) = 0 then
    raise exception 'Η Κατηγορία θέλει όνομα' using errcode = 'P0001';
  end if;
  begin
    insert into public.equipment_categories (name, sort_order)
    values (v_name, coalesce((select max(c.sort_order) from public.equipment_categories c), 0) + 1)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη Κατηγορία με αυτό το όνομα' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

create function public.equipment_category_rename(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  perform authz.require('equipment.manage');
  if length(v_name) = 0 then
    raise exception 'Η Κατηγορία θέλει όνομα' using errcode = 'P0001';
  end if;
  perform 1 from public.equipment_categories c where c.id = p_id for update;
  if not found then
    raise exception 'Η Κατηγορία δεν βρέθηκε' using errcode = 'P0001';
  end if;
  begin
    update public.equipment_categories c set name = v_name where c.id = p_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη Κατηγορία με αυτό το όνομα' using errcode = 'P0001';
  end;
end;
$$;

create function public.equipment_category_retire(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.manage');
  update public.equipment_categories c set retired_at = now() where c.id = p_id and c.retired_at is null;
  if not found then
    raise exception 'Η Κατηγορία δεν βρέθηκε ή είναι ήδη αποσυρμένη' using errcode = 'P0001';
  end if;
end;
$$;

create function public.equipment_category_restore(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.manage');
  update public.equipment_categories c set retired_at = null where c.id = p_id and c.retired_at is not null;
  if not found then
    raise exception 'Η Κατηγορία δεν βρέθηκε ή δεν είναι αποσυρμένη' using errcode = 'P0001';
  end if;
end;
$$;

-- Η διαγραφή μόνο για Κατηγορία χωρίς αντικείμενα (ελέγχει το guard).
create function public.equipment_category_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.manage');
  delete from public.equipment_categories c where c.id = p_id;
  if not found then
    raise exception 'Η Κατηγορία δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Εγγραφή: Αντικείμενα ─────────────

create function public.equipment_item_create(p_category_id uuid, p_name text, p_code text, p_note text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  perform authz.require('equipment.manage');
  if length(v_name) = 0 then
    raise exception 'Το αντικείμενο θέλει όνομα' using errcode = 'P0001';
  end if;
  perform 1 from public.equipment_categories c where c.id = p_category_id;
  if not found then
    raise exception 'Η Κατηγορία δεν βρέθηκε' using errcode = 'P0001';
  end if;
  begin
    insert into public.equipment_items (category_id, name, code, note)
    values (p_category_id, v_name, nullif(trim(coalesce(p_code, '')), ''), nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη αντικείμενο με αυτό το όνομα' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

-- Στοιχεία και Κατηγορία. Η Κατάσταση αλλάζει μόνο με equipment_item_set_status.
create function public.equipment_item_update(
  p_id uuid, p_category_id uuid, p_name text, p_code text, p_note text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  perform authz.require('equipment.manage');
  if length(v_name) = 0 then
    raise exception 'Το αντικείμενο θέλει όνομα' using errcode = 'P0001';
  end if;
  perform 1 from public.equipment_items i where i.id = p_id for update;
  if not found then
    raise exception 'Το αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  begin
    update public.equipment_items i
       set category_id = p_category_id,
           name = v_name,
           code = nullif(trim(coalesce(p_code, '')), ''),
           note = nullif(trim(coalesce(p_note, '')), '')
     where i.id = p_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη αντικείμενο με αυτό το όνομα' using errcode = 'P0001';
  end;
end;
$$;

-- Αλλαγή Κατάστασης με λόγο. Κάθε αλλαγή γράφει γεγονός «status_changed» στο Ίχνος με από, σε και λόγο.
-- Το «retired» δεν αγγίζει τις μελλοντικές Δεσμεύσεις εδώ· τις αποδεσμεύει το module Γυρισμάτων.
create function public.equipment_item_set_status(p_id uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_from text;
begin
  perform authz.require('equipment.manage');
  if p_status not in ('available', 'in_repair', 'retired') then
    raise exception 'Άγνωστη Κατάσταση' using errcode = 'P0001';
  end if;
  if p_status = 'in_repair' and v_note is null then
    raise exception 'Η επισκευή θέλει λόγο: τι έπαθε και πότε επιστρέφει' using errcode = 'P0001';
  end if;
  select i.status into v_from from public.equipment_items i where i.id = p_id for update;
  if not found then
    raise exception 'Το αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  update public.equipment_items i
     set status = p_status,
         status_note = case when p_status = 'available' then null else v_note end
   where i.id = p_id;
  perform authz.equipment_event(p_id, 'status_changed', jsonb_build_object('from', v_from, 'to', p_status, 'note', v_note));
end;
$$;

-- Διαγραφή μόνο αν δεν δεσμεύτηκε ποτέ (guard) και δεν είναι σε Πρότυπο (αλλιώς θα χανόταν η σύνδεση με το Πρότυπο).
create function public.equipment_item_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.manage');
  if exists (select 1 from public.equipment_template_items ti where ti.item_id = p_id) then
    raise exception 'Το αντικείμενο είναι σε Πρότυπο, αφαίρεσέ το από εκεί πρώτα' using errcode = 'P0001';
  end if;
  delete from public.equipment_items i where i.id = p_id;
  if not found then
    raise exception 'Το αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Εγγραφή: Πρότυπα ─────────────

create function public.equipment_template_create(p_name text, p_note text, p_item_ids uuid[]) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  perform authz.require_template_writer();
  if length(v_name) = 0 then
    raise exception 'Το Πρότυπο θέλει όνομα' using errcode = 'P0001';
  end if;
  perform authz.equipment_check_template_items(p_item_ids);
  begin
    insert into public.equipment_templates (name, note)
    values (v_name, nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη Πρότυπο με αυτό το όνομα' using errcode = 'P0001';
  end;
  insert into public.equipment_template_items (template_id, item_id)
  select v_id, x from unnest(p_item_ids) x;
  return v_id;
end;
$$;

-- Όνομα, σημείωση και αντικείμενα (η λίστα αντικαθίσταται, αλλά αλλάζει μόνο ό,τι διαφέρει).
create function public.equipment_template_update(
  p_id uuid, p_name text, p_note text, p_item_ids uuid[]
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  perform authz.require_template_writer();
  if length(v_name) = 0 then
    raise exception 'Το Πρότυπο θέλει όνομα' using errcode = 'P0001';
  end if;
  perform 1 from public.equipment_templates t where t.id = p_id for update;
  if not found then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  perform authz.equipment_check_template_items(p_item_ids);
  begin
    update public.equipment_templates t
       set name = v_name, note = nullif(trim(coalesce(p_note, '')), '')
     where t.id = p_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη Πρότυπο με αυτό το όνομα' using errcode = 'P0001';
  end;
  delete from public.equipment_template_items ti where ti.template_id = p_id and ti.item_id <> all (p_item_ids);
  insert into public.equipment_template_items (template_id, item_id)
  select p_id, x from unnest(p_item_ids) x
  on conflict (template_id, item_id) do nothing;
end;
$$;

create function public.equipment_template_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_template_writer();
  perform 1 from public.equipment_templates t where t.id = p_id for update;
  if not found then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  delete from public.equipment_template_items ti where ti.template_id = p_id;
  delete from public.equipment_templates t where t.id = p_id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Καμία συνάρτηση δεν καλείται από ανώνυμο ή συνδεδεμένο Χρήστη χωρίς τον έλεγχο στο σώμα της. Πρώτα κλείνουν όλες.
revoke all on function
  authz.equipment_item_reserved(uuid),
  authz.require_template_writer(),
  authz.equipment_event(uuid, text, jsonb),
  authz.equipment_check_template_items(uuid[]),
  authz.stamp_equipment_row(),
  authz.guard_equipment_item_category(),
  authz.guard_equipment_category_delete(),
  authz.guard_equipment_item_delete(),
  public.equipment_items_view(boolean),
  public.equipment_item_view(uuid),
  public.equipment_categories_view(boolean),
  public.equipment_templates_view(),
  public.equipment_category_create(text),
  public.equipment_category_rename(uuid, text),
  public.equipment_category_retire(uuid),
  public.equipment_category_restore(uuid),
  public.equipment_category_delete(uuid),
  public.equipment_item_create(uuid, text, text, text),
  public.equipment_item_update(uuid, uuid, text, text, text),
  public.equipment_item_set_status(uuid, text, text),
  public.equipment_item_delete(uuid),
  public.equipment_template_create(text, text, uuid[]),
  public.equipment_template_update(uuid, text, text, uuid[]),
  public.equipment_template_delete(uuid)
  from public, anon, authenticated;

grant execute on function
  public.equipment_items_view(boolean),
  public.equipment_item_view(uuid),
  public.equipment_categories_view(boolean),
  public.equipment_templates_view(),
  public.equipment_category_create(text),
  public.equipment_category_rename(uuid, text),
  public.equipment_category_retire(uuid),
  public.equipment_category_restore(uuid),
  public.equipment_category_delete(uuid),
  public.equipment_item_create(uuid, text, text, text),
  public.equipment_item_update(uuid, uuid, text, text, text),
  public.equipment_item_set_status(uuid, text, text),
  public.equipment_item_delete(uuid),
  public.equipment_template_create(text, text, uuid[]),
  public.equipment_template_update(uuid, text, text, uuid[]),
  public.equipment_template_delete(uuid)
  to authenticated;

-- Οι πίνακες είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table
  public.equipment_categories, public.equipment_items, public.equipment_templates, public.equipment_template_items
  from anon, authenticated;
