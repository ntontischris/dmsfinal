# Φόρμα ενδιαφέροντος της Ιστοσελίδας

`POST /api/forms/interest` — δημόσιο endpoint (χωρίς σύνδεση) για τη φόρμα «Θέλω να μιλήσουμε» της Ιστοσελίδας.
Κάθε σωστή υποβολή γίνεται **Ευκαιρία με Πηγή «Ιστοσελίδα»**, σε υπάρχοντα ή νέο Πελάτη.

## Αίτημα

`Content-Type: application/json` ή κλασική φόρμα (`application/x-www-form-urlencoded`, `multipart/form-data`).

| Πεδίο | Υποχρεωτικό | Όριο | Σημείωση |
|---|---|---|---|
| `contact_name` | ναι | 120 | Όνομα του ανθρώπου |
| `contact_email` | ναι | 200 | Έγκυρο email· γίνεται πεζά |
| `name` | όχι | 120 | Επωνυμία· αν λείπει, παίρνει το `contact_name` |
| `contact_phone` | όχι | 40 | |
| `message` | όχι | 2000 | Τα πρώτα 300 γράμματα μπαίνουν στο «Επόμενο βήμα» |
| `website` | — | — | **Honeypot**: κρυφό πεδίο, πρέπει να μένει κενό |

Το `website` το κρύβετε στη σελίδα (π.χ. `position:absolute; left:-9999px`, `tabindex="-1"`, `autocomplete="off"`).
Αν έρθει γεμάτο, η απάντηση είναι `200 ok` αλλά **δεν καταχωρείται τίποτα**.

## Απάντηση

| HTTP | Σώμα | Τι σημαίνει |
|---|---|---|
| 200 | `{ "ok": true, "status": "ok" }` | Καταχωρήθηκε |
| 400 | `{ "ok": false, "status": "invalid", "field": "contact_email" }` | Λάθος ή κενό πεδίο (`field` όταν είναι γνωστό) |
| 429 | `{ "ok": false, "status": "rate_limited" }` | Πολλές υποβολές· ξαναδοκιμάστε αργότερα |
| 503 | `{ "ok": false, "status": "error" }` | Η βάση δεν απάντησε |

## Τι γίνεται μέσα

1. Έλεγχος με Zod και honeypot (`src/modules/sales/web-form.ts`).
2. Η βάση (`public.sales_web_form`, ανώνυμη, security definer, χωρίς service role):
   - **όριο ρυθμού**: 3 υποβολές ανά 10′ και 10 την ημέρα ανά διεύθυνση IP, 60 την ώρα συνολικά. Η διεύθυνση κρατιέται μόνο ως hash, για 2 ημέρες·
   - ξαναελέγχει όνομα και email·
   - καλεί την υπάρχουσα είσοδο `sales_intake_form`: ίδιο email/ΑΦΜ/τηλέφωνο → στον υπάρχοντα Πελάτη και τον Υπεύθυνό του· αλλιώς νέος Πελάτης (με σήμα «Πιθανό διπλό» αν μοιάζει) και Υπεύθυνος κατά τη ρύθμιση **Ρυθμίσεις › Πωλήσεις › «Νέες Ευκαιρίες από τη φόρμα πάνε σε»** (Ιδιοκτήτης / συγκεκριμένος Χρήστης / ουρά «Χωρίς υπεύθυνο»).
3. Το γεγονός `opportunity.form_submitted` βγαίνει από τον trigger της νέας Ευκαιρίας (ειδοποιήσεις/αυτοματισμοί) — το endpoint δεν στέλνει τίποτα μόνο του.

## Παράδειγμα

```html
<form method="post" action="/api/forms/interest">
  <input name="contact_name" required maxlength="120" />
  <input name="contact_email" type="email" required maxlength="200" />
  <input name="name" maxlength="120" />
  <input name="contact_phone" maxlength="40" />
  <textarea name="message" maxlength="2000"></textarea>
  <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true" />
  <button>Αποστολή</button>
</form>
```

Το endpoint είναι στο ίδιο domain με την εφαρμογή· δεν δίνει CORS για άλλα domains.
