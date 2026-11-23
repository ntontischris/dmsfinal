# «Σήμερα» ως λίστα που αδειάζει — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Η Σήμερα της ομάδας γίνεται μία λίστα σε 7 σταθερές ομάδες με κίνηση + «Αργότερα» ανά γραμμή, γραμμή κορυφής, «Έκλεισες N», και 7 νέες κάρτες.

**Architecture:** Οι κάρτες φορτώνονται όπως σήμερα (`loadCards` → `Built[]`). Μια νέα καθαρή συνάρτηση (`a1-list.ts`) τις αντιστοιχίζει σε ομάδες και ταξινομεί τις γραμμές· ένα νέο server component (`a1-list-view.tsx`) τις ζωγραφίζει και αντικαθιστά τις ζώνες στο `TeamBriefing`. Η βάση αλλάζει μόνο σε τρία σημεία: όριο γραμμών 3→10, «αρχή της μέρας» για το «Έκλεισες», και οι 7 νέες κάρτες (μητρώο `today_cards` + `authz.today_count_<code>` / `authz.today_items_<code>`).

**Tech Stack:** Next.js 16 App Router (Server Components), Supabase Postgres + pgTAP, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-simera-list-design.md`

## Global Constraints

- Εργασία στο worktree `C:\Users\ntont\Desktop\devre\dmsfinal-rooms`, κλάδος `feat/rooms-map`, εφαρμογή στο `app/`.
- Ελέγχοι πριν από κάθε commit: `npx tsc --noEmit -p .`, `npx eslint src/modules/today/`, `node scripts/check-design.mjs`, `npx vitest run src/modules/today`.
- pgTAP τρέχει μόνο στο CI (καμία τοπική βάση/server). Κάθε migration έχει δικό της test στο `supabase/tests/`.
- Migrations με όνομα ημερομηνίας μετά το `20261114160300`· π.χ. `20261123100000_…`. Νέα συνάρτηση κάρτας = ακριβώς το σχήμα `authz.today_count_<code>(p_uid uuid, p_client uuid, p_now timestamptz) returns int` και `authz.today_items_<code>(…) returns jsonb` (βλ. κεφαλίδα `20261016100000_today.sql`), καταχωρημένη στο `today_cards` όπως οι υπάρχουσες.
- Κάθε ορατό κείμενο στα Ελληνικά· «Έκδοση», ποτέ «Εκδοχή». Χωρίς hex/rgb. Κόκκινο μόνο σε CTA/κουκκίδα επείγοντος.
- Κανένα επινοημένο δεδομένο: ό,τι δεν δίνει η βάση δεν φαίνεται (π.χ. «~Χ ώρες» παραλείπεται — δεν υπάρχει εκτίμηση ωρών στις εργασίες/Παραδοτέα).
- Δικαιώματα: η λίστα δείχνει μόνο κάρτες που ήδη επιστρέφει το `today_counts` για τον Χρήστη· καμία παράκαμψη.
- Commits: conventional, με τα trailers της συνεδρίας. Push με `gh auth git-credential` (βλ. ledger).

## Review Focus

1. Μια γραμμή που εμφανίζεται σε δύο κάρτες (ίδιο αίτημα σε δύο κάρτες απόφασης) → φαίνεται μία φορά (`withoutRepeats` πριν την ομαδοποίηση). Test στην Task 1.
2. Κάρτα που απέτυχε να φορτώσει → μένει στη θέση της ομάδας της ως γραμμή «Ξαναδοκίμασε», δεν εξαφανίζεται σιωπηλά. Test στην Task 1.
3. Χρήστης χωρίς «Βλέπει ποσά» → καμία ομάδα «Χρήματα» και κανένα ποσό στη γραμμή κορυφής. Test στην Task 3.
4. Όλα «Αργότερα» → η λίστα δείχνει το «Έκλεισες» και «N ξαναβγαίνουν», όχι «Όλα καθαρά» χωρίς λόγο. Test στην Task 4.
5. Κάρτα με count > γραμμές (πάνω από 10) → γραμμή «και άλλα N» προς τη λίστα της κάρτας. Test στην Task 1.

---

### Task 1: Ομαδοποίηση και σειρά (καθαρή λογική)

**Files:**
- Create: `app/src/modules/today/spaces/a1-list.ts`
- Test: `app/src/modules/today/spaces/a1-list.test.ts`

**Interfaces:**
- Consumes: `Built` (`a1-adapter.ts`), `CardRow` (`a1-model.ts`), `itemKeyOf` (`a1-later.ts`).
- Produces:
  - `type TodayGroupId = "time" | "client" | "mine" | "externals" | "money" | "keep" | "company"`
  - `const GROUPS: readonly { id: TodayGroupId; title: string }[]` — με τη σειρά και τους τίτλους: «Σήμερα με ώρα», «Ο Πελάτης περιμένει», «Η δουλειά μου σήμερα», «Περιμένω από εξωτερικούς», «Χρήματα», «Κράτα τον Πελάτη», «Η εταιρεία δουλεύει».
  - `const GROUP_OF: Readonly<Record<string, TodayGroupId>>` — code→ομάδα ακριβώς όπως ο πίνακας της spec (21 υπάρχουσες κάρτες). Άγνωστος code → `"company"`.
  - `interface ListLine { cardId: string; row: CardRow; laterKey: string | null }`
  - `interface ListGroup { id: TodayGroupId; title: string; lines: readonly ListLine[]; more: { count: number; href: string }[]; failed: readonly string[] }`
  - `function listOf(input: { built: readonly Built[]; failed: ReadonlySet<string>; stamp: string }): readonly ListGroup[]`
  - `function remainingOf(groups: readonly ListGroup[]): number`

- [ ] **Step 1: Write failing tests** (`describe("listOf")`, factory `builtOf(code, rows, count?)`):
  - `should put each card in its group in the fixed group order` — `[overdue_invoices, unread_messages]` → ομάδες `["client","money"]`.
  - `should keep the user's card order inside a group` — `[versions_to_review, unread_messages]` → γραμμές της «client» με αυτή τη σειρά καρτών όταν καμία δεν είναι επείγουσα.
  - `should order urgent first, then oldest waitingSince/at, then largest amount` μέσα σε ομάδα.
  - `should keep only today and tomorrow in week_filming and drop pending-approval rows` — γραμμές με `at` σε 3 μέρες ή `note: "αναμένει έγκριση"` λείπουν (`stamp` "2026-11-25T09:00").
  - `should hide group company unless a line is urgent`.
  - `should show a card that failed as a failed entry of its group`.
  - `should add a "more" link when count exceeds loaded rows` — count 34, 10 γραμμές → `more: [{ count: 24, href }]`.
  - `should drop empty groups`.
  - `describe("remainingOf")`: `should count lines of all shown groups plus the more counts`.
- [ ] **Step 2:** `npx vitest run src/modules/today/spaces/a1-list.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Υλοποίηση. Η σειρά της ομάδας: stable sort με κλειδιά `(isUrgent desc, waitingSince ?? at asc, amountCents desc)`· η σταθερότητα κρατά τη σειρά καρτών του Χρήστη. `health`/`readiness` δίνουν μία γραμμή σύνοψης η καθεμία (`laterKey: null`, label «Κάτι δεν λειτουργεί» / «Μένουν N βήματα ρύθμισης», href `allHref`).
- [ ] **Step 4:** ίδια εντολή → PASS.
- [ ] **Step 5:** commit `feat(today): group the day's cards into seven ordered groups`.

### Task 2: Όριο γραμμών 3 → 10

**Files:**
- Create: `app/supabase/migrations/20261123100000_today_rows_10.sql`
- Test: `app/supabase/tests/today_rows_10_test.sql`

- [ ] **Step 1:** Για κάθε `authz.today_items_<code>` με `limit 3`, βρες τον **τελευταίο** ορισμό του (`grep -n "function authz.today_items_<code>" supabase/migrations/*.sql`, μεγαλύτερο όνομα αρχείου κερδίζει· π.χ. `filming_approvals` → `20261110100000_today_move_suggest.sql`). Λίστα: client_allowance, client_filming, client_requests, client_waiting, cost_hours, filming_approvals, gdpr, google_deletions, health, overdue_invoices, proposal_approvals, readiness, rounds_over_limit, to_invoice, unassigned, unread_messages, week_filming, και όποια κάρτα δουλειάς (`20261016120000_today_work.sql`) έχει όριο. Ο τοπ-3 «οφειλέτες» του `today_money` **μένει** 3 (είναι πάνελ, όχι λίστα).
- [ ] **Step 2:** Γράψε το pgTAP test πρώτα: σπέρνει 12 ληξιπρόθεσμα τιμολόγια ως Ιδιοκτήτης (όπως `today_money_test.sql`) και `is(jsonb_array_length(today_card('overdue_invoices')->'items'), 10)`· ένα δεύτερο για `unassigned` με 12 → 10. Ακολουθεί το checklist: denial test (Πελάτης δεν παίρνει την κάρτα), δεν διαβάζει κλειστούς πίνακες.
- [ ] **Step 3:** Η migration: `create or replace` κάθε συνάρτησης με αυτούσιο τον τελευταίο ορισμό και `limit 10` στη θέση του `limit 3`. Κανένα άλλο diff (έλεγχος: `diff` του σώματος με το αρχικό δείχνει μόνο τον αριθμό).
- [ ] **Step 4:** push σε draft PR → CI `pgTAP` πράσινο.
- [ ] **Step 5:** commit `feat(today): load up to ten rows per card`.

### Task 3: Η λίστα στην οθόνη + γραμμή κορυφής

**Files:**
- Create: `app/src/modules/today/spaces/a1-list-view.tsx`, `app/src/modules/today/spaces/a1-topline.ts`, `app/src/modules/today/spaces/a1-topline.test.ts`
- Modify: `app/src/modules/today/spaces/a1-briefing.tsx` (το JSX από `<div className="a1-top">` ως `<OthersFold …/>`), `app/src/modules/today/spaces/a1.css`

**Interfaces:**
- Consumes: `listOf`, `remainingOf`, `ListGroup` (Task 1); `withoutLater`, `itemKeyOf` (`a1-later.ts`); τα πάνελ `MoneyBrief`, `TeamBrief`, `ProgrammePanel`, `KpiBrief`.
- Produces: `function toplineOf(input: { remaining: number; overdueCents: number | null; toInvoiceCents: number | null; canSeeAmounts: boolean }): string` — π.χ. `"Μένουν 7 · 1.840 € να μπουν"`, `"Μένουν 7"` χωρίς ποσά, `"Δεν μένει τίποτα"` στο 0.

- [ ] **Step 1:** Tests `toplineOf`: `should join remaining and money`, `should omit money without the amounts permission`, `should omit money when both sums are null or zero`, `should say nothing is left at zero`.
- [ ] **Step 2:** `npx vitest run src/modules/today/spaces/a1-topline.test.ts` → FAIL.
- [ ] **Step 3:** Υλοποίησε `toplineOf` (ποσό με `formatCents`). `canSeeAmounts` = το `today_money` επέστρεψε δεδομένα (`money !== null`). `toInvoiceCents` = άθροισμα `amountCents` των γραμμών `to_invoice`.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** `a1-list-view.tsx`: `<details className="a1-topline">` με `<summary>` το `toplineOf(...)` και μέσα (κλειστά) KPIs/Χρήματα/Ομάδα/Πρόγραμμα όπως ζωγραφίζονται σήμερα. Κάτω, για κάθε `ListGroup`: τίτλος + γραμμές στο λεξιλόγιο `ml-line`· κάθε γραμμή = label, meta, κουμπί κίνησης (σύνδεσμος `row.href`, κείμενο από `ACTION_LABEL[cardId]` στο ίδιο αρχείο, προεπιλογή «Άνοιξε»), και το υπάρχον κουμπί «Αργότερα» (`a1-later-buttons.tsx`) όταν `laterKey`. Η αποτυχημένη κάρτα → `CardError` στη θέση της ομάδας. Τα `withoutLater` και «Νέο» (newChip) εφαρμόζονται σε όλες τις κάρτες, όχι μόνο στις αποφάσεις.
- [ ] **Step 6:** Αντικατέστησε στο `TeamBriefing` τις ζώνες με `<TodayList …/>`. Ό,τι γίνεται ορφανό από αυτή την αλλαγή (`DecisionsPanel`, `OthersFold`, `rankDecisions`, `a1-zones` αν δεν χρησιμοποιείται αλλού, και τα css τους) σβήνεται **μόνο** αν `grep -rn` δείξει μηδέν χρήσεις.
- [ ] **Step 7:** Όλοι οι έλεγχοι των Global Constraints πράσινοι. Push → Vercel preview `…/app` δείχνει τις ομάδες· έλεγχος με Χρήστη χωρίς «Βλέπει ποσά» (demo Ρόλος υπαλλήλου) ότι δεν υπάρχει ομάδα «Χρήματα».
- [ ] **Step 8:** commit `feat(today): show the day as one list in seven groups`.

### Task 4: «Έκλεισες N»

**Files:**
- Create: `app/supabase/migrations/20261123110000_today_day_start.sql`, `app/supabase/tests/today_day_start_test.sql`, `app/src/modules/today/spaces/a1-closed.ts`, `app/src/modules/today/spaces/a1-closed.test.ts`
- Modify: `app/src/modules/today/queries.ts` (`getTodayVisit`), `app/src/modules/today/view-schema.ts`, `a1-list-view.tsx`

**Interfaces:**
- Produces:
  - Πίνακας `public.today_day_start(user_id uuid, day date, keys text[], primary key (user_id, day))`, RLS: μόνο ο ίδιος.
  - RPC `public.today_day_start(p_keys text[]) returns text[]` — αν δεν υπάρχει γραμμή για (auth.uid(), σήμερα Αθήνα) την γράφει με `p_keys` και επιστρέφει `p_keys`· αλλιώς επιστρέφει τα αποθηκευμένα χωρίς αλλαγή.
  - `function closedOf(input: { startKeys: readonly string[]; nowKeys: ReadonlySet<string>; snoozed: ReadonlySet<string> }): { closed: number; later: number }` — closed = startKeys που δεν είναι ούτε τώρα ούτε στο snoozed· later = startKeys στο snoozed.

- [ ] **Step 1:** pgTAP: πρώτη κλήση γράφει, δεύτερη επιστρέφει τα πρώτα κλειδιά, άλλος Χρήστης δεν βλέπει τη γραμμή (denial).
- [ ] **Step 2:** Vitest `closedOf`: `should count rows gone since the morning as closed`, `should not count snoozed rows as closed`, `should ignore rows that appeared after the morning`.
- [ ] **Step 3:** FAIL → υλοποίηση → PASS (vitest τοπικά, pgTAP στο CI).
- [ ] **Step 4:** Στη λίστα: όταν `remainingOf === 0` → «Έκλεισες N σήμερα» + (αν later > 0) «M ξαναβγαίνουν αύριο το πρωί». Όταν η λίστα έχει γραμμές και closed > 0 → μικρό «Έκλεισες N» δίπλα στη γραμμή κορυφής.
- [ ] **Step 5:** commit `feat(today): tell how many lines were closed today`.

### Tasks 5–11: Οι 7 νέες κάρτες (μία ανά task, αυτή τη σειρά)

Κάθε task ίδιο σχήμα: migration `20261123<1N>0000_today_card_<code>.sql` (γραμμή στο `today_cards` με `audience 'team'`, το σωστό `grp` της βάσης, Δικαίωμα όπως οι συγγενικές κάρτες· `authz.today_count_<code>` + `authz.today_items_<code>` με `limit 10`, `urgent`, `link`) → pgTAP (θετικό, αρνητικό/άλλος Ρόλος, όριο του κατωφλιού) → γραμμή στο `GROUP_OF` + test στο `a1-list.test.ts` → έλεγχοι → commit `feat(today): add the <τίτλος> card`.

| Task | code | Ομάδα (`GROUP_OF`) | Ορισμός (σταθερές με σχόλιο στο RPC) | link |
|---|---|---|---|---|
| 5 | `crew_declined` — «Βρες αντικαταστάτη» | externals | `filming_crew.response = 'declined'` σε Γύρισμα με `starts_at > now`· urgent αν σε ≤ 2 μέρες | `/app/filming/<id>` |
| 6 | `crew_silent` — «Δεν απάντησε» | externals | `response is null` και `added_at < now - interval '24 hours'`, Γύρισμα μελλοντικό | `/app/filming/<id>` |
| 7 | `version_late` — «Αργεί η Έκδοση» | externals | Παραδοτέο με υπεύθυνο ≠ τρέχων Χρήστης, προθεσμία ≤ αύριο, χωρίς Έκδοση μετά την ανάθεση | σελίδα Παραδοτέου |
| 8 | `filming_no_script` — «Γύρισμα χωρίς σενάριο» | time | νέα στήλη `filmings.script text` (check όπως `internal_note`), κενή, `starts_at` ≤ now + 3 μέρες. **Περιλαμβάνει** πεδίο «Σενάριο / λήψεις» στη φόρμα/σελίδα του Γυρίσματος (module `filming`, ίδιο μοτίβο με το `internal_note`) | `/app/filming/<id>` |
| 9 | `equipment_repair` — «Κάμερα σε επισκευή» | time | Εξοπλισμός σε κατάσταση επισκευής δεσμευμένος σε Γύρισμα των επόμενων 7 ημερών | Γύρισμα |
| 10 | `agreement_ending` — «Λήγει η Συμφωνία» | keep | `agreements.ends_at` ≤ now + 30 μέρες, ενεργή, χωρίς άλλη Συμφωνία του ίδιου Πελάτη με έναρξη μετά | σελίδα Πελάτη → Συμφωνίες |
| 11 | `agreement_signed` — «Υπογράφηκε» | keep | Συμφωνία υπογεγραμμένη από τον Πελάτη μετά το `previous_seen_at` του `today_seen`, ή τις τελευταίες 3 μέρες αν δεν υπάρχει | Συμφωνία |

Για τις Tasks 5, 7, 9, 11: πριν τη migration, επιβεβαίωσε τα ακριβή ονόματα στηλών/καταστάσεων (`filming_crew.response` τιμές, κατάσταση επισκευής Εξοπλισμού, πεδίο υπογραφής Συμφωνίας, υπεύθυνος/Έκδοση Παραδοτέου) με `grep` στα migrations. Αν μια έννοια δεν υπάρχει στη βάση, **σταμάτα και ρώτα** — καμία νέα έννοια πέρα από τη στήλη `script`.
