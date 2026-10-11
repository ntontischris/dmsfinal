-- Μηνύματα Jα (#160): Συνομιλία ομάδας και Εισερχόμενα. Βάση για τα Jβ (πελάτης), Jγ (Συνημμένα), Jδ (Αιτήματα), Jε (Email, Ρυθμίσεις).
--
--  • Μία Συνομιλία ανά Πελάτη (ADR 0012): δεν υπάρχει πίνακας Συνομιλίας, προκύπτει από τα Μηνύματα του Πελάτη.
--  • Οι πίνακες είναι κλειστοί (RLS χωρίς policies, revoke). Πρόσβαση μόνο μέσα από τα RPC παρακάτω.
--  • Η ορατότητα υπολογίζεται σε κάθε ανάγνωση (authz.message_visible) και δεν αποθηκεύεται· αφαίρεση Μέλους κόβει αμέσως.
--  • Ο έλεγχος Δικαιώματος γίνεται πρώτος και δίνει 42501 με το ίδιο μήνυμα για ανύπαρκτο και για μη ορατό Μήνυμα.
--  • Αδιάβαστα ανά (Χρήστη, Πελάτη) με δείκτη ανάγνωσης (Μ3). Διόρθωση για Χ λεπτά (Μ5), διαγραφή soft.
--  • Ίχνος: μόνο οι αλλαγές (διόρθωση, διαγραφή, ετικέτα)· ορατό σε όσους έχουν «Βλέπει ίχνος» και Εύρος «όλα» στη Συνομιλία.
--  • Επεκτάσεις που προβλέπονται: Αιτήματα (στήλες/πίνακας πάνω στο messages), Συνημμένα (πίνακας με message_id), ρυθμίσεις (message_settings).

-- ───────────── Πίνακες ─────────────

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  -- null = χωρίς ετικέτα. Η Παραγωγή πρέπει να ανήκει στον ίδιο Πελάτη (το εξασφαλίζουν τα RPC).
  production_id uuid references public.productions (id),
  author_id uuid not null references auth.users (id),
  author_kind text not null check (author_kind in ('team', 'client')),
  body text not null check (body = btrim(body) and length(body) between 1 and 4000),
  is_internal boolean not null default false,
  -- Μόνο σε Εσωτερικά· μόνο Χρήστες ομάδας με «Συνομιλεί με πελάτη».
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id),
  check (not is_internal or author_kind = 'team'),
  check (is_internal or cardinality(mentions) = 0),
  check ((deleted_at is null) = (deleted_by is null))
);

create index messages_client_created_idx on public.messages (client_id, created_at);
create index messages_production_idx on public.messages (production_id) where production_id is not null;
-- «Με ανέφεραν»: αναζήτηση με mentions @> array[χρήστης].
create index messages_mentions_idx on public.messages using gin (mentions) where is_internal;

-- «Ως πού διάβασα» ανά (Χρήστη, Πελάτη). Κανείς δεν βλέπει τι διάβασαν οι άλλοι.
create table public.message_reads (
  user_id uuid not null references auth.users (id),
  client_id uuid not null references public.clients (id),
  read_at timestamptz not null default clock_timestamp(),
  primary key (user_id, client_id)
);

-- Μία γραμμή. Εδώ διαβάζεται μόνο το edit_minutes· το UI ρυθμίσεων έρχεται στο Jε.
create table public.message_settings (
  id boolean primary key default true check (id),
  digest_minutes integer not null default 15 check (digest_minutes between 1 and 1440),
  edit_minutes integer not null default 15 check (edit_minutes between 1 and 1440),
  request_open_days integer not null default 3 check (request_open_days between 1 and 60)
);

insert into public.message_settings (id) values (true);

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.message_settings enable row level security;

-- ───────────── Βοηθητικές authz ─────────────

-- Ο τρέχων Χρήστης είναι υπεύθυνος (owner) ή Μέλος αυτής της Παραγωγής.
create function authz.production_involved(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.productions p
     where p.id = p_production
       and (p.owner_id = auth.uid()
            or exists (select 1 from public.production_members pm
                        where pm.production_id = p.id and pm.user_id = auth.uid()))
  );
$$;

-- Βλέπει ο Χρήστης ομάδας ολόκληρη τη Συνομιλία: Εύρος «όλα» ή Υπεύθυνος του Πελάτη.
create function authz.message_sees_all(p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    authz.is_team_user() and authz.has('messages.chat') and (
      authz.scope('messages.chat') = 'all'
      or exists (select 1 from public.clients c where c.id = p_client and c.manager_id = auth.uid())
    ), false);
$$;

create function authz.message_visible(m public.messages) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    case
      when authz.is_team_user() then
        authz.has('messages.chat') and (
          authz.message_sees_all(m.client_id)
          or (m.production_id is not null and authz.production_involved(m.production_id))
          or (m.is_internal and auth.uid() = any (m.mentions))
        )
      else
        authz.client_user_has('c.chatRead')
        and m.client_id = authz.client_user_client_id()
        and not m.is_internal
    end, false);
$$;

create function authz.message_can_write(p_client uuid, p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    case
      when authz.is_team_user() then
        authz.has('messages.chat')
        and exists (select 1 from public.clients c where c.id = p_client and c.archived_at is null)
        and (
          authz.message_sees_all(p_client)
          or (p_production is not null and exists (
                select 1 from public.productions p
                 where p.id = p_production and p.client_id = p_client and authz.production_involved(p.id)))
        )
      else
        authz.client_user_has('c.chatWrite')
        and p_client = authz.client_user_client_id()
        and exists (select 1 from public.clients c where c.id = p_client and c.archived_at is null)
    end, false);
$$;

-- Κατάσταση Πελάτη που προκύπτει (CONTEXT): candidate (καμία υπογεγραμμένη Συμφωνία), active, inactive.
create function authz.client_status(p_client uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when exists (select 1 from public.agreements a join public.opportunities o on o.id = a.opportunity_id
                  where o.client_id = p_client and a.state = 'active')
      or exists (select 1 from public.productions p where p.client_id = p_client and p.state = 'open')
      then 'active'
    when exists (select 1 from public.agreements a join public.opportunities o on o.id = a.opportunity_id
                  where o.client_id = p_client and a.signed_at is not null)
      then 'inactive'
    else 'candidate'
  end;
$$;

-- Όνομα συντάκτη: Χρήστης ομάδας ή Χρήστης πελάτη (της Συνομιλίας).
create function authz.message_author_name(p_kind text, p_user uuid, p_client uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case when p_kind = 'team'
    then (select t.name from public.team_users t where t.user_id = p_user)
    else (select cu.name from public.client_users cu where cu.user_id = p_user and cu.client_id = p_client)
  end;
$$;

-- Έλεγχος και καθαρισμός κειμένου: 1..4.000 χαρακτήρες, σύνδεσμοι μόνο https (Μ6).
create function authz.message_clean_body(p_body text) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
begin
  if length(v_body) < 1 or length(v_body) > 4000 then
    raise exception 'Το Μήνυμα πρέπει να έχει από 1 έως 4.000 χαρακτήρες' using errcode = 'P0001';
  end if;
  if v_body ~* '(^|[^a-z0-9])(http|ftp|file)://' then
    raise exception 'Επιτρέπονται μόνο σύνδεσμοι που ξεκινούν με https://' using errcode = 'P0001';
  end if;
  return v_body;
end;
$$;

create function authz.message_edit_minutes() returns integer
language sql stable security definer set search_path = ''
as $$ select s.edit_minutes from public.message_settings s where s.id; $$;

-- Ενεργό μέλος ομάδας που μπορεί να αναφερθεί (έχει «Συνομιλεί με πελάτη»).
create function authz.message_mentionable(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.team_users t where t.user_id = p_user and t.is_active)
     and authz.user_scope(p_user, 'messages.chat') is not null;
$$;

-- Ο Χρήστης ομάδας με «Συνομιλεί με πελάτη», αλλιώς 42501.
create function authz.require_team_chat() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.is_team_user() and authz.has('messages.chat')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Φορτώνει Μήνυμα για αλλαγή: ανύπαρκτο και μη ορατό δίνουν το ίδιο 42501 (χωρίς oracle ύπαρξης).
create function authz.message_for_edit(p_id uuid) returns public.messages
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.messages;
begin
  select * into v_row from public.messages m where m.id = p_id for update;
  if not found or not authz.message_visible(v_row) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

-- ───────────── RPC: Εισερχόμενα ─────────────

create function public.messages_inbox() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_all boolean;
begin
  perform authz.require_team_chat();
  -- Εύρος «όλα»: όλα είναι ορατά, χωρίς έλεγχο ανά γραμμή.
  v_all := coalesce(authz.scope('messages.chat') = 'all', false);
  return (
    with vis as (
      select m.* from public.messages m where v_all or authz.message_visible(m)
    ),
    last_msg as (
      select distinct on (v.client_id) v.client_id, v.created_at, v.body, v.is_internal, v.deleted_at
        from vis v order by v.client_id, v.created_at desc, v.id desc
    ),
    unread as (
      select v.client_id, count(*) as n
        from vis v
        left join public.message_reads r on r.user_id = v_me and r.client_id = v.client_id
       where v.author_id <> v_me and v.deleted_at is null
         and v.created_at > coalesce(r.read_at, '-infinity'::timestamptz)
       group by v.client_id
    )
    select jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'clientId', l.client_id, 'clientName', c.name, 'lastAt', l.created_at,
                 'preview', case when l.deleted_at is null then left(l.body, 90) end,
                 'lastInternal', l.is_internal, 'lastDeleted', l.deleted_at is not null,
                 'unread', coalesce(u.n, 0), 'partial', not authz.message_sees_all(l.client_id))
               order by l.created_at desc, c.name)
          from last_msg l
          join public.clients c on c.id = l.client_id
          left join unread u on u.client_id = l.client_id
      ), '[]'::jsonb),
      'mentionsUnread', (
        select count(*) from vis v
          left join public.message_reads r on r.user_id = v_me and r.client_id = v.client_id
         where v.is_internal and v.mentions @> array[v_me] and v.author_id <> v_me and v.deleted_at is null
           and v.created_at > coalesce(r.read_at, '-infinity'::timestamptz)
      )
    )
  );
end;
$$;

create function public.messages_writable_clients() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_team_chat();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name, c.id)
      from public.clients c
     where authz.message_can_write(c.id, null)
        or exists (select 1 from public.productions p
                    where p.client_id = c.id and p.state <> 'cancelled' and authz.message_can_write(c.id, p.id))
  ), '[]'::jsonb);
end;
$$;

create function public.messages_mentions() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  perform authz.require_team_chat();
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
             'messageId', x.id, 'clientId', x.client_id, 'clientName', x.client_name, 'at', x.created_at,
             'body', x.body, 'authorName', x.author_name) order by x.created_at desc, x.id desc)
      from (
        select m.id, m.client_id, c.name as client_name, m.created_at, m.body,
               authz.message_author_name(m.author_kind, m.author_id, m.client_id) as author_name
          from public.messages m
          join public.clients c on c.id = m.client_id
         where m.is_internal and m.mentions @> array[v_me] and m.deleted_at is null
           and authz.message_visible(m)
         order by m.created_at desc, m.id desc
         limit 100
      ) x
  ), '[]'::jsonb));
end;
$$;

-- ───────────── RPC: Συνομιλία ενός Πελάτη ─────────────

create function public.messages_thread(p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_team boolean := authz.is_team_user();
  v_untagged boolean := authz.message_can_write(p_client, null);
  v_productions jsonb;
  v_has_visible boolean;
  v_read_at timestamptz;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'state', p.state)
                            order by p.created_at desc, p.id), '[]'::jsonb)
    into v_productions
    from public.productions p
   where p.client_id = p_client and p.state <> 'cancelled' and authz.message_can_write(p_client, p.id);

  select exists (select 1 from public.messages m where m.client_id = p_client and authz.message_visible(m))
    into v_has_visible;

  if not v_has_visible and not v_untagged and v_productions = '[]'::jsonb then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;

  select r.read_at into v_read_at from public.message_reads r where r.user_id = v_me and r.client_id = p_client;

  return jsonb_build_object(
    'client', (
      select jsonb_build_object(
               'id', c.id, 'name', c.name, 'status', authz.client_status(c.id),
               'managerName', case when v_team then (select t.name from public.team_users t where t.user_id = c.manager_id) end)
        from public.clients c where c.id = p_client),
    'partial', v_team and not authz.message_sees_all(p_client),
    'canWrite', v_untagged or v_productions <> '[]'::jsonb,
    'canWriteUntagged', v_untagged,
    'productions', v_productions,
    'mentionable', case when v_team then coalesce((
        select jsonb_agg(jsonb_build_object('id', t.user_id, 'name', t.name) order by t.name, t.user_id)
          from public.team_users t
         where t.user_id <> v_me and authz.message_mentionable(t.user_id)
      ), '[]'::jsonb) end,
    'readAt', v_read_at,
    'editMinutes', authz.message_edit_minutes(),
    'messages', coalesce((
      select jsonb_agg(x.item order by x.created_at, x.id)
        from (
          select m.id, m.created_at, (
            jsonb_build_object(
              'id', m.id, 'at', m.created_at, 'authorId', m.author_id,
              'authorName', authz.message_author_name(m.author_kind, m.author_id, m.client_id),
              'authorKind', m.author_kind, 'mine', m.author_id = v_me,
              'body', case when m.deleted_at is null then m.body end,
              'productionId', m.production_id,
              'productionTitle', (select p.title from public.productions p where p.id = m.production_id),
              'editedAt', m.edited_at, 'deleted', m.deleted_at is not null,
              'canEdit', m.author_id = v_me and m.deleted_at is null
                         and m.created_at + make_interval(mins => authz.message_edit_minutes()) >= clock_timestamp(),
              'canDelete', m.author_id = v_me and m.deleted_at is null)
            || case when v_team then jsonb_build_object(
                 'internal', m.is_internal,
                 'mentions', case when m.deleted_at is null then coalesce((
                     select jsonb_agg(jsonb_build_object('id', t.user_id, 'name', t.name) order by t.name)
                       from public.team_users t where t.user_id = any (m.mentions)), '[]'::jsonb)
                   else '[]'::jsonb end)
               else '{}'::jsonb end
          ) as item
          from public.messages m
         where m.client_id = p_client and authz.message_visible(m)
         order by m.created_at desc, m.id desc
         limit 300
        ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ───────────── RPC: γραφή ─────────────

create function public.message_send(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid := nullif(p->>'clientId', '')::uuid;
  v_production uuid := nullif(p->>'productionId', '')::uuid;
  v_internal boolean := coalesce((p->>'internal')::boolean, false);
  v_mentions uuid[] := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(p->'mentions', '[]'::jsonb)) x), '{}');
  v_team boolean := authz.is_team_user();
  v_body text;
  v_id uuid;
begin
  if not authz.message_can_write(v_client, v_production) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_production is not null and not exists (
       select 1 from public.productions pr where pr.id = v_production and pr.client_id = v_client and pr.state <> 'cancelled') then
    raise exception 'Η Παραγωγή δεν ανήκει στον Πελάτη ή έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if not v_team and (v_internal or cardinality(v_mentions) > 0) then
    raise exception 'Ο πελάτης δεν στέλνει Εσωτερικά Μηνύματα ούτε αναφορές' using errcode = 'P0001';
  end if;
  if cardinality(v_mentions) > 0 and not v_internal then
    raise exception 'Οι αναφορές επιτρέπονται μόνο σε Εσωτερικά Μηνύματα' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(v_mentions) u where u = auth.uid() or not authz.message_mentionable(u)) then
    raise exception 'Η αναφορά γίνεται μόνο σε άλλα ενεργά μέλη της ομάδας με πρόσβαση στη Συνομιλία' using errcode = 'P0001';
  end if;
  v_body := authz.message_clean_body(p->>'body');

  insert into public.messages (client_id, production_id, author_id, author_kind, body, is_internal, mentions)
  values (v_client, v_production, auth.uid(), case when v_team then 'team' else 'client' end, v_body, v_internal, v_mentions)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

create function public.message_edit(p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.messages := authz.message_for_edit(p_id);
  v_minutes integer := authz.message_edit_minutes();
  v_body text;
begin
  if v_row.author_id <> auth.uid() or not authz.message_can_write(v_row.client_id, v_row.production_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'Το Μήνυμα έχει διαγραφεί' using errcode = 'P0001';
  end if;
  if v_row.created_at + make_interval(mins => v_minutes) < clock_timestamp() then
    raise exception 'Πέρασαν τα % λεπτά για διόρθωση', v_minutes using errcode = 'P0001';
  end if;
  v_body := authz.message_clean_body(p_body);
  if v_body = v_row.body then
    return;
  end if;
  update public.messages set body = v_body, edited_at = clock_timestamp() where id = p_id;
end;
$$;

create function public.message_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.messages := authz.message_for_edit(p_id);
begin
  if v_row.author_id <> auth.uid() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'Το Μήνυμα έχει ήδη διαγραφεί' using errcode = 'P0001';
  end if;
  update public.messages set deleted_at = clock_timestamp(), deleted_by = auth.uid() where id = p_id;
end;
$$;

-- Αλλαγή ετικέτας: μόνο ομάδα που βλέπει το Μήνυμα και μπορεί να γράψει με τη νέα ετικέτα.
-- Χωρίς ετικέτα (null) μόνο όποιος βλέπει ολόκληρη τη Συνομιλία.
create function public.message_set_tag(p_id uuid, p_production uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.messages;
begin
  perform authz.require_team_chat();
  v_row := authz.message_for_edit(p_id);
  -- Όποιος βλέπει το Μήνυμα μόνο λόγω @αναφοράς δεν το μετακινεί: θα το έδειχνε σε άλλους.
  if not (authz.message_sees_all(v_row.client_id)
          or (v_row.production_id is not null and authz.production_involved(v_row.production_id)))
     or not authz.message_can_write(v_row.client_id, p_production) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'Το Μήνυμα έχει διαγραφεί' using errcode = 'P0001';
  end if;
  if p_production is not null and not exists (
       select 1 from public.productions pr where pr.id = p_production and pr.client_id = v_row.client_id and pr.state <> 'cancelled') then
    raise exception 'Η Παραγωγή δεν ανήκει στον Πελάτη ή έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if v_row.production_id is not distinct from p_production then
    return;
  end if;
  update public.messages set production_id = p_production where id = p_id;
end;
$$;

-- p_until: το νεότερο Μήνυμα που φάνηκε (όχι «τώρα»), ώστε ό,τι γράφτηκε μετά να μένει αδιάβαστο. Ο δείκτης δεν γυρίζει πίσω.
create function public.messages_mark_read(p_client uuid, p_until timestamptz default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_at timestamptz := least(coalesce(p_until, clock_timestamp()), clock_timestamp());
begin
  if not exists (select 1 from public.messages m where m.client_id = p_client and authz.message_visible(m)) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  insert into public.message_reads (user_id, client_id, read_at)
  values (auth.uid(), p_client, v_at)
  on conflict (user_id, client_id) do update set read_at = greatest(public.message_reads.read_at, excluded.read_at);
end;
$$;

-- ───────────── Ίχνος ─────────────
-- Μόνο αλλαγές (διόρθωση, διαγραφή, ετικέτα)· η αποστολή δεν γράφεται.

create trigger messages_audit_update after update on public.messages
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

-- Ολόκληρη η λίστα (default deny): ξαναγραμμένη από τον ορισμό του 20261013130000_invoices.sql.
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
    -- Μηνύματα (#160): περιέχουν κείμενο Συνομιλίας, άρα μόνο όσοι βλέπουν όλες τις Συνομιλίες
    when 'messages' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.production_involved(uuid), authz.message_sees_all(uuid), authz.message_visible(public.messages),
  authz.message_can_write(uuid, uuid), authz.client_status(uuid), authz.message_author_name(text, uuid, uuid),
  authz.message_clean_body(text), authz.message_edit_minutes(), authz.message_mentionable(uuid),
  authz.require_team_chat(), authz.message_for_edit(uuid)
  from public, anon, authenticated;

revoke all on function
  public.messages_inbox(), public.messages_writable_clients(), public.messages_mentions(),
  public.messages_thread(uuid), public.message_send(jsonb), public.message_edit(uuid, text),
  public.message_delete(uuid), public.message_set_tag(uuid, uuid), public.messages_mark_read(uuid, timestamptz)
  from public, anon;

grant execute on function
  public.messages_inbox(), public.messages_writable_clients(), public.messages_mentions(),
  public.messages_thread(uuid), public.message_send(jsonb), public.message_edit(uuid, text),
  public.message_delete(uuid), public.message_set_tag(uuid, uuid), public.messages_mark_read(uuid, timestamptz)
  to authenticated;

-- Οι πίνακες είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.messages, public.message_reads, public.message_settings from anon, authenticated;
