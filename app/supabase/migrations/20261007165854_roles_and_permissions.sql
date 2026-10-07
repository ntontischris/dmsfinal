-- Ρόλοι και Δικαιώματα (κεφ. 1, ADR 0001, ADR 0007, ADR 0018).
-- Ο Ρόλος είναι πακέτο Δικαιωμάτων με Εύρος. Ο κατάλογος των Δικαιωμάτων είναι σταθερός (αλλάζει μόνο με migration).
-- Ο Ιδιοκτήτης έχει πάντα όλα τα Δικαιώματα ομάδας χωρίς να αποθηκεύονται. Το σύστημα ελέγχει Δικαιώματα, όχι ονόματα Ρόλων.

-- ───────────── Πίνακες ─────────────

create table public.permissions (
  code text primary key,
  kind text not null check (kind in ('team', 'client')),
  area text not null,
  label text not null,
  -- Τα Εύρη που υποστηρίζει. Τα Δικαιώματα πελάτη έχουν μόνο «all» = ο επιλεγμένος Πελάτης.
  scopes text[] not null check (scopes <@ array['all', 'mine'] and cardinality(scopes) > 0),
  sort integer not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  kind text not null check (kind in ('team', 'client')),
  is_owner boolean not null default false,
  is_builtin boolean not null default false,
  created_at timestamptz not null default now(),
  check (not is_owner or kind = 'team')
);

create unique index roles_name_unique on public.roles (kind, lower(name));
create unique index roles_single_owner on public.roles (is_owner) where is_owner;

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission text not null references public.permissions (code),
  scope text not null check (scope in ('all', 'mine')),
  primary key (role_id, permission)
);

create index role_permissions_permission_idx on public.role_permissions (permission);

create table public.team_users (
  user_id uuid primary key references auth.users (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  email text not null,
  language text not null default 'el' check (language in ('el', 'en')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz
);

create unique index team_users_email_unique on public.team_users (lower(email));

create table public.team_user_roles (
  user_id uuid not null references public.team_users (user_id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  primary key (user_id, role_id)
);

create index team_user_roles_role_idx on public.team_user_roles (role_id);

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.team_users enable row level security;
alter table public.team_user_roles enable row level security;

-- ───────────── Συναρτήσεις ελέγχου (το «με αφορά» προστίθεται με τα modules που το χρειάζονται) ─────────────

create function authz.user_is_team(uid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.team_users u where u.user_id = uid and u.is_active);
$$;

create function authz.user_is_owner(uid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.team_user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.team_users u on u.user_id = ur.user_id
     where ur.user_id = uid and r.is_owner and u.is_active
  );
$$;

-- Το Εύρος ενός Δικαιώματος για έναν Χρήστη: 'all', 'mine' ή null. Από πολλούς Ρόλους κερδίζει το ευρύτερο.
create function authz.user_scope(uid uuid, perm text) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when not authz.user_is_team(uid) then null
    when authz.user_is_owner(uid) then
      (select 'all' from public.permissions p where p.code = perm and p.kind = 'team')
    else (
      select case when bool_or(rp.scope = 'all') then 'all' when bool_or(rp.scope = 'mine') then 'mine' end
        from public.team_user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
       where ur.user_id = uid and rp.permission = perm
    )
  end;
$$;

create function authz.is_team_user() returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.user_is_team(auth.uid()); $$;

create function authz.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.user_is_owner(auth.uid()); $$;

create function authz.scope(perm text) returns text
language sql stable security definer set search_path = ''
as $$ select authz.user_scope(auth.uid(), perm); $$;

create function authz.has(perm text) returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.user_scope(auth.uid(), perm) is not null; $$;

-- Χωρίς κλιμάκωση: δίνεις μόνο Ρόλους ομάδας που δεν ξεπερνούν τα δικά σου Δικαιώματα και Εύρη,
-- και ποτέ τον Ρόλο Ιδιοκτήτης (εκτός αν είσαι Ιδιοκτήτης).
create function authz.can_grant_role(target_role uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when authz.is_owner() then true
    when not authz.has('access.team') then false
    else exists (select 1 from public.roles r where r.id = target_role and r.kind = 'team' and not r.is_owner)
      and not exists (
        select 1
          from public.role_permissions rp
         where rp.role_id = target_role
           and coalesce(authz.scope(rp.permission), 'none') not in ('all', rp.scope)
      )
  end;
$$;

revoke all on all functions in schema authz from public;
grant execute on function
  authz.is_team_user(), authz.is_owner(), authz.scope(text), authz.has(text),
  authz.can_grant_role(uuid), authz.user_is_owner(uuid)
  to authenticated;

-- ───────────── Κανόνες που ισχύουν για όλους, και για τον service role ─────────────

create function authz.guard_role() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.is_owner then
    raise exception 'Ο Ρόλος Ιδιοκτήτης δεν αλλάζει και δεν διαγράφεται' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    if old.kind = 'client' and old.is_builtin then
      raise exception 'Ο Ρόλος «%» είναι ο Ρόλος της αυτόματης πρόσκλησης και δεν διαγράφεται', old.name using errcode = 'P0001';
    end if;
    return old;
  end if;
  if new.kind <> old.kind or new.is_owner <> old.is_owner or new.is_builtin <> old.is_builtin then
    raise exception 'Το είδος ενός Ρόλου δεν αλλάζει μετά τη δημιουργία' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger roles_guard before update or delete on public.roles
  for each row execute function authz.guard_role();

create function authz.guard_role_permission() returns trigger
language plpgsql set search_path = ''
as $$
declare
  role_row public.roles;
  perm_row public.permissions;
begin
  select * into role_row from public.roles where id = new.role_id;
  select * into perm_row from public.permissions where code = new.permission;
  if role_row.is_owner then
    raise exception 'Ο Ιδιοκτήτης έχει ήδη όλα τα Δικαιώματα' using errcode = 'P0001';
  end if;
  if role_row.kind <> perm_row.kind then
    raise exception 'Το Δικαίωμα «%» δεν ταιριάζει στο είδος του Ρόλου', perm_row.label using errcode = 'P0001';
  end if;
  if not new.scope = any (perm_row.scopes) then
    raise exception 'Το Δικαίωμα «%» δεν υποστηρίζει αυτό το Εύρος', perm_row.label using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger role_permissions_guard before insert or update on public.role_permissions
  for each row execute function authz.guard_role_permission();

create function authz.guard_team_user_role() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select kind from public.roles where id = new.role_id) <> 'team' then
    raise exception 'Ένας Χρήστης ομάδας παίρνει μόνο Ρόλους ομάδας' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger team_user_roles_guard before insert or update on public.team_user_roles
  for each row execute function authz.guard_team_user_role();

-- Πάντα τουλάχιστον ένας ενεργός Ιδιοκτήτης: ένας Ιδιοκτήτης χωρίς ομάδα δεν κλειδώνεται ποτέ έξω.
create function authz.guard_last_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Μόνο όταν φεύγει Ρόλος Ιδιοκτήτης ή απενεργοποιείται Χρήστης.
  if tg_table_name = 'team_user_roles' and not (select r.is_owner from public.roles r where r.id = old.role_id) then
    return null;
  end if;
  if not exists (
    select 1
      from public.team_user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.team_users u on u.user_id = ur.user_id
     where r.is_owner and u.is_active
  ) then
    raise exception 'Χρειάζεται πάντα τουλάχιστον ένας ενεργός Ιδιοκτήτης' using errcode = 'P0001';
  end if;
  return null;
end;
$$;

create trigger team_user_roles_last_owner after delete on public.team_user_roles
  for each row execute function authz.guard_last_owner();

create trigger team_users_last_owner after update of is_active on public.team_users
  for each row when (old.is_active and not new.is_active) execute function authz.guard_last_owner();

-- Απενεργοποίηση: όχι τον εαυτό σου, και Ιδιοκτήτη μόνο ένας Ιδιοκτήτης.
create function authz.guard_deactivation() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.is_active and not new.is_active then
    if auth.uid() is not null and old.user_id = auth.uid() then
      raise exception 'Δεν απενεργοποιείς τον εαυτό σου' using errcode = 'P0001';
    end if;
    if auth.uid() is not null and authz.user_is_owner(old.user_id) and not authz.is_owner() then
      raise exception 'Έναν Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης' using errcode = 'P0001';
    end if;
    new.deactivated_at := now();
  elsif not old.is_active and new.is_active then
    new.deactivated_at := null;
  end if;
  return new;
end;
$$;

create trigger team_users_deactivation before update on public.team_users
  for each row execute function authz.guard_deactivation();

-- ───────────── Ο σταθερός κατάλογος των Δικαιωμάτων ─────────────

insert into public.permissions (code, kind, area, label, scopes, sort) values
  ('clients.view',          'team', 'Πελάτες και Πωλήσεις', 'Βλέπει Πελάτες',                                       '{all,mine}', 10),
  ('clients.manage',        'team', 'Πελάτες και Πωλήσεις', 'Διαχειρίζεται Πελάτες και Ευκαιρίες',                  '{all,mine}', 11),
  ('clients.transfer',      'team', 'Πελάτες και Πωλήσεις', 'Μεταβιβάζει Υπεύθυνο',                                 '{all}',      12),
  ('clients.merge',         'team', 'Πελάτες και Πωλήσεις', 'Συγχωνεύει Πελάτες',                                   '{all}',      13),
  ('catalogue.view',        'team', 'Κατάλογος',            'Βλέπει Κατάλογο',                                      '{all}',      20),
  ('catalogue.manage',      'team', 'Κατάλογος',            'Διαχειρίζεται Κατάλογο',                               '{all}',      21),
  ('agreements.view',       'team', 'Συμφωνίες',            'Βλέπει Συμφωνίες',                                     '{all,mine}', 30),
  ('agreements.draft',      'team', 'Συμφωνίες',            'Συντάσσει προτάσεις',                                  '{all,mine}', 31),
  ('agreements.deviate',    'team', 'Συμφωνίες',            'Παρεκκλίνει από τον Κατάλογο',                         '{all}',      32),
  ('agreements.terminate',  'team', 'Συμφωνίες',            'Λύει Συμφωνία',                                        '{all}',      33),
  ('filming.view',          'team', 'Γυρίσματα',            'Βλέπει Γυρίσματα',                                     '{all,mine}', 40),
  ('filming.book',          'team', 'Γυρίσματα',            'Κλείνει Γύρισμα',                                      '{all,mine}', 41),
  ('filming.approve',       'team', 'Γυρίσματα',            'Εγκρίνει κράτηση',                                     '{all}',      42),
  ('filming.crew',          'team', 'Γυρίσματα',            'Διαχειρίζεται Συνεργείο και Δελτίο',                   '{all,mine}', 43),
  ('equipment.view',        'team', 'Εξοπλισμός',           'Βλέπει Εξοπλισμό',                                     '{all}',      50),
  ('equipment.manage',      'team', 'Εξοπλισμός',           'Διαχειρίζεται απόθεμα',                                '{all}',      51),
  ('equipment.reserve',     'team', 'Εξοπλισμός',           'Δεσμεύει εξοπλισμό',                                   '{all,mine}', 52),
  ('calendar.availability', 'team', 'Ημερολόγιο',           'Βλέπει διαθεσιμότητα ομάδας',                          '{all}',      60),
  ('calendar.google',       'team', 'Ημερολόγιο',           'Αμφίδρομο ημερολόγιο Google',                          '{all}',      61),
  ('productions.manage',    'team', 'Παραγωγές',            'Βλέπει, διαχειρίζεται, παραδίδει χειροκίνητα',         '{all,mine}', 70),
  ('deliverables.work',     'team', 'Παραδοτέα',            'Βλέπει, ανεβάζει και στέλνει Έκδοση, ακυρώνει',        '{all,mine}', 80),
  ('deliverables.review',   'team', 'Παραδοτέα',            'Ελέγχει Παραδοτέα',                                    '{all}',      81),
  ('finance.view',          'team', 'Οικονομικά',           'Βλέπει Οικονομικά',                                    '{all}',      90),
  ('finance.amounts',       'team', 'Οικονομικά',           'Βλέπει ποσά',                                          '{all,mine}', 91),
  ('finance.receipts',      'team', 'Οικονομικά',           'Καταχωρεί Εισπράξεις',                                 '{all}',      92),
  ('finance.invoices',      'team', 'Οικονομικά',           'Καταχωρεί Τιμολόγια',                                  '{all}',      93),
  ('finance.cost',          'team', 'Οικονομικά',           'Βλέπει κόστος και κερδοφορία',                         '{all}',      94),
  ('finance.costManage',    'team', 'Οικονομικά',           'Διαχειρίζεται κόστος',                                 '{all}',      95),
  ('messages.chat',         'team', 'Μηνύματα',             'Συνομιλεί με πελάτη',                                  '{all,mine}', 100),
  ('automations.manage',    'team', 'Αυτοματισμοί',         'Διαχειρίζεται Αυτοματισμούς και Μηνύματα συστήματος',  '{all}',      110),
  ('knowledge.manage',      'team', 'Γνώση',                'Διαχειρίζεται Γνώση',                                  '{all}',      120),
  ('reports.view',          'team', 'Αναφορές',             'Βλέπει Αναφορές',                                      '{all,mine}', 130),
  ('reports.export',        'team', 'Αναφορές',             'Εξάγει δεδομένα',                                      '{all}',      131),
  ('website.manage',        'team', 'Ιστοσελίδα',           'Διαχειρίζεται Ιστοσελίδα',                             '{all}',      140),
  ('access.team',           'team', 'Ομάδα και Πρόσβαση',   'Προσκαλεί και απενεργοποιεί Χρήστες ομάδας',           '{all}',      150),
  ('access.clientUsers',    'team', 'Ομάδα και Πρόσβαση',   'Προσκαλεί και αφαιρεί Χρήστες πελάτη',                 '{all,mine}', 151),
  ('settings.manage',       'team', 'Ρυθμίσεις',            'Διαχειρίζεται Ρυθμίσεις',                              '{all}',      160),
  ('audit.view',            'team', 'Διατομεακά',           'Βλέπει ίχνος ενεργειών',                               '{all}',      170),
  ('health.view',           'team', 'Διατομεακά',           'Βλέπει Υγεία συστήματος',                              '{all}',      171),
  ('c.agreements',          'client', 'Πελάτης', 'Βλέπει Συμφωνίες',                                              '{all}',      200),
  ('c.sign',                'client', 'Πελάτης', 'Υπογράφει Συμφωνία (όταν είναι ο Υπογράφων)',                   '{all}',      201),
  ('c.book',                'client', 'Πελάτης', 'Κλείνει Γύρισμα',                                               '{all}',      202),
  ('c.productions',         'client', 'Πελάτης', 'Βλέπει Παραγωγές',                                              '{all}',      203),
  ('c.approve',             'client', 'Πελάτης', 'Σχολιάζει και εγκρίνει Εκδόσεις',                               '{all}',      204),
  ('c.finance',             'client', 'Πελάτης', 'Βλέπει Οικονομικά',                                             '{all}',      205),
  ('c.chatRead',            'client', 'Πελάτης', 'Βλέπει Συνομιλία',                                              '{all}',      206),
  ('c.chatWrite',           'client', 'Πελάτης', 'Γράφει στη Συνομιλία',                                          '{all}',      207),
  ('c.colleagues',          'client', 'Πελάτης', 'Προσκαλεί και αφαιρεί συναδέλφους',                             '{all}',      208);

-- ───────────── Οι έτοιμοι Ρόλοι ─────────────

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Ιδιοκτήτης', 'Έχει πάντα όλα τα Δικαιώματα και ό,τι κάνει μόνο ο Ιδιοκτήτης. Δεν αλλάζει και δεν διαγράφεται.', 'team', true, true),
  ('Διαχείριση', 'Τρέχει την καθημερινή λειτουργία, με Εύρος «όλα».', 'team', false, true),
  ('Παραγωγή', 'Γυρίζει, μοντάρει, παραδίδει, για όσα τον αφορούν.', 'team', false, true),
  ('Πωλήσεις', 'Φέρνει πελάτες και κλείνει Συμφωνίες, για όσα τον αφορούν.', 'team', false, true),
  ('Λογιστής', 'Ελέγχει και εξάγει τα οικονομικά. Μόνο ανάγνωση.', 'team', false, true),
  ('Πλήρης', 'Ο άνθρωπος του Πελάτη που δουλεύει με την εταιρεία.', 'client', false, true);

insert into public.role_permissions (role_id, permission, scope)
select r.id, p.code, 'all'
  from public.roles r, public.permissions p
 where r.name = 'Διαχείριση' and p.kind = 'team' and p.code not in ('finance.invoices', 'finance.costManage');

insert into public.role_permissions (role_id, permission, scope)
select r.id, g.permission, g.scope
  from public.roles r
  join (values
    ('Παραγωγή', 'filming.view', 'mine'), ('Παραγωγή', 'filming.crew', 'mine'),
    ('Παραγωγή', 'equipment.view', 'all'), ('Παραγωγή', 'equipment.reserve', 'mine'),
    ('Παραγωγή', 'calendar.availability', 'all'), ('Παραγωγή', 'productions.manage', 'mine'),
    ('Παραγωγή', 'deliverables.work', 'mine'), ('Παραγωγή', 'messages.chat', 'mine'),
    ('Πωλήσεις', 'clients.view', 'mine'), ('Πωλήσεις', 'clients.manage', 'mine'),
    ('Πωλήσεις', 'catalogue.view', 'all'), ('Πωλήσεις', 'agreements.view', 'mine'),
    ('Πωλήσεις', 'agreements.draft', 'mine'), ('Πωλήσεις', 'filming.view', 'mine'),
    ('Πωλήσεις', 'filming.book', 'mine'), ('Πωλήσεις', 'calendar.availability', 'all'),
    ('Πωλήσεις', 'finance.amounts', 'mine'), ('Πωλήσεις', 'messages.chat', 'mine'),
    ('Πωλήσεις', 'reports.view', 'mine'),
    ('Λογιστής', 'clients.view', 'all'), ('Λογιστής', 'agreements.view', 'all'),
    ('Λογιστής', 'finance.view', 'all'), ('Λογιστής', 'finance.amounts', 'all'),
    ('Λογιστής', 'reports.view', 'all'), ('Λογιστής', 'reports.export', 'all')
  ) as g (role_name, permission, scope) on g.role_name = r.name and r.kind = 'team';

insert into public.role_permissions (role_id, permission, scope)
select r.id, p.code, 'all'
  from public.roles r, public.permissions p
 where r.name = 'Πλήρης' and r.kind = 'client' and p.kind = 'client';

-- ───────────── Ίχνος ενεργειών για κάθε αλλαγή πρόσβασης (μετά τα έτοιμα δεδομένα) ─────────────

create trigger roles_audit after insert or update or delete on public.roles
  for each row execute function authz.audit_row('id');
create trigger role_permissions_audit after insert or update or delete on public.role_permissions
  for each row execute function authz.audit_row('role_id');
create trigger team_users_audit after insert or update on public.team_users
  for each row execute function authz.audit_row('user_id');
create trigger team_user_roles_audit after insert or delete on public.team_user_roles
  for each row execute function authz.audit_row('user_id');

-- ───────────── Κανόνες πρόσβασης (RLS) ─────────────

create policy "Ο κατάλογος Δικαιωμάτων φαίνεται σε όσους έχουν λογαριασμό"
  on public.permissions for select to authenticated using (true);

create policy "Οι Ρόλοι φαίνονται στην ομάδα"
  on public.roles for select to authenticated using (authz.is_team_user());
create policy "Ρόλους φτιάχνει μόνο ο Ιδιοκτήτης"
  on public.roles for insert to authenticated with check (authz.is_owner());
create policy "Ρόλους αλλάζει μόνο ο Ιδιοκτήτης"
  on public.roles for update to authenticated using (authz.is_owner()) with check (authz.is_owner());
create policy "Ρόλους διαγράφει μόνο ο Ιδιοκτήτης"
  on public.roles for delete to authenticated using (authz.is_owner());

create policy "Τα Δικαιώματα των Ρόλων φαίνονται στην ομάδα"
  on public.role_permissions for select to authenticated using (authz.is_team_user());
create policy "Δικαιώματα σε Ρόλο δίνει μόνο ο Ιδιοκτήτης"
  on public.role_permissions for insert to authenticated with check (authz.is_owner());
create policy "Δικαιώματα Ρόλου αλλάζει μόνο ο Ιδιοκτήτης"
  on public.role_permissions for update to authenticated using (authz.is_owner()) with check (authz.is_owner());
create policy "Δικαιώματα από Ρόλο αφαιρεί μόνο ο Ιδιοκτήτης"
  on public.role_permissions for delete to authenticated using (authz.is_owner());

create policy "Η ομάδα βλέπει τα μέλη της, ο καθένας τον εαυτό του"
  on public.team_users for select to authenticated using (authz.is_team_user() or user_id = auth.uid());
create policy "Χρήστες ομάδας προσθέτει όποιος προσκαλεί"
  on public.team_users for insert to authenticated with check (authz.has('access.team'));
create policy "Χρήστες ομάδας απενεργοποιεί όποιος προσκαλεί"
  on public.team_users for update to authenticated using (authz.has('access.team')) with check (authz.has('access.team'));

create policy "Οι Ρόλοι των Χρηστών φαίνονται στην ομάδα"
  on public.team_user_roles for select to authenticated using (authz.is_team_user());
create policy "Ρόλο σε Χρήστη δίνει όποιος προσκαλεί, χωρίς κλιμάκωση"
  on public.team_user_roles for insert to authenticated
  with check (authz.can_grant_role(role_id) and (authz.is_owner() or not authz.user_is_owner(user_id)));
create policy "Ρόλο από Χρήστη αφαιρεί όποιος προσκαλεί, χωρίς κλιμάκωση"
  on public.team_user_roles for delete to authenticated
  using (authz.can_grant_role(role_id) and (authz.is_owner() or not authz.user_is_owner(user_id)));

create policy "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών»"
  on public.audit_log for select to authenticated using (authz.has('audit.view'));
