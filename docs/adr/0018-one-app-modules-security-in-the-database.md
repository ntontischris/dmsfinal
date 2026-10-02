# Ένα app με modules· η ασφάλεια ζει στη βάση· τα Γεγονότα είναι πίνακας

Το παλιό DMS ήταν οργανωμένο ανά τεχνικό τύπο και ανά ρόλο, με έλεγχο ρόλου στον κώδικα και χωρίς τεστ ασφάλειας. Το νέο κόβεται ανά επιχειρησιακή περιοχή ([#6](https://github.com/ntontischris/dmsfinal/issues/6)), με Δικαιώματα που έχουν Εύρος ([ADR 0007](0007-permissions-have-scope-and-relevance-is-derived.md)) και ποσά/κόστος που κρύβονται ξεχωριστά. Η υποδομή είναι δεδομένη: Vercel Pro `dub1`, Supabase Pro eu-west-1, όλα τα crons στο Vercel ([#4](https://github.com/ntontischris/dmsfinal/issues/4)), ένα project για Ιστοσελίδα και σύστημα ([ADR 0003](0003-one-system-one-domain.md)).

- **Stack:**
  - Ένα Next.js 16 app (App Router, TypeScript strict), όχι monorepo. Ιστοσελίδα, σύστημα και δημόσιοι σύνδεσμοι είναι route groups `(site)`, `(app)`, `(links)`.
  - Supabase: Postgres + RLS, Auth, Storage μόνο για Τιμολόγια, Γνώση και λογότυπα, Realtime, pgvector.
  - Tailwind v4 + shadcn, next-intl, Zod + react-hook-form, server actions με `ActionResult<T>`, pnpm.
  - Χωρίς ORM: τύποι από `supabase gen types`.
- **Modules:** ένας φάκελος ανά module (`src/modules/<module>/`) με actions, queries, schemas, Γεγονότα, Δικαιώματα και components.
  - Τα άλλα modules βλέπουν μόνο το `index.ts` του, και αυτό το ελέγχει guard στο build.
  - Τα routes δεν έχουν λογική.
  - Δεν υπάρχουν φάκελοι ανά ρόλο.
  - Ένα `public` schema.
- **RLS με Δικαιώματα και Εύρος:**
  - Η `authz.scope(Δικαίωμα)` επιστρέφει `all`/`mine`/τίποτα, ενώνοντας τους Ρόλους (κερδίζει το ευρύτερο).
  - Η `authz.relates_to(...)` υπολογίζει το «με αφορά» τη στιγμή του ελέγχου.
  - Για τους Χρήστες πελάτη, η `authz.active_client()` ελέγχει τον επιλεγμένο Πελάτη.
  - Κάθε πίνακας πελάτη έχει `client_id`. Το συμπληρώνει trigger από τον γονέα και δεν αλλάζει.
  - Τον ίδιο έλεγχο κάνουν και οι server actions. Το service role μπαίνει μόνο σε crons και webhooks, με τεκμηριωμένο λόγο.
- **Τα χρήματα σε δικούς τους πίνακες.** Κάθε οντότητα έχει τρία επίπεδα:
  - **περιεχόμενο**,
  - **ποσά**, που θέλουν «Βλέπει ποσά»,
  - **κόστος**, που θέλει «Βλέπει κόστος και κερδοφορία».

  Το καθένα έχει δικό του RLS. Ένα guard απαγορεύει στήλες ποσών σε πίνακες περιεχομένου.
- **Γεγονότα ως outbox:**
  - Ένα trigger γράφει το Γεγονός στον πίνακα `events` στην ίδια συναλλαγή με την αλλαγή, όποιος κι αν την έκανε (χρήστης, cron, Google).
  - Ένα cron κάθε λεπτό ταιριάζει Αυτοματισμούς ([ADR 0006](0006-automations-are-rules-on-a-fixed-event-catalogue.md)) και γράφει στο Ιστορικό αποστολών με ώρα αποστολής.
  - Ένα ημερήσιο cron παράγει τα Γεγονότα «Χ μέρες πριν». Αν αλλάξει η ημερομηνία, η εκκρεμής αποστολή ξαναϋπολογίζεται.
  - Μοναδικό κλειδί ανά (Γεγονός, Αυτοματισμός, παραλήπτης), επανάληψη με καθυστέρηση στα λάθη, λίστα «απέτυχαν».
  - Η Ειδοποίηση φτάνει μέσω Realtime. Το email φεύγει από το ενιαίο σημείο αποστολής ([ADR 0016](0016-integrations-keyless-one-send-path-one-ai-gateway.md)).
- **Testing:** τέσσερα επίπεδα, και όλα πρέπει να είναι πράσινα πριν από κάθε merge:
  - **pgTAP**: κάθε policy ανά ρόλο × εύρος, τα triggers, οι υπολογισμοί.
  - **Vitest**: η λογική.
  - **Playwright**: οι ροές της ραχοκοκαλιάς, πάνω στο preview.
  - **Guards στο build**: design, routes, i18n, όρια modules, στήλες ποσών, RLS σε κάθε πίνακα, τεστ για κάθε πίνακα.
- **Observability:**
  - Sentry (Developer, δωρεάν, EU region, με scrubbing).
  - Logs Vercel και Supabase με `request_id`, χωρίς προσωπικά δεδομένα.
  - Η σελίδα Υγεία συστήματος μέσα στο DMS, που ειδοποιεί όταν κάτι κοκκινίσει.
  - Ίχνος ενεργειών με γενικό trigger, append-only, όπου οι αλλαγές ποσών και κόστους φαίνονται μόνο με τα αντίστοιχα Δικαιώματα.
  - Εξωτερικό ping στο `/api/health`.
- **Περιβάλλοντα:**
  - Τοπικό (Supabase CLI).
  - Preview: Supabase Branch ανά PR (~$0,32/ημέρα), συνδεδεμένο με το Vercel preview, με ψεύτικα δεδομένα και email μόνο σε sandbox.
  - Production μόνο από `main`.
  - Χωρίς staging.
  - Τα migrations είναι μόνο κώδικας και τρέχουν μόνο προς τα εμπρός.
  - Ένα seed για tests, previews και prototype.
- **Συμβάσεις δεδομένων:**
  - `uuid` για IDs, και ανθρώπινος αριθμός όπου χρειάζεται (`ΣΥΜ-2026-014`).
  - `numeric(12,2)` σε ευρώ.
  - `timestamptz` για στιγμές, `date` για ημερομηνίες επιχείρησης, με λογική σε Europe/Athens.
  - `archived_at` αντί για διαγραφή.
  - `jsonb {el, en}` για δίγλωσσα πεδία.
  - `text` + `check` αντί για `enum`.
  - `created/updated_at/by` παντού.

## Considered Options

- **Monorepo (Ιστοσελίδα και σύστημα σε χωριστά apps):** απορρίφθηκε. Ένα deploy και μία ομάδα, χωρίς κέρδος από το διάσπασμα.
- **ORM (Prisma, Drizzle):** απορρίφθηκε. Το RLS και οι συναρτήσεις θέλουν SQL ούτως ή άλλως, και ένα ORM με service connection παρακάμπτει το RLS.
- **Postgres schema ανά module:** απορρίφθηκε. Η Supabase θέλει ρητή έκθεση κάθε schema, και τα modules μοιράζονται πολλά foreign keys.
- **«Με αφορά» μέσω joins σε κάθε policy, χωρίς `client_id`:** απορρίφθηκε. Αργές και δυσνόητες policies. Το `client_id` είναι αποκανονικοποίηση, αλλά το κλειδώνει trigger.
- **Πίνακας-cache για το «με αφορά»:** απορρίφθηκε. Ξεσυγχρονίζεται, ενώ το ADR 0007 το θέλει υπολογισμένο τη στιγμή.
- **Views που μηδενίζουν στήλες ποσών:** απορρίφθηκε. Οι εγγραφές πάνε αλλού από τις αναγνώσεις, και ένας ξεχασμένος δρόμος προς τον βασικό πίνακα διαρρέει τα πάντα.
- **Απόκρυψη ποσών μόνο στον κώδικα:** απορρίφθηκε. Ο browser client βλέπει ό,τι επιτρέπει το RLS.
- **Γεγονότα από τον κώδικα της εφαρμογής, ή εξωτερική ουρά (Inngest, Vercel Queues, pgmq):** απορρίφθηκαν. Ο κώδικας δεν πιάνει αλλαγές από crons και Google στην ίδια συναλλαγή. Η ουρά είναι ακόμα ένα σύστημα για όγκο που ένας πίνακας σηκώνει άνετα.
- **Sentry Team ($26/μήνα) ή μόνο Vercel χωρίς Sentry:** το πρώτο είναι περιττό για έναν developer. Το δεύτερο αφήνει αόρατα τα σφάλματα στον browser.
- **Staging περιβάλλον, down migrations:** απορρίφθηκαν. Το preview ανά PR κάνει τη δουλειά του staging, και η διόρθωση με νέο migration είναι πιο ασφαλής από την επιστροφή.

## Consequences

- Η πρώτη υλοποίηση ξεκινά από τα θεμέλια: `authz` schema, γενικά triggers (`client_id`, audit, ίχνος), πίνακας `events` και επεξεργαστής, guards, seed. Μετά έρχονται τα modules.
- Ο κατάλογος Γεγονότων ([ADR 0006](0006-automations-are-rules-on-a-fixed-event-catalogue.md)) μεγαλώνει με τα Γεγονότα της Υγείας συστήματος: cron δεν έτρεξε, αποστολή απέτυχε οριστικά, συγχρονισμός Google σταμάτησε, Γεγονός κόλλησε.
- Η EU region του Sentry επιλέγεται μία φορά, στη δημιουργία του org, και δεν αλλάζει. Ελέγχεται στο στήσιμο ([#43](https://github.com/ntontischris/dmsfinal/issues/43)).
- Το ανοιχτό του [#4](https://github.com/ntontischris/dmsfinal/issues/4) για το κόστος του Branching κλείνει: $0,01344/ώρα ανά branch, εκτός των compute credits.
