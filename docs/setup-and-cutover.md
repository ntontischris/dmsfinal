# Στήσιμο και αλλαγή domain

Το σχέδιο με το οποίο στήνεται το νέο DMS και γυρίζει το `devremedia.com`. Η αρχιτεκτονική είναι στο [ADR 0018](adr/0018-one-app-modules-security-in-the-database.md), οι ενσωματώσεις στο [ADR 0016](adr/0016-integrations-keyless-one-send-path-one-ai-gateway.md), η αλλαγή domain στο [ADR 0003](adr/0003-one-system-one-domain.md). Θα γίνει το κεφάλαιο «Στήσιμο» του Blueprint.

## Λογαριασμοί

- Vercel, Supabase, Sentry και GitHub είναι στους λογαριασμούς του developer, ώστε να αλλάζει και να αναβαθμίζει ελεύθερα.
- Το repo μένει public όσο σχεδιάζεται και χτίζεται, και γίνεται private όταν τελειώσει. Όσο είναι public:
  - μηδέν secrets στο repo, με έλεγχο guard,
  - μόνο ψεύτικα δεδομένα στο seed,
  - καμία απογραφή, αρχείο φύλαξης ή περιεχόμενο πελατών στο repo.
- Όταν γίνει private, ελέγχονται τα λεπτά των GitHub Actions: το δωρεάν πλάνο δίνει 2.000 λεπτά τον μήνα.

## Τι υπάρχει σήμερα

| Τι | Πού |
|---|---|
| DNS (nameservers) | SiteGround |
| `devremedia.com`, `www` | Vercel άλλου λογαριασμού (A `216.198.79.1`, `www` → CNAME `…vercel-dns-017.com`) |
| Email εταιρείας | Google Workspace (MX `smtp.google.com`) |
| Παλιά βάση | Supabase Free: χωρίς backups, κάνει pause μετά από 7 ημέρες αδράνειας |

Πρόσβαση σε SiteGround και στο παλιό Vercel έχει ο developer. Πριν από κάθε αλλαγή στο DNS γίνεται εξαγωγή όλων των εγγραφών ως αντίγραφο. Τα MX δεν αλλάζουν ποτέ.

## Φάση Α: Θεμέλια

1. Νέο Vercel project στο team του developer: Pro, region `dub1`, συνδεδεμένο με το `dmsfinal`.
2. Νέο Supabase Pro project στο eu-west-1, με Branching συνδεδεμένο στο GitHub. Τα migrations είναι μόνο κώδικας.
3. Sentry org με **EU region**. Ελέγχεται ότι είναι διαθέσιμη στο Developer πλάνο **πριν** τη δημιουργία, γιατί δεν αλλάζει μετά.
4. Resend με domain `mail.devremedia.com`: οι εγγραφές SPF, DKIM και DMARC μπαίνουν στο SiteGround μόνο στο subdomain. Το site και το email της εταιρείας δεν επηρεάζονται.
5. Google Cloud: service account με WIF και κοινή χρήση του Εταιρικού ημερολογίου.
6. Env στο Vercel και στη Supabase, ξεχωριστά για production και preview.
7. Εξωτερικό ping στο `/api/health`.

## Φάση Β: Ανάπτυξη

- Η production τρέχει στο `<project>.vercel.app`, πίσω από το Vercel Deployment Protection.
- Τα crons είναι ενεργά μόνο στην production.
- Τα emails φεύγουν μόνο σε εσωτερικές διευθύνσεις μέχρι την αλλαγή. Τα previews στέλνουν μόνο σε sandbox.
- Το παλιό DMS συνεχίζει κανονικά στο `devremedia.com`.

## Αρχικό περιεχόμενο

Ό,τι υπάρχει στο παλιό repo γίνεται αρχική τιμή:
- **Στο repo:** λογότυπα εταιρείας και γραμματοσειρές, και από το `messages/` τα γενικά namespaces ([#10](https://github.com/ntontischris/dmsfinal/issues/10)).
- **Στο Storage της production μέσω seed, ποτέ στο repo:** τα 12 λογότυπα πελατών (`public/images/clients/` του παλιού, με όνομα και ρύθμιση φόντου από το `landing/constants.ts`), οι εικόνες hero και οι φωτογραφίες ομάδας, επειδή το περιεχόμενο της Ιστοσελίδας ζει στο DMS ([ADR 0013](adr/0013-website-content-lives-in-the-dms.md)). Όσα φαίνονται ήδη στο τωρινό site περνούν ως δημοσιευμένα· η Συναίνεση δημοσίευσης ισχύει για νέα λογότυπα και Δουλειές.

Τα υπόλοιπα εμφανίζονται ως «εκκρεμεί» στον έλεγχο ετοιμότητας ([ADR 0015](adr/0015-settings-apply-forward-values-retire.md)) και συμπληρώνονται αργότερα:
- Στοιχεία εταιρείας: τα καταχωρεί μόνο ο Ιδιοκτήτης.
- Νομικά κείμενα: Πολιτική απορρήτου, cookies, Όροι χρήσης, όροι υπογραφής. Πρώτο σχέδιο πάνω στους πραγματικούς παρόχους, και έλεγχος από δικηγόρο.
- Κατάλογος, έξοδα και ώρες ([ADR 0017](adr/0017-cost-is-hours-actuals-by-admin-alerts-not-blocks.md)).
- Άρθρα Γνώσης.
- Οι τελικές τιμές ταυτότητας, μετά το prototype ([#35](https://github.com/ntontischris/dmsfinal/issues/35)).

## Φάση Γ: Ημέρα αλλαγής

**Πριν:**
1. Ο έλεγχος ετοιμότητας βγαίνει χωρίς κανένα «εκκρεμεί».
2. **Αρχείο φύλαξης από την παλιά βάση**, πριν από οτιδήποτε άλλο:
   - πλήρες `pg_dump`,
   - τα αρχεία του Storage,
   - CSV για ανθρώπους (πελάτες, συμβόλαια και συμφωνίες, τιμολόγια, πληρωμές, projects).

   Φυλάσσονται στο Google Drive της εταιρείας, με πρόσβαση μόνο στους δύο εταίρους, ποτέ στο repo. Ελέγχεται ότι ανοίγουν.
3. Οι ενεργοί πελάτες ξαναστήνονται με το χέρι στο νέο.

**Η αλλαγή:**
4. Αφαιρείται το `devremedia.com` και το `www` από το παλιό Vercel και προστίθενται στο νέο project.
5. Στο SiteGround: TXT `_vercel` για επαλήθευση, και ενημέρωση του A και του CNAME του `www` με όσα δείξει το νέο project.
6. Ενεργοποιούνται οι redirects (παρακάτω), βγαίνει το Deployment Protection από την production, ανοίγουν τα πραγματικά emails.
7. Στέλνονται προσκλήσεις στην ομάδα και στους Χρήστες πελάτη. Οι παλιοί κωδικοί δεν ισχύουν.
8. Η ομάδα παίρνει νέο Σύνδεσμο ημερολογίου ([ADR 0005](adr/0005-google-is-a-view-of-one-company-calendar.md)). Οι παλιές συνδρομές σταματούν.

## Redirects

| Παλιό | Νέο |
|---|---|
| `/` | η νέα Ιστοσελίδα |
| `/book` | 301 → φόρμα ενδιαφέροντος |
| `/login`, `/forgot-password`, `/update-password`, `/confirm` | 301 → οι νέες σελίδες εισόδου |
| `/admin/*`, `/client/*`, `/salesman/*`, `/employee/*`, και τα `-v2` | → `/login`, μετά «Σήμερα» |
| παλιοί σύνδεσμοι πρότασης/συμβολαίου, `/api/calendar/*` | 410 «Ο σύνδεσμος δεν ισχύει πια», με στοιχεία επικοινωνίας |

Οι redirects είναι ένας πίνακας στο `next.config`, και ένα τεστ Playwright ελέγχει κάθε γραμμή του.

## Μετά

| Πότε | Παλιό Vercel | Παλιά Supabase |
|---|---|---|
| Ημέρα αλλαγής | χωρίς domain, το project μένει | read-only |
| +30 ημέρες | pause | pause |
| +90 ημέρες | διαγραφή | διαγραφή, αφού επιβεβαιωθεί ότι το αρχείο φύλαξης ανοίγει |
