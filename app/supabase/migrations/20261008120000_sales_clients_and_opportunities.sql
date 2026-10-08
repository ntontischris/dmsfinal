-- Πελάτες και Ευκαιρίες (B1–B6) και Ρυθμίσεις › Πωλήσεις (O2). Κεφ. 2, ADR 0002, 0007, 0009, 0015, 0018.
--
-- Αρχές:
--  • «Ένας Πελάτης, ένας πωλητής»: ο Πελάτης έχει έναν Υπεύθυνο. Οι άλλοι πωλητές βλέπουν μόνο ότι υπάρχει και ποιος είναι ο
--    Υπεύθυνός του, μέσα από τη συνάρτηση public.sales_client_list (security definer), ποτέ από τον πίνακα.
--  • Εγγραφές μόνο μέσα από συναρτήσεις public.sales_* (security definer, με έλεγχο Δικαιώματος στο σώμα τους).
--    Οι πίνακες δεν έχουν policies εγγραφής, και το Δικαίωμα INSERT/UPDATE/DELETE αφαιρείται από τους authenticated.
--    Εξαίρεση: οι λίστες Ρυθμίσεων και η sales_settings, που γράφονται με RLS από όποιον «Διαχειρίζεται Ρυθμίσεις».
--  • «Κερδισμένη» γίνεται μόνο από το σύστημα, με την υπογραφή Συμφωνίας (ADR 0009). Το module Συμφωνίες δεν υπάρχει ακόμα,
--    οπότε εδώ υπάρχει μόνο ο φραγμός: ένα trigger απορρίπτει outcome = 'won' εκτός αν το ανοίξει συνάρτηση του module Συμφωνίες
--    με set_config('sales.system_close', 'on', true).
--  • Μια χαμένη Ευκαιρία δεν ξανανοίγει. Οι Πελάτες δεν διαγράφονται: αρχειοθετούνται (archived_at).
--  • Τιμές λίστας: ποτέ διαγραφή αν χρησιμοποιήθηκαν, μόνο απόσυρση (ADR 0015). Αναφορές με id, όχι με κείμενο.
--  • Οι συγχωνεύσεις μετακινούν ό,τι ξέρει αυτό το module. Κάθε module που προσθέτει πίνακα με client_id επεκτείνει τη
--    public.sales_merge_clients με δικό του migration (create or replace) και τον δικό του πίνακα.

-- ───────────── Λίστες Ρυθμίσεων (ADR 0015) ─────────────
-- Κάθε λίστα: σειρά, ετικέτα, σημάδι «αποσύρθηκε». Το code είναι σταθερό αναγνωριστικό για τις αρχικές τιμές που
-- χρειάζεται ο κώδικας (π.χ. η Πηγή της φόρμας). Εσωτερικές τιμές: μόνο ελληνικά.

create table public.sales_stages (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  label text not null check (length(trim(label)) > 0),
  sort integer not null,
  is_system boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table public.sales_sources (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  label text not null check (length(trim(label)) > 0),
  sort integer not null,
  is_system boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table public.sales_loss_reasons (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  label text not null check (length(trim(label)) > 0),
  sort integer not null,
  is_system boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table public.sales_activity_kinds (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  label text not null check (length(trim(label)) > 0),
  sort integer not null,
  is_system boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create unique index sales_stages_label_active on public.sales_stages (lower(label)) where retired_at is null;
create unique index sales_sources_label_active on public.sales_sources (lower(label)) where retired_at is null;
create unique index sales_loss_reasons_label_active on public.sales_loss_reasons (lower(label)) where retired_at is null;
create unique index sales_activity_kinds_label_active on public.sales_activity_kinds (lower(label)) where retired_at is null;

-- Μία γραμμή: πού πάνε οι νέες Ευκαιρίες από τη φόρμα της Ιστοσελίδας.
--   owner  = ο Ιδιοκτήτης (προεπιλογή, ώστε ένας άνθρωπος να μη χρειάζεται να αναθέτει στον εαυτό του)
--   person = συγκεκριμένο μέλος της ομάδας (form_assignee_id)
--   queue  = ουρά «Χωρίς υπεύθυνο»
create table public.sales_settings (
  id boolean primary key default true check (id),
  form_routing text not null default 'owner' check (form_routing in ('owner', 'person', 'queue')),
  form_assignee_id uuid references public.team_users (user_id),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((form_routing = 'person') = (form_assignee_id is not null))
);

insert into public.sales_settings default values;

-- ───────────── Πελάτες ─────────────

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  legal_name text not null default '',
  city text not null default '',
  afm text check (afm ~ '^[0-9]{9}$'),
  -- Κύριο πρόσωπο επικοινωνίας: υποχρεωτικό από την πρώτη μέρα (ADR 0009).
  contact_name text not null check (length(trim(contact_name)) > 0),
  contact_email text not null check (contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  contact_phone text not null default '',
  -- null = «Χωρίς υπεύθυνο» (νέος Πελάτης από τη φόρμα, ή Υπεύθυνος που απενεργοποιήθηκε).
  manager_id uuid references public.team_users (user_id),
  archived_at timestamptz,
  merged_into_id uuid references public.clients (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (merged_into_id is null or (archived_at is not null and merged_into_id <> id))
);

-- Ακριβές ταίριασμα = μοναδικότητα στους ενεργούς Πελάτες. Ο αρχειοθετημένος (συγχωνευμένος) αφήνει ελεύθερα τα στοιχεία.
create unique index clients_afm_unique on public.clients (afm) where afm is not null and archived_at is null;
create unique index clients_email_unique on public.clients (contact_email) where archived_at is null;
create index clients_manager_idx on public.clients (manager_id) where archived_at is null;
create index clients_name_idx on public.clients (lower(name));

-- Το σήμα «Πιθανό διπλό» ζει σε δικό του πίνακα, ώστε να το βλέπουν μόνο όσοι «Συγχωνεύουν Πελάτες» (RLS).
create table public.client_duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  matches_client_id uuid not null references public.clients (id),
  reason text not null check (reason in ('phone', 'email_domain', 'name')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution in ('other', 'merged')),
  resolved_by uuid,
  check (client_id <> matches_client_id),
  check ((resolved_at is null) = (resolution is null))
);

create unique index client_duplicate_flags_open on public.client_duplicate_flags (client_id) where resolved_at is null;
create index client_duplicate_flags_matches_idx on public.client_duplicate_flags (matches_client_id);

-- ───────────── Ευκαιρίες ─────────────

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  title text not null check (length(trim(title)) > 0),
  stage_id uuid not null references public.sales_stages (id),
  source_id uuid not null references public.sales_sources (id),
  referred_by text not null default '',
  manager_id uuid references public.team_users (user_id),
  -- Έκβαση: σταθερή και χωριστή από το Στάδιο (ADR 0009).
  outcome text not null default 'open' check (outcome in ('open', 'won', 'lost')),
  loss_reason_id uuid references public.sales_loss_reasons (id),
  next_step text not null default '',
  next_step_due date,
  follows_opportunity_id uuid references public.opportunities (id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  -- Κάθε ανοιχτή Ευκαιρία έχει Επόμενο βήμα με ημερομηνία.
  check (outcome <> 'open' or (length(trim(next_step)) > 0 and next_step_due is not null)),
  check ((outcome = 'lost') = (loss_reason_id is not null)),
  check ((outcome = 'open') = (closed_at is null)),
  -- Χωρίς Υπεύθυνο μένουν μόνο ανοιχτές Ευκαιρίες (η ουρά).
  check (manager_id is not null or outcome = 'open'),
  check (follows_opportunity_id is distinct from id)
);

create index opportunities_client_idx on public.opportunities (client_id);
create index opportunities_manager_idx on public.opportunities (manager_id);
create index opportunities_stage_idx on public.opportunities (stage_id);
create index opportunities_forgotten_idx on public.opportunities (next_step_due) where outcome = 'open';
create index opportunities_queue_idx on public.opportunities (client_id) where outcome = 'open' and manager_id is null;

-- Δραστηριότητες: χειροκίνητες (kind_id) ή αυτόματες του συστήματος (event). Μόνο προσθήκες.
-- Το client_id το βάζει trigger από την Ευκαιρία. previous_id/subject_id δείχνουν Στάδιο, Χρήστη ή Λόγο απώλειας ανά event.
create table public.opportunity_activities (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id),
  client_id uuid not null references public.clients (id),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.team_users (user_id),
  kind_id uuid references public.sales_activity_kinds (id),
  event text check (event in ('created', 'stage_changed', 'assigned', 'lost')),
  body text not null default '',
  previous_id uuid,
  subject_id uuid,
  check ((kind_id is not null) <> (event is not null)),
  check (kind_id is null or length(trim(body)) > 0)
);

create index opportunity_activities_opportunity_idx on public.opportunity_activities (opportunity_id, occurred_at desc);
create index opportunity_activities_client_idx on public.opportunity_activities (client_id, occurred_at desc);

-- Αιτήματα πρόσβασης (ADR 0009): πωλητής ζητά να ανοίξει Ευκαιρία σε Πελάτη άλλου.
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  requester_id uuid not null references public.team_users (user_id),
  topic text not null check (length(trim(topic)) > 0),
  comment text not null default '',
  source_id uuid not null references public.sales_sources (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  resolution text check (resolution in ('opportunity', 'transfer')),
  decided_by uuid references public.team_users (user_id),
  decided_at timestamptz,
  decision_comment text not null default '',
  opportunity_id uuid references public.opportunities (id),
  created_at timestamptz not null default now(),
  check ((status = 'pending') = (decided_at is null)),
  check (status <> 'rejected' or length(trim(decision_comment)) > 0),
  check ((status = 'approved') = (resolution is not null)),
  check (resolution is distinct from 'opportunity' or opportunity_id is not null)
);

create unique index access_requests_one_pending on public.access_requests (requester_id, client_id) where status = 'pending';
create index access_requests_pending_idx on public.access_requests (created_at) where status = 'pending';

alter table public.sales_stages enable row level security;
alter table public.sales_sources enable row level security;
alter table public.sales_loss_reasons enable row level security;
alter table public.sales_activity_kinds enable row level security;
alter table public.sales_settings enable row level security;
alter table public.clients enable row level security;
alter table public.client_duplicate_flags enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_activities enable row level security;
alter table public.access_requests enable row level security;

-- ───────────── Αρχικές τιμές (ADR 0015: προτεινόμενες τιμές στο πρώτο στήσιμο) ─────────────

insert into public.sales_stages (code, label, sort) values
  ('new', 'Νέα', 10),
  ('first_contact', 'Πρώτη επαφή', 20),
  ('meeting', 'Συνάντηση', 30),
  ('proposal', 'Πρόταση', 40),
  ('negotiation', 'Διαπραγμάτευση', 50);

-- Η Πηγή «Ιστοσελίδα» τη βάζει η φόρμα, άρα δεν αποσύρεται.
insert into public.sales_sources (code, label, sort, is_system) values
  ('web', 'Ιστοσελίδα', 10, true),
  ('instagram', 'Instagram', 20, false),
  ('facebook', 'Facebook', 30, false),
  ('referral', 'Σύσταση', 40, false),
  ('phone', 'Τηλέφωνο', 50, false),
  ('other', 'Άλλο', 60, false);

insert into public.sales_loss_reasons (code, label, sort) values
  ('price', 'Τιμή', 10),
  ('no_reply', 'Δεν απάντησε', 20),
  ('chose_other', 'Επέλεξε άλλον', 30),
  ('not_now', 'Όχι τώρα', 40),
  ('out_of_scope', 'Εκτός αντικειμένου', 50);

insert into public.sales_activity_kinds (code, label, sort) values
  ('call', 'Κλήση', 10),
  ('email', 'Email', 20),
  ('meeting', 'Συνάντηση', 30),
  ('note', 'Σημείωση', 40);

-- ───────────── Βοηθητικές καθαρές συναρτήσεις (ταίριασμα, ημερομηνία) ─────────────
-- Εσωτερικές: δεν δίνονται σε κανέναν ρόλο εφαρμογής (βλ. τέλος του αρχείου).

-- Σήμερα στην Ελλάδα (date επιχείρησης, ADR 0018).
create function public.sales_today() returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Europe/Athens')::date; $$;

-- Τηλέφωνο: μόνο ψηφία, χωρίς πρόθεμα χώρας 30/0030, τουλάχιστον 7 ψηφία αλλιώς κενό (δεν ταιριάζει με τίποτα).
create function public.sales_norm_phone(p text) returns text
language sql immutable set search_path = ''
as $$
  select case when length(n.digits) >= 7 then n.digits else '' end
    from (
      select regexp_replace(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '^(00)?30', '') as digits
    ) n;
$$;

-- Όνομα: μικρά, χωρίς τόνους και τελικό ς, χωρίς νομικές μορφές (ΙΚΕ, ΕΠΕ, ΑΕ, ΟΕ, ΕΕ, Ltd…), χωρίς σημεία και κενά.
create function public.sales_norm_name(p text) returns text
language sql immutable set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(
      lower(translate(
        coalesce(p, ''),
        'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏΪΫάέήίόύώϊϋΐΰς',
        'αβγδεζηθικλμνξοπρστυφχψωαεηιουωιυαεηιουωιυιυσ'
      )),
      '(^|[^α-ωa-z0-9])(ι\.?κ\.?ε\.?|ε\.?π\.?ε\.?|α\.?ε\.?|ο\.?ε\.?|ε\.?ε\.?|ike|epe|ltd|llc|inc)([^α-ωa-z0-9]|$)',
      '\1\3', 'g'
    ),
    '[^α-ωa-z0-9]+', '', 'g'
  );
$$;

-- Τριάδες χαρακτήρων (όπως το pg_trgm, χωρίς την επέκταση: ίδιο αποτέλεσμα σε κάθε locale).
create function public.sales_trigrams(s text) returns text[]
language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(distinct substr(p.padded, i, 3)), '{}'::text[])
    from (select '  ' || s || ' ' as padded) p,
         generate_series(1, length(p.padded) - 2) as i;
$$;

-- Ομοιότητα ονομάτων 0..1 (Jaccard των τριάδων των κανονικοποιημένων ονομάτων).
create function public.sales_name_similarity(a text, b text) returns numeric
language sql immutable set search_path = ''
as $$
  select case when n.x = '' or n.y = '' then 0::numeric else
    (select count(*) from (
       select unnest(public.sales_trigrams(n.x)) intersect select unnest(public.sales_trigrams(n.y))
     ) i)::numeric
    / (select count(*) from (
       select unnest(public.sales_trigrams(n.x)) union select unnest(public.sales_trigrams(n.y))
     ) u)::numeric
  end
  from (select public.sales_norm_name(a) as x, public.sales_norm_name(b) as y) n;
$$;

-- «Παρόμοιο όνομα»: ίδιο μετά την κανονικοποίηση, το ένα μέσα στο άλλο (τουλάχιστον 6 χαρακτήρες), ή ομοιότητα ≥ 0,6.
create function public.sales_names_alike(a text, b text) returns boolean
language sql immutable set search_path = ''
as $$
  select n.x <> '' and n.y <> '' and (
    n.x = n.y
    or (least(length(n.x), length(n.y)) >= 6 and (position(n.x in n.y) > 0 or position(n.y in n.x) > 0))
    or public.sales_name_similarity(a, b) >= 0.6
  )
  from (select public.sales_norm_name(a) as x, public.sales_norm_name(b) as y) n;
$$;

-- Δωρεάν υπηρεσίες email: το κοινό domain τους δεν δείχνει κοινό Πελάτη. Τεχνικό κριτήριο ταιριάσματος, όχι επιχειρησιακή λίστα.
create function public.sales_is_free_mail(domain text) returns boolean
language sql immutable set search_path = ''
as $$
  select lower(coalesce(domain, '')) = any (array[
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.gr', 'hotmail.com', 'hotmail.gr', 'outlook.com', 'outlook.gr',
    'live.com', 'live.gr', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'gmx.com', 'mail.com', 'proton.me',
    'protonmail.com', 'yandex.com', 'otenet.gr', 'hol.gr', 'in.gr', 'forthnet.gr', 'vodafone.gr', 'cosmote.gr'
  ]);
$$;

-- Βρίσκει τον Πελάτη που ταιριάζει σε νέα στοιχεία. Επιστρέφει το πολύ μία γραμμή, το ισχυρότερο ταίριασμα:
--   exact (ΑΦΜ, μετά email)  → η Ευκαιρία μπαίνει στον υπάρχοντα Πελάτη
--   similar (τηλέφωνο, domain email, όνομα) → νέος Πελάτης με σήμα «Πιθανό διπλό»
-- Βλέπει όλους τους Πελάτες (security definer): το ταίριασμα πρέπει να βρίσκει και τους «κατειλημμένους».
create function public.sales_find_match(p_afm text, p_email text, p_phone text, p_name text)
returns table (client_id uuid, kind text, reason text)
language sql stable security definer set search_path = ''
as $$
  with q as (
    select nullif(trim(coalesce(p_afm, '')), '') as afm,
           lower(trim(coalesce(p_email, ''))) as email,
           public.sales_norm_phone(p_phone) as phone,
           lower(split_part(trim(coalesce(p_email, '')), '@', 2)) as domain
  )
  select m.id, m.kind, m.reason
    from (
      select c.id, 'exact' as kind, 'afm' as reason, 1 as rank
        from public.clients c, q where c.archived_at is null and q.afm is not null and c.afm = q.afm
      union all
      select c.id, 'exact', 'email', 2
        from public.clients c, q where c.archived_at is null and q.email <> '' and c.contact_email = q.email
      union all
      select c.id, 'similar', 'phone', 3
        from public.clients c, q
       where c.archived_at is null and q.phone <> '' and public.sales_norm_phone(c.contact_phone) = q.phone
      union all
      select c.id, 'similar', 'email_domain', 4
        from public.clients c, q
       where c.archived_at is null and q.domain <> '' and not public.sales_is_free_mail(q.domain)
         and lower(split_part(c.contact_email, '@', 2)) = q.domain
      union all
      select c.id, 'similar', 'name', 5
        from public.clients c
       where c.archived_at is null and public.sales_names_alike(c.name, p_name)
    ) m
   order by m.rank, m.id
   limit 1;
$$;

-- ───────────── Έλεγχοι πρόσβασης (authz) ─────────────

-- Απορρίπτει όποιον δεν έχει το Δικαίωμα. Την καλούν οι συναρτήσεις εγγραφής.
create function authz.require(perm text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.has(perm) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Βλέπει ο Χρήστης τον Πελάτη ολόκληρο; (Εύρος «όλα», ή «με αφορά» = Υπεύθυνος του Πελάτη ή μιας Ευκαιρίας του, ADR 0007.)
-- Όσοι αναθέτουν και όσοι συγχωνεύουν δουλεύουν πάνω σε όλους τους Πελάτες, άρα τους βλέπουν.
create function authz.can_see_client(cid uuid, cmanager uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and (
    coalesce(authz.scope('clients.view'), '') = 'all'
    or coalesce(authz.scope('clients.manage'), '') = 'all'
    or authz.has('clients.transfer')
    or authz.has('clients.merge')
    or (
      (authz.has('clients.view') or authz.has('clients.manage'))
      and (
        coalesce(cmanager = auth.uid(), false)
        or exists (select 1 from public.opportunities o where o.client_id = cid and o.manager_id = auth.uid())
      )
    )
  );
$$;

-- Βλέπει ο Χρήστης την Ευκαιρία; Την βλέπει ο Υπεύθυνός της, ο Υπεύθυνος του Πελάτη, όποιος «Διαχειρίζεται» με Εύρος όλα,
-- και όσοι αναθέτουν. Όποιος έχει μόνο «Βλέπει Πελάτες» (π.χ. Λογιστής) δεν βλέπει Ευκαιρίες.
create function authz.can_see_opportunity_row(ocid uuid, omanager uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and (
    coalesce(authz.scope('clients.manage'), '') = 'all'
    or authz.has('clients.transfer')
    or (
      (authz.has('clients.view') or authz.has('clients.manage'))
      and (
        coalesce(omanager = auth.uid(), false)
        or exists (select 1 from public.clients c where c.id = ocid and c.manager_id = auth.uid())
      )
    )
  );
$$;

create function authz.can_see_opportunity(oid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.opportunities o
     where o.id = oid and authz.can_see_opportunity_row(o.client_id, o.manager_id)
  );
$$;

-- Δουλεύει ο Χρήστης την Ευκαιρία (αλλαγή Σταδίου, Επόμενου βήματος, Δραστηριότητες, κλείσιμο); Ο Υπεύθυνός της, ή Εύρος όλα.
create function authz.can_work_opportunity(oid uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.has('clients.manage') and exists (
    select 1 from public.opportunities o
     where o.id = oid
       and (coalesce(authz.scope('clients.manage'), '') = 'all' or o.manager_id = auth.uid())
  );
$$;

-- ───────────── Κανόνες που ισχύουν για όλους, και για τον service role (triggers) ─────────────

-- Τιμές λίστας: δημιουργία, μετονομασία, απόσυρση, διαγραφή μόνο αν δεν χρησιμοποιήθηκαν ποτέ.
create function public.sales_list_item_uses(tbl text, item uuid) returns bigint
language sql stable security definer set search_path = ''
as $$
  select case tbl
    when 'sales_stages' then (select count(*) from public.opportunities where stage_id = item)
    when 'sales_sources' then
      (select count(*) from public.opportunities where source_id = item)
      + (select count(*) from public.access_requests where source_id = item)
    when 'sales_loss_reasons' then (select count(*) from public.opportunities where loss_reason_id = item)
    when 'sales_activity_kinds' then (select count(*) from public.opportunity_activities where kind_id = item)
    else 0
  end;
$$;

create function authz.guard_sales_list_item() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  active_others integer;
begin
  if tg_op = 'INSERT' then
    -- Ο Χρήστης της εφαρμογής δεν φτιάχνει τιμές «του συστήματος»: αναγνωριστικό και απόσυρση μπαίνουν μόνο από migration/service.
    if auth.uid() is not null then
      new.is_system := false;
      new.code := null;
      new.retired_at := null;
    end if;
    new.created_at := now();
    new.created_by := auth.uid();
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'Η τιμή «%» τη χρειάζεται το σύστημα και δεν διαγράφεται', old.label using errcode = 'P0001';
    end if;
    if public.sales_list_item_uses(tg_table_name, old.id) > 0 then
      raise exception 'Η τιμή «%» έχει ήδη χρησιμοποιηθεί και δεν διαγράφεται· αποσύρεται', old.label using errcode = 'P0001';
    end if;
  else
    if new.code is distinct from old.code or new.is_system is distinct from old.is_system
       or new.created_at is distinct from old.created_at then
      raise exception 'Το αναγνωριστικό μιας τιμής δεν αλλάζει' using errcode = 'P0001';
    end if;
    if old.retired_at is null and new.retired_at is not null then
      if old.is_system then
        raise exception 'Η τιμή «%» τη χρειάζεται το σύστημα και δεν αποσύρεται', old.label using errcode = 'P0001';
      end if;
      if tg_table_name = 'sales_stages' and exists (
        select 1 from public.opportunities o where o.stage_id = old.id and o.outcome = 'open'
      ) then
        raise exception 'Το Στάδιο «%» έχει ανοιχτές Ευκαιρίες· μετάφερέ τες πρώτα σε άλλο Στάδιο', old.label using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- Η λίστα δεν μένει ποτέ χωρίς ενεργή τιμή, είτε η τελευταία αποσύρεται είτε διαγράφεται.
  if old.retired_at is null and (tg_op = 'DELETE' or new.retired_at is not null) then
    execute format('select count(*) from public.%I where retired_at is null and id <> $1', tg_table_name)
      into active_others using old.id;
    if active_others = 0 then
      raise exception 'Χρειάζεται τουλάχιστον μία ενεργή τιμή στη λίστα' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger sales_stages_guard before insert or update or delete on public.sales_stages
  for each row execute function authz.guard_sales_list_item();
create trigger sales_sources_guard before insert or update or delete on public.sales_sources
  for each row execute function authz.guard_sales_list_item();
create trigger sales_loss_reasons_guard before insert or update or delete on public.sales_loss_reasons
  for each row execute function authz.guard_sales_list_item();
create trigger sales_activity_kinds_guard before insert or update or delete on public.sales_activity_kinds
  for each row execute function authz.guard_sales_list_item();

-- Ρύθμιση φόρμας: ο Υπεύθυνος που ορίζεται πρέπει να μπορεί να έχει Πελάτες.
create function authz.guard_sales_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.form_assignee_id is not null and authz.user_scope(new.form_assignee_id, 'clients.manage') is null then
    raise exception 'Ευκαιρίες από τη φόρμα μπορεί να πάρει μόνο ενεργός Χρήστης ομάδας που διαχειρίζεται Πελάτες και Ευκαιρίες'
      using errcode = 'P0001';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger sales_settings_guard before update on public.sales_settings
  for each row execute function authz.guard_sales_settings();

-- Πελάτης: το email κρατιέται με μικρά, ο Υπεύθυνος πρέπει να μπορεί να έχει Πελάτες, ο αρχειοθετημένος δεν αλλάζει.
create function authz.guard_client() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_merging boolean := coalesce(current_setting('sales.merging', true), '') = 'on';
begin
  new.contact_email := lower(trim(new.contact_email));
  if tg_op = 'UPDATE' then
    if old.archived_at is not null and not is_merging then
      raise exception 'Ένας συγχωνευμένος Πελάτης δεν αλλάζει' using errcode = 'P0001';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  else
    new.created_by := auth.uid();
  end if;
  if new.manager_id is not null and (tg_op = 'INSERT' or new.manager_id is distinct from old.manager_id) then
    if authz.user_scope(new.manager_id, 'clients.manage') is null then
      raise exception 'Υπεύθυνος μπορεί να γίνει μόνο ενεργός Χρήστης ομάδας που διαχειρίζεται Πελάτες και Ευκαιρίες'
        using errcode = 'P0001';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger clients_guard before insert or update on public.clients
  for each row execute function authz.guard_client();

-- Ευκαιρία: ανοιχτή στη γέννηση, ποτέ ξανά ανοιχτή μετά το κλείσιμο, «κερδισμένη» μόνο από το σύστημα,
-- ο Πελάτης δεν αλλάζει (εκτός συγχώνευσης), νέες τιμές μόνο από ενεργές λίστες.
create function authz.guard_opportunity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_merging boolean := coalesce(current_setting('sales.merging', true), '') = 'on';
  is_system_close boolean := coalesce(current_setting('sales.system_close', true), '') = 'on';
  followed public.opportunities;
begin
  if tg_op = 'INSERT' then
    if new.outcome <> 'open' and not is_system_close then
      raise exception 'Μια Ευκαιρία γεννιέται ανοιχτή' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.clients c where c.id = new.client_id and c.archived_at is null) then
      raise exception 'Ο Πελάτης δεν υπάρχει ή έχει συγχωνευθεί σε άλλον' using errcode = 'P0001';
    end if;
    if new.follows_opportunity_id is not null then
      select * into followed from public.opportunities o where o.id = new.follows_opportunity_id;
      if not found or followed.outcome <> 'lost' or followed.client_id <> new.client_id then
        raise exception 'Η Ευκαιρία συνεχίζει μόνο μια χαμένη Ευκαιρία του ίδιου Πελάτη' using errcode = 'P0001';
      end if;
    end if;
    new.created_at := now();
    new.created_by := auth.uid();
  else
    if old.outcome = 'lost' and new.outcome <> 'lost' then
      raise exception 'Μια χαμένη Ευκαιρία δεν ξανανοίγει· ανοίγεις νέα από αυτήν' using errcode = 'P0001';
    end if;
    if old.outcome <> 'open' and not is_merging then
      raise exception 'Μια κλεισμένη Ευκαιρία δεν αλλάζει' using errcode = 'P0001';
    end if;
    if new.client_id <> old.client_id and not is_merging then
      raise exception 'Ο Πελάτης μιας Ευκαιρίας δεν αλλάζει' using errcode = 'P0001';
    end if;
    if new.outcome = 'won' and old.outcome = 'open' and not is_system_close then
      raise exception 'Κερδισμένη γίνεται μόνο με την υπογραφή της Συμφωνίας' using errcode = 'P0001';
    end if;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;

  if (tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id)
     and not exists (select 1 from public.sales_stages s where s.id = new.stage_id and s.retired_at is null) then
    raise exception 'Το Στάδιο έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  -- Εξαίρεση: η έγκριση Αιτήματος πρόσβασης (sales_decide_access) δέχεται την Πηγή που ίσχυε όταν έγινε το Αίτημα, ακόμη κι αν
  -- αποσύρθηκε στο μεταξύ. Μόνο εκείνη η Πηγή και μόνο σε εισαγωγή (το flag ανοίγει και κλείνει μέσα στη συνάρτηση).
  if (tg_op = 'INSERT' or new.source_id is distinct from old.source_id)
     and not exists (select 1 from public.sales_sources s where s.id = new.source_id and s.retired_at is null)
     and not (tg_op = 'INSERT' and new.source_id::text = coalesce(current_setting('sales.allow_source', true), '')) then
    raise exception 'Η Πηγή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  if new.loss_reason_id is not null and (tg_op = 'INSERT' or new.loss_reason_id is distinct from old.loss_reason_id)
     and not exists (select 1 from public.sales_loss_reasons s where s.id = new.loss_reason_id and s.retired_at is null) then
    raise exception 'Ο Λόγος απώλειας έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  if new.manager_id is not null and (tg_op = 'INSERT' or new.manager_id is distinct from old.manager_id)
     and authz.user_scope(new.manager_id, 'clients.manage') is null then
    raise exception 'Υπεύθυνος μπορεί να γίνει μόνο ενεργός Χρήστης ομάδας που διαχειρίζεται Πελάτες και Ευκαιρίες'
      using errcode = 'P0001';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger opportunities_guard before insert or update on public.opportunities
  for each row execute function authz.guard_opportunity();

-- Αυτόματες Δραστηριότητες: δημιουργία, αλλαγή Σταδίου, ανάθεση, απώλεια. Γράφονται στην ίδια συναλλαγή με την αλλαγή.
create function authz.log_opportunity_events() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select u.user_id from public.team_users u where u.user_id = auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.opportunity_activities (opportunity_id, actor_id, event, subject_id)
    values (new.id, actor, 'created', new.stage_id);
    return null;
  end if;
  if new.stage_id is distinct from old.stage_id then
    insert into public.opportunity_activities (opportunity_id, actor_id, event, previous_id, subject_id)
    values (new.id, actor, 'stage_changed', old.stage_id, new.stage_id);
  end if;
  if new.manager_id is distinct from old.manager_id then
    insert into public.opportunity_activities (opportunity_id, actor_id, event, previous_id, subject_id)
    values (new.id, actor, 'assigned', old.manager_id, new.manager_id);
  end if;
  if old.outcome = 'open' and new.outcome = 'lost' then
    insert into public.opportunity_activities (opportunity_id, actor_id, event, subject_id)
    values (new.id, actor, 'lost', new.loss_reason_id);
  end if;
  return null;
end;
$$;

create trigger opportunities_events after insert or update on public.opportunities
  for each row execute function authz.log_opportunity_events();

-- Δραστηριότητα: το client_id και η ώρα μπαίνουν από το σύστημα· είδος μόνο από ενεργή λίστα· κανείς δεν την αλλάζει.
create function authz.guard_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_merging boolean := coalesce(current_setting('sales.merging', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.client_id := (select o.client_id from public.opportunities o where o.id = new.opportunity_id);
    new.occurred_at := now();
    if new.kind_id is not null
       and not exists (select 1 from public.sales_activity_kinds k where k.id = new.kind_id and k.retired_at is null) then
      raise exception 'Το είδος Δραστηριότητας έχει αποσυρθεί' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and is_merging
     and (to_jsonb(new) - 'client_id') = (to_jsonb(old) - 'client_id') then
    return new;
  end if;
  raise exception 'Το ιστορικό δέχεται μόνο προσθήκες' using errcode = 'P0001';
end;
$$;

create trigger opportunity_activities_guard before insert or update or delete on public.opportunity_activities
  for each row execute function authz.guard_activity();

-- Αίτημα πρόσβασης: αφού αποφασιστεί δεν αλλάζει.
create function authz.guard_access_request() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status <> 'pending' then
    raise exception 'Ένα Αίτημα πρόσβασης που αποφασίστηκε δεν αλλάζει' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger access_requests_guard before update on public.access_requests
  for each row execute function authz.guard_access_request();


-- Όταν ο Υπεύθυνος απενεργοποιείται, ό,τι είχε επιστρέφει για νέα ανάθεση (ουρά «Χωρίς υπεύθυνο»).
-- Οι κλεισμένες Ευκαιρίες κρατούν το όνομά του στο ιστορικό.
create function authz.release_sales_on_deactivation() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.opportunities set manager_id = null where manager_id = old.user_id and outcome = 'open';
  update public.clients set manager_id = null where manager_id = old.user_id and archived_at is null;
  update public.access_requests set status = 'cancelled', decided_at = now()
   where requester_id = old.user_id and status = 'pending';
  return null;
end;
$$;

create trigger team_users_release_sales after update of is_active on public.team_users
  for each row when (old.is_active and not new.is_active)
  execute function authz.release_sales_on_deactivation();

-- ───────────── Ανάγνωση: RPC ─────────────

-- Λίστα Πελατών (B1) και κάρτα ενός Πελάτη (B2 όταν είναι «κατειλημμένος»). Όλοι οι Πελάτες φαίνονται με όνομα και Υπεύθυνο·
-- τα υπόλοιπα (πόλη, Ευκαιρίες) μόνο όπου can_open. Το σήμα «Πιθανό διπλό» μόνο σε όσους «Συγχωνεύουν Πελάτες».
create function public.sales_client_list(
  p_query text default null,
  p_limit integer default 100,
  p_offset integer default 0,
  p_client uuid default null
)
returns table (
  id uuid,
  name text,
  city text,
  manager_id uuid,
  manager_name text,
  can_open boolean,
  open_opportunities integer,
  is_possible_duplicate boolean
)
language sql stable security definer set search_path = ''
as $$
  select c.id,
         c.name,
         case when v.can_open then c.city else '' end,
         c.manager_id,
         m.name,
         v.can_open,
         case when v.can_open then (
           select count(*)::integer from public.opportunities o
            where o.client_id = c.id and o.outcome = 'open'
              and authz.can_see_opportunity_row(o.client_id, o.manager_id)
         ) end,
         authz.has('clients.merge') and exists (
           select 1 from public.client_duplicate_flags f where f.client_id = c.id and f.resolved_at is null
         )
    from public.clients c
    left join public.team_users m on m.user_id = c.manager_id
    cross join lateral (select authz.can_see_client(c.id, c.manager_id) as can_open) v
   where (authz.has('clients.view') or authz.has('clients.manage'))
     and c.archived_at is null
     and (p_client is null or c.id = p_client)
     and (
       coalesce(trim(p_query), '') = ''
       or c.name ilike '%' || trim(p_query) || '%'
       or (v.can_open and (c.legal_name ilike '%' || trim(p_query) || '%' or c.city ilike '%' || trim(p_query) || '%'))
     )
   order by lower(c.name), c.id
   limit least(greatest(coalesce(p_limit, 100), 1), 100)
   offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Μέλη της ομάδας που μπορούν να γίνουν Υπεύθυνοι (για ανάθεση, μεταβίβαση, ρύθμιση φόρμας).
create function public.sales_assignable_users()
returns table (user_id uuid, name text)
language sql stable security definer set search_path = ''
as $$
  select u.user_id, u.name
    from public.team_users u
   where u.is_active
     and authz.user_scope(u.user_id, 'clients.manage') is not null
     and (authz.has('clients.transfer') or authz.has('settings.manage'))
   order by u.name, u.user_id;
$$;

create function public.sales_client_side(p_client uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
           'id', c.id, 'name', c.name, 'legal_name', c.legal_name, 'afm', c.afm, 'city', c.city,
           'contact_name', c.contact_name, 'contact_email', c.contact_email, 'contact_phone', c.contact_phone,
           'manager_name', m.name,
           'opportunities', (select count(*) from public.opportunities o where o.client_id = c.id)
         )
    from public.clients c
    left join public.team_users m on m.user_id = c.manager_id
   where c.id = p_client;
$$;

-- B6: οι ανοιχτές εκκρεμότητες «Πιθανό διπλό», με τις δύο πλευρές δίπλα-δίπλα.
create function public.sales_duplicate_pairs() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(p.pair order by p.created_at, p.flag_id), '[]'::jsonb)
    from (
      select f.id as flag_id, f.created_at,
             jsonb_build_object(
               'flag_id', f.id, 'reason', f.reason, 'created_at', f.created_at,
               'candidate', public.sales_client_side(f.client_id),
               'existing', public.sales_client_side(f.matches_client_id)
             ) as pair
        from public.client_duplicate_flags f
       where f.resolved_at is null and authz.has('clients.merge')
    ) p;
$$;

-- Πόσες φορές χρησιμοποιείται κάθε τιμή λίστας (για «Σε χρήση σε Ν» στις Ρυθμίσεις).
create function public.sales_list_usage()
returns table (list text, item_id uuid, uses bigint)
language sql stable security definer set search_path = ''
as $$
  select 'stages', s.id, public.sales_list_item_uses('sales_stages', s.id) from public.sales_stages s where authz.has('settings.manage')
  union all
  select 'sources', s.id, public.sales_list_item_uses('sales_sources', s.id) from public.sales_sources s where authz.has('settings.manage')
  union all
  select 'loss_reasons', s.id, public.sales_list_item_uses('sales_loss_reasons', s.id) from public.sales_loss_reasons s where authz.has('settings.manage')
  union all
  select 'activity_kinds', s.id, public.sales_list_item_uses('sales_activity_kinds', s.id) from public.sales_activity_kinds s where authz.has('settings.manage');
$$;

-- ───────────── Εγγραφή: βοηθητικές εσωτερικές συναρτήσεις ─────────────

create function public.sales_new_client(p_client jsonb, p_manager uuid) returns uuid
language sql security definer set search_path = ''
as $$
  insert into public.clients (name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id)
  values (
    trim(coalesce(p_client ->> 'name', '')),
    trim(coalesce(p_client ->> 'legal_name', '')),
    trim(coalesce(p_client ->> 'city', '')),
    nullif(trim(coalesce(p_client ->> 'afm', '')), ''),
    trim(coalesce(p_client ->> 'contact_name', '')),
    lower(trim(coalesce(p_client ->> 'contact_email', ''))),
    trim(coalesce(p_client ->> 'contact_phone', '')),
    p_manager
  )
  returning id;
$$;

create function public.sales_flag_duplicate(p_client uuid, p_match uuid, p_reason text) returns void
language sql security definer set search_path = ''
as $$
  insert into public.client_duplicate_flags (client_id, matches_client_id, reason)
  values (p_client, p_match, p_reason)
  on conflict (client_id) where resolved_at is null do nothing;
$$;

-- Νέα ανοιχτή Ευκαιρία στο πρώτο ενεργό Στάδιο.
create function public.sales_insert_opportunity(
  p_client uuid, p_title text, p_source uuid, p_referred_by text, p_manager uuid,
  p_next_step text, p_next_step_due date, p_follows uuid
) returns uuid
language sql security definer set search_path = ''
as $$
  insert into public.opportunities
    (client_id, title, stage_id, source_id, referred_by, manager_id, next_step, next_step_due, follows_opportunity_id)
  values (
    p_client,
    trim(coalesce(p_title, '')),
    (select s.id from public.sales_stages s where s.retired_at is null order by s.sort, s.created_at, s.id limit 1),
    p_source,
    trim(coalesce(p_referred_by, '')),
    p_manager,
    trim(coalesce(p_next_step, '')),
    p_next_step_due,
    p_follows
  )
  returning id;
$$;

-- ───────────── Εγγραφή: Πελάτες και Ευκαιρίες (B1, B2, B4) ─────────────

-- Νέα Ευκαιρία από πωλητή ή admin. Είτε σε υπάρχοντα Πελάτη (p_client_id), είτε με στοιχεία νέου Πελάτη (p_client).
-- Επιστρέφει {status: 'created', opportunity_id, client_id, client_created, flagged}
--        ή {status: 'blocked', client_id, manager_name} όταν ο Πελάτης ανήκει σε άλλον πωλητή (→ Αίτημα πρόσβασης).
create function public.sales_create_opportunity(
  p_client_id uuid,
  p_client jsonb,
  p_title text,
  p_source_id uuid,
  p_referred_by text,
  p_next_step text,
  p_next_step_due date
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_all boolean;
  v_match_id uuid;
  v_match_kind text;
  v_match_reason text;
  v_client_id uuid;
  v_client_manager uuid;
  v_created boolean := false;
  v_flagged boolean := false;
  v_manager uuid;
  v_opp uuid;
begin
  perform authz.require('clients.manage');
  v_all := authz.scope('clients.manage') = 'all';

  if p_client_id is not null then
    select c.id, c.manager_id into v_client_id, v_client_manager
      from public.clients c where c.id = p_client_id and c.archived_at is null;
    if v_client_id is null then
      raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
    end if;
  else
    select m.client_id, m.kind, m.reason into v_match_id, v_match_kind, v_match_reason
      from public.sales_find_match(
        p_client ->> 'afm', p_client ->> 'contact_email', p_client ->> 'contact_phone', p_client ->> 'name') m;
    if v_match_kind = 'exact' then
      select c.id, c.manager_id into v_client_id, v_client_manager from public.clients c where c.id = v_match_id;
    end if;
  end if;

  if v_client_id is not null then
    if not v_all and v_client_manager is distinct from v_uid then
      return jsonb_build_object(
        'status', 'blocked',
        'client_id', v_client_id,
        'manager_name', (select u.name from public.team_users u where u.user_id = v_client_manager)
      );
    end if;
    v_manager := case when v_all then v_client_manager else v_uid end;
  else
    v_client_id := public.sales_new_client(p_client, v_uid);
    v_created := true;
    v_manager := v_uid;
    if v_match_kind = 'similar' then
      perform public.sales_flag_duplicate(v_client_id, v_match_id, v_match_reason);
      v_flagged := true;
    end if;
  end if;

  v_opp := public.sales_insert_opportunity(
    v_client_id, p_title, p_source_id, p_referred_by, v_manager, p_next_step, p_next_step_due, null);

  return jsonb_build_object(
    'status', 'created', 'opportunity_id', v_opp, 'client_id', v_client_id,
    'client_created', v_created, 'flagged', v_flagged);
end;
$$;

-- Η είσοδος από τη φόρμα της Ιστοσελίδας. Μόνο service role (το καλεί το server code της φόρμας, κεφ. Ιστοσελίδα).
-- Ακριβές ταίριασμα → ο Υπεύθυνος του υπάρχοντος Πελάτη (ή ουρά αν δεν έχει). Αλλιώς νέος Πελάτης, με σήμα αν μοιάζει,
-- και Υπεύθυνο όπου ορίζει η ρύθμιση «Νέες Ευκαιρίες από τη φόρμα πάνε σε».
create function public.sales_intake_form(
  p_client jsonb,
  p_title text,
  p_next_step text default null,
  p_next_step_due date default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_match_id uuid;
  v_match_kind text;
  v_match_reason text;
  v_client_id uuid;
  v_manager uuid;
  v_source uuid;
begin
  select s.id into v_source from public.sales_sources s where s.code = 'web';
  select m.client_id, m.kind, m.reason into v_match_id, v_match_kind, v_match_reason
    from public.sales_find_match(
      p_client ->> 'afm', p_client ->> 'contact_email', p_client ->> 'contact_phone', p_client ->> 'name') m;

  if v_match_kind = 'exact' then
    v_client_id := v_match_id;
    select c.manager_id into v_manager from public.clients c where c.id = v_client_id;
    -- Ο Υπεύθυνος μπορεί να έχει χάσει το Δικαίωμα (π.χ. του αφαιρέθηκε ο Ρόλος): τότε η Ευκαιρία πάει στην ουρά, δεν σκάει η φόρμα.
    if v_manager is not null and authz.user_scope(v_manager, 'clients.manage') is null then
      v_manager := null;
    end if;
  else
    select case st.form_routing
             when 'owner' then (
               select ur.user_id from public.team_user_roles ur
                 join public.roles r on r.id = ur.role_id
                 join public.team_users u on u.user_id = ur.user_id
                where r.is_owner and u.is_active
                order by u.created_at, u.user_id limit 1)
             when 'person' then (
               select u.user_id from public.team_users u where u.user_id = st.form_assignee_id and u.is_active)
           end
      into v_manager
      from public.sales_settings st where st.id;
    -- Ίδιο: Υπεύθυνος γίνεται μόνο όποιος εξακολουθεί να διαχειρίζεται Πελάτες· αλλιώς ουρά.
    if v_manager is not null and authz.user_scope(v_manager, 'clients.manage') is null then
      v_manager := null;
    end if;
    v_client_id := public.sales_new_client(p_client, v_manager);
    if v_match_kind = 'similar' then
      perform public.sales_flag_duplicate(v_client_id, v_match_id, v_match_reason);
    end if;
  end if;

  return public.sales_insert_opportunity(
    v_client_id, p_title, v_source, '', v_manager,
    coalesce(nullif(trim(coalesce(p_next_step, '')), ''), 'Πρώτη επαφή με τον Πελάτη'),
    coalesce(p_next_step_due, public.sales_today() + 1),
    null);
end;
$$;

create function public.sales_update_client(
  p_client uuid,
  p_name text,
  p_legal_name text,
  p_city text,
  p_afm text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_manager uuid;
begin
  perform authz.require('clients.manage');
  select c.manager_id into v_manager from public.clients c where c.id = p_client and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if coalesce(authz.scope('clients.manage'), '') <> 'all' and v_manager is distinct from auth.uid() then
    raise exception 'Τα στοιχεία του Πελάτη τα αλλάζει ο Υπεύθυνός του' using errcode = '42501';
  end if;
  update public.clients set
    name = trim(coalesce(p_name, '')),
    legal_name = trim(coalesce(p_legal_name, '')),
    city = trim(coalesce(p_city, '')),
    afm = nullif(trim(coalesce(p_afm, '')), ''),
    contact_name = trim(coalesce(p_contact_name, '')),
    contact_email = trim(coalesce(p_contact_email, '')),
    contact_phone = trim(coalesce(p_contact_phone, ''))
  where id = p_client;
end;
$$;

-- Αλλαγή Σταδίου, Επόμενου βήματος και τίτλου μιας ανοιχτής Ευκαιρίας (B3, B4).
create function public.sales_update_opportunity(
  p_opportunity uuid,
  p_title text,
  p_stage_id uuid,
  p_next_step text,
  p_next_step_due date
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_work_opportunity(p_opportunity) then
    raise exception 'Την Ευκαιρία τη δουλεύει ο Υπεύθυνός της' using errcode = '42501';
  end if;
  update public.opportunities set
    title = trim(coalesce(p_title, '')),
    stage_id = p_stage_id,
    next_step = trim(coalesce(p_next_step, '')),
    next_step_due = p_next_step_due
  where id = p_opportunity;
end;
$$;

-- Μόνο αλλαγή Σταδίου (η κάρτα του pipeline, B3).
create function public.sales_move_stage(p_opportunity uuid, p_stage_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_work_opportunity(p_opportunity) then
    raise exception 'Την Ευκαιρία τη δουλεύει ο Υπεύθυνός της' using errcode = '42501';
  end if;
  update public.opportunities set stage_id = p_stage_id where id = p_opportunity;
end;
$$;

-- Χειροκίνητη Δραστηριότητα (κλήση, email, συνάντηση, σημείωση…) σε ανοιχτή Ευκαιρία.
create function public.sales_log_activity(p_opportunity uuid, p_kind_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not authz.can_work_opportunity(p_opportunity) then
    raise exception 'Την Ευκαιρία τη δουλεύει ο Υπεύθυνός της' using errcode = '42501';
  end if;
  if not exists (select 1 from public.opportunities o where o.id = p_opportunity and o.outcome = 'open') then
    raise exception 'Δραστηριότητες γράφονται μόνο σε ανοιχτή Ευκαιρία' using errcode = 'P0001';
  end if;
  insert into public.opportunity_activities (opportunity_id, actor_id, kind_id, body)
  values (p_opportunity, auth.uid(), p_kind_id, trim(coalesce(p_body, '')))
  returning id into v_id;
  return v_id;
end;
$$;

-- Κλείσιμο ως χαμένη, με υποχρεωτικό Λόγο απώλειας. Το «κερδισμένη» δεν υπάρχει εδώ: το βάζει μόνο η υπογραφή (ADR 0009).
create function public.sales_close_lost(p_opportunity uuid, p_loss_reason_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_work_opportunity(p_opportunity) then
    raise exception 'Την Ευκαιρία τη δουλεύει ο Υπεύθυνός της' using errcode = '42501';
  end if;
  if p_loss_reason_id is null then
    raise exception 'Διάλεξε Λόγο απώλειας' using errcode = 'P0001';
  end if;
  update public.opportunities
     set outcome = 'lost', loss_reason_id = p_loss_reason_id, closed_at = now()
   where id = p_opportunity and outcome = 'open';
  if not found then
    raise exception 'Η Ευκαιρία δεν είναι ανοιχτή' using errcode = 'P0001';
  end if;
end;
$$;

-- «Νέα Ευκαιρία από αυτήν»: σύνδεσμος σε χαμένη Ευκαιρία. Υπεύθυνος είναι ο Υπεύθυνος του Πελάτη.
create function public.sales_follow_up(
  p_lost uuid, p_title text, p_source_id uuid, p_next_step text, p_next_step_due date
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_outcome text;
  v_client_manager uuid;
begin
  perform authz.require('clients.manage');
  if not authz.can_see_opportunity(p_lost) then
    raise exception 'Η Ευκαιρία δεν βρέθηκε' using errcode = 'P0001';
  end if;
  select o.client_id, o.outcome, c.manager_id into v_client, v_outcome, v_client_manager
    from public.opportunities o join public.clients c on c.id = o.client_id where o.id = p_lost;
  if v_outcome <> 'lost' then
    raise exception 'Νέα Ευκαιρία από αυτήν ανοίγει μόνο από χαμένη Ευκαιρία' using errcode = 'P0001';
  end if;
  if coalesce(authz.scope('clients.manage'), '') <> 'all' and v_client_manager is distinct from auth.uid() then
    raise exception 'Νέα Ευκαιρία στον Πελάτη την ανοίγει ο Υπεύθυνός του· ζήτα πρόσβαση' using errcode = '42501';
  end if;
  return public.sales_insert_opportunity(
    v_client, p_title, p_source_id, '', v_client_manager, p_next_step, p_next_step_due, p_lost);
end;
$$;

-- ───────────── Εγγραφή: ουρά «Χωρίς υπεύθυνο», Αιτήματα πρόσβασης, μεταβίβαση (B5) ─────────────

-- Ανάθεση Ευκαιρίας από την ουρά. Αν ο Πελάτης δεν έχει Υπεύθυνο, ο νέος Υπεύθυνος παίρνει τον Πελάτη και όλες τις
-- ανοιχτές Ευκαιρίες του που περιμένουν.
create function public.sales_assign_opportunity(p_opportunity uuid, p_to uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_client_manager uuid;
begin
  perform authz.require('clients.transfer');
  select o.client_id into v_client from public.opportunities o
   where o.id = p_opportunity and o.outcome = 'open' and o.manager_id is null;
  if v_client is null then
    raise exception 'Η Ευκαιρία δεν περιμένει Υπεύθυνο' using errcode = 'P0001';
  end if;
  select c.manager_id into v_client_manager from public.clients c where c.id = v_client;
  if v_client_manager is null then
    update public.clients set manager_id = p_to where id = v_client;
    update public.opportunities set manager_id = p_to
     where client_id = v_client and outcome = 'open' and manager_id is null;
  else
    update public.opportunities set manager_id = p_to where id = p_opportunity;
  end if;
end;
$$;

-- Μεταβίβαση ολόκληρου του Πελάτη. Οι ανοιχτές Ευκαιρίες του προηγούμενου Υπεύθυνου (ή χωρίς Υπεύθυνο) τον ακολουθούν.
-- Με p_request κλείνει και το Αίτημα πρόσβασης που τη ζήτησε.
create function public.sales_transfer_client(p_client uuid, p_to uuid, p_request uuid default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old uuid;
  v_requester uuid;
begin
  perform authz.require('clients.transfer');
  if p_to is null then
    raise exception 'Διάλεξε τον νέο Υπεύθυνο του Πελάτη' using errcode = 'P0001';
  end if;
  select c.manager_id into v_old from public.clients c where c.id = p_client and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_request is not null then
    select r.requester_id into v_requester from public.access_requests r
     where r.id = p_request and r.client_id = p_client and r.status = 'pending';
    if not found then
      raise exception 'Το Αίτημα πρόσβασης δεν εκκρεμεί για αυτόν τον Πελάτη' using errcode = 'P0001';
    end if;
    -- Το Αίτημα κλείνει με μεταβίβαση μόνο σε αυτόν που το έκανε· αλλιώς θα έκλεινε ως «εγκρίθηκε» χωρίς να πάρει ο πωλητής τον Πελάτη.
    if v_requester is distinct from p_to then
      raise exception 'Το Αίτημα πρόσβασης κλείνει μεταβιβάζοντας τον Πελάτη σε αυτόν που το ζήτησε' using errcode = 'P0001';
    end if;
  end if;
  if v_old is not distinct from p_to then
    raise exception 'Ο Πελάτης έχει ήδη αυτόν τον Υπεύθυνο' using errcode = 'P0001';
  end if;
  update public.clients set manager_id = p_to where id = p_client;
  update public.opportunities set manager_id = p_to
   where client_id = p_client and outcome = 'open' and manager_id is not distinct from v_old;
  if p_request is not null then
    update public.access_requests
       set status = 'approved', resolution = 'transfer', decided_by = auth.uid(), decided_at = now()
     where id = p_request and client_id = p_client and status = 'pending';
  end if;
end;
$$;

create function public.sales_request_access(
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
  insert into public.access_requests (client_id, requester_id, topic, comment, source_id)
  values (p_client, auth.uid(), trim(coalesce(p_topic, '')), trim(coalesce(p_comment, '')), p_source_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- Έγκριση: ανοίγει ΜΙΑ Ευκαιρία με Υπεύθυνο αυτόν που ζήτησε (ο Πελάτης μένει στον Υπεύθυνό του).
-- Απόρριψη: με υποχρεωτικό σχόλιο. Η μεταβίβαση ολόκληρου του Πελάτη γίνεται με την sales_transfer_client.
-- Επιστρέφει το id της νέας Ευκαιρίας (έγκριση) ή null (απόρριψη).
create function public.sales_decide_access(p_request uuid, p_approve boolean, p_comment text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.access_requests;
  v_opp uuid;
begin
  perform authz.require('clients.transfer');
  select * into v_req from public.access_requests r where r.id = p_request and r.status = 'pending';
  if not found then
    raise exception 'Το Αίτημα πρόσβασης δεν εκκρεμεί' using errcode = 'P0001';
  end if;
  if p_approve then
    -- Το Αίτημα ήταν έγκυρο όταν έγινε· αν η Πηγή αποσύρθηκε από τότε, η έγκριση τη δέχεται (μόνο αυτή, μόνο εδώ).
    perform set_config('sales.allow_source', v_req.source_id::text, true);
    v_opp := public.sales_insert_opportunity(
      v_req.client_id, v_req.topic, v_req.source_id, '', v_req.requester_id,
      'Πρώτη επαφή με τον Πελάτη', public.sales_today() + 2, null);
    perform set_config('sales.allow_source', '', true);
    update public.access_requests
       set status = 'approved', resolution = 'opportunity', opportunity_id = v_opp,
           decided_by = auth.uid(), decided_at = now(), decision_comment = trim(coalesce(p_comment, ''))
     where id = p_request;
    return v_opp;
  end if;
  if length(trim(coalesce(p_comment, ''))) = 0 then
    raise exception 'Γράψε σχόλιο απόρριψης για τον πωλητή' using errcode = 'P0001';
  end if;
  update public.access_requests
     set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_comment = trim(p_comment)
   where id = p_request;
  return null;
end;
$$;

-- ───────────── Εγγραφή: Πιθανά διπλά και Συγχώνευση (B6) ─────────────

-- «Είναι άλλος»: κλείνει το σήμα, οι Πελάτες μένουν χωριστοί.
create function public.sales_resolve_duplicate(p_flag uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('clients.merge');
  update public.client_duplicate_flags
     set resolved_at = now(), resolution = 'other', resolved_by = auth.uid()
   where id = p_flag and resolved_at is null;
  if not found then
    raise exception 'Το σήμα έχει ήδη κλείσει' using errcode = 'P0001';
  end if;
end;
$$;

-- Συγχώνευση: ο absorbed αρχειοθετείται μέσα στον survivor. Οι Ευκαιρίες (ανοιχτές και κλεισμένες) και οι Δραστηριότητές του
-- περνούν στον survivor, οι ανοιχτές και στον Υπεύθυνό του. Τα κενά στοιχεία του survivor συμπληρώνονται από τον absorbed.
-- Τα εκκρεμή Αιτήματα πρόσβασης του absorbed ακυρώνονται (ο πωλητής ξαναζητά πάνω στον ενιαίο Πελάτη).
-- Όταν χτιστούν module με client_id (Συμφωνίες, Γυρίσματα…), κάθε ένα προσθέτει εδώ τη δική του μετακίνηση.
create function public.sales_merge_clients(p_survivor uuid, p_absorbed uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_s public.clients;
  v_a public.clients;
begin
  perform authz.require('clients.merge');
  if p_survivor = p_absorbed then
    raise exception 'Διάλεξε δύο διαφορετικούς Πελάτες' using errcode = 'P0001';
  end if;
  select * into v_s from public.clients c where c.id = p_survivor and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης που μένει δεν βρέθηκε' using errcode = 'P0001';
  end if;
  select * into v_a from public.clients c where c.id = p_absorbed and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης που συγχωνεύεται δεν βρέθηκε' using errcode = 'P0001';
  end if;

  perform set_config('sales.merging', 'on', true);

  update public.opportunities
     set client_id = p_survivor,
         manager_id = case when outcome = 'open' then coalesce(v_s.manager_id, manager_id) else manager_id end
   where client_id = p_absorbed;
  update public.opportunity_activities set client_id = p_survivor where client_id = p_absorbed;
  update public.access_requests set status = 'cancelled', decided_at = now()
   where client_id = p_absorbed and status = 'pending';

  update public.clients set archived_at = now(), merged_into_id = p_survivor where id = p_absorbed;
  update public.clients set
    legal_name = case when v_s.legal_name = '' then v_a.legal_name else v_s.legal_name end,
    city = case when v_s.city = '' then v_a.city else v_s.city end,
    afm = coalesce(v_s.afm, v_a.afm),
    contact_phone = case when v_s.contact_phone = '' then v_a.contact_phone else v_s.contact_phone end
  where id = p_survivor;

  -- Τρίτοι Πελάτες που έχουν ανοιχτό σήμα «μοιάζει με τον absorbed»: το πιθανό διπλό αξίζει ακόμη έλεγχο, άρα δείχνει πια
  -- στον survivor (ο absorbed αρχειοθετήθηκε). Τα σήματα των δύο ίδιων των Πελατών κλείνουν παρακάτω (θα έδειχναν στον εαυτό τους).
  update public.client_duplicate_flags
     set matches_client_id = p_survivor
   where resolved_at is null and matches_client_id = p_absorbed and client_id not in (p_survivor, p_absorbed);

  update public.client_duplicate_flags
     set resolved_at = now(), resolution = 'merged', resolved_by = auth.uid()
   where resolved_at is null and client_id in (p_survivor, p_absorbed);

  perform set_config('sales.merging', 'off', true);
end;
$$;

-- ───────────── Εγγραφή: Ρυθμίσεις › Πωλήσεις (O2) ─────────────

-- Απόσυρση Σταδίου: πρώτα μεταφέρονται οι ανοιχτές Ευκαιρίες του σε άλλο ενεργό Στάδιο (ADR 0015).
create function public.sales_retire_stage(p_stage uuid, p_move_to uuid default null) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_moved integer := 0;
begin
  perform authz.require('settings.manage');
  if p_move_to is not null and p_move_to = p_stage then
    raise exception 'Διάλεξε άλλο Στάδιο για τη μεταφορά' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.opportunities o where o.stage_id = p_stage and o.outcome = 'open') then
    if p_move_to is null then
      raise exception 'Διάλεξε Στάδιο για τη μεταφορά των ανοιχτών Ευκαιριών' using errcode = 'P0001';
    end if;
    update public.opportunities set stage_id = p_move_to where stage_id = p_stage and outcome = 'open';
    get diagnostics v_moved = row_count;
  end if;
  update public.sales_stages set retired_at = now() where id = p_stage and retired_at is null;
  return v_moved;
end;
$$;

-- Αλλαγή σειράς: ανταλλάσσει θέση με τη γειτονική ενεργή τιμή. p_list: stages | sources | loss_reasons | activity_kinds.
create function public.sales_move_list_item(p_list text, p_id uuid, p_direction text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  tbl text;
  cur integer;
  other_id uuid;
  other_sort integer;
begin
  perform authz.require('settings.manage');
  tbl := case p_list
    when 'stages' then 'sales_stages'
    when 'sources' then 'sales_sources'
    when 'loss_reasons' then 'sales_loss_reasons'
    when 'activity_kinds' then 'sales_activity_kinds'
  end;
  if tbl is null or p_direction not in ('up', 'down') then
    raise exception 'Άγνωστη λίστα ή κατεύθυνση' using errcode = 'P0001';
  end if;
  execute format('select sort from public.%I where id = $1', tbl) into cur using p_id;
  if cur is null then
    raise exception 'Η τιμή δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_direction = 'up' then
    execute format(
      'select id, sort from public.%I where retired_at is null and (sort, id) < ($1, $2) order by sort desc, id desc limit 1', tbl)
      into other_id, other_sort using cur, p_id;
  else
    execute format(
      'select id, sort from public.%I where retired_at is null and (sort, id) > ($1, $2) order by sort, id limit 1', tbl)
      into other_id, other_sort using cur, p_id;
  end if;
  if other_id is null then
    return;
  end if;
  execute format('update public.%I set sort = $1 where id = $2', tbl) using other_sort, p_id;
  execute format('update public.%I set sort = $1 where id = $2', tbl) using cur, other_id;
end;
$$;

-- ───────────── Δικαιώματα εκτέλεσης συναρτήσεων ─────────────
-- Αρχικά κανείς. Μετά ανοίγουν ρητά μόνο οι συναρτήσεις που χρειάζεται η εφαρμογή.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where (n.nspname = 'public' and p.proname like 'sales\_%')
        or (n.nspname = 'authz' and p.proname in (
              'require', 'can_see_client', 'can_see_opportunity_row', 'can_see_opportunity', 'can_work_opportunity',
              'guard_sales_list_item', 'guard_sales_settings', 'guard_client', 'guard_opportunity',
              'log_opportunity_events', 'guard_activity', 'guard_access_request', 'release_sales_on_deactivation'))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- Οι κανόνες RLS τις καλούν με τα δικαιώματα του χρήστη.
grant execute on function
  authz.can_see_client(uuid, uuid),
  authz.can_see_opportunity_row(uuid, uuid),
  authz.can_see_opportunity(uuid)
  to authenticated;

grant execute on function
  public.sales_client_list(text, integer, integer, uuid),
  public.sales_assignable_users(),
  public.sales_duplicate_pairs(),
  public.sales_list_usage(),
  public.sales_create_opportunity(uuid, jsonb, text, uuid, text, text, date),
  public.sales_update_client(uuid, text, text, text, text, text, text, text),
  public.sales_update_opportunity(uuid, text, uuid, text, date),
  public.sales_move_stage(uuid, uuid),
  public.sales_log_activity(uuid, uuid, text),
  public.sales_close_lost(uuid, uuid),
  public.sales_follow_up(uuid, text, uuid, text, date),
  public.sales_assign_opportunity(uuid, uuid),
  public.sales_transfer_client(uuid, uuid, uuid),
  public.sales_request_access(uuid, text, text, uuid),
  public.sales_decide_access(uuid, boolean, text),
  public.sales_resolve_duplicate(uuid),
  public.sales_merge_clients(uuid, uuid),
  public.sales_retire_stage(uuid, uuid),
  public.sales_move_list_item(text, uuid, text)
  to authenticated;

-- Η φόρμα της Ιστοσελίδας τρέχει στον server με service role.
grant execute on function public.sales_intake_form(jsonb, text, text, date) to service_role;

-- ───────────── Δικαιώματα πινάκων ─────────────
-- Οι πίνακες με εγγραφή μόνο από συναρτήσεις χάνουν το INSERT/UPDATE/DELETE για τους authenticated.
-- Ο ανώνυμος επισκέπτης δεν αγγίζει τίποτα.

revoke all on table
  public.sales_stages, public.sales_sources, public.sales_loss_reasons, public.sales_activity_kinds,
  public.sales_settings, public.clients, public.client_duplicate_flags, public.opportunities,
  public.opportunity_activities, public.access_requests
  from anon;

revoke insert, update, delete, truncate on table
  public.clients, public.client_duplicate_flags, public.opportunities,
  public.opportunity_activities, public.access_requests
  from authenticated;

revoke insert, delete, truncate on table public.sales_settings from authenticated;
revoke truncate on table
  public.sales_stages, public.sales_sources, public.sales_loss_reasons, public.sales_activity_kinds
  from authenticated;

-- ───────────── Ίχνος ενεργειών (μετά τα αρχικά δεδομένα) ─────────────

create trigger sales_stages_audit after insert or update or delete on public.sales_stages
  for each row execute function authz.audit_row('id');
create trigger sales_sources_audit after insert or update or delete on public.sales_sources
  for each row execute function authz.audit_row('id');
create trigger sales_loss_reasons_audit after insert or update or delete on public.sales_loss_reasons
  for each row execute function authz.audit_row('id');
create trigger sales_activity_kinds_audit after insert or update or delete on public.sales_activity_kinds
  for each row execute function authz.audit_row('id');
create trigger sales_settings_audit after update on public.sales_settings
  for each row execute function authz.audit_row('id');
create trigger clients_audit after insert or update on public.clients
  for each row execute function authz.audit_row('id');
create trigger client_duplicate_flags_audit after insert or update on public.client_duplicate_flags
  for each row execute function authz.audit_row('id');
create trigger opportunities_audit after insert or update on public.opportunities
  for each row execute function authz.audit_row('id');
create trigger access_requests_audit after insert or update on public.access_requests
  for each row execute function authz.audit_row('id');

-- ───────────── Κανόνες πρόσβασης (RLS) ─────────────

create policy "Τις λίστες πωλήσεων τις βλέπει η ομάδα"
  on public.sales_stages for select to authenticated using (authz.is_team_user());
create policy "Στάδια προσθέτει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_stages for insert to authenticated with check (authz.has('settings.manage'));
create policy "Στάδια αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_stages for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));
create policy "Στάδια διαγράφει όποιος «Διαχειρίζεται Ρυθμίσεις» (μόνο αν δεν χρησιμοποιήθηκαν)"
  on public.sales_stages for delete to authenticated using (authz.has('settings.manage'));

create policy "Τις Πηγές τις βλέπει η ομάδα"
  on public.sales_sources for select to authenticated using (authz.is_team_user());
create policy "Πηγές προσθέτει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_sources for insert to authenticated with check (authz.has('settings.manage'));
create policy "Πηγές αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_sources for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));
create policy "Πηγές διαγράφει όποιος «Διαχειρίζεται Ρυθμίσεις» (μόνο αν δεν χρησιμοποιήθηκαν)"
  on public.sales_sources for delete to authenticated using (authz.has('settings.manage'));

create policy "Τους Λόγους απώλειας τους βλέπει η ομάδα"
  on public.sales_loss_reasons for select to authenticated using (authz.is_team_user());
create policy "Λόγους απώλειας προσθέτει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_loss_reasons for insert to authenticated with check (authz.has('settings.manage'));
create policy "Λόγους απώλειας αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_loss_reasons for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));
create policy "Λόγους απώλειας διαγράφει όποιος «Διαχειρίζεται Ρυθμίσεις» (μόνο αν δεν χρησιμοποιήθηκαν)"
  on public.sales_loss_reasons for delete to authenticated using (authz.has('settings.manage'));

create policy "Τα είδη Δραστηριότητας τα βλέπει η ομάδα"
  on public.sales_activity_kinds for select to authenticated using (authz.is_team_user());
create policy "Είδη Δραστηριότητας προσθέτει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_activity_kinds for insert to authenticated with check (authz.has('settings.manage'));
create policy "Είδη Δραστηριότητας αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_activity_kinds for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));
create policy "Είδη Δραστηριότητας διαγράφει όποιος «Διαχειρίζεται Ρυθμίσεις» (μόνο αν δεν χρησιμοποιήθηκαν)"
  on public.sales_activity_kinds for delete to authenticated using (authz.has('settings.manage'));

create policy "Τη ρύθμιση πωλήσεων τη βλέπει η ομάδα"
  on public.sales_settings for select to authenticated using (authz.is_team_user());
create policy "Τη ρύθμιση πωλήσεων την αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις»"
  on public.sales_settings for update to authenticated
  using (authz.has('settings.manage')) with check (authz.has('settings.manage'));

create policy "Τον Πελάτη τον βλέπει όποιος τον αφορά"
  on public.clients for select to authenticated using (authz.can_see_client(id, manager_id));

create policy "Το σήμα «Πιθανό διπλό» το βλέπει όποιος «Συγχωνεύει Πελάτες»"
  on public.client_duplicate_flags for select to authenticated using (authz.has('clients.merge'));

create policy "Την Ευκαιρία τη βλέπει όποιος την αφορά"
  on public.opportunities for select to authenticated using (authz.can_see_opportunity_row(client_id, manager_id));

create policy "Τις Δραστηριότητες τις βλέπει όποιος βλέπει την Ευκαιρία"
  on public.opportunity_activities for select to authenticated using (authz.can_see_opportunity(opportunity_id));

create policy "Το Αίτημα πρόσβασης το βλέπει ο πωλητής που το έκανε και όσοι αναθέτουν"
  on public.access_requests for select to authenticated
  using (requester_id = auth.uid() or authz.has('clients.transfer'));
