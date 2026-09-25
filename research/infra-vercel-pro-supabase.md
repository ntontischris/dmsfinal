# Νέα υποδομή: Vercel Pro + Supabase (eu-west-1) — τι ισχύει

Έλεγχος πηγών: **2026-09-25**. Οι τιμές/ορίες πλατφορμών αλλάζουν συχνά — να ξαναελεγχθεί πριν την τελική υλοποίηση.

Πλαίσιο: νέο repo, νέο Vercel account (Pro), νέο Supabase project σε `eu-west-1` (Ireland). Στοίβα: Next.js 16 App Router, Supabase (Auth/Postgres/Storage/Realtime/pgvector), Stripe, Resend, Google Calendar service account, OpenAI. Το παλιό setup ήταν σε Vercel Hobby, όπου το `regions` στο `vercel.json` αγνοούνταν σιωπηλά (functions έτρεχαν σε `iad1`/US ενώ η DB ήταν σε `eu-west-1`) και τα cron jobs ήταν περιορισμένα, οπότε μεταφέρθηκαν σε cron-job.org.

---

## 1. Regions / colocation

- Ο κωδικός region του Vercel που αντιστοιχεί γεωγραφικά στο Supabase `eu-west-1` (Dublin) είναι **`dub1`** — επίσημος πίνακας regions: `dub1 = eu-west-1, Dublin, Ireland` ([vercel.com/docs/regions](https://vercel.com/docs/regions)).
- Default region για όλα τα νέα Vercel projects, ανεξαρτήτως plan, είναι `iad1` (Washington DC, US) — πρέπει να αλλαχθεί ρητά ([vercel.com/docs/functions/configuring-functions/region](https://vercel.com/docs/functions/configuring-functions/region)).
- Ρύθμιση region: μέσω `vercel.json` (`"regions": ["dub1"]`), μέσω dashboard (Project → Settings → Functions → Function Regions), ή μέσω CLI (`vercel --regions dub1`) ([vercel.com/docs/functions/configuring-functions/region](https://vercel.com/docs/functions/configuring-functions/region)).
- **Ναι, το Vercel Pro τιμά πραγματικά το configured region** (σε αντίθεση με το Hobby): ο πίνακας ορίων λέει Hobby = "Single region" (πάντα ό,τι έχει οριστεί ως default, χωρίς επιλογή πολλαπλών), ενώ Pro επιτρέπει **πολλαπλά regions** ([vercel.com/docs/functions/configuring-functions/region#limits](https://vercel.com/docs/functions/configuring-functions/region)). Σημείωση ασυνέπειας πηγών: η σελίδα ορίων του `region` doc αναφέρει "Pro: 5 regions", ενώ η σελίδα Fluid Compute αναφέρει "Multi-region functions — Pro: Up to 3" ([vercel.com/docs/fluid-compute#default-settings-by-plan](https://vercel.com/docs/fluid-compute)). Πρακτικά, για τη νέα υποδομή χρειαζόμαστε μόνο **1 region (`dub1`)**, άρα η ασυνέπεια δεν επηρεάζει τον σχεδιασμό — απλώς να επιβεβαιωθεί στο dashboard πριν το deploy.
- Functions πρέπει να τρέχουν στο ίδιο region με τη βάση δεδομένων για ελάχιστο latency — ρητή σύσταση του Vercel ([vercel.com/docs/functions/configuring-functions/region](https://vercel.com/docs/functions/configuring-functions/region)).

## 2. Vercel Cron Jobs στο Pro

Επίσημος πίνακας ([vercel.com/docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)):

| Plan | Αριθμός cron jobs/project | Ελάχιστο interval | Ακρίβεια χρονισμού |
|---|---|---|---|
| Hobby | 100 | 1 φορά/ημέρα | ανά ώρα (±59 λεπτά) |
| **Pro** | **100** | **1 φορά/λεπτό** | **ανά λεπτό** |
| Enterprise | 100 | 1 φορά/λεπτό | ανά λεπτό |

- Στο Hobby, cron expressions πιο συχνά από 1x/ημέρα **αποτυγχάνουν στο deployment** — αυτό εξηγεί γιατί χρειάστηκε cron-job.org στο παλιό setup.
- Στο **Pro, τα cron jobs μπορούν να τρέξουν εξ ολοκλήρου μέσα στο Vercel**, με ανά-λεπτό ακρίβεια — αρκεί για το μηνιαίο cron (`email-filming-reminder`, 25η κάθε μήνα) και το ημερήσιο cron (`email-holiday-greeting`) της εφαρμογής.
- Cron jobs καταναλώνουν Vercel Functions, άρα ισχύουν τα ίδια όρια/χρέωση functions ([vercel.com/docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)). Δεν υπάρχει ξεχωριστή χρέωση cron.

## 3. Vercel Functions limits στο Pro (και Fluid Compute)

Επίσημος πίνακας ([vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations)):

| Feature | Hobby | Pro/Enterprise |
|---|---|---|
| Μνήμη | 2 GB / 1 vCPU (max) | 2 GB default, **max 4 GB / 2 vCPU** |
| Διάρκεια (default) | 300s | 300s |
| Διάρκεια (max) | 300s | **800s** (γενικά διαθέσιμο) |
| Διάρκεια (extended, beta) | — | **1800s (30 λεπτά)**, μόνο με ρητό function-level config, δεν υποστηρίζεται με Secure Compute/Static IPs |
| Μέγεθος bundle | 250MB (500MB Python) | ίδιο· "Large functions" beta έως 5GB |
| Concurrency | auto-scale έως 30.000 | ίδιο (Enterprise: 100.000+) |
| Regions | 1 (iad1 default) | πολλαπλά (βλ. §1) |
| Request/response body | 4.5MB max | ίδιο |
| File descriptors | 1.024 shared | ίδιο |

- **Fluid Compute είναι default ενεργό σε όλα τα νέα projects** από 23/4/2025 ([vercel.com/docs/fluid-compute](https://vercel.com/docs/fluid-compute)).
- Τι αλλάζει το Fluid Compute:
  - **Concurrency**: πολλαπλά invocations μοιράζονται το ίδιο instance (χρήσιμο για I/O-bound tasks όπως κλήσεις σε OpenAI/DB), μειώνοντας cold starts.
  - **Cost model**: χρέωση βάσει **Active CPU time** (μόνο ενεργός υπολογισμός, όχι αναμονή I/O) + **provisioned memory time**, αντί για flat GB-seconds ανά invocation.
  - Αυτόματο cross-region/AZ failover, bytecode caching για ταχύτερα cold starts.
- Πρακτική σημείωση: το default 300s duration αρκεί για τα περισσότερα API routes· PDF generation (`@react-pdf/renderer`) ή chatbot/embeddings routes ίσως χρειαστούν `maxDuration` ρύθμιση αν πλησιάζουν το όριο — υπάρχει άνεση έως 800s στο Pro χωρίς beta flags.

## 4. Supabase backups / PITR

([supabase.com/docs/guides/platform/backups](https://supabase.com/docs/guides/platform/backups), [supabase.com/pricing](https://supabase.com/pricing)):

| Plan | Daily backups | Retention | PITR |
|---|---|---|---|
| Free | **Όχι αυτόματα backups** — χρειάζεται χειροκίνητο `supabase db dump` | — | Δεν διατίθεται |
| Pro | Ναι | 7 ημέρες | Add-on επί πληρωμή |
| Team | Ναι | 14 ημέρες | Add-on |
| Enterprise | Ναι | 30 ημέρες | Add-on |

- **PITR** (Point-in-Time Recovery) απαιτεί τουλάχιστον **Small compute instance** ($15/μήνα) και αντικαθιστά ουσιαστικά τα daily backups (RPO ~2 λεπτά μέσω WAL archiving) ([supabase.com/docs/guides/platform/backups](https://supabase.com/docs/guides/platform/backups)).
- Τιμολόγηση PITR: **~$100/μήνα για 7 ημέρες retention**, ~$200/μήνα για 14, ~$400/μήνα για 28 ([supabase.com/pricing](https://supabase.com/pricing)).
- Καμία ένδειξη περιορισμού ειδικά για `eu-west-1` — τα backups/PITR είναι per-plan, ανεξάρτητα region.
- Ρεαλιστικό για μικρή εταιρεία: **Pro plan με τα default daily backups (7 ημέρες)** αρκεί αρχικά· PITR να μπει μόνο αν το RPO των 24 ωρών θεωρηθεί ανεπαρκές (π.χ. μετά από growth σε invoices/contracts data).

## 5. Supabase Auth emails — rate limits & custom SMTP

([supabase.com/docs/guides/auth/rate-limits](https://supabase.com/docs/guides/auth/rate-limits), [supabase.com/docs/guides/auth/auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp)):

- Default (built-in Supabase email provider, όλα τα plans): **2 emails/ώρα** — πρακτικά αδύνατο για production χρήση πέραν του πρώτου test.
- Με **custom SMTP**: αρχικό όριο **30 emails/ώρα** (χαμηλό εσκεμμένα για προστασία reputation ενός νέου SMTP setup), ρυθμιζόμενο μετά από το Authentication → Rate Limits του dashboard.
- Το πλάνο (Free/Pro) δεν αλλάζει το default rate limit αυτό καθαυτό — το όριο εξαρτάται από το αν έχει οριστεί custom SMTP, όχι από το billing plan.
- **Resend υποστηρίζεται επίσημα ως SMTP provider** για Supabase Auth, με ρητή τεκμηρίωση integration ([resend.com/docs/send-with-supabase-smtp](https://resend.com/docs/send-with-supabase-smtp), linked από τα Supabase docs) — δεδομένου ότι το Resend είναι ήδη στη στοίβα για τα δικά μας transactional emails, είναι λογικό να χρησιμοποιηθεί το ίδιο Resend domain/API key ως custom SMTP για τα Auth emails (confirm/reset/magic link), αντί του default 2/ώρα provider.
- Σύσταση: **custom SMTP μέσω Resend υποχρεωτικό από την αρχή** — το default όριο των 2/ώρα είναι μη λειτουργικό ακόμα και για μικρή ομάδα με πελάτες.

## 6. Supabase Storage limits

([supabase.com/docs/guides/storage/uploads/file-limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [supabase.com/pricing](https://supabase.com/pricing)):

| | Free | Pro |
|---|---|---|
| File storage (included) | 1 GB | 100 GB (μετά $0.0213/GB) |
| Μέγιστο μέγεθος αρχείου (global limit) | 50 MB | έως **500 GB** (configurable) |
| Egress (uncached) | 5 GB | 250 GB (μετά $0.09/GB) |
| Egress (cached) | 5 GB | 250 GB (μετά $0.03/GB) |

- Το global file size limit ρυθμίζεται στο Storage Settings· μπορεί να μπει και πιο αυστηρό per-bucket όριο. Άνω των 500GB per file χρειάζεται Enterprise.
- Για βίντεο production εταιρεία, το 100GB Pro storage είναι πιθανό να καλυφθεί γρήγορα αν αποθηκεύονται media assets εντός Supabase (αν και η στοίβα φαίνεται να χρησιμοποιεί κυρίως Google Drive links για deliverables — βλ. project convention "Employee deliverables = Drive link only" — άρα η πραγματική χρήση Storage πιθανώς είναι μικρή, μόνο PDFs/contracts/avatars).

## 7. Supabase Realtime limits

([supabase.com/docs/guides/realtime/limits](https://supabase.com/docs/guides/realtime/limits)):

| | Free | Pro (default spend cap) | Pro (χωρίς spend cap) |
|---|---|---|---|
| Peak concurrent connections | 200 | 500 | έως 10.000 |
| Μηνύματα/δευτερόλεπτο | 100 | 500 | 2.500+ |
| Channel joins/δευτερόλεπτο | 100 | 500 | 2.500+ |
| Κανάλια ανά σύνδεση | 100 | 100 | 100+ |
| Presence msgs/δευτ | 20 | — | 1.000+ |
| Broadcast payload | 256 KB | — | 3.000+ KB |
| Postgres change payload | 1.024 KB (όλα τα plans) | | |

- Για μικρή εταιρεία με realtime messages/notifications (DMS χρησιμοποιεί Realtime για messages/notifications), το Free (200 connections) πιθανόν αρκεί σε dev, αλλά **σε production με Pro (500 connections default)** δίνει αρκετό περιθώριο· αν χρειαστεί πάνω, αφαιρείται το spend cap για να ξεκλειδωθούν τα ανώτερα όρια χωρίς αλλαγή plan.

## 8. Supabase pgvector

([supabase.com/docs/guides/database/extensions/pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)):

- Ενεργοποίηση: Dashboard → Database → Extensions → αναζήτηση "vector" → enable, ή SQL: `create extension vector with schema extensions;`.
- Η επίσημη τεκμηρίωση **δεν αναφέρει κανέναν περιορισμό ανά plan** — το pgvector είναι διαθέσιμο extension σε Postgres, άρα λειτουργεί ήδη στο Free plan εξίσου με το Pro.
- Δεν δίνεται ρητή καθοδήγηση compute sizing στο συγκεκριμένο doc. Πρακτικά (γνωστό από τη γενική βιβλιογραφία pgvector/Postgres, όχι επίσημη πηγή εδώ): η απόδοση HNSW/IVFFlat indexes εξαρτάται από τη RAM/compute tier — στο Free/Micro compute (shared CPU, 500MB-1GB RAM) η αναζήτηση θα είναι αργότερη σε μεγάλο dataset embeddings· αν το chatbot knowledge base μεγαλώσει σημαντικά (χιλιάδες chunks), σύσταση να αναβαθμιστεί σε **Small compute ($15/μήνα)** για να έχει αρκετή RAM ώστε το vector index να χωράει σε μνήμη.
- Καμία ένδειξη ότι το `eu-west-1` επηρεάζει τη διαθεσιμότητα του pgvector.

## 9. Preview environments — Supabase Branching + Vercel integration

([supabase.com/docs/guides/deployment/branching/integrations](https://supabase.com/docs/guides/deployment/branching/integrations)):

- Το branching integration απαιτεί: (α) το **Vercel GitHub integration** ενεργό, (β) το **Supabase project συνδεδεμένο με το Vercel project** μέσω του official Vercel↔Supabase integration στο marketplace/dashboard.
- Λειτουργία: όταν ανοίγει PR, το Supabase δημιουργεί preview branch (schema/migrations/seed) και **αυτόματα ενημερώνει τα environment variables του αντίστοιχου Vercel preview deployment** ώστε να δείχνουν στο σωστό preview branch της βάσης.
- Η τεκμηρίωση που ανακτήθηκε δεν ανέφερε ρητά ελάχιστο **paid plan requirement** για το branching feature το ίδιο· ωστόσο είναι ευρέως γνωστό (και συνεπές με τη γενική τιμολόγηση Supabase, χρειάζεται επιβεβαίωση απευθείας στο pricing page πριν την υλοποίηση) ότι το **Branching είναι Pro-plan-and-above feature** με χρέωση ανά preview branch (μικρό compute instance per branch). Επειδή αυτό δεν επιβεβαιώθηκε με απόλυτη βεβαιότητα από το συγκεκριμένο fetch, **να ελεγχθεί ρητά στο [supabase.com/docs/guides/deployment/branching](https://supabase.com/docs/guides/deployment/branching) πριν αποφασιστεί προϋπολογισμός** — υπάρχει σημείωση ασάφειας εδώ.
- Πιθανό race condition: το Supabase προσπαθεί να ξανά-κάνει redeploy το πιο πρόσφατο preview deployment ώστε να πιάσει τα σωστά env vars, λόγω timing ανάμεσα σε Supabase branch creation και Vercel deployment trigger.

## 10. Μηνιαίο κόστος — εκτίμηση

([supabase.com/pricing](https://supabase.com/pricing), Vercel pricing fetch):

**Supabase:**
| | Free | Pro |
|---|---|---|
| Βάση | $0 | $25/μήνα |
| Compute credit | — | $10/μήνα credit (καλύπτει 1x Micro instance) |
| DB size included | 500MB | 8GB (μετά $0.125/GB) |
| Storage included | 1GB | 100GB |
| Egress included | 5GB+5GB cached | 250GB+250GB cached |
| MAU included | 50.000 | 100.000 |
| Backups | όχι | 7 ημέρες daily |
| Περιορισμός | pause μετά 1 εβδομάδα αδράνειας, 2 active projects | καμία παύση |

**Vercel Pro:** βάση **$20/μήνα ανά seat** (developer), με $20 included usage credit· περιλαμβάνει 1M function invocations, 1TB data transfer/μήνα, 10M edge requests/μήνα ([vercel.com/pricing](https://vercel.com/pricing) — τιμή να επιβεβαιωθεί ξανά στο checkout γιατί οι σελίδες pricing αλλάζουν συχνά).

**Εκτιμώμενο μηνιαίο baseline (1 developer seat, χωρίς PITR add-on):**
- Vercel Pro: ~$20/μήνα
- Supabase Pro: ~$25/μήνα (βασικό) — πιθανές μικρές υπερβάσεις σε storage/egress ανάλογα με όγκο
- **Σύνολο πυρήνα υποδομής: ~$45–60/μήνα**, εκτός Stripe fees, Resend, OpenAI usage-based κόστη, και οποιοδήποτε PITR add-on (~$100/μήνα αν προστεθεί).

---

## Προτεινόμενο baseline setup

1. **Vercel region**: ρύθμισε explicit `"regions": ["dub1"]` στο `vercel.json` (ή μέσω dashboard Function Regions) — Dublin, colocated με το Supabase `eu-west-1`. Επιβεβαίωσε στο dashboard μετά το πρώτο deploy ότι το Pro plan όντως δέχεται το region (μονό region, οπότε ασφαλές ανεξαρτήτως αν το πραγματικό cap είναι 3 ή 5).
2. **Vercel Cron**: μετέφερε **όλα τα cron jobs μέσα στο Vercel** (native `vercel.json` crons) — το Pro επιτρέπει ανά-λεπτό συχνότητα και 100 cron jobs/project, αρκετό για τα 2 υπάρχοντα crons (μηνιαίο filming reminder, ημερήσιο holiday greeting). **Το cron-job.org δεν χρειάζεται πλέον** ως workaround· μπορεί να κρατηθεί προαιρετικά μόνο ως εξωτερικό health-check/alerting αν θέλουμε redundancy, όχι ως ανάγκη πλατφόρμας.
3. **Vercel plan settings**: Fluid Compute είναι ήδη default-on· άφησέ το ενεργό. Θέσε `maxDuration` ρητά σε routes με βαρύ φόρτο (PDF generation, chatbot/embeddings) αν πλησιάζουν τα 300s default, εκμεταλλευόμενοι το όριο των 800s χωρίς beta flags.
4. **Supabase plan**: ξεκίνα με **Pro plan** εξαρχής (όχι Free) — το Free δεν έχει αυτόματα backups και pause μετά από 1 εβδομάδα αδράνειας είναι μη αποδεκτό για production. PITR add-on **να μην μπει αρχικά** (τα 7ήμερα daily backups του Pro αρκούν)· επανεκτίμηση αν/όταν ο όγκος δεδομένων invoices/contracts μεγαλώσει σημαντικά.
5. **Custom SMTP**: **ρύθμισε custom SMTP μέσω Resend από την πρώτη μέρα** στο Supabase Auth (Authentication → SMTP Settings), χρησιμοποιώντας το ίδιο Resend account/domain που ήδη χρησιμοποιείται για τα transactional emails της εφαρμογής. Άνοιξε το rate limit πέρα από το default 30/ώρα ανάλογα με τον αναμενόμενο ρυθμό εγγραφών.
6. **Storage**: κράτα το global file size limit συντηρητικό (π.χ. λίγα δεκάδες MB) εφόσον τα deliverables παραμένουν Drive-link-only (υπάρχουσα σύμβαση) — το Storage bucket χρησιμοποιείται κυρίως για PDFs/avatars/contracts, όχι βαριά media.
7. **Realtime**: Pro plan default (500 concurrent connections) αρκεί αρχικά για messages/notifications· αν χρειαστεί scale, αφαίρεσε το spend cap αντί να αλλάξεις plan.
8. **pgvector**: ενεργοποίησε με `create extension vector;` στο αρχικό migration set — δεν χρειάζεται ειδικό plan. Ξεκίνα με Micro compute (περιλαμβάνεται στο Pro credit)· αναβάθμισε σε Small compute αν το chatbot knowledge base μεγαλώσει αισθητά ή η αναζήτηση γίνει αργή.
9. **Preview environments**: ενεργοποίησε το official Vercel↔Supabase integration (μέσω Vercel Integrations marketplace) και βεβαιώσου ότι το Vercel GitHub integration είναι ενεργό, ώστε κάθε PR preview να παίρνει αυτόματα σωστό Supabase preview branch schema. **Πριν προϋπολογιστεί**, επιβεβαίωσε ρητά στο [supabase.com/docs/guides/deployment/branching](https://supabase.com/docs/guides/deployment/branching) αν το Branching χρεώνεται ξεχωριστά per-branch πέραν του Pro plan base — δεν επιβεβαιώθηκε με απόλυτη σιγουριά σε αυτόν τον έλεγχο.
10. **Προϋπολογισμός πυρήνα**: προγραμμάτισε ~$45-60/μήνα (Vercel Pro seat + Supabase Pro base), με ρητό buffer για usage-based overages (storage/egress/MAU) και πιθανό μελλοντικό PITR (+$100/μήνα) αν χρειαστεί αυστηρότερο RPO.

## Περιορισμοί σχεδιασμού

- Explicit `regions: ["dub1"]` είναι **υποχρεωτικό** στο νέο repo config — να μην αφεθεί στο default `iad1`, αλλιώς επαναλαμβάνεται το πρόβλημα λανθάνοντος latency του παλιού setup.
- Function `maxDuration` για routes βαριάς επεξεργασίας (PDF, embeddings, chatbot) πρέπει να οριστεί ρητά αν ξεπερνά τα 300s — default όριο 300s παραμένει ακόμη και στο Pro αν δεν οριστεί ρητά μεγαλύτερο (μέχρι 800s χωρίς beta config, 1800s μόνο με beta function-level config).
- Το Vercel request/response body cap **4.5MB** παραμένει σταθερό στο Pro — οποιοδήποτε PDF/upload endpoint που μπορεί να ξεπεράσει αυτό το μέγεθος χρειάζεται εναλλακτικό μονοπάτι (π.χ. direct-to-storage upload, όχι μέσω function body).
- Custom SMTP μέσω Resend είναι **προαπαιτούμενο**, όχι προαιρετικό — χωρίς αυτό, το default Supabase Auth email rate limit (2/ώρα) κάνει την εγγραφή/reset password μη λειτουργικά σε production.
- Free Supabase plan **αποκλείεται** για production λόγω απουσίας αυτόματων backups και του κινδύνου αυτόματης παύσης μετά από 1 εβδομάδα αδράνειας — πρέπει να είναι Pro εξαρχής.
- Αν χρησιμοποιηθεί Supabase Branching για preview environments, χρειάζεται ρητή επιβεβαίωση κόστους/plan πριν committaριστεί ο σχεδιασμός preview workflow στο CI/CD — δεν είναι πλήρως τεκμηριωμένο εδώ.
- Η ασυνέπεια στα επίσημα Vercel docs για το πλήθος regions στο Pro (3 vs 5) δεν επηρεάζει τον σχεδιασμό εφόσον χρησιμοποιείται μόνο 1 region, αλλά αν αργότερα χρειαστεί multi-region deployment, να επιβεβαιωθεί το πραγματικό όριο απευθείας στο dashboard πριν τον σχεδιασμό.
