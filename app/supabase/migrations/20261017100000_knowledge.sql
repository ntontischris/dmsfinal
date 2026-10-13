-- Γνώση Lα (#190): το θεμέλιο. Ενότητες, στοιχεία Γνώσης (Άρθρο ή Αρχείο), Κοινό, Διαχείριση (L1) και ανάγνωση (A8).
--
--  • Πίνακες κλειστοί (RLS χωρίς policies, revoke). Πρόσβαση μόνο από τις συναρτήσεις αυτού του αρχείου.
--  • Διαχείριση: Δικαίωμα «Διαχειρίζεται Γνώση» (knowledge.manage, Εύρος «όλα»), έλεγχος ΠΡΩΤΟΣ.
--  • Ανάγνωση (A8): βασικό δικαίωμα κάθε Χρήστη, χωρίς Δικαίωμα. Ποιος βλέπει τι το ορίζει μόνο το Κοινό (Λεπτομέρειες #11):
--    ακόμα και όποιος διαχειρίζεται τη Γνώση βλέπει στο A8 μόνο τα δημοσιευμένα του Κοινού του.
--
--  ΣΥΜΒΑΣΗ ΟΡΑΤΟΤΗΤΑΣ: όποιος διαβάζει Γνώση για λογαριασμό χρήστη (A8, Βοηθός, αναζήτηση, πηγές) περνά από το
--  authz.knowledge_visible_to(p_uid) ή το authz.knowledge_item_visible(p_uid, p_item). p_uid = null είναι ο Επισκέπτης
--  (μόνο δημοσιευμένα με Κοινό «δημόσιο»). Η ορατότητα υπολογίζεται σε κάθε ανάγνωση· δεν αποθηκεύεται πουθενά.
--
--  HOOK ΓΙΑ ΤΟ Lβ (μνήμη Βοηθού): η στήλη knowledge_items.content_version αυξάνεται σε ΚΑΘΕ αλλαγή περιεχομένου
--  (Ενότητα, τίτλος, Περίληψη, κείμενο, Αρχείο), κατάστασης (δημοσίευση/απόσυρση) ή Κοινού. Το text_status ΔΕΝ την αλλάζει
--  (το γράφει το Lβ, άρα δεν προκαλεί βρόχο). Το Lβ βάζει δικό του trigger, π.χ.
--      create trigger … after insert or update of content_version or delete on public.knowledge_items …
--  και δεν ξαναγράφει κανένα RPC αυτού του αρχείου. Η διαγραφή στοιχείου (μόνο πρόχειρου) είναι delete στη γραμμή.
--
--  ΑΝΑΖΗΤΗΣΗ: knowledge_items.search_tsv (ελληνικό full-text, βάρη A τίτλος, B Περίληψη, C κείμενο) και το
--  authz.knowledge_fts(p_uid, p_q, p_limit) που δίνει (item_id, rank) ήδη φιλτραρισμένα με το Κοινό. Το Lβ το συνδυάζει
--  με pgvector μέσω RRF· το knowledge_search το καλεί μόνο του (αναζήτηση με λέξεις, και στο 100% του πλαφόν).
--
--  ΑΡΧΕΙΑ: ιδιωτικό bucket «knowledge», καμία policy στο storage.objects. Ανέβασμα κατευθείαν από τον browser με signed
--  upload URL (το Vercel κόβει στα 4,5 MB, το όριο εδώ είναι 25 MB). Διαδρομές: <item>/file-<uuid>.<ext> (το Αρχείο ενός
--  στοιχείου) και <item>/img-<uuid>.<ext> (εικόνες Άρθρου). Τα RPC επιστρέφουν τις διαδρομές που πρέπει να σβηστούν·
--  τις σβήνει ο server (το Storage δεν επιτρέπει διαγραφή με SQL).

-- ───────────── Ιδιωτικό bucket ─────────────

do $$
declare
  v_mimes text[] := array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
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
    values ('knowledge', 'knowledge', false, 26214400, v_mimes)
    on conflict (id) do nothing;
  else
    insert into storage.buckets (id, name, public) values ('knowledge', 'knowledge', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ───────────── Πίνακες ─────────────

create table public.knowledge_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and length(name) between 1 and 80),
  description text not null default '' check (description = btrim(description) and length(description) <= 240),
  sort integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create unique index knowledge_sections_name_unique on public.knowledge_sections (lower(name));

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.knowledge_sections (id) on delete restrict,
  kind text not null check (kind in ('article', 'file')),
  title text not null check (title = btrim(title) and length(title) between 1 and 160),
  summary text not null default '' check (summary = btrim(summary) and length(summary) <= 400),
  body_md text check (length(body_md) <= 100000),
  storage_path text unique,
  file_name text check (length(file_name) between 1 and 200),
  mime text,
  size_bytes integer check (size_bytes between 1 and 26214400),
  -- Τι διαβάζει ο Βοηθός από το Αρχείο. Το γράφει το Lβ· null για Άρθρο και για Αρχείο χωρίς ανεβασμένο αρχείο.
  text_status text check (text_status in ('pending', 'ok', 'image_only', 'failed')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  -- Hook του Lβ (βλ. κεφαλίδα): αυξάνεται σε κάθε αλλαγή περιεχομένου, κατάστασης ή Κοινού.
  content_version integer not null default 1,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('pg_catalog.greek'::regconfig, title), 'A')
    || setweight(to_tsvector('pg_catalog.greek'::regconfig, summary), 'B')
    || setweight(to_tsvector('pg_catalog.greek'::regconfig, coalesce(body_md, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check ((kind = 'article') = (body_md is not null)),
  check (kind = 'file' or storage_path is null),
  check (num_nonnulls(storage_path, file_name, mime, size_bytes) in (0, 4)),
  check ((storage_path is null) = (text_status is null)),
  check ((status = 'published') = (published_at is not null))
);

create index knowledge_items_section_idx on public.knowledge_items (section_id);
create index knowledge_items_search_idx on public.knowledge_items using gin (search_tsv);

-- Κοινό: ένας ή περισσότεροι Ρόλοι (ομάδας ή πελάτη), ή «δημόσιο» (για όλους, και Επισκέπτες μέσω του Βοηθού).
create table public.knowledge_item_audience (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.knowledge_items (id) on delete cascade,
  role_id uuid references public.roles (id) on delete cascade,
  is_public boolean not null default false,
  check ((role_id is null) = is_public)
);

create unique index knowledge_item_audience_role_unique on public.knowledge_item_audience (item_id, role_id);
create unique index knowledge_item_audience_public_unique on public.knowledge_item_audience (item_id) where is_public;
create index knowledge_item_audience_role_idx on public.knowledge_item_audience (role_id);

alter table public.knowledge_sections enable row level security;
alter table public.knowledge_items enable row level security;
alter table public.knowledge_item_audience enable row level security;

-- ───────────── Ίχνος ─────────────
-- Το audit_entity_allowed ξαναγράφεται ολόκληρο από τον τελικό ορισμό (20261015170100_system_messages.sql), με τη Γνώση.

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
    else false
  end;
$$;

create trigger knowledge_sections_audit after insert or update or delete on public.knowledge_sections
  for each row execute function authz.audit_row();

-- Οι αλλαγές του text_status (Lβ) δεν γράφονται στο Ίχνος.
create trigger knowledge_items_audit_insert_delete after insert or delete on public.knowledge_items
  for each row execute function authz.audit_row();
create trigger knowledge_items_audit_update after update on public.knowledge_items
  for each row when ((old.section_id, old.title, old.summary, old.body_md, old.storage_path, old.status)
                     is distinct from (new.section_id, new.title, new.summary, new.body_md, new.storage_path, new.status))
  execute function authz.audit_row();

create trigger knowledge_item_audience_audit after insert or delete on public.knowledge_item_audience
  for each row execute function authz.audit_row();

-- ───────────── Hook του Lβ: content_version ─────────────

create function authz.knowledge_item_touch() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (old.section_id, old.kind, old.title, old.summary, old.body_md, old.storage_path, old.status)
     is distinct from (new.section_id, new.kind, new.title, new.summary, new.body_md, new.storage_path, new.status)
     and new.content_version = old.content_version then
    new.content_version := old.content_version + 1;
  end if;
  return new;
end;
$$;

create trigger knowledge_items_touch before update on public.knowledge_items
  for each row execute function authz.knowledge_item_touch();

-- Αλλαγή Κοινού (και διαγραφή Ρόλου που ήταν Κοινό) = αλλαγή του στοιχείου.
create function authz.knowledge_audience_touch() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.knowledge_items i
     set content_version = i.content_version + 1, updated_at = clock_timestamp()
   where i.id = coalesce(new.item_id, old.item_id);
  return null;
end;
$$;

create trigger knowledge_item_audience_touch after insert or delete on public.knowledge_item_audience
  for each row execute function authz.knowledge_audience_touch();

-- ───────────── Ορατότητα: ένα helper για όλους ─────────────

-- Οι Ρόλοι ενός Χρήστη: ομάδας (αν είναι ενεργό Μέλος) ή, για Χρήστη πελάτη, ο Ρόλος του στον τρέχοντα Πελάτη του.
create function authz.knowledge_user_roles(p_uid uuid) returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select ur.role_id
    from public.team_user_roles ur
   where p_uid is not null and ur.user_id = p_uid and authz.user_is_team(p_uid)
  union
  select cu.role_id
    from public.client_users cu
   where p_uid is not null and cu.user_id = p_uid and cu.removed_at is null
     and not authz.user_is_team(p_uid)
     and cu.client_id = authz.client_id_of_user(p_uid);
$$;

-- Τα δημοσιευμένα στοιχεία που βλέπει ο Χρήστης (p_uid = null: Επισκέπτης, μόνο «δημόσιο»).
create function authz.knowledge_visible_to(p_uid uuid) returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select i.id
    from public.knowledge_items i
   where i.status = 'published'
     and exists (
       select 1 from public.knowledge_item_audience a
        where a.item_id = i.id
          and (a.is_public or a.role_id in (select authz.knowledge_user_roles(p_uid))));
$$;

create function authz.knowledge_item_visible(p_uid uuid, p_item uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from authz.knowledge_visible_to(p_uid) as v (id) where v.id = p_item);
$$;

-- Ελληνικό full-text πάνω στα ορατά: (item_id, rank), το καλύτερο πρώτο. Κενό ερώτημα: τίποτα.
create function authz.knowledge_fts(p_uid uuid, p_q text, p_limit integer)
returns table (item_id uuid, rank real)
language sql stable security definer set search_path = ''
as $$
  with q as (select websearch_to_tsquery('pg_catalog.greek'::regconfig, left(btrim(coalesce(p_q, '')), 200)) as query)
  select i.id, ts_rank(i.search_tsv, q.query)
    from public.knowledge_items i, q
   where numnode(q.query) > 0
     and i.search_tsv @@ q.query
     and i.id in (select authz.knowledge_visible_to(p_uid))
   order by 2 desc, i.title, i.id
   limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- ───────────── Βοηθητικές ─────────────

create function authz.require_knowledge_manage() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if authz.scope('knowledge.manage') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

create function authz.knowledge_item_for_edit(p_id uuid) returns public.knowledge_items
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
begin
  select i.* into v_row from public.knowledge_items i where i.id = p_id for update;
  if not found then
    raise exception 'Το στοιχείο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_row;
end;
$$;

-- Επέκταση από το mime· null όταν δεν επιτρέπεται. Αρχείο: PDF, DOCX, PPTX, εικόνα. Εικόνα Άρθρου: μόνο εικόνα.
create function authz.knowledge_ext(p_mime text, p_purpose text) returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_mime = 'image/jpeg' then 'jpg'
    when p_mime = 'image/png' then 'png'
    when p_mime = 'image/webp' then 'webp'
    when p_mime = 'image/gif' and p_purpose = 'image' then 'gif'
    when p_purpose <> 'file' then null
    when p_mime = 'application/pdf' then 'pdf'
    when p_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when p_mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation' then 'pptx'
  end;
$$;

create function authz.knowledge_audience_json(p_item uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'isPublic', exists (select 1 from public.knowledge_item_audience a where a.item_id = p_item and a.is_public),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'kind', r.kind) order by r.kind desc, r.name)
        from public.knowledge_item_audience a join public.roles r on r.id = a.role_id
       where a.item_id = p_item), '[]'::jsonb));
$$;

create function authz.knowledge_file_json(i public.knowledge_items) returns jsonb
language sql stable set search_path = ''
as $$
  select case when i.storage_path is null then null
    else jsonb_build_object('name', i.file_name, 'mime', i.mime, 'size', i.size_bytes) end;
$$;

-- ───────────── RPC Διαχείρισης: Ενότητες ─────────────

-- { id?, name, description } → { id }
create function public.knowledge_section_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_description text := btrim(coalesce(p->>'description', ''));
begin
  perform authz.require_knowledge_manage();
  if length(v_name) not between 1 and 80 then
    raise exception 'Το όνομα της Ενότητας θέλει από 1 έως 80 χαρακτήρες' using errcode = 'P0001';
  end if;
  if length(v_description) > 240 then
    raise exception 'Η περιγραφή είναι μία πρόταση, έως 240 χαρακτήρες' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.knowledge_sections s where lower(s.name) = lower(v_name) and s.id is distinct from v_id) then
    raise exception 'Υπάρχει ήδη Ενότητα με αυτό το όνομα' using errcode = 'P0001';
  end if;
  if v_id is null then
    insert into public.knowledge_sections (name, description, sort, updated_by)
    values (v_name, v_description, coalesce((select max(s.sort) from public.knowledge_sections s), 0) + 1, auth.uid())
    returning id into v_id;
  else
    update public.knowledge_sections s
       set name = v_name, description = v_description, updated_at = clock_timestamp(), updated_by = auth.uid()
     where s.id = v_id;
    if not found then
      raise exception 'Η Ενότητα δεν βρέθηκε' using errcode = 'P0001';
    end if;
  end if;
  return jsonb_build_object('id', v_id);
end;
$$;

create function public.knowledge_section_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_knowledge_manage();
  if exists (select 1 from public.knowledge_items i where i.section_id = p_id) then
    raise exception 'Η Ενότητα έχει στοιχεία· μετακίνησέ τα πρώτα σε άλλη Ενότητα' using errcode = 'P0001';
  end if;
  delete from public.knowledge_sections s where s.id = p_id;
  if not found then
    raise exception 'Η Ενότητα δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Μία θέση πάνω ή κάτω (p_direction: up | down). Στην άκρη δεν αλλάζει τίποτα.
create function public.knowledge_section_reorder(p_id uuid, p_direction text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_section public.knowledge_sections;
  v_other public.knowledge_sections;
begin
  perform authz.require_knowledge_manage();
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Άγνωστη κατεύθυνση' using errcode = 'P0001';
  end if;
  select s.* into v_section from public.knowledge_sections s where s.id = p_id for update;
  if not found then
    raise exception 'Η Ενότητα δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_direction = 'up' then
    select s.* into v_other from public.knowledge_sections s
     where (s.sort, s.id) < (v_section.sort, v_section.id) order by s.sort desc, s.id desc limit 1 for update;
  else
    select s.* into v_other from public.knowledge_sections s
     where (s.sort, s.id) > (v_section.sort, v_section.id) order by s.sort, s.id limit 1 for update;
  end if;
  if v_other.id is null then
    return;
  end if;
  -- Ανταλλαγή θέσεων· με ίσα sort (παλιά δεδομένα) η σειρά ξεκαθαρίζει με +1.
  update public.knowledge_sections s set sort = v_other.sort, updated_by = auth.uid() where s.id = v_section.id;
  update public.knowledge_sections s
     set sort = case when v_other.sort = v_section.sort
                     then v_section.sort + case when p_direction = 'up' then 1 else -1 end
                     else v_section.sort end,
         updated_by = auth.uid()
   where s.id = v_other.id;
end;
$$;

-- ───────────── RPC Διαχείρισης: στοιχεία ─────────────

-- { id?, sectionId, kind (μόνο στη δημιουργία), title, summary, body (Άρθρο) } → { id }
-- Δημοσιευμένο αλλάζει και η αλλαγή ισχύει αμέσως, αλλά δεν μένει χωρίς Περίληψη ή κείμενο.
create function public.knowledge_item_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_section uuid := nullif(p->>'sectionId', '')::uuid;
  v_kind text := p->>'kind';
  v_title text := btrim(coalesce(p->>'title', ''));
  v_summary text := btrim(coalesce(p->>'summary', ''));
  v_body text := coalesce(p->>'body', '');
  v_row public.knowledge_items;
begin
  perform authz.require_knowledge_manage();
  if v_section is null or not exists (select 1 from public.knowledge_sections s where s.id = v_section) then
    raise exception 'Διάλεξε Ενότητα' using errcode = 'P0001';
  end if;
  if length(v_title) not between 1 and 160 then
    raise exception 'Ο τίτλος θέλει από 1 έως 160 χαρακτήρες' using errcode = 'P0001';
  end if;
  if length(v_summary) > 400 then
    raise exception 'Η Περίληψη είναι 1–2 γραμμές, έως 400 χαρακτήρες' using errcode = 'P0001';
  end if;
  if length(v_body) > 100000 then
    raise exception 'Το κείμενο ξεπερνά τους 100.000 χαρακτήρες' using errcode = 'P0001';
  end if;
  if v_id is null then
    if v_kind is null or v_kind not in ('article', 'file') then
      raise exception 'Διάλεξε Άρθρο ή Αρχείο' using errcode = 'P0001';
    end if;
    insert into public.knowledge_items (section_id, kind, title, summary, body_md, created_by, updated_by)
    values (v_section, v_kind, v_title, v_summary, case when v_kind = 'article' then v_body end, auth.uid(), auth.uid())
    returning id into v_id;
    return jsonb_build_object('id', v_id);
  end if;
  v_row := authz.knowledge_item_for_edit(v_id);
  if v_kind is not null and v_kind <> v_row.kind then
    raise exception 'Το είδος του στοιχείου δεν αλλάζει' using errcode = 'P0001';
  end if;
  if v_row.status = 'published' and v_summary = '' then
    raise exception 'Δημοσιευμένο στοιχείο δεν μένει χωρίς Περίληψη' using errcode = 'P0001';
  end if;
  if v_row.status = 'published' and v_row.kind = 'article' and btrim(v_body) = '' then
    raise exception 'Δημοσιευμένο Άρθρο δεν μένει χωρίς κείμενο' using errcode = 'P0001';
  end if;
  update public.knowledge_items i
     set section_id = v_section, title = v_title, summary = v_summary,
         body_md = case when i.kind = 'article' then v_body end,
         updated_at = clock_timestamp(), updated_by = auth.uid()
   where i.id = v_id;
  return jsonb_build_object('id', v_id);
end;
$$;

-- Δημοσίευση: μόνο με Περίληψη, Κοινό και περιεχόμενο (κείμενο ή ανεβασμένο Αρχείο).
create function public.knowledge_item_publish(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
begin
  perform authz.require_knowledge_manage();
  v_row := authz.knowledge_item_for_edit(p_id);
  if v_row.status = 'published' then
    raise exception 'Το στοιχείο είναι ήδη δημοσιευμένο' using errcode = 'P0001';
  end if;
  if v_row.summary = '' then
    raise exception 'Γράψε Περίληψη πριν από τη δημοσίευση' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.knowledge_item_audience a where a.item_id = p_id) then
    raise exception 'Διάλεξε Κοινό πριν από τη δημοσίευση' using errcode = 'P0001';
  end if;
  if v_row.kind = 'article' and btrim(v_row.body_md) = '' then
    raise exception 'Γράψε το κείμενο του Άρθρου πριν από τη δημοσίευση' using errcode = 'P0001';
  end if;
  if v_row.kind = 'file' and v_row.storage_path is null then
    raise exception 'Ανέβασε το Αρχείο πριν από τη δημοσίευση' using errcode = 'P0001';
  end if;
  update public.knowledge_items i
     set status = 'published', published_at = clock_timestamp(), updated_at = clock_timestamp(), updated_by = auth.uid()
   where i.id = p_id;
end;
$$;

-- Απόσυρση: γυρίζει σε πρόχειρο (ο Βοηθός το ξεχνά αμέσως, μέσω του content_version).
create function public.knowledge_item_unpublish(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
begin
  perform authz.require_knowledge_manage();
  v_row := authz.knowledge_item_for_edit(p_id);
  if v_row.status <> 'published' then
    raise exception 'Το στοιχείο είναι ήδη πρόχειρο' using errcode = 'P0001';
  end if;
  update public.knowledge_items i
     set status = 'draft', published_at = null, updated_at = clock_timestamp(), updated_by = auth.uid()
   where i.id = p_id;
end;
$$;

-- Οριστική διαγραφή, μόνο πρόχειρου. Επιστρέφει { removedPaths } (Αρχείο και εικόνες) για να τα σβήσει ο server.
create function public.knowledge_item_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
  v_paths jsonb;
begin
  perform authz.require_knowledge_manage();
  v_row := authz.knowledge_item_for_edit(p_id);
  if v_row.status = 'published' then
    raise exception 'Δημοσιευμένο στοιχείο δεν διαγράφεται· απόσυρέ το πρώτα' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(x.name order by x.name), '[]'::jsonb) into v_paths
    from (
      select o.name from storage.objects o where o.bucket_id = 'knowledge' and o.name like p_id::text || '/%'
      union
      select v_row.storage_path where v_row.storage_path is not null
    ) x;
  delete from public.knowledge_items i where i.id = p_id;
  return jsonb_build_object('removedPaths', v_paths);
end;
$$;

-- Κοινό: οι Ρόλοι (ομάδας ή πελάτη) και το «δημόσιο». Γράφονται μόνο οι διαφορές.
create function public.knowledge_item_set_audience(p_id uuid, p_roles uuid[], p_public boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
  v_roles uuid[] := coalesce((select array_agg(distinct r) from unnest(coalesce(p_roles, '{}')) r where r is not null), '{}');
  v_public boolean := coalesce(p_public, false);
begin
  perform authz.require_knowledge_manage();
  v_row := authz.knowledge_item_for_edit(p_id);
  if exists (select 1 from unnest(v_roles) r where not exists (select 1 from public.roles x where x.id = r)) then
    raise exception 'Ένας Ρόλος του Κοινού δεν υπάρχει πια' using errcode = 'P0001';
  end if;
  if v_row.status = 'published' and cardinality(v_roles) = 0 and not v_public then
    raise exception 'Δημοσιευμένο στοιχείο χρειάζεται Κοινό· απόσυρέ το πρώτα' using errcode = 'P0001';
  end if;
  delete from public.knowledge_item_audience a
   where a.item_id = p_id
     and ((a.is_public and not v_public) or (not a.is_public and not (a.role_id = any (v_roles))));
  insert into public.knowledge_item_audience (item_id, role_id, is_public)
  select p_id, r, false from unnest(v_roles) r
   where not exists (select 1 from public.knowledge_item_audience a where a.item_id = p_id and a.role_id = r);
  if v_public and not exists (select 1 from public.knowledge_item_audience a where a.item_id = p_id and a.is_public) then
    insert into public.knowledge_item_audience (item_id, role_id, is_public) values (p_id, null, true);
  end if;
  update public.knowledge_items i set updated_by = auth.uid() where i.id = p_id;
end;
$$;

-- { counts: { all, draft, published }, sections: [{ id, name, description, sort, itemCount }],
--   items: [{ id, sectionId, sectionName, kind, title, summary, status, publishedAt, updatedAt, updatedByName,
--             textStatus, audience: { isPublic, roles: [{ id, name, kind }] } }] }
-- Φίλτρα: p_status (draft | published | null = όλα), p_section (null = όλες).
create function public.knowledge_manage_list(p_status text default null, p_section uuid default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_knowledge_manage();
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
                 'all', count(*), 'draft', count(*) filter (where i.status = 'draft'),
                 'published', count(*) filter (where i.status = 'published'))
                 from public.knowledge_items i),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'name', s.name, 'description', s.description, 'sort', s.sort,
               'itemCount', (select count(*) from public.knowledge_items i where i.section_id = s.id))
             order by s.sort, s.id)
        from public.knowledge_sections s), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'sectionId', i.section_id, 'sectionName', s.name, 'kind', i.kind, 'title', i.title,
               'summary', i.summary, 'status', i.status, 'publishedAt', i.published_at, 'updatedAt', i.updated_at,
               'updatedByName', (select t.name from public.team_users t where t.user_id = i.updated_by),
               'textStatus', i.text_status, 'audience', authz.knowledge_audience_json(i.id))
             order by i.updated_at desc, i.id)
        from public.knowledge_items i join public.knowledge_sections s on s.id = i.section_id
       where (p_status is null or i.status = p_status) and (p_section is null or i.section_id = p_section)), '[]'::jsonb));
end;
$$;

-- Ο επεξεργαστής: { item: {…} | null, sections: [{ id, name }], roles: [{ id, name, kind }] }.
-- item = { id, sectionId, kind, title, summary, body, status, publishedAt, updatedAt, textStatus,
--          file: { name, mime, size } | null, audience: { isPublic, roles } }. p_id = null: μόνο οι επιλογές.
create function public.knowledge_manage_item(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_item jsonb;
begin
  perform authz.require_knowledge_manage();
  if p_id is not null then
    select jsonb_build_object(
             'id', i.id, 'sectionId', i.section_id, 'kind', i.kind, 'title', i.title, 'summary', i.summary,
             'body', i.body_md, 'status', i.status, 'publishedAt', i.published_at, 'updatedAt', i.updated_at,
             'textStatus', i.text_status, 'file', authz.knowledge_file_json(i),
             'audience', authz.knowledge_audience_json(i.id))
      into v_item
      from public.knowledge_items i where i.id = p_id;
    if v_item is null then
      raise exception 'Το στοιχείο δεν βρέθηκε' using errcode = 'P0001';
    end if;
  end if;
  return jsonb_build_object(
    'item', v_item,
    'sections', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.sort, s.id)
                            from public.knowledge_sections s), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'kind', r.kind)
                                        order by r.kind desc, r.is_owner desc, r.name)
                         from public.roles r), '[]'::jsonb));
end;
$$;

-- ───────────── RPC Διαχείρισης: αρχεία ─────────────

-- Άδεια ανεβάσματος: p_purpose file (το Αρχείο του στοιχείου) ή image (εικόνα μέσα σε Άρθρο). → { path }
-- Η διαδρομή φτιάχνεται εδώ· ο server δίνει signed upload URL μόνο γι' αυτήν.
create function public.knowledge_upload_slot(p_item uuid, p_purpose text, p_mime text, p_size bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
  v_ext text;
begin
  perform authz.require_knowledge_manage();
  select i.* into v_row from public.knowledge_items i where i.id = p_item;
  if not found then
    raise exception 'Το στοιχείο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_purpose is null or p_purpose not in ('file', 'image') then
    raise exception 'Άγνωστο είδος ανεβάσματος' using errcode = 'P0001';
  end if;
  if (p_purpose = 'file') <> (v_row.kind = 'file') then
    raise exception 'Το Αρχείο ανεβαίνει σε στοιχείο «Αρχείο», η εικόνα σε Άρθρο' using errcode = 'P0001';
  end if;
  v_ext := authz.knowledge_ext(p_mime, p_purpose);
  if v_ext is null then
    raise exception '%', case when p_purpose = 'file' then 'Επιτρέπονται PDF, DOCX, PPTX και εικόνες'
                              else 'Επιτρέπονται εικόνες JPG, PNG, WEBP και GIF' end using errcode = 'P0001';
  end if;
  if p_size is null or p_size not between 1 and 26214400 then
    raise exception 'Το αρχείο ξεπερνά τα 25 MB' using errcode = 'P0001';
  end if;
  return jsonb_build_object('path',
    p_item::text || '/' || case when p_purpose = 'file' then 'file-' else 'img-' end || gen_random_uuid()::text || '.' || v_ext);
end;
$$;

-- Το Αρχείο ανέβηκε: γράφεται στο στοιχείο (text_status = pending, για το Lβ). → { previousPath } για να σβηστεί.
create function public.knowledge_item_attach_file(p_item uuid, p_path text, p_name text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
  v_name text := btrim(coalesce(p_name, ''));
  v_object storage.objects;
  v_ext text;
  v_mime text;
  v_size bigint;
begin
  perform authz.require_knowledge_manage();
  v_row := authz.knowledge_item_for_edit(p_item);
  if v_row.kind <> 'file' then
    raise exception 'Το Αρχείο ανεβαίνει σε στοιχείο «Αρχείο», η εικόνα σε Άρθρο' using errcode = 'P0001';
  end if;
  if length(v_name) not between 1 and 200 then
    raise exception 'Το όνομα του αρχείου θέλει από 1 έως 200 χαρακτήρες' using errcode = 'P0001';
  end if;
  if p_path is null or p_path !~ ('^' || p_item::text || '/file-[0-9a-f-]{36}[.](pdf|docx|pptx|jpg|png|webp)$') then
    raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
  end if;
  select o.* into v_object from storage.objects o where o.bucket_id = 'knowledge' and o.name = p_path;
  if not found then
    raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
  end if;
  v_ext := substring(p_path from '[.]([a-z]+)$');
  v_mime := case v_ext
    when 'pdf' then 'application/pdf'
    when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    when 'pptx' then 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    when 'jpg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp' end;
  if v_object.metadata->>'mimetype' is not null and v_object.metadata->>'mimetype' <> v_mime then
    raise exception 'Το αρχείο δεν ανέβηκε σωστά' using errcode = 'P0001';
  end if;
  v_size := case when (v_object.metadata->>'size') ~ '^[0-9]{1,12}$' then (v_object.metadata->>'size')::bigint end;
  if v_size is not null and v_size not between 1 and 26214400 then
    raise exception 'Το αρχείο ξεπερνά τα 25 MB' using errcode = 'P0001';
  end if;
  update public.knowledge_items i
     set storage_path = p_path, file_name = v_name, mime = v_mime, size_bytes = coalesce(v_size, 1)::integer,
         text_status = 'pending', updated_at = clock_timestamp(), updated_by = auth.uid()
   where i.id = p_item;
  return jsonb_build_object('previousPath', case when v_row.storage_path is distinct from p_path then v_row.storage_path end);
end;
$$;

-- ───────────── RPC ανάγνωσης (κάθε συνδεδεμένος Χρήστης, μόνο το Κοινό του) ─────────────

-- { sections: [{ id, name, description, items: [{ id, kind, title, summary, updatedAt }] }] }
-- Μόνο Ενότητες με ορατά στοιχεία, στη σειρά τους.
create function public.knowledge_library() returns jsonb
language sql stable security definer set search_path = ''
as $$
  with visible as (select v.id from authz.knowledge_visible_to(auth.uid()) as v (id))
  select jsonb_build_object('sections', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', s.id, 'name', s.name, 'description', s.description,
             'items', (select jsonb_agg(jsonb_build_object(
                                'id', i.id, 'kind', i.kind, 'title', i.title, 'summary', i.summary, 'updatedAt', i.updated_at)
                              order by lower(i.title), i.id)
                         from public.knowledge_items i where i.section_id = s.id and i.id in (select id from visible)))
           order by s.sort, s.id)
      from public.knowledge_sections s
     where exists (select 1 from public.knowledge_items i where i.section_id = s.id and i.id in (select id from visible))
  ), '[]'::jsonb));
$$;

-- { id, kind, title, summary, body, sectionId, sectionName, updatedAt, file: { name, mime, size } | null, textStatus }
-- textStatus μόνο για όσους διαχειρίζονται τη Γνώση (αλλιώς null). Ανύπαρκτο, πρόχειρο ή εκτός Κοινού: 42501, ίδιο μήνυμα.
create function public.knowledge_item_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not authz.knowledge_item_visible(auth.uid(), p_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select jsonb_build_object(
           'id', i.id, 'kind', i.kind, 'title', i.title, 'summary', i.summary, 'body', i.body_md,
           'sectionId', s.id, 'sectionName', s.name, 'updatedAt', i.updated_at, 'file', authz.knowledge_file_json(i),
           'textStatus', case when authz.has('knowledge.manage') then i.text_status end)
    into v_result
    from public.knowledge_items i join public.knowledge_sections s on s.id = i.section_id
   where i.id = p_id;
  return v_result;
end;
$$;

-- { items: [{ id, kind, title, summary, sectionName }] }, έως 50, το καλύτερο πρώτο. Μόνο ορατά στοιχεία.
create function public.knowledge_search(p_q text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'kind', i.kind, 'title', i.title, 'summary', i.summary, 'sectionName', s.name)
           order by f.rank desc, i.title, i.id)
      from authz.knowledge_fts(auth.uid(), p_q, 50) f
      join public.knowledge_items i on i.id = f.item_id
      join public.knowledge_sections s on s.id = i.section_id
  ), '[]'::jsonb));
$$;

-- Λήψη Αρχείου: { path, name } για ορατό στοιχείο, ή για όποιον διαχειρίζεται τη Γνώση (προεπισκόπηση στο L1).
-- Αλλιώς 42501, ίδιο μήνυμα για ανύπαρκτο και για μη ορατό.
create function public.knowledge_file_path(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_row public.knowledge_items;
begin
  select i.* into v_row from public.knowledge_items i where i.id = p_id;
  if not found or v_row.storage_path is null
     or not (authz.has('knowledge.manage') or authz.knowledge_item_visible(auth.uid(), p_id)) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object('path', v_row.storage_path, 'name', v_row.file_name);
end;
$$;

-- Εικόνα μέσα σε Άρθρο: η διαδρομή, για ορατό Άρθρο ή για όποιον διαχειρίζεται τη Γνώση. Αλλιώς 42501.
create function public.knowledge_image_path(p_item uuid, p_name text) returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_name is null or p_name !~ '^img-[0-9a-f-]{36}[.](jpg|png|webp|gif)$'
     or not exists (select 1 from public.knowledge_items i where i.id = p_item and i.kind = 'article')
     or not (authz.has('knowledge.manage') or authz.knowledge_item_visible(auth.uid(), p_item)) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return p_item::text || '/' || p_name;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.knowledge_item_touch(), authz.knowledge_audience_touch(), authz.knowledge_user_roles(uuid),
  authz.knowledge_visible_to(uuid), authz.knowledge_item_visible(uuid, uuid), authz.knowledge_fts(uuid, text, integer),
  authz.require_knowledge_manage(), authz.knowledge_item_for_edit(uuid), authz.knowledge_ext(text, text),
  authz.knowledge_audience_json(uuid), authz.knowledge_file_json(public.knowledge_items)
  from public, anon, authenticated;

revoke all on function
  public.knowledge_section_save(jsonb), public.knowledge_section_delete(uuid), public.knowledge_section_reorder(uuid, text),
  public.knowledge_item_save(jsonb), public.knowledge_item_publish(uuid), public.knowledge_item_unpublish(uuid),
  public.knowledge_item_delete(uuid), public.knowledge_item_set_audience(uuid, uuid[], boolean),
  public.knowledge_manage_list(text, uuid), public.knowledge_manage_item(uuid),
  public.knowledge_upload_slot(uuid, text, text, bigint), public.knowledge_item_attach_file(uuid, text, text),
  public.knowledge_library(), public.knowledge_item_get(uuid), public.knowledge_search(text),
  public.knowledge_file_path(uuid), public.knowledge_image_path(uuid, text)
  from public, anon;

grant execute on function
  public.knowledge_section_save(jsonb), public.knowledge_section_delete(uuid), public.knowledge_section_reorder(uuid, text),
  public.knowledge_item_save(jsonb), public.knowledge_item_publish(uuid), public.knowledge_item_unpublish(uuid),
  public.knowledge_item_delete(uuid), public.knowledge_item_set_audience(uuid, uuid[], boolean),
  public.knowledge_manage_list(text, uuid), public.knowledge_manage_item(uuid),
  public.knowledge_upload_slot(uuid, text, text, bigint), public.knowledge_item_attach_file(uuid, text, text),
  public.knowledge_library(), public.knowledge_item_get(uuid), public.knowledge_search(text),
  public.knowledge_file_path(uuid), public.knowledge_image_path(uuid, text)
  to authenticated;

revoke all on table public.knowledge_sections, public.knowledge_items, public.knowledge_item_audience
  from anon, authenticated;
