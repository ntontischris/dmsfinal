-- Γνώση Lβ (#191): η μνήμη του Βοηθού. Κομμάτια με embedding, ουρά μάθησης, hybrid search, καταγραφή κόστους AI.
--
--  • Πίνακες κλειστοί (RLS χωρίς policies, revoke). Δεν μπαίνουν στο Ίχνος (το audit_entity_allowed δεν αλλάζει).
--  • knowledge_chunks: τα κομμάτια ενός δημοσιευμένου στοιχείου, το καθένα με κεφαλίδα (Ενότητα · τίτλος · Περίληψη), embedding
--    (vector 1536, cosine), το μοντέλο που το έφτιαξε, το content_version του στοιχείου και δικό του ελληνικό full-text
--    (το search_tsv του Lα δεν καλύπτει το κείμενο των Αρχείων).
--  • Ουρά knowledge_index_queue: μία γραμμή ανά στοιχείο. Τα triggers πάνω στο hook του Lα (content_version):
--      δημοσιευμένο → στην ουρά (με το νέο version)· πρόχειρο ή διαγραμμένο → τα κομμάτια σβήνουν ΑΜΕΣΩΣ (ο Βοηθός το ξεχνά).
--    Το text_status (που γράφει ο worker) δεν αλλάζει το version, άρα δεν ξαναμπαίνει στην ουρά.
--  • Worker (μόνο service_role): knowledge_index_claim → knowledge_index_store ή knowledge_index_fail (backoff 1′, 2′, 4′ … έως 1 ώρα).
--    Ένα κομμάτι γράφεται μόνο αν το στοιχείο είναι ακόμα δημοσιευμένο και στο ίδιο version.
--  • «Ξαναφτιάξε όλα»: knowledge_index_rebuild (knowledge.manage ή service_role) βάζει όλα τα δημοσιευμένα στην ουρά.
--  • Hybrid search: authz.knowledge_hybrid(p_uid, p_q, p_embedding, p_limit) → (item_id, chunk_id, content, score).
--    pgvector (cosine) και ελληνικό full-text, ένωση RRF (k = 60), μόνο ορατά (authz.knowledge_visible_to μέσα στο ίδιο query),
--    μόνο κομμάτια του τρέχοντος version. Στοιχείο χωρίς κομμάτια ακόμα (ουρά, αποτυχία) βρίσκεται με το authz.knowledge_fts,
--    με chunk_id null και περιεχόμενο τον τίτλο και την Περίληψη. Χωρίς embedding (null) → μόνο full-text.
--  • Υγεία: το cron της μνήμης γράφει στο job_runs (εργασία knowledge_index) με δικό του RPC (knowledge_index_mark). Κολλημένη
--    ουρά (στοιχείο με 5 αποτυχίες ή στην ουρά πάνω από 15′) = εκτέλεση με σφάλμα· έτσι το Γεγονός 50 και η κάρτα Σήμερα
--    τη δείχνουν όπως τις άλλες εργασίες, χωρίς αλλαγή στις κοινές συναρτήσεις Υγείας.
--  • ai_usage: κάθε κλήση AI γράφει σκοπό, μοντέλο, tokens, κόστος (μικρο-δολάρια) και κοινό. Μόνο service_role (ai_usage_record).
--    Το πλαφόν χτίζεται πάνω του στο Lγ.

create extension if not exists vector with schema extensions;

-- ───────────── Πίνακες ─────────────

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.knowledge_items (id) on delete cascade,
  ord integer not null check (ord >= 0),
  content text not null check (length(content) between 1 and 20000),
  embedding extensions.vector(1536) not null,
  model text not null check (length(model) between 1 and 120),
  content_version integer not null,
  search_tsv tsvector generated always as (to_tsvector('pg_catalog.greek'::regconfig, content)) stored,
  created_at timestamptz not null default now(),
  unique (item_id, ord)
);

create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index knowledge_chunks_search_idx on public.knowledge_chunks using gin (search_tsv);

create table public.knowledge_index_queue (
  item_id uuid primary key references public.knowledge_items (id) on delete cascade,
  content_version integer not null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (last_error is null or length(last_error) <= 500),
  next_try_at timestamptz not null default now(),
  locked_until timestamptz,
  enqueued_at timestamptz not null default now()
);

create index knowledge_index_queue_next_idx on public.knowledge_index_queue (next_try_at);

create table public.ai_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  purpose text not null check (purpose in ('embed', 'search', 'chat', 'invoice')),
  model text not null check (length(model) between 1 and 120),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  audience text not null check (audience in ('team', 'client', 'public'))
);

create index ai_usage_at_idx on public.ai_usage (at);

alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_index_queue enable row level security;
alter table public.ai_usage enable row level security;

-- Η νέα εργασία στο job_runs (ο πίνακας της Υγείας, 20261015160100_health_notifications.sql).
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs add constraint job_runs_job_check check (job in ('outbox', 'google', 'knowledge_index'));

-- ───────────── Ουρά: triggers πάνω στο hook του Lα ─────────────

-- Βάζει (ή ξαναβάζει) ένα στοιχείο στην ουρά με το τρέχον version, από την αρχή.
create function authz.knowledge_index_enqueue(p_item uuid, p_version integer) returns void
language sql security definer set search_path = ''
as $$
  insert into public.knowledge_index_queue as q (item_id, content_version, attempts, last_error, next_try_at, locked_until, enqueued_at)
  values (p_item, p_version, 0, null, now(), null, now())
  on conflict (item_id) do update
     set content_version = excluded.content_version, attempts = 0, last_error = null,
         next_try_at = excluded.next_try_at, locked_until = null, enqueued_at = excluded.enqueued_at;
$$;

create function authz.knowledge_index_forget(p_item uuid) returns void
language sql security definer set search_path = ''
as $$
  delete from public.knowledge_chunks c where c.item_id = p_item;
  delete from public.knowledge_index_queue q where q.item_id = p_item;
$$;

create function authz.knowledge_index_sync() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform authz.knowledge_index_forget(old.id);
  elsif new.status = 'published' then
    perform authz.knowledge_index_enqueue(new.id, new.content_version);
  else
    perform authz.knowledge_index_forget(new.id);
  end if;
  return null;
end;
$$;

create trigger knowledge_items_index_insert after insert on public.knowledge_items
  for each row execute function authz.knowledge_index_sync();
create trigger knowledge_items_index_update after update on public.knowledge_items
  for each row when (old.content_version is distinct from new.content_version)
  execute function authz.knowledge_index_sync();
create trigger knowledge_items_index_delete after delete on public.knowledge_items
  for each row execute function authz.knowledge_index_sync();

-- ───────────── Hybrid search ─────────────

-- Τα κομμάτια πέρα από αυτή την απόσταση (cosine) δεν μετρούν ως σχετικά στο σκέλος pgvector.
create function authz.knowledge_hybrid(p_uid uuid, p_q text, p_embedding extensions.vector, p_limit integer)
returns table (item_id uuid, chunk_id uuid, content text, score double precision)
language sql stable security definer set search_path = ''
as $$
  with visible as (
    select v.id from authz.knowledge_visible_to(p_uid) as v (id)
  ), q as (
    select websearch_to_tsquery('pg_catalog.greek'::regconfig, left(btrim(coalesce(p_q, '')), 200)) as query
  ), current_chunks as (
    select c.id, c.item_id, c.ord, c.content, c.embedding, c.search_tsv
      from public.knowledge_chunks c
      join public.knowledge_items i on i.id = c.item_id and i.content_version = c.content_version
     where c.item_id in (select id from visible)
  ), semantic as (
    select s.id, row_number() over (order by s.distance, s.id) as r
      from (select c.id, c.embedding operator(extensions.<=>) p_embedding as distance
              from current_chunks c
             where p_embedding is not null
             order by 2, 1
             limit 40) s
     where s.distance < 0.8
  ), lexical as (
    select l.key, l.item_id, l.chunk_id, row_number() over (order by l.rank desc, l.key) as r
      from (
        select c.id::text as key, c.item_id, c.id as chunk_id, ts_rank(c.search_tsv, q.query) as rank
          from current_chunks c, q
         where numnode(q.query) > 0 and c.search_tsv @@ q.query
        union all
        select 'item:' || f.item_id, f.item_id, null::uuid, f.rank
          from authz.knowledge_fts(p_uid, p_q, 40) f
         where not exists (select 1 from current_chunks c where c.item_id = f.item_id)
         order by 4 desc
         limit 40) l
  ), fused as (
    select coalesce(s.id::text, l.key) as key,
           coalesce(1.0 / (60 + s.r), 0) + coalesce(1.0 / (60 + l.r), 0) as score
      from semantic s full join lexical l on l.chunk_id = s.id
  )
  select coalesce(c.item_id, l.item_id), c.id,
         coalesce(c.content, i.title || ' · ' || i.summary), f.score::double precision
    from fused f
    left join current_chunks c on c.id::text = f.key
    left join lexical l on l.key = f.key and l.chunk_id is null
    left join public.knowledge_items i on i.id = l.item_id
   order by f.score desc, coalesce(c.item_id, l.item_id), c.ord
   limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- A8: ίδιο σχήμα με το knowledge_search. { items: [{ id, kind, title, summary, sectionName }] }, έως 50, το καλύτερο πρώτο.
-- p_embedding = το embedding της ερώτησης (ή null: μόνο full-text).
create function public.knowledge_search_hybrid(p_q text, p_embedding extensions.vector) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'kind', i.kind, 'title', i.title, 'summary', i.summary, 'sectionName', s.name)
           order by b.score desc, i.title, i.id)
      from (select h.item_id, max(h.score) as score
              from authz.knowledge_hybrid(auth.uid(), p_q, p_embedding, 100) h
             group by h.item_id
             order by 2 desc, 1
             limit 50) b
      join public.knowledge_items i on i.id = b.item_id
      join public.knowledge_sections s on s.id = i.section_id
  ), '[]'::jsonb));
$$;

-- ───────────── Worker (μόνο service_role) ─────────────

-- Παίρνει έως p_limit στοιχεία που είναι η ώρα τους (ή μόνο το p_item, για την άμεση προσπάθεια) και τα κλειδώνει 5′.
-- { items: [{ itemId, version, kind, title, summary, sectionName, body, storagePath, mime, attempts }] }
create function public.knowledge_index_claim(p_limit integer default 10, p_item uuid default null, p_now timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_ids uuid[];
begin
  with picked as (
    select q.item_id from public.knowledge_index_queue q
     where (p_item is null or q.item_id = p_item)
       and q.next_try_at <= v_now
       and (q.locked_until is null or q.locked_until < v_now)
     order by q.next_try_at, q.item_id
     limit greatest(1, least(coalesce(p_limit, 10), 50))
     for update skip locked
  ), locked as (
    update public.knowledge_index_queue q set locked_until = v_now + interval '5 minutes'
      from picked where q.item_id = picked.item_id
    returning q.item_id
  )
  select coalesce(array_agg(l.item_id), '{}') into v_ids from locked l;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
             'itemId', i.id, 'version', q.content_version, 'kind', i.kind, 'title', i.title, 'summary', i.summary,
             'sectionName', s.name, 'body', i.body_md, 'storagePath', i.storage_path, 'mime', i.mime,
             'attempts', q.attempts)
           order by q.next_try_at, i.id)
      from public.knowledge_index_queue q
      join public.knowledge_items i on i.id = q.item_id and i.status = 'published'
      join public.knowledge_sections s on s.id = i.section_id
     where q.item_id = any (v_ids)), '[]'::jsonb));
end;
$$;

-- Γράφει τα κομμάτια ενός στοιχείου: p_chunks = [{ content, embedding: number[1536] }], p_text_status για Αρχείο
-- (ok | image_only | failed, αλλιώς null). → { stored: true, chunks } ή { stored: false } όταν το στοιχείο άλλαξε στο μεταξύ.
create function public.knowledge_index_store(
  p_item uuid, p_version integer, p_text_status text, p_model text, p_chunks jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_text_status is not null and p_text_status not in ('ok', 'image_only', 'failed') then
    raise exception 'Άγνωστη κατάσταση κειμένου' using errcode = 'P0001';
  end if;
  if case when jsonb_typeof(p_chunks) = 'array' then jsonb_array_length(p_chunks) not between 1 and 500 else true end then
    raise exception 'Τα κομμάτια θέλουν από 1 έως 500' using errcode = 'P0001';
  end if;
  perform 1 from public.knowledge_items i
   where i.id = p_item and i.status = 'published' and i.content_version = p_version
   for update;
  if not found then
    return jsonb_build_object('stored', false);
  end if;
  delete from public.knowledge_chunks c where c.item_id = p_item;
  insert into public.knowledge_chunks (item_id, ord, content, embedding, model, content_version)
  select p_item, (e.ord - 1)::integer, e.value->>'content', (e.value->'embedding')::text::extensions.vector, p_model, p_version
    from jsonb_array_elements(p_chunks) with ordinality as e (value, ord);
  get diagnostics v_count = row_count;
  update public.knowledge_items i set text_status = p_text_status
   where i.id = p_item and i.storage_path is not null and p_text_status is not null
     and i.text_status is distinct from p_text_status;
  delete from public.knowledge_index_queue q where q.item_id = p_item and q.content_version = p_version;
  return jsonb_build_object('stored', true, 'chunks', v_count);
end;
$$;

-- Αποτυχία (π.χ. το Gateway δεν απάντησε): ξανά σε 1′, 2′, 4′ … έως 1 ώρα. Το σφάλμα κρατιέται για την Υγεία.
create function public.knowledge_index_fail(p_item uuid, p_version integer, p_error text, p_now timestamptz default null)
returns void
language sql security definer set search_path = ''
as $$
  update public.knowledge_index_queue q
     set attempts = q.attempts + 1,
         last_error = left(coalesce(nullif(btrim(p_error), ''), 'Άγνωστο σφάλμα'), 500),
         next_try_at = coalesce(p_now, now()) + least(interval '1 minute' * power(2, least(q.attempts, 10)), interval '1 hour'),
         locked_until = null
   where q.item_id = p_item and q.content_version = p_version;
$$;

-- Υγεία της μνήμης στο job_runs. p_ok null = έναρξη· true = η εκτέλεση τελείωσε, αλλά μετρά ως σφάλμα αν η ουρά έχει κολλήσει
-- (στοιχείο με 5 αποτυχίες ή στην ουρά πάνω από 15′)· false = η εκτέλεση απέτυχε (p_error). → { pending, stuck }
create function public.knowledge_index_mark(p_ok boolean, p_error text default null, p_now timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_pending integer;
  v_stuck integer;
  v_ok boolean := p_ok;
  v_error text := p_error;
begin
  select count(*), count(*) filter (where q.attempts >= 5 or q.enqueued_at < v_now - interval '15 minutes')
    into v_pending, v_stuck
    from public.knowledge_index_queue q;
  if v_ok and v_stuck > 0 then
    v_ok := false;
    v_error := 'Η μνήμη του Βοηθού κόλλησε: ' || v_stuck || ' στοιχεία περιμένουν. '
               || coalesce((select q.last_error from public.knowledge_index_queue q
                             where q.last_error is not null order by q.attempts desc, q.item_id limit 1), '');
  end if;
  insert into public.job_runs as j (job, last_started_at, last_ok_at, last_error, last_error_at)
  values ('knowledge_index', case when v_ok is null then v_now end, case when v_ok then v_now end,
          case when not v_ok then left(coalesce(nullif(btrim(v_error), ''), 'Άγνωστο σφάλμα'), 500) end,
          case when not v_ok then v_now end)
  on conflict (job) do update
     set last_started_at = coalesce(excluded.last_started_at, j.last_started_at),
         last_ok_at = coalesce(excluded.last_ok_at, j.last_ok_at),
         last_error = case when v_ok is null then j.last_error else excluded.last_error end,
         last_error_at = case when v_ok is null then j.last_error_at else excluded.last_error_at end;
  return jsonb_build_object('pending', v_pending, 'stuck', v_stuck);
end;
$$;

-- «Ξαναφτιάξε τη μνήμη του Βοηθού»: όλα τα δημοσιευμένα στην ουρά (π.χ. μετά από αλλαγή μοντέλου embedding). → { queued }
create function public.knowledge_index_rebuild() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer := 0;
  v_item record;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    perform authz.require_knowledge_manage();
  end if;
  for v_item in select i.id, i.content_version from public.knowledge_items i where i.status = 'published' loop
    perform authz.knowledge_index_enqueue(v_item.id, v_item.content_version);
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('queued', v_count);
end;
$$;

-- ───────────── Κόστος AI (μόνο service_role) ─────────────

create function public.ai_usage_record(
  p_purpose text, p_model text, p_input_tokens integer, p_output_tokens integer, p_cost_micros bigint, p_audience text
) returns void
language sql security definer set search_path = ''
as $$
  insert into public.ai_usage (purpose, model, input_tokens, output_tokens, cost_micros, audience)
  values (p_purpose, p_model, coalesce(p_input_tokens, 0), coalesce(p_output_tokens, 0), coalesce(p_cost_micros, 0), p_audience);
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.knowledge_index_enqueue(uuid, integer), authz.knowledge_index_forget(uuid), authz.knowledge_index_sync(),
  authz.knowledge_hybrid(uuid, text, extensions.vector, integer)
  from public, anon, authenticated;

revoke all on function public.knowledge_search_hybrid(text, extensions.vector) from public, anon;
grant execute on function public.knowledge_search_hybrid(text, extensions.vector) to authenticated;

revoke all on function public.knowledge_index_rebuild() from public, anon;
grant execute on function public.knowledge_index_rebuild() to authenticated, service_role;

revoke all on function
  public.knowledge_index_claim(integer, uuid, timestamptz),
  public.knowledge_index_store(uuid, integer, text, text, jsonb),
  public.knowledge_index_fail(uuid, integer, text, timestamptz),
  public.knowledge_index_mark(boolean, text, timestamptz),
  public.ai_usage_record(text, text, integer, integer, bigint, text)
  from public, anon, authenticated;
grant execute on function
  public.knowledge_index_claim(integer, uuid, timestamptz),
  public.knowledge_index_store(uuid, integer, text, text, jsonb),
  public.knowledge_index_fail(uuid, integer, text, timestamptz),
  public.knowledge_index_mark(boolean, text, timestamptz),
  public.ai_usage_record(text, text, integer, integer, bigint, text)
  to service_role;

revoke all on table public.knowledge_chunks, public.knowledge_index_queue, public.ai_usage from anon, authenticated;
