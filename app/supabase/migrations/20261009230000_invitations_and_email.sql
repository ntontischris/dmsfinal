-- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107, ADR 0016, ADR 0018, κεφ. 1 «Πελάτες ως Χρήστες»).
-- Αρχές:
--  • Όλοι οι νέοι πίνακες είναι κλειστοί (RLS χωρίς policies, χωρίς privileges). Γράφονται και διαβάζονται μόνο από
--    συναρτήσεις security definer με έλεγχο Δικαιώματος στο σώμα τους. Η σειρά είναι πάντα: Δικαίωμα, ύπαρξη, Εύρος.
--  • Ένας Χρήστης ανήκει σε ένα μόνο είδος: ή team_users ή client_users. Το εξασφαλίζουν triggers και στις δύο μεριές.
--  • Η πρόσβαση δίνεται μόνο με αποδοχή: η attach γράφει μόνο το user_id της πρόσκλησης, και η claim_invitation (ο ίδιος
--    ο Χρήστης, με τον σύνδεσμο) γράφει τη συμμετοχή.
--  • Το email δεν στέλνεται από τη βάση. Η ουρά email_outbox (και η agreement_outbox) διαβάζεται από τον worker με
--    κλείδωμα 5 λεπτών (πάνω από το maxDuration του worker). Κάθε αποστολή καταγράφεται στο email_log μόνο με θέμα και κατάσταση.
--  • Οι προσκλήσεις λήγουν σε 7 ημέρες. Η λήξη γράφεται στη στήλη status όταν τη διαβάζει κάποια συνάρτηση
--    (authz.expire_invitations), ώστε ο περιορισμός «μία εκκρεμής ανά email» να μένει σωστός χωρίς cron.

-- ───────────── Πίνακες ─────────────

-- Χρήστες πελάτη: ένας Χρήστης μπορεί να ανήκει σε περισσότερους Πελάτες. Η αφαίρεση σβήνει μόνο τη συμμετοχή.
create table public.client_users (
  client_id uuid not null references public.clients (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (length(trim(name)) > 0 and length(name) <= 120),
  role_id uuid not null references public.roles (id) on delete restrict,
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  -- Ο Πελάτης που διαλέγει ο Χρήστης τώρα. Ένας μόνο ανά Χρήστη (δείκτης από κάτω).
  is_current boolean not null default false,
  primary key (client_id, user_id),
  check (not is_current or removed_at is null)
);

create unique index client_users_one_current on public.client_users (user_id) where is_current;
create index client_users_user_active_idx on public.client_users (user_id) where removed_at is null;
create index client_users_role_idx on public.client_users (role_id);

comment on table public.client_users is 'Συμμετοχές Χρηστών πελάτη σε Πελάτες. Κλειστός πίνακας.';

-- Προσκλήσεις: ομάδας (kind team, Ρόλοι ομάδας) ή Χρήστη πελάτη (kind client, client_id και Ρόλος πελάτη).
-- user_id γράφεται με την αποστολή (attach)· η συμμετοχή γράφεται μόνο με την αποδοχή (claim_invitation).
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('team', 'client')),
  email text not null check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  name text not null check (length(trim(name)) > 0 and length(name) <= 120),
  locale text not null default 'el' check (locale in ('el', 'en')),
  role_ids uuid[] not null check (cardinality(role_ids) >= 1),
  client_id uuid references public.clients (id) on delete restrict,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  user_id uuid references auth.users (id) on delete set null,
  -- Το σφάλμα της αποτυχημένης αποστολής (ο worker το γράφει με invitation_fail).
  error text not null default '' check (length(error) <= 500),
  check ((kind = 'client') = (client_id is not null)),
  check ((status = 'accepted') = (accepted_at is not null))
);

-- Μία εκκρεμής πρόσκληση ανά email, ανεξάρτητα από είδος.
create unique index invitations_one_pending_email on public.invitations (email) where status = 'pending';
create index invitations_kind_status_idx on public.invitations (kind, status);

-- Ουρά εξερχόμενων email (πρόσκληση ξανά, προσθήκη σε Πελάτη, δοκιμή). Ο worker τη διαβάζει με service role.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('test', 'invite_resend', 'client_added')),
  to_name text not null default '',
  to_email text not null check (length(to_email) between 3 and 200),
  locale text not null default 'el' check (locale in ('el', 'en')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'suppressed', 'cancelled')),
  attempts integer not null default 0,
  last_error text not null default '',
  provider_id text not null default '',
  -- Κλείδωμα της παραλαβής: ο worker που πήρε τη γραμμή δεν την ξαναπαίρνει για 5 λεπτά (πάνω από το maxDuration 60 s του route).
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  handled_at timestamptz,
  check ((status = 'pending') = (handled_at is null))
);

create index email_outbox_pending_idx on public.email_outbox (created_at) where status = 'pending';

-- Το κλείδωμα της ουράς Συμφωνιών (ίδιος κανόνας με την email_outbox).
alter table public.agreement_outbox add column locked_until timestamptz;

-- Ιστορικό όσων στάλθηκαν από οποιονδήποτε δρόμο. Μόνο θέμα και κατάσταση, ποτέ σύνδεσμοι ή κωδικοί.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (length(kind) between 1 and 40),
  to_email text not null check (length(to_email) between 3 and 200),
  subject text not null default '' check (length(subject) <= 200),
  status text not null check (status in ('sent', 'failed', 'suppressed')),
  provider_id text not null default '' check (length(provider_id) <= 200),
  error text not null default '' check (length(error) <= 500),
  sent_at timestamptz not null default now()
);

create index email_log_sent_idx on public.email_log (sent_at desc);

alter table public.client_users enable row level security;
alter table public.invitations enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_log enable row level security;

-- Σταθερό κλειδί για τον Ρόλο «Πλήρης»: η αυτόματη πρόσκληση Υπογράφοντα και η προεπιλογή βρίσκουν τον Ρόλο με αυτό,
-- ώστε η μετονομασία του δεν σπάει τη ροή. Η διαγραφή του Ρόλου απαγορεύεται ήδη από τον roles_guard (είναι έτοιμος Ρόλος).
alter table public.roles add column system_key text unique;
update public.roles set system_key = 'client_full' where kind = 'client' and name = 'Πλήρης';

-- ───────────── Κανόνες ένα είδος ανά Χρήστη, για κάθε είδος εγγραφής ─────────────

create function authz.guard_client_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select r.kind from public.roles r where r.id = new.role_id) <> 'client' then
    raise exception 'Ένας Χρήστης πελάτη παίρνει μόνο Ρόλους πελάτη' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.team_users t where t.user_id = new.user_id) then
    raise exception 'Ο Χρήστης είναι ήδη Χρήστης ομάδας· ένας Χρήστης ανήκει σε ένα μόνο είδος' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger client_users_guard before insert or update on public.client_users
  for each row execute function authz.guard_client_user();

create function authz.guard_team_user_kind() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.client_users cu where cu.user_id = new.user_id and cu.removed_at is null) then
    raise exception 'Ο Χρήστης είναι ήδη Χρήστης πελάτη· ένας Χρήστης ανήκει σε ένα μόνο είδος' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger team_users_one_kind before insert on public.team_users
  for each row execute function authz.guard_team_user_kind();

-- ───────────── Συναρτήσεις ελέγχου ─────────────

-- Ο Πελάτης του συνδεδεμένου Χρήστη: ο επιλεγμένος (is_current), αλλιώς η μοναδική ενεργή συμμετοχή, αλλιώς null.
-- Αντικαθιστά το stub του 20261009180000 (ίδια υπογραφή).
create or replace function authz.client_user_client_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select cu.client_id from public.client_users cu
      where cu.user_id = auth.uid() and cu.removed_at is null and cu.is_current limit 1),
    (select min(cu.client_id::text)::uuid from public.client_users cu
      where cu.user_id = auth.uid() and cu.removed_at is null
      having count(*) = 1)
  );
$$;

-- Το Δικαίωμα υπάρχει στον Ρόλο της τρέχουσας συμμετοχής. Αντικαθιστά το stub του 20261009210000.
create or replace function authz.client_user_has(p_perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.client_users cu
      join public.role_permissions rp on rp.role_id = cu.role_id
     where cu.user_id = auth.uid()
       and cu.removed_at is null
       and cu.client_id = authz.client_user_client_id()
       and rp.permission = p_perm
  );
$$;

-- Βλέπει ή διαχειρίζεται ο συνδεδεμένος τους Χρήστες πελάτη αυτού του Πελάτη; Ομάδα: «Προσκαλεί και αφαιρεί Χρήστες πελάτη»
-- (όλα, ή όσα με αφορούν = Υπεύθυνος του Πελάτη). Πελάτης: c.colleagues στον επιλεγμένο του Πελάτη.
create function authz.can_manage_client_users(p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    case
      when authz.is_team_user() then
        coalesce(authz.scope('access.clientUsers') = 'all', false)
        or (coalesce(authz.scope('access.clientUsers') = 'mine', false)
            and exists (select 1 from public.clients c where c.id = p_client and c.manager_id = auth.uid()))
      else authz.client_user_client_id() = p_client and authz.client_user_has('c.colleagues')
    end,
    false
  );
$$;

-- Ικανότητα πρώτα: μόνο όποιος έχει έστω ένα Δικαίωμα Χρηστών πελάτη (ομάδα ή πελάτης).
create function authz.assert_client_capability() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (authz.has('access.clientUsers') or authz.client_user_has('c.colleagues')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ικανότητα πρώτα για τις προσκλήσεις: ομάδα (access.team ή access.clientUsers) ή Χρήστης πελάτη με c.colleagues.
create function authz.assert_invitation_capability() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (authz.has('access.team') or authz.has('access.clientUsers') or authz.client_user_has('c.colleagues')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ικανότητα, μετά ύπαρξη, μετά Εύρος. Ξένο και ανύπαρκτο id δίνουν το ίδιο σφάλμα (χωρίς διαρροή).
create function authz.assert_client_access(p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.assert_client_capability();
  if not exists (select 1 from public.clients c where c.id = p_client) or not authz.can_manage_client_users(p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ο Ρόλος πελάτη που δίνει ο Χρήστης πελάτη δεν έχει περισσότερα Δικαιώματα από τον δικό του.
create function authz.client_role_grantable(p_role uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1
      from public.role_permissions rp
     where rp.role_id = p_role
       and rp.permission not in (
         select mine.permission
           from public.client_users cu
           join public.role_permissions mine on mine.role_id = cu.role_id
          where cu.user_id = auth.uid() and cu.removed_at is null and cu.client_id = p_client
       )
  );
$$;

-- Λήγουν οι εκκρεμείς προσκλήσεις που πέρασαν τις 7 ημέρες.
create function authz.expire_invitations() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.invitations set status = 'expired' where status = 'pending' and expires_at <= now();
end;
$$;

-- Ονοματεπώνυμο, έγκυρο email (ήδη με πεζά) και γλώσσα.
create function authz.assert_invite_fields(p_name text, p_email text, p_locale text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Το ονοματεπώνυμο είναι υποχρεωτικό' using errcode = 'P0001';
  end if;
  if coalesce(p_email, '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Το email δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  if coalesce(p_locale, '') not in ('el', 'en') then
    raise exception 'Η γλώσσα της πρόσκλησης δεν υποστηρίζεται' using errcode = 'P0001';
  end if;
end;
$$;

-- Το email δεν ανήκει σε Χρήστη του άλλου είδους και δεν είναι ήδη μέλος. Χωρίς τον έλεγχο εκκρεμότητας.
create function authz.assert_invitee_kind(p_email text, p_kind text, p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_kind = 'team' then
    if exists (select 1 from public.team_users t where lower(t.email) = p_email and not t.is_active) then
      raise exception 'Υπάρχει απενεργοποιημένος Χρήστης με αυτό το email: κάνε Επανενεργοποίηση' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.team_users t where lower(t.email) = p_email) then
      raise exception 'Υπάρχει ήδη Χρήστης ομάδας με αυτό το email' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.client_users cu join auth.users u on u.id = cu.user_id
       where lower(u.email) = p_email and cu.removed_at is null
    ) then
      raise exception 'Το email ανήκει σε Χρήστη πελάτη' using errcode = 'P0001';
    end if;
  else
    if exists (select 1 from public.team_users t where lower(t.email) = p_email) then
      raise exception 'Το email ανήκει σε Χρήστη ομάδας' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.client_users cu join auth.users u on u.id = cu.user_id
       where lower(u.email) = p_email and cu.client_id = p_client and cu.removed_at is null
    ) then
      raise exception 'Ο Χρήστης είναι ήδη Χρήστης αυτού του Πελάτη' using errcode = 'P0001';
    end if;
  end if;
end;
$$;

-- Για νέα πρόσκληση: το email είναι ελεύθερο και δεν έχει ήδη εκκρεμή πρόσκληση.
create function authz.assert_invitable(p_email text, p_kind text, p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.assert_invitee_kind(p_email, p_kind, p_client);
  if exists (select 1 from public.invitations i where i.email = p_email and i.status = 'pending') then
    raise exception 'Υπάρχει ήδη εκκρεμής πρόσκληση για αυτό το email' using errcode = 'P0001';
  end if;
end;
$$;

-- Ρόλοι ομάδας: ≥1, χωρίς διπλότυπα, όλοι Ρόλοι ομάδας και όλοι δίνονται από τον συνδεδεμένο (χωρίς κλιμάκωση).
create function authz.assert_team_roles_grantable(p_role_ids uuid[]) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_role_ids is null or cardinality(p_role_ids) = 0 then
    raise exception 'Θέλει τουλάχιστον έναν Ρόλο' using errcode = 'P0001';
  end if;
  if (select count(distinct x) from unnest(p_role_ids) as x) <> cardinality(p_role_ids) then
    raise exception 'Ο ίδιος Ρόλος μπήκε δύο φορές' using errcode = 'P0001';
  end if;
  if (select count(*) from public.roles r where r.id = any (p_role_ids) and r.kind = 'team') <> cardinality(p_role_ids) then
    raise exception 'Ο Ρόλος δεν υπάρχει ή δεν είναι Ρόλος ομάδας' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(p_role_ids) as x where not authz.can_grant_role(x)) then
    raise exception 'Δεν μπορείς να δώσεις έναν από αυτούς τους Ρόλους' using errcode = '42501';
  end if;
end;
$$;

-- Ρόλος πελάτη για πρόσκληση· ο Χρήστης πελάτη δεν δίνει περισσότερα από όσα έχει.
create function authz.assert_client_role_grantable(p_role uuid, p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.roles r where r.id = p_role and r.kind = 'client' and not r.is_owner) then
    raise exception 'Ο Ρόλος δεν υπάρχει ή δεν είναι Ρόλος πελάτη' using errcode = 'P0001';
  end if;
  if not authz.is_team_user() and not authz.client_role_grantable(p_role, p_client) then
    raise exception 'Δεν μπορείς να δώσεις Ρόλο με περισσότερα Δικαιώματα από τα δικά σου' using errcode = '42501';
  end if;
end;
$$;

-- Η πρόσκληση που ανοίγει ο συνδεδεμένος: ομάδα → access.team· πελάτης → άδεια πάνω στον Πελάτη της.
create function authz.assert_invitation_scope(p_inv public.invitations) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_inv.kind = 'team' then
    perform authz.require('access.team');
  else
    perform authz.assert_client_access(p_inv.client_id);
  end if;
end;
$$;

-- Ίχνος ενεργειών για γεγονότα της πρόσβασης (Γεγονότα 43, 58 του καταλόγου). Το entity είναι «access».
create function authz.access_event(p_event text, p_entity_id text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'access', p_entity_id, jsonb_build_object('event', p_event) || coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Ο πάροχος email μετράει ως συνδεδεμένος μόνο μετά από πραγματική αποστολή (όχι τοπικό δοκιμαστικό).
create function authz.mark_sender_connected(p_provider text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(p_provider, '') not in ('', 'local') then
    update public.agreement_defaults set email_sender_connected = true where id and not email_sender_connected;
  end if;
end;
$$;

-- Η Συμφωνία και ο Υπογράφων της, για τον worker. Null όταν δεν υπάρχει Υπογράφων.
create function authz.client_invite_target(p_agreement uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'clientId', op.client_id,
    'name', r.name,
    'email', lower(r.email),
    'alreadyMember', exists (
      select 1
        from public.client_users cu
        join auth.users u on u.id = cu.user_id
       where cu.client_id = op.client_id and cu.removed_at is null and lower(u.email) = lower(r.email)
    )
  )
    from public.agreements a
    join public.opportunities op on op.id = a.opportunity_id
    join public.agreement_recipients r on r.agreement_id = a.id and r.is_signatory
   where a.id = p_agreement;
$$;

-- ───────────── Προσκλήσεις ─────────────

create function public.invitation_create_team(p_name text, p_email text, p_locale text, p_role_ids uuid[]) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  perform authz.require('access.team');
  perform authz.assert_invite_fields(p_name, v_email, p_locale);
  perform authz.assert_team_roles_grantable(p_role_ids);
  perform authz.expire_invitations();
  perform authz.assert_invitable(v_email, 'team', null);
  insert into public.invitations (kind, email, name, locale, role_ids, invited_by)
  values ('team', v_email, trim(p_name), p_locale, p_role_ids, auth.uid())
  returning id into v_id;
  perform authz.access_event('team_invited', v_id::text);
  return v_id;
end;
$$;

-- Ο Ρόλος null σημαίνει «Πλήρης» (με το σταθερό κλειδί). Ο Χρήστης πελάτη προσκαλεί συναδέλφους μόνο στον επιλεγμένο του Πελάτη.
create function public.invitation_create_client(p_client uuid, p_name text, p_email text, p_locale text, p_role_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role uuid;
  v_id uuid;
begin
  perform authz.assert_client_access(p_client);
  v_role := coalesce(p_role_id, (select r.id from public.roles r where r.system_key = 'client_full'));
  perform authz.assert_invite_fields(p_name, v_email, p_locale);
  perform authz.assert_client_role_grantable(v_role, p_client);
  perform authz.expire_invitations();
  perform authz.assert_invitable(v_email, 'client', p_client);
  insert into public.invitations (kind, email, name, locale, role_ids, client_id, invited_by)
  values ('client', v_email, trim(p_name), p_locale, array[v_role], p_client, auth.uid())
  returning id into v_id;
  perform authz.access_event('client_invited', p_client::text, jsonb_build_object('invitationId', v_id));
  return v_id;
end;
$$;

-- Ο worker της πρότασης: ο Υπογράφων προσκαλείται ως Χρήστης πελάτη με Ρόλο «Πλήρης» (service role μόνο).
-- Επιστρέφει: null όταν δεν χρειάζεται τίποτα (ήδη μέλος, ή Χρήστης ομάδας που παραλείπεται)· το id της υπάρχουσας
-- εκκρεμούς πρόσκλησης όταν δεν έχει ακόμα λογαριασμό (νέα προσπάθεια)· αλλιώς το id της νέας πρόσκλησης.
create function public.invitation_create_signatory(p_agreement uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_target jsonb := authz.client_invite_target(p_agreement);
  v_client uuid;
  v_email text;
  v_pending record;
  v_role uuid := (select r.id from public.roles r where r.system_key = 'client_full');
  v_id uuid;
begin
  if v_target is null then
    raise exception 'Η Συμφωνία δεν έχει Υπογράφοντα' using errcode = 'P0001';
  end if;
  v_client := (v_target ->> 'clientId')::uuid;
  v_email := v_target ->> 'email';
  if (v_target ->> 'alreadyMember')::boolean then
    return null;
  end if;
  if exists (select 1 from public.team_users t where lower(t.email) = v_email) then
    return null;
  end if;
  perform authz.expire_invitations();
  select i.id, i.user_id into v_pending
    from public.invitations i
   where i.email = v_email and i.status = 'pending' and i.client_id = v_client;
  if found then
    -- Και με γραμμένο λογαριασμό: αν απέτυχε η αποστολή, η επόμενη προσπάθεια ξαναστέλνει την ίδια πρόσκληση.
    return v_pending.id;
  end if;
  perform authz.assert_invitable(v_email, 'client', v_client);
  insert into public.invitations (kind, email, name, locale, role_ids, client_id, invited_by)
  select 'client', v_email, trim(v_target ->> 'name'), a.language, array[v_role], v_client, null
    from public.agreements a
   where a.id = p_agreement
  returning id into v_id;
  perform authz.access_event('client_invited', v_client::text, jsonb_build_object('invitationId', v_id, 'auto', true));
  return v_id;
end;
$$;

-- Δίνει τον λογαριασμό στην πρόσκληση (service role μόνο). ΔΕΝ δίνει πρόσβαση: αυτό το κάνει η claim_invitation
-- όταν μπει ο ίδιος ο Χρήστης με τον σύνδεσμο. Ελέγχει το «ένα είδος ανά Χρήστη» από τώρα.
create function public.invitation_attach_user(p_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invitations;
begin
  select * into v_inv from public.invitations i where i.id = p_id for update;
  if not found or v_inv.status <> 'pending' then
    raise exception 'Η πρόσκληση δεν είναι εκκρεμής' using errcode = 'P0001';
  end if;
  if v_inv.kind = 'team' and exists (select 1 from public.client_users cu where cu.user_id = p_user_id and cu.removed_at is null) then
    raise exception 'Ο Χρήστης είναι ήδη Χρήστης πελάτη· ένας Χρήστης ανήκει σε ένα μόνο είδος' using errcode = 'P0001';
  end if;
  if v_inv.kind = 'client' and exists (select 1 from public.team_users t where t.user_id = p_user_id) then
    raise exception 'Ο Χρήστης είναι ήδη Χρήστης ομάδας· ένας Χρήστης ανήκει σε ένα μόνο είδος' using errcode = 'P0001';
  end if;
  update public.invitations set user_id = p_user_id where id = p_id;
end;
$$;

-- Η αποστολή απέτυχε (service role μόνο): η πρόσκληση κλείνει ως ακυρωμένη με το σφάλμα. Είναι η υπηρεσιακή εκδοχή
-- της invitation_cancel, που θέλει συνεδρία χρήστη.
create function public.invitation_fail(p_id uuid, p_error text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.invitations
     set status = 'cancelled', cancelled_at = now(), error = left(coalesce(p_error, ''), 500)
   where id = p_id and status = 'pending';
  if not found then
    raise exception 'Η πρόσκληση δεν είναι εκκρεμής' using errcode = 'P0001';
  end if;
end;
$$;

-- Νέα λήξη 7 ημερών και ξανά όλοι οι έλεγχοι του καλούντα (ο Ρόλος μπορεί να μην δίνεται πια). Ο worker στέλνει το email.
create function public.invitation_resend(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invitations;
begin
  perform authz.assert_invitation_capability();
  select * into v_inv from public.invitations i where i.id = p_id for update;
  if not found then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.assert_invitation_scope(v_inv);
  perform authz.expire_invitations();
  select * into v_inv from public.invitations i where i.id = p_id;
  if v_inv.status not in ('pending', 'expired') then
    raise exception 'Η πρόσκληση δεν επαναστέλνεται' using errcode = 'P0001';
  end if;
  if v_inv.kind = 'team' then
    perform authz.assert_team_roles_grantable(v_inv.role_ids);
  else
    perform authz.assert_client_role_grantable(v_inv.role_ids[1], v_inv.client_id);
  end if;
  perform authz.assert_invitee_kind(v_inv.email, v_inv.kind, v_inv.client_id);
  if exists (select 1 from public.invitations i where i.email = v_inv.email and i.status = 'pending' and i.id <> p_id) then
    raise exception 'Υπάρχει ήδη εκκρεμής πρόσκληση για αυτό το email' using errcode = 'P0001';
  end if;
  update public.invitations set status = 'pending', expires_at = now() + interval '7 days' where id = p_id;
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  values ('invite_resend', v_inv.name, v_inv.email, v_inv.locale, jsonb_build_object('invitationId', p_id), auth.uid());
  perform authz.access_event(
    case when v_inv.kind = 'team' then 'team_invite_resent' else 'client_invite_resent' end, p_id::text
  );
end;
$$;

create function public.invitation_cancel(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invitations;
begin
  perform authz.assert_invitation_capability();
  select * into v_inv from public.invitations i where i.id = p_id for update;
  if not found then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.assert_invitation_scope(v_inv);
  perform authz.expire_invitations();
  if (select i.status from public.invitations i where i.id = p_id) <> 'pending' then
    raise exception 'Ακυρώνεται μόνο εκκρεμής πρόσκληση' using errcode = 'P0001';
  end if;
  update public.invitations set status = 'cancelled', cancelled_at = now() where id = p_id;
  perform authz.access_event(
    case when v_inv.kind = 'team' then 'team_invite_cancelled' else 'client_invite_cancelled' end, p_id::text
  );
end;
$$;

-- Οι προσκλήσεις: ομάδας (χωρίς p_client, με access.team) ή ενός Πελάτη. Εκκρεμείς, και όσες έκλεισαν τις τελευταίες 30 ημέρες.
-- Ο Πελάτης δεν βλέπει ποιο μέλος της ομάδας προσκάλεσε ούτε τα id λογαριασμών.
create function public.invitations_view(p_client uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_team boolean := p_client is null;
  v_viewer_is_team boolean := authz.is_team_user();
  v_result jsonb;
begin
  if p_client is null then
    perform authz.require('access.team');
  else
    perform authz.assert_client_access(p_client);
  end if;
  perform authz.expire_invitations();
  select coalesce(jsonb_agg(rows.row_json order by rows.created desc), '[]'::jsonb) into v_result
    from (
      select jsonb_build_object(
          'id', i.id,
          'kind', i.kind,
          'email', i.email,
          'name', i.name,
          'locale', i.locale,
          'roles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.name)
                               from public.roles r where r.id = any (i.role_ids)), '[]'::jsonb),
          'client', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name) end,
          'invitedBy', case when v_viewer_is_team and u.user_id is not null then jsonb_build_object('id', u.user_id, 'name', u.name) end,
          'createdAt', i.created_at,
          'expiresAt', i.expires_at,
          'status', i.status,
          'acceptedAt', i.accepted_at,
          'existingUserId', case when v_viewer_is_team then (select au.id from auth.users au where lower(au.email) = i.email limit 1) end
        ) as row_json,
        i.created_at as created
        from public.invitations i
        left join public.clients c on c.id = i.client_id
        left join public.team_users u on u.user_id = i.invited_by
       where ((v_team and i.kind = 'team') or (not v_team and i.kind = 'client' and i.client_id = p_client))
         and (i.status = 'pending'
              or (i.status = 'accepted' and i.accepted_at > now() - interval '30 days')
              or (i.status = 'expired' and i.expires_at > now() - interval '30 days'))
       order by i.created_at desc
       limit 200
    ) as rows;
  return v_result;
end;
$$;

-- Ο Χρήστης που μπήκε με τον σύνδεσμο αποδέχεται την πρόσκλησή του: μόνο η πρόσκληση που έχει δοθεί στον λογαριασμό του
-- (user_id = auth.uid()), εκκρεμής και μη ληγμένη. Γράφει τη συμμετοχή και κλείνει την πρόσκληση. Ξανακαλούμενη: false.
create function public.claim_invitation() returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.invitations;
begin
  if auth.uid() is null then
    return false;
  end if;
  select * into v_inv from public.invitations i
   where i.user_id = auth.uid() and i.status = 'pending' and i.expires_at > now()
   for update;
  if not found then
    return false;
  end if;
  if v_inv.kind = 'team' then
    insert into public.team_users (user_id, name, email, language) values (auth.uid(), v_inv.name, v_inv.email, v_inv.locale);
    -- Μόνο οι Ρόλοι που υπάρχουν ακόμα: ένας Ρόλος που σβήστηκε μετά την πρόσκληση δεν μπλοκάρει την είσοδο.
    insert into public.team_user_roles (user_id, role_id)
    select auth.uid(), r.id from public.roles r where r.id = any(v_inv.role_ids);
    perform authz.access_event('team_user_added', v_inv.id::text);
  else
    insert into public.client_users (client_id, user_id, name, role_id, invited_by, is_current)
    values (v_inv.client_id, auth.uid(), v_inv.name,
            coalesce((select r.id from public.roles r where r.id = v_inv.role_ids[1]),
                     (select r.id from public.roles r where r.system_key = 'client_full')),
            v_inv.invited_by,
            not exists (select 1 from public.client_users cu where cu.user_id = auth.uid() and cu.removed_at is null))
    on conflict (client_id, user_id) do update
      set name = excluded.name, role_id = excluded.role_id, invited_by = excluded.invited_by,
          joined_at = now(), removed_at = null, is_current = excluded.is_current;
    perform authz.access_event('client_user_added', v_inv.client_id::text, jsonb_build_object('userId', auth.uid()));
  end if;
  update public.invitations set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return true;
end;
$$;

-- Ρόλοι πελάτη που μπορεί να δώσει ο συνδεδεμένος στον Πελάτη: όλοι για την ομάδα· για Χρήστη πελάτη μόνο όσους δεν
-- ξεπερνούν τα δικά του Δικαιώματα. Για τη φόρμα της πρόσκλησης, χωρίς να φαίνονται οι Ρόλοι στην ομάδα μόνο.
create function public.client_role_choices(p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.assert_client_access(p_client);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name) order by r.name)
      from public.roles r
     where r.kind = 'client' and not r.is_owner
       and (authz.is_team_user() or authz.client_role_grantable(r.id, p_client))
  ), '[]'::jsonb);
end;
$$;

-- Το id του λογαριασμού με αυτό το email (service role μόνο). Αντικαθιστά το κόλπο «generateLink για να βρω το id».
create function public.auth_user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(coalesce(p_email, ''))) limit 1;
$$;

-- ───────────── Χρήστες πελάτη ─────────────

-- Οι ενεργοί Χρήστες ενός Πελάτη. Η ομάδα βλέπει και τελευταία είσοδο και ποιος προσκάλεσε· ο Πελάτης όχι.
create function public.client_users_view(p_client uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_team boolean := authz.is_team_user();
  v_result jsonb;
begin
  perform authz.assert_client_access(p_client);
  select coalesce(jsonb_agg(rows.row_json order by rows.joined), '[]'::jsonb) into v_result
    from (
      select jsonb_build_object(
          'userId', cu.user_id,
          'name', cu.name,
          'email', au.email,
          'roleId', r.id,
          'roleName', r.name,
          'joinedAt', cu.joined_at,
          'isCurrent', cu.is_current,
          'invitedBy', case when v_team and inv.user_id is not null then jsonb_build_object('id', inv.user_id, 'name', inv.name) end,
          'lastSignInAt', case when v_team then au.last_sign_in_at end
        ) as row_json,
        cu.joined_at as joined
        from public.client_users cu
        join auth.users au on au.id = cu.user_id
        join public.roles r on r.id = cu.role_id
        left join public.team_users inv on inv.user_id = cu.invited_by
       where cu.client_id = p_client and cu.removed_at is null
    ) as rows;
  return v_result;
end;
$$;

-- Ο συνδεδεμένος Χρήστης πελάτη διαλέγει με ποιον Πελάτη δουλεύει. Μόνο σε Πελάτη όπου είναι ενεργός.
create function public.client_user_select(p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.client_users cu
     where cu.user_id = auth.uid() and cu.client_id = p_client and cu.removed_at is null
  ) then
    raise exception 'Δεν ανήκεις σε αυτόν τον Πελάτη' using errcode = 'P0001';
  end if;
  update public.client_users set is_current = false
   where user_id = auth.uid() and is_current and client_id <> p_client;
  update public.client_users set is_current = true
   where user_id = auth.uid() and client_id = p_client;
end;
$$;

-- Αφαίρεση Χρήστη πελάτη από αυτόν τον Πελάτη. Ο λογαριασμός απενεργοποιείται (deactivate) μόνο όταν δεν μένει σε
-- κανέναν Πελάτη· η ενέργεια του server κλείνει τις συνεδρίες. Ο Υπογράφων σε πρόταση που περιμένει υπογραφή
-- δίνει signatoryWarning: η πρόταση θέλει νέο Υπογράφοντα.
create function public.client_user_remove(p_client uuid, p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.client_users;
  v_deactivate boolean;
  v_warning boolean;
begin
  perform authz.assert_client_access(p_client);
  if p_user_id = auth.uid() then
    raise exception 'Δεν αφαιρείς τον εαυτό σου· γράψε στη Συνομιλία' using errcode = 'P0001';
  end if;
  select * into v_row from public.client_users cu
   where cu.client_id = p_client and cu.user_id = p_user_id and cu.removed_at is null
     for update;
  if not found then
    raise exception 'Ο Χρήστης δεν ανήκει σε αυτόν τον Πελάτη' using errcode = 'P0001';
  end if;
  update public.client_users set removed_at = now(), is_current = false
   where client_id = p_client and user_id = p_user_id;
  if v_row.is_current then
    update public.client_users set is_current = true
     where user_id = p_user_id and removed_at is null
       and client_id = (select cu.client_id from public.client_users cu
                         where cu.user_id = p_user_id and cu.removed_at is null order by cu.joined_at limit 1);
  end if;
  v_deactivate := not exists (select 1 from public.client_users cu where cu.user_id = p_user_id and cu.removed_at is null);
  v_warning := exists (
    select 1
      from public.agreement_recipients r
      join public.agreements a on a.id = r.agreement_id
      join auth.users u on lower(u.email) = lower(r.email)
     where u.id = p_user_id and r.is_signatory and a.state = 'proposal' and a.path = 'sent'
  );
  perform authz.access_event('client_user_removed', p_client::text,
    jsonb_build_object('userId', p_user_id, 'deactivated', v_deactivate));
  return jsonb_build_object('deactivate', v_deactivate, 'signatoryWarning', v_warning);
end;
$$;

-- Οι Πελάτες του συνδεδεμένου Χρήστη πελάτη, με τον Ρόλο του και ποιος είναι ο επιλεγμένος.
create function public.my_client_memberships() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'clientId', c.id, 'name', c.name, 'roleName', r.name, 'isCurrent', cu.is_current
    ) order by c.name), '[]'::jsonb)
    from public.client_users cu
    join public.clients c on c.id = cu.client_id
    join public.roles r on r.id = cu.role_id
   where cu.user_id = auth.uid() and cu.removed_at is null;
$$;

-- Ενεργοποίηση ή απενεργοποίηση Χρήστη ομάδας (access.team). Γράφει το γεγονός. Ο server κλείνει τις συνεδρίες.
create function public.team_user_set_active(p_user_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('access.team');
  if not exists (select 1 from public.team_users t where t.user_id = p_user_id) then
    raise exception 'Ο Χρήστης ομάδας δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.team_users t where t.user_id = p_user_id and t.is_active = p_active) then
    return;
  end if;
  update public.team_users set is_active = p_active where user_id = p_user_id;
  perform authz.access_event(case when p_active then 'user_reactivated' else 'user_deactivated' end, p_user_id::text);
end;
$$;

-- ───────────── Ουρά email ─────────────

-- Ο worker (service role) παίρνει τα εκκρεμή μηνύματα. Κλειδώνει τη γραμμή για 5 λεπτά και ανεβάζει τον μετρητή.
create function public.email_outbox_claim(p_limit integer default 20)
returns table (id uuid, kind text, to_name text, to_email text, locale text, payload jsonb, attempts integer)
language sql security definer set search_path = ''
as $$
  with picked as (
    select o.id from public.email_outbox o
     where o.status = 'pending' and (o.locked_until is null or o.locked_until < now())
     order by o.created_at
     limit greatest(1, least(coalesce(p_limit, 20), 100))
     for update skip locked
  ), claimed as (
    update public.email_outbox o
       set attempts = o.attempts + 1, locked_until = now() + interval '5 minutes'
      from picked where o.id = picked.id
    returning o.id as out_id, o.kind as out_kind, o.to_name as out_name, o.to_email as out_email,
              o.locale as out_locale, o.payload as out_payload, o.attempts as out_attempts, o.created_at as out_created
  )
  select c.out_id, c.out_kind, c.out_name, c.out_email, c.out_locale, c.out_payload, c.out_attempts
    from claimed c
   order by c.out_created;
$$;

-- Αποτέλεσμα αποστολής. Επιτυχία: «sent» και γραμμή στο ιστορικό· αποτυχία: ξαναπροσπαθεί μέχρι 5 φορές, μετά «failed».
-- Η πρώτη πραγματική επιτυχία (όχι τοπική) σηκώνει το flag του πάροχου. Το κλείδωμα λύνεται σε κάθε περίπτωση.
create function public.email_outbox_done(
  p_outbox uuid, p_ok boolean, p_subject text default '', p_error text default '',
  p_provider_id text default '', p_suppressed boolean default false
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.email_outbox;
  v_subject text := left(coalesce(p_subject, ''), 200);
  v_error text := left(coalesce(p_error, ''), 500);
  v_provider text := left(coalesce(p_provider_id, ''), 200);
begin
  select * into o from public.email_outbox x where x.id = p_outbox for update;
  if not found or o.status <> 'pending' then
    return;
  end if;
  update public.email_outbox set locked_until = null where id = p_outbox;
  if coalesce(p_suppressed, false) then
    update public.email_outbox set status = 'suppressed', handled_at = now(), last_error = v_error where id = p_outbox;
    insert into public.email_log (kind, to_email, subject, status, error) values (o.kind, o.to_email, v_subject, 'suppressed', v_error);
  elsif coalesce(p_ok, false) then
    update public.email_outbox set status = 'sent', handled_at = now(), provider_id = v_provider, last_error = '' where id = p_outbox;
    insert into public.email_log (kind, to_email, subject, status, provider_id) values (o.kind, o.to_email, v_subject, 'sent', v_provider);
    perform authz.mark_sender_connected(v_provider);
  elsif o.attempts >= 5 then
    update public.email_outbox set status = 'failed', handled_at = now(), last_error = v_error where id = p_outbox;
    insert into public.email_log (kind, to_email, subject, status, error) values (o.kind, o.to_email, v_subject, 'failed', v_error);
  else
    update public.email_outbox set last_error = v_error where id = p_outbox;
  end if;
end;
$$;

-- Ο worker των Συμφωνιών: ίδιο κλείδωμα. Η παραλαβή επιστρέφει μόνο όσα δεν είναι κλειδωμένα.
create or replace function public.agreement_outbox_claim(p_limit integer default 20)
returns table (
  id uuid, kind text, to_name text, to_email text, locale text, payload jsonb, agreement_id uuid, agreement_title text,
  manager_name text, attempts integer, document jsonb
)
language sql security definer set search_path = ''
as $$
  with picked as (
    select o.id from public.agreement_outbox o
     where o.status = 'pending'
       and (o.locked_until is null or o.locked_until < now())
       and (select d.email_sender_connected from public.agreement_defaults d where d.id)
     order by o.created_at limit greatest(1, least(coalesce(p_limit, 20), 100))
     for update skip locked
  ), claimed as (
    update public.agreement_outbox o
       set attempts = o.attempts + 1, locked_until = now() + interval '5 minutes'
      from picked where o.id = picked.id
    returning o.*
  )
  select c.id, c.kind, c.to_name, c.to_email, c.locale, c.payload, c.agreement_id, a.title, u.name, c.attempts,
         case when c.kind = 'signed_copy'
              then (select d.document from public.agreement_documents d where d.agreement_id = c.agreement_id and d.revision = a.revision) end
    from claimed c
    join public.agreements a on a.id = c.agreement_id
    join public.opportunities op on op.id = a.opportunity_id
    left join public.team_users u on u.user_id = op.manager_id
   order by c.created_at;
$$;

-- Το αποτέλεσμα της Συμφωνίας όπως πριν, και λύνεται το κλείδωμα.
create or replace function public.agreement_outbox_done(p_outbox uuid, p_ok boolean, p_error text default '') returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.agreement_outbox;
begin
  select * into o from public.agreement_outbox x where x.id = p_outbox for update;
  if not found or o.status <> 'pending' then
    return;
  end if;
  update public.agreement_outbox set locked_until = null where id = p_outbox;
  if coalesce(p_ok, false) then
    update public.agreement_outbox set status = 'sent', handled_at = now(), payload = '{}'::jsonb, last_error = '' where id = p_outbox;
  elsif o.attempts >= 5 then
    update public.agreement_outbox set status = 'failed', handled_at = now(), payload = '{}'::jsonb, last_error = left(coalesce(p_error, ''), 500)
     where id = p_outbox;
  else
    update public.agreement_outbox set last_error = left(coalesce(p_error, ''), 500) where id = p_outbox;
  end if;
end;
$$;

-- Γραμμή ιστορικού για αποστολές που δεν περνούν από την ουρά (hook αυθεντικοποίησης, μηνύματα Συμφωνίας).
-- Ό,τι έρχεται εδώ είναι θέμα και κατάσταση, ποτέ σύνδεσμος ή κωδικός.
create function public.email_log_record(
  p_kind text, p_to_email text, p_subject text, p_status text, p_provider_id text default '', p_error text default ''
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_status not in ('sent', 'failed', 'suppressed') then
    raise exception 'Άγνωστη κατάσταση αποστολής' using errcode = 'P0001';
  end if;
  insert into public.email_log (kind, to_email, subject, status, provider_id, error)
  values (left(p_kind, 40), lower(trim(p_to_email)), left(coalesce(p_subject, ''), 200), p_status,
          left(coalesce(p_provider_id, ''), 200), left(coalesce(p_error, ''), 500));
  if p_status = 'sent' then
    perform authz.mark_sender_connected(p_provider_id);
  end if;
end;
$$;

-- Δοκιμαστικό email από τον Ιδιοκτήτη, μόνο στον δικό του λογαριασμό. Ο service role βάζει οποιοδήποτε είδος.
create function public.email_outbox_enqueue(p_kind text, p_to_name text, p_to_email text, p_locale text, p_payload jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_to_email, '')));
  v_id uuid;
begin
  if auth.uid() is not null then
    if not authz.is_owner() then
      raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
    end if;
    if p_kind <> 'test' or v_email <> (select lower(u.email) from auth.users u where u.id = auth.uid()) then
      raise exception 'Το δοκιμαστικό email πάει μόνο στον λογαριασμό σου' using errcode = 'P0001';
    end if;
  end if;
  if p_kind not in ('test', 'invite_resend', 'client_added') then
    raise exception 'Άγνωστο είδος email' using errcode = 'P0001';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Το email δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  values (p_kind, trim(coalesce(p_to_name, '')), v_email, coalesce(p_locale, 'el'),
          coalesce(p_payload, '{}'::jsonb), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Ιστορικό αποστολών για τον Ιδιοκτήτη (Ρυθμίσεις › Ενσωματώσεις).
create function public.email_log_view(p_limit integer default 20) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', rows.id, 'kind', rows.kind, 'toEmail', rows.to_email, 'subject', rows.subject,
        'status', rows.status, 'providerId', rows.provider_id, 'error', rows.error, 'sentAt', rows.sent_at
      ) order by rows.sent_at desc)
      from (
        select l.id, l.kind, l.to_email, l.subject, l.status, l.provider_id, l.error, l.sent_at
          from public.email_log l
         order by l.sent_at desc
         limit least(greatest(coalesce(p_limit, 20), 1), 100)
      ) as rows
  ), '[]'::jsonb);
end;
$$;

-- Ο service role διαβάζει τον Πελάτη και τον Υπογράφοντα μιας Συμφωνίας για τη ρύθμιση της πρόσκλησης.
create function public.client_invite_target(p_agreement uuid) returns jsonb
language sql security definer set search_path = ''
as $$ select authz.client_invite_target(p_agreement); $$;

-- ───────────── Τα Δικαιώματα του συνδεδεμένου Χρήστη (και των Πελατών του) ─────────────

create or replace function public.my_permissions()
returns table (permission text, scope text)
language sql stable security definer set search_path = ''
as $$
  select p.code, s.scope
    from public.permissions p
    cross join lateral (
      select case
        when p.kind = 'client' then case when authz.client_user_has(p.code) then 'all' end
        else authz.user_scope(auth.uid(), p.code)
      end as scope
    ) s
   where s.scope is not null
   order by p.sort;
$$;

-- ───────────── Ίχνος ενεργειών για τους νέους πίνακες ─────────────

create trigger invitations_audit after insert or update on public.invitations
  for each row execute function authz.audit_row('id');
create trigger client_users_audit after insert or update on public.client_users
  for each row execute function authz.audit_row('client_id');
create trigger email_outbox_audit after insert or update of status on public.email_outbox
  for each row execute function authz.audit_row('id');
create trigger email_log_audit after insert on public.email_log
  for each row execute function authz.audit_row('id');

-- Ίχνος: λίστα επιτρεπτών (ξαναγράφεται ολόκληρη). Τα email_log και email_outbox μόνο για τον Ιδιοκτήτη.
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
    -- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): χωρίς ποσά· το email μόνο για τον Ιδιοκτήτη
    when 'access' then true
    when 'invitations' then true
    when 'client_users' then true
    when 'email_outbox' then authz.is_owner()
    when 'email_log' then authz.is_owner()
    else false
  end;
$$;

-- ───────────── Δικαιώματα πινάκων και συναρτήσεων ─────────────
-- Οι νέοι πίνακες είναι κλειστοί: ό,τι διαβάζεται ή γράφεται, περνά από τις συναρτήσεις παραπάνω.
revoke all on table public.client_users, public.invitations, public.email_outbox, public.email_log
  from anon, authenticated;

-- Βοηθητικές συναρτήσεις του module: μόνο από τις security definer συναρτήσεις του.
revoke all on function
  authz.can_manage_client_users(uuid), authz.assert_client_capability(), authz.assert_invitation_capability(),
  authz.assert_client_access(uuid), authz.client_role_grantable(uuid, uuid),
  authz.expire_invitations(), authz.assert_invite_fields(text, text, text), authz.assert_invitee_kind(text, text, uuid),
  authz.assert_invitable(text, text, uuid),
  authz.assert_team_roles_grantable(uuid[]), authz.assert_client_role_grantable(uuid, uuid),
  authz.assert_invitation_scope(public.invitations), authz.access_event(text, text, jsonb),
  authz.mark_sender_connected(text), authz.client_invite_target(uuid),
  authz.guard_client_user(), authz.guard_team_user_kind()
  from public;

-- Συναρτήσεις που καλεί ο συνδεδεμένος Χρήστης (ομάδα ή πελάτης), με έλεγχο στο σώμα.
revoke all on function
  public.invitation_create_team(text, text, text, uuid[]), public.invitation_create_client(uuid, text, text, text, uuid),
  public.invitation_resend(uuid), public.invitation_cancel(uuid), public.invitations_view(uuid), public.claim_invitation(),
  public.client_users_view(uuid), public.client_user_select(uuid), public.client_user_remove(uuid, uuid),
  public.my_client_memberships(), public.email_outbox_enqueue(text, text, text, text, jsonb), public.email_log_view(integer),
  public.client_role_choices(uuid), public.team_user_set_active(uuid, boolean)
  from public, anon;
grant execute on function
  public.invitation_create_team(text, text, text, uuid[]), public.invitation_create_client(uuid, text, text, text, uuid),
  public.invitation_resend(uuid), public.invitation_cancel(uuid), public.invitations_view(uuid), public.claim_invitation(),
  public.client_users_view(uuid), public.client_user_select(uuid), public.client_user_remove(uuid, uuid),
  public.my_client_memberships(), public.email_outbox_enqueue(text, text, text, text, jsonb), public.email_log_view(integer),
  public.client_role_choices(uuid), public.team_user_set_active(uuid, boolean)
  to authenticated;

-- Συναρτήσεις του worker και των μηνυμάτων συστήματος: μόνο service role.
revoke all on function
  public.invitation_attach_user(uuid, uuid), public.invitation_fail(uuid, text),
  public.invitation_create_signatory(uuid), public.client_invite_target(uuid),
  public.email_outbox_claim(integer), public.email_outbox_done(uuid, boolean, text, text, text, boolean),
  public.email_log_record(text, text, text, text, text, text), public.auth_user_id_by_email(text)
  from public, anon, authenticated;
grant execute on function
  public.invitation_attach_user(uuid, uuid), public.invitation_fail(uuid, text),
  public.invitation_create_signatory(uuid), public.client_invite_target(uuid),
  public.email_outbox_claim(integer), public.email_outbox_done(uuid, boolean, text, text, text, boolean),
  public.email_log_record(text, text, text, text, text, text), public.auth_user_id_by_email(text)
  to service_role;
