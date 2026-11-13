-- Σημειώσεις πάνω στο βίντεο (c2): απαντήσεις σε νήμα, «λύθηκε» και «το είδε», για ομάδα και πελάτη.
--
-- • Απάντηση = σχόλιο με parent_id (ένα επίπεδο· απάντηση σε απάντηση πάει στη ρίζα). Η απάντηση δεν έχει χρόνο.
-- • «Λύθηκε» μόνο στη ρίζα του νήματος· το γυρίζει πίσω όποιος μπορεί να το βάλει.
-- • «Το είδε»: κλειστός πίνακας (σχόλιο, Χρήστης). Γράφεται όταν ο Χρήστης ανοίγει την Έκδοση· δεν μπαίνει στο Ίχνος.
-- • Ο πελάτης βλέπει μόνο σημειώσεις των δικών του Παραδοτέων, ποτέ τις εσωτερικές (ούτε απαντήσεις σε εσωτερικές).
-- • Ειδοποιήσεις: εδώ δεν γεννιέται Γεγονός· τα σχόλια μέχρι τώρα δεν είχαν. Η δρομολόγηση είναι δουλειά των ειδοποιήσεων.

-- ───────────── Πίνακες ─────────────

alter table public.deliverable_comments
  add column parent_id uuid references public.deliverable_comments (id),
  add column resolved_at timestamptz,
  add column resolved_by uuid,
  add constraint deliverable_comments_reply_no_time check (parent_id is null or at_seconds is null),
  add constraint deliverable_comments_reply_not_resolved check (parent_id is null or resolved_at is null),
  add constraint deliverable_comments_resolved_by check ((resolved_at is null) = (resolved_by is null));

create index deliverable_comments_parent_idx on public.deliverable_comments (parent_id) where parent_id is not null;

create table public.deliverable_comment_seen (
  comment_id uuid not null references public.deliverable_comments (id),
  user_id uuid not null,
  seen_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.deliverable_comment_seen enable row level security;
revoke all on table public.deliverable_comment_seen from anon, authenticated;

-- ───────────── Βοηθοί ─────────────

-- Όνομα για τη σημείωση: μέλος της ομάδας ή Χρήστης του πελάτη του Παραδοτέου.
create function authz.deliverable_person_name(p_user uuid, p_client uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  return coalesce((select t.name from public.team_users t where t.user_id = p_user),
                  authz.client_user_name(p_user, p_client));
end;
$$;

-- Οι σημειώσεις μιας Έκδοσης. Για τον πελάτη: χωρίς εσωτερικές, και το όνομα του συντάκτη πάντα γραμμένο.
-- Για την ομάδα το authorName είναι μόνο όνομα ομάδας (κενό = ο πελάτης), όπως πριν.
create function authz.deliverable_notes_json(p_deliverable uuid, p_version integer, p_for_client boolean) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := (select p.client_id from public.deliverables d join public.productions p on p.id = d.production_id
                     where d.id = p_deliverable);
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', c.id, 'parentId', c.parent_id, 'body', c.body, 'atSeconds', c.at_seconds,
             'createdAt', c.created_at,
             'authorName', case when p_for_client then authz.deliverable_person_name(c.created_by, v_client)
                                else (select t.name from public.team_users t where t.user_id = c.created_by) end,
             'resolvedAt', c.resolved_at,
             'resolvedByName', authz.deliverable_person_name(c.resolved_by, v_client),
             'seenBy', (select coalesce(jsonb_agg(authz.deliverable_person_name(s.user_id, v_client) order by s.seen_at, s.user_id)
                                          filter (where authz.deliverable_person_name(s.user_id, v_client) is not null), '[]'::jsonb)
                          from public.deliverable_comment_seen s
                         where s.comment_id = c.id and s.user_id is distinct from c.created_by)
           ) || case when p_for_client then '{}'::jsonb else jsonb_build_object('isInternal', c.is_internal) end
           order by c.created_at, c.id), '[]'::jsonb)
      from public.deliverable_comments c
     where c.deliverable_id = p_deliverable and c.version_number = p_version
       and not (p_for_client and c.is_internal)
  );
end;
$$;

-- Εκδόσεις με τα σχόλιά τους, νεότερη πρώτη (ομάδα). Τα σχόλια έχουν τώρα νήμα, «λύθηκε» και «το είδε».
create or replace function authz.deliverable_versions_json(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'number', v.number, 'url', v.url, 'host', v.host, 'state', v.state, 'note', v.note,
             'reviewNote', v.review_note, 'createdAt', v.created_at, 'sentAt', v.sent_at,
             'answeredAt', v.answered_at, 'answerNote', v.answer_note, 'linkBroken', v.link_broken_at is not null,
             'comments', authz.deliverable_notes_json(v.deliverable_id, v.number, false)
           ) order by v.number desc), '[]'::jsonb)
      from public.deliverable_versions v
     where v.deliverable_id = p_deliverable
  );
end;
$$;

-- Εκδόσεις που στάλθηκαν, νεότερη πρώτη, με τις σημειώσεις που βλέπει ο πελάτης (χωρίς εσωτερικές).
create or replace function authz.client_versions_json(p_deliverable uuid, p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'number', v.number, 'url', v.url, 'host', v.host, 'sentAt', v.sent_at, 'state', v.state,
             'answeredByName', authz.client_user_name(v.answered_by, p_client),
             'answeredAt', v.answered_at, 'answerNote', v.answer_note,
             'linkBroken', v.link_broken_at is not null,
             'comments', authz.deliverable_notes_json(v.deliverable_id, v.number, true)
           ) order by v.number desc), '[]'::jsonb)
      from public.deliverable_versions v
     where v.deliverable_id = p_deliverable and v.sent_at is not null
  );
end;
$$;

-- Κοινός έλεγχος κειμένου απάντησης (ίδιο όριο με το σχόλιο).
create function authz.deliverable_note_body(p_body text) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
begin
  if length(v_body) = 0 or length(v_body) > 2000 then
    raise exception 'Το σχόλιο θέλει κείμενο έως 2000 χαρακτήρες' using errcode = 'P0001';
  end if;
  return v_body;
end;
$$;

-- ───────────── Ομάδα ─────────────

-- Απάντηση της ομάδας. Σε εσωτερική σημείωση η απάντηση είναι πάντα εσωτερική.
create function public.deliverable_comment_reply(p_parent uuid, p_body text, p_internal boolean) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_parent public.deliverable_comments;
  v_root public.deliverable_comments;
  v_body text;
  v_id uuid;
begin
  select * into v_parent from public.deliverable_comments c where c.id = p_parent;
  perform authz.deliverable_gate(v_parent.deliverable_id, 'deliverables.work');
  perform authz.require_deliverable_open(v_parent.deliverable_id);
  if authz.deliverable_state(v_parent.deliverable_id) = 'cancelled' then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  v_body := authz.deliverable_note_body(p_body);
  select * into v_root from public.deliverable_comments c where c.id = coalesce(v_parent.parent_id, v_parent.id);
  insert into public.deliverable_comments (deliverable_id, version_number, body, is_internal, parent_id, created_by)
  values (v_root.deliverable_id, v_root.version_number, v_body, v_root.is_internal or coalesce(p_internal, false),
          v_root.id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- «Λύθηκε» / «Άνοιξε ξανά» από την ομάδα, μόνο στη ρίζα του νήματος.
create function public.deliverable_comment_resolve(p_comment uuid, p_resolved boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.deliverable_comments;
begin
  select * into v_row from public.deliverable_comments c where c.id = p_comment;
  perform authz.deliverable_gate(v_row.deliverable_id, 'deliverables.work');
  if v_row.parent_id is not null then
    raise exception 'Λύνεται η σημείωση, όχι η απάντηση' using errcode = 'P0001';
  end if;
  update public.deliverable_comments c
     set resolved_at = case when p_resolved then coalesce(c.resolved_at, now()) end,
         resolved_by = case when p_resolved then coalesce(c.resolved_by, auth.uid()) end
   where c.id = p_comment;
end;
$$;

-- Η ομάδα άνοιξε την Έκδοση: ό,τι δεν έγραψε η ίδια σημειώνεται «το είδε».
create function public.deliverable_comments_seen(p_id uuid, p_version integer) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_deliverable_view(p_id);
  insert into public.deliverable_comment_seen (comment_id, user_id)
  select c.id, auth.uid() from public.deliverable_comments c
   where c.deliverable_id = p_id and c.version_number = p_version and c.created_by is distinct from auth.uid()
  on conflict do nothing;
end;
$$;

-- ───────────── Πελάτης ─────────────

-- Η σημείωση που βλέπει ο πελάτης: του δικού του Παραδοτέου, όχι εσωτερική, σε σταλμένη Έκδοση.
-- Ό,τι άλλο (και ό,τι δεν υπάρχει) είναι 42501, ώστε να μη μαθαίνει τι υπάρχει.
create function authz.client_visible_note(p_comment uuid) returns public.deliverable_comments
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_row public.deliverable_comments;
begin
  select * into v_row from public.deliverable_comments c where c.id = p_comment;
  if v_row.id is null or v_row.is_internal or not exists (
    select 1 from public.deliverables d join public.productions p on p.id = d.production_id
      join public.deliverable_versions v on v.deliverable_id = d.id and v.number = v_row.version_number
     where d.id = v_row.deliverable_id and p.client_id is not null and p.client_id = authz.client_user_client_id()
       and v.sent_at is not null
  ) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

create function public.deliverable_client_comment_reply(p_parent uuid, p_body text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_parent public.deliverable_comments;
  v_root public.deliverable_comments;
  v_body text;
  v_id uuid;
begin
  perform authz.require_client_permission('c.approve');
  v_parent := authz.client_visible_note(p_parent);
  if exists (select 1 from public.deliverables d where d.id = v_parent.deliverable_id and d.cancelled_at is not null) then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  v_body := authz.deliverable_note_body(p_body);
  select * into v_root from public.deliverable_comments c where c.id = coalesce(v_parent.parent_id, v_parent.id);
  insert into public.deliverable_comments (deliverable_id, version_number, body, is_internal, parent_id, created_by)
  values (v_root.deliverable_id, v_root.version_number, v_body, false, v_root.id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function public.deliverable_client_comment_resolve(p_comment uuid, p_resolved boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.deliverable_comments;
begin
  perform authz.require_client_permission('c.approve');
  v_row := authz.client_visible_note(p_comment);
  if v_row.parent_id is not null then
    raise exception 'Λύνεται η σημείωση, όχι η απάντηση' using errcode = 'P0001';
  end if;
  update public.deliverable_comments c
     set resolved_at = case when p_resolved then coalesce(c.resolved_at, now()) end,
         resolved_by = case when p_resolved then coalesce(c.resolved_by, auth.uid()) end
   where c.id = p_comment;
end;
$$;

-- Ο πελάτης άνοιξε την Έκδοση: οι σημειώσεις που βλέπει σημειώνονται «το είδε».
create function public.deliverable_client_comments_seen(p_id uuid, p_version integer) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_client_reader();
  perform authz.require_client_deliverable_visible(p_id);
  insert into public.deliverable_comment_seen (comment_id, user_id)
  select c.id, auth.uid() from public.deliverable_comments c
    join public.deliverable_versions v on v.deliverable_id = c.deliverable_id and v.number = c.version_number
   where c.deliverable_id = p_id and c.version_number = p_version and not c.is_internal
     and v.sent_at is not null and c.created_by is distinct from auth.uid()
  on conflict do nothing;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.deliverable_person_name(uuid, uuid), authz.deliverable_notes_json(uuid, integer, boolean),
  authz.deliverable_note_body(text), authz.client_visible_note(uuid)
  from public, anon, authenticated;

revoke all on function
  public.deliverable_comment_reply(uuid, text, boolean), public.deliverable_comment_resolve(uuid, boolean),
  public.deliverable_comments_seen(uuid, integer), public.deliverable_client_comment_reply(uuid, text),
  public.deliverable_client_comment_resolve(uuid, boolean), public.deliverable_client_comments_seen(uuid, integer)
  from public, anon;
grant execute on function
  public.deliverable_comment_reply(uuid, text, boolean), public.deliverable_comment_resolve(uuid, boolean),
  public.deliverable_comments_seen(uuid, integer), public.deliverable_client_comment_reply(uuid, text),
  public.deliverable_client_comment_resolve(uuid, boolean), public.deliverable_client_comments_seen(uuid, integer)
  to authenticated;
