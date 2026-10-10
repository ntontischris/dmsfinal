# Ημέρα σύνδεσης: οδηγός βήμα-βήμα (DMS)

Για τον Ιδιοκτήτη, που τα κάνει όλα μόνος του. Δεν χρειάζεται να ξέρεις προγραμματισμό. Ακολούθα τη σειρά, μην πηδάς βήματα.

## Πριν ξεκινήσεις

**Κανόνας ασφαλείας.** Κανένα κλειδί, κωδικός ή token δεν γράφεται ποτέ σε συνομιλία (ούτε στο Claude), σε αρχείο ή στο repo. Το repo `ntontischris/dmsfinal` είναι **public**, δηλαδή το βλέπει όλος ο κόσμος. Κάθε μυστικό πάει μόνο στο πεδίο που σου λέει ο οδηγός (GitHub Secrets ή Vercel).

**Τι έχεις ήδη**
- Vercel project `dmsfinal-app` στον λογαριασμό Pro `ntontischris-projects`.
- Ένα ΝΕΟ project στο Supabase, που δεν είναι ακόμα συνδεδεμένο με τίποτα.
- Repo στο GitHub: `ntontischris/dmsfinal`.

**Τι θα χρειαστείς ανοιχτό:** Supabase dashboard, Vercel dashboard, GitHub (το repo), και για το Βήμα 8 το SiteGround (DNS).

**Πώς καταλαβαίνεις ότι δεν είναι συνδεδεμένο:** η εφαρμογή τρέχει και χωρίς σύνδεση, αλλά ό,τι θέλει βάση δείχνει «η βάση δεν έχει συνδεθεί». Αυτό φεύγει μετά τα Βήματα 4-5.

**Τι είναι μόνο τοπικό (δεν το αγγίζεις):** τα αρχεία `app/supabase/config.toml` και `app/e2e/seed.mjs` αφορούν μόνο το τοπικό περιβάλλον δοκιμών και το CI. Οι φανταστικοί χρήστες (`owner@example.com`, `admin@example.com` κ.λπ.) **δεν υπάρχουν και δεν πρέπει να δημιουργηθούν στην πραγματική βάση**. Ό,τι γράφει το `config.toml` (π.χ. κλειστή εγγραφή) ΔΕΝ περνά αυτόματα στο cloud project: τα κάνεις με το χέρι στο Βήμα 3.

---

## Βήμα 1. Έλεγχος περιοχής (region) του Supabase

**Γιατί:** η βάση πρέπει να είναι στην ΕΕ (**Ireland, eu-west-1** ή **Frankfurt, eu-central-1**) και κοντά στις functions του Vercel (το σχέδιο λέει region `dub1` = Δουβλίνο, δίπλα στο Ireland). Αλλιώς κάθε σελίδα περιμένει άσκοπα.

**Πού:** Supabase dashboard → διάλεξε το νέο project → **Project Settings → General** → πεδίο **Region**.

**Θα δεις:** `West EU (Ireland)` (ή Frankfurt).

**Αν δεν είναι ΕΕ:** η περιοχή **δεν αλλάζει** σε υπάρχον project. Σταμάτα. Φτιάξε νέο project στο σωστό region (Dashboard → **New project**) και σβήσε το λάθος. Είναι άδειο, δεν χάνεις τίποτα.

**Και στο Vercel:** Vercel dashboard → `dmsfinal-app` → **Settings → Functions → Function Region** → να γράφει **Dublin, Ireland (dub1)**. Είσαι σε Pro, οπότε πρέπει να εφαρμόζεται (στο Hobby αγνοείται σιωπηλά). Αν δεν αλλάζει, έλεγξε στο Settings → Billing ότι το team είναι όντως Pro.

---

## Βήμα 2. Μάζεψε τα 3 στοιχεία για το GitHub

Το GitHub χρειάζεται τρία secrets, ώστε το job `migrate` να βάζει μόνο του τη δομή της βάσης (migrations) κάθε φορά που ενώνεται κώδικας στο `main`.

| Secret | Τι είναι | Πού το βρίσκεις |
|---|---|---|
| `SUPABASE_PROJECT_REF` | Το σύντομο αναγνωριστικό του project (~20 γράμματα) | Supabase → project → **Project Settings → General → Reference ID**. Φαίνεται και στη διεύθυνση του dashboard (`/project/<αυτό>`). |
| `SUPABASE_DB_PASSWORD` | Ο κωδικός της βάσης που όρισες όταν έφτιαξες το project | Από τον password manager. Αν τον ξέχασες: Supabase → **Project Settings → Database → Database password → Reset database password**, και αποθήκευσε τον νέο. |
| `SUPABASE_ACCESS_TOKEN` | Προσωπικό token για το CLI | Supabase → κάτω αριστερά το προφίλ σου → **Account Preferences → Access Tokens** → **Generate new token** → όνομα `github-migrate`. Φαίνεται **μία φορά**: αντίγραψέ το αμέσως στο Βήμα 4. |

**Επαλήθευση:** έχεις και τα τρία σε password manager ή ανοιχτά σε καρτέλα μέχρι να τα βάλεις στο GitHub.

**Αν χάσεις το token πριν το βάλεις:** **Revoke** και φτιάξε καινούργιο. Δεν χάνεται τίποτα.

---

## Βήμα 3. Ρυθμίσεις Auth στο Supabase (μία φορά)

Κάνε τις ρυθμίσεις **πριν** μπει οποιοσδήποτε στο σύστημα.

### 3α. Κλείσιμο εγγραφών
**Πού:** Supabase → **Authentication → Sign In / Providers**.
- Κλείσε ΜΟΝΟ το **«Allow new users to sign up»** (off).
- **Άφησε ΑΝΟΙΧΤΟ** τον πάροχο **Email**. Αν τον κλείσεις, δεν θα μπορεί κανείς να μπει με email και κωδικό.
- Ελάχιστος κωδικός: 10 χαρακτήρες (αν υπάρχει το πεδίο).
- Google: άφησέ το κλειστό προς το παρόν.
- **Secure password change** και **Secure email change**: on (αν υπάρχουν τα πεδία, συνήθως στο **Authentication → Providers → Email**). Έτσι η αλλαγή κωδικού ή email θέλει πρόσφατη είσοδο, όχι μόνο ανοιχτή συνεδρία.

**Θα δεις:** μετά το **Save changes**, το «Allow new users to sign up» off και το Email provider **Enabled**.

**Αν αργότερα κάτι δεν μπαίνει:** έλεγξε πρώτα ότι δεν έκλεισες κατά λάθος τον Email provider.

### 3β. Διευθύνσεις (URL Configuration)
**Πού:** Supabase → **Authentication → URL Configuration**.
- **Site URL:** η διεύθυνση της εφαρμογής, π.χ. `https://dmsfinal-app.vercel.app` (την ακριβή τη βλέπεις στο Vercel → `dmsfinal-app` → Domains).
- **Redirect URLs → Add URL**, μία-μία:
  - `https://<η-διεύθυνση-της-εφαρμογής>/auth/callback`
  - `https://<η-διεύθυνση-της-εφαρμογής>/auth/confirm`
  - για τα previews του Vercel (δοκιμαστικές εκδόσεις): τη διεύθυνση που δείχνει το Vercel σε ένα preview (π.χ. μοτίβο `https://*-ntontischris-projects.vercel.app/**`, επιβεβαίωσέ το από ένα πραγματικό preview).

**Θα δεις:** τις διευθύνσεις στη λίστα. Αν λείπει κάποια, ο σύνδεσμος του email θα δώσει «redirect URL not allowed».

### 3γ. Πρότυπα email (Email Templates)
**Πού:** Supabase → **Authentication → Emails** (ή Email Templates).

Τα δύο πρότυπα πρέπει να χρησιμοποιούν σύνδεσμο `token_hash` προς το `/auth/confirm`, όχι τον προεπιλεγμένο `{{ .ConfirmationURL }}`:
- **Invite user:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
- **Reset password:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Αντικατέστησε μόνο το `href` του συνδέσμου μέσα στο πρότυπο και πάτα **Save**.

**Επαλήθευση:** γίνεται στο Βήμα 7. Αν ο σύνδεσμος στο email ξεκινά από `supabase.co` αντί για τη διεύθυνση της εφαρμογής, το πρότυπο δεν αποθηκεύτηκε.

---

## Βήμα 4. Βάλε τα secrets στο GitHub

**Πού:** GitHub → repo `ntontischris/dmsfinal` → **Settings → Secrets and variables → Actions → New repository secret**.

Φτιάξε τρία, με **ακριβώς** αυτά τα ονόματα:
1. `SUPABASE_ACCESS_TOKEN`
2. `SUPABASE_DB_PASSWORD`
3. `SUPABASE_PROJECT_REF`

Επικόλλησε την τιμή στο πεδίο **Secret** → **Add secret**.

**Επαλήθευση:** στη λίστα βλέπεις τα τρία ονόματα (οι τιμές δεν ξαναφαίνονται ποτέ, είναι φυσιολογικό).

**Τι κάνει:** την επόμενη φορά που θα ενωθεί κώδικας στο `main`, και αφού περάσουν οι έλεγχοι (`checks`, `database`, `e2e`), το job `migrate` κάνει `supabase link` και `supabase db push` στη νέα βάση.

**Προσοχή:** αν λείπει το `SUPABASE_ACCESS_TOKEN` ή το `SUPABASE_PROJECT_REF`, το job **δεν αποτυγχάνει**: γράφει «Λείπουν τα secrets της βάσης· τα migrations δεν περνούν ακόμα.» και τελειώνει πράσινο. Άρα ένα πράσινο `migrate` δεν αποδεικνύει από μόνο του ότι πέρασαν τα migrations. Κοίτα το log.

### 4β. Πρώτο πέρασμα των migrations
1. GitHub → **Actions** → το τελευταίο run του workflow **app** στο `main` → job **migrate**. Αν δεν υπάρχει νέο push, πάτα **Re-run all jobs**.
2. Στο βήμα «Migrations στη βάση ανάπτυξης» ψάξε για `Applying migration` ή `Finished supabase db push`.

**Επαλήθευση στο Supabase:** **Table Editor** → βλέπεις πίνακες (π.χ. `roles`, `team_users`, `team_user_roles`). Ή **Database → Migrations**: λίστα με τα migrations.

**Αν αποτύχει**
- `password authentication failed`: λάθος `SUPABASE_DB_PASSWORD`. Κάνε reset (Βήμα 2), ξαναβάλε το secret, Re-run.
- `Access token not provided` ή `unauthorized`: λάθος ή ληγμένο token. Φτιάξε νέο, ξαναβάλε το secret.
- `project ref` ή `not found`: λάθος `SUPABASE_PROJECT_REF`. Αντίγραψέ το ξανά από Settings → General.
- Αν κάποιο από τα `checks`, `database`, `e2e` είναι κόκκινο, το `migrate` δεν ξεκινά. Αυτό είναι ζήτημα κώδικα, όχι σύνδεσης: πες στον developer ποιο job και τι γράφει (χωρίς κλειδιά).

---

## Βήμα 5. Σύνδεση Supabase ↔ Vercel

Η εφαρμογή διαβάζει τη διεύθυνση και το δημόσιο κλειδί της βάσης από μεταβλητές του Vercel (`NEXT_PUBLIC_SUPABASE_URL` και `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ή `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Δεν γράφονται ποτέ στον κώδικα· τις γράφει η επίσημη σύνδεση.

**Πού:** Vercel dashboard → `dmsfinal-app` → **Integrations** (ή Storage / Marketplace) → **Supabase** → **Connect** → διάλεξε **το νέο project** (προσοχή: όχι το παλιό) → περιβάλλοντα **Production** και **Preview**.

**Επαλήθευση:** Vercel → `dmsfinal-app` → **Settings → Environment Variables**: υπάρχουν `NEXT_PUBLIC_SUPABASE_URL` και ένα από τα `…_PUBLISHABLE_KEY` / `…_ANON_KEY`, για Production και Preview. Μην αντιγράφεις τις τιμές πουθενά.

**Μετά:** Vercel → **Deployments** → στο τελευταίο → ⋯ → **Redeploy** (οι μεταβλητές μπαίνουν μόνο σε νέο build).

**Θα δεις:** το `/login` ανοίγει χωρίς το μήνυμα «η βάση δεν έχει συνδεθεί».

**Αν δεν βρίσκεις την ενσωμάτωση ή αποτύχει:** Vercel → Settings → Environment Variables → **Add**, με τα ονόματα παραπάνω και τιμές από Supabase → **Project Settings → API** (Project URL και publishable/anon key). Το `service_role` key ΔΕΝ το επικολλάς σε chat ή αρχείο, και δεν το χρειάζεσαι σε αυτό το βήμα.

---

## Βήμα 6. Έλεγχος ότι η εφαρμογή βλέπει τη βάση

1. Άνοιξε τη διεύθυνση της εφαρμογής (Vercel → `dmsfinal-app` → **Visit**). Αν έχει Deployment Protection, θα σου ζητήσει σύνδεση Vercel· είναι σωστό όσο το σύστημα είναι σε ανάπτυξη.
2. Πήγαινε στο `/login`: φόρμα εισόδου (email, κωδικός, σύνδεσμος στο email).
3. Πήγαινε στο `/app` χωρίς είσοδο: πρέπει να σε στείλει στο `/login` (είναι κλειδωμένο).

**Αν πάει στραβά:** Vercel → Deployments → το τελευταίο → **Runtime Logs**. Συνήθως είναι ξεχασμένο Redeploy (Βήμα 5) ή λάθος Site URL (Βήμα 3β).

---

## Βήμα 7. Ο πρώτος Ιδιοκτήτης (το πιο ευαίσθητο βήμα)

**Κανόνας:** όποιος συνδεθεί **πρώτος** σε βάση χωρίς Χρήστες ομάδας γίνεται **Ιδιοκτήτης** αυτόματα (`claim_first_owner`). Άρα ο πρώτος που μπαίνει πρέπει να είσαι **εσύ**. Γι' αυτό έκλεισες τις εγγραφές (3α) και θα προσκαλέσεις μόνος σου τον εαυτό σου πριν δώσεις τη διεύθυνση σε οποιονδήποτε.

**Πριν:** τα migrations πέρασαν (4β) και η εφαρμογή συνδέθηκε (5-6).

**Δεύτερη ασφάλεια:** μόνο χρήστης που μπήκε **με πρόσκληση** από το dashboard μπορεί να γίνει ο πρώτος Ιδιοκτήτης. Ακόμα κι αν οι εγγραφές έμεναν κατά λάθος ανοιχτές, κάποιος που γράφτηκε μόνος του (ή με Google) δεν παίρνει τον ρόλο. Γι' αυτό το βήμα 1 πρέπει να είναι πρόσκληση, όχι «Create user».

**Βήματα**
1. Supabase → **Authentication → Users → Add user → Send invitation** (Invite). Γράψε το δικό σου email και στείλε.
2. Άνοιξε το email. Ο σύνδεσμος πρέπει να δείχνει στη διεύθυνση της εφαρμογής, σε `/auth/confirm?token_hash=…&type=invite`.
3. Πάτα τον σύνδεσμο → πας στο `/auth/set-password`. Όρισε κωδικό (τουλάχιστον 10 χαρακτήρες· στον password manager).
4. Μπαίνεις στο `/app`.

**Επαλήθευση:** Supabase → **Table Editor** → `team_users`: **μία** γραμμή, με το email σου. Στον `team_user_roles`: ρόλος **Ιδιοκτήτης**. Στην εφαρμογή βλέπεις τα πάντα (Ρυθμίσεις κ.λπ.).

**Αν αποτύχει**
- *Δεν ήρθε email.* Το ενσωματωμένο email του Supabase έχει πολύ χαμηλό όριο (λίγα μηνύματα την ώρα) και πάει συχνά στα spam. Περίμενε, έλεγξε τα spam, μην στέλνεις 10 φορές.
- *Ο σύνδεσμος δίνει «redirect URL not allowed» ή «invalid / expired».* Έλεγξε 3β και 3γ. Μετά διέγραψε τον χρήστη (Authentication → Users → ⋯ → Delete user) και στείλε νέα πρόσκληση. Ο σύνδεσμος χρησιμοποιείται μία φορά.
- *Μπήκες αλλά δεν είσαι Ιδιοκτήτης (δεν βλέπεις Ρυθμίσεις).* Κάποιος άλλος πρόλαβε να γίνει πρώτος. Κοίτα τον `team_users`. Αν υπάρχει άγνωστη γραμμή, **σταμάτα**, πες το στον developer και μην προσκαλέσεις κανέναν.
- *Βλέπεις χρήστες `owner@example.com`, `admin@example.com` κ.λπ.* Είναι οι φανταστικοί των τεστ (`seed.mjs`) και **δεν πρέπει** να υπάρχουν στην πραγματική βάση (το script αρνείται να τρέξει εκτός τοπικού περιβάλλοντος). Σταμάτα και ειδοποίησε τον developer.
- *Η πρόσκληση απορρίπτεται με «signups not allowed».* Οι προσκλήσεις από το dashboard δεν επηρεάζονται από το κλείσιμο εγγραφών. Αν βγαίνει, έλεγξε ότι ο Email provider είναι ενεργός (3α).

**Μετά:** μόνο τώρα προσκαλείς τους άλλους (συνεργάτη, ομάδα).

---

## Βήμα 8. Αυτόματα email (Resend μέσω Send Email Hook)

**Τι είναι:** όλα τα email του συστήματος (πρόσκληση, σύνδεσμος εισόδου, επαναφορά κωδικού, αποστολές Συμφωνιών) φεύγουν από **έναν** δρόμο: το Resend, από `Devre Media <noreply@devremedia.com>`. Η Supabase δεν στέλνει τίποτα μόνη της: όταν χρειάζεται email εισόδου, καλεί το σύστημα (**Send Email Hook**), και το σύστημα το στέλνει. **Όχι SMTP.** Ο υποτομέας `mail.` δεν χρειάζεται: το `devremedia.com` είναι ήδη **Verified** στο Resend.

**Τι κάνεις:** μόνο ρυθμίσεις στο Vercel και στο Supabase. Κανένα DNS.

### 8α. Vercel (`dmsfinal-app` → Settings → Environment Variables)
Πρόσθεσε ή έλεγξε αυτές τις μεταβλητές, και μετά **Redeploy**. Οι τιμές δεν γράφονται πουθενά εκτός Vercel.

| Όνομα | Τι είναι | Πού τη βρίσκεις |
|---|---|---|
| `RESEND_API_KEY` | Κλειδί αποστολής | Ήδη υπάρχει (Βήμα 8γ του παλιού οδηγού). |
| `RESEND_FROM_EMAIL` | Αποστολέας | Ήδη υπάρχει· αν λείπει: `Devre Media <noreply@devremedia.com>`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Κλειδί διαχειριστή της βάσης (παρακάμπτει τη RLS) | Supabase → Project Settings → API → `service_role`. Μόνο για **Production** και **Preview**. |
| `SEND_EMAIL_HOOK_SECRET` | Μυστικό υπογραφής του Hook | Το δίνει η Supabase στο 8β (μορφή `v1,whsec_…`). |
| `CRON_SECRET` | Μυστικό της ουράς email | Φτιάξ' το τυχαία (π.χ. 32 χαρακτήρες). Το Vercel Cron το στέλνει μόνο του. |
| `EMAIL_ALLOWED_DOMAINS` | Μόνο αυτά τα domains παίρνουν email (π.χ. `devremedia.com`) | Στο **Preview** είναι **υποχρεωτικό** (αλλιώς δεν στέλνεται τίποτα). Στο Production **δεν** το βάζεις. |
| `APP_ORIGIN` | Προαιρετικό: η διεύθυνση της εφαρμογής για τους συνδέσμους στα email | Όχι απαραίτητο· χωρίς αυτό το Production χρησιμοποιεί τη διεύθυνση του Vercel (`dmsfinal-app.vercel.app`). |

### 8β. Supabase (Authentication)
1. **Authentication → Hooks → Send Email Hook** → τύπος **HTTPS** → URL: `https://dmsfinal-app.vercel.app/api/hooks/send-email` → **Enable**.
2. Η Supabase δείχνει το μυστικό (`v1,whsec_…`) **μία φορά**. Αντίγραψέ το στη μεταβλητή `SEND_EMAIL_HOOK_SECRET` του Vercel (8α). Μετά δεν ξαναφαίνεται: αν το χάσεις, φτιάξε νέο στο ίδιο μενού.
3. **Authentication → Email → OTP expiry** → `86400` (24 ώρες, ώστε οι σύνδεσμοι πρόσκλησης να ζουν μία μέρα).

### 8γ. Έλεγχος
- Ρυθμίσεις → **Ενσωματώσεις** → «Δοκιμαστικό email στον εαυτό μου» → στο Ιστορικό εμφανίζεται γραμμή **στάλθηκε** με το email σου.
- Αν εμφανιστεί **απέτυχε** με «Resend 401/403»: το `RESEND_API_KEY` είναι λάθος ή δεν έχει δικαίωμα αποστολής από το `devremedia.com`.
- Αν το Hook δεν τρέχει (ο Χρήστης δεν παίρνει email εισόδου και η Supabase δείχνει σφάλμα): έλεγξε ότι το URL του 8β είναι ακριβώς το παραπάνω και ότι το `SEND_EMAIL_HOOK_SECRET` είναι το ίδιο και στα δύο μέρη.

---

## Τελικός έλεγχος

- [ ] Supabase region = ΕΕ (Ireland / Frankfurt) και Vercel function region = `dub1`.
- [ ] Auth: «Allow new users to sign up» **off**, πάροχος **Email on**.
- [ ] Redirect URLs αποθηκεύτηκαν. Το Send Email Hook είναι ενεργό (Βήμα 8β).
- [ ] 3 secrets στο GitHub (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`).
- [ ] Το `migrate` πέρασε και φαίνονται πίνακες στο Supabase.
- [ ] Vercel: οι μεταβλητές Supabase υπάρχουν, έγινε Redeploy, το `/login` ανοίγει.
- [ ] Ο πρώτος Ιδιοκτήτης είσαι εσύ (`team_users` = 1 γραμμή, ρόλος Ιδιοκτήτης).
- [ ] Resend domain **Verified**, κλειδί μόνο στο Vercel.
- [ ] Πουθενά δεν επικολλήθηκε κλειδί σε chat ή αρχείο.

## Αν χαθείς

Σταμάτα στο βήμα που έσπασε, μην προχωρήσεις. Γράψε στον developer **ποιο βήμα** και **τι μήνυμα** βλέπεις (χωρίς κλειδιά, κωδικούς ή tokens). Αν κατά λάθος επικόλλησες μυστικό κάπου, θεώρησέ το καμένο: φτιάξε νέο (rotate) και σβήσε το παλιό.

## Αργότερα (όχι σήμερα)

Η αλλαγή του `devremedia.com` στο νέο σύστημα (αρχείο φύλαξης της παλιάς βάσης, DNS στο SiteGround, redirects) είναι ξεχωριστή «Ημέρα αλλαγής», στο `docs/setup-and-cutover.md`, Φάση Γ. Το Google Calendar (service account) και το AI Gateway στήνονται επίσης αργότερα, με τον developer.
