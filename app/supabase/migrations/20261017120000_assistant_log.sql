-- Γνώση Lδ (#192): Συζητήσεις Βοηθού (L2), Αναπάντητες ερωτήσεις (L3), κάρτα Σήμερα «unanswered», καθαρισμός 12 μηνών.
--
--  • Πίνακες κλειστοί (RLS χωρίς policies, revoke). Πρόσβαση μόνο από τις συναρτήσεις αυτού του αρχείου.
--  • Εγγραφή (τα καλεί ο server του Βοηθού, Lγ):
--      authenticated: assistant_conversation_start και assistant_message_append ΜΟΝΟ με p_role 'user'. Κοινό (audience) από
--        τον Χρήστη: ομάδα → 'team', Χρήστης πελάτη → 'client' με τον τρέχοντα Πελάτη του. Μόνο ο ιδιοκτήτης γράφει στη
--        Συζήτησή του (αλλιώς 42501, ίδιο μήνυμα για ανύπαρκτη και ξένη), και μόνο όσο είναι ενεργό μέλος της ομάδας ή
--        ενεργός Χρήστης του Πελάτη της Συζήτησης.
--      service_role (ο server του Lγ, αφού ελέγξει τον Χρήστη): assistant_reply_append (απάντηση Βοηθού) και
--        assistant_unanswered_record, με ρητό p_user και τον ίδιο έλεγχο ιδιοκτησίας.
--      service_role (Επισκέπτης, Q): assistant_public_conversation_start, assistant_public_message_append,
--        assistant_public_unanswered_record. user_id null, audience 'public'. Δεν έχουν ακόμα UI.
--  • Διαχείριση (L2, L3): Δικαίωμα «Διαχειρίζεται Γνώση» (knowledge.manage, Εύρος «όλα»), έλεγχος ΠΡΩΤΟΣ.
--  • Ομαδοποίηση Αναπάντητων (Λεπτομέρειες #1, δέσμη Γ7): με την πιο κοντινή ΑΝΟΙΧΤΗ του ίδιου Κοινού αν η ομοιότητα συνημιτόνου
--    είναι ≥ 0,90 (σταθερά στο authz.assistant_similarity), αλλιώς με ανοιχτή που έχει ακριβώς το ίδιο κανονικοποιημένο κείμενο,
--    αλλιώς νέα γραμμή. Κλεισμένη που ξαναρωτιέται → νέα ανοιχτή.
--  • Κανόνας #9: το κείμενο του χρήστη δεν μένει πουθενά. Κάθε «ρωτήθηκε» είναι γραμμή στο assistant_unanswered_asks, δεμένη με τη
--    Συζήτηση (cascade), με το δικό της κείμενο και embedding. Η Αναπάντητη δείχνει το κείμενο του ΠΑΛΑΙΟΤΕΡΟΥ «ρωτήθηκε» που
--    υπάρχει ακόμα: το trigger ξαναγράφει count/first/last και κείμενο/embedding από αυτά· όταν φύγει το τελευταίο, σβήνει και
--    η Αναπάντητη. Γι' αυτό οι Συζητήσεις ΔΕΝ μπαίνουν στο Ίχνος (audit_entity_allowed ανέγγιχτο).
--  • Ταυτόχρονες εγγραφές: advisory lock ανά (Κοινό, κανονικοποιημένο κείμενο), κλείδωμα της Αναπάντητης που ταίριαξε (αν
--    έκλεισε στο μεταξύ → νέα γραμμή) και κλείδωμα της Αναπάντητης στο trigger πριν τη μέτρηση.
--  • Καθαρισμός: assistant_purge(p_now) (service_role, cron ημερήσιο) σβήνει Συζητήσεις με τελευταίο μήνυμα πριν από 12 μήνες.
--  • Πηγές μηνύματος: [{ kind: 'item'|'package'|'sector', id, title }]. Στην ανάγνωση: gone = true όταν στοιχείο Γνώσης δεν υπάρχει
--    ή δεν είναι πια δημοσιευμένο, ή Πακέτο δεν υπάρχει ή αποσύρθηκε. Για 'sector' δεν υπάρχει ακόμα πίνακας: gone = false.

create extension if not exists vector with schema extensions;

-- ───────────── Πίνακες ─────────────

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('public', 'client', 'team')),
  user_id uuid references auth.users (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  language text not null default 'el' check (language in ('el', 'en')),
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check ((audience = 'public') = (user_id is null)),
  check ((audience = 'client') = (client_id is not null))
);

create index assistant_conversations_list_idx on public.assistant_conversations (audience, last_message_at desc);
create index assistant_conversations_last_idx on public.assistant_conversations (last_message_at);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 20000),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  no_source boolean not null default false,
  created_at timestamptz not null default now()
);

create index assistant_messages_conversation_idx on public.assistant_messages (conversation_id, created_at, id);

create table public.assistant_unanswered (
  id uuid primary key default gen_random_uuid(),
  -- Αντιπρόσωπος: κείμενο, κανονικοποιημένη μορφή και embedding του παλαιότερου «ρωτήθηκε» που υπάρχει (τα γράφει το trigger).
  question text not null check (length(question) between 1 and 1000),
  question_norm text not null,
  embedding extensions.vector(1536),
  audience text not null check (audience in ('public', 'client', 'team')),
  count integer not null default 1 check (count >= 1),
  first_asked_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'covered', 'ignored')),
  covered_item_id uuid references public.knowledge_items (id) on delete set null,
  ignore_reason text check (ignore_reason in ('off_topic', 'personal_data', 'abuse')),
  closed_by uuid references auth.users (id) on delete set null,
  closed_at timestamptz,
  check ((status = 'open') = (closed_at is null)),
  check ((status = 'ignored') = (ignore_reason is not null)),
  check (status = 'covered' or covered_item_id is null)
);

create index assistant_unanswered_status_idx on public.assistant_unanswered (status, audience);
create index assistant_unanswered_norm_idx on public.assistant_unanswered (audience, question_norm) where status = 'open';

-- Κάθε φορά που ρωτήθηκε: από ποια Συζήτηση (και ποιο μήνυμα), με ποιο κείμενο. Σβήνει μαζί τους.
create table public.assistant_unanswered_asks (
  id uuid primary key default gen_random_uuid(),
  unanswered_id uuid not null references public.assistant_unanswered (id) on delete cascade,
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  message_id uuid references public.assistant_messages (id) on delete cascade,
  question text not null check (length(question) between 1 and 1000),
  question_norm text not null,
  embedding extensions.vector(1536),
  asked_at timestamptz not null default now()
);

create index assistant_unanswered_asks_unanswered_idx on public.assistant_unanswered_asks (unanswered_id);
create index assistant_unanswered_asks_conversation_idx on public.assistant_unanswered_asks (conversation_id);
create index assistant_unanswered_asks_message_idx on public.assistant_unanswered_asks (message_id);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_unanswered enable row level security;
alter table public.assistant_unanswered_asks enable row level security;

-- ───────────── Βοηθητικές ─────────────

-- Κατώφλι ομαδοποίησης: ομοιότητα συνημιτόνου ≥ 0,90 = «ίδια ερώτηση». Σταθερά στον κώδικα, όχι Ρύθμιση.
create function authz.assistant_similarity() returns double precision
language sql immutable set search_path = ''
as $$ select 0.90::double precision; $$;

-- Κανονικοποίηση για το ακριβές ταίριασμα (χωρίς embedding): πεζά, ένα κενό, χωρίς τελικό ερωτηματικό/τελεία.
create function authz.assistant_norm(p_text text) returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(lower(regexp_replace(btrim(coalesce(p_text, '')), '\s+', ' ', 'g')), '[\s?;\u037e.!\u2026]+$', '');
$$;

-- Ο ιδιοκτήτης της Συζήτησης: γραμμή για όποιον γράφει. Ανύπαρκτη ή ξένη: 42501, ίδιο μήνυμα.
-- p_user null: μόνο Συζήτηση Επισκέπτη (service_role)· αλλιώς μόνο του p_user, και μόνο όσο είναι ενεργό μέλος της ομάδας
-- (team) ή ενεργός Χρήστης του Πελάτη της Συζήτησης (client).
create function authz.assistant_conversation_for_write(p_id uuid, p_user uuid)
returns public.assistant_conversations
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.assistant_conversations;
begin
  select c.* into v_row from public.assistant_conversations c where c.id = p_id for update;
  if not found
     or (p_user is null and v_row.audience <> 'public')
     or (p_user is not null and (
          v_row.user_id is distinct from p_user
          or (v_row.audience = 'team' and not authz.user_is_team(p_user))
          or (v_row.audience = 'client' and not exists (
                select 1 from public.client_users cu
                 where cu.user_id = p_user and cu.client_id = v_row.client_id and cu.removed_at is null)))) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

create function authz.assistant_new_conversation(
  p_audience text, p_user uuid, p_client uuid, p_language text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(p_language, '') not in ('el', 'en') then
    raise exception 'Άγνωστη γλώσσα Συζήτησης' using errcode = 'P0001';
  end if;
  insert into public.assistant_conversations (audience, user_id, client_id, language, started_at, last_message_at)
  values (p_audience, p_user, p_client, p_language, clock_timestamp(), clock_timestamp())
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

-- Ελέγχει το σχήμα των πηγών: πίνακας έως 20 αντικειμένων { kind, id, title }.
create function authz.assistant_sources_ok(p_sources jsonb) returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(p_sources) = 'array' and jsonb_array_length(p_sources) <= 20
     and not exists (
       select 1 from jsonb_array_elements(p_sources) e
        where jsonb_typeof(e) <> 'object'
           or coalesce(e->>'kind', '') not in ('item', 'package', 'sector')
           or coalesce(e->>'id', '') = ''
           or jsonb_typeof(e->'title') is distinct from 'string');
$$;

create function authz.assistant_append(
  p_conv public.assistant_conversations, p_role text, p_content text, p_sources jsonb, p_no_source boolean
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_sources jsonb := coalesce(p_sources, '[]'::jsonb);
begin
  if coalesce(p_role, '') not in ('user', 'assistant') then
    raise exception 'Άγνωστος ρόλος μηνύματος' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_content, ''))) = 0 or length(p_content) > 20000 then
    raise exception 'Το μήνυμα είναι κενό ή πολύ μεγάλο' using errcode = 'P0001';
  end if;
  if not authz.assistant_sources_ok(v_sources) then
    raise exception 'Οι πηγές του μηνύματος δεν είναι έγκυρες' using errcode = 'P0001';
  end if;
  insert into public.assistant_messages (conversation_id, role, content, sources, no_source, created_at)
  values (p_conv.id, p_role, p_content, v_sources, coalesce(p_no_source, false), clock_timestamp())
  returning id into v_id;
  update public.assistant_conversations c set last_message_at = clock_timestamp() where c.id = p_conv.id;
  return jsonb_build_object('id', v_id);
end;
$$;

-- Η πιο κοντινή ανοιχτή Αναπάντητη του ίδιου Κοινού (βλ. κεφαλίδα), ή null.
create function authz.assistant_match(p_audience text, p_norm text, p_embedding extensions.vector)
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_embedding is not null then
    select u.id into v_id
      from public.assistant_unanswered u
     where u.status = 'open' and u.audience = p_audience and u.embedding is not null
       and 1 - (u.embedding operator(extensions.<=>) p_embedding) >= authz.assistant_similarity()
     order by u.embedding operator(extensions.<=>) p_embedding, u.id
     limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;
  select u.id into v_id
    from public.assistant_unanswered u
   where u.status = 'open' and u.audience = p_audience and u.question_norm = p_norm
   order by u.first_asked_at, u.id
   limit 1;
  return v_id;
end;
$$;

create function authz.assistant_record(
  p_conv public.assistant_conversations, p_message uuid, p_question text, p_embedding extensions.vector
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_question text := left(btrim(coalesce(p_question, '')), 1000);
  v_norm text := authz.assistant_norm(p_question);
  v_id uuid;
  v_is_new boolean := false;
begin
  if v_norm = '' then
    raise exception 'Η ερώτηση είναι κενή' using errcode = 'P0001';
  end if;
  if p_embedding is not null and extensions.vector_dims(p_embedding) <> 1536 then
    raise exception 'Το embedding πρέπει να έχει 1536 διαστάσεις' using errcode = 'P0001';
  end if;
  if p_message is not null and not exists (
    select 1 from public.assistant_messages m where m.id = p_message and m.conversation_id = p_conv.id) then
    raise exception 'Το μήνυμα δεν ανήκει στη Συζήτηση' using errcode = 'P0001';
  end if;
  -- Δύο ταυτόχρονες πρώτες ίδιες ερωτήσεις: η δεύτερη περιμένει και βρίσκει τη γραμμή της πρώτης.
  perform pg_advisory_xact_lock(hashtext(p_conv.audience || ':' || v_norm));
  v_id := authz.assistant_match(p_conv.audience, v_norm, p_embedding);
  if v_id is not null then
    -- Αν έκλεισε ή σβήστηκε στο μεταξύ: νέα γραμμή.
    select u.id into v_id from public.assistant_unanswered u where u.id = v_id and u.status = 'open' for update;
  end if;
  if v_id is null then
    insert into public.assistant_unanswered (question, question_norm, embedding, audience, first_asked_at, last_asked_at)
    values (v_question, v_norm, p_embedding, p_conv.audience, clock_timestamp(), clock_timestamp())
    returning id into v_id;
    v_is_new := true;
  end if;
  insert into public.assistant_unanswered_asks
    (unanswered_id, conversation_id, message_id, question, question_norm, embedding, asked_at)
  values (v_id, p_conv.id, p_message, v_question, v_norm, p_embedding, clock_timestamp());
  return jsonb_build_object('id', v_id, 'isNew', v_is_new,
    'count', (select u.count from public.assistant_unanswered u where u.id = v_id));
end;
$$;

-- Το count, first και last μιας Αναπάντητης ξαναμετριούνται από τα «ρωτήθηκε», και το κείμενο/embedding γίνονται του
-- παλαιότερου που απομένει. Χωρίς κανένα, η Αναπάντητη σβήνει (κανόνας #9).
create function authz.assistant_unanswered_recount() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := case when tg_op = 'DELETE' then old.unanswered_id else new.unanswered_id end;
  v_count integer;
  v_last timestamptz;
  v_oldest public.assistant_unanswered_asks;
begin
  -- Σειριοποιεί τις ταυτόχρονες αλλαγές της ίδιας Αναπάντητης (όταν σβήνεται η ίδια, δεν βρίσκει τίποτα).
  perform 1 from public.assistant_unanswered u where u.id = v_id for update;
  select count(*)::integer, max(a.asked_at) into v_count, v_last
    from public.assistant_unanswered_asks a where a.unanswered_id = v_id;
  if v_count = 0 then
    delete from public.assistant_unanswered u where u.id = v_id;
    return null;
  end if;
  select a.* into v_oldest from public.assistant_unanswered_asks a
   where a.unanswered_id = v_id order by a.asked_at, a.id limit 1;
  update public.assistant_unanswered u
     set count = v_count, first_asked_at = v_oldest.asked_at, last_asked_at = v_last,
         question = v_oldest.question, question_norm = v_oldest.question_norm, embedding = v_oldest.embedding
   where u.id = v_id;
  return null;
end;
$$;

create trigger assistant_unanswered_asks_recount after insert or delete on public.assistant_unanswered_asks
  for each row execute function authz.assistant_unanswered_recount();

-- Ποιος (όνομα Χρήστη) και ποιος Πελάτης, για τις λίστες.
create function authz.assistant_who(c public.assistant_conversations) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'who', case c.audience
             when 'team' then (select t.name from public.team_users t where t.user_id = c.user_id)
             when 'client' then (select cu.name from public.client_users cu
                                  where cu.user_id = c.user_id and cu.client_id = c.client_id limit 1)
           end,
    'clientName', (select cl.name from public.clients cl where cl.id = c.client_id));
$$;

-- Οι πηγές ενός μηνύματος με gone (βλ. κεφαλίδα).
create function authz.assistant_sources_view(p_sources jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', e->>'kind', 'id', e->>'id', 'title', e->>'title',
           'gone', case e->>'kind'
                     when 'item' then not exists (
                       select 1 from public.knowledge_items i where i.id::text = e->>'id' and i.status = 'published')
                     when 'package' then not exists (
                       select 1 from public.catalogue_items ci
                        where ci.id::text = e->>'id' and ci.kind = 'package' and ci.retired_at is null)
                     else false
                   end) order by n), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_sources, '[]'::jsonb)) with ordinality s (e, n);
$$;

create function authz.assistant_unanswered_for_edit(p_id uuid) returns public.assistant_unanswered
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.assistant_unanswered;
begin
  select u.* into v_row from public.assistant_unanswered u where u.id = p_id for update;
  if not found then
    raise exception 'Η ερώτηση δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_row;
end;
$$;

-- ───────────── RPC εγγραφής: Χρήστες (authenticated) ─────────────

-- { id }. Ομάδα → 'team'· Χρήστης πελάτη → 'client' με τον τρέχοντα Πελάτη. Αλλιώς 42501.
create function public.assistant_conversation_start(p_language text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_client uuid;
begin
  if v_uid is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if authz.is_team_user() then
    return authz.assistant_new_conversation('team', v_uid, null, p_language);
  end if;
  v_client := authz.client_user_client_id();
  if v_client is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.assistant_new_conversation('client', v_uid, v_client, p_language);
end;
$$;

-- { id } του μηνύματος. Μόνο ο ιδιοκτήτης της Συζήτησης και μόνο ερώτηση (p_role 'user'): την απάντηση τη γράφει ο server.
create function public.assistant_message_append(
  p_conversation uuid, p_role text, p_content text, p_sources jsonb default '[]'::jsonb, p_no_source boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or p_role is distinct from 'user' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.assistant_append(authz.assistant_conversation_for_write(p_conversation, auth.uid()),
                                'user', p_content, p_sources, false);
end;
$$;

-- ───────────── RPC εγγραφής: server του Βοηθού για Χρήστη (service_role, ρητό p_user) ─────────────

-- { id } της απάντησης του Βοηθού στη Συζήτηση του p_user.
create function public.assistant_reply_append(
  p_user uuid, p_conversation uuid, p_content text, p_sources jsonb default '[]'::jsonb, p_no_source boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.assistant_append(authz.assistant_conversation_for_write(p_conversation, p_user),
                                'assistant', p_content, p_sources, p_no_source);
end;
$$;

-- { id, isNew, count } της Αναπάντητης. p_message (προαιρετικό) = το μήνυμα της ερώτησης· p_embedding 1536 διαστάσεων ή null.
create function public.assistant_unanswered_record(
  p_user uuid, p_conversation uuid, p_message uuid, p_question text, p_embedding extensions.vector default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.assistant_record(authz.assistant_conversation_for_write(p_conversation, p_user),
                                p_message, p_question, p_embedding);
end;
$$;

-- ───────────── RPC εγγραφής: Επισκέπτης (service_role, χωρίς UI ακόμα) ─────────────

create function public.assistant_public_conversation_start(p_language text) returns jsonb
language sql security definer set search_path = ''
as $$ select authz.assistant_new_conversation('public', null, null, p_language); $$;

create function public.assistant_public_message_append(
  p_conversation uuid, p_role text, p_content text, p_sources jsonb default '[]'::jsonb, p_no_source boolean default false
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  return authz.assistant_append(authz.assistant_conversation_for_write(p_conversation, null),
                                p_role, p_content, p_sources, p_no_source);
end;
$$;

create function public.assistant_public_unanswered_record(
  p_conversation uuid, p_message uuid, p_question text, p_embedding extensions.vector default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  return authz.assistant_record(authz.assistant_conversation_for_write(p_conversation, null),
                                p_message, p_question, p_embedding);
end;
$$;

-- ───────────── RPC Διαχείρισης: Συζητήσεις (L2) ─────────────

-- { counts: { all, public, client, team }, page, pageSize, total,
--   items: [{ id, audience, who, clientName, language, startedAt, lastMessageAt, firstQuestion, messageCount,
--             questionCount, noSourceCount }] }. p_audience null = όλες· 50 ανά σελίδα, η πιο πρόσφατη πρώτη.
create function public.assistant_conversations_list(p_audience text default null, p_page integer default 1)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_size constant integer := 50;
  v_page integer := greatest(coalesce(p_page, 1), 1);
begin
  perform authz.require_knowledge_manage();
  if p_audience is not null and p_audience not in ('public', 'client', 'team') then
    raise exception 'Άγνωστο είδος Συζήτησης' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
                 'all', count(*), 'public', count(*) filter (where c.audience = 'public'),
                 'client', count(*) filter (where c.audience = 'client'),
                 'team', count(*) filter (where c.audience = 'team'))
                 from public.assistant_conversations c),
    'page', v_page,
    'pageSize', v_size,
    'total', (select count(*) from public.assistant_conversations c where p_audience is null or c.audience = p_audience),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'audience', c.audience, 'language', c.language, 'startedAt', c.started_at,
               'lastMessageAt', c.last_message_at,
               'firstQuestion', (select left(m.content, 200) from public.assistant_messages m
                                  where m.conversation_id = c.id and m.role = 'user' order by m.created_at, m.id limit 1),
               'messageCount', (select count(*) from public.assistant_messages m where m.conversation_id = c.id),
               'questionCount', (select count(*) from public.assistant_messages m
                                  where m.conversation_id = c.id and m.role = 'user'),
               'noSourceCount', (select count(*) from public.assistant_messages m
                                  where m.conversation_id = c.id and m.role = 'assistant' and m.no_source))
             || authz.assistant_who(c)
             order by c.last_message_at desc, c.id)
        from public.assistant_conversations c
        join (select x.id from public.assistant_conversations x
               where p_audience is null or x.audience = p_audience
               order by x.last_message_at desc, x.id
               limit v_size offset (v_page - 1) * v_size) pg on pg.id = c.id), '[]'::jsonb));
end;
$$;

-- { id, audience, who, clientName, language, startedAt, lastMessageAt,
--   messages: [{ id, role, content, noSource, createdAt, sources: [{ kind, id, title, gone }] }] }. Ανύπαρκτη: P0001.
create function public.assistant_conversation_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_row public.assistant_conversations;
begin
  perform authz.require_knowledge_manage();
  select c.* into v_row from public.assistant_conversations c where c.id = p_id;
  if not found then
    raise exception 'Η Συζήτηση δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'id', v_row.id, 'audience', v_row.audience, 'language', v_row.language, 'startedAt', v_row.started_at,
    'lastMessageAt', v_row.last_message_at,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'role', m.role, 'content', m.content, 'noSource', m.no_source, 'createdAt', m.created_at,
               'sources', authz.assistant_sources_view(m.sources))
             order by m.created_at, m.id)
        from public.assistant_messages m where m.conversation_id = p_id), '[]'::jsonb))
    || authz.assistant_who(v_row);
end;
$$;

-- Διαγραφή Συζήτησης (π.χ. αίτημα διαγραφής): μαζί φεύγουν τα μηνύματα και οι Αναπάντητες που ήρθαν μόνο από αυτήν.
create function public.assistant_conversation_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_knowledge_manage();
  delete from public.assistant_conversations c where c.id = p_id;
  if not found then
    raise exception 'Η Συζήτηση δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── RPC Διαχείρισης: Αναπάντητες (L3) ─────────────

-- { counts: { open, covered, ignored },
--   items: [{ id, question, audience, count, firstAskedAt, lastAskedAt, status, ignoreReason, closedAt, closedByName,
--             coveredItem: { id, title, status } | null, conversationIds: [uuid] }] }
-- Ανοιχτές: η πιο συχνή πρώτη· κλεισμένες: η πιο πρόσφατη πρώτη. Έως 200.
create function public.assistant_unanswered_list(p_status text default 'open') returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_knowledge_manage();
  if coalesce(p_status, '') not in ('open', 'covered', 'ignored') then
    raise exception 'Άγνωστη κατάσταση ερώτησης' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
                 'open', count(*) filter (where u.status = 'open'),
                 'covered', count(*) filter (where u.status = 'covered'),
                 'ignored', count(*) filter (where u.status = 'ignored'))
                 from public.assistant_unanswered u),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', u.id, 'question', u.question, 'audience', u.audience, 'count', u.count,
               'firstAskedAt', u.first_asked_at, 'lastAskedAt', u.last_asked_at, 'status', u.status,
               'ignoreReason', u.ignore_reason, 'closedAt', u.closed_at,
               'closedByName', (select t.name from public.team_users t where t.user_id = u.closed_by),
               'coveredItem', (select jsonb_build_object('id', i.id, 'title', i.title, 'status', i.status)
                                 from public.knowledge_items i where i.id = u.covered_item_id),
               'conversationIds', coalesce((select jsonb_agg(x.conversation_id order by x.asked_at desc)
                                              from (select a.conversation_id, max(a.asked_at) as asked_at
                                                      from public.assistant_unanswered_asks a
                                                     where a.unanswered_id = u.id
                                                     group by a.conversation_id
                                                     order by 2 desc limit 5) x), '[]'::jsonb))
             order by case when p_status = 'open' then u.count end desc nulls last,
                      case when p_status = 'open' then u.last_asked_at else u.closed_at end desc, u.id)
        from (select * from public.assistant_unanswered y
               where y.status = p_status
               order by case when p_status = 'open' then y.count end desc nulls last,
                        case when p_status = 'open' then y.last_asked_at else y.closed_at end desc, y.id
               limit 200) u), '[]'::jsonb));
end;
$$;

-- Πλήθος ανοιχτών (για τη Διαχείριση Γνώσης, L1).
create function public.assistant_unanswered_open_count() returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_knowledge_manage();
  return (select count(*)::integer from public.assistant_unanswered u where u.status = 'open');
end;
$$;

-- «Καλύφθηκε από…»: μόνο ανοιχτή, μόνο με δημοσιευμένο στοιχείο. { warning: 'not_public' | null }: η ερώτηση ήρθε από
-- Επισκέπτη και το στοιχείο δεν έχει Κοινό «δημόσιο» (ο Βοηθός της Ιστοσελίδας δεν θα το βρει).
create function public.assistant_unanswered_cover(p_id uuid, p_item uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.assistant_unanswered;
begin
  perform authz.require_knowledge_manage();
  v_row := authz.assistant_unanswered_for_edit(p_id);
  if v_row.status <> 'open' then
    raise exception 'Η ερώτηση είναι ήδη κλεισμένη' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.knowledge_items i where i.id = p_item and i.status = 'published') then
    raise exception 'Διάλεξε δημοσιευμένο στοιχείο της Γνώσης' using errcode = 'P0001';
  end if;
  update public.assistant_unanswered u
     set status = 'covered', covered_item_id = p_item, closed_by = auth.uid(), closed_at = clock_timestamp()
   where u.id = p_id;
  return jsonb_build_object('warning',
    case when v_row.audience = 'public' and not exists (
           select 1 from public.knowledge_item_audience a where a.item_id = p_item and a.is_public)
         then 'not_public' end);
end;
$$;

-- «Αγνόησε» με λόγο: off_topic | personal_data | abuse. Μόνο ανοιχτή.
create function public.assistant_unanswered_ignore(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.assistant_unanswered;
begin
  perform authz.require_knowledge_manage();
  if coalesce(p_reason, '') not in ('off_topic', 'personal_data', 'abuse') then
    raise exception 'Διάλεξε λόγο' using errcode = 'P0001';
  end if;
  v_row := authz.assistant_unanswered_for_edit(p_id);
  if v_row.status <> 'open' then
    raise exception 'Η ερώτηση είναι ήδη κλεισμένη' using errcode = 'P0001';
  end if;
  update public.assistant_unanswered u
     set status = 'ignored', ignore_reason = p_reason, closed_by = auth.uid(), closed_at = clock_timestamp()
   where u.id = p_id;
end;
$$;

-- «Ξανάνοιγμα»: μόνο κλεισμένη.
create function public.assistant_unanswered_reopen(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.assistant_unanswered;
begin
  perform authz.require_knowledge_manage();
  v_row := authz.assistant_unanswered_for_edit(p_id);
  if v_row.status = 'open' then
    raise exception 'Η ερώτηση είναι ήδη ανοιχτή' using errcode = 'P0001';
  end if;
  update public.assistant_unanswered u
     set status = 'open', covered_item_id = null, ignore_reason = null, closed_by = null, closed_at = null
   where u.id = p_id;
end;
$$;

-- ───────────── Καθαρισμός 12 μηνών (service_role, cron ημερήσιο) ─────────────

-- { conversations } πόσες σβήστηκαν. 12 μήνες από το ΤΕΛΕΥΤΑΙΟ μήνυμα (#9)· μαζί φεύγουν μηνύματα και Αναπάντητες.
create function public.assistant_purge(p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.assistant_conversations c
   where c.last_message_at < coalesce(p_now, now()) - interval '12 months';
  get diagnostics v_count = row_count;
  return jsonb_build_object('conversations', v_count);
end;
$$;

-- ───────────── Κάρτα Σήμερα «Αναπάντητες ερωτήσεις Βοηθού» (L3) ─────────────
-- Ίδιο Δικαίωμα με τη σελίδα-ουρά: knowledge.manage με Εύρος «όλα», μόνο κάρτα ομάδας. Κανένα επείγον (καμία προθεσμία).

create function authz.today_unanswered_allowed(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_client is null and authz.user_scope(p_uid, 'knowledge.manage') is not distinct from 'all'; $$;

create function authz.today_count_unanswered(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unanswered_allowed(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from public.assistant_unanswered u where u.status = 'open');
end;
$$;

create function authz.today_items_unanswered(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unanswered_allowed(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', u.id, 'title', left(u.question, 120),
             'subtitle', 'ρωτήθηκε ' || u.count || case when u.count = 1 then ' φορά' else ' φορές' end,
             'at', u.last_asked_at, 'urgent', false, 'link', '/app/knowledge/unanswered')
           order by u.count desc, u.last_asked_at desc, u.id)
      from (select * from public.assistant_unanswered x where x.status = 'open'
             order by x.count desc, x.last_asked_at desc, x.id limit 3) u),
    '[]'::jsonb);
end;
$$;

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('unanswered', 'knowledge', 'action', 'team', 410, 'Αναπάντητες ερωτήσεις Βοηθού', 'Unanswered Assistant questions',
   '/app/knowledge/unanswered',
   'authz.today_count_unanswered(uuid, uuid, timestamptz)', 'authz.today_items_unanswered(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.assistant_similarity(), authz.assistant_norm(text), authz.assistant_conversation_for_write(uuid, uuid),
  authz.assistant_new_conversation(text, uuid, uuid, text), authz.assistant_sources_ok(jsonb),
  authz.assistant_append(public.assistant_conversations, text, text, jsonb, boolean),
  authz.assistant_match(text, text, extensions.vector),
  authz.assistant_record(public.assistant_conversations, uuid, text, extensions.vector),
  authz.assistant_unanswered_recount(), authz.assistant_who(public.assistant_conversations),
  authz.assistant_sources_view(jsonb), authz.assistant_unanswered_for_edit(uuid),
  authz.today_unanswered_allowed(uuid, uuid),
  authz.today_count_unanswered(uuid, uuid, timestamptz), authz.today_items_unanswered(uuid, uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.assistant_conversation_start(text), public.assistant_message_append(uuid, text, text, jsonb, boolean),
  public.assistant_conversations_list(text, integer), public.assistant_conversation_get(uuid),
  public.assistant_conversation_delete(uuid), public.assistant_unanswered_list(text),
  public.assistant_unanswered_open_count(), public.assistant_unanswered_cover(uuid, uuid),
  public.assistant_unanswered_ignore(uuid, text), public.assistant_unanswered_reopen(uuid)
  from public, anon;

grant execute on function
  public.assistant_conversation_start(text), public.assistant_message_append(uuid, text, text, jsonb, boolean),
  public.assistant_conversations_list(text, integer), public.assistant_conversation_get(uuid),
  public.assistant_conversation_delete(uuid), public.assistant_unanswered_list(text),
  public.assistant_unanswered_open_count(), public.assistant_unanswered_cover(uuid, uuid),
  public.assistant_unanswered_ignore(uuid, text), public.assistant_unanswered_reopen(uuid)
  to authenticated;

revoke all on function
  public.assistant_public_conversation_start(text),
  public.assistant_reply_append(uuid, uuid, text, jsonb, boolean),
  public.assistant_unanswered_record(uuid, uuid, uuid, text, extensions.vector),
  public.assistant_public_message_append(uuid, text, text, jsonb, boolean),
  public.assistant_public_unanswered_record(uuid, uuid, text, extensions.vector),
  public.assistant_purge(timestamptz)
  from public, anon, authenticated;

grant execute on function
  public.assistant_public_conversation_start(text),
  public.assistant_reply_append(uuid, uuid, text, jsonb, boolean),
  public.assistant_unanswered_record(uuid, uuid, uuid, text, extensions.vector),
  public.assistant_public_message_append(uuid, text, text, jsonb, boolean),
  public.assistant_public_unanswered_record(uuid, uuid, text, extensions.vector),
  public.assistant_purge(timestamptz)
  to service_role;

revoke all on table
  public.assistant_conversations, public.assistant_messages, public.assistant_unanswered, public.assistant_unanswered_asks
  from anon, authenticated;
