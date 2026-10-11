-- Μηνύματα Jδ (#163): Αιτήματα. Ένα Αίτημα είναι Μήνυμα του πελάτη με κατάσταση (ανοιχτό → ολοκληρώθηκε | απορρίφθηκε).
--
--  • Ο πίνακας message_requests είναι κλειστός (RLS χωρίς policies, revoke). Πρόσβαση μόνο μέσα από τα RPC παρακάτω.
--  • Δήλωση (Μ9): ο πελάτης με c.chatWrite τη στιγμή που γράφει (message_send, request.kind)· η ομάδα σημειώνει Μήνυμα του πελάτη
--    (message_mark_request). Η «αλλαγή μετά την έγκριση» μένει στο deliverable_requests (Μ12) και φαίνεται εδώ ως kind «change».
--  • Ανάθεση (Μ10): υπεύθυνος της Παραγωγής της ετικέτας → Υπεύθυνος Πελάτη → «Χωρίς υπεύθυνο» (null). Μόνο ενεργά μέλη με πρόσβαση
--    στη Συνομιλία. Η αλλαγή ετικέτας δεν αλλάζει υπεύθυνο. Μεταβίβαση από όσους έχουν clients.transfer. Η απενεργοποίηση ενός
--    μέλους στέλνει τα ανοιχτά Αιτήματά του «Χωρίς υπεύθυνο».
--  • Μ11: «Δημιουργία Παραδοτέου / Γυρίσματος από το Αίτημα» καλεί τα deliverable_create / filming_create (αμετάβλητα, με τα δικά τους
--    Δικαιώματα) και κλείνει το Αίτημα στην ίδια συναλλαγή: αν αποτύχει το ένα, δεν γίνεται τίποτα.
--  • Μ13: «ανοιχτό Χ μέρες» με ημερολογιακές μέρες ώρας Αθήνας (message_settings.request_open_days). Υπολογίζεται σε κάθε ανάγνωση.
--  • Το Μήνυμα που έγινε Αίτημα δεν διαγράφεται (Μ5).

-- ───────────── Πίνακας ─────────────

create table public.message_requests (
  message_id uuid primary key references public.messages (id),
  kind text not null check (kind in ('deliverable', 'filming', 'other')),
  state text not null default 'open' check (state in ('open', 'done', 'rejected')),
  -- null = «Χωρίς υπεύθυνο».
  assignee_id uuid references auth.users (id),
  declared_by text not null check (declared_by in ('client', 'team')),
  declared_user uuid not null references auth.users (id),
  declared_at timestamptz not null default clock_timestamp(),
  closed_at timestamptz,
  closed_by uuid references auth.users (id),
  close_link text check (close_link is null or (close_link ~ '^https://[^[:space:]]+$' and length(close_link) <= 2000)),
  close_comment text check (close_comment is null or length(close_comment) between 1 and 2000),
  close_reply text check (close_reply is null or length(close_reply) between 1 and 2000),
  -- true όταν το Αίτημα έκλεισε μόνο του από τη δημιουργία Παραδοτέου / Γυρίσματος (Μ11).
  is_automatic boolean not null default false,
  result_kind text check (result_kind in ('deliverable', 'filming')),
  result_id uuid,
  check ((result_kind is null) = (result_id is null)),
  check (is_automatic = (result_kind is not null)),
  check (state <> 'open' or (closed_at is null and closed_by is null and close_link is null and close_comment is null
                              and close_reply is null and not is_automatic)),
  check (state <> 'done' or (closed_at is not null and closed_by is not null and close_reply is null
                              and (close_link is not null or close_comment is not null or is_automatic))),
  check (state <> 'rejected' or (closed_at is not null and closed_by is not null and close_reply is not null
                                  and close_link is null and close_comment is null and not is_automatic))
);

create index message_requests_state_assignee_idx on public.message_requests (state, assignee_id);

alter table public.message_requests enable row level security;

-- ───────────── Βοηθητικές authz ─────────────

-- Ο υπεύθυνος ενός νέου Αιτήματος (Μ10): υπεύθυνος της Παραγωγής της ετικέτας, αλλιώς Υπεύθυνος Πελάτη, αλλιώς null.
-- Μόνο ενεργό μέλος με πρόσβαση στη Συνομιλία (αλλιώς το Αίτημα θα έμενε αόρατο σε αυτόν).
-- Βλέπει ο (άλλος) Χρήστης αυτό το Μήνυμα: ενεργό μέλος με «Συνομιλεί», και Εύρος «όλα», Υπεύθυνος Πελάτη
-- ή owner/Μέλος της Παραγωγής της ετικέτας. Ίδιος κανόνας με το message_visible, για ανάθεση (Μ10).
create function authz.message_visible_to(p_user uuid, p_message uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.message_mentionable(p_user) and exists (
    select 1 from public.messages m
     where m.id = p_message
       and (authz.user_scope(p_user, 'messages.chat') = 'all'
            or exists (select 1 from public.clients c where c.id = m.client_id and c.manager_id = p_user)
            or exists (select 1 from public.productions p
                        where p.id = m.production_id
                          and (p.owner_id = p_user
                               or exists (select 1 from public.production_members pm
                                           where pm.production_id = p.id and pm.user_id = p_user)))));
$$;

-- Όσοι βλέπουν ολόκληρη τη Συνομιλία ενός Πελάτη (λίστα «Αλλαγή υπευθύνου»).
create function authz.message_sees_all_of(p_user uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.message_mentionable(p_user)
     and (coalesce(authz.user_scope(p_user, 'messages.chat') = 'all', false)
          or exists (select 1 from public.clients c where c.id = p_client and c.manager_id = p_user));
$$;

create function authz.request_assignee(p_message uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.owner_id from public.messages m join public.productions p on p.id = m.production_id
      where m.id = p_message and authz.message_mentionable(p.owner_id)),
    (select c.manager_id from public.messages m join public.clients c on c.id = m.client_id
      where m.id = p_message and authz.message_mentionable(c.manager_id)));
$$;

-- Ημερολογιακές μέρες από μια στιγμή, με ώρα Αθήνας (Μ13).
create function authz.request_days_open(p_from timestamptz) returns integer
language sql stable set search_path = ''
as $$
  select (timezone('Europe/Athens', clock_timestamp())::date - timezone('Europe/Athens', p_from)::date);
$$;

create function authz.request_open_days() returns integer
language sql stable security definer set search_path = ''
as $$ select s.request_open_days from public.message_settings s where s.id; $$;

-- Το Αίτημα ενός Μηνύματος όπως το βλέπει ο θεατής. Ο πελάτης δεν βλέπει υπεύθυνο, μέρες ή δυνατότητες (Μ13, J3).
create function authz.message_request_json(r public.message_requests, p_team boolean) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_open boolean := r.state = 'open';
  v_days integer := authz.request_days_open(r.declared_at);
begin
  return jsonb_build_object(
           'kind', r.kind, 'state', r.state, 'declaredBy', r.declared_by, 'declaredAt', r.declared_at,
           'closedAt', r.closed_at, 'link', r.close_link, 'comment', r.close_comment, 'reply', r.close_reply,
           'automatic', r.is_automatic, 'resultKind', r.result_kind, 'resultId', r.result_id)
      || case when p_team then jsonb_build_object(
           'assigneeId', r.assignee_id,
           'assigneeName', (select t.name from public.team_users t where t.user_id = r.assignee_id),
           'daysOpen', case when v_open then v_days end,
           'stale', v_open and v_days >= authz.request_open_days(),
           'canHandle', v_open and (coalesce(r.assignee_id = auth.uid(), false) or authz.has('clients.transfer')),
           'canReassign', v_open and authz.has('clients.transfer'))
         else '{}'::jsonb end;
end;
$$;

-- Η απόφαση ενός Αιτήματος αλλαγής: το «χρεώνεται» φαίνεται μόνο σε όσους βλέπουν ποσά (όχι στον πελάτη).
create function authz.change_decision_visible(p_decision text, p_team boolean) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when p_decision is null then null
    when p_decision = 'charged' and not (p_team and authz.has('finance.amounts')) then null
    else p_decision
  end;
$$;

-- Τα Αιτήματα αλλαγής μετά την έγκριση (Μ12) των Παραδοτέων του Πελάτη που βλέπει ο θεατής, για το νήμα.
-- Ομάδα: ίδιος κανόνας με τα Μηνύματα, πάνω στην Παραγωγή του Παραδοτέου. Πελάτης: με c.chatRead.
create function authz.thread_change_requests(p_client uuid, p_team boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(x.item order by x.created, x.id), '[]'::jsonb)
    from (
      select q.id, q.created_at as created, jsonb_build_object(
               'id', q.id, 'at', q.created_at, 'deliverableId', d.id, 'deliverableTitle', d.title, 'body', q.body,
               'state', case when q.decision is null then 'open' else 'done' end,
               'decision', authz.change_decision_visible(q.decision, p_team)) as item
        from public.deliverable_requests q
        join public.deliverables d on d.id = q.deliverable_id
        join public.productions pr on pr.id = d.production_id
       where pr.client_id = p_client
         and case
               when p_team then authz.has('messages.chat')
                                and (authz.message_sees_all(p_client) or authz.production_involved(pr.id))
               else authz.client_user_has('c.chatRead') and p_client = authz.client_user_client_id()
             end
       order by q.created_at desc, q.id desc
       limit 100
    ) x;
$$;

-- Φορτώνει ένα Αίτημα για χειρισμό (κλείσιμο, δημιουργία Παραδοτέου / Γυρίσματος). Πρώτα το Δικαίωμα (42501, ίδιο για ανύπαρκτο
-- και για μη ορατό Μήνυμα): ομάδα με πρόσβαση στη Συνομιλία που βλέπει το Μήνυμα, και είναι ο υπεύθυνος ή έχει clients.transfer.
create function authz.request_for_handling(p_message uuid) returns public.message_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.message_requests;
begin
  perform authz.require_team_chat();
  perform authz.message_for_edit(p_message);
  select * into v_req from public.message_requests r where r.message_id = p_message for update;
  if not found then
    raise exception 'Το Μήνυμα δεν είναι Αίτημα' using errcode = 'P0001';
  end if;
  if v_req.assignee_id is distinct from auth.uid() and not authz.has('clients.transfer') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_req.state <> 'open' then
    raise exception 'Το Αίτημα έχει ήδη κλείσει' using errcode = 'P0001';
  end if;
  return v_req;
end;
$$;

-- Κείμενο κλεισίματος: καθαρό, έως 2.000 χαρακτήρες, σύνδεσμοι μόνο https (Μ6). Κενό = null.
create function authz.request_clean_text(p_text text) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if v_text is null then
    return null;
  end if;
  if length(v_text) > 2000 then
    raise exception 'Το κείμενο έχει το πολύ 2.000 χαρακτήρες' using errcode = 'P0001';
  end if;
  if v_text ~* '(^|[^a-z0-9])(http|ftp|file)://' then
    raise exception 'Επιτρέπονται μόνο σύνδεσμοι που ξεκινούν με https://' using errcode = 'P0001';
  end if;
  return v_text;
end;
$$;

-- Κλείνει το Αίτημα ως ολοκληρωμένο αυτόματα, με το αποτέλεσμα που δημιουργήθηκε (Μ11).
create function authz.request_close_automatic(p_message uuid, p_kind text, p_result uuid) returns void
language sql security definer set search_path = ''
as $$
  update public.message_requests r
     set state = 'done', closed_at = clock_timestamp(), closed_by = auth.uid(),
         is_automatic = true, result_kind = p_kind, result_id = p_result
   where r.message_id = p_message;
$$;

-- Απενεργοποίηση μέλους (Μ10): τα ανοιχτά Αιτήματά του μένουν «Χωρίς υπεύθυνο».
create function authz.requests_unassign_inactive() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.message_requests r set assignee_id = null where r.assignee_id = new.user_id and r.state = 'open';
  return new;
end;
$$;

create trigger team_users_unassign_requests after update of is_active on public.team_users
  for each row when (old.is_active and not new.is_active) execute function authz.requests_unassign_inactive();

-- ───────────── Ίχνος ─────────────

create trigger message_requests_audit after insert on public.message_requests
  for each row execute function authz.audit_row('message_id');
create trigger message_requests_audit_update after update on public.message_requests
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('message_id');

-- ───────────── RPC: ομάδα ─────────────

-- Σημειώνει Μήνυμα του πελάτη ως Αίτημα (Μ9). Η «αλλαγή μετά την έγκριση» δεν επιτρέπεται από τη Συνομιλία.
create function public.message_mark_request(p_message uuid, p_kind text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.messages;
begin
  perform authz.require_team_chat();
  v_row := authz.message_for_edit(p_message);
  if not authz.message_can_write(v_row.client_id, v_row.production_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_row.author_kind <> 'client' then
    raise exception 'Σημειώνεις ως Αίτημα μόνο Μηνύματα του πελάτη' using errcode = 'P0001';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'Το Μήνυμα έχει διαγραφεί' using errcode = 'P0001';
  end if;
  if p_kind is null or p_kind not in ('deliverable', 'filming', 'other') then
    raise exception 'Το είδος είναι νέο Παραδοτέο, Γύρισμα ή άλλο' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.message_requests r where r.message_id = p_message) then
    raise exception 'Το Μήνυμα είναι ήδη Αίτημα' using errcode = 'P0001';
  end if;
  insert into public.message_requests (message_id, kind, assignee_id, declared_by, declared_user)
  values (p_message, p_kind, authz.request_assignee(p_message), 'team', auth.uid());
end;
$$;

-- Μεταβίβαση σε άλλο μέλος ή σε «Χωρίς υπεύθυνο» (null). Μόνο όσοι «Μεταβιβάζουν Υπεύθυνο», μόνο ανοιχτό Αίτημα.
create function public.message_request_assign(p_message uuid, p_user uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.message_requests;
begin
  perform authz.require_team_chat();
  perform authz.require('clients.transfer');
  perform authz.message_for_edit(p_message);
  select * into v_req from public.message_requests r where r.message_id = p_message for update;
  if not found then
    raise exception 'Το Μήνυμα δεν είναι Αίτημα' using errcode = 'P0001';
  end if;
  if v_req.state <> 'open' then
    raise exception 'Το Αίτημα έχει ήδη κλείσει' using errcode = 'P0001';
  end if;
  if p_user is not null and not authz.message_mentionable(p_user) then
    raise exception 'Ο υπεύθυνος πρέπει να είναι ενεργό μέλος της ομάδας με πρόσβαση στη Συνομιλία' using errcode = 'P0001';
  end if;
  if p_user is not null and not authz.message_visible_to(p_user, p_message) then
    raise exception 'Ο υπεύθυνος δεν βλέπει αυτό το Μήνυμα' using errcode = 'P0001';
  end if;
  if v_req.assignee_id is not distinct from p_user then
    return;
  end if;
  update public.message_requests r set assignee_id = p_user where r.message_id = p_message;
end;
$$;

-- Κλείσιμο: { outcome: 'done', link?, comment? } ή { outcome: 'rejected', reply }.
create function public.message_request_close(p_message uuid, p jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.message_requests := authz.request_for_handling(p_message);
  v_outcome text := p->>'outcome';
  v_link text := nullif(btrim(coalesce(p->>'link', '')), '');
  v_comment text;
  v_reply text;
begin
  if v_outcome = 'done' then
    v_comment := authz.request_clean_text(p->>'comment');
    if v_link is null and v_comment is null then
      raise exception 'Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο' using errcode = 'P0001';
    end if;
    if v_link is not null and (v_link !~ '^https://[^[:space:]]+$' or length(v_link) > 2000) then
      raise exception 'Επιτρέπονται μόνο σύνδεσμοι που ξεκινούν με https://' using errcode = 'P0001';
    end if;
    update public.message_requests r
       set state = 'done', closed_at = clock_timestamp(), closed_by = auth.uid(),
           close_link = v_link, close_comment = v_comment
     where r.message_id = v_req.message_id;
  elsif v_outcome = 'rejected' then
    v_reply := authz.request_clean_text(p->>'reply');
    if v_reply is null then
      raise exception 'Η απόρριψη θέλει απάντηση προς τον πελάτη' using errcode = 'P0001';
    end if;
    update public.message_requests r
       set state = 'rejected', closed_at = clock_timestamp(), closed_by = auth.uid(), close_reply = v_reply
     where r.message_id = v_req.message_id;
  else
    raise exception 'Το Αίτημα ολοκληρώνεται ή απορρίπτεται' using errcode = 'P0001';
  end if;
end;
$$;

-- Δημιουργία Παραδοτέου από το Αίτημα (Μ11): { productionId?, kindId, title, assigneeId?, filmingId?, charge?, chargeReason? }.
-- Το deliverable_create ελέγχει τα Δικαιώματα του χρήστη· αν αποτύχει, δεν αλλάζει τίποτα (ούτε το Αίτημα).
create function public.message_request_create_deliverable(p_message uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.message_requests := authz.request_for_handling(p_message);
  v_msg public.messages;
  v_production uuid;
  v_id uuid;
begin
  if v_req.kind <> 'deliverable' then
    raise exception 'Το Αίτημα δεν είναι για νέο Παραδοτέο' using errcode = 'P0001';
  end if;
  select * into v_msg from public.messages m where m.id = p_message;
  v_production := coalesce(nullif(p->>'productionId', '')::uuid, v_msg.production_id);
  if v_production is null then
    raise exception 'Διάλεξε Παραγωγή για το Παραδοτέο' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.productions pr where pr.id = v_production and pr.client_id = v_msg.client_id) then
    raise exception 'Η Παραγωγή δεν ανήκει στον Πελάτη του Αιτήματος' using errcode = 'P0001';
  end if;
  v_id := public.deliverable_create(
    v_production, nullif(p->>'kindId', '')::uuid, p->>'title', nullif(p->>'assigneeId', '')::uuid,
    nullif(p->>'filmingId', '')::uuid, nullif(p->>'charge', ''), nullif(p->>'chargeReason', ''));
  perform authz.request_close_automatic(p_message, 'deliverable', v_id);
  return jsonb_build_object('id', v_id);
end;
$$;

-- Κλείσιμο Γυρίσματος από το Αίτημα (Μ11): { agreementId, startsAt, hours, kindId?, location?, note?, fromBlocked? }.
create function public.message_request_create_filming(p_message uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.message_requests := authz.request_for_handling(p_message);
  v_msg public.messages;
  v_agreement uuid := nullif(p->>'agreementId', '')::uuid;
  v_id uuid;
begin
  if v_req.kind <> 'filming' then
    raise exception 'Το Αίτημα δεν είναι για Γύρισμα' using errcode = 'P0001';
  end if;
  select * into v_msg from public.messages m where m.id = p_message;
  if v_agreement is null or not exists (
       select 1 from public.agreements a join public.opportunities o on o.id = a.opportunity_id
        where a.id = v_agreement and o.client_id = v_msg.client_id) then
    raise exception 'Η Συμφωνία δεν ανήκει στον Πελάτη του Αιτήματος' using errcode = 'P0001';
  end if;
  v_id := public.filming_create(
    v_agreement, (p->>'startsAt')::timestamptz, (p->>'hours')::numeric, nullif(p->>'kindId', '')::uuid,
    p->>'location', p->>'note', nullif(p->>'fromBlocked', '')::uuid);
  perform authz.request_close_automatic(p_message, 'filming', v_id);
  return jsonb_build_object('id', v_id);
end;
$$;

-- ───────────── RPC: καρτέλα Αιτημάτων της ομάδας (J1) ─────────────

-- p_view: mine (δικά μου ανοιχτά), open (όλα τα ανοιχτά), unassigned (μόνο με clients.transfer), closed.
-- Μόνο Αιτήματα σε Μηνύματα που βλέπει ο χρήστης. Τα ανοιχτά Αιτήματα αλλαγής μετά την έγκριση μπαίνουν ως kind «change».
create function public.message_requests_view(p_view text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_transfer boolean := authz.has('clients.transfer');
  v_limit integer := authz.request_open_days();
  v_items jsonb;
  v_mine integer;
  v_unassigned integer;
begin
  perform authz.require_team_chat();
  if p_view = 'unassigned' and not v_transfer then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_view is null or p_view not in ('mine', 'open', 'unassigned', 'closed') then
    raise exception 'Άγνωστη όψη Αιτημάτων' using errcode = 'P0001';
  end if;

  with visible as (
    select r.*, m.client_id, m.body, c.name as client_name, p.title as production_title
      from public.message_requests r
      join public.messages m on m.id = r.message_id
      join public.clients c on c.id = m.client_id
      left join public.productions p on p.id = m.production_id
     where m.deleted_at is null and authz.message_visible(m)
  ),
  chosen as (
    select v.declared_at as sort_at, v.message_id as sort_id, jsonb_build_object(
             'messageId', v.message_id, 'deliverableId', null, 'clientId', v.client_id, 'clientName', v.client_name,
             'productionTitle', v.production_title, 'kind', v.kind, 'state', v.state,
             'assigneeName', (select t.name from public.team_users t where t.user_id = v.assignee_id),
             'daysOpen', case when v.state = 'open' then authz.request_days_open(v.declared_at) end,
             'stale', v.state = 'open' and authz.request_days_open(v.declared_at) >= v_limit,
             'text', left(v.body, 200), 'at', v.declared_at,
             'closed', case when v.state <> 'open' then jsonb_build_object(
                 'at', v.closed_at, 'byName', (select t.name from public.team_users t where t.user_id = v.closed_by),
                 'link', v.close_link, 'comment', v.close_comment, 'reply', v.close_reply,
                 'automatic', v.is_automatic, 'resultKind', v.result_kind, 'resultId', v.result_id) end
           ) as item, v.closed_at
      from visible v
     where case p_view
             when 'mine' then v.state = 'open' and v.assignee_id = v_me
             when 'open' then v.state = 'open'
             when 'unassigned' then v.state = 'open' and v.assignee_id is null
             else v.state <> 'open'
           end
    union all
    select q.created_at, q.id, jsonb_build_object(
             'messageId', null, 'deliverableId', d.id, 'clientId', pr.client_id, 'clientName', c.name,
             'productionTitle', pr.title, 'kind', 'change', 'state', 'open',
             'assigneeName', (select t.name from public.team_users t where t.user_id = pr.owner_id),
             'daysOpen', authz.request_days_open(q.created_at),
             'stale', authz.request_days_open(q.created_at) >= v_limit,
             'text', left(q.body, 200), 'at', q.created_at, 'closed', null),
           null
      from public.deliverable_requests q
      join public.deliverables d on d.id = q.deliverable_id
      join public.productions pr on pr.id = d.production_id
      join public.clients c on c.id = pr.client_id
     where p_view in ('mine', 'open') and q.decision is null
       and (authz.message_sees_all(pr.client_id) or authz.production_involved(pr.id))
       and (p_view = 'open' or pr.owner_id = v_me)
  )
  select coalesce(jsonb_agg(s.item order by
           case when p_view = 'closed' then s.closed_at end desc nulls last,
           case when p_view <> 'closed' then s.sort_at end asc nulls last, s.sort_id), '[]'::jsonb)
    into v_items
    from (select * from chosen order by
            case when p_view = 'closed' then closed_at end desc nulls last,
            case when p_view <> 'closed' then sort_at end asc nulls last, sort_id
          limit 200) s;

  select count(*) into v_mine
    from public.message_requests r join public.messages m on m.id = r.message_id
   where r.state = 'open' and r.assignee_id = v_me and m.deleted_at is null and authz.message_visible(m);
  v_mine := v_mine + (
    select count(*) from public.deliverable_requests q
      join public.deliverables d on d.id = q.deliverable_id
      join public.productions pr on pr.id = d.production_id
     where q.decision is null and pr.owner_id = v_me and pr.client_id is not null
       and (authz.message_sees_all(pr.client_id) or authz.production_involved(pr.id)));
  select case when v_transfer then count(*) else 0 end into v_unassigned
    from public.message_requests r join public.messages m on m.id = r.message_id
   where r.state = 'open' and r.assignee_id is null and m.deleted_at is null and authz.message_visible(m);

  return jsonb_build_object(
    'items', v_items,
    'counts', jsonb_build_object('mine', v_mine, 'unassigned', v_unassigned),
    'solo', (select count(*) from public.team_users t where t.is_active) <= 1);
end;
$$;

-- ───────────── RPC: καρτέλα Αιτημάτων του πελάτη (J3) ─────────────

-- Τα Αιτήματα του Πελάτη του Χρήστη πελάτη και οι αλλαγές μετά την έγκριση των Παραδοτέων του. Ανοιχτά πρώτα, μετά νεότερα.
-- Χωρίς υπεύθυνο, μέρες ή σήμα προσοχής.
create function public.client_requests_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
  v_items jsonb;
begin
  if v_client is null or not authz.client_user_has('c.chatRead') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  with rows as (
    select r.message_id as id, r.state = 'open' as is_open, r.declared_at as declared, jsonb_build_object(
             'messageId', r.message_id, 'deliverableId', null, 'deliverableTitle', null, 'kind', r.kind, 'state', r.state,
             'at', r.declared_at, 'text', m.body, 'link', r.close_link, 'comment', r.close_comment, 'reply', r.close_reply,
             'automatic', r.is_automatic, 'resultKind', r.result_kind, 'resultId', r.result_id, 'decision', null) as item
      from public.message_requests r
      join public.messages m on m.id = r.message_id
     where m.client_id = v_client and m.deleted_at is null and authz.message_visible(m)
    union all
    select q.id, q.decision is null, q.created_at, jsonb_build_object(
             'messageId', null, 'deliverableId', d.id, 'deliverableTitle', d.title, 'kind', 'change',
             'state', case when q.decision is null then 'open' else 'done' end,
             'at', q.created_at, 'text', q.body, 'link', null, 'comment', null, 'reply', null,
             'automatic', false, 'resultKind', null, 'resultId', null,
             'decision', authz.change_decision_visible(q.decision, false))
      from public.deliverable_requests q
      join public.deliverables d on d.id = q.deliverable_id
      join public.productions pr on pr.id = d.production_id
     where pr.client_id = v_client
  )
  select coalesce(jsonb_agg(x.item order by x.is_open desc, x.declared desc, x.id), '[]'::jsonb) into v_items
    from (select * from rows order by is_open desc, declared desc, id limit 200) x;
  return jsonb_build_object(
    'items', v_items,
    'openCount', (select count(*) from jsonb_array_elements(v_items) i where i->>'state' = 'open'));
end;
$$;


-- ───────────── Συνομιλία: με Αιτήματα ─────────────
-- Ξαναγραμμένη από τον τελικό ορισμό του 20261014120000_message_attachments.sql. Κάθε Μήνυμα έχει request (ή null), το canDelete
-- είναι false για Αίτημα, και το changeRequests φέρνει τις αλλαγές μετά την έγκριση (Μ12).

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
    -- Όσοι μπορούν να αναλάβουν Αίτημα (και ο ίδιος ο χρήστης): μόνο για όσους μεταβιβάζουν.
    'assignable', case when v_team and authz.has('clients.transfer') then coalesce((
        select jsonb_agg(jsonb_build_object('id', t.user_id, 'name', t.name) order by t.name, t.user_id)
          from public.team_users t where authz.message_sees_all_of(t.user_id, p_client)
      ), '[]'::jsonb) end,
    'readAt', v_read_at,
    'editMinutes', authz.message_edit_minutes(),
    'changeRequests', authz.thread_change_requests(p_client, v_team),
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
              'canDelete', m.author_id = v_me and m.deleted_at is null and r.message_id is null,
              'request', case when r.message_id is not null then authz.message_request_json(r, v_team) end,
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
          left join public.message_requests r on r.message_id = m.id
         where m.client_id = p_client and authz.message_visible(m)
         order by m.created_at desc, m.id desc
         limit 300
        ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ───────────── Αποστολή: με Αίτημα ─────────────
-- Ξαναγραμμένη από τον τελικό ορισμό του 20261014120000_message_attachments.sql. Νέο πεδίο request?: { kind } (μόνο πελάτης).

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
  v_req_kind text;
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

  if p->'attachments' is not null and jsonb_typeof(p->'attachments') not in ('array', 'null') then
    raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
  end if;
  v_paths := coalesce((select array_agg(distinct x) from jsonb_array_elements_text(coalesce(nullif(p->'attachments', 'null'::jsonb), '[]'::jsonb)) x), '{}');
  if cardinality(v_paths) > 5 then
    raise exception 'Έως 5 αρχεία ανά Μήνυμα' using errcode = 'P0001';
  end if;

  -- Αίτημα (Μ9): μόνο ο πελάτης το δηλώνει τη στιγμή που γράφει· η ομάδα σημειώνει Μήνυμα που υπάρχει ήδη.
  if p->'request' is not null and jsonb_typeof(p->'request') not in ('object', 'null') then
    raise exception 'Το είδος του Αιτήματος δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p->'request') = 'object' then
    if v_team then
      raise exception 'Η ομάδα σημειώνει ως Αίτημα ένα Μήνυμα του πελάτη, δεν δηλώνει κατά την αποστολή' using errcode = 'P0001';
    end if;
    v_req_kind := p->'request'->>'kind';
    if v_req_kind is null or v_req_kind not in ('deliverable', 'filming', 'other') then
      raise exception 'Το είδος είναι νέο Παραδοτέο, Γύρισμα ή άλλο' using errcode = 'P0001';
    end if;
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
                 or (o.metadata->>'size')::bigint <= 10485760)
            -- Ο τύπος που δηλώθηκε στο ανέβασμα πρέπει να είναι αυτός της θέσης.
            and (o.metadata->>'mimetype' is null or o.metadata->>'mimetype' = v_slot.mime)) then
      raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.messages (client_id, production_id, author_id, author_kind, body, is_internal, mentions)
  values (v_client, v_production, auth.uid(), case when v_team then 'team' else 'client' end, v_body, v_internal, v_mentions)
  returning id into v_id;

  if v_req_kind is not null then
    insert into public.message_requests (message_id, kind, assignee_id, declared_by, declared_user)
    values (v_id, v_req_kind, authz.request_assignee(v_id), 'client', auth.uid());
  end if;

  -- Το μέγεθος από το Storage όταν υπάρχει (όχι αυτό που δήλωσε ο browser).
  insert into public.message_attachments (message_id, path, name, mime, size)
  select v_id, s.path, s.name, s.mime,
         coalesce(case when (o.metadata->>'size') ~ '^[0-9]{1,9}$' then (o.metadata->>'size')::integer end, s.size)
    from public.message_attachment_slots s
    left join storage.objects o on o.bucket_id = 'message-attachments' and o.name = s.path
   where s.path = any (v_paths) order by s.created_at, s.path;
  delete from public.message_attachment_slots s where s.path = any (v_paths);
  return jsonb_build_object('id', v_id);
end;
$$;

-- ───────────── Διαγραφή: όχι Αίτημα ─────────────
-- Ξαναγραμμένη από τον τελικό ορισμό του 20261014120000_message_attachments.sql (ίδιος τύπος επιστροφής, άρα create or replace).

create or replace function public.message_delete(p_id uuid) returns jsonb
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
  if exists (select 1 from public.message_requests q where q.message_id = p_id) then
    raise exception 'Το Μήνυμα έγινε Αίτημα και δεν διαγράφεται' using errcode = 'P0001';
  end if;
  update public.messages set deleted_at = clock_timestamp(), deleted_by = auth.uid() where id = p_id;
  with gone as (delete from public.message_attachments a where a.message_id = p_id returning a.path)
  select coalesce(jsonb_agg(g.path order by g.path), '[]'::jsonb) into v_paths from gone g;
  return jsonb_build_object('removedPaths', v_paths);
end;
$$;

-- ───────────── Ίχνος: ολόκληρη η λίστα ─────────────
-- Ξαναγραμμένη από τον ορισμό του 20261014100000_messages.sql, με τον πίνακα message_requests.

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
    -- Αιτήματα Μηνυμάτων (#163): το κλείσιμο έχει κείμενο προς τον πελάτη, άρα όπως τα Μηνύματα
    when 'message_requests' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Μηνύματα (#160): περιέχουν κείμενο Συνομιλίας, άρα μόνο όσοι βλέπουν όλες τις Συνομιλίες
    when 'messages' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.message_visible_to(uuid, uuid), authz.message_sees_all_of(uuid, uuid),
  authz.request_assignee(uuid), authz.request_days_open(timestamptz), authz.request_open_days(),
  authz.message_request_json(public.message_requests, boolean), authz.change_decision_visible(text, boolean),
  authz.thread_change_requests(uuid, boolean), authz.request_for_handling(uuid), authz.request_clean_text(text),
  authz.request_close_automatic(uuid, text, uuid), authz.requests_unassign_inactive()
  from public, anon, authenticated;

revoke all on function
  public.message_mark_request(uuid, text), public.message_request_assign(uuid, uuid),
  public.message_request_close(uuid, jsonb), public.message_request_create_deliverable(uuid, jsonb),
  public.message_request_create_filming(uuid, jsonb), public.message_requests_view(text), public.client_requests_view()
  from public, anon;

grant execute on function
  public.message_mark_request(uuid, text), public.message_request_assign(uuid, uuid),
  public.message_request_close(uuid, jsonb), public.message_request_create_deliverable(uuid, jsonb),
  public.message_request_create_filming(uuid, jsonb), public.message_requests_view(text), public.client_requests_view()
  to authenticated;

-- Ο πίνακας είναι κλειστός: διαβάζεται και γράφεται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.message_requests from anon, authenticated;
