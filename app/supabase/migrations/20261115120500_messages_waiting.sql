-- Οδηγός «Απαντώ σε Πελάτες» (flow-studio, docs/flows/apanto-se-pelates/flow.md): «Περιμένει απάντηση» και «Δεν χρειάζεται απάντηση».
--
--  • «Περιμένει απάντηση» (G4 γ): ο Πελάτης έγραψε τελευταίος. Μετρά από το πιο παλιό αναπάντητο μήνυμά του, όχι από το άνοιγμα·
--    το άνοιγμα της Συνομιλίας δεν το σβήνει, ούτε το Εσωτερικό μήνυμα. Το σβήνει μήνυμα της ομάδας προς τον Πελάτη ή το
--    «Δεν χρειάζεται απάντηση» (μία γραμμή ανά Πελάτη, κοινή για την ομάδα). Αν ο Πελάτης ξαναγράψει, ξαναμπαίνει μόνο του.
--  • Ο νέος πίνακας είναι κλειστός (RLS χωρίς policies, revoke)· γράφεται μόνο από το messages_skip_reply.
--  • Το messages_inbox ξαναγράφεται ίδιο, με δύο πεδία ανά γραμμή: waitingSince και mentionSince (η πιο παλιά αδιάβαστη
--    @αναφορά σε μένα). Τα υπάρχοντα πεδία δεν αλλάζουν.

create table public.message_reply_skips (
  client_id uuid primary key references public.clients (id) on delete cascade,
  skipped_at timestamptz not null default clock_timestamp(),
  skipped_by uuid not null references auth.users (id)
);

alter table public.message_reply_skips enable row level security;
revoke all on table public.message_reply_skips from anon, authenticated;

create or replace function public.messages_inbox() returns jsonb
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
    ),
    -- Η τελευταία απάντηση: μήνυμα της ομάδας προς τον Πελάτη, ή «Δεν χρειάζεται απάντηση».
    answered as (
      select c.client_id, greatest(
               (select max(t.created_at) from public.messages t
                 where t.client_id = c.client_id and t.author_kind = 'team'
                   and not t.is_internal and t.deleted_at is null),
               (select s.skipped_at from public.message_reply_skips s where s.client_id = c.client_id)
             ) as at
        from (select distinct v.client_id from vis v) c
    ),
    waiting as (
      select v.client_id, min(v.created_at) as since
        from vis v
        join answered a on a.client_id = v.client_id
       where v.author_kind = 'client' and v.deleted_at is null
         and v.created_at > coalesce(a.at, '-infinity'::timestamptz)
       group by v.client_id
    ),
    mention as (
      select v.client_id, min(v.created_at) as since
        from vis v
        left join public.message_reads r on r.user_id = v_me and r.client_id = v.client_id
       where v.is_internal and v.mentions @> array[v_me] and v.author_id <> v_me and v.deleted_at is null
         and v.created_at > coalesce(r.read_at, '-infinity'::timestamptz)
       group by v.client_id
    )
    select jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'clientId', l.client_id, 'clientName', c.name, 'lastAt', l.created_at,
                 'preview', case when l.deleted_at is null then left(l.body, 90) end,
                 'lastInternal', l.is_internal, 'lastDeleted', l.deleted_at is not null,
                 'unread', coalesce(u.n, 0), 'partial', not authz.message_sees_all(l.client_id),
                 'waitingSince', w.since, 'mentionSince', mn.since)
               order by l.created_at desc, c.name)
          from last_msg l
          join public.clients c on c.id = l.client_id
          left join unread u on u.client_id = l.client_id
          left join waiting w on w.client_id = l.client_id
          left join mention mn on mn.client_id = l.client_id
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

-- «Δεν χρειάζεται απάντηση»: βγάζει τη Συνομιλία από το «Περιμένει απάντηση» χωρίς μήνυμα. Ίδιος έλεγχος με το mark_read.
create function public.messages_skip_reply(p_client uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_team_chat();
  if not exists (select 1 from public.messages m where m.client_id = p_client and authz.message_visible(m)) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  insert into public.message_reply_skips (client_id, skipped_at, skipped_by)
  values (p_client, clock_timestamp(), auth.uid())
  on conflict (client_id) do update set skipped_at = excluded.skipped_at, skipped_by = excluded.skipped_by;
end;
$$;

revoke all on function public.messages_inbox(), public.messages_skip_reply(uuid) from public, anon;
grant execute on function public.messages_inbox(), public.messages_skip_reply(uuid) to authenticated;
