# Ενσωματώσεις v1: τι ισχύει (Google Calendar, Resend, AI, GA4/Pixel, Turnstile)

Έλεγχος πηγών: **2026-10-01**. Τιμές και όρια πλατφορμών αλλάζουν συχνά, οπότε ξαναελέγχονται πριν την υλοποίηση. Ticket: [#40](https://github.com/ntontischris/dmsfinal/issues/40). Μόνο γεγονότα· η απόφαση παίρνεται στο #41.

Πλαίσιο: Next.js (App Router) στο Vercel Pro (`dub1`), Supabase Pro (`eu-west-1`). Ένα κοινό Εταιρικό ημερολόγιο Google με αμφίδρομο συγχρονισμό ([ADR 0005](../docs/adr/0005-google-is-a-view-of-one-company-calendar.md)). Αυτοματισμοί με email ([ADR 0006](../docs/adr/0006-automations-are-rules-on-a-fixed-event-catalogue.md)). Βοηθός που απαντά μόνο από τη Γνώση που επιτρέπεται στον χρήστη, με δημόσιο widget. GA4 και Meta Pixel μόνο με συναίνεση, και φόρμα ενδιαφέροντος με Turnstile (ADR 0013, branch `docs/23-visual-identity-website`).

---

## 1. Google Calendar: ένα κοινό Εταιρικό ημερολόγιο

### Τρόποι σύνδεσης

| Επιλογή | Τι χρειάζεται | Τι ισχύει |
|---|---|---|
| **Service account χωρίς domain-wide delegation (DWD)** | Google Cloud project και service account. Το ημερολόγιο μοιράζεται με το email του service account (ACL ρόλος `writer` ή `owner`). | Το Google επιτρέπει πρόσβαση χωρίς DWD «directly share … with the service account's email address» ([create-credentials](https://developers.google.com/workspace/guides/create-credentials)). Δεν απαιτεί Workspace. **Όριο:** ένα service account χωρίς DWD **δεν μπορεί να προσκαλεί attendees**, και το API επιστρέφει 403 «Service accounts cannot invite attendees without Domain-Wide Delegation of Authority» (το error είναι τεκμηριωμένο μόνο σε forums, π.χ. [discuss.google.dev](https://discuss.google.dev/t/service-accounts-cannot-invite-attendees-without-domain-wide-delegation-of-authority/145804)). Η ανάγνωση των attendees ενός γεγονότος που δημιουργήθηκε στο Google δεν επηρεάζεται. |
| **Service account με DWD** | **Google Workspace**. Την εξουσιοδότηση τη δίνει **Super Admin** στο Admin console, με client ID και scopes ([create-credentials](https://developers.google.com/workspace/guides/create-credentials)). | Ενεργεί εκ μέρους ενός χρήστη του domain (impersonation). Χρειάζεται μόνο αν το DMS πρέπει να στέλνει προσκλήσεις ή να ενεργεί ως συγκεκριμένος χρήστης. |
| **OAuth ενός χρήστη** (refresh token του ιδιοκτήτη του ημερολογίου) | OAuth client και consent screen. | Τα scopes του Calendar είναι **sensitive** και χρειάζονται έλεγχο από το Google για εφαρμογές σε production ([sensitive-scope-verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)). Σε κατάσταση «Testing» με external user type, το refresh token **λήγει σε 7 ημέρες**. Ένα refresh token ακυρώνεται επίσης μετά από 6 μήνες αχρησίας, και ισχύει όριο 100 refresh tokens ανά λογαριασμό ανά client ([oauth2](https://developers.google.com/identity/protocols/oauth2)). Αν ο χρήστης φύγει ή ανακαλέσει την πρόσβαση, ο συγχρονισμός σταματά. |

- **Scopes:** τα πιο στενά για εγγραφή σε συγκεκριμένο ημερολόγιο είναι το `calendar.events` («View and edit events on all your calendars») και το `calendar.events.owned`. Το `calendar.app.created` καλύπτει μόνο ημερολόγια που δημιούργησε η ίδια η εφαρμογή ([auth scopes](https://developers.google.com/workspace/calendar/api/auth)).
- **Κλειδιά service account:** σε Google Cloud organizations που δημιουργήθηκαν **από 3/5/2024 και μετά**, το `iam.disableServiceAccountKeyCreation` είναι ενεργό από προεπιλογή, άρα δεν φτιάχνονται JSON keys χωρίς αλλαγή policy ([restricting-service-accounts](https://docs.cloud.google.com/resource-manager/docs/organization-policy/restricting-service-accounts)). Εναλλακτικά, το Vercel υποστηρίζει **OIDC / Workload Identity Federation** προς GCP: η function παίρνει βραχύβιο token με impersonation του service account, χωρίς αποθηκευμένο κλειδί ([vercel.com/docs/oidc/gcp](https://vercel.com/docs/oidc/gcp)).
- **Ρόλοι ACL:** `freeBusyReader`, `reader`, `writerWithoutPrivateAccess`, `writer`, `owner`. Σε Workspace, ρυθμίσεις του domain μπορεί να περιορίζουν τη μέγιστη πρόσβαση εξωτερικών, π.χ. μόνο free/busy ([sharing](https://developers.google.com/workspace/calendar/api/concepts/sharing)). Αυτό αφορά και ένα service account, που για το domain είναι εξωτερικός λογαριασμός (συμπέρασμα, δεν το λέει ρητά η πηγή).

### Push notifications (watch channels)

([push guide](https://developers.google.com/workspace/calendar/api/guides/push), [events.watch](https://developers.google.com/workspace/calendar/api/v3/reference/events/watch))

- Το `events.watch` απαιτεί διεύθυνση **HTTPS με έγκυρο πιστοποιητικό**, που καλύπτεται από τα deployments του Vercel. Self-signed, μη έμπιστα ή ληγμένα πιστοποιητικά απορρίπτονται.
- Η ειδοποίηση **δεν περιέχει δεδομένα γεγονότος** («do not include a message body»). Περιέχει μόνο headers: `X-Goog-Channel-ID`, `X-Goog-Channel-Token` (δικό μας token έως 256 χαρακτήρες, χρήσιμο για επαλήθευση), `X-Goog-Resource-State` (`sync` / `exists` / `not_exists`) και `X-Goog-Message-Number`, που αυξάνεται αλλά όχι διαδοχικά. Μετά από κάθε ειδοποίηση, το DMS πρέπει να καλέσει `events.list` με sync token.
- **Λήξη:** προεπιλεγμένο TTL **604800 s (7 ημέρες)**. Τα docs δεν δίνουν ρητό μέγιστο. **Δεν υπάρχει αυτόματη ανανέωση**: πριν τη λήξη το DMS δημιουργεί νέο κανάλι με `watch`, και τα παλιά σταματούν με `channels.stop` (id + resourceId), μόνο από τον ίδιο χρήστη/client που τα δημιούργησε. Η ανανέωση μπορεί να γίνει με Vercel cron.

### Incremental sync

([sync guide](https://developers.google.com/workspace/calendar/api/guides/sync))

- Ο πρώτος πλήρης `list` δίνει `nextSyncToken`, μόνο στην τελευταία σελίδα. Οι επόμενες κλήσεις με `syncToken` επιστρέφουν μόνο αλλαγές **και πάντα τα διαγραμμένα** γεγονότα, που χρειάζονται για τον κανόνα «διαγραφή Γυρίσματος θέλει επιβεβαίωση» του ADR 0005.
- Αν το token λήξει ή αλλάξουν τα ACL, η απάντηση είναι **410 Gone** και απαιτείται πλήρης επανασυγχρονισμός. Οι παράμετροι του query πρέπει να είναι ίδιες σε όλες τις κλήσεις· μη επιτρεπτοί συνδυασμοί δίνουν 400.

### Quotas και κόστος

([quota](https://developers.google.com/workspace/calendar/api/guides/quota))

- 10.000 requests/λεπτό ανά project, 600 requests/λεπτό ανά χρήστη ανά project, με κυλιόμενο παράθυρο. Η υπέρβαση δίνει 403 ή 429 `usageLimits` και αντιμετωπίζεται με exponential backoff.
- 1.000.000 requests/ημέρα ανά project χωρίς χρέωση. Το όριο δεν αυξάνεται. Το Calendar API είναι δωρεάν, αλλά το Google αναφέρει ότι **χρεώσεις για υπέρβαση θα ξεκινήσουν αργότερα μέσα στο 2026, με προειδοποίηση 90 ημερών**. Για ένα ημερολόγιο, ο όγκος είναι πολύ κάτω από τα όρια.

---

## 2. Resend: SMTP για Supabase Auth και API για Αυτοματισμούς

- **Supabase Auth:** το ενσωματωμένο SMTP στέλνει μόνο σε διευθύνσεις της ομάδας, με όριο **2 μηνύματα/ώρα**. Με custom SMTP το αρχικό όριο είναι **30/ώρα**, και αλλάζει στις ρυθμίσεις Rate Limits. Το Resend είναι στους πάροχους που αναφέρει ρητά η Supabase ([auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp)).
- **SMTP:** host `smtp.resend.com`, username `resend`, password το API key. Θύρες 465/2465 (implicit TLS) ή 25/587/2587 (STARTTLS). Απαιτεί verified domain και έχει τα ίδια rate limits με το API ([send-with-smtp](https://resend.com/docs/send-with-smtp)).
- **API:** `https://api.resend.com` με Bearer API key. Όριο **10 requests/s ανά team**, που αυξάνεται κατόπιν αιτήματος. Το header `User-Agent` είναι υποχρεωτικό, αλλιώς 403 ([api-reference](https://resend.com/docs/api-reference/introduction)). Υποστηρίζεται idempotency key (`Resend-Idempotency-Key`) για αποφυγή διπλής αποστολής ([send-with-smtp](https://resend.com/docs/send-with-smtp)), κάτι σχετικό με τον κανόνα «μία φορά ανά περίπτωση» του ADR 0006.
- **Domain verification:** εγγραφές SPF και DKIM (TXT, και MX ή CNAME). Το DMARC συστήνεται μετά την επαλήθευση ([add-a-domain](https://resend.com/docs/add-a-domain)). Το Resend συστήνει αποστολή από **subdomain** (π.χ. `updates.example.com`) για να μένει χωριστή η φήμη αποστολέα ([domains](https://resend.com/docs/dashboard/domains/introduction)).
- **Regions αποστολής:** `us-east-1`, **`eu-west-1` (Ireland)**, `sa-east-1`, `ap-northeast-1`. Όμως **όλα τα δεδομένα λογαριασμού (metadata, logs, API records) αποθηκεύονται στις ΗΠΑ, όποιο region κι αν επιλεγεί** ([regions](https://resend.com/docs/dashboard/domains/regions)). Στο DPA: «primary processing operations take place in the United States», με διαβίβαση μέσω EU SCCs (Module Two) και EU-U.S. Data Privacy Framework ([DPA](https://resend.com/legal/dpa)).
- **Τιμές** ([pricing](https://resend.com/pricing)):

| Plan | Τιμή/μήνα | Emails/μήνα | Ημερήσιο όριο | Domains | Retention |
|---|---|---|---|---|---|
| Free | $0 | 3.000 | **100/ημέρα** | 3 | 30 ημέρες |
| Pro | $20 (50k) / $35 (100k) | 50.000–100.000 | — | 10 | 30 ημέρες |
| Scale | $90–$1.150 | 100k–2,5M | — | 1.000 | ευέλικτο |

  Υπέρβαση στο Pro: $0,90 ανά 1.000. Dedicated IP μόνο στο Scale (+$30/μήνα, από 3.000 αποστολές/ημέρα).

---

## 3. AI για τον Βοηθό (RAG από τη Γνώση)

### Μοντέλα Claude και τιμές

([pricing](https://platform.claude.com/docs/en/about-claude/pricing), ανά εκατομμύριο tokens, USD)

| Μοντέλο | ID | Input | Cache hit | Output | Batch in/out |
|---|---|---|---|---|---|
| Claude Opus 5.5 | `claude-opus-5-5` | $4 | $0,20 | $20 | $2 / $10 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 | $0,20 | $10 | $1 / $5 |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1 | $0,10 | $5 | $0,50 / $2,50 |

- Το cache write κοστίζει 1,25× το input για 5 λεπτά ή 2× για 1 ώρα. Το cache hit κοστίζει 0,1× το input (0,05× στο Opus 5.5).
- Τα μοντέλα από Claude 4.7 και μετά χρησιμοποιούν νέο tokenizer, που παράγει **περίπου 30% περισσότερα tokens** για το ίδιο κείμενο ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)).
- Το thinking χρεώνεται ως output. Στο Opus 5.5 δεν απενεργοποιείται (ελέγχεται μόνο το effort, default `medium`). Στο Sonnet 5.5 απενεργοποιείται με `thinking: {type: "between_tools"}`. Πηγή: Claude API skill / model-migration guide.
- **Γεωγραφία:** το `inference_geo` δέχεται μόνο `"global"` (default) ή `"us"` (1,1× τιμή). **Δεν υπάρχει επιλογή EU.** Το workspace geo (αποθήκευση) είναι μόνο `"us"` ([data-residency](https://platform.claude.com/docs/en/manage-claude/data-residency)).
- **Retention:** τα δεδομένα του API δεν χρησιμοποιούνται για εκπαίδευση χωρίς ρητή άδεια. Το περιεχόμενο συνομιλίας **δεν διατηρείται από προεπιλογή**, εκτός από τα «Covered Models» (Fable 5.x / Mythos), που απαιτούν 30 ημέρες. Υλικό που επισημαίνεται από trust & safety μπορεί να διατηρηθεί έως 2 χρόνια ([api-and-data-retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)).

### Embeddings

- **Η Anthropic δεν έχει δικό της μοντέλο embeddings.** Αναφέρει ως πάροχο τη Voyage AI ([embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings)).
- Voyage 4: `voyage-4-large`, `voyage-4`, `voyage-4-lite` (multilingual, context 32k tokens, διαστάσεις 1024 default και 256/512/2048). Το `voyage-4-nano` είναι open-weight (Apache 2.0). Υπάρχουν και rerankers `rerank-2.5` / `rerank-2.5-lite`.
- Τιμές ([voyage pricing](https://docs.voyageai.com/docs/pricing)): `voyage-4` **$0,06/M**, `voyage-4-lite` **$0,02/M**, με **200M δωρεάν tokens**. Για τον όγκο της Γνώσης, το κόστος embeddings είναι πρακτικά αμελητέο.

### pgvector στη Supabase

- Η επέκταση `vector` ενεργοποιείται με `create extension vector with schema extensions;` και υποστηρίζει indexes HNSW και IVFFlat ([supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)). Είναι διαθέσιμη σε όλα τα πλάνα (βλ. research #4).
- Όρια ([pgvector README](https://github.com/pgvector/pgvector)): το `vector` αποθηκεύει έως 16.000 διαστάσεις, αλλά τα indexes HNSW/IVFFlat καλύπτουν έως **2.000** (`halfvec` έως 4.000). Τα 1024 του Voyage χωράνε.
- **Δικαιώματα:** η Supabase περιγράφει RAG με RLS: η αναζήτηση ομοιότητας επιστρέφει μόνο τμήματα που επιτρέπονται στον χρήστη (`auth.uid()` σε policy, ή session variable για απευθείας σύνδεση Postgres) ([rag-with-permissions](https://supabase.com/docs/guides/ai/rag-with-permissions)). Αυτό ταιριάζει με τον κανόνα «απαντά μόνο από Γνώση που επιτρέπεται στον χρήστη». Ο δημόσιος Επισκέπτης βλέπει μόνο δημόσια Γνώση.

### Ενδεικτικό κόστος ανά συνομιλία (υπολογισμός, όχι μέτρηση)

Υπόθεση: 5 ερωτήσεις, ~5.000 input tokens ανά ερώτηση (system prompt, ανακτημένα τμήματα και ιστορικό), ~300 output, χωρίς caching και χωρίς thinking:

| Μοντέλο | Input (25k) | Output (1,5k) | **Ανά συνομιλία** | Ανά 1.000 |
|---|---|---|---|---|
| Haiku 4.5 | $0,025 | $0,0075 | **≈ $0,03** | ≈ $33 |
| Sonnet 5.5 | $0,050 | $0,015 | **≈ $0,07** | ≈ $65 |
| Opus 5.5 | $0,100 | $0,030 | **≈ $0,13** | ≈ $130 |

Το caching του σταθερού system prompt μειώνει το input. Το thinking (υποχρεωτικό στο Opus 5.5) το αυξάνει. Το ελληνικό κείμενο πιθανότατα παράγει περισσότερα tokens ανά λέξη από το αγγλικό (δεν μετρήθηκε).

### Προστασία του δημόσιου widget από κατάχρηση

- **Vercel WAF Rate Limiting** (Pro): έως 40 κανόνες ανά project, κλειδί IP ή JA4 digest, fixed window από 10 s έως 10 λεπτά, με ενέργειες 429 / Deny / Challenge / Log. Χρέωση με βάση τη χρήση, ανά region ([rate-limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)). Οι μετρητές κρατούνται ανά region.
- **Turnstile** στην έναρξη συνομιλίας (§5). Το token είναι μίας χρήσης και ισχύει 5 λεπτά, άρα προστατεύει την έναρξη και όχι κάθε μήνυμα.
- Στην πλευρά του API: `max_tokens` ανά απάντηση, όριο μηνυμάτων ανά συνομιλία, και αποθήκευση `usage` για παρακολούθηση κόστους. Αυτές είναι τεχνικές δυνατότητες, όχι εγγυήσεις πηγής. Στην Anthropic Console υπάρχουν όρια δαπάνης ανά workspace ([pricing → rate limits](https://platform.claude.com/docs/en/about-claude/pricing)).

---

## 4. GA4 και Meta Pixel με συναίνεση

### Google Consent Mode v2

([consent guide](https://developers.google.com/tag-platform/security/guides/consent), [GA help 9976101](https://support.google.com/analytics/answer/9976101))

- Τέσσερις βασικές παράμετροι: `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`, με τιμή `granted` ή `denied`. Το **default πρέπει να οριστεί πριν φορτώσει οποιοδήποτε tag**, αλλιώς δεν λειτουργεί.
- **Basic:** τα tags μπλοκάρονται μέχρι τη συναίνεση, και τίποτα δεν φτάνει στο Google πριν από αυτήν. Δεν γίνεται modeling.
- **Advanced:** τα tags φορτώνουν πριν το banner και, αν δεν δοθεί συναίνεση, στέλνουν **cookieless pings** (timestamp, user agent, referrer, κατάσταση συναίνεσης). Αυτά επιτρέπουν behavioral και conversion modeling στο GA4.
- Η απαίτηση **Google-certified CMP (IAB TCF)** από 16/1/2024 αφορά **publishers με AdSense / Ad Manager / AdMob** που σερβίρουν διαφημίσεις σε ΕΟΧ/ΗΒ, όχι έναν διαφημιζόμενο που απλώς μετρά με GA4 ([AdSense help](https://support.google.com/adsense/answer/13554020?hl=en)).

### Meta Pixel

([meta gdpr](https://developers.facebook.com/docs/meta-pixel/implementation/gdpr))

- `fbq('consent', 'revoke')` **πριν** το `init`, και `fbq('consent', 'grant')` μετά τη συναίνεση. Όσο ισχύει το revoke, δεν αποστέλλονται events.
- Το script `fbevents.js` φορτώνεται από τους servers της Meta ακόμη και σε κατάσταση revoke. Αν αυτό αρκεί για τα ελληνικά κριτήρια δεν επιβεβαιώθηκε. Η ασφαλής εκδοχή είναι να μη φορτώνει καθόλου το script πριν τη συναίνεση.

### Εργαλεία συναίνεσης για Next.js

- **`@next/third-parties/google`:** components `GoogleTagManager` και `GoogleAnalytics`, που φορτώνουν μετά το hydration. Η βιβλιοθήκη είναι **experimental** και δεν διαχειρίζεται συναίνεση από μόνη της ([nextjs third-parties](https://nextjs.org/docs/app/guides/third-party-libraries)).
- **Open source:** `orestbida/cookieconsent` v3, MIT, vanilla JS χωρίς εξαρτήσεις, με κατηγορίες cookies ([github](https://github.com/orestbida/cookieconsent)). Το DMS κρατά τον κώδικα και το αρχείο συναινέσεων στη δική του βάση.
- **Hosted CMP** (Cookiebot, CookieYes, Usercentrics, iubenda κ.ά.): προσφέρουν σάρωση cookies, αρχείο συναινέσεων και πιστοποίηση Google/TCF. **Τιμές και λίστα πιστοποίησης δεν ελέγχθηκαν.**

### ΑΠΔΠΧ (Ελλάδα)

([HDPA by-design](https://www.dpa.gr/en/by-design/online-marketing-and-advertising-cookies-and-trackers), [δράση 2022](https://www.dpa.gr/en/enimerwtiko/press-releases/action-hellenic-dpa-informational-websites-cookies), [IAPP για 1/2020](https://iapp.org/news/a/greek-dpa-issues-guidelines-on-cookies-and-trackers))

- Νομική βάση: άρθρο 4 παρ. 5 ν. 3471/2006 (ePrivacy 5(3)). Οδηγίες της Αρχής **1/2020** (25/2/2020).
- **Τα analytics τρίτων (ρητά και το Google Analytics) χρειάζονται προηγούμενη συναίνεση.** Χωρίς συναίνεση επιτρέπονται μόνο όσα είναι τεχνικά απαραίτητα.
- **Αποδοχή και απόρριψη με τον ίδιο αριθμό κλικ και στο ίδιο επίπεδο,** για όλα μαζί ή ανά κατηγορία. Τα κουμπιά πρέπει να έχουν ίδιο μέγεθος, έμφαση και χρώμα. Η απόρριψη δεν επιτρέπεται να βρίσκεται μόνο στις «Ρυθμίσεις».
- Δεν μετρούν ως συναίνεση η συνέχιση πλοήγησης, το scroll ή τα προεπιλεγμένα κουτάκια. Δεν επιτρέπεται cookie wall, και η ανάκληση πρέπει να είναι εύκολη.
- Ξεχωριστή συναίνεση ανά σκοπό, και **τήρηση αρχείου opt-in/opt-out**.
- Η Αρχή ελέγχει ενεργά: το 2022 έλεγξε 30 ενημερωτικά sites για άνισα κλικ και παραπλανητικό σχεδιασμό και έδωσε προθεσμία 15 ημερών.

---

## 5. Cloudflare Turnstile σε Next.js server actions

- **Επαλήθευση στον server:** `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` με `secret`, `response` (το token), και προαιρετικά `remoteip` και `idempotency_key` ([server-side-validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)). Σε server action, το token φτάνει ως πεδίο της φόρμας (`cf-turnstile-response`) και επαληθεύεται πριν από οποιαδήποτε εγγραφή. Το secret μένει μόνο στον server.
- **Token:** έως 2.048 χαρακτήρες, ισχύει **300 s**, **μίας χρήσης**: η επαναχρησιμοποίηση δίνει `timeout-or-duplicate`. Η επαλήθευση στον server είναι υποχρεωτική, γιατί το widget μόνο του δεν προστατεύει.
- **Κόστος:** το Free plan είναι δωρεάν με απεριόριστα challenges, έως 20 widgets και 10 hostnames ανά widget. Το Enterprise έχει τιμή κατόπιν επικοινωνίας ([plans](https://developers.cloudflare.com/turnstile/plans/)). **Δεν χρειάζεται το site να περνά από το Cloudflare** ([FAQ](https://developers.cloudflare.com/turnstile/frequently-asked-questions/)).
- **Ιδιωτικότητα** ([Turnstile privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/)): συλλέγει IP, TLS fingerprint, User-Agent και sitekey/origin. Χρησιμοποιεί cookies που το Cloudflare χαρακτηρίζει «strictly necessary» για ανίχνευση bots. Δεν αναφέρεται χρήση για διαφήμιση. Δεν διαβάζει τα πεδία της φόρμας.

---

## Ανοιχτά / δεν επιβεβαιώθηκαν

- **Αν η εταιρεία έχει Google Workspace ή απλό Gmail.** Από αυτό εξαρτάται αν το DWD είναι καν δυνατό, και αν ισχύει το org policy που μπλοκάρει τα service-account keys.
- **Μέγιστη διάρκεια watch channel:** τα docs δίνουν μόνο default 7 ημέρες, όχι ρητό μέγιστο.
- **Εξαιρέσεις από το verification του Google** για Internal (Workspace) εφαρμογές ή εφαρμογές προσωπικής χρήσης: η σελίδα των εξαιρέσεων δεν διαβάστηκε.
- **Το 403 για attendees χωρίς DWD** τεκμηριώνεται μόνο από forums, όχι από επίσημη σελίδα.
- **Τα δεδομένα του Resend αποθηκεύονται στις ΗΠΑ** ακόμη και με αποστολή από `eu-west-1`. Χρειάζεται εκτίμηση GDPR (SCCs/DPF), όχι μόνο τεχνική επιλογή.
- **Το Claude API δεν έχει EU inference ή αποθήκευση:** υπάρχουν μόνο `global`/`us`. Ίσως χρειάζεται αναφορά στην πολιτική απορρήτου.
- **Τιμές και πιστοποίηση hosted CMP** (Cookiebot, CookieYes, Usercentrics, iubenda) δεν ελέγχθηκαν.
- **Αν το Meta Pixel σε κατάσταση `revoke` είναι αποδεκτό για την ΑΠΔΠΧ**, ή αν πρέπει να μη φορτώνει καθόλου πριν τη συναίνεση.
- **Το κόστος ανά συνομιλία** είναι υπολογισμός με υποθέσεις. Δεν μετρήθηκαν tokens σε ελληνικό κείμενο.
