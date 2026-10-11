-- Μηνύματα Jγ (#162): Συνημμένα. Ιδιωτικό bucket, ανέβασμα απευθείας από τον browser με signed upload URL.
--
--  • Το Vercel κόβει σώματα πάνω από 4,5 MB, ενώ το όριο εδώ είναι 10 MB: το αρχείο δεν περνά από server action.
--    Ο server (service role) φτιάχνει signed upload URL για τη διαδρομή που έδωσε η message_attachment_slots.
--  • Καμία policy στο storage.objects. Λήψη μόνο με signed URL 60″ που φτιάχνει ο server αφού η
--    message_attachment_path ελέγξει ορατότητα (ίδιο 42501 για ανύπαρκτο και για μη ορατό).
--  • Θέση (slot) = άδεια ανεβάσματος που δόθηκε και δεν έχει χρησιμοποιηθεί. Τα μη χρησιμοποιημένα καθαρίζονται από το cron.
--  • Μήνυμα μόνο με συνημμένα (κενό κείμενο) επιτρέπεται· η διαγραφή του Μηνύματος επιστρέφει τις διαδρομές να σβηστούν.

-- ───────────── Ιδιωτικό bucket ─────────────
-- Όπως στα Τιμολόγια: αν το storage δεν είναι έτοιμο όταν τρέχουν τα migrations, το bucket φτιάχνεται από τον server.

do $$
declare
  v_mimes text[] := array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
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
    values ('message-attachments', 'message-attachments', false, 10485760, v_mimes)
    on conflict (id) do nothing;
  else
    insert into storage.buckets (id, name, public) values ('message-attachments', 'message-attachments', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ───────────── Πίνακες ─────────────

-- Μήνυμα μόνο με συνημμένα έχει κενό κείμενο· ότι υπάρχει κείμενο ή συνημμένο το εξασφαλίζει το message_send.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (body = btrim(body) and length(body) <= 4000);

create table public.message_attachment_slots (
  path text primary key,
  client_id uuid not null references public.clients (id),
  user_id uuid not null references auth.users (id),
  name text not null check (length(name) between 1 and 200),
  mime text not null,
  size integer not null check (size between 1 and 10485760),
  created_at timestamptz not null default clock_timestamp()
);

create index message_attachment_slots_created_idx on public.message_attachment_slots (created_at);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id),
  path text not null unique,
  name text not null check (length(name) between 1 and 200),
  mime text not null,
  size integer not null check (size between 1 and 10485760),
  created_at timestamptz not null default clock_timestamp()
);

create index message_attachments_message_idx on public.message_attachments (message_id);

alter table public.message_attachment_slots enable row level security;
alter table public.message_attachments enable row level security;

-- ───────────── Βοηθητικές authz ─────────────

-- Επέκταση αρχείου από το mime· null όταν το είδος δεν επιτρέπεται (εικόνες, PDF, Office).
create function authz.message_attachment_ext(p_mime text) returns text
language sql immutable set search_path = ''
as $$
  select case p_mime
    when 'image/jpeg' then 'jpg'
    when 'image/png' then 'png'
    when 'image/webp' then 'webp'
    when 'image/gif' then 'gif'
    when 'image/heic' then 'heic'
    when 'application/pdf' then 'pdf'
    when 'application/msword' then 'doc'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.ms-excel' then 'xls'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx'
    when 'application/vnd.ms-powerpoint' then 'ppt'
    when 'application/vnd.openxmlformats-officedocument.presentationml.presentation' then 'pptx'
  end;
$$;

-- ───────────── RPC: θέσεις ανεβάσματος ─────────────

-- Έως 5 αρχεία. Ο έλεγχος Δικαιώματος γίνεται πρώτος. Για μέλος με Εύρος «mine» δίνεται και η ετικέτα (p_production).
create function public.message_attachment_slots(p_client uuid, p_files jsonb, p_production uuid default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_file jsonb;
  v_name text;
  v_mime text;
  v_size_text text;
  v_path text;
  v_slots jsonb := '[]'::jsonb;
begin
  if not authz.message_can_write(p_client, p_production) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) < 1 then
    raise exception 'Διάλεξε τουλάχιστον ένα αρχείο' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_files) > 5 then
    raise exception 'Έως 5 αρχεία ανά Μήνυμα' using errcode = 'P0001';
  end if;
  for v_file in select * from jsonb_array_elements(p_files) loop
    v_name := btrim(coalesce(v_file->>'name', ''));
    v_mime := coalesce(v_file->>'mime', '');
    v_size_text := coalesce(v_file->>'size', '');
    if v_mime like 'video/%' then
      raise exception 'Το βίντεο στέλνεται ως link' using errcode = 'P0001';
    end if;
    if length(v_name) not between 1 and 200 then
      raise exception 'Το όνομα του αρχείου πρέπει να έχει από 1 έως 200 χαρακτήρες' using errcode = 'P0001';
    end if;
    if authz.message_attachment_ext(v_mime) is null then
      raise exception 'Επιτρέπονται εικόνες, PDF και έγγραφα Office' using errcode = 'P0001';
    end if;
    if v_size_text !~ '^[0-9]{1,9}$' or v_size_text::bigint not between 1 and 10485760 then
      raise exception 'Πάνω από 10 MB: στείλε το ως link' using errcode = 'P0001';
    end if;
    v_path := p_client::text || '/' || gen_random_uuid()::text || '.' || authz.message_attachment_ext(v_mime);
    insert into public.message_attachment_slots (path, client_id, user_id, name, mime, size)
    values (v_path, p_client, auth.uid(), v_name, v_mime, v_size_text::integer);
    v_slots := v_slots || jsonb_build_object('path', v_path, 'name', v_name);
  end loop;
  return jsonb_build_object('slots', v_slots);
end;
$$;

-- Θέσεις που δόθηκαν και δεν χρησιμοποιήθηκαν πριν από το p_before: σβήνονται και επιστρέφονται, για να σβηστούν τα αρχεία.
-- Μόνο για το cron (service_role).
create function public.message_attachment_slots_expired(p_before timestamptz) returns jsonb
language sql security definer set search_path = ''
as $$
  with gone as (
    delete from public.message_attachment_slots s where s.created_at < p_before returning s.path
  )
  select coalesce(jsonb_agg(g.path order by g.path), '[]'::jsonb) from gone g;
$$;

-- ───────────── RPC: λήψη ─────────────

-- Η διαδρομή ενός συνημμένου για λήψη. Μόνο αν το Μήνυμα φαίνεται στον Χρήστη και δεν έχει διαγραφεί·
-- αλλιώς 42501, με το ίδιο μήνυμα και για ανύπαρκτο συνημμένο (χωρίς oracle ύπαρξης).
create function public.message_attachment_path(p_id uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_message public.messages;
  v_path text;
begin
  select m.* into v_message
    from public.message_attachments a
    join public.messages m on m.id = a.message_id
   where a.id = p_id;
  if not found or v_message.deleted_at is not null or not authz.message_visible(v_message) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select a.path into v_path from public.message_attachments a where a.id = p_id;
  return v_path;
end;
$$;

-- ───────────── Συνομιλία: με συνημμένα ─────────────
-- Ξαναγραμμένη από τον τελικό ορισμό του 20261014100000_messages.sql, με το πεδίο attachments σε κάθε Μήνυμα.

create or replace function public.messages_thread(p_client uuid) returns jsonb
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
              'canDelete', m.author_id = v_me and m.deleted_at is null,
              'attachments', case when m.deleted_at is null then coalesce((
                  select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'mime', a.mime, 'size', a.size)
                                   order by a.created_at, a.id)
                    from public.message_attachments a where a.message_id = m.id), '[]'::jsonb)
                else '[]'::jsonb end)
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

-- ───────────── Αποστολή: με συνημμένα ─────────────
-- Ξαναγραμμένη από τον τελικό ορισμό του 20261014100000_messages.sql. Νέο πεδίο attachments?: [path] (έως 5).

create or replace function public.message_send(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid := nullif(p->>'clientId', '')::uuid;
  v_production uuid := nullif(p->>'productionId', '')::uuid;
  v_internal boolean := coalesce((p->>'internal')::boolean, false);
  v_mentions uuid[] := coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(p->'mentions', '[]'::jsonb)) x), '{}');
  v_team boolean := authz.is_team_user();
  v_paths text[] := '{}';
  v_slot public.message_attachment_slots;
  v_path text;
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

  if p->'attachments' is not null and jsonb_typeof(p->'attachments') <> 'array' then
    raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
  end if;
  v_paths := coalesce((select array_agg(distinct x) from jsonb_array_elements_text(coalesce(p->'attachments', '[]'::jsonb)) x), '{}');
  if cardinality(v_paths) > 5 then
    raise exception 'Έως 5 αρχεία ανά Μήνυμα' using errcode = 'P0001';
  end if;

  -- Χωρίς συνημμένα το κείμενο είναι υποχρεωτικό· με συνημμένα μπορεί να λείπει.
  if cardinality(v_paths) = 0 or btrim(coalesce(p->>'body', '')) <> '' then
    v_body := authz.message_clean_body(p->>'body');
  else
    v_body := '';
  end if;

  -- Κάθε διαδρομή πρέπει να είναι θέση του ίδιου Χρήστη και του ίδιου Πελάτη, και το αρχείο να έχει ανέβει.
  foreach v_path in array v_paths loop
    select s.* into v_slot from public.message_attachment_slots s
     where s.path = v_path and s.user_id = auth.uid() and s.client_id = v_client for update;
    if not found
       or not exists (
         select 1 from storage.objects o
          where o.bucket_id = 'message-attachments' and o.name = v_path
            and (o.metadata->>'size' is null or (o.metadata->>'size') !~ '^[0-9]+$'
                 or (o.metadata->>'size')::bigint <= 10485760)) then
      raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.messages (client_id, production_id, author_id, author_kind, body, is_internal, mentions)
  values (v_client, v_production, auth.uid(), case when v_team then 'team' else 'client' end, v_body, v_internal, v_mentions)
  returning id into v_id;

  insert into public.message_attachments (message_id, path, name, mime, size)
  select v_id, s.path, s.name, s.mime, s.size from public.message_attachment_slots s
   where s.path = any (v_paths) order by s.created_at, s.path;
  delete from public.message_attachment_slots s where s.path = any (v_paths);
  return jsonb_build_object('id', v_id);
end;
$$;

-- ───────────── Διαγραφή: επιστρέφει τις διαδρομές να σβηστούν ─────────────
-- Ο τύπος επιστροφής αλλάζει από void σε jsonb, άρα drop και create (και νέα δικαιώματα).
-- Ξαναγραμμένη από τον τελικό ορισμό του 20261014100000_messages.sql. Τα αρχεία σβήνει ο server αφού πετύχει το RPC.

drop function public.message_delete(uuid);

create function public.message_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.messages := authz.message_for_edit(p_id);
  v_paths jsonb;
begin
  if v_row.author_id <> auth.uid() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'Το Μήνυμα έχει ήδη διαγραφεί' using errcode = 'P0001';
  end if;
  update public.messages set deleted_at = clock_timestamp(), deleted_by = auth.uid() where id = p_id;
  with gone as (delete from public.message_attachments a where a.message_id = p_id returning a.path)
  select coalesce(jsonb_agg(g.path order by g.path), '[]'::jsonb) into v_paths from gone g;
  return jsonb_build_object('removedPaths', v_paths);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.message_attachment_ext(text) from public, anon, authenticated;

revoke all on function
  public.message_attachment_slots(uuid, jsonb, uuid), public.message_attachment_path(uuid),
  public.messages_thread(uuid), public.message_send(jsonb), public.message_delete(uuid)
  from public, anon;

grant execute on function
  public.message_attachment_slots(uuid, jsonb, uuid), public.message_attachment_path(uuid),
  public.messages_thread(uuid), public.message_send(jsonb), public.message_delete(uuid)
  to authenticated;

-- Καθάρισμα από το cron: μόνο service_role.
revoke all on function public.message_attachment_slots_expired(timestamptz) from public, anon, authenticated;
grant execute on function public.message_attachment_slots_expired(timestamptz) to service_role;

-- Οι πίνακες είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.message_attachment_slots, public.message_attachments from anon, authenticated;
