-- Ομάδα Νβ (#208, PRD #206, δέσμη Ν6–Ν8): Αιτήματα GDPR, εξαγωγή και ανωνυμοποίηση. Μόνο ο Ιδιοκτήτης.
--
--  • Ν6 Μητρώο (public.gdpr_requests): είδος (εξαγωγή / ανωνυμοποίηση), υποκείμενο (Χρήστης ομάδας, Χρήστης πελάτη,
--    Επαφή ή Πελάτης), λήψη, προθεσμία = λήψη + 1 μήνας (στήλη της βάσης), ολοκλήρωση, σημείωση. Το μητρώο δεν κρατά όνομα
--    ή email: το όνομα του υποκειμένου βγαίνει κάθε φορά από την πηγή του, οπότε μετά την ανωνυμοποίηση γράφει το νέο.
--    Η λήψη και το «σήμερα» είναι ημερομηνίες Αθήνας (public.sales_today()· τα τεστ δίνουν p_today / p_now).
--    RLS μόνο για τον Ιδιοκτήτη· όλες οι εγγραφές γίνονται από RPC. Κάρτα «GDPR με προθεσμία» στο Σήμερα: μόνο για
--    τον Ιδιοκτήτη, και μόνο όταν υπάρχει ανοιχτό αίτημα (με μηδέν δεν εμφανίζεται καθόλου, ούτε στη «Τίποτα σε αναμονή»).
--  • Ν7 Εξαγωγή (public.gdpr_export): ενότητες για πρόσωπο ή για ολόκληρο Πελάτη. Η Συνομιλία δεν έχει ποτέ Εσωτερικά
--    Μηνύματα (not is_internal μέσα στο query)· τα Παραδοτέα μόνο με τις Εκδόσεις που στάλθηκαν στον πελάτη. Γράφει στο
--    Ίχνος (entity 'gdpr', μόνο πλήθη ανά ενότητα) ΠΡΙΝ επιστρέψει, στην ίδια συναλλαγή. Τα PDF των Τιμολογίων φεύγουν ως
--    διαδρομές· τα signed URLs τα φτιάχνει ο server μόνο για αυτές. Το ZIP φτιάχνεται στον browser.
--  • Ν8 Ανωνυμοποίηση (public.gdpr_anonymize): μη αναστρέψιμη, με το όνομα πληκτρολογημένο και ελεγμένο εδώ. Μόνο σε
--    απενεργοποιημένο Χρήστη ομάδας, Χρήστη πελάτη χωρίς κανέναν Πελάτη, ή Επαφή (όχι αν είναι και ενεργός Χρήστης
--    πελάτη). Οι λόγοι «δεν γίνεται» ορίζονται μία φορά (authz.gdpr_block) για την οθόνη και για τη συνάρτηση.
--    Όνομα → «Ανωνυμοποιημένος Χρήστης N» (N από sequence), email → anonymized-N@anonymized.invalid (μη δρομολογήσιμο).
--    Σβήνουν: τηλέφωνο, προτιμήσεις, Σύνδεσμος ημερολογίου, Συζητήσεις με τον Βοηθό, Ειδοποιήσεις. Η διεύθυνση κρύβεται
--    στο Ιστορικό αποστολών, στις ουρές email και στις προσκλήσεις (οι εκκρεμείς ακυρώνονται). Ο λογαριασμός εισόδου
--    παίρνει το placeholder email, χάνει κωδικό, ταυτότητες και συνεδρίες, και μόνιμο ban· δεν διαγράφεται.
--    Μένουν: Μηνύματα, Ίχνος, Συμφωνίες (παραλήπτες, υπογραφές) και Τιμολόγια όπως ήταν. Φωτογραφία προφίλ δεν υπάρχει
--    ακόμα στο σχήμα, άρα δεν έχει τι να σβήσει.
--    Το Ίχνος: οι αλλαγές της ανωνυμοποίησης δεν γράφονται γραμμή-γραμμή (θα κρατούσαν τα σβησμένα στοιχεία στο «πριν»).
--    Η authz.audit_row τις παραλείπει όσο ισχύει το gdpr.anonymizing της συναλλαγής (ίδιο σχήμα με το sales.merging), και
--    γράφεται μία γραμμή 'gdpr' χωρίς τα σβησμένα. Ο Χρήστης που ανωνυμοποιήθηκε δεν επανενεργοποιείται.

-- ───────────── Πίνακες ─────────────

create sequence public.gdpr_anonymized_seq as integer start 1;

create table public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('export', 'anonymize')),
  subject_kind text not null check (subject_kind in ('team_user', 'client_user', 'contact', 'client')),
  subject_user_id uuid references auth.users (id),
  subject_client_id uuid references public.clients (id),
  received_on date not null,
  -- Λήψη + 1 μήνας (31/1 → 28/2 ή 29/2). Η μέρα είναι ήδη ημερομηνία Αθήνας.
  deadline date generated always as ((received_on + interval '1 month')::date) stored,
  completed_on date,
  note text not null default '' check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  created_by uuid,
  check ((subject_kind in ('team_user', 'client_user')) = (subject_user_id is not null)),
  check ((subject_kind in ('contact', 'client')) = (subject_client_id is not null)),
  check (kind <> 'anonymize' or subject_kind <> 'client'),
  check (completed_on is null or completed_on >= received_on)
);

create index gdpr_requests_open_idx on public.gdpr_requests (deadline) where completed_on is null;

-- Ποιος ανωνυμοποιήθηκε (χωρίς κανένα στοιχείο του): για τον αριθμό N, το «δεν γίνεται ξανά» και την άρνηση επανενεργοποίησης.
create table public.gdpr_anonymizations (
  n integer primary key,
  subject_kind text not null check (subject_kind in ('team_user', 'client_user', 'contact')),
  user_id uuid unique references auth.users (id),
  client_id uuid references public.clients (id),
  anonymized_at timestamptz not null default now(),
  anonymized_by uuid,
  check ((subject_kind = 'contact') = (client_id is not null)),
  check ((subject_kind = 'contact') = (user_id is null))
);

alter table public.gdpr_requests enable row level security;
alter table public.gdpr_anonymizations enable row level security;

revoke all on table public.gdpr_requests, public.gdpr_anonymizations from anon, authenticated;
revoke all on sequence public.gdpr_anonymized_seq from anon, authenticated;
grant select on table public.gdpr_requests to authenticated;

create policy "Τα αιτήματα GDPR τα βλέπει μόνο ο Ιδιοκτήτης"
  on public.gdpr_requests for select to authenticated using (authz.is_owner());

create trigger gdpr_requests_audit after insert or update on public.gdpr_requests
  for each row execute function authz.audit_row('id');

-- ───────────── Ίχνος: η ανωνυμοποίηση δεν γράφει τα σβησμένα ─────────────
-- Ίδιο με τον αρχικό ορισμό (20261007165851_audit_log.sql), με μία προσθήκη: όσο η authz.gdpr_anonymize έχει ανάψει το
-- gdpr.anonymizing της συναλλαγής, οι γραμμές της δεν γράφονται (η ίδια γράφει μία γραμμή χωρίς τα σβησμένα).

create or replace function authz.audit_row() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  key_column text := coalesce(tg_argv[0], 'id');
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if coalesce(current_setting('gdpr.anonymizing', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new_row, old_row) ->> key_column,
    old_row,
    new_row
  );
  return coalesce(new, old);
end;
$$;

-- ───────────── Πρόσβαση και υποκείμενα ─────────────

create function authz.gdpr_require() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(authz.is_owner(), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

create function authz.gdpr_is_placeholder(p_email text) returns boolean
language sql immutable set search_path = ''
as $$ select coalesce(lower(p_email) like '%@anonymized.invalid', false); $$;

-- Χρήστης πελάτη = έχει συμμετοχή σε Πελάτη (και τις αφαιρεμένες) και δεν είναι Χρήστης ομάδας.
create function authz.gdpr_is_client_user(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.client_users cu where cu.user_id = p_user)
     and not exists (select 1 from public.team_users t where t.user_id = p_user);
$$;

-- Το όνομα του υποκειμένου τώρα, ή null αν δεν υπάρχει. Χρήστης πελάτη: το όνομα της πιο πρόσφατης συμμετοχής.
create function authz.gdpr_label(p_kind text, p_id uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'team_user' then (select t.name from public.team_users t where t.user_id = p_id)
    when 'client_user' then (select cu.name from public.client_users cu
                              where cu.user_id = p_id and authz.gdpr_is_client_user(p_id)
                              order by cu.joined_at desc, cu.client_id limit 1)
    when 'contact' then (select c.contact_name from public.clients c where c.id = p_id)
    when 'client' then (select c.name from public.clients c where c.id = p_id)
  end;
$$;

-- Τα email του προσώπου (πεζά, χωρίς κενά): του Χρήστη ομάδας, του λογαριασμού εισόδου, ή της Επαφής.
create function authz.gdpr_emails(p_kind text, p_id uuid) returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct x.email) filter (where x.email <> ''), '{}')
    from (
      select lower(btrim(t.email)) as email from public.team_users t where p_kind = 'team_user' and t.user_id = p_id
      union all
      select lower(btrim(u.email)) from auth.users u where p_kind in ('team_user', 'client_user') and u.id = p_id
      union all
      select lower(btrim(c.contact_email)) from public.clients c where p_kind = 'contact' and c.id = p_id
    ) x;
$$;

-- Γιατί δεν γίνεται η ανωνυμοποίηση, ή null. Ο ένας ορισμός για την οθόνη (gdpr_subjects) και για την gdpr_anonymize.
create function authz.gdpr_block(p_kind text, p_id uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  c public.clients;
begin
  if p_kind = 'team_user' then
    if not exists (select 1 from public.team_users t where t.user_id = p_id) then
      return 'not_found';
    elsif exists (select 1 from public.gdpr_anonymizations a where a.user_id = p_id) then
      return 'anonymized';
    elsif exists (select 1 from public.team_users t where t.user_id = p_id and t.is_active) then
      return 'active';
    end if;
    return null;
  elsif p_kind = 'client_user' then
    if not coalesce(authz.gdpr_is_client_user(p_id), false) then
      return 'not_found';
    elsif exists (select 1 from public.gdpr_anonymizations a where a.user_id = p_id) then
      return 'anonymized';
    elsif exists (select 1 from public.client_users cu where cu.user_id = p_id and cu.removed_at is null) then
      return 'member';
    end if;
    return null;
  elsif p_kind = 'contact' then
    select * into c from public.clients x where x.id = p_id;
    if not found then
      return 'not_found';
    elsif c.archived_at is not null then
      return 'archived';
    elsif authz.gdpr_is_placeholder(c.contact_email) then
      return 'anonymized';
    elsif exists (select 1 from public.client_users cu join auth.users u on u.id = cu.user_id
                   where cu.removed_at is null and lower(btrim(u.email)) = lower(btrim(c.contact_email))) then
      return 'contact_is_user';
    end if;
    return null;
  end if;
  return 'kind';
end;
$$;

create function authz.gdpr_block_text(p_block text) returns text
language sql immutable set search_path = ''
as $$
  select case p_block
    when 'not_found' then 'Το πρόσωπο δεν βρέθηκε'
    when 'anonymized' then 'Έχει ήδη ανωνυμοποιηθεί'
    when 'active' then 'Ανωνυμοποιείται μόνο απενεργοποιημένος Χρήστης ομάδας. Πρώτα Απενεργοποίηση.'
    when 'member' then 'Ο Χρήστης πελάτη ανήκει ακόμη σε Πελάτη. Πρώτα αφαίρεση από κάθε Πελάτη.'
    when 'contact_is_user' then 'Η Επαφή είναι και ενεργός Χρήστης πελάτη. Πρώτα αφαίρεση από τον Πελάτη.'
    when 'archived' then 'Ο Πελάτης έχει συγχωνευθεί· η Επαφή του ζει στον Πελάτη που κράτησες.'
    else 'Ανωνυμοποιείται μόνο Χρήστης ομάδας, Χρήστης πελάτη ή Επαφή· ο Πελάτης ως επιχείρηση όχι.'
  end;
$$;

-- ───────────── Ν6 Μητρώο ─────────────

create function authz.gdpr_days_text(p_days integer) returns text
language sql immutable set search_path = ''
as $$
  select case when p_days < 0 then 'έληξε' when p_days = 0 then 'λήγει σήμερα' when p_days = 1 then 'λήγει αύριο'
              else 'λήγει σε ' || p_days || ' μέρες' end;
$$;

create function authz.gdpr_kind_text(p_kind text) returns text
language sql immutable set search_path = ''
as $$ select case p_kind when 'export' then 'Εξαγωγή' else 'Ανωνυμοποίηση' end; $$;

-- { today, requests: [{ id, kind, subjectKind, subjectId, subjectLabel, receivedOn, deadline, completedOn, note, daysLeft }] }
-- Ανοιχτά πρώτα (κατά προθεσμία), μετά τα ολοκληρωμένα (νεότερα πρώτα). daysLeft = προθεσμία − σήμερα (Αθήνα).
create function authz.gdpr_requests_view(p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.gdpr_require();
  return jsonb_build_object('today', p_today, 'requests', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'kind', r.kind, 'subjectKind', r.subject_kind,
             'subjectId', coalesce(r.subject_user_id, r.subject_client_id),
             'subjectLabel', coalesce(authz.gdpr_label(r.subject_kind, coalesce(r.subject_user_id, r.subject_client_id)), '—'),
             'receivedOn', r.received_on, 'deadline', r.deadline, 'completedOn', r.completed_on,
             'note', r.note, 'daysLeft', r.deadline - p_today)
           order by r.completed_on is not null, case when r.completed_on is null then r.deadline end,
                    r.completed_on desc, r.received_on desc, r.id)
      from public.gdpr_requests r), '[]'::jsonb));
end;
$$;

create function authz.gdpr_request_create(
  p_kind text, p_subject_kind text, p_subject_id uuid, p_received_on date, p_note text, p_today date
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_received date := coalesce(p_received_on, p_today);
  v_id uuid;
begin
  perform authz.gdpr_require();
  if p_kind is null or p_kind not in ('export', 'anonymize') then
    raise exception 'Διάλεξε είδος αιτήματος: εξαγωγή ή ανωνυμοποίηση' using errcode = 'P0001';
  end if;
  if p_subject_kind is null or p_subject_kind not in ('team_user', 'client_user', 'contact', 'client') then
    raise exception 'Διάλεξε ποιον αφορά το αίτημα' using errcode = 'P0001';
  end if;
  if p_kind = 'anonymize' and p_subject_kind = 'client' then
    raise exception 'Ο Πελάτης ως επιχείρηση δεν ανωνυμοποιείται· διάλεξε την Επαφή ή έναν Χρήστη πελάτη' using errcode = 'P0001';
  end if;
  if authz.gdpr_label(p_subject_kind, p_subject_id) is null then
    raise exception 'Το πρόσωπο ή ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_received > p_today then
    raise exception 'Η ημερομηνία λήψης δεν μπορεί να είναι μετά από σήμερα' using errcode = 'P0001';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Η σημείωση είναι έως 1000 χαρακτήρες' using errcode = 'P0001';
  end if;
  insert into public.gdpr_requests (kind, subject_kind, subject_user_id, subject_client_id, received_on, note, created_by)
  values (p_kind, p_subject_kind,
          case when p_subject_kind in ('team_user', 'client_user') then p_subject_id end,
          case when p_subject_kind in ('contact', 'client') then p_subject_id end,
          v_received, btrim(coalesce(p_note, '')), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function authz.gdpr_request_complete(p_id uuid, p_completed_on date, p_note text, p_today date) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r public.gdpr_requests;
  v_done date := coalesce(p_completed_on, p_today);
begin
  perform authz.gdpr_require();
  select * into r from public.gdpr_requests x where x.id = p_id for update;
  if not found then
    raise exception 'Το αίτημα δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if r.completed_on is not null then
    raise exception 'Το αίτημα έχει ήδη ολοκληρωθεί' using errcode = 'P0001';
  end if;
  if v_done < r.received_on or v_done > p_today then
    raise exception 'Η ολοκλήρωση είναι από τη λήψη ως σήμερα' using errcode = 'P0001';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Η σημείωση είναι έως 1000 χαρακτήρες' using errcode = 'P0001';
  end if;
  update public.gdpr_requests
     set completed_on = v_done, note = case when p_note is null then note else btrim(p_note) end
   where id = p_id;
end;
$$;

-- Τα υποκείμενα για τη φόρμα του μητρώου και τις οθόνες: όνομα και λόγος «δεν γίνεται» της ανωνυμοποίησης.
-- { teamUsers: [{ id, name, isActive, block }], clientUsers: [{ id, name, clientIds, block }],
--   clients: [{ id, name, contactName, contactBlock }] }
create function authz.gdpr_subjects() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.gdpr_require();
  return jsonb_build_object(
    'teamUsers', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.user_id, 'name', t.name, 'isActive', t.is_active,
                                          'block', authz.gdpr_block('team_user', t.user_id))
                       order by t.is_active desc, t.name, t.user_id)
        from public.team_users t), '[]'::jsonb),
    'clientUsers', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.user_id, 'name', authz.gdpr_label('client_user', p.user_id),
                                          'clientIds', p.client_ids, 'block', authz.gdpr_block('client_user', p.user_id))
                       order by authz.gdpr_label('client_user', p.user_id), p.user_id)
        from (select cu.user_id,
                     coalesce(jsonb_agg(cu.client_id order by cu.client_id) filter (where cu.removed_at is null), '[]'::jsonb)
                       as client_ids
                from public.client_users cu
               where not exists (select 1 from public.team_users t where t.user_id = cu.user_id)
               group by cu.user_id) p), '[]'::jsonb),
    'clients', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'contactName', c.contact_name,
                                          'contactBlock', authz.gdpr_block('contact', c.id))
                       order by lower(c.name), c.id)
        from public.clients c where c.archived_at is null), '[]'::jsonb));
end;
$$;

-- ───────────── Ν7 Εξαγωγή ─────────────

-- Η Συνομιλία ενός Πελάτη ή ενός προσώπου, ΧΩΡΙΣ Εσωτερικά Μηνύματα και χωρίς διαγραμμένα.
create function authz.gdpr_messages(p_client uuid, p_author uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', m.created_at, 'client', c.name,
           'author', coalesce((select t.name from public.team_users t where t.user_id = m.author_id),
                              (select cu.name from public.client_users cu where cu.user_id = m.author_id
                                order by (cu.client_id = m.client_id) desc, cu.joined_at desc limit 1)),
           'authorKind', case m.author_kind when 'team' then 'Ομάδα' else 'Πελάτης' end,
           'production', p.title, 'body', m.body, 'editedAt', m.edited_at
         ) order by m.created_at, m.id), '[]'::jsonb)
    from public.messages m
    join public.clients c on c.id = m.client_id
    left join public.productions p on p.id = m.production_id
   where not m.is_internal and m.deleted_at is null
     and (p_client is null or m.client_id = p_client)
     and (p_author is null or m.author_id = p_author)
     and (p_client is not null or p_author is not null);
$$;

-- Οι θέσεις του email σε Συμφωνίες (παραλήπτης ή Υπογράφων), με την υπογραφή όπου υπάρχει.
create function authz.gdpr_agreement_roles(p_emails text[]) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'agreement', a.title, 'client', c.name, 'name', r.name, 'email', r.email,
           'isSignatory', r.is_signatory, 'signedName', s.signed_name, 'signedOn', s.signed_on
         ) order by a.created_at, r.position, r.id), '[]'::jsonb)
    from public.agreement_recipients r
    join public.agreements a on a.id = r.agreement_id
    join public.opportunities o on o.id = a.opportunity_id
    join public.clients c on c.id = o.client_id
    left join public.agreement_signatures s on s.agreement_id = a.id
   where lower(btrim(r.email)) = any (p_emails);
$$;

-- Οι Συζητήσεις ενός Χρήστη με τον Βοηθό, μία γραμμή ανά μήνυμα.
create function authz.gdpr_assistant(p_user uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'conversation', cv.id, 'startedAt', cv.started_at, 'at', am.created_at,
           'role', case am.role when 'user' then 'Ερώτηση' else 'Απάντηση' end, 'content', am.content
         ) order by cv.started_at, cv.id, am.created_at, am.id), '[]'::jsonb)
    from public.assistant_conversations cv
    join public.assistant_messages am on am.conversation_id = cv.id
   where cv.user_id = p_user;
$$;

create function authz.gdpr_client_sections(p_client uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'details', (select jsonb_build_object('name', c.name, 'legalName', nullif(c.legal_name, ''), 'city', nullif(c.city, ''),
                                          'afm', c.afm, 'contactName', c.contact_name, 'contactEmail', c.contact_email,
                                          'contactPhone', nullif(c.contact_phone, ''), 'createdAt', c.created_at)
                  from public.clients c where c.id = p_client),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object('name', cu.name, 'email', u.email, 'role', r.name,
                                          'joinedAt', cu.joined_at, 'removedAt', cu.removed_at)
                       order by cu.joined_at, cu.user_id)
        from public.client_users cu
        join auth.users u on u.id = cu.user_id
        join public.roles r on r.id = cu.role_id
       where cu.client_id = p_client), '[]'::jsonb),
    'agreements', coalesce((
      select jsonb_agg(jsonb_build_object('title', a.title, 'kind', case a.kind when 'monthly' then 'Μηνιαία' else 'Εφάπαξ' end,
                                          'state', a.state, 'validUntil', a.valid_until, 'startOn', a.start_on,
                                          'endOn', a.end_on, 'signedAt', a.signed_at, 'signedName', s.signed_name,
                                          'signedOn', s.signed_on)
                       order by a.created_at, a.id)
        from public.agreements a
        join public.opportunities o on o.id = a.opportunity_id
        left join public.agreement_signatures s on s.agreement_id = a.id
       where o.client_id = p_client), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'number', i.number,
                                          'kind', case i.kind when 'invoice' then 'Τιμολόγιο' when 'receipt' then 'Απόδειξη'
                                                              else 'Πιστωτικό' end,
                                          'issueDate', i.issue_date, 'dueDate', i.due_date, 'net', i.net, 'vat', i.vat,
                                          'total', i.total, 'mark', i.mark, 'voidedAt', i.voided_at, 'pdfPath', i.pdf_path)
                       order by i.issue_date, i.created_at, i.id)
        from public.invoices i where i.client_id = p_client), '[]'::jsonb),
    'receipts', coalesce((
      select jsonb_agg(jsonb_build_object('receivedOn', r.received_on, 'amount', r.amount, 'method', m.label,
                                          'note', nullif(r.note, ''))
                       order by r.received_on, r.created_at, r.id)
        from public.receipts r join public.payment_methods m on m.id = r.method_id
       where r.client_id = p_client and r.deleted_at is null), '[]'::jsonb),
    'filmings', coalesce((
      select jsonb_agg(jsonb_build_object('production', p.title, 'startsAt', f.starts_at, 'hours', f.hours,
                                          'location', f.location, 'state', f.state, 'clientNote', f.client_note)
                       order by f.starts_at, f.id)
        from public.filmings f join public.productions p on p.id = f.production_id
       where f.client_id = p_client), '[]'::jsonb),
    'deliverables', coalesce((
      select jsonb_agg(jsonb_build_object('production', p.title, 'title', d.title, 'deadline', d.deadline,
                                          'approvedAt', d.approved_at, 'version', v.number, 'link', v.url,
                                          'sentAt', v.sent_at, 'answeredAt', v.answered_at)
                       order by p.created_at, d.created_at, d.id, v.number)
        from public.deliverables d
        join public.productions p on p.id = d.production_id
        left join public.deliverable_versions v on v.deliverable_id = d.id and v.sent_at is not null
       where p.client_id = p_client and d.cancelled_at is null), '[]'::jsonb),
    'messages', authz.gdpr_messages(p_client, null));
$$;

create function authz.gdpr_person_sections(p_kind text, p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case p_kind
    when 'team_user' then (
      select jsonb_build_object(
        'details', jsonb_build_object('name', t.name, 'email', t.email, 'kind', 'Χρήστης ομάδας', 'language', t.language,
                                      'isActive', t.is_active, 'createdAt', t.created_at, 'deactivatedAt', t.deactivated_at),
        'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r.name) order by r.name)
                             from public.team_user_roles ur join public.roles r on r.id = ur.role_id
                            where ur.user_id = t.user_id), '[]'::jsonb),
        'messages', authz.gdpr_messages(null, t.user_id),
        'assistant', authz.gdpr_assistant(t.user_id),
        'agreementRoles', authz.gdpr_agreement_roles(authz.gdpr_emails('team_user', t.user_id)))
        from public.team_users t where t.user_id = p_id)
    when 'client_user' then (
      select jsonb_build_object(
        'details', jsonb_build_object('name', authz.gdpr_label('client_user', u.id), 'email', u.email,
                                      'kind', 'Χρήστης πελάτη',
                                      'language', (select s.language from public.client_user_settings s where s.user_id = u.id),
                                      'createdAt', u.created_at),
        'memberships', coalesce((select jsonb_agg(jsonb_build_object('client', c.name, 'name', cu.name, 'role', r.name,
                                                                     'joinedAt', cu.joined_at, 'removedAt', cu.removed_at)
                                                  order by cu.joined_at, cu.client_id)
                                   from public.client_users cu
                                   join public.clients c on c.id = cu.client_id
                                   join public.roles r on r.id = cu.role_id
                                  where cu.user_id = u.id), '[]'::jsonb),
        'messages', authz.gdpr_messages(null, u.id),
        'assistant', authz.gdpr_assistant(u.id),
        'agreementRoles', authz.gdpr_agreement_roles(authz.gdpr_emails('client_user', u.id)))
        from auth.users u where u.id = p_id and authz.gdpr_is_client_user(p_id))
    when 'contact' then (
      select jsonb_build_object(
        'details', jsonb_build_object('client', c.name, 'name', c.contact_name, 'email', c.contact_email,
                                      'phone', nullif(c.contact_phone, ''), 'kind', 'Επαφή Πελάτη'),
        'agreementRoles', authz.gdpr_agreement_roles(authz.gdpr_emails('contact', c.id)))
        from public.clients c where c.id = p_id)
  end;
$$;

-- { subject: { kind, id, label }, sections: { details: {…}, <ενότητα>: [ … ] } }
-- Ίχνος ΠΡΙΝ από την επιστροφή, με μόνο το πλήθος ανά ενότητα.
create function authz.gdpr_export(p_kind text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text;
  v_sections jsonb;
begin
  perform authz.gdpr_require();
  if p_kind is null or p_kind not in ('team_user', 'client_user', 'contact', 'client') then
    raise exception 'Διάλεξε τι εξάγεται: πρόσωπο ή Πελάτης' using errcode = 'P0001';
  end if;
  v_label := authz.gdpr_label(p_kind, p_id);
  if v_label is null then
    raise exception 'Το πρόσωπο ή ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  v_sections := case when p_kind = 'client' then authz.gdpr_client_sections(p_id) else authz.gdpr_person_sections(p_kind, p_id) end;
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'gdpr', p_id::text,
          jsonb_build_object('event', 'exported', 'subjectKind', p_kind,
                             'sections', (select jsonb_object_agg(s.key, case jsonb_typeof(s.value)
                                                                           when 'array' then jsonb_array_length(s.value)
                                                                           else 1 end)
                                            from jsonb_each(v_sections) s)));
  return jsonb_build_object('subject', jsonb_build_object('kind', p_kind, 'id', p_id, 'label', v_label),
                            'sections', v_sections);
end;
$$;

-- ───────────── Ν8 Ανωνυμοποίηση ─────────────

-- Η διεύθυνση κρύβεται σε ουρές, Ιστορικό αποστολών και προσκλήσεις· ό,τι περίμενε να σταλεί ακυρώνεται.
create function authz.gdpr_mask_sends(p_emails text[], p_user uuid, p_mail text, p_name text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.email_outbox set to_email = p_mail, to_name = p_name where lower(btrim(to_email)) = any (p_emails);
  update public.email_outbox set status = 'cancelled', handled_at = now() where to_email = p_mail and status = 'pending';
  update public.agreement_outbox set to_email = p_mail, to_name = p_name where lower(btrim(to_email)) = any (p_emails);
  update public.agreement_outbox set status = 'cancelled', handled_at = now() where to_email = p_mail and status = 'pending';
  update public.email_log set to_email = p_mail where lower(btrim(to_email)) = any (p_emails);
  -- Το κλειδί του Επισκέπτη είναι το email του· μένει μοναδικό ανά σημάδι.
  update public.automation_sends set recipient_key = p_mail || '#' || id where lower(btrim(recipient_key)) = any (p_emails);
  update public.invitations set status = 'cancelled', cancelled_at = now()
   where (lower(email) = any (p_emails) or user_id = p_user) and status = 'pending';
  update public.invitations set email = p_mail, name = left(p_name, 120)
   where lower(email) = any (p_emails) or user_id = p_user;
end;
$$;

-- Ο λογαριασμός εισόδου και ό,τι προσωπικό κρέμεται από αυτόν. Ο λογαριασμός δεν διαγράφεται (αναφορές σε Μηνύματα, Ίχνος).
create function authz.gdpr_wipe_account(p_user uuid, p_mail text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.calendar_links where user_id = p_user;
  delete from public.today_prefs where user_id = p_user;
  delete from public.client_user_settings where user_id = p_user;
  delete from public.automation_optouts where user_id = p_user;
  delete from public.automation_unsubscribes where user_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.message_reads where user_id = p_user;
  delete from public.message_digest_marks where user_id = p_user;
  delete from public.assistant_conversations where user_id = p_user;
  update auth.users
     set email = p_mail, phone = null, encrypted_password = '', raw_user_meta_data = '{}'::jsonb,
         banned_until = timestamptz '2999-12-31 00:00:00+00', updated_at = now()
   where id = p_user;
  delete from auth.identities where user_id = p_user;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
  delete from auth.mfa_factors where user_id = p_user;
  delete from auth.one_time_tokens where user_id = p_user;
end;
$$;

-- { n, name }. Η σειρά: Ιδιοκτήτης, «δεν γίνεται», όνομα, και μετά όλα μαζί στην ίδια συναλλαγή.
create function authz.gdpr_anonymize(p_kind text, p_id uuid, p_typed_name text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_block text;
  v_name text;
  v_emails text[];
  v_n integer;
  v_new text;
  v_mail text;
begin
  perform authz.gdpr_require();
  -- Δύο ταυτόχρονες ανωνυμοποιήσεις του ίδιου προσώπου μπαίνουν στη σειρά· η δεύτερη βρίσκει «ήδη».
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('gdpr:' || coalesce(p_id::text, '')));
  v_block := authz.gdpr_block(p_kind, p_id);
  if v_block is not null then
    raise exception '%', authz.gdpr_block_text(v_block) using errcode = 'P0001';
  end if;
  v_name := authz.gdpr_label(p_kind, p_id);
  if p_typed_name is null or btrim(p_typed_name) <> btrim(v_name) then
    raise exception 'Το όνομα δεν ταιριάζει. Γράψε το ακριβώς όπως φαίνεται.' using errcode = 'P0001';
  end if;
  v_emails := authz.gdpr_emails(p_kind, p_id);
  v_n := nextval('public.gdpr_anonymized_seq');
  v_new := 'Ανωνυμοποιημένος Χρήστης ' || v_n;
  v_mail := 'anonymized-' || v_n || '@anonymized.invalid';

  perform set_config('gdpr.anonymizing', 'on', true);
  if p_kind = 'team_user' then
    update public.team_users set name = v_new, email = v_mail, language = 'el' where user_id = p_id;
  elsif p_kind = 'client_user' then
    update public.client_users set name = v_new where user_id = p_id;
  else
    update public.clients set contact_name = v_new, contact_email = v_mail, contact_phone = '' where id = p_id;
  end if;
  perform authz.gdpr_mask_sends(v_emails, case when p_kind = 'contact' then null else p_id end, v_mail, v_new);
  if p_kind <> 'contact' then
    perform authz.gdpr_wipe_account(p_id, v_mail);
  end if;
  insert into public.gdpr_anonymizations (n, subject_kind, user_id, client_id, anonymized_by)
  values (v_n, p_kind, case when p_kind = 'contact' then null else p_id end,
          case when p_kind = 'contact' then p_id end, auth.uid());
  perform set_config('gdpr.anonymizing', 'off', true);

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'gdpr', p_id::text, jsonb_build_object('event', 'anonymized', 'subjectKind', p_kind, 'n', v_n));
  return jsonb_build_object('n', v_n, 'name', v_new);
end;
$$;

-- Ο Χρήστης που ανωνυμοποιήθηκε δεν επανενεργοποιείται και δεν ξαναμπαίνει σε Πελάτη.
create function authz.guard_gdpr_anonymized() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.gdpr_anonymizations a where a.user_id = new.user_id) then
    raise exception 'Ο Χρήστης έχει ανωνυμοποιηθεί· δεν ενεργοποιείται ξανά' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger team_users_gdpr_anonymized before update of is_active on public.team_users
  for each row when (not old.is_active and new.is_active) execute function authz.guard_gdpr_anonymized();
create trigger client_users_gdpr_anonymized before insert or update of removed_at on public.client_users
  for each row when (new.removed_at is null) execute function authz.guard_gdpr_anonymized();

-- ───────────── Κάρτα «GDPR με προθεσμία» (Σήμερα, μόνο Ιδιοκτήτης) ─────────────

-- null: όχι Ιδιοκτήτης, κάρτα πελάτη, ή κανένα ανοιχτό αίτημα (τότε η κάρτα δεν εμφανίζεται καθόλου).
create function authz.today_count_gdpr(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not coalesce(authz.user_is_owner(p_uid), false) then
    return null;
  end if;
  return nullif((select count(*)::integer from public.gdpr_requests r where r.completed_on is null), 0);
end;
$$;

create function authz.today_items_gdpr(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Athens')::date;
begin
  if p_client is not null or not coalesce(authz.user_is_owner(p_uid), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id::text,
             'title', authz.gdpr_kind_text(r.kind) || ': '
                      || coalesce(authz.gdpr_label(r.subject_kind, coalesce(r.subject_user_id, r.subject_client_id)), '—'),
             'subtitle', authz.gdpr_days_text(r.deadline - v_today),
             'at', (r.deadline::timestamp at time zone 'Europe/Athens'),
             'urgent', r.deadline - v_today <= 1,
             'link', '/app/team/gdpr') order by r.deadline, r.received_on, r.id)
      from (select * from public.gdpr_requests x where x.completed_on is null
             order by x.deadline, x.received_on, x.id limit 3) r),
    '[]'::jsonb);
end;
$$;

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('gdpr', 'decide', 'action', 'team', 150, 'GDPR με προθεσμία', 'GDPR deadlines', '/app/team/gdpr',
   'authz.today_count_gdpr(uuid, uuid, timestamptz)', 'authz.today_items_gdpr(uuid, uuid, timestamptz)');

-- ───────────── RPC της εφαρμογής (σήμερα = ώρα Αθήνας) ─────────────

create function public.gdpr_register(p_today date default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.gdpr_requests_view(coalesce(p_today, public.sales_today())); $$;

create function public.gdpr_request_create(
  p_kind text, p_subject_kind text, p_subject_id uuid, p_received_on date default null, p_note text default ''
) returns uuid
language sql volatile security definer set search_path = ''
as $$ select authz.gdpr_request_create(p_kind, p_subject_kind, p_subject_id, p_received_on, p_note, public.sales_today()); $$;

create function public.gdpr_request_complete(p_id uuid, p_completed_on date default null, p_note text default null)
returns void
language sql volatile security definer set search_path = ''
as $$ select authz.gdpr_request_complete(p_id, p_completed_on, p_note, public.sales_today()); $$;

create function public.gdpr_subjects() returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.gdpr_subjects(); $$;

create function public.gdpr_export(p_subject_kind text, p_subject_id uuid) returns jsonb
language sql volatile security definer set search_path = ''
as $$ select authz.gdpr_export(p_subject_kind, p_subject_id); $$;

create function public.gdpr_anonymize(p_subject_kind text, p_subject_id uuid, p_typed_name text) returns jsonb
language sql volatile security definer set search_path = ''
as $$ select authz.gdpr_anonymize(p_subject_kind, p_subject_id, p_typed_name); $$;

-- ───────────── Το Ίχνος δείχνει τα GDPR μόνο στον Ιδιοκτήτη ─────────────
-- Ξαναγράφεται ολόκληρο από τον τελικό ορισμό (20261018120000_integrations_subscriptions.sql), με τα αιτήματα και τις
-- ενέργειες GDPR.

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
    -- Ρυθμίσεις Μηνυμάτων (#164): αριθμοί χωρίς κείμενο ή ποσά
    when 'message_settings' then authz.has('audit.view')
    -- Αυτοματισμοί (#170): κείμενα και παραλήπτες, χωρίς ποσά
    when 'automations' then authz.has('automations.manage') or authz.has('audit.view')
    -- Αργίες (#172): ονόματα και ημερομηνίες
    when 'holiday_greetings' then authz.has('automations.manage') or authz.has('audit.view')
    -- Μηνύματα συστήματος (#173): κείμενα, χωρίς σύνδεσμους ή κωδικούς
    when 'system_messages' then authz.has('automations.manage') or authz.has('audit.view')
    -- Γνώση (#190): περιέχει πρόχειρα, άρα μόνο όσοι διαχειρίζονται τη Γνώση
    when 'knowledge_sections' then authz.has('knowledge.manage')
    when 'knowledge_items' then authz.has('knowledge.manage')
    when 'knowledge_item_audience' then authz.has('knowledge.manage')
    -- Εξαγωγές (#200, #201): τι, φίλτρα, γραμμές· χωρίς ποσά
    when 'report_exports' then true
    -- Συνδρομές (#209): πάροχοι και κόστος, μόνο ο Ιδιοκτήτης
    when 'subscriptions' then authz.is_owner()
    -- GDPR (#208): αιτήματα, εξαγωγές και ανωνυμοποιήσεις, μόνο για τον Ιδιοκτήτη (ποτέ η Διαχείριση)
    when 'gdpr_requests' then authz.is_owner()
    when 'gdpr' then authz.is_owner()
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.gdpr_require(), authz.gdpr_is_placeholder(text), authz.gdpr_is_client_user(uuid), authz.gdpr_label(text, uuid),
  authz.gdpr_emails(text, uuid), authz.gdpr_block(text, uuid), authz.gdpr_block_text(text),
  authz.gdpr_days_text(integer), authz.gdpr_kind_text(text), authz.gdpr_requests_view(date),
  authz.gdpr_request_create(text, text, uuid, date, text, date), authz.gdpr_request_complete(uuid, date, text, date),
  authz.gdpr_subjects(), authz.gdpr_messages(uuid, uuid), authz.gdpr_agreement_roles(text[]),
  authz.gdpr_assistant(uuid), authz.gdpr_client_sections(uuid), authz.gdpr_person_sections(text, uuid),
  authz.gdpr_export(text, uuid), authz.gdpr_mask_sends(text[], uuid, text, text), authz.gdpr_wipe_account(uuid, text),
  authz.gdpr_anonymize(text, uuid, text), authz.guard_gdpr_anonymized(),
  authz.today_count_gdpr(uuid, uuid, timestamptz), authz.today_items_gdpr(uuid, uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.gdpr_register(date), public.gdpr_request_create(text, text, uuid, date, text),
  public.gdpr_request_complete(uuid, date, text), public.gdpr_subjects(), public.gdpr_export(text, uuid),
  public.gdpr_anonymize(text, uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.gdpr_register(date), public.gdpr_request_create(text, text, uuid, date, text),
  public.gdpr_request_complete(uuid, date, text), public.gdpr_subjects(), public.gdpr_export(text, uuid),
  public.gdpr_anonymize(text, uuid, text)
  to authenticated;
