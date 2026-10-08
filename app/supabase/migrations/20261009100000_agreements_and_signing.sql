-- Συμφωνίες (D1, D2, D4, D5), Σύνδεσμος πρότασης και υπογραφή, Ρυθμίσεις › Συμφωνίες (O3). Κεφ. 2, 3, 5, ADR 0008, 0009, 0015, 0016, 0017, 0018.
--
-- Αρχές:
--  • Η Συμφωνία γεννιέται πάντα μέσα σε Ευκαιρία (μία Συμφωνία ανά Ευκαιρία). Ο Πελάτης προκύπτει από την Ευκαιρία, άρα η
--    συγχώνευση Πελατών (sales_merge_clients) δεν χρειάζεται καμία αλλαγή εδώ.
--  • Όλοι οι πίνακες είναι κλειστοί για την εφαρμογή (χωρίς policies, χωρίς privileges). Οι εγγραφές γίνονται από συναρτήσεις
--    public.agreement_* / agreements_* (security definer, με έλεγχο Δικαιώματος στο σώμα τους), οι αναγνώσεις από τις
--    public.agreement_view, agreements_list, agreement_for_opportunity, agreement_approvals_view, agreement_outbox_view.
--  • Τα ποσά και το κόστος κρύβονται στα δεδομένα (ADR 0007), όπως στον Κατάλογο: η τιμή ζει σε δικούς της πίνακες
--    (agreement_amounts, agreement_line_amounts: «Βλέπει ποσά»), οι ώρες και το Άμεσο κόστος σε άλλους (agreement_line_costs,
--    agreement_costs: «Βλέπει κόστος και κερδοφορία»). Οι συναρτήσεις ανάγνωσης δίνουν null σε ό,τι ο Χρήστης δεν δικαιούται.
--  • Η Συμφωνία είναι αντίγραφο: η γραμμή κρατά τιμή, ώρες, Παροχές και ό,τι έδειχνε ο Κατάλογος όταν μπήκε (catalog_*), οι Όροι
--    αντιγράφονται από τις προεπιλογές και οι προεπιλογές της στιγμής κρατιούνται στο agreement_baselines. Έτσι μια αλλαγή του
--    Καταλόγου ή των προεπιλογών δεν γίνεται Παρέκκλιση σε ανοιχτή πρόταση (ADR 0009, 0015).
--  • Η υπογραφή παγώνει τα πάντα (trigger, ισχύει και για τον service role) και κλείνει την Ευκαιρία ως κερδισμένη μέσα από το
--    set_config('sales.system_close', 'on', true) του ADR 0009.
--  • Ο Σύνδεσμος πρότασης είναι ένα μυστικό: αποθηκεύεται μόνο ως sha256, το καθαρό κείμενο μένει στο agreement_outbox ώσπου να
--    σταλεί. Η δημόσια σελίδα (D5) μιλά μόνο με τις public.agreement_public_* (security definer, ανώνυμος), που επιστρέφουν
--    στοιχεία μόνο αυτής της πρότασης και ποτέ κόστος.
--  • ΣΗΜΕΙΑ ΕΠΕΚΤΑΣΗΣ (ο πάροχος email δεν είναι συνδεδεμένος, ADR 0016): κάθε μήνυμα (Σύνδεσμος, κωδικός υπογραφής, αντίγραφο,
--    πρόσκληση) γράφεται στο agreement_outbox. Όσο agreement_defaults.email_sender_connected = false το μήνυμα το παραδίδει η
--    ομάδα με το χέρι (D2: «Αντιγραφή συνδέσμου», κωδικός που διαβάζεται στον πελάτη τηλεφωνικά). Όταν συνδεθεί ο πάροχος
--    προστίθεται μόνο ο αποστολέας (service role: public.agreement_outbox_claim / agreement_outbox_done) και το flag αλλάζει.
--  • ΕΚΤΟΣ: λύση (θέλει Τιμολόγηση και κόψιμο Περιόδου), ανανέωση και «Χωρίς συνέχιση» (θέλουν cron και Περιόδους), δόσεις που
--    γεννούν Τιμολογητέα, Περίοδοι ως εγγραφές με Παροχές που καταναλώνονται (θέλουν Γυρίσματα και Παραδοτέα), PDF (δεν υπάρχει
--    βιβλιοθήκη στο app). Το σχέδιο των Περιόδων (public.agreement_view → periods) υπολογίζεται από την Έναρξη και τη Διάρκεια, χωρίς
--    πίνακα. Η αυτόματη συνέχιση ('auto') καταχωρείται και φαίνεται στην πρόταση, αλλά δεν εκτελείται: μια τέτοια Συμφωνία δεν
--    λήγει μόνη της.

-- ───────────── Αλλαγές σε πίνακες άλλων modules ─────────────

-- Όριο αλλαγών ανά είδος Παροχής (γύροι αλλαγών, null = το είδος δεν έχει γύρους). Αντιγράφεται στη Συμφωνία όταν γεννιέται.
alter table public.provision_kinds add column revision_limit smallint check (revision_limit between 1 and 20);

-- Αρχικές τιμές χωρίς να γραφτεί Ίχνος για την αρχική ρύθμιση (όπως τα υπόλοιπα seeds).
alter table public.provision_kinds disable trigger provision_kinds_audit;
update public.provision_kinds set revision_limit = case code
    when 'reel' then 2 when 'video' then 2 when 'photo' then 1 when 'podcast_episode' then 1 end
 where code in ('reel', 'video', 'photo', 'podcast_episode');
alter table public.provision_kinds enable trigger provision_kinds_audit;

-- Κάθε βήμα της Συμφωνίας γράφεται και ως Δραστηριότητα της Ευκαιρίας (ADR 0009): ένα είδος γεγονότος με κείμενο και
-- subject_id = η Συμφωνία. Το κείμενο το γράφει η βάση.
alter table public.opportunity_activities drop constraint opportunity_activities_event_check;
alter table public.opportunity_activities
  add constraint opportunity_activities_event_check
  check (event in ('created', 'stage_changed', 'assigned', 'lost', 'agreement'));

-- ───────────── Προεπιλογές (O3): μία γραμμή ─────────────
-- Αντιγράφονται σε κάθε νέα Συμφωνία. Αλλάζουν μόνο προς τα εμπρός (ADR 0015).

create table public.agreement_defaults (
  id boolean primary key default true check (id),
  proposal_validity_days integer not null default 21 check (proposal_validity_days between 1 and 365),
  standard_discount_percent numeric(5, 2) not null default 10 check (standard_discount_percent between 0 and 100),
  standard_discount_months integer not null default 2 check (standard_discount_months between 0 and 60),
  advance_percent numeric(5, 2) not null default 50 check (advance_percent between 0 and 100),
  payment_days_monthly integer not null default 15 check (payment_days_monthly between 0 and 365),
  payment_days_one_off integer not null default 15 check (payment_days_one_off between 0 and 365),
  unused_provisions text not null default 'next_period' check (unused_provisions in ('lost', 'next_period', 'accumulate')),
  grace_days integer not null default 10 check (grace_days between 0 and 365),
  duration_months integer not null default 6 check (duration_months between 1 and 60),
  renewal text not null default 'new_opportunity' check (renewal in ('new_opportunity', 'auto')),
  dissolution_notice_days integer not null default 30 check (dissolution_notice_days between 0 and 365),
  dissolution_fee numeric(12, 2) not null default 0 check (dissolution_fee >= 0 and dissolution_fee < 10000000),
  filming_notice_hours integer not null default 48 check (filming_notice_hours between 0 and 720),
  filming_cancel_hours integer not null default 24 check (filming_cancel_hours between 0 and 720),
  late_cancel_burns boolean not null default true,
  no_show_burns boolean not null default true,
  -- Το σημείο επέκτασης του email: false = η ομάδα παραδίδει τα μηνύματα με το χέρι. Το αλλάζει μόνο migration/service role.
  email_sender_connected boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.agreement_defaults default values;

-- ───────────── Συμφωνία ─────────────
-- state: κύκλος ζωής · path: πορεία της πρότασης (σταθερή λίστα, ADR 0009). Μετά την υπογραφή path = 'signed'.
-- 'dissolved' προβλέπεται για το module Λύσης· τίποτα εδώ δεν το βάζει.

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.opportunities (id),
  kind text not null check (kind in ('monthly', 'one_off')),
  title text not null check (length(trim(title)) > 0 and length(title) <= 200),
  language text not null default 'el' check (language in ('el', 'en')),
  state text not null default 'proposal' check (state in ('proposal', 'signed', 'active', 'expired', 'dissolved')),
  path text not null default 'draft' check (path in ('draft', 'awaiting_approval', 'sent', 'expired', 'signed', 'lost')),
  revision integer not null default 1 check (revision >= 1),
  valid_until date not null,
  -- null = «με την υπογραφή». Στην υπογραφή γίνεται πάντα ημερομηνία (η μέρα της υπογραφής αν η Έναρξη πέρασε).
  start_on date,
  duration_months integer check (duration_months between 1 and 60),
  end_on date,
  payment_days integer not null check (payment_days between 0 and 365),
  unused_provisions text not null check (unused_provisions in ('lost', 'next_period', 'accumulate')),
  grace_days integer not null default 0 check (grace_days between 0 and 365),
  renewal text check (renewal in ('new_opportunity', 'auto')),
  dissolution_notice_days integer not null default 0 check (dissolution_notice_days between 0 and 365),
  filming_notice_hours integer not null check (filming_notice_hours between 0 and 720),
  filming_cancel_hours integer not null check (filming_cancel_hours between 0 and 720),
  late_cancel_burns boolean not null,
  no_show_burns boolean not null,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((kind = 'monthly') = (duration_months is not null)),
  check ((kind = 'monthly') = (renewal is not null)),
  check (kind = 'monthly' or end_on is null),
  check ((state <> 'proposal') = (path = 'signed')),
  check ((state <> 'proposal') = (signed_at is not null))
);

create index agreements_state_idx on public.agreements (state, path);

-- Ποσά της Συμφωνίας (έκπτωση πρώτων μηνών, ρήτρα λύσης, ΦΠΑ της στιγμής της αποστολής). Μόνο «Βλέπει ποσά».
create table public.agreement_amounts (
  agreement_id uuid primary key references public.agreements (id),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  discount_months integer not null default 0 check (discount_months between 0 and 60),
  dissolution_fee numeric(12, 2) not null default 0 check (dissolution_fee >= 0 and dissolution_fee < 10000000),
  vat_rate numeric(5, 2) not null default 24 check (vat_rate >= 0 and vat_rate < 100),
  check ((discount_percent > 0) = (discount_months > 0))
);

-- Οι προεπιλογές και ο Κατάλογος όπως ήταν όταν γεννήθηκε η πρόταση: με αυτές γίνεται η σύγκριση της Παρέκκλισης (ADR 0009).
create table public.agreement_baselines (
  agreement_id uuid primary key references public.agreements (id),
  data jsonb not null
);

-- Όριο αλλαγών ανά είδος Παροχής για αυτή τη Συμφωνία (αντίγραφο της προεπιλογής).
create table public.agreement_revision_limits (
  agreement_id uuid not null references public.agreements (id),
  kind_id uuid not null references public.provision_kinds (id),
  rounds smallint not null check (rounds between 1 and 20),
  primary key (agreement_id, kind_id)
);

create index agreement_revision_limits_kind_idx on public.agreement_revision_limits (kind_id);

-- Δόσεις σε ορόσημα (μόνο εφάπαξ). Το σύστημα προειδοποιεί αν δεν κάνουν 100%, δεν μπλοκάρει· Τιμολογητέα γεννά το module Τιμολόγηση.
create table public.agreement_milestones (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  position integer not null,
  trigger text not null check (trigger in ('signature', 'date', 'filming_done', 'delivered')),
  percent numeric(5, 2) not null check (percent > 0 and percent <= 100),
  due_on date,
  check ((trigger = 'date') = (due_on is not null))
);

create index agreement_milestones_idx on public.agreement_milestones (agreement_id, position);

-- ───────────── Γραμμές ─────────────
-- Η γραμμή κρατά ό,τι ήταν ο Κατάλογος όταν μπήκε. line_kind 'free' = ελεύθερη γραμμή (πάντα Παρέκκλιση).
-- Οι Παροχές και οι ώρες είναι ανά μονάδα· η ποσότητα τα πολλαπλασιάζει.

create table public.agreement_lines (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  position integer not null,
  line_kind text not null check (line_kind in ('package', 'service', 'free')),
  item_id uuid references public.catalogue_items (id),
  description text not null check (length(trim(description)) > 0 and length(description) <= 300),
  description_en text not null default '' check (length(description_en) <= 300),
  unit text not null default '',
  quantity integer not null default 1 check (quantity between 1 and 999),
  -- Οι Παροχές του στοιχείου Καταλόγου όπως ήταν όταν μπήκε η γραμμή: [{kind_id, quantity}]. null στην ελεύθερη γραμμή.
  catalog_provisions jsonb,
  created_at timestamptz not null default now(),
  check ((line_kind = 'free') = (item_id is null)),
  check ((line_kind = 'free') = (catalog_provisions is null))
);

create index agreement_lines_agreement_idx on public.agreement_lines (agreement_id, position);
create index agreement_lines_item_idx on public.agreement_lines (item_id) where item_id is not null;

create table public.agreement_line_amounts (
  line_id uuid primary key references public.agreement_lines (id),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0 and unit_price < 10000000),
  catalog_price numeric(12, 2) check (catalog_price >= 0 and catalog_price < 10000000)
);

create table public.agreement_line_costs (
  line_id uuid primary key references public.agreement_lines (id),
  hours_shoot numeric(6, 1) not null default 0 check (hours_shoot >= 0 and hours_shoot <= 999),
  hours_edit numeric(6, 1) not null default 0 check (hours_edit >= 0 and hours_edit <= 999),
  direct_cost numeric(12, 2) not null default 0 check (direct_cost >= 0 and direct_cost < 10000000)
);

create table public.agreement_line_provisions (
  line_id uuid not null references public.agreement_lines (id),
  kind_id uuid not null references public.provision_kinds (id),
  quantity integer not null check (quantity between 1 and 999),
  primary key (line_id, kind_id)
);

create index agreement_line_provisions_kind_idx on public.agreement_line_provisions (kind_id);

-- Αντίγραφο κόστους της στιγμής της υπογραφής (ADR 0008): η κερδοφορία δεν μετακινείται όταν αλλάζουν τα έξοδα.
-- price/discounted_price/estimated_cost είναι ανά Περίοδο (μηνιαία) ή συνολικά (εφάπαξ).
create table public.agreement_costs (
  agreement_id uuid primary key references public.agreements (id),
  hour_cost numeric(10, 2),
  hour_cost_month date,
  multiplier_min numeric(4, 2) not null,
  multiplier_target numeric(4, 2) not null,
  multiplier_max numeric(4, 2) not null,
  price numeric(12, 2) not null,
  discounted_price numeric(12, 2) not null,
  estimated_cost numeric(12, 2),
  is_low_margin boolean not null,
  frozen_at timestamptz not null default now()
);

-- ───────────── Παραλήπτες, Σύνδεσμοι, κωδικοί ─────────────

create table public.agreement_recipients (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  position integer not null,
  name text not null check (length(trim(name)) > 0 and length(name) <= 120),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(email) <= 200),
  is_signatory boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index agreement_recipients_email on public.agreement_recipients (agreement_id, lower(email));
create unique index agreement_recipients_one_signatory on public.agreement_recipients (agreement_id) where is_signatory;

-- Ένας Σύνδεσμος ανά παραλήπτη ανά αναθεώρηση. Το token δεν αποθηκεύεται: μόνο το sha256 του. Τα στοιχεία του παραλήπτη
-- αντιγράφονται, ώστε ο Σύνδεσμος να μένει αναγνώσιμος και μετά τη διαγραφή του παραλήπτη από μια νεότερη αναθεώρηση.
create table public.agreement_links (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  recipient_id uuid references public.agreement_recipients (id) on delete set null,
  recipient_name text not null,
  recipient_email text not null,
  is_signatory boolean not null,
  revision integer not null,
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  issued_by uuid,
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason in ('revoked', 'superseded', 'signed', 'closed')),
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  check ((revoked_at is null) = (revoked_reason is null))
);

create index agreement_links_agreement_idx on public.agreement_links (agreement_id, revision);

-- Κωδικοί υπογραφής: 6 ψηφία, ισχύουν 10 λεπτά, 5 προσπάθειες, 1 ανά 60″ και 5 ανά ώρα ανά Σύνδεσμο (ADR 0016).
create table public.agreement_otps (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.agreement_links (id),
  code_hash text not null,
  salt text not null,
  name_entered text not null,
  ip text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  superseded_at timestamptz
);

create index agreement_otps_link_idx on public.agreement_otps (link_id, created_at desc);

-- Η υπογραφή: τα στοιχεία που την αποδεικνύουν. method 'link' = Σύνδεσμος πρότασης + κωδικός, 'outside' = εκτός συστήματος.
-- document_hash = sha256 του εγγράφου που είδε ο Υπογράφων (αντικαθιστά το «κλείδωμα PDF» ώσπου να υπάρξει PDF).
create table public.agreement_signatures (
  agreement_id uuid primary key references public.agreements (id),
  method text not null check (method in ('link', 'outside')),
  signed_name text not null,
  signed_on date not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid,
  link_id uuid references public.agreement_links (id),
  ip text not null default '',
  user_agent text not null default '',
  otp_delivery text check (otp_delivery in ('manual', 'email')),
  document_hash text not null,
  reference text not null default '',
  used_provisions jsonb not null default '[]'::jsonb,
  month_invoiced boolean not null default false,
  check ((method = 'link') = (link_id is not null)),
  check ((method = 'link') = (otp_delivery is not null)),
  check (method = 'link' or length(trim(reference)) > 0)
);

-- Το έγγραφο όπως στάλθηκε, ανά αναθεώρηση (περιέχει τιμές: κλειστός πίνακας, το διαβάζουν μόνο οι συναρτήσεις).
create table public.agreement_documents (
  agreement_id uuid not null references public.agreements (id),
  revision integer not null,
  document jsonb not null,
  hash text not null,
  created_at timestamptz not null default now(),
  primary key (agreement_id, revision)
);

-- ───────────── Αναθεωρήσεις, αιτήματα πελάτη, εξερχόμενα ─────────────

create table public.agreement_revisions (
  agreement_id uuid not null references public.agreements (id),
  number integer not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  summary text not null default '',
  approval_state text check (approval_state in ('pending', 'approved', 'rejected', 'withdrawn')),
  requested_by uuid,
  requested_at timestamptz,
  decided_by uuid,
  decided_at timestamptz,
  comment text not null default '',
  -- {κλειδί Παρέκκλισης: βάθος}. Τι ζητήθηκε και τι εγκρίθηκε (η Έγκριση δένεται με τη στιγμή της, ADR 0009).
  requested_deviations jsonb not null default '{}'::jsonb,
  approved_deviations jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  primary key (agreement_id, number)
);

create table public.agreement_change_requests (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  revision integer not null,
  link_id uuid references public.agreement_links (id),
  from_name text not null,
  message text not null check (length(trim(message)) > 0 and length(message) <= 2000),
  ip text not null default '',
  created_at timestamptz not null default now()
);

create index agreement_change_requests_idx on public.agreement_change_requests (agreement_id, created_at desc);

-- Τα μηνύματα που περιμένουν παράδοση. payload: {token} για Σύνδεσμο, {code} για κωδικό· σβήνονται μόλις παραδοθούν.
create table public.agreement_outbox (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id),
  link_id uuid references public.agreement_links (id),
  kind text not null check (kind in ('proposal_link', 'signing_code', 'signed_copy', 'client_invite')),
  to_name text not null default '',
  to_email text not null,
  locale text not null default 'el' check (locale in ('el', 'en')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'manual', 'cancelled', 'failed')),
  attempts integer not null default 0,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid,
  handled_at timestamptz,
  handled_by uuid,
  check ((status = 'pending') = (handled_at is null))
);

create index agreement_outbox_pending_idx on public.agreement_outbox (created_at) where status = 'pending';
create index agreement_outbox_agreement_idx on public.agreement_outbox (agreement_id, created_at desc);

alter table public.agreement_defaults enable row level security;
alter table public.agreements enable row level security;
alter table public.agreement_amounts enable row level security;
alter table public.agreement_baselines enable row level security;
alter table public.agreement_revision_limits enable row level security;
alter table public.agreement_milestones enable row level security;
alter table public.agreement_lines enable row level security;
alter table public.agreement_line_amounts enable row level security;
alter table public.agreement_line_costs enable row level security;
alter table public.agreement_line_provisions enable row level security;
alter table public.agreement_costs enable row level security;
alter table public.agreement_recipients enable row level security;
alter table public.agreement_links enable row level security;
alter table public.agreement_otps enable row level security;
alter table public.agreement_signatures enable row level security;
alter table public.agreement_documents enable row level security;
alter table public.agreement_revisions enable row level security;
alter table public.agreement_change_requests enable row level security;
alter table public.agreement_outbox enable row level security;

-- ───────────── Βοηθητικές συναρτήσεις ─────────────
-- Εσωτερικές: δεν δίνονται σε κανέναν ρόλο εφαρμογής (βλ. τέλος του αρχείου).

create function authz.token_hash(p_token text) returns text
language sql immutable set search_path = ''
as $$ select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex'); $$;

-- 64 ψηφία hex = 244 bit από τον γεννήτορα της βάσης. Δεν μαντεύεται.
create function authz.new_token() returns text
language sql volatile set search_path = ''
as $$ select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''); $$;

-- Ο Χρήστης ομάδας που κάνει την ενέργεια (null για τον ανώνυμο πελάτη και το σύστημα).
create function authz.team_actor() returns uuid
language sql stable security definer set search_path = ''
as $$ select u.user_id from public.team_users u where u.user_id = auth.uid(); $$;

-- Δικαίωμα με Εύρος πάνω σε μια Ευκαιρία: «όλα», ή «με αφορά» = Υπεύθυνος της Ευκαιρίας ή του Πελάτη (ADR 0007).
-- Το coalesce είναι απαραίτητο: ο Πελάτης ή η Ευκαιρία χωρίς Υπεύθυνο δίνουν null και όχι false.
create function authz.agreement_in_scope(p_opportunity uuid, p_perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(authz.has(p_perm), false) and (
    coalesce(authz.scope(p_perm), '') = 'all'
    or exists (
      select 1
        from public.opportunities o
        join public.clients c on c.id = o.client_id
       where o.id = p_opportunity
         and (coalesce(o.manager_id = auth.uid(), false) or coalesce(c.manager_id = auth.uid(), false))
    )
  );
$$;

-- Βλέπει ο Χρήστης τη Συμφωνία; Όποιος τη βλέπει ή τη συντάσσει με Εύρος, και όποιος «Παρεκκλίνει» (Εύρος μόνο «όλα»).
create function authz.can_see_agreement(p_agreement uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and coalesce((
    select authz.agreement_in_scope(a.opportunity_id, 'agreements.view')
        or authz.agreement_in_scope(a.opportunity_id, 'agreements.draft')
        or authz.has('agreements.deviate')
      from public.agreements a where a.id = p_agreement
  ), false);
$$;

create function authz.can_draft_agreement(p_agreement uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and coalesce((
    select authz.agreement_in_scope(a.opportunity_id, 'agreements.draft')
      from public.agreements a where a.id = p_agreement
  ), false);
$$;

-- Ώρες και Άμεσο κόστος γραμμής: γράφει όποιος συντάσσει ΚΑΙ «Διαχειρίζεται κόστος» (authz.can_manage_cost() του Καταλόγου).

-- ───────────── Πορεία και κατάσταση «σήμερα» ─────────────
-- Η λήξη πρότασης και η έναρξη/λήξη Συμφωνίας είναι θέμα ημερομηνίας. Οι αναγνώσεις δείχνουν πάντα την ισχύουσα τιμή
-- (authz.agreement_eff_*), οι εγγραφές τη γράφουν πρώτα (authz.agreement_settle) και το public.agreements_tick() την
-- γράφει μαζικά (cron). Έτσι τίποτα δεν εξαρτάται από το αν έτρεξε κάποιος προγραμματισμένος έλεγχος.

create function authz.agreement_eff_path(a public.agreements) returns text
language sql stable set search_path = ''
as $$
  select case
    when a.state = 'proposal' and a.path = 'sent' and a.valid_until < public.sales_today() then 'expired'
    else a.path
  end;
$$;

-- Η αυτόματη συνέχιση ('auto') δεν εκτελείται ακόμα (module Ανανέωση): μια τέτοια Συμφωνία δεν λήγει μόνη της.
create function authz.agreement_eff_state(a public.agreements) returns text
language sql stable set search_path = ''
as $$
  select case
    when a.state in ('signed', 'active') and a.kind = 'monthly' and a.renewal = 'new_opportunity'
         and a.end_on < public.sales_today() then 'expired'
    when a.state = 'signed' and a.start_on <= public.sales_today() then 'active'
    else a.state
  end;
$$;

create function authz.unused_rank(p text) returns integer
language sql immutable set search_path = ''
as $$ select case p when 'lost' then 1 when 'next_period' then 2 else 3 end; $$;

-- ───────────── Ίχνος και Δραστηριότητες ─────────────

-- Γεγονός για το Ίχνος (action 'event'). Πάνω σε αυτά θα στηριχτούν οι Αυτοματισμοί (ADR 0006). Χωρίς ποσά.
create function authz.agreement_event(p_agreement uuid, p_event text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'agreements', p_agreement::text, jsonb_build_object('event', p_event) || coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Κάθε βήμα της Συμφωνίας γράφεται και ως Δραστηριότητα της Ευκαιρίας και του Πελάτη (ADR 0009).
create function authz.agreement_log(p_agreement uuid, p_body text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.opportunity_activities (opportunity_id, actor_id, event, body, subject_id)
  select a.opportunity_id, authz.team_actor(), 'agreement', p_body, a.id
    from public.agreements a where a.id = p_agreement;
end;
$$;

-- ───────────── Ποσά, κόστος και περιθώριο ─────────────

create function authz.current_hour_cost() returns table (month date, hour_cost numeric)
language sql stable security definer set search_path = ''
as $$
  select cm.month, cm.hour_cost from public.cost_months cm
   where cm.month <= authz.athens_month_start() order by cm.month desc limit 1;
$$;

-- Τιμή, κόστος και περιθώριο: ζωντανά όσο είναι πρόταση, από το αντίγραφο (agreement_costs) μετά την υπογραφή.
-- Εκτιμώμενο κόστος = Σ ποσότητα × (ώρες × Κόστος ώρας + Άμεσο κόστος). «Χαμηλό περιθώριο» = η τιμή με την έκπτωση πρώτων
-- μηνών κάτω από το κόστος × τον ελάχιστο πολλαπλασιαστή: ένδειξη, ποτέ φραγμός (ADR 0017). Χωρίς Κόστος ώρας δεν κρίνεται.
create function authz.agreement_figures(p_agreement uuid)
returns table (
  price numeric, discounted_price numeric, hour_cost numeric, hour_cost_month date, estimated_cost numeric,
  mult_min numeric, mult_target numeric, mult_max numeric, is_low_margin boolean, is_frozen boolean
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_price numeric;
  v_pct numeric;
  v_disc numeric;
  v_hc numeric;
  v_hcm date;
  v_est numeric;
  v_set public.cost_settings;
begin
  if exists (select 1 from public.agreement_costs c where c.agreement_id = p_agreement) then
    return query
      select c.price, c.discounted_price, c.hour_cost, c.hour_cost_month, c.estimated_cost,
             c.multiplier_min, c.multiplier_target, c.multiplier_max, c.is_low_margin, true
        from public.agreement_costs c where c.agreement_id = p_agreement;
    return;
  end if;
  select coalesce(sum(l.quantity * la.unit_price), 0) into v_price
    from public.agreement_lines l join public.agreement_line_amounts la on la.line_id = l.id
   where l.agreement_id = p_agreement;
  select coalesce(m.discount_percent, 0) into v_pct from public.agreement_amounts m where m.agreement_id = p_agreement;
  v_disc := round(v_price * (1 - coalesce(v_pct, 0) / 100), 2);
  select h.month, h.hour_cost into v_hcm, v_hc from authz.current_hour_cost() h;
  select * into v_set from public.cost_settings s where s.id;
  if v_hc is not null then
    select round(coalesce(sum(l.quantity * (round((lc.hours_shoot + lc.hours_edit) * v_hc, 2) + lc.direct_cost)), 0), 2)
      into v_est
      from public.agreement_lines l join public.agreement_line_costs lc on lc.line_id = l.id
     where l.agreement_id = p_agreement;
  end if;
  return query
    select v_price, v_disc, v_hc, v_hcm, v_est, v_set.multiplier_min, v_set.multiplier_target, v_set.multiplier_max,
           coalesce(v_est > 0 and v_disc < v_est * v_set.multiplier_min, false), false;
end;
$$;

-- ───────────── Παρεκκλίσεις (ADR 0009) ─────────────
-- Παρέκκλιση = χειρότερο για την εταιρεία από τον Κατάλογο και τις προεπιλογές της στιγμής που φτιάχτηκε η πρόταση.
-- key: σταθερό αναγνωριστικό· depth: πόσο βαθιά (για να φανεί «νέα ή βαθύτερη» σε επόμενη αναθεώρηση).
-- Τα base_value/value είναι κείμενο και εμφανίζονται μόνο σε όποιον βλέπει ποσά όταν is_money.

create function authz.agreement_deviations(p_agreement uuid)
returns table (key text, kind text, subject text, depth numeric, base_value text, value text, is_money boolean)
language sql stable security definer set search_path = ''
as $$
  with a as (select * from public.agreements where id = p_agreement),
       b as (select data from public.agreement_baselines where agreement_id = p_agreement),
       m as (select * from public.agreement_amounts where agreement_id = p_agreement)
  select 'free:' || l.id::text, 'free_line', l.description, 1::numeric, null::text, null::text, false
    from public.agreement_lines l where l.agreement_id = p_agreement and l.line_kind = 'free'
  union all
  select 'price:' || l.id::text, 'price', l.description, la.catalog_price - la.unit_price,
         la.catalog_price::text, la.unit_price::text, true
    from public.agreement_lines l join public.agreement_line_amounts la on la.line_id = l.id
   where l.agreement_id = p_agreement and l.line_kind <> 'free'
     and la.catalog_price is not null and la.unit_price < la.catalog_price
  union all
  select 'provisions:' || l.id::text, 'provisions', l.description, x.extra, null, null, false
    from public.agreement_lines l
    cross join lateral (
      select coalesce(sum(greatest(p.quantity - coalesce((
               select (e ->> 'quantity')::integer from jsonb_array_elements(l.catalog_provisions) e
                where e ->> 'kind_id' = p.kind_id::text), 0), 0)), 0)::numeric as extra
        from public.agreement_line_provisions p where p.line_id = l.id
    ) x
   where l.agreement_id = p_agreement and l.line_kind <> 'free' and x.extra > 0
  union all
  select 'discount_percent', 'discount_percent', '', m.discount_percent,
         b.data ->> 'standard_discount_percent', m.discount_percent::text, true
    from m, b where m.discount_percent > (b.data ->> 'standard_discount_percent')::numeric
  union all
  select 'discount_months', 'discount_months', '', m.discount_months::numeric,
         b.data ->> 'standard_discount_months', m.discount_months::text, true
    from m, b where m.discount_months > (b.data ->> 'standard_discount_months')::numeric
  union all
  select 'payment_days', 'payment_days', '', (a.payment_days - (b.data ->> 'payment_days')::integer)::numeric,
         b.data ->> 'payment_days', a.payment_days::text, false
    from a, b where a.payment_days > (b.data ->> 'payment_days')::integer
  union all
  select 'grace_days', 'grace_days', '', (a.grace_days - (b.data ->> 'grace_days')::integer)::numeric,
         b.data ->> 'grace_days', a.grace_days::text, false
    from a, b where a.kind = 'monthly' and a.grace_days > (b.data ->> 'grace_days')::integer
  union all
  select 'unused_provisions', 'unused_provisions', '',
         (authz.unused_rank(a.unused_provisions) - authz.unused_rank(b.data ->> 'unused_provisions'))::numeric,
         b.data ->> 'unused_provisions', a.unused_provisions, false
    from a, b where a.kind = 'monthly' and authz.unused_rank(a.unused_provisions) > authz.unused_rank(b.data ->> 'unused_provisions')
  union all
  select 'dissolution_notice', 'dissolution_notice',
         '', ((b.data ->> 'dissolution_notice_days')::integer - a.dissolution_notice_days)::numeric,
         b.data ->> 'dissolution_notice_days', a.dissolution_notice_days::text, false
    from a, b where a.kind = 'monthly' and a.dissolution_notice_days < (b.data ->> 'dissolution_notice_days')::integer
  union all
  select 'dissolution_fee', 'dissolution_fee', '', (b.data ->> 'dissolution_fee')::numeric - m.dissolution_fee,
         b.data ->> 'dissolution_fee', m.dissolution_fee::text, true
    from a, b, m where a.kind = 'monthly' and m.dissolution_fee < (b.data ->> 'dissolution_fee')::numeric
  union all
  select 'filming_notice', 'filming_notice', '', ((b.data ->> 'filming_notice_hours')::integer - a.filming_notice_hours)::numeric,
         b.data ->> 'filming_notice_hours', a.filming_notice_hours::text, false
    from a, b where a.filming_notice_hours < (b.data ->> 'filming_notice_hours')::integer
  union all
  select 'cancel_hours', 'cancel_hours', '', ((b.data ->> 'filming_cancel_hours')::integer - a.filming_cancel_hours)::numeric,
         b.data ->> 'filming_cancel_hours', a.filming_cancel_hours::text, false
    from a, b where a.filming_cancel_hours < (b.data ->> 'filming_cancel_hours')::integer
  union all
  select 'late_cancel_burns', 'late_cancel_burns', '', 1::numeric, 'true', 'false', false
    from a, b where (b.data ->> 'late_cancel_burns')::boolean and not a.late_cancel_burns
  union all
  select 'no_show_burns', 'no_show_burns', '', 1::numeric, 'true', 'false', false
    from a, b where (b.data ->> 'no_show_burns')::boolean and not a.no_show_burns
  union all
  select 'revision:' || r.kind_id::text, 'revision_limit', k.label,
         (r.rounds - (b.data -> 'revision_limits' ->> r.kind_id::text)::integer)::numeric,
         b.data -> 'revision_limits' ->> r.kind_id::text, r.rounds::text, false
    from public.agreement_revision_limits r
    join public.provision_kinds k on k.id = r.kind_id
    cross join b
   where r.agreement_id = p_agreement
     and (b.data -> 'revision_limits' ->> r.kind_id::text) is not null
     and r.rounds > (b.data -> 'revision_limits' ->> r.kind_id::text)::integer
  union all
  select 'advance', 'advance', '', (b.data ->> 'advance_percent')::numeric - s.signature_percent,
         b.data ->> 'advance_percent', s.signature_percent::text, false
    from a, b
    cross join lateral (
      select coalesce(sum(ms.percent), 0) as signature_percent
        from public.agreement_milestones ms where ms.agreement_id = p_agreement and ms.trigger = 'signature'
    ) s
   where a.kind = 'one_off' and s.signature_percent < (b.data ->> 'advance_percent')::numeric;
$$;

-- Η τελευταία Έγκριση που δόθηκε (σε οποιαδήποτε αναθεώρηση) καλύπτει ό,τι ενέκρινε. Επόμενη αναθεώρηση χρειάζεται νέα Έγκριση
-- μόνο για Παρέκκλιση που δεν ήταν εκεί ή που βάθυνε (ADR 0009).
create function authz.agreement_uncovered(p_agreement uuid) returns table (key text, status text)
language sql stable security definer set search_path = ''
as $$
  with covered as (
    select coalesce((
      select r.approved_deviations from public.agreement_revisions r
       where r.agreement_id = p_agreement and r.approval_state = 'approved'
       order by r.number desc limit 1
    ), '{}'::jsonb) as c
  )
  select d.key, case when covered.c ? d.key then 'deeper' else 'new' end
    from authz.agreement_deviations(p_agreement) d, covered
   where not (covered.c ? d.key) or d.depth > (covered.c ->> d.key)::numeric;
$$;

-- Χρειάζεται Έγκριση για τον Χρήστη; Όποιος «Παρεκκλίνει» δεν χρειάζεται (ADR 0009).
create function authz.agreement_needs_approval(p_agreement uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not authz.has('agreements.deviate') and exists (select 1 from authz.agreement_uncovered(p_agreement));
$$;

-- ───────────── Περίοδοι (σχέδιο, όχι εγγραφές) ─────────────
-- Ημερολογιακοί μήνες. Η πρώτη και η τελευταία μπορεί να είναι μερικές. share = μέρες ÷ μέρες του μήνα (ποσό αναλογικά).
-- Η μερική τελευταία δεν δίνει νέες Παροχές, μόνο κλείνει ανοιχτή δουλειά (κεφ. 3).
create function authz.agreement_period_rows(p_start date, p_months integer)
returns table (n integer, starts date, ends date, share numeric, gives_provisions boolean)
language sql immutable set search_path = ''
as $$
  with b as (select p_start as s, ((p_start + make_interval(months => p_months))::date - 1) as e),
       g as (
         select i as n, (date_trunc('month', b.s) + make_interval(months => i))::date as mstart, b.s, b.e
           from b,
                generate_series(
                  0,
                  ((extract(year from b.e) * 12 + extract(month from b.e)) - (extract(year from b.s) * 12 + extract(month from b.s)))::integer
                ) as i
       ),
       r as (
         select g.n, greatest(g.s, g.mstart) as starts, least(g.e, ((g.mstart + interval '1 month')::date - 1)) as ends,
                ((g.mstart + interval '1 month')::date - g.mstart) as month_days, g.mstart
           from g
       )
  select r.n, r.starts, r.ends,
         least(1::numeric, (r.ends - r.starts + 1)::numeric / r.month_days::numeric),
         not (r.n > 0 and r.ends < ((r.mstart + interval '1 month')::date - 1))
    from r order by r.n;
$$;

-- ───────────── Το έγγραφο της πρότασης (D5) ─────────────
-- Ό,τι βλέπει ο πελάτης και τίποτα άλλο: γραμμές, Παροχές, τιμές, Όροι. Ποτέ ώρες, κόστος, περιθώριο, Παρεκκλίσεις.
-- Αποθηκεύεται κατά την αποστολή (agreement_documents) και είναι αυτό που υπογράφεται· το hash του μπαίνει στην υπογραφή.
create function authz.agreement_build_document(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  m public.agreement_amounts;
  c public.company_settings;
  v_client public.clients;
  v_lines jsonb;
  v_totals jsonb;
  v_milestones jsonb;
  v_limits jsonb;
  v_price numeric;
  v_disc numeric;
  v_net numeric;
begin
  select * into a from public.agreements x where x.id = p_agreement;
  select * into m from public.agreement_amounts x where x.agreement_id = p_agreement;
  select * into c from public.company_settings x where x.id;
  select cl.* into v_client from public.clients cl join public.opportunities o on o.client_id = cl.id where o.id = a.opportunity_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'description', l.description, 'description_en', l.description_en, 'unit', l.unit, 'quantity', l.quantity,
           'unit_price', la.unit_price, 'line_total', round(l.quantity * la.unit_price, 2),
           'provisions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'label', k.label, 'label_en', k.label_en, 'unit', k.unit, 'unit_en', k.unit_en,
                      'quantity', p.quantity * l.quantity) order by k.sort, k.id)
               from public.agreement_line_provisions p join public.provision_kinds k on k.id = p.kind_id
              where p.line_id = l.id), '[]'::jsonb)
         ) order by l.position, l.id), '[]'::jsonb),
         coalesce(sum(round(l.quantity * la.unit_price, 2)), 0)
    into v_lines, v_price
    from public.agreement_lines l join public.agreement_line_amounts la on la.line_id = l.id
   where l.agreement_id = p_agreement;

  v_disc := round(v_price * (1 - m.discount_percent / 100), 2);
  v_net := v_price;
  v_totals := jsonb_build_object(
    'net', v_net, 'discount_percent', m.discount_percent, 'discount_months', m.discount_months,
    'discounted_net', v_disc, 'vat_rate', m.vat_rate,
    'vat', round(v_net * m.vat_rate / 100, 2), 'gross', round(v_net * (1 + m.vat_rate / 100), 2),
    'discounted_vat', round(v_disc * m.vat_rate / 100, 2), 'discounted_gross', round(v_disc * (1 + m.vat_rate / 100), 2));

  select coalesce(jsonb_agg(jsonb_build_object(
           'trigger', ms.trigger, 'percent', ms.percent, 'due_on', ms.due_on,
           'amount', round(v_net * ms.percent / 100, 2)) order by ms.position, ms.id), '[]'::jsonb)
    into v_milestones from public.agreement_milestones ms where ms.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object('label', k.label, 'label_en', k.label_en, 'rounds', r.rounds) order by k.sort, k.id), '[]'::jsonb)
    into v_limits
    from public.agreement_revision_limits r join public.provision_kinds k on k.id = r.kind_id
   where r.agreement_id = p_agreement;

  return jsonb_build_object(
    'revision', a.revision, 'language', a.language, 'title', a.title, 'kind', a.kind, 'valid_until', a.valid_until,
    'company', jsonb_build_object(
      'legal_name', c.legal_name, 'trade_name', c.trade_name, 'tax_id', c.tax_id, 'tax_office', c.tax_office,
      'gemi', c.gemi, 'address', c.address, 'phone', c.phone, 'email', c.email,
      'signatory_name', c.signatory_name, 'signatory_title', c.signatory_title),
    'client', jsonb_build_object('name', v_client.name, 'legal_name', v_client.legal_name, 'afm', v_client.afm, 'city', v_client.city),
    'lines', v_lines,
    'provision_totals', coalesce((
      select jsonb_agg(jsonb_build_object('label', t.label, 'label_en', t.label_en, 'unit', t.unit, 'unit_en', t.unit_en, 'quantity', t.quantity)
                       order by t.sort, t.kind_id)
        from (
          select k.id as kind_id, k.sort, k.label, k.label_en, k.unit, k.unit_en, sum(p.quantity * l.quantity) as quantity
            from public.agreement_lines l
            join public.agreement_line_provisions p on p.line_id = l.id
            join public.provision_kinds k on k.id = p.kind_id
           where l.agreement_id = p_agreement
           group by k.id, k.sort, k.label, k.label_en, k.unit, k.unit_en
        ) t), '[]'::jsonb),
    'totals', v_totals,
    'start_on', a.start_on, 'duration_months', a.duration_months,
    'terms', jsonb_build_object(
      'payment_days', a.payment_days, 'unused_provisions', a.unused_provisions, 'grace_days', a.grace_days,
      'renewal', a.renewal, 'dissolution_notice_days', a.dissolution_notice_days, 'dissolution_fee', m.dissolution_fee,
      'filming_notice_hours', a.filming_notice_hours, 'filming_cancel_hours', a.filming_cancel_hours,
      'late_cancel_burns', a.late_cancel_burns, 'no_show_burns', a.no_show_burns, 'revision_limits', v_limits),
    'milestones', v_milestones
  );
end;
$$;

create function authz.document_hash(p_document jsonb) returns text
language sql immutable set search_path = ''
as $$ select encode(sha256(convert_to(p_document::text, 'UTF8')), 'hex'); $$;

-- ───────────── Σύνδεσμοι και εξερχόμενα ─────────────

-- Ακυρώνει όσους Συνδέσμους δουλεύουν ακόμα και τα μηνύματα που περιμένουν. Το token σβήνεται από τα εξερχόμενα.
create function authz.agreement_revoke_links(p_agreement uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.agreement_links set revoked_at = now(), revoked_reason = p_reason
   where agreement_id = p_agreement and revoked_at is null;
  update public.agreement_outbox
     set status = 'cancelled', handled_at = now(), payload = '{}'::jsonb
   where agreement_id = p_agreement and status = 'pending' and kind in ('proposal_link', 'signing_code');
end;
$$;

-- Ένας Σύνδεσμος ανά παραλήπτη (ή ανά ένα) για την τρέχουσα αναθεώρηση + μήνυμα στα εξερχόμενα.
create function authz.agreement_issue_link(p_agreement uuid, p_recipient uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  r public.agreement_recipients;
  v_token text := authz.new_token();
  v_link uuid;
begin
  select * into a from public.agreements x where x.id = p_agreement;
  select * into r from public.agreement_recipients x where x.id = p_recipient and x.agreement_id = p_agreement;
  insert into public.agreement_links (agreement_id, recipient_id, recipient_name, recipient_email, is_signatory, revision, token_hash, issued_by)
  values (p_agreement, r.id, r.name, r.email, r.is_signatory, a.revision, authz.token_hash(v_token), auth.uid())
  returning id into v_link;
  insert into public.agreement_outbox (agreement_id, link_id, kind, to_name, to_email, locale, payload, created_by)
  values (p_agreement, v_link, 'proposal_link', r.name, r.email, a.language, jsonb_build_object('token', v_token), auth.uid());
  return v_link;
end;
$$;

create function authz.agreement_issue_links(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
begin
  for r in select x.id from public.agreement_recipients x where x.agreement_id = p_agreement order by x.position, x.id loop
    perform authz.agreement_issue_link(p_agreement, r.id);
  end loop;
end;
$$;

-- Η κατάσταση ενός Συνδέσμου όπως τη βλέπει ο παραλήπτης (και η ομάδα): active, expired, revoked, superseded, signed, closed.
create function authz.link_status(l public.agreement_links, a public.agreements) returns text
language sql stable set search_path = ''
as $$
  select case
    when a.state <> 'proposal' then 'signed'
    when a.path = 'lost' then 'closed'
    when l.revoked_at is not null then case l.revoked_reason
      when 'superseded' then 'superseded' when 'closed' then 'closed' when 'signed' then 'signed' else 'revoked' end
    when l.revision <> a.revision then 'superseded'
    when authz.agreement_eff_path(a) = 'expired' then 'expired'
    when a.path = 'sent' then 'active'
    else 'superseded'
  end;
$$;

-- ───────────── Λήξη πρότασης και έναρξη/λήξη Συμφωνίας ─────────────

create function authz.agreement_settle(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_path text;
  v_state text;
begin
  select * into a from public.agreements x where x.id = p_agreement for update;
  if not found then
    return;
  end if;
  v_path := authz.agreement_eff_path(a);
  v_state := authz.agreement_eff_state(a);
  if v_path <> a.path then
    update public.agreements set path = v_path where id = p_agreement;
    perform authz.agreement_log(p_agreement, 'Έληξε η πρόταση: οι Σύνδεσμοι δεν δουλεύουν πια. Η Ευκαιρία μένει ανοιχτή.');
    perform authz.agreement_event(p_agreement, 'proposal_expired');
  end if;
  if v_state <> a.state then
    update public.agreements set state = v_state where id = p_agreement;
    perform authz.agreement_event(p_agreement, 'agreement_' || v_state);
  end if;
end;
$$;

-- ───────────── Σύνταξη: ό,τι χρειάζεται κάθε αλλαγή ─────────────

-- Κλειδώνει τη Συμφωνία για αλλαγή. Μόνο όποιος τη συντάσσει· μόνο στη Σύνταξη. Αν περίμενε Έγκριση, το αίτημα αποσύρεται
-- και η πρόταση γυρίζει στη Σύνταξη (ADR 0009). Μετά την αποστολή η αλλαγή θέλει νέα αναθεώρηση.
create function authz.agreement_for_edit(p_agreement uuid) returns public.agreements
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  perform 1 from public.agreements x where x.id = p_agreement for update;
  if not found or not authz.can_draft_agreement(p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement;
  if a.state <> 'proposal' then
    raise exception 'Η Συμφωνία έχει υπογραφεί και δεν αλλάζει' using errcode = 'P0001';
  end if;
  if a.path = 'lost' then
    raise exception 'Η πρόταση έκλεισε ως χαμένη και δεν αλλάζει' using errcode = 'P0001';
  end if;
  if a.path in ('sent', 'expired') then
    raise exception 'Η πρόταση έχει σταλεί· κάνε πρώτα νέα αναθεώρηση' using errcode = 'P0001';
  end if;
  if a.path = 'awaiting_approval' then
    update public.agreement_revisions set approval_state = 'withdrawn', decided_at = now(), decided_by = auth.uid()
     where agreement_id = p_agreement and number = a.revision and approval_state = 'pending';
    update public.agreements set path = 'draft' where id = p_agreement;
    perform authz.agreement_log(p_agreement, 'Το αίτημα Έγκρισης αποσύρθηκε επειδή άλλαξε η πρόταση.');
    perform authz.agreement_event(p_agreement, 'approval_withdrawn');
  else
    update public.agreements set updated_at = now() where id = p_agreement;
  end if;
  select * into a from public.agreements x where x.id = p_agreement;
  return a;
end;
$$;

-- ───────────── Κλείσιμο της Ευκαιρίας ως κερδισμένης: ο φραγμός του ADR 0009 ανοίγει μόνο εδώ ─────────────

-- Αν η Ευκαιρία έχει μείνει χωρίς Υπεύθυνο (ο Υπεύθυνος απενεργοποιήθηκε ενώ η πρόταση ήταν ανοιχτή), η κερδισμένη Ευκαιρία
-- χρειάζεται Υπεύθυνο: ο Υπεύθυνος του Πελάτη, αλλιώς ο πρώτος Ιδιοκτήτης.
create function authz.agreement_win_opportunity(p_opportunity uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_manager uuid;
begin
  select o.manager_id into v_manager from public.opportunities o where o.id = p_opportunity;
  if v_manager is null then
    select c.manager_id into v_manager
      from public.opportunities o join public.clients c on c.id = o.client_id
     where o.id = p_opportunity and c.manager_id is not null and authz.user_scope(c.manager_id, 'clients.manage') is not null;
  end if;
  if v_manager is null then
    select u.user_id into v_manager from public.team_users u
     where u.is_active and authz.user_is_owner(u.user_id) order by u.created_at, u.user_id limit 1;
  end if;
  perform set_config('sales.system_close', 'on', true);
  update public.opportunities
     set outcome = 'won', closed_at = now(), manager_id = coalesce(manager_id, v_manager)
   where id = p_opportunity and outcome = 'open';
  perform set_config('sales.system_close', 'off', true);
end;
$$;

-- Λόγος απώλειας του συστήματος για την απόρριψη από τον Υπογράφοντα. Δημιουργείται την πρώτη φορά που χρειάζεται (η λίστα
-- Λόγων απώλειας είναι του admin και το migration δεν την αγγίζει)· ως τιμή του συστήματος δεν σβήνεται ούτε αποσύρεται.
create function authz.agreement_declined_reason() returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_claims text;
  v_sub text;
begin
  select r.id into v_id from public.sales_loss_reasons r where r.code = 'client_declined';
  if v_id is not null then
    return v_id;
  end if;
  -- Ο φρουρός των λιστών Πωλήσεων μηδενίζει is_system και code όταν υπάρχει συνδεδεμένος Χρήστης (ο πελάτης μπορεί να έχει
  -- ανοιχτή συνεδρία στον ίδιο browser). Η εισαγωγή γίνεται χωρίς ταυτότητα και η ταυτότητα επανέρχεται αμέσως μετά.
  v_claims := current_setting('request.jwt.claims', true);
  v_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claims', '', true);
  if v_sub is not null then
    perform set_config('request.jwt.claim.sub', '', true);
  end if;
  insert into public.sales_loss_reasons (code, label, sort, is_system)
  values ('client_declined', 'Ο πελάτης απέρριψε την πρόταση',
          (select coalesce(max(x.sort), 0) + 10 from public.sales_loss_reasons x), true)
  on conflict (code) do nothing;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  if v_sub is not null then
    perform set_config('request.jwt.claim.sub', v_sub, true);
  end if;
  select r.id into v_id from public.sales_loss_reasons r where r.code = 'client_declined';
  if v_id is null then
    raise exception 'Δεν υπάρχει ο Λόγος απώλειας του συστήματος για την απόρριψη' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

-- ───────────── Αποστολή ─────────────

-- Κοινό βήμα της αποστολής (από τον Υπεύθυνο, ή από το «Εγκρίνω»). Φτιάχνει το έγγραφο, ανοίγει Συνδέσμους και μηνύματα.
create function authz.agreement_do_send(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_doc jsonb;
  v_figures record;
begin
  perform authz.require('finance.amounts');
  select * into a from public.agreements x where x.id = p_agreement for update;
  if a.state <> 'proposal' or a.path not in ('draft', 'awaiting_approval') then
    raise exception 'Η πρόταση δεν είναι σε Σύνταξη' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.agreement_lines l where l.agreement_id = p_agreement) then
    raise exception 'Η πρόταση δεν έχει γραμμές' using errcode = 'P0001';
  end if;
  if a.valid_until < public.sales_today() then
    raise exception 'Η Ισχύς της πρότασης έχει περάσει· όρισε νέα ημερομηνία' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.agreement_recipients r where r.agreement_id = p_agreement and r.is_signatory) then
    raise exception 'Ορισμός Υπογράφοντα: χρειάζεται ένας παραλήπτης που υπογράφει' using errcode = 'P0001';
  end if;
  if a.path = 'awaiting_approval' then
    update public.agreements set path = 'draft' where id = p_agreement;
  end if;
  update public.agreement_amounts set vat_rate = (select c.vat_rate from public.company_settings c where c.id)
   where agreement_id = p_agreement;
  v_doc := authz.agreement_build_document(p_agreement);
  insert into public.agreement_documents (agreement_id, revision, document, hash)
  values (p_agreement, a.revision, v_doc, authz.document_hash(v_doc))
  on conflict (agreement_id, revision) do update set document = excluded.document, hash = excluded.hash, created_at = now();
  update public.agreements set path = 'sent' where id = p_agreement;
  update public.agreement_revisions set sent_at = now() where agreement_id = p_agreement and number = a.revision;
  perform authz.agreement_issue_links(p_agreement);
  perform authz.agreement_log(p_agreement, format('Στάλθηκε η πρόταση (αναθεώρηση %s) σε %s.', a.revision,
    (select count(*) from public.agreement_recipients r where r.agreement_id = p_agreement)::text || ' παραλήπτες'));
  perform authz.agreement_event(p_agreement, 'proposal_sent', jsonb_build_object('revision', a.revision));
  select f.is_low_margin into v_figures from authz.agreement_figures(p_agreement) f;
  if coalesce(v_figures.is_low_margin, false) then
    -- Το σήμα το βλέπουν μόνο όσοι βλέπουν κόστος (agreement_costs): το γεγονός μπαίνει στη δική του οντότητα (ADR 0007).
    insert into public.audit_log (actor_id, action, entity, entity_id, after)
    values (auth.uid(), 'event', 'agreement_costs', p_agreement::text, jsonb_build_object('event', 'low_margin', 'revision', a.revision));
  end if;
end;
$$;

-- ───────────── Υπογραφή (μέσα ή έξω από το σύστημα) ─────────────

-- Όλα όσα γίνονται όταν υπογράφεται η Συμφωνία: Έναρξη/Λήξη, πάγωμα κόστους, υπογραφή, Ευκαιρία κερδισμένη, μηνύματα.
create function authz.agreement_finalize_signature(
  p_agreement uuid, p_method text, p_signed_name text, p_options jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_today date := public.sales_today();
  v_start date;
  v_end date;
  v_state text;
  v_doc public.agreement_documents;
  v_rev integer;
  v_fig record;
  v_signed_on date := coalesce((p_options ->> 'signed_on')::date, v_today);
  v_recipient public.agreement_recipients;
begin
  select * into a from public.agreements x where x.id = p_agreement for update;
  if a.state <> 'proposal' or a.path = 'lost' then
    raise exception 'Η Συμφωνία δεν είναι ανοιχτή για υπογραφή' using errcode = 'P0001';
  end if;
  if p_method = 'link' then
    v_start := greatest(coalesce(a.start_on, v_today), v_today);
  else
    v_start := (p_options ->> 'start')::date;
  end if;
  v_end := case when a.kind = 'monthly' then ((v_start + make_interval(months => a.duration_months))::date - 1) end;
  v_state := case when v_start <= v_today then 'active' else 'signed' end;
  v_rev := a.revision;

  select * into v_doc from public.agreement_documents d where d.agreement_id = p_agreement and d.revision = v_rev;
  if not found then
    -- Υπογραφή εκτός συστήματος σε πρόταση που δεν στάλθηκε ποτέ: το έγγραφο φτιάχνεται τώρα, για το αρχείο.
    insert into public.agreement_documents (agreement_id, revision, document, hash)
    select p_agreement, v_rev, d.doc, authz.document_hash(d.doc) from (select authz.agreement_build_document(p_agreement) as doc) d
    returning * into v_doc;
  end if;

  select * into v_fig from authz.agreement_figures(p_agreement);
  insert into public.agreement_costs (
    agreement_id, hour_cost, hour_cost_month, multiplier_min, multiplier_target, multiplier_max,
    price, discounted_price, estimated_cost, is_low_margin)
  values (p_agreement, v_fig.hour_cost, v_fig.hour_cost_month, v_fig.mult_min, v_fig.mult_target, v_fig.mult_max,
          v_fig.price, v_fig.discounted_price, v_fig.estimated_cost, coalesce(v_fig.is_low_margin, false));

  update public.agreements
     set state = v_state, path = 'signed', start_on = v_start, end_on = v_end,
         signed_at = case when p_method = 'link' then now() else ((v_signed_on + time '12:00') at time zone 'Europe/Athens') end
   where id = p_agreement;

  insert into public.agreement_signatures (
    agreement_id, method, signed_name, signed_on, recorded_by, link_id, ip, user_agent, otp_delivery,
    document_hash, reference, used_provisions, month_invoiced)
  values (
    p_agreement, p_method, p_signed_name, v_signed_on, authz.team_actor(),
    (p_options ->> 'link_id')::uuid, coalesce(p_options ->> 'ip', ''), coalesce(p_options ->> 'user_agent', ''),
    p_options ->> 'otp_delivery', v_doc.hash, coalesce(p_options ->> 'reference', ''),
    coalesce(p_options -> 'used', '[]'::jsonb), coalesce((p_options ->> 'invoiced')::boolean, false));

  perform authz.agreement_revoke_links(p_agreement, 'signed');
  perform authz.agreement_win_opportunity(a.opportunity_id);

  select * into v_recipient from public.agreement_recipients r where r.agreement_id = p_agreement and r.is_signatory;
  insert into public.agreement_outbox (agreement_id, kind, to_name, to_email, locale, payload, created_by)
  values (p_agreement, 'signed_copy', v_recipient.name, v_recipient.email, a.language, '{}'::jsonb, auth.uid()),
         (p_agreement, 'client_invite', v_recipient.name, v_recipient.email, a.language, '{}'::jsonb, auth.uid());

  perform authz.agreement_log(p_agreement, format('Υπογράφηκε η Συμφωνία από %s (%s). Η Ευκαιρία έγινε κερδισμένη.', p_signed_name,
    case p_method when 'link' then 'Σύνδεσμος πρότασης' else 'εκτός συστήματος' end));
  perform authz.agreement_event(p_agreement, 'agreement_signed', jsonb_build_object('method', p_method, 'state', v_state));
  perform authz.agreement_settle(p_agreement);
end;
$$;

-- ───────────── Κανόνες που ισχύουν για όλους, και για τον service role (triggers) ─────────────

-- Συμφωνία: δεν διαγράφεται, το είδος και η Ευκαιρία της δεν αλλάζουν, η πορεία κινείται μόνο όπως ορίζει το ADR 0009,
-- και μετά την υπογραφή δεν αλλάζει τίποτα εκτός από την κατάσταση (έναρξη, λήξη).
create function authz.guard_agreement() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_stamps text[] := array['updated_at', 'updated_by'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Οι Συμφωνίες δεν διαγράφονται' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;

  if new.id <> old.id or new.opportunity_id <> old.opportunity_id or new.kind <> old.kind
     or new.created_at is distinct from old.created_at then
    raise exception 'Το είδος και η Ευκαιρία μιας Συμφωνίας δεν αλλάζουν' using errcode = 'P0001';
  end if;

  if old.state <> 'proposal' then
    if (to_jsonb(new) - 'state' - 'updated_at' - 'updated_by') is distinct from (to_jsonb(old) - 'state' - 'updated_at' - 'updated_by') then
      raise exception 'Η υπογεγραμμένη Συμφωνία δεν αλλάζει' using errcode = 'P0001';
    end if;
    if new.state <> old.state and (old.state, new.state) not in (('signed', 'active'), ('signed', 'expired'), ('active', 'expired')) then
      raise exception 'Η κατάσταση της Συμφωνίας δεν γυρίζει πίσω' using errcode = 'P0001';
    end if;
  elsif old.path = 'lost' then
    if (to_jsonb(new) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(old) - 'updated_at' - 'updated_by') then
      raise exception 'Μια πρόταση που χάθηκε δεν αλλάζει' using errcode = 'P0001';
    end if;
  elsif new.path <> old.path and (old.path, new.path) not in (
      ('draft', 'awaiting_approval'), ('draft', 'sent'), ('draft', 'signed'), ('draft', 'lost'),
      ('awaiting_approval', 'draft'), ('awaiting_approval', 'lost'),
      ('sent', 'draft'), ('sent', 'expired'), ('sent', 'signed'), ('sent', 'lost'),
      ('expired', 'sent'), ('expired', 'draft'), ('expired', 'signed'), ('expired', 'lost')) then
    raise exception 'Αυτή η αλλαγή πορείας της πρότασης δεν επιτρέπεται' using errcode = 'P0001';
  end if;
  if new.revision < old.revision or new.revision > old.revision + 1 then
    raise exception 'Η αναθεώρηση ανεβαίνει ένα κάθε φορά' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger agreements_guard before insert or update or delete on public.agreements
  for each row execute function authz.guard_agreement();

-- Ό,τι ανήκει στη Συμφωνία (γραμμές, ποσά, Παροχές, ορόσημα, παραλήπτες, Όριο αλλαγών) αλλάζει μόνο όσο η πρόταση είναι σε
-- Σύνταξη. Έτσι το έγγραφο που στάλθηκε και το αντίγραφο κόστους της υπογραφής δεν μπορούν να ξεφύγουν από τα δεδομένα.
-- tg_argv[0]: η στήλη που δείχνει τη Συμφωνία ('agreement_id') ή τη γραμμή ('line_id').
create function authz.guard_agreement_child() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_ref uuid := coalesce((to_jsonb(new) ->> tg_argv[0])::uuid, (to_jsonb(old) ->> tg_argv[0])::uuid);
  v_agreement uuid;
begin
  if tg_argv[0] = 'line_id' then
    select l.agreement_id into v_agreement from public.agreement_lines l where l.id = v_ref;
  else
    v_agreement := v_ref;
  end if;
  if v_agreement is not null and not exists (
    select 1 from public.agreements a where a.id = v_agreement and a.state = 'proposal' and a.path = 'draft'
  ) then
    raise exception 'Η πρόταση δεν αλλάζει σε αυτή την κατάσταση· ξεκίνα νέα αναθεώρηση' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger agreement_amounts_guard before insert or update or delete on public.agreement_amounts
  for each row execute function authz.guard_agreement_child('agreement_id');
create trigger agreement_revision_limits_guard before insert or update or delete on public.agreement_revision_limits
  for each row execute function authz.guard_agreement_child('agreement_id');
create trigger agreement_milestones_guard before insert or update or delete on public.agreement_milestones
  for each row execute function authz.guard_agreement_child('agreement_id');
create trigger agreement_lines_guard before insert or update or delete on public.agreement_lines
  for each row execute function authz.guard_agreement_child('agreement_id');
create trigger agreement_recipients_guard before insert or update or delete on public.agreement_recipients
  for each row execute function authz.guard_agreement_child('agreement_id');
create trigger agreement_line_amounts_guard before insert or update or delete on public.agreement_line_amounts
  for each row execute function authz.guard_agreement_child('line_id');
create trigger agreement_line_costs_guard before insert or update or delete on public.agreement_line_costs
  for each row execute function authz.guard_agreement_child('line_id');
create trigger agreement_line_provisions_guard before insert or update or delete on public.agreement_line_provisions
  for each row execute function authz.guard_agreement_child('line_id');

-- Η υπογραφή, το αντίγραφο κόστους και το έγγραφο μιας υπογεγραμμένης Συμφωνίας γράφονται μία φορά και δεν αλλάζουν.
create function authz.guard_agreement_record() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'agreement_documents' and tg_op <> 'DELETE'
     and not exists (select 1 from public.agreements a where a.id = old.agreement_id and a.state <> 'proposal') then
    return new;
  end if;
  raise exception 'Αυτή η εγγραφή δεν αλλάζει και δεν διαγράφεται' using errcode = 'P0001';
end;
$$;

create trigger agreement_signatures_guard before update or delete on public.agreement_signatures
  for each row execute function authz.guard_agreement_record();
create trigger agreement_costs_guard before update or delete on public.agreement_costs
  for each row execute function authz.guard_agreement_record();
create trigger agreement_documents_guard before update or delete on public.agreement_documents
  for each row execute function authz.guard_agreement_record();

-- Προεπιλογές: ο πάροχος email συνδέεται μόνο από migration/service role, ποτέ από Χρήστη της εφαρμογής.
create function authz.guard_agreement_defaults() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and new.email_sender_connected is distinct from old.email_sender_connected then
    raise exception 'Η σύνδεση του παρόχου email γίνεται μόνο από το στήσιμο του συστήματος' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger agreement_defaults_guard before update on public.agreement_defaults
  for each row execute function authz.guard_agreement_defaults();

-- Κλείσιμο της Ευκαιρίας ως χαμένης (από τον Υπεύθυνο, από B4 ή από την απόρριψη του Υπογράφοντα): η πρόταση χάνεται κι αυτή,
-- οι Σύνδεσμοι σταματούν. Η Συμφωνία μένει «πρόταση · Χάθηκε», μόνο για ανάγνωση.
create function authz.agreement_follow_opportunity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  select a.id into v_id from public.agreements a where a.opportunity_id = new.id and a.state = 'proposal' and a.path <> 'lost';
  if v_id is null then
    return null;
  end if;
  update public.agreement_revisions set approval_state = 'withdrawn', decided_at = now()
   where agreement_id = v_id and approval_state = 'pending';
  update public.agreements set path = 'lost' where id = v_id;
  perform authz.agreement_revoke_links(v_id, 'closed');
  perform authz.agreement_event(v_id, 'proposal_lost');
  return null;
end;
$$;

create trigger opportunities_follow_agreement after update of outcome on public.opportunities
  for each row when (old.outcome = 'open' and new.outcome = 'lost')
  execute function authz.agreement_follow_opportunity();

-- ───────────── Σημεία επέκτασης του Καταλόγου: τώρα με πραγματικές χρήσεις ─────────────

create or replace function public.catalogue_item_uses(p_item uuid) returns bigint
language sql stable security definer set search_path = ''
as $$ select count(*) from public.agreement_lines l where l.item_id = p_item; $$;

create or replace function public.provision_kind_uses(p_kind uuid) returns bigint
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.catalogue_item_provisions p where p.kind_id = p_kind)
       + (select count(*) from public.agreement_line_provisions p where p.kind_id = p_kind)
       + (select count(*) from public.agreement_revision_limits r where r.kind_id = p_kind);
$$;

-- Ίχνος: οι γραμμές με ποσά ή κόστος φαίνονται μόνο σε όποιον βλέπει και τα ίδια τα ποσά ή το κόστος (ADR 0007).
-- Ίδια με του Καταλόγου, με τους νέους πίνακες.
create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    when 'agreement_line_costs' then authz.has('finance.cost')
    when 'agreement_costs' then authz.has('finance.cost') and authz.has('finance.amounts')
    when 'agreement_amounts' then authz.has('finance.amounts')
    when 'agreement_line_amounts' then authz.has('finance.amounts')
    when 'agreement_defaults' then authz.has('finance.amounts')
    else true
  end;
$$;

-- ───────────── Εγγραφή: σύνταξη της πρότασης (D2, B4) ─────────────
-- Κάθε συνάρτηση ξεκινά με authz.agreement_for_edit: Δικαίωμα «Συντάσσει προτάσεις» με Εύρος, πρόταση σε Σύνταξη (ή σε
-- αναμονή Έγκρισης, οπότε το αίτημα αποσύρεται). Τιμές γράφει όποιος «Βλέπει ποσά», ώρες και Άμεσο κόστος όποιος
-- «Διαχειρίζεται κόστος»: κανείς δεν γράφει ό,τι δεν βλέπει.

-- Νέα Συμφωνία μέσα στην Ευκαιρία: Όροι από τις προεπιλογές, Υπογράφων το κύριο πρόσωπο του Πελάτη, Ισχύς από τις Ρυθμίσεις.
create function public.agreement_create(p_opportunity uuid, p_kind text, p_title text default null) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  o public.opportunities;
  c public.clients;
  d public.agreement_defaults;
  v_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_monthly boolean := p_kind = 'monthly';
  v_limits jsonb;
begin
  perform authz.require('agreements.draft');
  if p_kind not in ('monthly', 'one_off') then
    raise exception 'Διάλεξε μηνιαία ή εφάπαξ Συμφωνία' using errcode = 'P0001';
  end if;
  select * into o from public.opportunities x where x.id = p_opportunity;
  if not found or not authz.can_see_opportunity_row(o.client_id, o.manager_id)
     or not authz.agreement_in_scope(p_opportunity, 'agreements.draft') then
    raise exception 'Η Ευκαιρία δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if o.outcome <> 'open' then
    raise exception 'Συμφωνία ανοίγει μόνο σε ανοιχτή Ευκαιρία' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.agreements x where x.opportunity_id = p_opportunity) then
    raise exception 'Η Ευκαιρία έχει ήδη Συμφωνία· μία Ευκαιρία έχει μία Συμφωνία' using errcode = 'P0001';
  end if;
  if v_title = '' then
    v_title := o.title;
  end if;
  select * into c from public.clients x where x.id = o.client_id;
  select * into d from public.agreement_defaults x where x.id;

  insert into public.agreements (
    opportunity_id, kind, title, valid_until, duration_months, renewal, payment_days, unused_provisions, grace_days,
    dissolution_notice_days, filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns)
  values (
    p_opportunity, p_kind, v_title, public.sales_today() + d.proposal_validity_days,
    case when v_monthly then d.duration_months end, case when v_monthly then d.renewal end,
    case when v_monthly then d.payment_days_monthly else d.payment_days_one_off end,
    case when v_monthly then d.unused_provisions else 'lost' end,
    case when v_monthly then d.grace_days else 0 end,
    case when v_monthly then d.dissolution_notice_days else 0 end,
    d.filming_notice_hours, d.filming_cancel_hours, d.late_cancel_burns, d.no_show_burns)
  returning id into v_id;

  insert into public.agreement_amounts (agreement_id, dissolution_fee, vat_rate)
  values (v_id, case when v_monthly then d.dissolution_fee else 0 end, (select s.vat_rate from public.company_settings s where s.id));

  insert into public.agreement_revision_limits (agreement_id, kind_id, rounds)
  select v_id, k.id, k.revision_limit from public.provision_kinds k where k.retired_at is null and k.revision_limit is not null;
  select coalesce(jsonb_object_agg(k.id::text, k.revision_limit), '{}'::jsonb) into v_limits
    from public.provision_kinds k where k.retired_at is null and k.revision_limit is not null;

  insert into public.agreement_baselines (agreement_id, data)
  values (v_id, jsonb_build_object(
    'payment_days', case when v_monthly then d.payment_days_monthly else d.payment_days_one_off end,
    'unused_provisions', case when v_monthly then d.unused_provisions else 'lost' end,
    'grace_days', case when v_monthly then d.grace_days else 0 end,
    'dissolution_notice_days', case when v_monthly then d.dissolution_notice_days else 0 end,
    'dissolution_fee', case when v_monthly then d.dissolution_fee else 0 end,
    'filming_notice_hours', d.filming_notice_hours, 'filming_cancel_hours', d.filming_cancel_hours,
    'late_cancel_burns', d.late_cancel_burns, 'no_show_burns', d.no_show_burns,
    'standard_discount_percent', d.standard_discount_percent, 'standard_discount_months', d.standard_discount_months,
    'advance_percent', d.advance_percent, 'revision_limits', v_limits));

  if not v_monthly then
    insert into public.agreement_milestones (agreement_id, position, trigger, percent)
    select v_id, m.position, m.trigger, m.percent
      from (values (1, 'signature', d.advance_percent), (2, 'delivered', 100 - d.advance_percent)) as m (position, trigger, percent)
     where m.percent > 0;
  end if;

  insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory)
  values (v_id, 1, c.contact_name, c.contact_email, true);
  insert into public.agreement_revisions (agreement_id, number, created_by, summary)
  values (v_id, 1, auth.uid(), 'Νέα πρόταση.');

  perform authz.agreement_log(v_id, format('Ξεκίνησε η σύνταξη πρότασης «%s» (%s).', v_title,
    case when v_monthly then 'μηνιαία' else 'εφάπαξ' end));
  perform authz.agreement_event(v_id, 'agreement_created');
  return v_id;
end;
$$;

-- Τίτλος, γλώσσα, Ισχύς, Έναρξη (null = με την υπογραφή) και Διάρκεια (μόνο μηνιαία). Όλες οι τιμές είναι οι νέες τιμές της φόρμας.
create function public.agreement_update_basics(
  p_agreement uuid, p_title text, p_language text, p_valid_until date, p_start_on date, p_duration_months integer
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  a := authz.agreement_for_edit(p_agreement);
  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Γράψε τον τίτλο της Συμφωνίας' using errcode = 'P0001';
  end if;
  if p_language not in ('el', 'en') then
    raise exception 'Η γλώσσα είναι ελληνικά ή αγγλικά' using errcode = 'P0001';
  end if;
  if p_valid_until is null or p_valid_until < public.sales_today() then
    raise exception 'Η Ισχύς της πρότασης δεν μπορεί να είναι στο παρελθόν' using errcode = 'P0001';
  end if;
  if p_valid_until > public.sales_today() + 90 then
    raise exception 'Η Ισχύς της πρότασης δεν μπορεί να ξεπερνά τις 90 μέρες από σήμερα' using errcode = 'P0001';
  end if;
  if a.kind = 'monthly' and (p_duration_months is null or p_duration_months not between 1 and 60) then
    raise exception 'Η Διάρκεια είναι από 1 έως 60 μήνες' using errcode = 'P0001';
  end if;
  if a.kind = 'one_off' and p_duration_months is not null then
    raise exception 'Η εφάπαξ Συμφωνία δεν έχει Διάρκεια' using errcode = 'P0001';
  end if;
  update public.agreements
     set title = trim(p_title), language = p_language, valid_until = p_valid_until, start_on = p_start_on,
         duration_months = p_duration_months
   where id = p_agreement;
end;
$$;

-- Όροι χωρίς ποσά. Στην εφάπαξ οι Όροι που ισχύουν μόνο στη μηνιαία (αχρησιμοποίητες Παροχές, Περίοδος χάριτος, Ανανέωση,
-- προειδοποίηση λύσης) μένουν όπως είναι.
create function public.agreement_update_terms(
  p_agreement uuid, p_payment_days integer, p_unused_provisions text, p_grace_days integer, p_renewal text,
  p_dissolution_notice_days integer, p_filming_notice_hours integer, p_filming_cancel_hours integer,
  p_late_cancel_burns boolean, p_no_show_burns boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_monthly boolean;
begin
  a := authz.agreement_for_edit(p_agreement);
  v_monthly := a.kind = 'monthly';
  if p_unused_provisions not in ('lost', 'next_period', 'accumulate') or (v_monthly and p_renewal not in ('new_opportunity', 'auto')) then
    raise exception 'Μια τιμή δεν είναι έγκυρη· έλεγξε τους Όρους' using errcode = 'P0001';
  end if;
  update public.agreements set
    payment_days = p_payment_days,
    unused_provisions = case when v_monthly then p_unused_provisions else unused_provisions end,
    grace_days = case when v_monthly then p_grace_days else grace_days end,
    renewal = case when v_monthly then p_renewal else renewal end,
    dissolution_notice_days = case when v_monthly then p_dissolution_notice_days else dissolution_notice_days end,
    filming_notice_hours = p_filming_notice_hours, filming_cancel_hours = p_filming_cancel_hours,
    late_cancel_burns = coalesce(p_late_cancel_burns, late_cancel_burns), no_show_burns = coalesce(p_no_show_burns, no_show_burns)
  where id = p_agreement;
end;
$$;

-- Έκπτωση πρώτων μηνών και ρήτρα λύσης: ποσά, άρα θέλουν «Βλέπει ποσά». Μόνο στη μηνιαία.
create function public.agreement_set_money_terms(
  p_agreement uuid, p_discount_percent numeric, p_discount_months integer, p_dissolution_fee numeric
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  perform authz.require('finance.amounts');
  a := authz.agreement_for_edit(p_agreement);
  if a.kind <> 'monthly' and (coalesce(p_discount_percent, 0) <> 0 or coalesce(p_discount_months, 0) <> 0 or coalesce(p_dissolution_fee, 0) <> 0) then
    raise exception 'Έκπτωση πρώτων μηνών και ρήτρα λύσης ισχύουν μόνο στις μηνιαίες Συμφωνίες' using errcode = 'P0001';
  end if;
  if (coalesce(p_discount_percent, 0) > 0) <> (coalesce(p_discount_months, 0) > 0) then
    raise exception 'Η έκπτωση θέλει και ποσοστό και μήνες' using errcode = 'P0001';
  end if;
  update public.agreement_amounts set
    discount_percent = coalesce(p_discount_percent, 0), discount_months = coalesce(p_discount_months, 0),
    dissolution_fee = coalesce(p_dissolution_fee, 0)
  where agreement_id = p_agreement;
end;
$$;

-- Δόσεις σε ορόσημα (μόνο εφάπαξ), ως [{trigger, percent, due_on}]. Αν τα ποσοστά δεν κάνουν 100% το σύστημα προειδοποιεί, δεν μπλοκάρει.
create function public.agreement_set_milestones(p_agreement uuid, p_milestones jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  a := authz.agreement_for_edit(p_agreement);
  if a.kind <> 'one_off' then
    raise exception 'Οι δόσεις σε ορόσημα ισχύουν μόνο στις εφάπαξ Συμφωνίες' using errcode = 'P0001';
  end if;
  if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' or jsonb_array_length(p_milestones) > 6 then
    raise exception 'Οι δόσεις δεν διαβάστηκαν· δοκίμασε ξανά' using errcode = 'P0001';
  end if;
  delete from public.agreement_milestones where agreement_id = p_agreement;
  insert into public.agreement_milestones (agreement_id, position, trigger, percent, due_on)
  select p_agreement, e.n, e.value ->> 'trigger', (e.value ->> 'percent')::numeric, nullif(e.value ->> 'due_on', '')::date
    from jsonb_array_elements(p_milestones) with ordinality as e (value, n);
end;
$$;

-- Όριο αλλαγών ανά είδος για αυτή τη Συμφωνία, ως [{kind_id, rounds}]. Μόνο για είδη που έχουν Όριο στις προεπιλογές.
create function public.agreement_set_revision_limits(p_agreement uuid, p_limits jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_base jsonb;
begin
  perform authz.agreement_for_edit(p_agreement);
  if p_limits is null or jsonb_typeof(p_limits) <> 'array' then
    raise exception 'Το Όριο αλλαγών δεν διαβάστηκε· δοκίμασε ξανά' using errcode = 'P0001';
  end if;
  select b.data -> 'revision_limits' into v_base from public.agreement_baselines b where b.agreement_id = p_agreement;
  if exists (
    select 1 from jsonb_to_recordset(p_limits) as x (kind_id uuid, rounds integer)
     where x.kind_id is null or x.rounds is null or x.rounds not between 1 and 20 or not (v_base ? x.kind_id::text)
  ) then
    raise exception 'Το Όριο αλλαγών είναι από 1 έως 20 γύρους, για είδη που έχουν Όριο' using errcode = 'P0001';
  end if;
  update public.agreement_revision_limits r set rounds = x.rounds
    from jsonb_to_recordset(p_limits) as x (kind_id uuid, rounds integer)
   where r.agreement_id = p_agreement and r.kind_id = x.kind_id and r.rounds <> x.rounds;
end;
$$;

-- Παραλήπτες, ως [{name, email, is_signatory}]: ένας ακριβώς Υπογράφων. Όσοι λείπουν από τη λίστα αφαιρούνται.
create function public.agreement_set_recipients(p_agreement uuid, p_recipients jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  perform authz.agreement_for_edit(p_agreement);
  if p_recipients is null or jsonb_typeof(p_recipients) <> 'array' then
    raise exception 'Οι παραλήπτες δεν διαβάστηκαν· δοκίμασε ξανά' using errcode = 'P0001';
  end if;
  select count(*) into v_count from jsonb_to_recordset(p_recipients) as x (name text, email text, is_signatory boolean);
  if v_count not between 1 and 10 then
    raise exception 'Χρειάζεται από 1 έως 10 παραλήπτες' using errcode = 'P0001';
  end if;
  if (select count(*) from jsonb_to_recordset(p_recipients) as x (name text, email text, is_signatory boolean)
       where coalesce(x.is_signatory, false)) <> 1 then
    raise exception 'Χρειάζεται ακριβώς ένας Υπογράφων' using errcode = 'P0001';
  end if;
  if (select count(distinct lower(trim(x.email))) from jsonb_to_recordset(p_recipients) as x (name text, email text, is_signatory boolean)) <> v_count then
    raise exception 'Ο ίδιος παραλήπτης μπαίνει μία φορά' using errcode = 'P0001';
  end if;
  delete from public.agreement_recipients r
   where r.agreement_id = p_agreement
     and lower(r.email) not in (select lower(trim(x.email)) from jsonb_to_recordset(p_recipients) as x (name text, email text, is_signatory boolean));
  update public.agreement_recipients set is_signatory = false where agreement_id = p_agreement and is_signatory;
  insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory)
  select p_agreement, e.n, trim(e.value ->> 'name'), lower(trim(e.value ->> 'email')), coalesce((e.value ->> 'is_signatory')::boolean, false)
    from jsonb_array_elements(p_recipients) with ordinality as e (value, n)
  on conflict (agreement_id, lower(email)) do update
    set name = excluded.name, position = excluded.position, is_signatory = excluded.is_signatory;
end;
$$;

-- ───────────── Γραμμές ─────────────

-- Μπαίνει μόνο Πακέτο του ίδιου τύπου με τη Συμφωνία ή Υπηρεσία· αρχειοθετημένο ποτέ. Η γραμμή αντιγράφει τιμή, ώρες, Άμεσο
-- κόστος και Παροχές (catalog_* = ο Κατάλογος της στιγμής) και από εκεί αλλάζουν ελεύθερα. Αντιγράφει ό,τι κι αν βλέπει ο Χρήστης.
create function public.agreement_add_catalogue_line(p_agreement uuid, p_item uuid, p_quantity integer default 1) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  i public.catalogue_items;
  v_line uuid;
  v_provisions jsonb;
begin
  a := authz.agreement_for_edit(p_agreement);
  select * into i from public.catalogue_items x where x.id = p_item and x.retired_at is null;
  if not found then
    raise exception 'Το Πακέτο ή η Υπηρεσία δεν βρέθηκε ή έχει αρχειοθετηθεί' using errcode = 'P0001';
  end if;
  if i.kind = 'package' and i.billing <> a.kind then
    raise exception 'Το Πακέτο είναι % και δεν μπαίνει σε % Συμφωνία',
      case i.billing when 'monthly' then 'μηνιαίο' else 'εφάπαξ' end,
      case a.kind when 'monthly' then 'μηνιαία' else 'εφάπαξ' end using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity not between 1 and 999 then
    raise exception 'Η ποσότητα είναι από 1 έως 999' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind_id', p.kind_id, 'quantity', p.quantity)), '[]'::jsonb) into v_provisions
    from public.catalogue_item_provisions p where p.item_id = p_item;
  insert into public.agreement_lines (agreement_id, position, line_kind, item_id, description, description_en, unit, quantity, catalog_provisions)
  values (p_agreement, coalesce((select max(l.position) from public.agreement_lines l where l.agreement_id = p_agreement), 0) + 1,
          i.kind, i.id, i.name, i.name_en, i.unit, p_quantity, v_provisions)
  returning id into v_line;
  insert into public.agreement_line_amounts (line_id, unit_price, catalog_price)
  select v_line, coalesce(am.price, 0), coalesce(am.price, 0)
    from (select 1) one left join public.catalogue_item_amounts am on am.item_id = p_item;
  insert into public.agreement_line_costs (line_id, hours_shoot, hours_edit, direct_cost)
  select v_line, coalesce(c.hours_shoot, 0), coalesce(c.hours_edit, 0), coalesce(c.direct_cost, 0)
    from (select 1) one left join public.catalogue_item_costs c on c.item_id = p_item;
  insert into public.agreement_line_provisions (line_id, kind_id, quantity)
  select v_line, p.kind_id, p.quantity from public.catalogue_item_provisions p where p.item_id = p_item;
  return v_line;
end;
$$;

-- Ελεύθερη γραμμή: πάντα Παρέκκλιση. Θέλει τιμή, άρα «Βλέπει ποσά».
create function public.agreement_add_free_line(
  p_agreement uuid, p_description text, p_description_en text, p_price numeric
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_line uuid;
begin
  perform authz.require('finance.amounts');
  perform authz.agreement_for_edit(p_agreement);
  if length(trim(coalesce(p_description, ''))) = 0 then
    raise exception 'Γράψε την περιγραφή της γραμμής' using errcode = 'P0001';
  end if;
  if p_price is null or p_price < 0 or p_price >= 10000000 then
    raise exception 'Γράψε μια έγκυρη τιμή' using errcode = 'P0001';
  end if;
  insert into public.agreement_lines (agreement_id, position, line_kind, description, description_en)
  values (p_agreement, coalesce((select max(l.position) from public.agreement_lines l where l.agreement_id = p_agreement), 0) + 1,
          'free', trim(p_description), trim(coalesce(p_description_en, '')))
  returning id into v_line;
  insert into public.agreement_line_amounts (line_id, unit_price) values (v_line, p_price);
  insert into public.agreement_line_costs (line_id) values (v_line);
  return v_line;
end;
$$;

-- Αλλαγή γραμμής· null = δεν αλλάζει. Τιμή: «Βλέπει ποσά». Ώρες και Άμεσο κόστος: «Διαχειρίζεται κόστος».
create function public.agreement_update_line(
  p_line uuid, p_quantity integer, p_description text, p_description_en text, p_unit_price numeric,
  p_hours_shoot numeric, p_hours_edit numeric, p_direct_cost numeric
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_agreement uuid;
begin
  select l.agreement_id into v_agreement from public.agreement_lines l where l.id = p_line;
  if v_agreement is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_unit_price is not null then
    perform authz.require('finance.amounts');
  end if;
  if p_hours_shoot is not null or p_hours_edit is not null or p_direct_cost is not null then
    if not authz.can_manage_cost() then
      raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
    end if;
  end if;
  perform authz.agreement_for_edit(v_agreement);
  if p_description is not null and length(trim(p_description)) = 0 then
    raise exception 'Γράψε την περιγραφή της γραμμής' using errcode = 'P0001';
  end if;
  if p_quantity is not null and p_quantity not between 1 and 999 then
    raise exception 'Η ποσότητα είναι από 1 έως 999' using errcode = 'P0001';
  end if;
  update public.agreement_lines set
    quantity = coalesce(p_quantity, quantity), description = coalesce(trim(p_description), description),
    description_en = coalesce(trim(p_description_en), description_en)
  where id = p_line;
  if p_unit_price is not null then
    update public.agreement_line_amounts set unit_price = p_unit_price where line_id = p_line;
  end if;
  update public.agreement_line_costs set
    hours_shoot = coalesce(p_hours_shoot, hours_shoot), hours_edit = coalesce(p_hours_edit, hours_edit),
    direct_cost = coalesce(p_direct_cost, direct_cost)
  where line_id = p_line and (p_hours_shoot is not null or p_hours_edit is not null or p_direct_cost is not null);
end;
$$;

-- Οι Παροχές μιας γραμμής ανά μονάδα, ως [{kind_id, quantity}]. Αποσυρμένο είδος δεν μπαίνει αν δεν το έχει ήδη η γραμμή.
create function public.agreement_set_line_provisions(p_line uuid, p_provisions jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_agreement uuid;
  v_ids uuid[];
  v_qty integer[];
  v_bad text;
begin
  select l.agreement_id into v_agreement from public.agreement_lines l where l.id = p_line;
  if v_agreement is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_for_edit(v_agreement);
  if p_provisions is null or jsonb_typeof(p_provisions) <> 'array' then
    raise exception 'Οι Παροχές δεν διαβάστηκαν· δοκίμασε ξανά' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(x.kind_id), '{}'), coalesce(array_agg(x.quantity), '{}')
    into v_ids, v_qty from jsonb_to_recordset(p_provisions) as x (kind_id uuid, quantity integer);
  if exists (select 1 from unnest(v_qty) q where q is null or q < 1 or q > 999) then
    raise exception 'Η ποσότητα κάθε Παροχής είναι ακέραιος από 1 έως 999' using errcode = 'P0001';
  end if;
  if (select count(distinct k) from unnest(v_ids) k) <> cardinality(v_ids) then
    raise exception 'Κάθε είδος Παροχής μπαίνει μία φορά' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(v_ids) u (id) where not exists (select 1 from public.provision_kinds k where k.id = u.id)) then
    raise exception 'Άγνωστο είδος Παροχής' using errcode = 'P0001';
  end if;
  select k.label into v_bad from public.provision_kinds k
   where k.id = any (v_ids) and k.retired_at is not null
     and not exists (select 1 from public.agreement_line_provisions p where p.line_id = p_line and p.kind_id = k.id)
   limit 1;
  if v_bad is not null then
    raise exception 'Το είδος Παροχής «%» έχει αποσυρθεί και δεν επιλέγεται σε νέα στοιχεία', v_bad using errcode = 'P0001';
  end if;
  delete from public.agreement_line_provisions p where p.line_id = p_line and not (p.kind_id = any (v_ids));
  insert into public.agreement_line_provisions (line_id, kind_id, quantity)
  select p_line, u.id, u.q from unnest(v_ids, v_qty) as u (id, q)
  on conflict (line_id, kind_id) do update set quantity = excluded.quantity
    where public.agreement_line_provisions.quantity is distinct from excluded.quantity;
end;
$$;

create function public.agreement_remove_line(p_line uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_agreement uuid;
begin
  select l.agreement_id into v_agreement from public.agreement_lines l where l.id = p_line;
  if v_agreement is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_for_edit(v_agreement);
  delete from public.agreement_line_provisions where line_id = p_line;
  delete from public.agreement_line_amounts where line_id = p_line;
  delete from public.agreement_line_costs where line_id = p_line;
  delete from public.agreement_lines where id = p_line;
end;
$$;

-- Τα στοιχεία Καταλόγου που μπορεί να διαλέξει η γραμμή (ίδιος τύπος, ενεργά). Δουλεύει για όποιον συντάσσει, ακόμα κι αν
-- δεν έχει «Βλέπει Κατάλογο»· η τιμή φαίνεται μόνο με «Βλέπει ποσά».
create function public.agreement_catalogue_options(p_agreement uuid)
returns table (item_id uuid, kind text, billing text, name text, unit text, price numeric, provisions jsonb)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.kind, i.billing, i.name, i.unit,
         case when authz.has('finance.amounts') then coalesce(am.price, 0) end,
         coalesce((
           select jsonb_agg(jsonb_build_object('kind_id', p.kind_id, 'quantity', p.quantity) order by k.sort, k.id)
             from public.catalogue_item_provisions p join public.provision_kinds k on k.id = p.kind_id
            where p.item_id = i.id), '[]'::jsonb)
    from public.agreements a
    join public.catalogue_items i on i.retired_at is null and (i.kind = 'service' or i.billing = a.kind)
    left join public.catalogue_item_amounts am on am.item_id = i.id
   where a.id = p_agreement and authz.can_draft_agreement(p_agreement)
   order by i.kind desc, lower(i.name), i.id;
$$;

-- ───────────── Εγγραφή: πορεία της πρότασης (D2, D4, B4) ─────────────

-- Αποστολή. Χωρίς Παρέκκλιση, ή με Παρέκκλιση που καλύπτει Έγκριση, ή από όποιον «Παρεκκλίνει»: φεύγει αμέσως (ADR 0009).
-- Όποιος «Παρεκκλίνει» και στέλνει πρόταση με Παρεκκλίσεις τις εγκρίνει έτσι ο ίδιος: η Έγκριση γράφεται στην αναθεώρηση,
-- ώστε μια επόμενη αναθεώρηση από πωλητή να μη θέλει ξανά Έγκριση για ό,τι ήδη στάλθηκε.
create function public.agreement_send(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  a := authz.agreement_for_edit(p_agreement);
  -- Ο Σύνδεσμος που φεύγει δείχνει τιμές: στέλνει μόνο όποιος «Βλέπει ποσά».
  perform authz.require('finance.amounts');
  if authz.agreement_needs_approval(p_agreement) then
    raise exception 'Η πρόταση έχει Παρέκκλιση χωρίς Έγκριση· ζήτησε Έγκριση' using errcode = 'P0001';
  end if;
  if authz.has('agreements.deviate') and exists (select 1 from authz.agreement_deviations(p_agreement)) then
    update public.agreement_revisions set
      approval_state = 'approved', decided_by = auth.uid(), decided_at = now(),
      comment = 'Στάλθηκε από όποιον «Παρεκκλίνει από τον Κατάλογο».',
      approved_deviations = (select coalesce(jsonb_object_agg(d.key, d.depth), '{}'::jsonb) from authz.agreement_deviations(p_agreement) d)
     where agreement_id = p_agreement and number = a.revision;
  end if;
  perform authz.agreement_do_send(p_agreement);
end;
$$;

create function public.agreement_request_approval(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  a := authz.agreement_for_edit(p_agreement);
  if not exists (select 1 from public.agreement_lines l where l.agreement_id = p_agreement) then
    raise exception 'Η πρόταση δεν έχει γραμμές' using errcode = 'P0001';
  end if;
  if not authz.agreement_needs_approval(p_agreement) then
    raise exception 'Δεν χρειάζεται Έγκριση· στείλε την πρόταση' using errcode = 'P0001';
  end if;
  update public.agreement_revisions set
    approval_state = 'pending', requested_by = auth.uid(), requested_at = now(), decided_by = null, decided_at = null, comment = '',
    requested_deviations = (select coalesce(jsonb_object_agg(d.key, d.depth), '{}'::jsonb) from authz.agreement_deviations(p_agreement) d)
   where agreement_id = p_agreement and number = a.revision;
  update public.agreements set path = 'awaiting_approval' where id = p_agreement;
  perform authz.agreement_log(p_agreement, 'Ζητήθηκε Έγκριση πρότασης.');
  perform authz.agreement_event(p_agreement, 'approval_requested', jsonb_build_object('revision', a.revision));
end;
$$;

-- Ο Υπεύθυνος αποσύρει το αίτημα. (Και κάθε αλλαγή της πρότασης το αποσύρει μόνη της: βλ. authz.agreement_for_edit.)
create function public.agreement_withdraw_approval(p_agreement uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.agreements a where a.id = p_agreement and a.path = 'awaiting_approval' and authz.can_draft_agreement(a.id)) then
    raise exception 'Δεν υπάρχει αίτημα Έγκρισης για απόσυρση' using errcode = 'P0001';
  end if;
  perform authz.agreement_for_edit(p_agreement);
end;
$$;

-- «Εγκρίνω» (η πρόταση φεύγει αμέσως σε όλους τους παραλήπτες) ή απόρριψη με υποχρεωτικό σχόλιο (γυρίζει σε Σύνταξη, ίδια αναθεώρηση).
create function public.agreement_decide(p_agreement uuid, p_approve boolean, p_comment text default '') returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_comment text := trim(coalesce(p_comment, ''));
begin
  perform authz.require('agreements.deviate');
  if not authz.can_see_agreement(p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement for update;
  if a.state <> 'proposal' or a.path <> 'awaiting_approval' then
    raise exception 'Η πρόταση δεν περιμένει Έγκριση' using errcode = 'P0001';
  end if;
  if not coalesce(p_approve, false) then
    if v_comment = '' then
      raise exception 'Γράψε σχόλιο: τι να αλλάξει ο Υπεύθυνος' using errcode = 'P0001';
    end if;
    update public.agreement_revisions set approval_state = 'rejected', decided_by = auth.uid(), decided_at = now(), comment = v_comment
     where agreement_id = p_agreement and number = a.revision;
    update public.agreements set path = 'draft' where id = p_agreement;
    perform authz.agreement_log(p_agreement, 'Η Έγκριση απορρίφθηκε: ' || v_comment);
    perform authz.agreement_event(p_agreement, 'approval_rejected', jsonb_build_object('revision', a.revision));
    return;
  end if;
  perform authz.require('finance.amounts');
  update public.agreement_revisions set
    approval_state = 'approved', decided_by = auth.uid(), decided_at = now(), comment = v_comment,
    approved_deviations = (select coalesce(jsonb_object_agg(d.key, d.depth), '{}'::jsonb) from authz.agreement_deviations(p_agreement) d)
   where agreement_id = p_agreement and number = a.revision;
  perform authz.agreement_log(p_agreement, 'Η πρόταση εγκρίθηκε και στάλθηκε.');
  perform authz.agreement_event(p_agreement, 'approval_granted', jsonb_build_object('revision', a.revision));
  perform authz.agreement_do_send(p_agreement);
end;
$$;

-- Νέα αναθεώρηση πρότασης που στάλθηκε (ή έληξε): οι παλιοί Σύνδεσμοι ακυρώνονται, η πρόταση γυρίζει σε Σύνταξη.
create function public.agreement_new_revision(p_agreement uuid, p_summary text default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  perform 1 from public.agreements x where x.id = p_agreement for update;
  if not found or not authz.can_draft_agreement(p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement;
  if a.state <> 'proposal' or a.path not in ('sent', 'expired') then
    raise exception 'Νέα αναθεώρηση γίνεται μόνο σε πρόταση που στάλθηκε' using errcode = 'P0001';
  end if;
  -- Αν η Ισχύς πέρασε, η νέα αναθεώρηση παίρνει την προεπιλεγμένη Ισχύς των Ρυθμίσεων (αλλάζει στη Σύνταξη).
  update public.agreements
     set revision = revision + 1, path = 'draft',
         valid_until = case when valid_until < public.sales_today()
                            then public.sales_today() + (select d.proposal_validity_days from public.agreement_defaults d where d.id)
                            else valid_until end
   where id = p_agreement;
  insert into public.agreement_revisions (agreement_id, number, created_by, summary)
  values (p_agreement, a.revision + 1, auth.uid(), coalesce(nullif(trim(p_summary), ''), 'Νέα αναθεώρηση σε σύνταξη.'));
  perform authz.agreement_revoke_links(p_agreement, 'superseded');
  perform authz.agreement_log(p_agreement, format('Νέα αναθεώρηση %s: οι Σύνδεσμοι της προηγούμενης ακυρώθηκαν.', a.revision + 1));
  perform authz.agreement_event(p_agreement, 'revision_created', jsonb_build_object('revision', a.revision + 1));
end;
$$;

-- Παράταση: νέα Ισχύς, νέοι Σύνδεσμοι, ίδιες τιμές. Δεν είναι Παρέκκλιση ακόμα κι αν άλλαξε ο Κατάλογος (ADR 0009).
create function public.agreement_extend(p_agreement uuid, p_days integer default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_days integer;
  v_until date;
  v_doc jsonb;
begin
  perform 1 from public.agreements x where x.id = p_agreement for update;
  if not found or not authz.can_draft_agreement(p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require('finance.amounts');
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement;
  if a.state <> 'proposal' or a.path <> 'expired' then
    raise exception 'Παράταση δίνεται μόνο σε πρόταση που έληξε' using errcode = 'P0001';
  end if;
  v_days := coalesce(p_days, (select d.proposal_validity_days from public.agreement_defaults d where d.id));
  if v_days not between 1 and 365 then
    raise exception 'Η Παράταση είναι από 1 έως 365 μέρες' using errcode = 'P0001';
  end if;
  v_until := public.sales_today() + v_days;
  if v_until > public.sales_today() + 90 then
    raise exception 'Η Ισχύς της πρότασης δεν μπορεί να ξεπερνά τις 90 μέρες από σήμερα' using errcode = 'P0001';
  end if;
  perform authz.agreement_revoke_links(p_agreement, 'superseded');
  update public.agreements set valid_until = v_until, path = 'sent' where id = p_agreement;
  update public.agreement_documents set document = jsonb_set(document, '{valid_until}', to_jsonb(v_until::text)) where agreement_id = p_agreement and revision = a.revision;
  update public.agreement_documents set hash = authz.document_hash(document) where agreement_id = p_agreement and revision = a.revision;
  perform authz.agreement_issue_links(p_agreement);
  perform authz.agreement_log(p_agreement, format('Παράταση %s μερών: νέοι Σύνδεσμοι, ίδιες τιμές.', v_days));
  perform authz.agreement_event(p_agreement, 'proposal_extended', jsonb_build_object('valid_until', v_until));
end;
$$;

-- Κλείσιμο ως χαμένη μετά τη λήξη, με υποχρεωτικό Λόγο απώλειας. Η Ευκαιρία γίνεται χαμένη και η πρόταση ακολουθεί (trigger).
create function public.agreement_close_lost(p_agreement uuid, p_loss_reason uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  perform 1 from public.agreements x where x.id = p_agreement for update;
  if not found or not authz.can_draft_agreement(p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement;
  if a.state <> 'proposal' or a.path <> 'expired' then
    raise exception 'Κλείσιμο ως χαμένη γίνεται μόνο σε πρόταση που έληξε' using errcode = 'P0001';
  end if;
  if p_loss_reason is null then
    raise exception 'Διάλεξε Λόγο απώλειας' using errcode = 'P0001';
  end if;
  update public.opportunities set outcome = 'lost', loss_reason_id = p_loss_reason, closed_at = now()
   where id = a.opportunity_id and outcome = 'open';
  if not found then
    raise exception 'Η Ευκαιρία δεν είναι ανοιχτή' using errcode = 'P0001';
  end if;
end;
$$;

-- Ανάκληση ενός Συνδέσμου (π.χ. διέρρευσε) και έκδοση νέου για τον ίδιο παραλήπτη. Οι υπόλοιποι μένουν ενεργοί.
create function authz.agreement_link_for_change(p_link uuid) returns public.agreement_links
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
  a public.agreements;
begin
  select * into l from public.agreement_links x where x.id = p_link;
  if not found or not authz.can_draft_agreement(l.agreement_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(l.agreement_id);
  select * into a from public.agreements x where x.id = l.agreement_id for update;
  if authz.link_status(l, a) <> 'active' then
    raise exception 'Ο Σύνδεσμος δεν δουλεύει ήδη' using errcode = 'P0001';
  end if;
  return l;
end;
$$;

create function public.agreement_revoke_link(p_link uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
begin
  l := authz.agreement_link_for_change(p_link);
  update public.agreement_links set revoked_at = now(), revoked_reason = 'revoked' where id = l.id;
  update public.agreement_outbox set status = 'cancelled', handled_at = now(), payload = '{}'::jsonb
   where link_id = l.id and status = 'pending' and kind in ('proposal_link', 'signing_code');
  perform authz.agreement_event(l.agreement_id, 'link_revoked');
end;
$$;

create function public.agreement_reissue_link(p_link uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
begin
  perform authz.require('finance.amounts');
  l := authz.agreement_link_for_change(p_link);
  if l.recipient_id is null then
    raise exception 'Ο παραλήπτης δεν υπάρχει πια' using errcode = 'P0001';
  end if;
  update public.agreement_links set revoked_at = now(), revoked_reason = 'revoked' where id = l.id;
  update public.agreement_outbox set status = 'cancelled', handled_at = now(), payload = '{}'::jsonb
   where link_id = l.id and status = 'pending' and kind in ('proposal_link', 'signing_code');
  perform authz.agreement_issue_link(l.agreement_id, l.recipient_id);
  perform authz.agreement_event(l.agreement_id, 'link_reissued');
end;
$$;

-- «Υπογράφηκε εκτός συστήματος» (πιστοποιημένη υπογραφή ή Συμφωνία πριν τη μετάβαση): όποιος «Παρεκκλίνει». Το αρχείο της
-- υπογραφής καταχωρείται ως αναφορά (όνομα ή σύνδεσμος)· η αποθήκευση αρχείων έρχεται με το module Αρχεία. Έναρξη μπορεί να
-- είναι και στο παρελθόν: τότε ανοίγει μόνο η τρέχουσα Περίοδος και η ομάδα γράφει τι έχει ήδη καταναλωθεί (used) και αν ο
-- τρέχων μήνας τιμολογήθηκε ήδη εκτός συστήματος (invoiced).
create function public.agreement_sign_outside(
  p_agreement uuid, p_signed_on date, p_signed_by text, p_start date, p_reference text, p_used jsonb default '[]'::jsonb,
  p_invoiced boolean default false
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_today date := public.sales_today();
  v_old_start boolean;
  v_used jsonb := '[]'::jsonb;
begin
  perform authz.require('agreements.deviate');
  if not authz.can_see_agreement(p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement for update;
  if a.state <> 'proposal' or a.path not in ('draft', 'sent', 'expired') then
    raise exception 'Υπογραφή εκτός συστήματος καταχωρείται σε πρόταση που δεν περιμένει Έγκριση και δεν έχει κλείσει' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.agreement_lines l where l.agreement_id = p_agreement) then
    raise exception 'Η πρόταση δεν έχει γραμμές' using errcode = 'P0001';
  end if;
  if p_signed_on is null or p_signed_on > v_today or p_signed_on < v_today - 3650 then
    raise exception 'Η ημερομηνία υπογραφής δεν μπορεί να είναι στο μέλλον' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_signed_by, ''))) = 0 then
    raise exception 'Γράψε ποιος υπέγραψε' using errcode = 'P0001';
  end if;
  if p_start is null then
    raise exception 'Γράψε την Έναρξη' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_reference, ''))) < 3 then
    raise exception 'Γράψε το αρχείο της υπογραφής (όνομα ή σύνδεσμος)' using errcode = 'P0001';
  end if;
  v_old_start := a.kind = 'monthly' and p_start < date_trunc('month', v_today)::date;
  if v_old_start then
    if p_used is null or jsonb_typeof(p_used) <> 'array' or exists (
      select 1 from jsonb_to_recordset(p_used) as x (kind_id uuid, used integer)
       where x.kind_id is null or x.used is null or x.used < 0 or x.used > 999 or not exists (
         select 1 from public.agreement_line_provisions p join public.agreement_lines l on l.id = p.line_id
          where l.agreement_id = p_agreement and p.kind_id = x.kind_id)
    ) then
      raise exception 'Οι Παροχές που έχουν ήδη καταναλωθεί δεν διαβάστηκαν· έλεγξέ τες' using errcode = 'P0001';
    end if;
    v_used := p_used;
  end if;
  perform authz.agreement_finalize_signature(p_agreement, 'outside', trim(p_signed_by), jsonb_build_object(
    'signed_on', p_signed_on, 'start', p_start, 'reference', trim(p_reference), 'used', v_used,
    'invoiced', v_old_start and coalesce(p_invoiced, false)));
end;
$$;

-- «Το έστειλα με το χέρι» (manual) ή «Δεν χρειάζεται πια» (cancelled) για ένα μήνυμα που περιμένει στα εξερχόμενα.
create function public.agreement_outbox_mark(p_outbox uuid, p_status text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.agreement_outbox;
begin
  select * into o from public.agreement_outbox x where x.id = p_outbox;
  if not found or not authz.can_draft_agreement(o.agreement_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_status not in ('manual', 'cancelled') then
    raise exception 'Άγνωστη ενέργεια' using errcode = 'P0001';
  end if;
  if o.status <> 'pending' then
    raise exception 'Το μήνυμα έχει ήδη τακτοποιηθεί' using errcode = 'P0001';
  end if;
  update public.agreement_outbox set status = p_status, handled_at = now(), handled_by = auth.uid(), payload = '{}'::jsonb
   where id = p_outbox;
end;
$$;

-- ───────────── Ο πάροχος email (σημείο επέκτασης): μόνο service role ─────────────
-- Όταν συνδεθεί ο πάροχος, ένας worker (cron) καλεί claim, στέλνει, καλεί done. Μέχρι τότε το claim δεν επιστρέφει τίποτα και τα
-- μηνύματα τα παραδίδει η ομάδα με το χέρι. Το αντίγραφο της υπογεγραμμένης Συμφωνίας ('signed_copy') έρχεται με το έγγραφο
-- που υπέγραψε ο πελάτης· τις 'client_invite' τις παίρνει το module Πρόσβασης όταν χτίσει την πρόσκληση Χρήστη πελάτη.

create function public.agreement_outbox_claim(p_limit integer default 20)
returns table (
  id uuid, kind text, to_name text, to_email text, locale text, payload jsonb, agreement_id uuid, agreement_title text,
  manager_name text, attempts integer, document jsonb
)
language sql security definer set search_path = ''
as $$
  with picked as (
    select o.id from public.agreement_outbox o
     where o.status = 'pending' and (select d.email_sender_connected from public.agreement_defaults d where d.id)
     order by o.created_at limit greatest(1, least(coalesce(p_limit, 20), 100))
     for update skip locked
  ), claimed as (
    update public.agreement_outbox o set attempts = o.attempts + 1 from picked where o.id = picked.id
    returning o.*
  )
  select c.id, c.kind, c.to_name, c.to_email, c.locale, c.payload, c.agreement_id, a.title, u.name, c.attempts,
         case when c.kind = 'signed_copy'
              then (select d.document from public.agreement_documents d where d.agreement_id = c.agreement_id and d.revision = a.revision) end
    from claimed c
    join public.agreements a on a.id = c.agreement_id
    join public.opportunities op on op.id = a.opportunity_id
    left join public.team_users u on u.user_id = op.manager_id
   order by c.created_at;
$$;

create function public.agreement_outbox_done(p_outbox uuid, p_ok boolean, p_error text default '') returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.agreement_outbox;
begin
  select * into o from public.agreement_outbox x where x.id = p_outbox for update;
  if not found or o.status <> 'pending' then
    return;
  end if;
  if coalesce(p_ok, false) then
    update public.agreement_outbox set status = 'sent', handled_at = now(), payload = '{}'::jsonb, last_error = '' where id = p_outbox;
  elsif o.attempts >= 5 then
    update public.agreement_outbox set status = 'failed', handled_at = now(), payload = '{}'::jsonb, last_error = left(coalesce(p_error, ''), 500)
     where id = p_outbox;
  else
    update public.agreement_outbox set last_error = left(coalesce(p_error, ''), 500) where id = p_outbox;
  end if;
end;
$$;

-- Γράφει τις αλλαγές «σήμερα» σε όλες τις Συμφωνίες (λήξη πρότασης, έναρξη, λήξη). Προαιρετικό: οι αναγνώσεις και οι εγγραφές
-- τις υπολογίζουν ούτως ή άλλως. Cron ή χειροκίνητη κλήση με service role.
create function public.agreements_tick() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select a.id from public.agreements a
     where authz.agreement_eff_path(a) <> a.path or authz.agreement_eff_state(a) <> a.state
  loop
    perform authz.agreement_settle(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Ο Σύνδεσμος πρότασης (D5): ανώνυμος, με token ─────────────
-- Κάθε συνάρτηση δέχεται μόνο το token και επιστρέφει στοιχεία μόνο αυτής της πρότασης. Δεν γίνεται σύγκριση, λίστα ή αναζήτηση.
-- Οι αναμενόμενες αποτυχίες (λάθος κωδικός, όριο, ληγμένος Σύνδεσμος) επιστρέφουν {status}· δεν ρίχνουν exception, ώστε να
-- καταγράφονται οι προσπάθειες (το exception θα τις γύριζε πίσω μαζί με τη συναλλαγή).

create function authz.public_link(p_token text) returns public.agreement_links
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into l from public.agreement_links x where x.token_hash = authz.token_hash(p_token);
  if not found then
    return null;
  end if;
  perform authz.agreement_settle(l.agreement_id);
  -- Η γραμμή του Συνδέσμου διαβάζεται ξανά μετά το κλείδωμα της Συμφωνίας: ανάκληση που έγινε όσο περιμέναμε φαίνεται.
  select * into l from public.agreement_links x where x.id = l.id;
  return l;
end;
$$;

create function public.agreement_public_view(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
  a public.agreements;
  c public.company_settings;
  v_status text;
  v_manager text;
  v_signatory text;
  v_result jsonb;
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select * into a from public.agreements x where x.id = l.agreement_id;
  select * into c from public.company_settings x where x.id;
  v_status := authz.link_status(l, a);
  select u.name into v_manager from public.opportunities o left join public.team_users u on u.user_id = o.manager_id where o.id = a.opportunity_id;
  select r.name into v_signatory from public.agreement_recipients r where r.agreement_id = a.id and r.is_signatory;
  v_result := jsonb_build_object(
    'status', v_status, 'language', a.language, 'manager_name', v_manager,
    'company', jsonb_build_object('name', coalesce(nullif(c.trade_name, ''), c.legal_name), 'email', c.email, 'phone', c.phone));
  if v_status = 'expired' then
    return v_result || jsonb_build_object('valid_until', a.valid_until);
  elsif v_status = 'signed' then
    return v_result || jsonb_build_object('signed_at', a.signed_at);
  elsif v_status <> 'active' then
    return v_result;
  end if;
  update public.agreement_links
     set first_opened_at = coalesce(first_opened_at, now()), last_opened_at = now(), open_count = open_count + 1
   where id = l.id;
  if l.first_opened_at is null then
    perform authz.agreement_event(a.id, 'link_opened', jsonb_build_object('recipient', l.recipient_name));
  end if;
  return v_result || jsonb_build_object(
    'document', (select d.document from public.agreement_documents d where d.agreement_id = a.id and d.revision = a.revision),
    'valid_until', a.valid_until,
    'can_sign', l.is_signatory,
    'signatory_name', v_signatory,
    'viewer_name', l.recipient_name,
    'masked_email', left(split_part(l.recipient_email, '@', 1), 1) || '•••@' || split_part(l.recipient_email, '@', 2),
    'code_channel', case when (select d.email_sender_connected from public.agreement_defaults d where d.id) then 'email' else 'manual' end);
end;
$$;

-- Βήμα 1 της υπογραφής: όνομα + «Αποδέχομαι» → κωδικός 6 ψηφίων. Όριο: 1 ανά 60″, 5 ανά ώρα ανά Σύνδεσμο. Τον κωδικό δεν
-- τον επιστρέφει ποτέ: πάει στα εξερχόμενα (agreement_outbox) για παράδοση.
create function public.agreement_public_request_code(p_token text, p_name text, p_accepted boolean, p_ip text default '')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
  a public.agreements;
  v_status text;
  v_name text := trim(coalesce(p_name, ''));
  v_last timestamptz;
  v_recent integer;
  v_total integer;
  v_oldest timestamptz;
  v_code text;
  v_salt text := authz.new_token();
  v_connected boolean;
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select * into a from public.agreements x where x.id = l.agreement_id;
  v_status := authz.link_status(l, a);
  if v_status <> 'active' then
    return jsonb_build_object('status', v_status);
  end if;
  if not l.is_signatory then
    return jsonb_build_object('status', 'not_signatory');
  end if;
  if length(v_name) = 0 or length(v_name) > 120 then
    return jsonb_build_object('status', 'invalid_name');
  end if;
  if not coalesce(p_accepted, false) then
    return jsonb_build_object('status', 'not_accepted');
  end if;
  select max(o.created_at), count(*) filter (where o.created_at > now() - interval '1 hour'), min(o.created_at) filter (where o.created_at > now() - interval '1 hour'), count(*)
    into v_last, v_recent, v_oldest, v_total from public.agreement_otps o where o.link_id = l.id;
  -- Πλαφόν ζωής: το πολύ 20 κωδικοί ανά Σύνδεσμο (έως 100 μαντεψιές συνολικά)· μετά η ομάδα εκδίδει νέο Σύνδεσμο.
  if v_total >= 20 then
    return jsonb_build_object('status', 'locked');
  end if;
  if v_last is not null and v_last > now() - interval '60 seconds' then
    return jsonb_build_object('status', 'rate_limited', 'retry_after', ceil(extract(epoch from (v_last + interval '60 seconds' - now())))::integer);
  end if;
  if v_recent >= 5 then
    return jsonb_build_object('status', 'rate_limited', 'retry_after', ceil(extract(epoch from (v_oldest + interval '1 hour' - now())))::integer);
  end if;
  update public.agreement_otps set superseded_at = now() where link_id = l.id and consumed_at is null and superseded_at is null;
  update public.agreement_outbox set status = 'cancelled', handled_at = now(), payload = '{}'::jsonb
   where link_id = l.id and kind = 'signing_code' and status = 'pending';
  v_code := lpad((((('x' || left(replace(gen_random_uuid()::text, '-', ''), 8))::bit(32))::bigint) % 1000000)::text, 6, '0');
  insert into public.agreement_otps (link_id, code_hash, salt, name_entered, ip, expires_at)
  values (l.id, encode(sha256(convert_to(v_code || v_salt, 'UTF8')), 'hex'), v_salt, v_name, left(coalesce(p_ip, ''), 64), now() + interval '10 minutes');
  insert into public.agreement_outbox (agreement_id, link_id, kind, to_name, to_email, locale, payload)
  values (a.id, l.id, 'signing_code', l.recipient_name, l.recipient_email, a.language,
          jsonb_build_object('code', v_code, 'expires_at', now() + interval '10 minutes'));
  perform authz.agreement_event(a.id, 'signing_code_requested');
  select d.email_sender_connected into v_connected from public.agreement_defaults d where d.id;
  return jsonb_build_object(
    'status', 'sent', 'channel', case when v_connected then 'email' else 'manual' end,
    'masked_email', left(split_part(l.recipient_email, '@', 1), 1) || '•••@' || split_part(l.recipient_email, '@', 2));
end;
$$;

-- Βήμα 2: ο κωδικός. 5 προσπάθειες ανά κωδικό, ισχύς 10 λεπτά. Με σωστό κωδικό υπογράφεται η Συμφωνία.
create function public.agreement_public_sign(p_token text, p_code text, p_ip text default '', p_user_agent text default '')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
  a public.agreements;
  o public.agreement_otps;
  v_status text;
  v_attempts integer;
  v_connected boolean;
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select * into a from public.agreements x where x.id = l.agreement_id for update;
  v_status := authz.link_status(l, a);
  if v_status <> 'active' then
    return jsonb_build_object('status', v_status);
  end if;
  if not l.is_signatory then
    return jsonb_build_object('status', 'not_signatory');
  end if;
  select * into o from public.agreement_otps x
   where x.link_id = l.id and x.consumed_at is null and x.superseded_at is null order by x.created_at desc limit 1 for update;
  if not found or o.expires_at < now() then
    return jsonb_build_object('status', 'code_expired');
  end if;
  if o.attempts >= 5 then
    return jsonb_build_object('status', 'locked');
  end if;
  v_attempts := o.attempts + 1;
  update public.agreement_otps set attempts = v_attempts where id = o.id;
  if coalesce(p_code, '') !~ '^[0-9]{6}$'
     or encode(sha256(convert_to(p_code || o.salt, 'UTF8')), 'hex') <> o.code_hash then
    return jsonb_build_object('status', case when v_attempts >= 5 then 'locked' else 'wrong_code' end, 'attempts_left', greatest(5 - v_attempts, 0));
  end if;
  update public.agreement_otps set consumed_at = now() where id = o.id;
  select d.email_sender_connected into v_connected from public.agreement_defaults d where d.id;
  perform authz.agreement_finalize_signature(a.id, 'link', o.name_entered, jsonb_build_object(
    'link_id', l.id, 'ip', left(coalesce(p_ip, ''), 64), 'user_agent', left(coalesce(p_user_agent, ''), 300),
    'otp_delivery', case when v_connected then 'email' else 'manual' end));
  return jsonb_build_object('status', 'signed', 'signed_at', (select x.signed_at from public.agreements x where x.id = a.id));
end;
$$;

-- «Θέλω αλλαγές»: όλοι οι παραλήπτες, όσες φορές θέλουν (έως 10 την ημέρα ανά Σύνδεσμο). Δεν κλείνει τίποτα.
create function public.agreement_public_request_changes(p_token text, p_message text, p_ip text default '') returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
  a public.agreements;
  v_status text;
  v_message text := trim(coalesce(p_message, ''));
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select * into a from public.agreements x where x.id = l.agreement_id;
  v_status := authz.link_status(l, a);
  if v_status <> 'active' then
    return jsonb_build_object('status', v_status);
  end if;
  if length(v_message) = 0 or length(v_message) > 2000 then
    return jsonb_build_object('status', 'invalid_message');
  end if;
  if (select count(*) from public.agreement_change_requests r where r.link_id = l.id and r.created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  insert into public.agreement_change_requests (agreement_id, revision, link_id, from_name, message, ip)
  values (a.id, a.revision, l.id, l.recipient_name, v_message, left(coalesce(p_ip, ''), 64));
  perform authz.agreement_log(a.id, format('Ο πελάτης ζήτησε αλλαγές (%s): «%s»', l.recipient_name, left(v_message, 300)));
  perform authz.agreement_event(a.id, 'changes_requested', jsonb_build_object('revision', a.revision));
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Απόρριψη: μόνο ο Υπογράφων. Η Ευκαιρία γίνεται χαμένη με τον Λόγο απώλειας του συστήματος και η πρόταση ακολουθεί (trigger).
create function public.agreement_public_decline(p_token text, p_reason text default '', p_ip text default '') returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
  a public.agreements;
  v_status text;
  v_reason text := left(trim(coalesce(p_reason, '')), 1000);
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  select * into a from public.agreements x where x.id = l.agreement_id for update;
  v_status := authz.link_status(l, a);
  if v_status <> 'active' then
    return jsonb_build_object('status', v_status);
  end if;
  if not l.is_signatory then
    return jsonb_build_object('status', 'not_signatory');
  end if;
  perform authz.agreement_log(a.id, 'Ο Υπογράφων (' || l.recipient_name || ') απέρριψε την πρόταση' ||
    case when v_reason <> '' then ': «' || left(v_reason, 300) || '»' else '.' end);
  update public.opportunities set outcome = 'lost', loss_reason_id = authz.agreement_declined_reason(), closed_at = now()
   where id = a.opportunity_id and outcome = 'open';
  perform authz.agreement_event(a.id, 'proposal_declined', jsonb_build_object('ip', left(coalesce(p_ip, ''), 64)));
  return jsonb_build_object('status', 'declined');
end;
$$;

-- ───────────── Ανάγνωση (το μόνο που διαβάζει η εφαρμογή για τις Συμφωνίες) ─────────────
-- Τιμές μόνο με «Βλέπει ποσά», ώρες και κόστος μόνο με «Βλέπει κόστος και κερδοφορία». Παρεκκλίσεις, Εγκρίσεις, αιτήματα
-- πελάτη και εξερχόμενα μόνο σε όποιον συντάσσει ή «Παρεκκλίνει». Χωρίς δικαίωμα: καμία γραμμή (ή null).

-- D1: η λίστα. Σε ό,τι βλέπει ο Χρήστης (Εύρος). p_client: οι Συμφωνίες ενός Πελάτη (για την B2).
create function public.agreements_list(p_client uuid default null, p_limit integer default 100, p_offset integer default 0)
returns table (
  id uuid, opportunity_id uuid, client_id uuid, client_name text, title text, kind text, state text, path text, revision integer,
  manager_id uuid, manager_name text, valid_until date, start_on date, end_on date, signed_at timestamptz,
  signatory_name text, total numeric, discount_percent numeric, discount_months integer,
  change_requests_open integer, links_opened integer, expires_in_days integer, is_low_margin boolean, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.opportunity_id, o.client_id, c.name, a.title, a.kind,
         authz.agreement_eff_state(a), authz.agreement_eff_path(a), a.revision,
         o.manager_id, u.name, a.valid_until, a.start_on, a.end_on, a.signed_at,
         (select r.name from public.agreement_recipients r where r.agreement_id = a.id and r.is_signatory),
         case when authz.has('finance.amounts') then f.price end,
         case when authz.has('finance.amounts') then m.discount_percent end,
         case when authz.has('finance.amounts') then m.discount_months end,
         case when v.internal then (select count(*)::integer from public.agreement_change_requests q where q.agreement_id = a.id and q.revision = a.revision) else 0 end,
         case when v.internal then (select count(*)::integer from public.agreement_links l
           where l.agreement_id = a.id and l.revision = a.revision and l.first_opened_at is not null) else 0 end,
         case when authz.agreement_eff_state(a) in ('signed', 'active') and a.end_on is not null
                   and a.end_on - public.sales_today() between 0 and 30
              then a.end_on - public.sales_today() end,
         case when authz.has('finance.cost') then f.is_low_margin end,
         a.updated_at
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
    join public.clients c on c.id = o.client_id
    left join public.team_users u on u.user_id = o.manager_id
    left join public.agreement_amounts m on m.agreement_id = a.id
    cross join lateral authz.agreement_figures(a.id) f
    cross join lateral (select coalesce(authz.can_draft_agreement(a.id), false) or coalesce(authz.has('agreements.deviate'), false) as internal) v
   where authz.can_see_agreement(a.id) and (p_client is null or o.client_id = p_client)
   order by a.updated_at desc, a.id
   limit greatest(1, least(coalesce(p_limit, 100), 500)) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- D2: ολόκληρη η σελίδα της Συμφωνίας, σε ένα JSON. Τα νούμερα που ο Χρήστης δεν δικαιούται έρχονται null, ποτέ 0.
create function public.agreement_view(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  o public.opportunities;
  c public.clients;
  m public.agreement_amounts;
  v_base jsonb;
  v_today date := public.sales_today();
  v_amounts boolean := coalesce(authz.has('finance.amounts'), false);
  v_cost boolean := coalesce(authz.has('finance.cost'), false);
  v_manage_cost boolean := coalesce(authz.can_manage_cost(), false);
  v_deviate boolean := coalesce(authz.has('agreements.deviate'), false);
  v_draft boolean;
  v_internal boolean;
  v_path text;
  v_state text;
  v_fig record;
  v_sig public.agreement_signatures;
  v_lines jsonb;
  v_deviations jsonb := '[]'::jsonb;
  v_revisions jsonb;
  v_recipients jsonb;
  v_milestones jsonb;
  v_limits jsonb;
  v_periods jsonb := '[]'::jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_outbox integer := 0;
  v_has_lines boolean;
  v_needs boolean;
  v_editable boolean;
  v_period_start date;
begin
  if not coalesce(authz.can_see_agreement(p_agreement), false) then
    return null;
  end if;
  select * into a from public.agreements x where x.id = p_agreement;
  select * into o from public.opportunities x where x.id = a.opportunity_id;
  select * into c from public.clients x where x.id = o.client_id;
  select * into m from public.agreement_amounts x where x.agreement_id = p_agreement;
  select b.data into v_base from public.agreement_baselines b where b.agreement_id = p_agreement;
  v_draft := coalesce(authz.can_draft_agreement(p_agreement), false);
  v_internal := v_draft or v_deviate;
  v_path := authz.agreement_eff_path(a);
  v_state := authz.agreement_eff_state(a);
  select * into v_fig from authz.agreement_figures(p_agreement);
  select * into v_sig from public.agreement_signatures s where s.agreement_id = p_agreement;
  select exists (select 1 from public.agreement_lines l where l.agreement_id = p_agreement) into v_has_lines;
  v_editable := v_draft and a.state = 'proposal' and v_path in ('draft', 'awaiting_approval');

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id, 'position', l.position, 'kind', l.line_kind, 'item_id', l.item_id,
           'description', l.description, 'description_en', l.description_en, 'unit', l.unit, 'quantity', l.quantity,
           'unit_price', case when v_amounts then la.unit_price end,
           'catalog_price', case when v_amounts then la.catalog_price end,
           'line_total', case when v_amounts then round(l.quantity * la.unit_price, 2) end,
           'hours_shoot', case when v_cost then lc.hours_shoot end,
           'hours_edit', case when v_cost then lc.hours_edit end,
           'direct_cost', case when v_cost then lc.direct_cost end,
           'provisions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'kind_id', p.kind_id, 'quantity', p.quantity,
                      'catalog_quantity', (select (e ->> 'quantity')::integer from jsonb_array_elements(l.catalog_provisions) e
                                            where e ->> 'kind_id' = p.kind_id::text)) order by k.sort, k.id)
               from public.agreement_line_provisions p join public.provision_kinds k on k.id = p.kind_id
              where p.line_id = l.id), '[]'::jsonb)
         ) order by l.position, l.id), '[]'::jsonb)
    into v_lines
    from public.agreement_lines l
    join public.agreement_line_amounts la on la.line_id = l.id
    join public.agreement_line_costs lc on lc.line_id = l.id
   where l.agreement_id = p_agreement;

  if v_internal then
    select coalesce(jsonb_agg(jsonb_build_object(
             'key', d.key, 'kind', d.kind, 'subject', d.subject,
             'depth', case when not d.is_money or v_amounts then d.depth end,
             'base_value', case when not d.is_money or v_amounts then d.base_value end,
             'value', case when not d.is_money or v_amounts then d.value end,
             'status', coalesce(u.status, 'covered')) order by d.key), '[]'::jsonb)
      into v_deviations
      from authz.agreement_deviations(p_agreement) d
      left join authz.agreement_uncovered(p_agreement) u on u.key = d.key;
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', q.id, 'revision', q.revision, 'from_name', q.from_name, 'message', q.message, 'created_at', q.created_at)
             order by q.created_at desc), '[]'::jsonb)
      into v_changes from public.agreement_change_requests q where q.agreement_id = p_agreement;
    select count(*)::integer into v_outbox from public.agreement_outbox x where x.agreement_id = p_agreement and x.status = 'pending';
  end if;
  v_needs := v_draft and a.state = 'proposal' and coalesce(authz.agreement_needs_approval(p_agreement), false);

  select coalesce(jsonb_agg(jsonb_build_object(
           'number', r.number, 'created_at', r.created_at, 'created_by_name', cu.name, 'summary', r.summary, 'sent_at', r.sent_at,
           'approval', case when v_internal and r.approval_state is not null then jsonb_build_object(
             'state', r.approval_state, 'requested_at', r.requested_at, 'requested_by_name', ru.name,
             'decided_at', r.decided_at, 'decided_by_name', du.name, 'comment', r.comment) end
         ) order by r.number desc), '[]'::jsonb)
    into v_revisions
    from public.agreement_revisions r
    left join public.team_users cu on cu.user_id = r.created_by
    left join public.team_users ru on ru.user_id = r.requested_by
    left join public.team_users du on du.user_id = r.decided_by
   where r.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'name', r.name, 'email', r.email, 'is_signatory', r.is_signatory,
           'link', (
             select jsonb_build_object(
                      'id', l.id, 'status', authz.link_status(l, a), 'is_opened', l.first_opened_at is not null,
                      'open_count', l.open_count, 'first_opened_at', l.first_opened_at)
               from public.agreement_links l
              where l.agreement_id = p_agreement and lower(l.recipient_email) = lower(r.email)
              order by l.revision desc, l.issued_at desc limit 1)
         ) order by r.position, r.id), '[]'::jsonb)
    into v_recipients from public.agreement_recipients r where r.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', ms.id, 'trigger', ms.trigger, 'percent', ms.percent, 'due_on', ms.due_on,
           'amount', case when v_amounts then round(v_fig.price * ms.percent / 100, 2) end) order by ms.position, ms.id), '[]'::jsonb)
    into v_milestones from public.agreement_milestones ms where ms.agreement_id = p_agreement;

  select coalesce(jsonb_agg(jsonb_build_object(
           'kind_id', r.kind_id, 'label', k.label, 'label_en', k.label_en, 'rounds', r.rounds,
           'base_rounds', (v_base -> 'revision_limits' ->> r.kind_id::text)::integer) order by k.sort, k.id), '[]'::jsonb)
    into v_limits
    from public.agreement_revision_limits r join public.provision_kinds k on k.id = r.kind_id
   where r.agreement_id = p_agreement;

  if a.kind = 'monthly' then
    v_period_start := coalesce(a.start_on, v_today);
    select coalesce(jsonb_agg(jsonb_build_object(
             'n', p.n + 1, 'starts', p.starts, 'ends', p.ends, 'is_partial', p.share < 1, 'gives_provisions', p.gives_provisions,
             'is_discounted', p.n < m.discount_months,
             'state', case when p.ends < v_today then 'closed' when p.starts <= v_today then 'current' else 'next' end,
             'amount', case when v_amounts then round((case when p.n < m.discount_months then v_fig.discounted_price else v_fig.price end) * p.share, 2) end
           ) order by p.n), '[]'::jsonb)
      into v_periods from authz.agreement_period_rows(v_period_start, a.duration_months) p;
  end if;

  return jsonb_build_object(
    'id', a.id, 'kind', a.kind, 'title', a.title, 'language', a.language, 'state', v_state, 'path', v_path, 'revision', a.revision,
    'valid_until', a.valid_until, 'start_on', a.start_on, 'end_on', a.end_on, 'duration_months', a.duration_months,
    'signed_at', a.signed_at, 'updated_at', a.updated_at,
    'opportunity', jsonb_build_object('id', o.id, 'title', o.title, 'outcome', o.outcome, 'manager_id', o.manager_id,
      'manager_name', (select u.name from public.team_users u where u.user_id = o.manager_id)),
    'client', jsonb_build_object('id', c.id, 'name', c.name, 'contact_name', c.contact_name, 'contact_email', c.contact_email),
    'terms', jsonb_build_object(
      'payment_days', a.payment_days, 'unused_provisions', a.unused_provisions, 'grace_days', a.grace_days, 'renewal', a.renewal,
      'dissolution_notice_days', a.dissolution_notice_days, 'filming_notice_hours', a.filming_notice_hours,
      'filming_cancel_hours', a.filming_cancel_hours, 'late_cancel_burns', a.late_cancel_burns, 'no_show_burns', a.no_show_burns),
    'money_terms', case when v_amounts then jsonb_build_object(
      'discount_percent', m.discount_percent, 'discount_months', m.discount_months, 'dissolution_fee', m.dissolution_fee, 'vat_rate', m.vat_rate) end,
    'baseline', case when v_internal then jsonb_build_object(
      'payment_days', v_base -> 'payment_days', 'unused_provisions', v_base -> 'unused_provisions', 'grace_days', v_base -> 'grace_days',
      'dissolution_notice_days', v_base -> 'dissolution_notice_days',
      'dissolution_fee', case when v_amounts then v_base -> 'dissolution_fee' end,
      'filming_notice_hours', v_base -> 'filming_notice_hours', 'filming_cancel_hours', v_base -> 'filming_cancel_hours',
      'late_cancel_burns', v_base -> 'late_cancel_burns', 'no_show_burns', v_base -> 'no_show_burns',
      'standard_discount_percent', v_base -> 'standard_discount_percent', 'standard_discount_months', v_base -> 'standard_discount_months',
      'advance_percent', v_base -> 'advance_percent') end,
    'lines', v_lines,
    'milestones', v_milestones,
    'milestones_total', (select coalesce(sum(ms.percent), 0) from public.agreement_milestones ms where ms.agreement_id = p_agreement),
    'revision_limits', v_limits,
    'recipients', v_recipients,
    'revisions', v_revisions,
    'deviations', v_deviations,
    'needs_approval', v_needs,
    'totals', case when v_amounts then jsonb_build_object(
      'price', v_fig.price, 'discounted_price', v_fig.discounted_price, 'vat_rate', m.vat_rate,
      'vat', round(v_fig.price * m.vat_rate / 100, 2), 'gross', round(v_fig.price * (1 + m.vat_rate / 100), 2)) end,
    'cost', case when v_cost then jsonb_build_object(
      'hour_cost', v_fig.hour_cost, 'hour_cost_month', v_fig.hour_cost_month, 'estimated_cost', v_fig.estimated_cost,
      'multiplier_min', v_fig.mult_min, 'multiplier_target', v_fig.mult_target, 'multiplier_max', v_fig.mult_max,
      'is_low_margin', coalesce(v_fig.is_low_margin, false), 'is_frozen', v_fig.is_frozen) end,
    'periods', v_periods,
    'change_requests', v_changes,
    'signature', case when v_sig.agreement_id is not null then jsonb_build_object(
      'method', v_sig.method, 'signed_name', v_sig.signed_name, 'signed_on', v_sig.signed_on, 'recorded_at', v_sig.recorded_at,
      'otp_delivery', v_sig.otp_delivery, 'document_hash', v_sig.document_hash,
      'reference', case when v_internal then v_sig.reference end,
      'ip', case when v_internal then v_sig.ip end,
      'used_provisions', case when v_internal then v_sig.used_provisions end,
      'month_invoiced', case when v_internal then v_sig.month_invoiced end) end,
    'document', (select jsonb_build_object('revision', d.revision, 'hash', d.hash, 'created_at', d.created_at)
                   from public.agreement_documents d where d.agreement_id = p_agreement and d.revision = a.revision),
    'outbox_pending', v_outbox,
    'email_sender_connected', coalesce((select d.email_sender_connected from public.agreement_defaults d where d.id), false),
    'proposal_validity_days', (select d.proposal_validity_days from public.agreement_defaults d where d.id),
    'can', jsonb_build_object(
      'see_amounts', v_amounts, 'see_cost', v_cost, 'manage_cost', v_manage_cost,
      'edit', v_editable,
      'edit_prices', v_editable and v_amounts,
      'edit_cost', v_editable and v_manage_cost,
      'send', v_editable and v_has_lines and not v_needs and v_amounts,
      'request_approval', v_editable and v_has_lines and v_needs,
      'withdraw_approval', v_draft and v_path = 'awaiting_approval',
      'decide', v_deviate and v_amounts and v_path = 'awaiting_approval',
      'new_revision', v_draft and a.state = 'proposal' and v_path in ('sent', 'expired'),
      'extend', v_draft and v_amounts and a.state = 'proposal' and v_path = 'expired',
      'close_lost', v_draft and a.state = 'proposal' and v_path = 'expired',
      'manage_links', v_draft and v_amounts and a.state = 'proposal' and v_path = 'sent',
      'sign_outside', v_deviate and v_has_lines and a.state = 'proposal' and v_path in ('draft', 'sent', 'expired')
    )
  );
end;
$$;

-- Προεπισκόπηση «έτσι θα τη δει ο πελάτης» (D2): το έγγραφο της σταλμένης αναθεώρησης, ή ζωντανά για πρόταση σε Σύνταξη. Περιέχει
-- τιμές, άρα μόνο όποιος βλέπει τη Συμφωνία ΚΑΙ «Βλέπει ποσά»· αλλιώς null. Στη Σύνταξη το ΦΠΑ είναι αυτό της στιγμής που
-- δημιουργήθηκε η πρόταση· ανανεώνεται κατά την αποστολή.
create function public.agreement_document_preview(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_doc jsonb;
begin
  if not coalesce(authz.can_see_agreement(p_agreement), false) or not coalesce(authz.has('finance.amounts'), false) then
    return null;
  end if;
  select * into a from public.agreements x where x.id = p_agreement;
  select d.document into v_doc from public.agreement_documents d where d.agreement_id = p_agreement and d.revision = a.revision;
  return coalesce(v_doc, authz.agreement_build_document(p_agreement));
end;
$$;

-- B4: η σύνοψη της πρότασης μέσα στη σελίδα της Ευκαιρίας. Καμία γραμμή αν δεν υπάρχει Συμφωνία (ή δεν τη βλέπει ο Χρήστης).
create function public.agreement_for_opportunity(p_opportunity uuid)
returns table (
  agreement_id uuid, kind text, title text, state text, path text, revision integer, valid_until date, signed_at timestamptz,
  signatory_name text, total numeric, links_total integer, links_opened integer, change_requests_open integer,
  approval_pending_days integer, needs_approval boolean, deviation_count integer, has_lines boolean, outbox_pending integer,
  can_draft boolean, can_deviate boolean
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.kind, a.title, authz.agreement_eff_state(a), authz.agreement_eff_path(a), a.revision, a.valid_until, a.signed_at,
         (select r.name from public.agreement_recipients r where r.agreement_id = a.id and r.is_signatory),
         case when authz.has('finance.amounts') then f.price end,
         case when v.internal then (select count(*)::integer from public.agreement_links l where l.agreement_id = a.id and l.revision = a.revision) else 0 end,
         case when v.internal then (select count(*)::integer from public.agreement_links l
           where l.agreement_id = a.id and l.revision = a.revision and l.first_opened_at is not null) else 0 end,
         case when v.internal then (select count(*)::integer from public.agreement_change_requests q where q.agreement_id = a.id and q.revision = a.revision) else 0 end,
         case when v.internal then (select (public.sales_today() - (r.requested_at at time zone 'Europe/Athens')::date)::integer
            from public.agreement_revisions r
           where r.agreement_id = a.id and r.number = a.revision and r.approval_state = 'pending') end,
         v.internal and a.state = 'proposal' and coalesce(authz.agreement_needs_approval(a.id), false),
         case when v.internal then (select count(*)::integer from authz.agreement_deviations(a.id)) else 0 end,
         exists (select 1 from public.agreement_lines l where l.agreement_id = a.id),
         case when v.internal then (select count(*)::integer from public.agreement_outbox x where x.agreement_id = a.id and x.status = 'pending') else 0 end,
         coalesce(authz.can_draft_agreement(a.id), false),
         coalesce(authz.has('agreements.deviate'), false)
    from public.agreements a
    cross join lateral authz.agreement_figures(a.id) f
    cross join lateral (select coalesce(authz.can_draft_agreement(a.id), false) or coalesce(authz.has('agreements.deviate'), false) as internal) v
   where a.opportunity_id = p_opportunity and authz.can_see_agreement(a.id);
$$;

-- D4: προτάσεις προς έγκριση. Μόνο όποιος «Παρεκκλίνει». working_days: Δευτέρα–Παρασκευή από την επόμενη μέρα του αιτήματος
-- (οι αργίες δεν μετρούν ως ειδικές μέρες· η υπενθύμιση είναι ένδειξη). is_reminder_due: 2 εργάσιμες ή περισσότερες.
create function public.agreement_approvals_view()
returns table (
  agreement_id uuid, opportunity_id uuid, client_name text, title text, kind text, revision integer, manager_name text,
  requested_at timestamptz, requested_by_name text, pending_days integer, working_days integer, is_reminder_due boolean,
  total numeric, is_low_margin boolean, deviations jsonb, lines jsonb, previous jsonb
)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.opportunity_id, c.name, a.title, a.kind, a.revision, mu.name, r.requested_at, ru.name,
         (public.sales_today() - (r.requested_at at time zone 'Europe/Athens')::date)::integer,
         w.days,
         w.days >= 2,
         case when authz.has('finance.amounts') then f.price end,
         case when authz.has('finance.cost') then f.is_low_margin end,
         (select coalesce(jsonb_agg(jsonb_build_object(
                   'key', d.key, 'kind', d.kind, 'subject', d.subject,
                   'depth', case when not d.is_money or authz.has('finance.amounts') then d.depth end,
                   'base_value', case when not d.is_money or authz.has('finance.amounts') then d.base_value end,
                   'value', case when not d.is_money or authz.has('finance.amounts') then d.value end,
                   'status', coalesce(u.status, 'covered')) order by d.key), '[]'::jsonb)
            from authz.agreement_deviations(a.id) d left join authz.agreement_uncovered(a.id) u on u.key = d.key),
         (select coalesce(jsonb_agg(jsonb_build_object(
                   'description', l.description, 'quantity', l.quantity,
                   'catalog_price', case when authz.has('finance.amounts') then la.catalog_price end,
                   'unit_price', case when authz.has('finance.amounts') then la.unit_price end,
                   'is_free', l.line_kind = 'free',
                   'is_below', case when authz.has('finance.amounts')
                                    then coalesce(la.catalog_price is not null and la.unit_price < la.catalog_price, false) end) order by l.position, l.id), '[]'::jsonb)
            from public.agreement_lines l join public.agreement_line_amounts la on la.line_id = l.id where l.agreement_id = a.id),
         (select jsonb_build_object('revision', pr.number, 'decided_by_name', pu.name, 'decided_at', pr.decided_at, 'comment', pr.comment)
            from public.agreement_revisions pr left join public.team_users pu on pu.user_id = pr.decided_by
           where pr.agreement_id = a.id and pr.approval_state = 'approved' order by pr.number desc limit 1)
    from public.agreements a
    join public.agreement_revisions r on r.agreement_id = a.id and r.number = a.revision and r.approval_state = 'pending'
    join public.opportunities o on o.id = a.opportunity_id
    join public.clients c on c.id = o.client_id
    left join public.team_users mu on mu.user_id = o.manager_id
    left join public.team_users ru on ru.user_id = r.requested_by
    cross join lateral authz.agreement_figures(a.id) f
    cross join lateral (
      select count(*)::integer as days
        from generate_series((r.requested_at at time zone 'Europe/Athens')::date + 1, public.sales_today(), interval '1 day') g
       where extract(isodow from g) < 6
    ) w
   where authz.has('agreements.deviate') and a.state = 'proposal' and a.path = 'awaiting_approval'
   order by r.requested_at, a.id;
$$;

-- Τα εξερχόμενα μιας Συμφωνίας: Σύνδεσμοι που περιμένουν αντιγραφή και κωδικοί υπογραφής που περιμένουν παράδοση (μόνο όσο ο
-- πάροχος email δεν είναι συνδεδεμένος). Όποιος συντάσσει ή «Παρεκκλίνει».
create function public.agreement_outbox_view(p_agreement uuid)
returns table (
  id uuid, kind text, to_name text, to_email text, status text, created_at timestamptz, handled_at timestamptz,
  link_path text, code text, code_expires_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.kind, o.to_name, o.to_email, o.status, o.created_at, o.handled_at,
         case when o.kind = 'proposal_link' and o.status = 'pending' and coalesce(authz.has('finance.amounts'), false)
              then '/p/' || (o.payload ->> 'token') end,
         case when o.kind = 'signing_code' and o.status = 'pending' and coalesce(authz.has('finance.amounts'), false)
                   and not (select d.email_sender_connected from public.agreement_defaults d where d.id)
                   and (o.payload ->> 'expires_at')::timestamptz > now()
              then o.payload ->> 'code' end,
         case when o.kind = 'signing_code' and o.status = 'pending' then (o.payload ->> 'expires_at')::timestamptz end
    from public.agreement_outbox o
   where o.agreement_id = p_agreement
     and (authz.can_draft_agreement(p_agreement) or (authz.has('agreements.deviate') and authz.can_see_agreement(p_agreement)))
   order by o.created_at desc, o.id
   limit 50;
$$;

-- ───────────── Ρυθμίσεις › Συμφωνίες (O3) ─────────────

-- Οι προεπιλογές και πόσα στοιχεία αφορά μια αλλαγή τους («Πριν την αποθήκευση το σύστημα δείχνει πόσα υπάρχοντα στοιχεία
-- αφορά»): ανοιχτές προτάσεις και υπογεγραμμένες/ενεργές Συμφωνίες. Η ρήτρα λύσης (ποσό) φαίνεται μόνο με «Βλέπει ποσά».
create function public.agreements_defaults_view()
returns table (
  proposal_validity_days integer, standard_discount_percent numeric, standard_discount_months integer, advance_percent numeric,
  payment_days_monthly integer, payment_days_one_off integer, unused_provisions text, grace_days integer, duration_months integer,
  renewal text, dissolution_notice_days integer, dissolution_fee numeric, filming_notice_hours integer, filming_cancel_hours integer,
  late_cancel_burns boolean, no_show_burns boolean, email_sender_connected boolean,
  open_proposals integer, live_agreements integer, updated_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select d.proposal_validity_days, d.standard_discount_percent, d.standard_discount_months, d.advance_percent,
         d.payment_days_monthly, d.payment_days_one_off, d.unused_provisions, d.grace_days, d.duration_months,
         d.renewal, d.dissolution_notice_days,
         case when authz.has('finance.amounts') then d.dissolution_fee end,
         d.filming_notice_hours, d.filming_cancel_hours, d.late_cancel_burns, d.no_show_burns, d.email_sender_connected,
         (select count(*)::integer from public.agreements a where a.state = 'proposal' and a.path in ('draft', 'awaiting_approval', 'sent', 'expired')),
         (select count(*)::integer from public.agreements a where a.state in ('signed', 'active')),
         d.updated_at
    from public.agreement_defaults d
   where d.id and authz.has('settings.manage');
$$;

-- Όροι Συμφωνίας, ένα από τα δύο σετ: 'monthly' (όλα) ή 'one_off' (μόνο Μέρες πληρωμής). Η ρήτρα λύσης θέλει «Βλέπει ποσά».
create function public.agreements_save_terms(
  p_set text, p_payment_days integer, p_unused_provisions text default null, p_grace_days integer default null,
  p_duration_months integer default null, p_renewal text default null, p_dissolution_notice_days integer default null,
  p_dissolution_fee numeric default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  if p_set = 'one_off' then
    update public.agreement_defaults set payment_days_one_off = p_payment_days where id;
    return;
  end if;
  if p_set <> 'monthly' then
    raise exception 'Διάλεξε μηνιαίες ή εφάπαξ Συμφωνίες' using errcode = 'P0001';
  end if;
  if p_dissolution_fee is not null then
    perform authz.require('finance.amounts');
  end if;
  update public.agreement_defaults set
    payment_days_monthly = p_payment_days,
    unused_provisions = coalesce(p_unused_provisions, unused_provisions), grace_days = coalesce(p_grace_days, grace_days),
    duration_months = coalesce(p_duration_months, duration_months), renewal = coalesce(p_renewal, renewal),
    dissolution_notice_days = coalesce(p_dissolution_notice_days, dissolution_notice_days),
    dissolution_fee = coalesce(p_dissolution_fee, dissolution_fee)
  where id;
end;
$$;

create function public.agreements_save_policy(
  p_filming_notice_hours integer, p_filming_cancel_hours integer, p_late_cancel_burns boolean, p_no_show_burns boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  update public.agreement_defaults set
    filming_notice_hours = p_filming_notice_hours, filming_cancel_hours = p_filming_cancel_hours,
    late_cancel_burns = coalesce(p_late_cancel_burns, late_cancel_burns), no_show_burns = coalesce(p_no_show_burns, no_show_burns)
  where id;
end;
$$;

create function public.agreements_save_pricing(
  p_proposal_validity_days integer, p_advance_percent numeric, p_standard_discount_percent numeric, p_standard_discount_months integer
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  update public.agreement_defaults set
    proposal_validity_days = p_proposal_validity_days, advance_percent = p_advance_percent,
    standard_discount_percent = p_standard_discount_percent, standard_discount_months = p_standard_discount_months
  where id;
end;
$$;

-- Όριο αλλαγών ανά είδος Παροχής, ως [{kind_id, rounds}] (rounds null = το είδος δεν έχει γύρους αλλαγών).
create function public.agreements_save_revision_limits(p_limits jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  if p_limits is null or jsonb_typeof(p_limits) <> 'array' then
    raise exception 'Το Όριο αλλαγών δεν διαβάστηκε· δοκίμασε ξανά' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_limits) as x (kind_id uuid, rounds integer)
     where x.kind_id is null or not exists (select 1 from public.provision_kinds k where k.id = x.kind_id)
        or (x.rounds is not null and x.rounds not between 1 and 20)
  ) then
    raise exception 'Το Όριο αλλαγών είναι από 1 έως 20 γύρους, ή κενό' using errcode = 'P0001';
  end if;
  update public.provision_kinds k set revision_limit = x.rounds
    from jsonb_to_recordset(p_limits) as x (kind_id uuid, rounds integer)
   where k.id = x.kind_id and k.revision_limit is distinct from x.rounds;
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
     where (n.nspname = 'public' and (p.proname like 'agreement\_%' or p.proname like 'agreements\_%'))
        or (n.nspname = 'authz' and (p.proname like 'agreement\_%' or p.proname in (
              'token_hash', 'new_token', 'team_actor', 'can_see_agreement', 'can_draft_agreement', 'unused_rank',
              'current_hour_cost', 'document_hash', 'link_status', 'public_link', 'guard_agreement', 'guard_agreement_child',
              'guard_agreement_record', 'guard_agreement_defaults')))
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- Η ομάδα (συνδεδεμένοι Χρήστες): ανάγνωση, σύνταξη, πορεία, Ρυθμίσεις. Κάθε συνάρτηση ελέγχει το Δικαίωμα στο σώμα της.
grant execute on function
  public.agreements_list(uuid, integer, integer),
  public.agreement_view(uuid),
  public.agreement_document_preview(uuid),
  public.agreement_for_opportunity(uuid),
  public.agreement_approvals_view(),
  public.agreement_outbox_view(uuid),
  public.agreement_catalogue_options(uuid),
  public.agreement_create(uuid, text, text),
  public.agreement_update_basics(uuid, text, text, date, date, integer),
  public.agreement_update_terms(uuid, integer, text, integer, text, integer, integer, integer, boolean, boolean),
  public.agreement_set_money_terms(uuid, numeric, integer, numeric),
  public.agreement_set_milestones(uuid, jsonb),
  public.agreement_set_revision_limits(uuid, jsonb),
  public.agreement_set_recipients(uuid, jsonb),
  public.agreement_add_catalogue_line(uuid, uuid, integer),
  public.agreement_add_free_line(uuid, text, text, numeric),
  public.agreement_update_line(uuid, integer, text, text, numeric, numeric, numeric, numeric),
  public.agreement_set_line_provisions(uuid, jsonb),
  public.agreement_remove_line(uuid),
  public.agreement_send(uuid),
  public.agreement_request_approval(uuid),
  public.agreement_withdraw_approval(uuid),
  public.agreement_decide(uuid, boolean, text),
  public.agreement_new_revision(uuid, text),
  public.agreement_extend(uuid, integer),
  public.agreement_close_lost(uuid, uuid),
  public.agreement_revoke_link(uuid),
  public.agreement_reissue_link(uuid),
  public.agreement_sign_outside(uuid, date, text, date, text, jsonb, boolean),
  public.agreement_outbox_mark(uuid, text),
  public.agreements_defaults_view(),
  public.agreements_save_terms(text, integer, text, integer, integer, text, integer, numeric),
  public.agreements_save_policy(integer, integer, boolean, boolean),
  public.agreements_save_pricing(integer, numeric, numeric, integer),
  public.agreements_save_revision_limits(jsonb)
  to authenticated;

-- Ο Σύνδεσμος πρότασης: ανώνυμος επισκέπτης (και συνδεδεμένος, αν ένα μέλος ανοίξει τον Σύνδεσμο). Μόνο με token.
grant execute on function
  public.agreement_public_view(text),
  public.agreement_public_request_code(text, text, boolean, text),
  public.agreement_public_sign(text, text, text, text),
  public.agreement_public_request_changes(text, text, text),
  public.agreement_public_decline(text, text, text)
  to anon, authenticated;

-- Ο αποστολέας email και ο έλεγχος «σήμερα»: μόνο service role.
grant execute on function
  public.agreement_outbox_claim(integer),
  public.agreement_outbox_done(uuid, boolean, text),
  public.agreements_tick()
  to service_role;

-- ───────────── Δικαιώματα πινάκων ─────────────
-- Όλοι οι πίνακες του module είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.

revoke all on table
  public.agreement_defaults, public.agreements, public.agreement_amounts, public.agreement_baselines,
  public.agreement_revision_limits, public.agreement_milestones, public.agreement_lines, public.agreement_line_amounts,
  public.agreement_line_costs, public.agreement_line_provisions, public.agreement_costs, public.agreement_recipients,
  public.agreement_links, public.agreement_otps, public.agreement_signatures, public.agreement_documents,
  public.agreement_revisions, public.agreement_change_requests, public.agreement_outbox
  from anon, authenticated;

-- ───────────── Ίχνος ενεργειών ─────────────
-- Όχι στους Συνδέσμους, τους κωδικούς, τα εξερχόμενα (κρατούν μυστικά), στα έγγραφα και τις αναθεωρήσεις (τιμές/βάθη):
-- όσα χρειάζονται γράφονται ως γεγονότα (authz.agreement_event) χωρίς ποσά.

create trigger agreement_defaults_audit after update on public.agreement_defaults
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('id');
create trigger agreements_audit_insert after insert on public.agreements
  for each row execute function authz.audit_row('id');
create trigger agreements_audit_update after update on public.agreements
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('id');
create trigger agreement_amounts_audit after insert or update on public.agreement_amounts
  for each row execute function authz.audit_row('agreement_id');
create trigger agreement_revision_limits_audit after insert or update or delete on public.agreement_revision_limits
  for each row execute function authz.audit_row('agreement_id');
create trigger agreement_milestones_audit after insert or update or delete on public.agreement_milestones
  for each row execute function authz.audit_row('id');
create trigger agreement_lines_audit after insert or update or delete on public.agreement_lines
  for each row execute function authz.audit_row('id');
create trigger agreement_line_amounts_audit after insert or update or delete on public.agreement_line_amounts
  for each row execute function authz.audit_row('line_id');
create trigger agreement_line_costs_audit after insert or update or delete on public.agreement_line_costs
  for each row execute function authz.audit_row('line_id');
create trigger agreement_line_provisions_audit after insert or update or delete on public.agreement_line_provisions
  for each row execute function authz.audit_row('line_id');
create trigger agreement_costs_audit after insert on public.agreement_costs
  for each row execute function authz.audit_row('agreement_id');
create trigger agreement_recipients_audit after insert or update or delete on public.agreement_recipients
  for each row execute function authz.audit_row('id');
create trigger agreement_signatures_audit after insert on public.agreement_signatures
  for each row execute function authz.audit_row('agreement_id');
