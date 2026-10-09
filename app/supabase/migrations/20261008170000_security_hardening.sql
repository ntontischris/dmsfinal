-- Σκλήρυνση ασφάλειας μετά από έλεγχο: προστασία Ιδιοκτητών στο team_users, κλείδωμα του τελευταίου Ιδιοκτήτη,
-- Ίχνος που δεν δείχνει Πελάτες εκτός Εύρους, πρώτος Ιδιοκτήτης μόνο με πρόσκληση, ελάχιστα δικαιώματα πινάκων.
-- Όλα εδώ ισχύουν και για νέους πίνακες (default privileges) και δεν αλλάζουν τη συμπεριφορά της εφαρμογής για έγκυρες ενέργειες.

-- ───────────── 1. Προστασία Ιδιοκτητών στο team_users ─────────────
-- Η επανενεργοποίηση και κάθε αλλαγή στοιχείων μιας γραμμής Ιδιοκτήτη γίνεται μόνο από Ιδιοκτήτη. Ο έλεγχος ρωτά τον Ρόλο
-- (team_user_roles + roles.is_owner) και ΟΧΙ το authz.user_is_owner, γιατί εκείνο απαιτεί ενεργό Χρήστη: ένας απενεργοποιημένος
-- Ιδιοκτήτης θα περνούσε για «απλός Χρήστης». Μόνο όταν υπάρχει auth.uid(): ο service role και τα migrations δεν επηρεάζονται.
-- Το user_id και το created_at δεν αλλάζουν ποτέ (το Ίχνος και τα ονόματα συγγραφέα στηρίζονται σε αυτά), για όλους.
-- Η εφαρμογή δεν έχει οθόνη επεξεργασίας του δικού σου προφίλ· αν προστεθεί, ο Ιδιοκτήτης περνά ήδη (is_owner) και οι υπόλοιποι
-- αλλάζουν μόνο γραμμές που δεν είναι Ιδιοκτήτη.
create function authz.guard_team_user_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at then
    raise exception 'Το αναγνωριστικό και η ημερομηνία δημιουργίας ενός Χρήστη δεν αλλάζουν' using errcode = 'P0001';
  end if;
  if auth.uid() is not null and not authz.is_owner() and to_jsonb(new) is distinct from to_jsonb(old)
     and exists (
       select 1 from public.team_user_roles ur join public.roles r on r.id = ur.role_id
        where ur.user_id = old.user_id and r.is_owner
     ) then
    if not old.is_active and new.is_active then
      raise exception 'Έναν Ιδιοκτήτη τον επανενεργοποιεί μόνο Ιδιοκτήτης' using errcode = 'P0001';
    end if;
    raise exception 'Τα στοιχεία ενός Ιδιοκτήτη τα αλλάζει μόνο Ιδιοκτήτης' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function authz.guard_team_user_owner() from public;

create trigger team_users_owner_guard before update on public.team_users
  for each row execute function authz.guard_team_user_owner();

-- ───────────── 2. Τελευταίος Ιδιοκτήτης: σειριοποίηση και κάλυψη του UPDATE ─────────────
-- Δύο ταυτόχρονες συναλλαγές έβλεπαν η μία τον άλλο Ιδιοκτήτη ακόμη ενεργό και περνούσαν και οι δύο. Το κλείδωμα συναλλαγής
-- τις βάζει στη σειρά· η δεύτερη ξαναδιαβάζει μετά το commit της πρώτης. Το σώμα είναι αυτό του 20261008110000.
create or replace function authz.guard_last_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Μόνο όταν φεύγει Ρόλος Ιδιοκτήτης ή απενεργοποιείται Χρήστης.
  if tg_table_name = 'team_user_roles' then
    if not (select r.is_owner from public.roles r where r.id = (to_jsonb(old) ->> 'role_id')::uuid) then
      return null;
    end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('authz.last_owner'));
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

-- Η αλλαγή Ρόλου ή Χρήστη σε γραμμή Ρόλου Ιδιοκτήτη ισοδυναμεί με αφαίρεση του Ιδιοκτήτη.
create trigger team_user_roles_last_owner_update after update of role_id, user_id on public.team_user_roles
  for each row execute function authz.guard_last_owner();

-- ───────────── 3. Ίχνος: λίστα επιτρεπτών, και Πελάτες/Ευκαιρίες μόνο εντός Εύρους ─────────────
-- Το Ίχνος κρατά ολόκληρη τη γραμμή πριν/μετά. Άγνωστη οντότητα δεν φαίνεται (default deny)· κάθε πίνακας που γράφει στο Ίχνος
-- πρέπει να μπει εδώ ρητά. Οικονομικά/κόστος: όπως πριν. Πελάτες και Ευκαιρίες: η γραμμή ελέγχεται και ανά εγγραφή (παρακάτω).
create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
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
    else false
  end;
$$;

-- Βλέπει ο Χρήστης αυτόν τον Πελάτη; (με αναζήτηση του Υπεύθυνου· Πελάτης που δεν βρέθηκε μετράει μόνο για Εύρος «όλα»)
create function authz.can_see_client_id(p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.can_see_client(p_client, (select c.manager_id from public.clients c where c.id = p_client));
$$;

-- Φαίνεται η γραμμή του Ίχνους; Πρώτα ο κανόνας ανά οντότητα, μετά για Πελάτες και Ευκαιρίες το ίδιο Εύρος με τους πίνακές τους (ADR 0007).
create function authz.audit_row_allowed(p_entity text, p_entity_id text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_client uuid;
  v_other uuid;
  v_manager uuid;
begin
  if not authz.audit_entity_allowed(p_entity) then
    return false;
  end if;
  if p_entity not in ('clients', 'client_duplicate_flags', 'opportunities', 'access_requests') then
    return true;
  end if;
  if p_entity_id is null or p_entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_id := p_entity_id::uuid;
  if p_entity = 'clients' then
    return authz.can_see_client_id(v_id);
  elsif p_entity = 'opportunities' then
    select o.client_id, o.manager_id into v_client, v_manager from public.opportunities o where o.id = v_id;
    return authz.can_see_opportunity_row(v_client, v_manager);
  elsif p_entity = 'client_duplicate_flags' then
    select f.client_id, f.matches_client_id into v_client, v_other from public.client_duplicate_flags f where f.id = v_id;
    return authz.can_see_client_id(v_client) and authz.can_see_client_id(v_other);
  end if;
  select r.client_id into v_client from public.access_requests r where r.id = v_id;
  return authz.can_see_client_id(v_client);
end;
$$;

revoke all on function authz.can_see_client_id(uuid), authz.audit_row_allowed(text, text) from public;
grant execute on function authz.can_see_client_id(uuid), authz.audit_row_allowed(text, text) to authenticated;

drop policy "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών», χωρίς ποσά και κόστος που δεν δικαιούται" on public.audit_log;
create policy "Το Ίχνος το βλέπει όποιος έχει «Βλέπει ίχνος ενεργειών», μόνο όσα δικαιούται να δει"
  on public.audit_log for select to authenticated
  using (authz.has('audit.view') and authz.audit_row_allowed(entity, entity_id));

-- ───────────── 4. Πρώτος Ιδιοκτήτης: μόνο λογαριασμός που προσκλήθηκε ─────────────
-- Ο πρώτος Ιδιοκτήτης προσκαλείται από τον developer (Supabase dashboard)· η αυτο-εγγραφή και το OAuth δεν έχουν invited_at,
-- άρα δεν μπορούν να διεκδικήσουν τον Ρόλο ακόμη κι αν οι εγγραφές είναι ανοιχτές. Τα υπόλοιπα όπως πριν.
create or replace function public.claim_first_owner() returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mail text;
begin
  if uid is null then
    return false;
  end if;
  lock table public.team_users in share row exclusive mode;
  if exists (select 1 from public.team_users) then
    return false;
  end if;
  select u.email into mail from auth.users u where u.id = uid and u.invited_at is not null;
  if not found then
    return false;
  end if;
  insert into public.team_users (user_id, name, email) values (uid, split_part(mail, '@', 1), mail);
  insert into public.team_user_roles (user_id, role_id) select uid, r.id from public.roles r where r.is_owner;
  return true;
end;
$$;

-- ───────────── 5. Ελάχιστα δικαιώματα πινάκων ─────────────
-- Ο ανώνυμος επισκέπτης δεν διαβάζει πίνακες (οι ανώνυμες σελίδες χρησιμοποιούν μόνο RPC). Οι authenticated δεν έχουν
-- TRUNCATE/REFERENCES/TRIGGER (το TRUNCATE δεν περνά από RLS ούτε από triggers γραμμής). Ό,τι μένει είναι ό,τι χρειάζονται οι policies.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

revoke insert, update, delete on table public.audit_log, public.permissions from authenticated;
revoke delete on table public.team_users, public.bank_accounts from authenticated;
revoke update on table public.team_user_roles, public.readiness_confirmations from authenticated;
revoke insert, delete on table public.company_settings, public.system_state from authenticated;

-- Και για τους πίνακες που θα προστεθούν αργότερα.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;

-- ───────────── 6. Αίτημα πρόσβασης: όχι με αποσυρμένη Πηγή ─────────────
-- Η έγκριση δέχεται Πηγή που αποσύρθηκε ΜΕΤΑ το Αίτημα (sales_decide_access)· το Αίτημα όμως δεν πρέπει να γίνεται με ήδη αποσυρμένη.
create or replace function public.sales_request_access(
  p_client uuid, p_topic text, p_comment text, p_source_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_manager uuid;
  v_id uuid;
begin
  perform authz.require('clients.manage');
  select c.manager_id into v_manager from public.clients c where c.id = p_client and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_manager is null then
    raise exception 'Ο Πελάτης δεν έχει ακόμα Υπεύθυνο· ζήτα από τη Διαχείριση να τον αναθέσει' using errcode = 'P0001';
  end if;
  if v_manager = auth.uid() or coalesce(authz.scope('clients.manage'), '') = 'all' then
    raise exception 'Δεν χρειάζεσαι Αίτημα πρόσβασης για αυτόν τον Πελάτη' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.sales_sources s where s.id = p_source_id and s.retired_at is null) then
    raise exception 'Η Πηγή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  insert into public.access_requests (client_id, requester_id, topic, comment, source_id)
  values (p_client, auth.uid(), trim(coalesce(p_topic, '')), trim(coalesce(p_comment, '')), p_source_id)
  returning id into v_id;
  return v_id;
end;
$$;
