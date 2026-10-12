-- Ειδοποιήσεις Kα (#170), μέρος 1: κατάλογος Γεγονότων και ουρά Γεγονότων (ADR 0006, ADR 0018, δέσμη Α1–Α2).
--
--  • Ο κατάλογος (event_types) είναι σταθερός: αλλάζει μόνο με migration. Ίδια σειρά και ομάδες με το prototype.
--    is_wired = false για όσα δεν έχουν ακόμα πηγή (φόρμα, Βοηθός, Τιμολογητέα/Τιμολόγια/Εισπράξεις/κόστος) και για όλα τα
--    «με ημερομηνία» / «αναμονής» (Kγ) και της Υγείας (Kε).
--  • Η ουρά (events) γράφεται ΜΟΝΟ από το authz.emit_event, στην ίδια συναλλαγή με την αλλαγή. Το emit_event συμπληρώνει από
--    την οντότητα τις μεταβλητές του κειμένου, το link και τα ids για τους παραλήπτες· οι παραλήπτες λύνονται αργότερα από
--    τον επεξεργαστή, από την τρέχουσα κατάσταση.
--  • Τα υπάρχοντα *_event helpers γράφουν στο audit_log (action 'event'). Ένα trigger στο audit_log αντιστοιχίζει
--    (οντότητα, όνομα) → Γεγονός του καταλόγου και καλεί το emit_event. Έτσι κάθε helper (και το άμεσο insert του
--    low_margin) περνά από ένα σημείο, χωρίς ξαναγραφή των helpers.
--  • Νέα emit με triggers: Παραδοτέα (ανάθεση, Εκδόσεις, απάντηση, Όριο αλλαγών, αίτημα μετά την έγκριση), Μηνύματα
--    (νέο, @αναφορά), Αιτήματα (νέο, κλείσιμο), Google (μετακίνηση, διαγραφή, απόρριψη).
--  • Πίνακες κλειστοί (RLS χωρίς policies, revoke). Καμία πρόσβαση από την εφαρμογή.

-- ───────────── Κατάλογος Γεγονότων ─────────────

create table public.event_types (
  code text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
  -- Ο αριθμός του Γεγονότος στο Blueprint/prototype (1–58).
  number integer not null unique check (number between 1 and 999),
  grp text not null check (grp in ('Α', 'Β', 'Γ', 'Δ', 'Ε', 'ΣΤ')),
  kind text not null check (kind in ('instant', 'dated', 'waiting')),
  label_el text not null check (length(trim(label_el)) > 0),
  label_en text not null check (length(trim(label_en)) > 0),
  -- Τι είναι «μία περίπτωση» για το «μία φορά ανά περίπτωση» (Α5).
  case_of text not null check (length(trim(case_of)) > 0),
  -- Οι μεταβλητές του κειμένου {…}, μαζί με τις κοινές (recipientName, clientName, companyName, link).
  variables text[] not null,
  -- Οι «σε σχέση με το Γεγονός» παραλήπτες που δέχεται (Α7).
  relatives text[] not null default '{}',
  has_visitor boolean not null default false,
  is_cost_only boolean not null default false,
  is_client_facing boolean not null default false,
  is_wired boolean not null default false,
  sort integer not null,
  check (relatives <@ array['client', 'crew', 'actor', 'owner', 'production_owner', 'production_members', 'client_owner',
                            'assignee', 'requester', 'mentioned', 'opportunity_owner', 'approval_requester']),
  check (is_client_facing or not ('client' = any (relatives))),
  check (not (is_cost_only and is_client_facing))
);

alter table public.event_types enable row level security;

-- Οι κοινές μεταβλητές μπαίνουν πρώτες σε κάθε Γεγονός.
create function authz.ev_vars(variadic p_vars text[]) returns text[]
language sql immutable set search_path = ''
as $$ select array['recipientName', 'clientName', 'companyName', 'link'] || p_vars; $$;

insert into public.event_types
  (number, code, grp, kind, label_el, label_en, case_of, variables, relatives, has_visitor, is_cost_only, is_client_facing, is_wired, sort)
values
  (1, 'opportunity.form_submitted', 'Α', 'instant', 'Νέα Ευκαιρία από φόρμα ενδιαφέροντος', 'New opportunity from the interest form',
   'η Ευκαιρία', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,client_owner}', true, false, false, false, 1),
  (2, 'proposal.link_opened', 'Α', 'instant', 'Ο πελάτης άνοιξε τον Σύνδεσμο πρότασης', 'The client opened the proposal link',
   'ο Σύνδεσμος, ανά αναθεώρηση', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,client_owner}', false, false, false, true, 2),
  (3, 'proposal.link_expiring', 'Α', 'dated', 'Λήγει ο Σύνδεσμος πρότασης', 'The proposal link is expiring',
   'ο Σύνδεσμος', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,client_owner}', false, false, false, false, 3),
  (4, 'agreement.signed', 'Α', 'instant', 'Υπογράφηκε Συμφωνία', 'An agreement was signed',
   'η Συμφωνία', authz.ev_vars('agreement', 'startOn', 'endOn'), '{client,opportunity_owner,client_owner,actor}', false, false, true, true, 4),
  (5, 'agreement.expiring', 'Α', 'dated', 'Λήγει Συμφωνία', 'An agreement is expiring',
   'η Συμφωνία και η λήξη της', authz.ev_vars('agreement', 'startOn', 'endOn'), '{client,opportunity_owner,client_owner}', false, false, true, false, 5),
  (6, 'proposal.approval_requested', 'Α', 'instant', 'Ζητήθηκε Έγκριση πρότασης', 'Proposal approval was requested',
   'η αναθεώρηση', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,actor}', false, false, false, true, 6),
  (7, 'proposal.approval_decided', 'Α', 'instant', 'Εγκρίθηκε ή απορρίφθηκε η Έγκριση πρότασης', 'Proposal approval was granted or rejected',
   'η αναθεώρηση', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn', 'decision'), '{opportunity_owner,approval_requester,actor}', false, false, false, true, 7),
  (8, 'proposal.changes_requested', 'Α', 'instant', 'Ο πελάτης ζήτησε αλλαγές στην πρόταση', 'The client asked for changes to the proposal',
   'η αναθεώρηση', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,client_owner}', false, false, false, true, 8),
  (9, 'proposal.declined', 'Α', 'instant', 'Ο πελάτης απέρριψε την πρόταση', 'The client declined the proposal',
   'η πρόταση', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,client_owner}', false, false, false, true, 9),
  (10, 'proposal.expired', 'Α', 'dated', 'Έληξε η πρόταση', 'The proposal expired',
   'η πρόταση και η λήξη της', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner,client_owner}', false, false, false, false, 10),
  (11, 'opportunity.next_step_due', 'Α', 'dated', 'Πέρασε το Επόμενο βήμα μιας Ευκαιρίας', 'An opportunity''s next step is overdue',
   'το Επόμενο βήμα', authz.ev_vars('opportunity', 'owner', 'proposal', 'expiresOn'), '{opportunity_owner}', false, false, false, false, 11),
  (12, 'period.opening', 'Β', 'dated', 'Ανοίγει Περίοδος', 'A period opens',
   'η Περίοδος', authz.ev_vars('agreement', 'period', 'periodStart', 'provisions'), '{client,client_owner}', false, false, true, false, 12),
  (13, 'filming.booked', 'Β', 'instant', 'Ο πελάτης έκλεισε Γύρισμα (αναμένει έγκριση)', 'The client booked a filming (awaiting approval)',
   'το Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{production_owner,client_owner,actor}', false, false, false, true, 13),
  (14, 'filming.decided', 'Β', 'instant', 'Γύρισμα εγκρίθηκε ή απορρίφθηκε', 'A filming was approved or rejected',
   'το Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew', 'decision'), '{client,crew,production_owner,client_owner,actor}', false, false, true, true, 14),
  (15, 'filming.sheet_issued', 'Β', 'instant', 'Εκδόθηκε Δελτίο γυρίσματος', 'A filming sheet was issued',
   'η έκδοση του Δελτίου', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{crew,production_owner,actor}', false, false, false, true, 15),
  (16, 'filming.day', 'Β', 'dated', 'Ημέρα Γυρίσματος', 'Filming day',
   'το Γύρισμα και η ημερομηνία του', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{client,crew,production_owner}', false, false, true, false, 16),
  (17, 'filming.google_moved', 'Β', 'instant', 'Γύρισμα μετακινήθηκε στο Google', 'A filming was moved in Google',
   'η μετακίνηση', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{client,crew,production_owner,client_owner}', false, false, true, true, 17),
  (18, 'filming.google_deleted', 'Β', 'instant', 'Γύρισμα διαγράφηκε από το Google, θέλει επιβεβαίωση', 'A filming was deleted in Google and needs confirmation',
   'η διαγραφή', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{production_owner,client_owner}', false, false, false, true, 18),
  (19, 'filming.google_move_rejected', 'Β', 'instant', 'Μετακίνηση στο Google απορρίφθηκε', 'A move in Google was rejected',
   'η μετακίνηση', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew', 'error'), '{production_owner,client_owner}', false, false, false, true, 19),
  (20, 'filming.rescheduled', 'Β', 'instant', 'Γύρισμα μετατέθηκε μέσα στο DMS', 'A filming was rescheduled in the DMS',
   'η μετάθεση', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{client,crew,production_owner,client_owner,actor}', false, false, true, true, 20),
  (21, 'filming.cancelled', 'Β', 'instant', 'Γύρισμα ακυρώθηκε', 'A filming was cancelled',
   'το Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{client,crew,production_owner,client_owner,actor}', false, false, true, true, 21),
  (22, 'filming.cancel_requested', 'Β', 'instant', 'Ο πελάτης ζήτησε ακύρωση μετά το Όριο ακύρωσης', 'The client asked to cancel after the cancellation limit',
   'το Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{production_owner,client_owner}', false, false, false, true, 22),
  (23, 'filming.crew_declined', 'Β', 'instant', 'Μέλος του Συνεργείου δήλωσε «δεν μπορώ»', 'A crew member declined',
   'το μέλος στο Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew', 'member'), '{production_owner,client_owner,actor}', false, false, false, true, 23),
  (24, 'filming.not_done', 'Β', 'waiting', 'Γύρισμα δεν σημειώθηκε ως «έγινε»', 'A filming was not marked as done',
   'το Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{crew,production_owner}', false, false, false, false, 24),
  (25, 'filming.approval_waiting', 'Β', 'waiting', 'Η αναμονή έγκρισης Γυρίσματος ξεπέρασε Χ ώρες', 'A filming has waited for approval for X hours',
   'το Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew'), '{production_owner,client_owner}', false, false, false, false, 25),
  (26, 'deliverable.assigned', 'Γ', 'instant', 'Ανατέθηκε εργασία ή Παραδοτέο', 'A task or deliverable was assigned',
   'η ανάθεση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{assignee,production_owner,actor}', false, false, false, true, 26),
  (27, 'deliverable.version_sent', 'Γ', 'instant', 'Νέα Έκδοση προς έγκριση', 'A new version awaits approval',
   'η Έκδοση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{client,assignee,production_owner,client_owner,actor}', false, false, true, true, 27),
  (28, 'deliverable.client_answered', 'Γ', 'instant', 'Ο πελάτης ζήτησε αλλαγές ή ενέκρινε Έκδοση', 'The client asked for changes or approved a version',
   'η Έκδοση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee', 'decision'), '{assignee,production_owner,client_owner}', false, false, false, true, 28),
  (29, 'deliverable.deadline', 'Γ', 'dated', 'Προθεσμία Παραδοτέου', 'Deliverable deadline',
   'το Παραδοτέο και η προθεσμία του', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{assignee,production_owner}', false, false, false, false, 29),
  (30, 'production.delivered', 'Γ', 'instant', 'Παραγωγή παραδόθηκε', 'A production was delivered',
   'η παράδοση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{client,production_owner,client_owner,actor}', false, false, true, true, 30),
  (31, 'deliverable.review_pending', 'Γ', 'instant', 'Έκδοση αναμένει εσωτερικό έλεγχο', 'A version awaits internal review',
   'η Έκδοση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{assignee,production_owner,actor}', false, false, false, true, 31),
  (32, 'deliverable.client_waiting', 'Γ', 'waiting', 'Έκδοση αναμένει πελάτη Χ μέρες', 'A version has waited for the client X days',
   'η Έκδοση', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{client,assignee,production_owner}', false, false, true, false, 32),
  (33, 'deliverable.limit_exceeded', 'Γ', 'instant', 'Ξεπεράστηκε το Όριο αλλαγών', 'The change limit was exceeded',
   'το Παραδοτέο', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{assignee,production_owner,client_owner}', false, false, false, true, 33),
  (34, 'deliverable.change_requested', 'Γ', 'instant', 'Αίτημα αλλαγής μετά την έγκριση', 'Change request after approval',
   'το Αίτημα', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee', 'request'), '{assignee,production_owner,client_owner,requester}', false, false, false, true, 34),
  (54, 'deliverable.review_returned', 'Γ', 'instant', 'Έκδοση επιστράφηκε από τον εσωτερικό έλεγχο', 'A version was returned by internal review',
   'η επιστροφή', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{assignee,production_owner,actor}', false, false, false, true, 35),
  (55, 'deliverable.link_broken', 'Γ', 'instant', 'Ο πελάτης ανέφερε link που δεν ανοίγει', 'The client reported a link that does not open',
   'η αναφορά', authz.ev_vars('production', 'deliverable', 'version', 'deadline', 'assignee'), '{assignee,production_owner,client_owner}', false, false, false, true, 36),
  (35, 'billable.created', 'Δ', 'instant', 'Γεννήθηκε Τιμολογητέο', 'A billable was created',
   'το Τιμολογητέο', authz.ev_vars('billable', 'amount'), '{client_owner}', false, false, false, false, 37),
  (36, 'invoice.registered', 'Δ', 'instant', 'Καταχωρήθηκε Τιμολόγιο', 'An invoice was registered',
   'το Τιμολόγιο', authz.ev_vars('invoice', 'amount', 'dueOn'), '{client,client_owner,actor}', false, false, true, false, 38),
  (37, 'invoice.overdue', 'Δ', 'dated', 'Τιμολόγιο ληξιπρόθεσμο', 'An invoice is overdue',
   'το Τιμολόγιο', authz.ev_vars('invoice', 'amount', 'dueOn'), '{client,client_owner}', false, false, true, false, 39),
  (38, 'receipt.registered', 'Δ', 'instant', 'Καταχωρήθηκε Είσπραξη', 'A receipt was registered',
   'η Είσπραξη', authz.ev_vars('receipt', 'amount', 'invoice'), '{client_owner,actor}', false, false, false, false, 40),
  (39, 'proposal.low_margin', 'Δ', 'instant', 'Χαμηλό περιθώριο πρότασης', 'Low proposal margin',
   'η αναθεώρηση', authz.ev_vars('opportunity', 'owner', 'proposal'), '{opportunity_owner,actor}', false, true, false, true, 41),
  (40, 'production.cost_overrun', 'Δ', 'instant', 'Υπέρβαση κόστους Παραγωγής', 'Production cost overrun',
   'η Παραγωγή', authz.ev_vars('production', 'proposal', 'margin', 'cost'), '{production_owner}', false, true, false, false, 42),
  (41, 'production.delivered_without_hours', 'Δ', 'instant', 'Παραγωγή παραδομένη χωρίς πραγματικές ώρες', 'Production delivered without actual hours',
   'η Παραγωγή', authz.ev_vars('production', 'proposal', 'margin', 'cost'), '{production_owner}', false, true, false, false, 43),
  (56, 'billable.open_waiting', 'Δ', 'waiting', 'Τιμολογητέο ανοιχτό Χ μέρες', 'A billable has been open for X days',
   'το Τιμολογητέο', authz.ev_vars('billable', 'amount', 'days'), '{}', false, false, false, false, 44),
  (42, 'holiday.greeting', 'Ε', 'dated', 'Αργία', 'Holiday',
   'η αργία της χρονιάς', authz.ev_vars('holiday'), '{client}', false, false, true, false, 45),
  (43, 'client.colleagues_changed', 'Ε', 'instant', 'Ο πελάτης προσκάλεσε ή αφαίρεσε συνάδελφο', 'The client invited or removed a colleague',
   'η πρόσκληση ή η αφαίρεση', authz.ev_vars('colleague'), '{client_owner,actor}', false, false, false, true, 46),
  (58, 'team.access_changed', 'Ε', 'instant', 'Αλλαγή πρόσβασης στην ομάδα', 'Team access changed',
   'η πρόσκληση ή η αλλαγή Ρόλων ενός Χρήστη ομάδας', authz.ev_vars('user', 'roles', 'by'), '{owner,actor}', false, false, false, true, 47),
  (44, 'message.created', 'Ε', 'instant', 'Νέο Μήνυμα', 'New message',
   'το Μήνυμα', authz.ev_vars('sender', 'request', 'excerpt', 'production'), '{client,client_owner,production_owner,production_members}', false, false, true, true, 48),
  (45, 'message.unread_waiting', 'Ε', 'waiting', 'Αδιάβαστα Μηνύματα για Χ λεπτά', 'Unread messages for X minutes',
   'το διάστημα αδιάβαστων', authz.ev_vars('sender', 'request', 'excerpt', 'count'), '{client,client_owner,production_members}', false, false, true, false, 49),
  (46, 'request.created', 'Ε', 'instant', 'Νέο Αίτημα', 'New request',
   'το Αίτημα', authz.ev_vars('sender', 'request', 'excerpt'), '{assignee,client_owner,production_owner,actor}', false, false, false, true, 50),
  (47, 'request.open_waiting', 'Ε', 'waiting', 'Αίτημα ανοιχτό Χ μέρες', 'A request has been open for X days',
   'το Αίτημα', authz.ev_vars('sender', 'request', 'excerpt'), '{assignee,client_owner}', false, false, false, false, 51),
  (48, 'request.closed', 'Ε', 'instant', 'Αίτημα ολοκληρώθηκε ή απορρίφθηκε', 'A request was completed or rejected',
   'το Αίτημα', authz.ev_vars('sender', 'request', 'excerpt', 'outcome'), '{client,requester,assignee,actor}', false, false, true, true, 52),
  (49, 'message.mentioned', 'Ε', 'instant', 'Σε ανέφεραν σε Εσωτερικό Μήνυμα', 'You were mentioned in an internal message',
   'το Μήνυμα', authz.ev_vars('sender', 'request', 'excerpt'), '{mentioned,actor}', false, false, false, true, 53),
  (50, 'health.job_missed', 'ΣΤ', 'instant', 'Προγραμματισμένη εργασία δεν έτρεξε', 'A scheduled job did not run',
   'η εργασία και η μέρα', authz.ev_vars('job', 'error', 'time'), '{}', false, false, false, false, 54),
  (51, 'health.send_failed', 'ΣΤ', 'instant', 'Αποστολή απέτυχε οριστικά', 'A send failed permanently',
   'η αποστολή', authz.ev_vars('job', 'error', 'time'), '{}', false, false, false, false, 55),
  (52, 'health.google_stopped', 'ΣΤ', 'instant', 'Ο συγχρονισμός του Google σταμάτησε', 'Google sync stopped',
   'η διακοπή', authz.ev_vars('job', 'error', 'time'), '{}', false, false, false, false, 56),
  (53, 'health.event_stuck', 'ΣΤ', 'instant', 'Γεγονός κόλλησε (δεν επεξεργάστηκε)', 'An event got stuck (not processed)',
   'το Γεγονός', authz.ev_vars('job', 'error', 'time'), '{}', false, false, false, false, 57),
  (57, 'assistant.cap_reached', 'ΣΤ', 'instant', 'Πλαφόν του Βοηθού', 'Assistant usage cap',
   'ο μήνας και το όριο (80% ή 100%)', authz.ev_vars('limit', 'month'), '{}', false, false, false, false, 58);

-- ───────────── Ουρά Γεγονότων (outbox) ─────────────

create table public.events (
  id bigint generated always as identity primary key,
  type text not null references public.event_types (code),
  entity text not null check (length(entity) between 1 and 60),
  entity_id uuid,
  -- Τι είναι «μία περίπτωση»: π.χ. filming.decided:<id>. Για Γεγονότα που επαναλαμβάνονται νόμιμα περιέχει το id
  -- της Έκδοσης / του Μηνύματος.
  case_key text not null check (length(case_key) between 1 and 300),
  client_id uuid references public.clients (id),
  actor_id uuid,
  -- Μεταβλητές κειμένου (camelCase), link / client_link (εσωτερικές διαδρομές /app/…) και ids παραληπτών (snake_case).
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default clock_timestamp(),
  processed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (last_error is null or length(last_error) <= 500),
  locked_until timestamptz
);

create index events_pending_idx on public.events (id) where processed_at is null;
create index events_case_idx on public.events (case_key);

alter table public.events enable row level security;

-- ───────────── Μορφοποίηση για τα κείμενα ─────────────

create function authz.ev_day(p timestamptz) returns text
language sql stable set search_path = ''
as $$ select to_char(p at time zone 'Europe/Athens', 'DD/MM/YYYY'); $$;

create function authz.ev_time(p timestamptz) returns text
language sql stable set search_path = ''
as $$ select to_char(p at time zone 'Europe/Athens', 'HH24:MI'); $$;

create function authz.ev_date(p date) returns text
language sql immutable set search_path = ''
as $$ select to_char(p, 'DD/MM/YYYY'); $$;

-- Απόσπασμα κειμένου: έως 140 χαρακτήρες, με «…».
create function authz.ev_excerpt(p text) returns text
language sql immutable set search_path = ''
as $$ select case when length(p) > 140 then left(p, 139) || '…' else p end; $$;

create function authz.ev_team_name(p_user uuid) returns text
language sql stable security definer set search_path = ''
as $$ select t.name from public.team_users t where t.user_id = p_user; $$;

-- ───────────── Πλαίσιο ανά οντότητα (μεταβλητές, link, ids) ─────────────

create function authz.ev_ctx_agreement(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', o.client_id, 'agreement_id', a.id, 'opportunity_id', o.id, 'opportunity_owner_id', o.manager_id,
    'clientName', c.name, 'agreement', a.title, 'proposal', a.title, 'opportunity', o.title,
    'owner', authz.ev_team_name(o.manager_id), 'expiresOn', authz.ev_date(a.valid_until),
    'startOn', authz.ev_date(a.start_on), 'endOn', authz.ev_date(a.end_on),
    'link', '/app/agreements/' || a.id))
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
    join public.clients c on c.id = o.client_id
   where a.id = p_id;
$$;

create function authz.ev_ctx_filming(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', f.client_id, 'filming_id', f.id, 'production_id', f.production_id,
    'clientName', c.name, 'production', p.title,
    'filming', p.title || ' · ' || to_char(f.starts_at at time zone 'Europe/Athens', 'DD/MM'),
    'filmingDate', authz.ev_day(f.starts_at), 'filmingTime', authz.ev_time(f.starts_at),
    'location', coalesce(f.location, ''),
    'crew', coalesce((select string_agg(t.name, ', ' order by t.name)
                        from public.filming_crew fc join public.team_users t on t.user_id = fc.user_id
                       where fc.filming_id = f.id), ''),
    'link', '/app/filming/' || f.id, 'client_link', '/app/calendar'))
    from public.filmings f
    join public.productions p on p.id = f.production_id
    left join public.clients c on c.id = f.client_id
   where f.id = p_id;
$$;

create function authz.ev_ctx_production(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', p.client_id, 'production_id', p.id, 'clientName', c.name, 'production', p.title,
    'link', '/app/productions/' || p.id))
    from public.productions p left join public.clients c on c.id = p.client_id
   where p.id = p_id;
$$;

create function authz.ev_ctx_deliverable(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', p.client_id, 'deliverable_id', d.id, 'production_id', p.id, 'assignee_id', d.assignee_id,
    'clientName', c.name, 'production', p.title, 'deliverable', d.title,
    'deadline', authz.ev_date(d.deadline), 'assignee', authz.ev_team_name(d.assignee_id),
    'link', '/app/deliverables/' || d.id))
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    left join public.clients c on c.id = p.client_id
   where d.id = p_id;
$$;

-- Μήνυμα: ο αποστολέας με το όνομά του ως Χρήστη ομάδας ή ως Χρήστη πελάτη του Πελάτη.
create function authz.ev_ctx_message(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'client_id', m.client_id, 'message_id', m.id, 'production_id', m.production_id, 'author_kind', m.author_kind,
    'mentioned_ids', to_jsonb(m.mentions),
    'clientName', c.name, 'production', (select p.title from public.productions p where p.id = m.production_id),
    'sender', coalesce(authz.ev_team_name(m.author_id),
                       (select cu.name from public.client_users cu where cu.user_id = m.author_id and cu.client_id = m.client_id)),
    'excerpt', authz.ev_excerpt(m.body),
    'link', '/app/messages/' || m.client_id, 'client_link', '/app/messages'))
    from public.messages m join public.clients c on c.id = m.client_id
   where m.id = p_id;
$$;

create function authz.ev_ctx_request(p_message uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(authz.ev_ctx_message(r.message_id), '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'assignee_id', r.assignee_id, 'requester_id', r.declared_user,
    'request', authz.ev_excerpt((select m.body from public.messages m where m.id = r.message_id)),
    'client_link', '/app/messages?tab=requests'))
    from public.message_requests r
   where r.message_id = p_message;
$$;

create function authz.event_context(p_entity text, p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(case p_entity
    when 'agreements' then authz.ev_ctx_agreement(p_id)
    when 'agreement_costs' then authz.ev_ctx_agreement(p_id)
    when 'filmings' then authz.ev_ctx_filming(p_id)
    when 'productions' then authz.ev_ctx_production(p_id)
    when 'deliverables' then authz.ev_ctx_deliverable(p_id)
    when 'messages' then authz.ev_ctx_message(p_id)
    when 'message_requests' then authz.ev_ctx_request(p_id)
  end, '{}'::jsonb);
$$;

-- ───────────── Το ένα σημείο εγγραφής ─────────────

-- Γράφει ένα Γεγονός στην ουρά. Το πλαίσιο της οντότητας μπαίνει πρώτο και το p_payload το συμπληρώνει ή το διορθώνει.
-- Δεν σηκώνει σφάλμα για οντότητα που λείπει: η ενέργεια που το καλεί δεν πρέπει να αποτύχει εξαιτίας του.
create function authz.emit_event(
  p_type text, p_entity text, p_entity_id uuid, p_case_key text, p_client_id uuid, p_payload jsonb
) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_payload jsonb;
  v_client uuid;
  v_id bigint;
begin
  v_payload := authz.event_context(p_entity, p_entity_id) || coalesce(p_payload, '{}'::jsonb);
  v_client := coalesce(p_client_id, nullif(v_payload ->> 'client_id', '')::uuid);
  insert into public.events (type, entity, entity_id, case_key, client_id, actor_id, payload)
  values (p_type, p_entity, p_entity_id,
          coalesce(nullif(p_case_key, ''), p_type || ':' || coalesce(p_entity_id::text, p_entity)),
          v_client, auth.uid(), v_payload)
  returning id into v_id;
  return v_id;
exception when others then
  -- Ένα λάθος της ουράς δεν ακυρώνει ποτέ την επιχειρησιακή ενέργεια.
  raise warning 'emit_event %: %', p_type, sqlerrm;
  return null;
end;
$$;

-- ───────────── Από το Ίχνος στην ουρά ─────────────

-- (οντότητα του Ίχνους, όνομα) → Γεγονός του καταλόγου, ή null. Μόνο ό,τι αντιστοιχεί σε στιγμιαίο Γεγονός.
-- «booked» μόνο όταν αναμένει έγκριση· «rescheduled» μόνο από Χρήστη (η μετακίνηση από το Google έχει δικό της Γεγονός)·
-- πρόσκληση/αφαίρεση συναδέλφου μόνο όταν την έκανε ο ίδιος ο πελάτης.
create function authz.audit_event_code(p_entity text, p_event text, p_detail jsonb, p_actor uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    when 'agreements' then case p_event
      when 'link_opened' then 'proposal.link_opened'
      when 'agreement_signed' then 'agreement.signed'
      when 'approval_requested' then 'proposal.approval_requested'
      when 'approval_granted' then 'proposal.approval_decided'
      when 'approval_rejected' then 'proposal.approval_decided'
      when 'changes_requested' then 'proposal.changes_requested'
      when 'proposal_declined' then 'proposal.declined'
    end
    when 'agreement_costs' then case p_event when 'low_margin' then 'proposal.low_margin' end
    when 'filmings' then case p_event
      when 'booked' then case when p_detail ->> 'state' = 'pending' then 'filming.booked' end
      when 'approved' then 'filming.decided'
      when 'rejected' then 'filming.decided'
      when 'sheet_issued' then 'filming.sheet_issued'
      when 'rescheduled' then case when p_actor is not null then 'filming.rescheduled' end
      when 'cancelled' then 'filming.cancelled'
      when 'cancel_requested' then 'filming.cancel_requested'
      -- Η αποδοχή αιτήματος μετάθεσης περνά και από το filming_move («rescheduled»): ίδια περίπτωση, μία αποστολή.
      when 'reschedule_decided' then case when (p_detail ->> 'accepted')::boolean then 'filming.rescheduled' end
      when 'cancel_request_decided' then case when (p_detail ->> 'accepted')::boolean then 'filming.cancelled' end
      when 'crew_declined' then 'filming.crew_declined'
    end
    when 'productions' then case p_event when 'delivered' then 'production.delivered' end
    when 'access' then case p_event
      when 'team_invited' then 'team.access_changed'
      when 'client_invited' then case
        when not coalesce((p_detail ->> 'auto')::boolean, false) and p_actor is not null and not authz.user_is_team(p_actor)
          then 'client.colleagues_changed' end
      when 'client_user_removed' then case
        when p_actor is not null and not authz.user_is_team(p_actor) then 'client.colleagues_changed' end
    end
  end;
$$;

-- Το πλαίσιο των Γεγονότων πρόσβασης (το entity_id του Ίχνους είναι πρόσκληση ή Πελάτης).
create function authz.ev_access_payload(p_event text, p_entity_id uuid, p_detail jsonb, p_actor uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case p_event
    when 'team_invited' then (
      select jsonb_strip_nulls(jsonb_build_object(
        'user', i.name, 'by', authz.ev_team_name(p_actor), 'link', '/app/team',
        'roles', (select string_agg(r.name, ', ' order by r.name) from public.roles r where r.id = any (i.role_ids))))
        from public.invitations i where i.id = p_entity_id)
    else jsonb_strip_nulls(jsonb_build_object(
      'client_id', p_entity_id,
      'clientName', (select c.name from public.clients c where c.id = p_entity_id),
      'colleague', coalesce(
        (select i.name from public.invitations i where i.id = nullif(p_detail ->> 'invitationId', '')::uuid),
        (select cu.name from public.client_users cu
          where cu.client_id = p_entity_id and cu.user_id = nullif(p_detail ->> 'userId', '')::uuid)),
      'link', '/app/clients/' || p_entity_id))
  end;
$$;

-- Το «μία περίπτωση» για κάθε Γεγονός από το Ίχνος.
create function authz.audit_case_suffix(p_entity text, p_event text, p_entity_id uuid, p_detail jsonb, p_audit bigint) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when p_entity in ('agreements', 'agreement_costs') then
      'r' || coalesce(p_detail ->> 'revision', (select a.revision::text from public.agreements a where a.id = p_entity_id), '')
    when p_event = 'sheet_issued' then 'v' || coalesce(p_detail ->> 'version', '')
    when p_event = 'rescheduled' then coalesce(p_detail ->> 'to', p_audit::text)
    when p_event = 'reschedule_decided' then
      coalesce((select to_jsonb(f.starts_at) #>> '{}' from public.filmings f where f.id = p_entity_id), p_audit::text)
    when p_event = 'crew_declined' then coalesce(p_detail ->> 'user_id', '')
    when p_entity = 'productions' then p_audit::text
    when p_entity = 'access' then coalesce(p_detail ->> 'invitationId', p_detail ->> 'userId', p_audit::text)
  end;
$$;

create function authz.audit_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_detail jsonb := coalesce(new.after, '{}'::jsonb);
  v_event text := v_detail ->> 'event';
  v_code text;
  v_id uuid;
  v_suffix text;
  v_payload jsonb := '{}'::jsonb;
begin
  v_code := authz.audit_event_code(new.entity, v_event, v_detail, new.actor_id);
  if v_code is null or new.entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  v_id := new.entity_id::uuid;
  v_suffix := authz.audit_case_suffix(new.entity, v_event, v_id, v_detail, new.id);
  if new.entity = 'access' then
    v_payload := coalesce(authz.ev_access_payload(v_event, v_id, v_detail, new.actor_id), '{}'::jsonb);
  elsif v_code = 'proposal.approval_decided' then
    v_payload := jsonb_build_object('decision', case v_event when 'approval_granted' then 'granted' else 'rejected' end,
      'approval_requester_id', (select l.actor_id from public.audit_log l
                                  where l.entity = 'agreements' and l.entity_id = new.entity_id and l.action = 'event'
                                    and l.after ->> 'event' = 'approval_requested'
                                  order by l.id desc limit 1));
  elsif v_code = 'filming.decided' then
    v_payload := jsonb_build_object('decision', v_event);
  elsif v_code = 'filming.crew_declined' then
    v_payload := jsonb_strip_nulls(jsonb_build_object('member', authz.ev_team_name(nullif(v_detail ->> 'user_id', '')::uuid)));
  end if;
  perform authz.emit_event(v_code, new.entity, v_id,
    v_code || ':' || v_id || coalesce(':' || nullif(v_suffix, ''), ''), null, v_payload);
  return null;
exception when others then
  -- Ένα λάθος της ουράς δεν ακυρώνει ποτέ την επιχειρησιακή ενέργεια (ούτε το Ίχνος).
  raise warning 'audit_emit %: %', new.entity, sqlerrm;
  return null;
end;
$$;

create trigger audit_log_emit_event after insert on public.audit_log
  for each row when (new.action = 'event') execute function authz.audit_emit();

-- ───────────── Νέα emit: Παραδοτέα ─────────────

create function authz.deliverables_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform authz.emit_event('deliverable.assigned', 'deliverables', new.id,
      format('deliverable.assigned:%s:%s', new.id, new.assignee_id), null, '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger deliverables_emit_event after insert or update of assignee_id on public.deliverables
  for each row execute function authz.deliverables_emit();

-- Όριο αλλαγών: Γεγονός μία φορά ανά Παραδοτέο, όταν οι γύροι ξεπεράσουν το όριο της Συμφωνίας.
create function authz.deliverable_limit_emit(p_deliverable uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_limit integer;
begin
  select r.rounds into v_limit
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    join public.agreement_revision_limits r on r.agreement_id = p.agreement_id and r.kind_id = d.kind_id
   where d.id = p_deliverable;
  if v_limit is not null and authz.deliverable_rounds_used(p_deliverable) > v_limit then
    perform authz.emit_event('deliverable.limit_exceeded', 'deliverables', p_deliverable,
      'deliverable.limit_exceeded:' || p_deliverable, null, '{}'::jsonb);
  end if;
end;
$$;

create function authz.deliverable_versions_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text := case when tg_op = 'UPDATE' then old.state end;
  v_key text := new.deliverable_id || ':v' || new.number;
  v_payload jsonb := jsonb_build_object('version', new.number::text);
begin
  if new.state is distinct from v_old then
    if new.state = 'in_review' then
      perform authz.emit_event('deliverable.review_pending', 'deliverables', new.deliverable_id,
        'deliverable.review_pending:' || v_key, null, v_payload);
    elsif new.state = 'awaiting_client' then
      perform authz.emit_event('deliverable.version_sent', 'deliverables', new.deliverable_id,
        'deliverable.version_sent:' || v_key, null, v_payload);
    elsif new.state = 'returned' then
      perform authz.emit_event('deliverable.review_returned', 'deliverables', new.deliverable_id,
        'deliverable.review_returned:' || v_key, null, v_payload);
    elsif v_old = 'awaiting_client' and new.state in ('approved', 'changes_requested') then
      perform authz.emit_event('deliverable.client_answered', 'deliverables', new.deliverable_id,
        'deliverable.client_answered:' || v_key, null,
        v_payload || jsonb_build_object('decision', case new.state when 'approved' then 'approved' else 'changes' end));
      if new.state = 'changes_requested' then
        perform authz.deliverable_limit_emit(new.deliverable_id);
      end if;
    end if;
  end if;
  if tg_op = 'UPDATE' and old.link_broken_at is null and new.link_broken_at is not null then
    perform authz.emit_event('deliverable.link_broken', 'deliverables', new.deliverable_id,
      'deliverable.link_broken:' || v_key, null, v_payload);
  end if;
  return null;
end;
$$;

create trigger deliverable_versions_emit_event after insert or update of state, link_broken_at on public.deliverable_versions
  for each row execute function authz.deliverable_versions_emit();

create function authz.deliverable_requests_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform authz.emit_event('deliverable.change_requested', 'deliverables', new.deliverable_id,
      'deliverable.change_requested:' || new.id, null,
      jsonb_build_object('requester_id', new.created_by, 'request', authz.ev_excerpt(new.body)));
  elsif new.decision = 'round' and old.decision is null then
    perform authz.deliverable_limit_emit(new.deliverable_id);
  end if;
  return null;
end;
$$;

create trigger deliverable_requests_emit_event after insert or update of decision on public.deliverable_requests
  for each row execute function authz.deliverable_requests_emit();

-- ───────────── Νέα emit: Μηνύματα και Αιτήματα ─────────────

create function authz.messages_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not new.is_internal then
    perform authz.emit_event('message.created', 'messages', new.id, 'message.created:' || new.id, new.client_id, '{}'::jsonb);
  elsif cardinality(new.mentions) > 0 then
    perform authz.emit_event('message.mentioned', 'messages', new.id, 'message.mentioned:' || new.id, new.client_id, '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger messages_emit_event after insert on public.messages
  for each row execute function authz.messages_emit();

create function authz.message_requests_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform authz.emit_event('request.created', 'message_requests', new.message_id,
      'request.created:' || new.message_id, null, '{}'::jsonb);
  else
    perform authz.emit_event('request.closed', 'message_requests', new.message_id,
      'request.closed:' || new.message_id, null, jsonb_build_object('outcome', new.state));
  end if;
  return null;
end;
$$;

create trigger message_requests_created_event after insert on public.message_requests
  for each row execute function authz.message_requests_emit();
create trigger message_requests_closed_event after update of state on public.message_requests
  for each row when (old.state = 'open' and new.state in ('done', 'rejected'))
  execute function authz.message_requests_emit();

-- ───────────── Νέα emit: Google ─────────────

create function authz.google_activity_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := case new.kind
    when 'move_applied' then 'filming.google_moved'
    when 'deletion_detected' then 'filming.google_deleted'
    when 'move_rejected' then 'filming.google_move_rejected'
  end;
begin
  if v_code is not null and new.filming_id is not null then
    perform authz.emit_event(v_code, 'filmings', new.filming_id, v_code || ':' || new.filming_id || ':' || new.id, null,
      jsonb_build_object('error', new.message));
  end if;
  return null;
end;
$$;

create trigger google_activity_emit_event after insert on public.google_activity
  for each row execute function authz.google_activity_emit();

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.ev_vars(text[]), authz.ev_day(timestamptz), authz.ev_time(timestamptz), authz.ev_date(date),
  authz.ev_excerpt(text), authz.ev_team_name(uuid),
  authz.ev_ctx_agreement(uuid), authz.ev_ctx_filming(uuid), authz.ev_ctx_production(uuid), authz.ev_ctx_deliverable(uuid),
  authz.ev_ctx_message(uuid), authz.ev_ctx_request(uuid), authz.event_context(text, uuid),
  authz.emit_event(text, text, uuid, text, uuid, jsonb),
  authz.audit_event_code(text, text, jsonb, uuid), authz.ev_access_payload(text, uuid, jsonb, uuid),
  authz.audit_case_suffix(text, text, uuid, jsonb, bigint), authz.audit_emit(),
  authz.deliverables_emit(), authz.deliverable_limit_emit(uuid), authz.deliverable_versions_emit(),
  authz.deliverable_requests_emit(), authz.messages_emit(), authz.message_requests_emit(), authz.google_activity_emit()
  from public, anon, authenticated;

revoke all on table public.event_types, public.events from anon, authenticated;
