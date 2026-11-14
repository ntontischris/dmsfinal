# Inventory — Ιδιοκτήτης

## Sources read
- app/src/app/(app)/app/** + app/src/modules/**/spaces — Σήμερα, Επικοινωνία (explorer today-talk) — 120
- app/src/modules/{clients,sales,catalogue,agreements}/** — Πελάτες — 156
- app/src/modules/{filming,booking,equipment,productions,deliverables}/** — Παραγωγή — 125
- app/src/modules/{invoicing,receipts,expenses,reports,costs}/** — Χρήματα — 91
- app/src/modules/{access,settings,automations,health,audit,knowledge,integrations}/** — Εταιρεία — 173
- 14 διαδρομές που δεν κάλυπτε κανείς (Γνώση, Ρυθμίσεις, Προφίλ, Είσοδος, /p, /u) — 70
- παλιό DMS (devremedia/src/app/admin/**, src/lib/actions/**) — 160 γραμμές, 134 ενώθηκαν με γραμμές της εφαρμογής (source=both, refs), 26 μένουν μόνο παλιές

routes covered: 87/87 · features: 761

## Σήμερα + Επικοινωνία

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| today-page-open | Ανοίγω τη «Σήμερα» και βλέπω μόνο τις κάρτες που μου επιτρέπουν τα Δικαιώματά μου | A1 /app | any-team | both | old-dashboard-view-kpis |
| today-hello-notifications | Ανοίγω τις Ειδοποιήσεις από το σύνδεσμο «N νέες Ειδοποιήσεις →» | A1 /app → A2 /app/notifications | any-team | app | — |
| today-customize-open | Ανοίγω την «Προσαρμογή» της Σήμερα | A1 /app?customize=1 | any-team | app | — |
| today-customize-visibility | Κρύβω ή εμφανίζω κάρτα στην Προσαρμογή (οι κάρτες Υγείας δεν κρύβονται) | A1 /app?customize=1 | any-team | app | — |
| today-customize-reorder | Ανεβάζω ή κατεβάζω κάρτα στη σειρά μου, με «πιο πάνω» / «πιο κάτω» | A1 /app?customize=1 | any-team | app | — |
| today-customize-save | Αποθηκεύω την Προσαρμογή με «Τέλος» (today_prefs_set) | A1 /app?customize=1 | any-team | app | — |
| today-customize-close | Κλείνω την Προσαρμογή χωρίς αποθήκευση με «Κλείσιμο» | A1 /app | any-team | app | — |
| today-customize-reset | Επαναφέρω την προεπιλογή με «Επαναφορά προεπιλογής» (today_prefs_reset) | A1 /app?customize=1 | any-team | app | — |
| today-decision-later | Κρύβω μια απόφαση ως αύριο 08:00 με «Αργότερα» (μόνο για μένα) | A1 /app | any-team | app | — |
| today-decision-undo-later | Ξαναφέρνω τις κρυμμένες αποφάσεις με «Αναίρεση» ή «Αναίρεση όλων» | A1 /app | any-team | app | — |
| today-first-steps-dismiss | Κλείνω την κάρτα «Πρώτα βήματα» με «Κατάλαβα» | A1 /app | any-team | app | — |
| today-flow-queue-resume | Συνεχίζω τον οδηγό από τη γραμμή «Τι πρέπει να κάνω τώρα» | A1 /app | any-team | app | — |
| today-flow-door-filming | Ξεκινώ τον οδηγό «Στήνω γύρισμα» από το «Τι θέλεις να κάνεις;» | A1 /app → B1 /app/clients | any-team | app | — |
| today-team-briefing-view | Βλέπω την ενημέρωση της ομάδας (ρυθμίσεις ομάδας: «Η ομάδα», «Χρήματα», πρόγραμμα) | A1 /app | deliverables.work (all) ή deliverables.review (all) ή clients.manage (all) | app | — |
| today-card-health-open | Ανοίγω την κάρτα «Υγεία συστήματος» και τις αποτυχημένες αποστολές της | A1 /app → K3 /app/settings/sends?tab=failed | health.view | app | — |
| today-card-readiness-open | Ανοίγω την κάρτα «Έλεγχος ετοιμότητας» και τα βήματα της | A1 /app → O7 /app/settings/readiness | settings.manage | app | — |
| today-card-proposal-approvals-open | Ανοίγω τις «Προτάσεις προς έγκριση» | A1 /app → D4 /app/agreements/approvals | agreements.deviate | app | — |
| today-card-filming-approvals-open | Ανοίγω τα «Γυρίσματα προς έγκριση» | A1 /app → E2 /app/filming/queue | filming.approve (all) | app | — |
| today-card-google-deletions-open | Ανοίγω τις «Διαγραφές από το Google» | A1 /app → A7 /app/calendar/google-deletions | calendar.google | app | — |
| today-card-unassigned-open | Ανοίγω τα Πελάτες «Χωρίς υπεύθυνο» | A1 /app → B5 /app/unassigned | clients.transfer | app | — |
| today-card-gdpr-open | Ανοίγω τις «GDPR με προθεσμία» | A1 /app → /app/team/gdpr | owner | app | — |
| today-card-my-deliverables-open | Ανοίγω τα «Παραδοτέα για μένα» | A1 /app → H1 /app/deliverables?view=mine | deliverables.work | app | — |
| today-card-versions-review-open | Ανοίγω τις «Εκδόσεις προς έλεγχο» | A1 /app → H1 /app/deliverables?view=review | deliverables.review | app | — |
| today-card-requests-mentions-open | Ανοίγω τα «Αιτήματα και @αναφορές» | A1 /app → J1 /app/messages?tab=requests | messages.chat | app | — |
| today-card-unread-messages-open | Ανοίγω τα «Αδιάβαστα Μηνύματα» | A1 /app → J1 /app/messages | messages.chat | app | — |
| today-card-next-steps-open | Ανοίγω τα «Επόμενα βήματα που έληξαν» | A1 /app → B3 /app/pipeline?forgotten=1 | clients.manage | app | — |
| today-card-proposals-progress-open | Ανοίγω τις «Προτάσεις σε εξέλιξη» | A1 /app → D1 /app/agreements?view=in_progress | agreements.view ή agreements.draft ή agreements.deviate | app | — |
| today-card-my-tasks-open | Ανοίγω την κάρτα «Οι εργασίες μου» | A1 /app → G4 /app/tasks | any-team | app | — |
| today-card-rounds-over-limit-open | Ανοίγω τους «Γύρους πέρα από το όριο» | A1 /app → H1 /app/deliverables | deliverables.work ή deliverables.review, και finance.amounts (all) | app | — |
| today-card-to-invoice-open | Ανοίγω το «Προς τιμολόγηση» | A1 /app → I1 /app/finance/to-invoice | finance.view και finance.amounts (all) | app | — |
| today-card-overdue-invoices-open | Ανοίγω τα «Ληξιπρόθεσμα Τιμολόγια» | A1 /app → I2 /app/finance/invoices?filter=overdue | finance.view και finance.amounts (all) | app | — |
| today-card-cost-hours-open | Ανοίγω τις «Ώρες και Υπέρβαση κόστους» | A1 /app → G3 /app/productions/costs | finance.cost | app | — |
| today-card-week-filming-open | Ανοίγω τα «Γυρίσματα των επόμενων 7 ημερών» | A1 /app → E1 /app/filming | filming.view | app | — |
| today-card-unanswered-open | Ανοίγω τις «Αναπάντητες ερωτήσεις Βοηθού» | A1 /app → L3 /app/knowledge/unanswered | knowledge.manage (all) | app | — |
| today-programme-slot-open | Ανοίγω Γύρισμα της σημερινής μέρας από το «Πρόγραμμα» | A1 /app → E3 /app/filming/{id} | filming.view | app | — |
| today-programme-week-open | Ανοίγω «Όλη η εβδομάδα →» των Γυρισμάτων | A1 /app → E1 /app/filming?tab=week | filming.view | app | — |
| today-money-panel-view | Βλέπω το panel «Χρήματα» του μήνα (είσπραξη και οφειλές) | A1 /app | finance.view και finance.amounts (all) | both | old-dashboard-view-risk |
| today-money-debtor-open | Ανοίγω την Καρτέλα πελάτη από τη λίστα οφειλετών | A1 /app → I5 /app/finance/ledger | finance.view και finance.amounts (all) | app | — |
| today-money-invoices-open | Ανοίγω «Όλα τα τιμολόγια →» | A1 /app → I2 /app/finance/invoices | finance.view και finance.amounts (all) | app | — |
| today-decision-suggest-slot | Ανοίγω την «Πρότεινε αυτή την ώρα» για μετάθεση Γυρίσματος (μόνο πρόταση) | A1 /app → E3 /app/filming/{id} | any-team | app | — |
| today-notifications-open | Ανοίγω τις Ειδοποιήσεις (Εισερχόμενα) | A2 /app/notifications | any-team | both | old-notifications-view |
| today-notifications-filter-unread | Φιλτράρω τις «Αδιάβαστες» Ειδοποιήσεις | A2 /app/notifications?show=unread | any-team | app | — |
| today-notifications-filter-all | Βλέπω «Όλες» τις Ειδοποιήσεις | A2 /app/notifications?show=all | any-team | app | — |
| today-notifications-mark-all-read | Σημειώνω «Όλες διαβασμένες» | A2 /app/notifications | any-team | both | old-notifications-mark-read |
| today-notifications-open-item | Ανοίγω Ειδοποίηση με «Άνοιγμα» (σημειώνεται διαβασμένη και πάω στο σχετικό) | A2 /app/notifications | any-team | app | — |
| today-notifications-older | Φέρνω τις «Παλαιότερες» Ειδοποιήσεις | A2 /app/notifications?before=… | any-team | app | — |
| today-notifications-prefs-tab | Ανοίγω τις «Προτιμήσεις» των Ειδοποιήσεων | A2 /app/notifications?tab=prefs | any-team | app | — |
| today-notifications-pref-toggle | Αλλάζω το «Λαμβάνω» ενός Αυτοματισμού για τον εαυτό μου | A2 /app/notifications?tab=prefs | any-team | app | — |
| today-notifications-automations-link | Ανοίγω «Ρύθμιση Αυτοματισμών» από τις Προτιμήσεις | A2 → K1 /app/settings/automations | automations.manage | app | — |
| today-calendar-open | Ανοίγω το Ημερολόγιο | A5 /app/calendar | any-team | both | old-calendar-view |
| today-calendar-view-switch | Αλλάζω την προβολή σε Εβδομάδα, Μήνας ή Λίστα | A5 /app/calendar?view=week ή month ή list | any-team | app | — |
| today-calendar-navigate | Πάω στην προηγούμενη ή στην επόμενη περίοδο ή στο «Σήμερα» | A5 /app/calendar | any-team | app | — |
| today-calendar-person-filter | Φιλτράρω το Ημερολόγιο ανά «Άτομο» | A5 /app/calendar?person=… | any-team | app | — |
| today-calendar-layer-filmings-blocked | Δείχνω ή κρύβω τα Γυρίσματα και τον κλεισμένο χρόνο (επίπεδα) | A5 /app/calendar?layers=… | any-team | app | — |
| today-calendar-layer-next-steps | Δείχνω ή κρύβω τα Επόμενα βήματα ως επίπεδο | A5 /app/calendar?layers=nextSteps | clients.manage ή clients.transfer | app | — |
| today-calendar-layer-deadlines | Δείχνω ή κρύβω τις Προθεσμίες ως επίπεδο | A5 /app/calendar?layers=deadlines | deliverables.work ή deliverables.review | app | — |
| today-calendar-layer-busy | Δείχνω ή κρύβω την απασχόληση (busy) ως επίπεδο | A5 /app/calendar?layers=busy | any-team | app | — |
| today-calendar-item-open | Ανοίγω στοιχείο του Ημερολογίου (Γύρισμα, κλεισμένο χρόνο, βήμα, προθεσμία) | A5 /app/calendar → σελίδα στοιχείου | any-team | app | — |
| today-calendar-quick-add-kind | Προσθέτω κλεισμένο χρόνο με «+ Είδος» (ρεπό, άδεια κ.λπ.) | A5 /app/calendar → A6 /app/calendar/blocked/new | any-team | app | — |
| today-calendar-quick-add-leave | Δηλώνω «Ρεπό / Άδεια / Μη διαθέσιμος» (ή «Δεν είμαι διαθέσιμος») | A5 /app/calendar → A6 /app/calendar/blocked/new | any-team | app | — |
| today-calendar-new-filming | Ανοίγω «+ Γύρισμα» για νέο Γύρισμα | A5 /app/calendar → E4 /app/filming/new | filming.book | app | — |
| today-calendar-google-open | Ανοίγω «Δες τες» για τις διαγραφές του εταιρικού Google | A5 /app/calendar → A7 /app/calendar/google-deletions | calendar.google | app | — |
| today-calendar-google-filming-open | Ανοίγω Γύρισμα από «Πρόσφατα από το Google» | A5 /app/calendar → E3 /app/filming/{id} | any-team | app | — |
| today-calendar-link-create | Δημιουργώ τον σύνδεσμο ημερολογίου για το κινητό μου | A5 /app/calendar | any-team | app | — |
| today-calendar-link-copy | Αντιγράφω τον σύνδεσμο ημερολογίου | A5 /app/calendar | any-team | app | — |
| today-calendar-link-renew | Ανανεώνω τον σύνδεσμο ημερολογίου («Ανανέωση τώρα») | A5 /app/calendar | any-team | app | — |
| today-calendar-link-revoke | Καταργώ τον σύνδεσμο ημερολογίου («Κατάργηση τώρα») | A5 /app/calendar | any-team | app | — |
| today-blocked-new-open | Ανοίγω τη φόρμα νέου κλεισμένου χρόνου | A6 /app/calendar/blocked/new | any-team | app | — |
| today-blocked-new-pick-person | Επιλέγω άτομο για τον κλεισμένο χρόνο (άλλου Χρήστη) | A6 /app/calendar/blocked/new | calendar.block_others | app | — |
| today-blocked-conflicts-check | Βλέπω προειδοποίηση σύγκρουσης με Γύρισμα και ανοίγω το Γύρισμα («Άνοιγμα Γυρίσματος») | A6 /app/calendar/blocked/new | any-team | app | — |
| today-blocked-save-new | Αποθηκεύω νέο ρεπό, άδεια ή κλεισμένο χρόνο («Αποθήκευση») | A6 /app/calendar/blocked/new | calendar.block_others (για άλλον) ή any-team (για εμένα) | app | — |
| today-blocked-cancel | Κλείνω τη φόρμα χωρίς αποθήκευση («Ακύρωση») | A6 /app/calendar/blocked/new → A5 /app/calendar | any-team | app | — |
| today-blocked-edit-open | Ανοίγω κλεισμένο χρόνο από το Ημερολόγιο για επεξεργασία | A6 /app/calendar/blocked/{id} | calendar.block_others ή δικός μου | app | — |
| today-blocked-edit-save | Διορθώνω κλεισμένο χρόνο («Αποθήκευση») | A6 /app/calendar/blocked/{id} | calendar.block_others ή δικός μου | app | — |
| today-blocked-convert-filming | Μετατρέπω κλεισμένο χρόνο σε Γύρισμα («Μετατροπή σε Γύρισμα») | A6 /app/calendar/blocked/{id} → E4 /app/filming/new | filming.book | app | — |
| today-blocked-delete | Διαγράφω κλεισμένο χρόνο με επιβεβαίωση («Διαγραφή») | A6 /app/calendar/blocked/{id} | calendar.block_others ή δικός μου | app | — |
| today-mine-open | Ανοίγω «Τα Γυρίσματά μου» (ανοιχτά Γυρίσματα όπου είμαι στο Συνεργείο) | E6 /app/filming/mine | filming.view | app | — |
| today-mine-select | Ανοίγω Γύρισμα της λίστας για να δω το Δελτίο του | E6 /app/filming/mine?id={id} | filming.view | app | — |
| today-mine-confirm | Επιβεβαιώνω τη συμμετοχή μου στο Γύρισμα («Επιβεβαιώνω») | E6 /app/filming/mine?id={id} | any-team (μέλος Συνεργείου) | app | — |
| today-mine-decline-open | Ανοίγω την απάντηση «δεν μπορώ» για να γράψω λόγο | E6 /app/filming/mine?id={id} | any-team (μέλος Συνεργείου) | app | — |
| today-mine-decline-send | Στέλνω «δεν μπορώ» με λόγο («Στέλνω «δεν μπορώ»») | E6 /app/filming/mine?id={id} | any-team (μέλος Συνεργείου) | app | — |
| today-mine-decline-cancel | Κλείνω την απάντηση «δεν μπορώ» χωρίς αποστολή («Άκυρο») | E6 /app/filming/mine?id={id} | any-team | app | — |
| today-tasks-open | Ανοίγω «Οι εργασίες μου» (ανατεθειμένες Εργασίες) | G4 /app/tasks | any-team (ομάδα) | app | — |
| today-tasks-start | Ξεκινώ Εργασία («Ξεκίνησα») | G4 /app/tasks | productions.manage ή υπεύθυνος σε ανοιχτή Παραγωγή | app | — |
| today-tasks-done | Σημειώνω Εργασία ως «Έγινε» | G4 /app/tasks | productions.manage ή υπεύθυνος σε ανοιχτή Παραγωγή | app | — |
| today-tasks-reopen | Ξανανοίγω Εργασία («Ξανάνοιγμα») | G4 /app/tasks | productions.manage ή υπεύθυνος σε ανοιχτή Παραγωγή | app | — |
| today-tasks-open-production | Ανοίγω την Παραγωγή μιας Εργασίας από τον τίτλο της γραμμής | G4 /app/tasks → G2 /app/productions/{id} | canOpen από τη βάση (my_tasks_view) | app | — |
| talk-inbox-open | Ανοίγω τα Εισερχόμενα | J1 /app/messages | messages.chat | app | — |
| talk-inbox-tab-conversations | Βλέπω τις «Συνομιλίες» ανά Πελάτη | J1 /app/messages | messages.chat | app | — |
| talk-inbox-tab-requests | Ανοίγω την καρτέλα «Αιτήματα» | J1 /app/messages?tab=requests | messages.chat | app | — |
| talk-inbox-tab-mentions | Ανοίγω την καρτέλα «Με ανέφεραν» | J1 /app/messages?tab=mentions | messages.chat | app | — |
| talk-requests-view-filter | Αλλάζω την όψη Αιτημάτων σε «για μένα», «όλα τα ανοιχτά» ή «κλεισμένα» | J1 /app/messages?tab=requests&view=… | messages.chat | app | — |
| talk-requests-view-unassigned | Βλέπω τα Αιτήματα «χωρίς υπεύθυνο» | J1 /app/messages?tab=requests&view=unassigned | clients.transfer (και όχι μόνος στην ομάδα) | app | — |
| talk-conversation-open | Ανοίγω Συνομιλία Πελάτη από τη λίστα | J1 /app/messages → J2 /app/messages/{id} | messages.chat | app | — |
| talk-request-row-open | Ανοίγω Αίτημα από τη λίστα (πάω στη Συνομιλία του) | J1 /app/messages?tab=requests → J2 /app/messages/{id} | messages.chat | app | — |
| talk-mention-open | Ανοίγω αναφορά από «Με ανέφεραν» («Άνοιγμα») | J1 /app/messages?tab=mentions → J2 /app/messages/{id} | messages.chat | app | — |
| talk-new-message-start | Διαλέγω Πελάτη στο «Νέο Μήνυμα προς» και ανοίγω «Νέο Μήνυμα» | J1 /app/messages → J2 /app/messages/{id} | messages.chat (μόνο Πελάτες όπου γράφω) | app | — |
| talk-thread-open | Ανοίγω τη Συνομιλία ενός Πελάτη | J2 /app/messages/{id} | messages.chat | app | — |
| talk-thread-client-page | Ανοίγω τη σελίδα του Πελάτη από το όνομά του στη Συνομιλία | J2 /app/messages/{id} → B2 /app/clients/{id} | clients.view | app | — |
| talk-thread-switch-client | Αλλάζω Συνομιλία με «Άλλη Συνομιλία» → Πελάτης | J2 /app/messages/{id} | messages.chat | app | — |
| talk-thread-all-conversations | Γυρίζω στις «Όλες οι Συνομιλίες» | J2 /app/messages/{id} → J1 /app/messages | messages.chat | app | — |
| talk-thread-filter-production | Φιλτράρω τα Μηνύματα ανά Παραγωγή (ετικέτα) | J2 /app/messages/{id}?production=… | messages.chat | app | — |
| talk-thread-filter-untagged | Φιλτράρω τα Μηνύματα «Χωρίς ετικέτα» | J2 /app/messages/{id}?filter=untagged | messages.chat | app | — |
| talk-thread-filter-internal | Φιλτράρω τα Εσωτερικά Μηνύματα | J2 /app/messages/{id}?filter=internal | messages.chat | app | — |
| talk-message-send-client | Στέλνω Μήνυμα προς τον Πελάτη («Αποστολή στον πελάτη») | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-send-internal | Στέλνω Εσωτερικό Μήνυμα μόνο στην ομάδα («Αποστολή στην ομάδα») | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-mention | Αναφέρω συνάδελφο στο Μήνυμα («Αναφορά σε…») | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-tag-compose | Διαλέγω Παραγωγή ή «Χωρίς ετικέτα» στο πεδίο «Ετικέτα» πριν την αποστολή | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-attach | Επισυνάπτω αρχεία («Επισύναψη») και αφαιρώ όσα έβαλα («Αφαίρεση») πριν την αποστολή | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-mark-request | Σημειώνω Μήνυμα του Πελάτη ως Αίτημα («Νέο Παραδοτέο», «Γύρισμα» ή «Άλλο») | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-change-tag | Αλλάζω ή καθαρίζω την ετικέτα Παραγωγής ενός Μηνύματος («Αλλαγή ετικέτας») | J2 /app/messages/{id} | messages.chat (και εμπλοκή Παραγωγής ή ορατότητα όλων) | app | — |
| talk-message-edit | Διορθώνω Μήνυμα που έγραψα μέσα στο παράθυρο διόρθωσης («Διόρθωση») | J2 /app/messages/{id} | messages.chat | app | — |
| talk-message-delete | Διαγράφω Μήνυμα που έγραψα, αν δεν έχει γίνει Αίτημα («Διαγραφή») | J2 /app/messages/{id} | messages.chat | app | — |
| talk-request-assign | Αλλάζω υπεύθυνο του Αιτήματος («Αλλαγή υπευθύνου») | J2 /app/messages/{id} | clients.transfer | app | — |
| talk-request-create-deliverable | Δημιουργώ Παραδοτέο από το Αίτημα («Δημιουργία Παραδοτέου από το Αίτημα») | J2 /app/messages/{id} | messages.chat και (υπεύθυνος ή clients.transfer) | app | — |
| talk-request-create-filming | Ανοίγω φόρμα νέου Γυρίσματος από Αίτημα Γυρίσματος | J2 /app/messages/{id} → E4 /app/filming/new?fromRequest=…&client=… | messages.chat και (υπεύθυνος ή clients.transfer) | app | — |
| talk-request-complete | Ολοκληρώνω Αίτημα με σύνδεσμο ή σχόλιο («Ολοκλήρωση Αιτήματος») | J2 /app/messages/{id} | messages.chat και (υπεύθυνος ή clients.transfer) | app | — |
| talk-request-reject | Απορρίπτω Αίτημα με υποχρεωτική απάντηση προς τον Πελάτη («Απόρριψη Αιτήματος») | J2 /app/messages/{id} | messages.chat και (υπεύθυνος ή clients.transfer) | app | — |
| talk-request-deliverable-open | Ανοίγω το Παραδοτέο που δημιουργήθηκε από Αίτημα («Άνοιγμα Παραδοτέου») | J2 /app/messages/{id} → H2 /app/deliverables/{id} | messages.chat | app | — |
| talk-side-request-open | Ανοίγω Αίτημα από τη στήλη «Αιτήματα» της Συνομιλίας | J2 /app/messages/{id} | messages.chat | app | — |

## Πελάτες

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| clients-b1-view-list | Βλέπω τη λίστα όλων των Πελατών με Υπεύθυνο, κατάσταση, πακέτο, Υπόλοιπο και τελευταία επαφή | B1 /app/clients | clients.view | both | old-clients-view-list |
| clients-b1-search | Αναζητώ Πελάτη στη λίστα (?q=) | B1 /app/clients | clients.view | app | — |
| clients-b1-filter-columns | Φιλτράρω τη λίστα ανά στήλη: Πόλη, Υπεύθυνος, Ευκαιρίες, Συμφωνίες, Υπόλοιπο, Επαφή | B1 /app/clients?city=&owner=&opps=&agreements=&balance=&contact= | clients.view | app | — |
| clients-b1-filter-legacy | Φιλτράρω με Κατάσταση, Γύρισμα αυτόν τον μήνα και Πακέτο | B1 /app/clients?status=&noshoot=&package= | clients.view | app | — |
| clients-b1-paginate | Μεταβαίνω στις σελίδες της λίστας (50 Πελάτες ανά σελίδα) | B1 /app/clients?page= | clients.view | app | — |
| clients-b1-open-client | Ανοίγω τη Σελίδα Πελάτη από τη λίστα (μόνο όσους μου αφορούν) | B1 /app/clients → B2 /app/clients/[id] | clients.view | app | — |
| clients-b1-open-duplicates | Ανοίγω τα Πιθανά διπλά από τη σήμανση «Πιθανό διπλό» της γραμμής | B1 /app/clients → B6 /app/clients/duplicates | clients.merge | app | — |
| clients-b1-open-sales-guide | Ανοίγω τον Οδηγό πωλήσεων | B1 /app/clients | any-team | app | — |
| clients-b1-new-client-and-opportunity | Δημιουργώ Πελάτη και Ευκαιρία μαζί («Δημιουργία Πελάτη και Ευκαιρίας») | B1 /app/clients?new= (φόρμα Νέα Ευκαιρία) | clients.manage | both | old-clients-create |
| clients-b1-new-opportunity-existing-client | Δημιουργώ Ευκαιρία σε υπάρχοντα Πελάτη («Δημιουργία Ευκαιρίας») | B1 /app/clients?new= (φόρμα Νέα Ευκαιρία) | clients.manage | app | — |
| clients-b1-request-access | Στέλνω Αίτημα πρόσβασης σε Πελάτη άλλου πωλητή | B1 /app/clients?new= (φόρμα Νέα Ευκαιρία) | clients.manage | app | — |
| clients-b2-view-summary | Βλέπω τη Σύνοψη του Πελάτη (στάδιο, επόμενο βήμα, Χρειάζεται προσοχή, στοιχεία) | B2 /app/clients/[id] | clients.view | both | old-clients-view-overview-activity |
| clients-b2-new-opportunity | Δημιουργώ Ευκαιρία από τη Σελίδα Πελάτη («Νέα Ευκαιρία») | B2 /app/clients/[id] | clients.manage | app | — |
| clients-b2-add-note | Καταγράφω Δραστηριότητα ή σημείωση («Πρόσθεσε σημείωση», «Καταγραφή») | B2 /app/clients/[id]?tab=comms | clients.manage | app | — |
| clients-b2-edit-activity | Διορθώνω Δραστηριότητα (μόνο όσες έγραψα μέσα σε 24 ώρες, ή όλες ως Ιδιοκτήτης) | B2 /app/clients/[id]?tab=comms | clients.manage | app | — |
| clients-b2-delete-activity | Σβήνω Δραστηριότητα του Πελάτη | B2 /app/clients/[id]?tab=comms | clients.manage | app | — |
| clients-b2-edit-contact | Αλλάζω στοιχεία Πελάτη: Όνομα, Επωνυμία, Πόλη, ΑΦΜ, Κύριο πρόσωπο, email, τηλέφωνο | B2 /app/clients/[id] (πλαϊνή «Στοιχεία») | clients.manage | both | old-clients-edit |
| clients-b2-transfer-owner | Μεταβιβάζω τον Πελάτη σε άλλο Υπεύθυνο («⋯» → Μεταβίβαση) | B2 /app/clients/[id] (⋯) | clients.transfer | app | — |
| clients-b2-open-history | Ανοίγω το Ιστορικό του Πελάτη (Ίχνος ενεργειών) | B2 /app/clients/[id] (⋯) | audit.view | app | — |
| clients-b2-delete-client | Διαγράφω Πελάτη, πληκτρολογώντας το όνομά του για επιβεβαίωση | B2 /app/clients/[id] (⋯) | clients.delete | both | old-clients-delete |
| clients-b2-request-access | Ζητάω πρόσβαση σε Πελάτη που ανήκει σε άλλον πωλητή | B2 /app/clients/[id] (Άλλου πωλητή) | clients.manage | app | — |
| clients-b2-open-merge-from-notice | Ανοίγω τη Συγχώνευση από την ειδοποίηση «Πιθανό διπλό» | B2 /app/clients/[id] → B6 /app/clients/duplicates | clients.merge | app | — |
| clients-b2-tab-sales | Βλέπω την καρτέλα Πωλήσεις (Ευκαιρίες και Συμφωνίες του Πελάτη) | B2 /app/clients/[id]?tab=sales | clients.view | both | old-clients-view-contracts |
| clients-b2-open-opportunity | Ανοίγω Ευκαιρία του Πελάτη (και «Επόμενο βήμα») | B2 /app/clients/[id]?tab=sales → B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b2-open-agreement | Ανοίγω Συμφωνία του Πελάτη | B2 /app/clients/[id]?tab=sales → D2 /app/agreements/[id] | agreements.view | app | — |
| clients-b2-open-proposal | Ανοίγω την πρόταση μιας Ευκαιρίας για υπογραφή | B2 /app/clients/[id]?tab=sales | agreements.view | app | — |
| clients-b2-tab-productions | Βλέπω την καρτέλα Παραγωγές του Πελάτη | B2 /app/clients/[id]?tab=productions | productions.manage | app | — |
| clients-b2-open-production | Ανοίγω Παραγωγή του Πελάτη | B2 /app/clients/[id]?tab=productions → G2 /app/productions/[id] | productions.manage | app | — |
| clients-b2-open-productions-list | Ανοίγω τη λίστα Παραγωγών | B2 /app/clients/[id]?tab=productions → G1 /app/productions | productions.manage | app | — |
| clients-b2-tab-finance | Βλέπω την καρτέλα Οικονομικά (υπόλοιπο και Ληξιπρόθεσμα Τιμολόγια) | B2 /app/clients/[id]?tab=finance | finance.view | app | — |
| clients-b2-open-ledger | Ανοίγω την Καρτέλα Πελάτη (πλήρη) | B2 /app/clients/[id]?tab=finance → I5 /app/finance/ledger | finance.view | app | — |
| clients-b2-tab-comms | Βλέπω την καρτέλα Επικοινωνία (Συνομιλία, Δραστηριότητες, Τι στάλθηκε) | B2 /app/clients/[id]?tab=comms | clients.view | app | — |
| clients-b2-open-chat | Ανοίγω τη Συνομιλία του Πελάτη | B2 /app/clients/[id]?tab=comms → J2 /app/messages/[id] | messages.chat | app | — |
| clients-b2-view-sends | Βλέπω «Τι στάλθηκε» στον Πελάτη και τα φίλτρα του (state, channel) | B2 /app/clients/[id]?tab=comms&state=&channel= | automations.manage | app | — |
| clients-b2-open-sends-history | Ανοίγω το Ιστορικό αποστολών | B2 /app/clients/[id]?tab=comms → K3 /app/settings/sends | automations.manage | app | — |
| clients-b2-tab-users | Βλέπω τους Χρήστες πελάτη του Πελάτη | B2 /app/clients/[id]?tab=users (N2) | access.clientUsers | app | — |
| clients-b2-invite-client-user | Προσκαλώ Χρήστη πελάτη (φόρμα «Πρόσκληση Χρήστη πελάτη») | B2 /app/clients/[id]?tab=users | access.clientUsers | both | old-clients-invite-access |
| clients-b2-resend-or-cancel-invitation | Ξαναστέλνω ή ακυρώνω Πρόσκληση Χρήστη πελάτη | B2 /app/clients/[id]?tab=users | access.clientUsers | app | — |
| clients-b2-remove-client-user | Αφαιρώ Χρήστη πελάτη | B2 /app/clients/[id]?tab=users | access.clientUsers | app | — |
| clients-b2-gdpr-export | Εξάγω δεδομένα GDPR του Πελάτη, της Επαφής ή ενός Χρήστη πελάτη | B2 /app/clients/[id]?tab=users (GDPR) | owner | app | — |
| clients-b2-gdpr-anonymize-contact | Ανωνυμοποιώ την Επαφή του Πελάτη | B2 /app/clients/[id]?tab=users (GDPR) | owner | app | — |
| clients-b3-view-pipeline | Βλέπω το Pipeline Ευκαιριών ανά Στάδιο | B3 /app/pipeline | clients.manage | both | old-leads-view-list |
| clients-b3-filter-columns | Φιλτράρω Ευκαιρίες ανά Υπεύθυνο, Πηγή και Κλείσιμο | B3 /app/pipeline?owner=&source=&close= | clients.manage | app | — |
| clients-b3-filter-call-list | Φιλτράρω σε «Όλες», «Επόμενο βήμα αυτή την εβδομάδα», «Ξεχασμένες», «Χωρίς επαφή» | B3 /app/pipeline | clients.manage | app | — |
| clients-b3-view-forecast | Βλέπω τη σύνοψη Πρόβλεψης του Pipeline | B3 /app/pipeline | clients.manage | app | — |
| clients-b3-move-stage | Μετακινώ Ευκαιρία σε άλλο Στάδιο από την κάρτα | B3 /app/pipeline | clients.manage | app | — |
| clients-b3-close-lost | Κλείνω Ευκαιρία ως χαμένη με Λόγο απώλειας | B3 /app/pipeline | clients.manage | app | — |
| clients-b3-open-opportunity | Ανοίγω Ευκαιρία από την κάρτα ή τη λίστα «Πάρε τηλέφωνο» | B3 /app/pipeline → B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b3-open-sales-guide | Ανοίγω τον Οδηγό πωλήσεων | B3 /app/pipeline | any-team | app | — |
| clients-b4-view-opportunity | Βλέπω Ευκαιρία: Στάδιο, Υπεύθυνος, Επόμενο βήμα, Πρόβλεψη, Δραστηριότητες | B4 /app/pipeline/[id] | clients.manage | both | old-leads-view-detail |
| clients-b4-rename | Μετονομάζω Ευκαιρία («Μετονομασία») | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-edit-next-step | Ορίζω Επόμενο βήμα και ημερομηνία υπενθύμισης | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-change-stage | Αλλάζω Στάδιο της Ευκαιρίας | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-close-lost | Κλείνω την Ευκαιρία ως χαμένη με Λόγο απώλειας | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-follow-up-from-lost | Ανοίγω νέα Ευκαιρία από χαμένη («Νέα Ευκαιρία από αυτήν») | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-log-activity | Καταγράφω Σημείωση ή κλήση στην Ευκαιρία | B4 /app/pipeline/[id]#b4-activities | clients.manage | app | — |
| clients-b4-said-yes | Σημειώνω «Είπε ναι — ετοίμασε Συμφωνία» (η Ευκαιρία μένει ανοιχτή) | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-edit-activity | Διορθώνω Δραστηριότητα της Ευκαιρίας | B4 /app/pipeline/[id]#b4-activities | clients.manage | app | — |
| clients-b4-delete-activity | Σβήνω Δραστηριότητα της Ευκαιρίας | B4 /app/pipeline/[id]#b4-activities | clients.manage | app | — |
| clients-b4-save-forecast | Αποθηκεύω Πρόβλεψη: Πιθανότητα και Αναμενόμενο κλείσιμο | B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b4-set-forecast-value | Ορίζω Αξία € στην Πρόβλεψη | B4 /app/pipeline/[id] | finance.amounts | app | — |
| clients-b4-change-manager | Αλλάζω Υπεύθυνο της Ευκαιρίας | B4 /app/pipeline/[id] | clients.transfer | both | old-leads-reassign |
| clients-b4-create-proposal | Δημιουργώ πρόταση από την Ευκαιρία («Νέα πρόταση», Είδος, Τίτλος) | B4 /app/pipeline/[id]#b4-proposal | agreements.draft | both | old-contracts-create, old-projects-contracts-create, old-proposals-create |
| clients-b4-send-proposal | Στέλνω την πρόταση από την Ευκαιρία («Αποστολή») | B4 /app/pipeline/[id]#b4-proposal | finance.amounts | app | — |
| clients-b4-request-approval | Ζητάω έγκριση της πρότασης από την Ευκαιρία («Αίτημα έγκρισης») | B4 /app/pipeline/[id]#b4-proposal | agreements.draft | app | — |
| clients-b4-open-proposal | Ανοίγω την πρόταση για υπογραφή ή τη Συμφωνία της Ευκαιρίας | B4 /app/pipeline/[id] → D2 /app/agreements/[id] | agreements.view | app | — |
| clients-b4-open-client | Ανοίγω τον Πελάτη της Ευκαιρίας | B4 /app/pipeline/[id] → B2 /app/clients/[id] | clients.manage | app | — |
| clients-b4-open-followed-opportunity | Ανοίγω την Ευκαιρία από την οποία προήλθε η τρέχουσα | B4 /app/pipeline/[id] → B4 /app/pipeline/[id] | clients.manage | app | — |
| clients-b5-view-queue | Βλέπω την ουρά «Χωρίς υπεύθυνο» (Ευκαιρίες από τη φόρμα) | B5 /app/unassigned | clients.transfer | app | — |
| clients-b5-assign-opportunity | Αναθέτω Ευκαιρία σε Υπεύθυνο («Ανάθεση») | B5 /app/unassigned | clients.transfer | app | — |
| clients-b5-open-opportunity | Ανοίγω Ευκαιρία από την ουρά | B5 /app/unassigned → B4 /app/pipeline/[id] | clients.transfer | app | — |
| clients-b5-view-access-requests | Βλέπω τα Αιτήματα πρόσβασης | B5 /app/unassigned | clients.transfer | app | — |
| clients-b5-approve-access-request | Εγκρίνω Αίτημα πρόσβασης («Έγκριση») | B5 /app/unassigned | clients.transfer | app | — |
| clients-b5-reject-access-request | Απορρίπτω Αίτημα πρόσβασης με υποχρεωτικό σχόλιο («Απόρριψη») | B5 /app/unassigned | clients.transfer | app | — |
| clients-b5-transfer-from-request | Μεταβιβάζω τον Πελάτη στον πωλητή που ζήτησε πρόσβαση («Μεταβίβαση Πελάτη») | B5 /app/unassigned | clients.transfer | app | — |
| clients-b5-open-sales-settings | Ανοίγω Ρυθμίσεις › Πωλήσεις (O2) από τη σημείωση της σελίδας | B5 /app/unassigned → O2 /app/settings/sales | settings.manage | app | — |
| clients-b6-view-pairs | Βλέπω τα ζευγάρια Πιθανών διπλών Πελατών | B6 /app/clients/duplicates | clients.merge | app | — |
| clients-b6-merge-clients | Συγχωνεύω δύο Πελάτες και επιλέγω ποιος μένει («Συγχώνευση») | B6 /app/clients/duplicates | clients.merge | app | — |
| clients-b6-dismiss-duplicate | Σημειώνω «Είναι άλλος» και κλείνω το σήμα διπλού | B6 /app/clients/duplicates | clients.merge | app | — |
| clients-c1-view-catalogue | Βλέπω τον Κατάλογο Πακέτων και Υπηρεσιών | C1 /app/catalogue | catalogue.view | both | old-proposal-packages-view |
| clients-c1-search | Αναζητώ στον Κατάλογο | C1 /app/catalogue | catalogue.view | app | — |
| clients-c1-filter-kind | Φιλτράρω σε Όλα, Πακέτα ή Υπηρεσίες | C1 /app/catalogue | catalogue.view | app | — |
| clients-c1-show-archived | Εμφανίζω και τα αρχειοθετημένα στοιχεία | C1 /app/catalogue | catalogue.manage | app | — |
| clients-c1-see-prices | Βλέπω Τιμές στον Κατάλογο | C1 /app/catalogue | finance.amounts | app | — |
| clients-c1-see-cost-and-margin | Βλέπω Εκτιμώμενο κόστος και Περιθώριο στον Κατάλογο | C1 /app/catalogue | finance.cost | app | — |
| clients-c1-new-package | Δημιουργώ Νέο Πακέτο («Νέο Πακέτο») | C1 /app/catalogue → C2 /app/catalogue/new?type=package | catalogue.manage | both | old-proposal-packages-create |
| clients-c1-new-service | Δημιουργώ Νέα Υπηρεσία («Νέα Υπηρεσία») | C1 /app/catalogue → C2 /app/catalogue/new?type=service | catalogue.manage | app | — |
| clients-c1-open-item | Ανοίγω Πακέτο ή Υπηρεσία από τη λίστα | C1 /app/catalogue → C2 /app/catalogue/[id] | catalogue.view | app | — |
| clients-c2-view-item | Βλέπω Πακέτο ή Υπηρεσία με τις Παροχές και τη Χρήση του | C2 /app/catalogue/[id] | catalogue.view | app | — |
| clients-c2-edit-basics | Αλλάζω Όνομα, Είδος, Μονάδα και Περιγραφή | C2 /app/catalogue/[id] | catalogue.manage | both | old-proposal-packages-edit |
| clients-c2-edit-price | Αλλάζω Τιμή χωρίς ΦΠΑ | C2 /app/catalogue/[id] | catalogue.manage + finance.amounts | app | — |
| clients-c2-edit-provisions | Ορίζω Παροχές του Πακέτου (ποσότητα και είδος) | C2 /app/catalogue/[id] | catalogue.manage | app | — |
| clients-c2-edit-hours | Ορίζω Ώρες γυρίσματος και Ώρες μοντάζ | C2 /app/catalogue/[id] | finance.costManage + finance.cost | app | — |
| clients-c2-edit-direct-cost | Ορίζω Άμεσο κόστος | C2 /app/catalogue/[id] | catalogue.manage + finance.cost | app | — |
| clients-c2-view-cost | Βλέπω κόστος, περιθώριο, υπόδειξη κόστους και Πραγματικές ώρες | C2 /app/catalogue/[id] | finance.cost | app | — |
| clients-c2-edit-public | Κάνω Πακέτο δημόσιο και ορίζω Όνομα (EN), Σύντομη περιγραφή (EN) και Ένδειξη τιμής | C2 /app/catalogue/[id] | catalogue.manage | app | — |
| clients-c2-retire-item | Αρχειοθετώ Πακέτο ή Υπηρεσία («Αρχειοθέτηση») | C2 /app/catalogue/[id] | catalogue.manage | both | old-proposal-packages-delete |
| clients-c2-restore-item | Επαναφέρω αρχειοθετημένο στοιχείο («Επαναφορά») | C2 /app/catalogue/[id] | catalogue.manage | app | — |
| clients-c2-view-usage | Βλέπω Χρήση και ιστορικό (Σε χρήση) | C2 /app/catalogue/[id] | catalogue.manage | app | — |
| clients-c2-open-cost-settings | Ανοίγω Ρυθμίσεις › Οικονομικά | C2 /app/catalogue/[id] → O6 /app/settings/finance | finance.cost | app | — |
| clients-c2-open-agreement-settings | Ανοίγω Ρυθμίσεις › Συμφωνίες | C2 /app/catalogue/[id] → O3 /app/settings/agreements | settings.manage | app | — |
| clients-c2-create-item | Δημιουργώ Πακέτο ή Υπηρεσία («Δημιουργία») | C2 /app/catalogue/new | catalogue.manage | app | — |
| clients-c2-create-item-price | Ορίζω τιμή στο νέο Πακέτο ή Υπηρεσία | C2 /app/catalogue/new | catalogue.manage + finance.amounts | app | — |
| clients-d1-view-agreements | Βλέπω τη λίστα Συμφωνιών | D1 /app/agreements | agreements.view | both | old-contracts-view-list |
| clients-d1-filter-bucket | Φιλτράρω σε Ανοιχτές, Προτάσεις, Ενεργές, Κλειστές ή Όλες | D1 /app/agreements | agreements.view | app | — |
| clients-d1-search | Αναζητώ Πελάτη ή Συμφωνία | D1 /app/agreements | agreements.view | app | — |
| clients-d1-filter-kind | Φιλτράρω ανά Είδος Συμφωνίας | D1 /app/agreements | agreements.view | app | — |
| clients-d1-filter-in-progress | Βλέπω μόνο τις προτάσεις σε εξέλιξη | D1 /app/agreements?view=in_progress | agreements.view | both | old-proposals-view-list |
| clients-d1-open-agreement | Ανοίγω Συμφωνία από τη λίστα | D1 /app/agreements → D2 /app/agreements/[id] | agreements.view | app | — |
| clients-d1-open-client | Ανοίγω τον Πελάτη της Συμφωνίας | D1 /app/agreements → B2 /app/clients/[id] | agreements.view | app | — |
| clients-d1-see-amounts | Βλέπω ποσά στη λίστα Συμφωνιών | D1 /app/agreements | finance.amounts | app | — |
| clients-d1-see-low-margin | Βλέπω σήμανση χαμηλού περιθωρίου στη λίστα | D1 /app/agreements | finance.cost | app | — |
| clients-d1-open-pipeline-for-proposal | Ανοίγω το Pipeline για νέα πρόταση | D1 /app/agreements → B3 /app/pipeline | agreements.draft | app | — |
| clients-d2-view-agreement | Βλέπω Συμφωνία: κεφαλίδα, Πορεία πρότασης και Ενέργειες | D2 /app/agreements/[id] | agreements.view | both | old-contracts-view-detail, old-projects-contracts-view, old-proposals-view-detail |
| clients-d2-send | Στέλνω πρόταση στον πελάτη («Αποστολή») | D2 /app/agreements/[id] | agreements.draft + finance.amounts | both | old-contracts-send |
| clients-d2-request-approval | Ζητάω έγκριση πρότασης («Αίτημα έγκρισης») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-withdraw-approval | Αποσύρω αίτημα έγκρισης («Απόσυρση αιτήματος») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-decide-approval | Εγκρίνω ή απορρίπτω πρόταση σε έγκριση, με σχόλιο | D2 /app/agreements/[id] | agreements.deviate + finance.amounts | app | — |
| clients-d2-new-revision | Ξεκινώ νέα αναθεώρηση πρότασης («Νέα αναθεώρηση») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-extend-proposal | Παρατείνω πρόταση που έληξε («Παράταση», Μέρες Παράτασης) | D2 /app/agreements/[id] | agreements.draft + finance.amounts | app | — |
| clients-d2-close-lost | Κλείνω πρόταση που έληξε ως χαμένη («Κλείσιμο ως χαμένη») | D2 /app/agreements/[id] | agreements.draft | both | old-contracts-delete, old-proposals-delete |
| clients-d2-preview-client-view | Βλέπω «Όπως θα τη δει ο πελάτης» (προεπισκόπηση εγγράφου) | D2 /app/agreements/[id] | finance.amounts | both | old-proposals-pdf-download |
| clients-d2-sign-outside | Καταχωρώ «Υπογράφηκε εκτός συστήματος» | D2 /app/agreements/[id] | agreements.deviate | both | old-proposals-set-response |
| clients-d2-revoke-link | Ανακαλώ σύνδεσμο υπογραφής («Ανάκληση») | D2 /app/agreements/[id] | finance.amounts | app | — |
| clients-d2-reissue-link | Εκδίδω νέο σύνδεσμο υπογραφής («Νέος σύνδεσμος») | D2 /app/agreements/[id] | finance.amounts | app | — |
| clients-d2-set-recipients | Ορίζω παραλήπτες και Υπογράφοντα («Αποθήκευση παραληπτών») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-mark-outbox | Σημειώνω εξερχόμενο ως «Το έστειλα», «Τον είπα στον πελάτη», «Έγινε» ή «Ακύρωση» | D2 /app/agreements/[id]#outbox | agreements.draft | both | old-proposals-mark-sent |
| clients-d2-copy-link | Αντιγράφω σύνδεσμο ή κωδικό υπογραφής («Αντιγραφή») | D2 /app/agreements/[id]#outbox | agreements.draft | app | — |
| clients-d2-edit-terms | Αποθηκεύω Όρους Συμφωνίας («Αποθήκευση όρων») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-edit-discount | Αποθηκεύω Έκπτωση («Αποθήκευση έκπτωσης») | D2 /app/agreements/[id] | agreements.draft + finance.amounts | app | — |
| clients-d2-edit-revision-limits | Αποθηκεύω Όρια αλλαγών («Αποθήκευση ορίων») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-edit-milestones | Αποθηκεύω Δόσεις σε ορόσημα («Αποθήκευση δόσεων») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-edit-schedule | Αλλάζω Τίτλο, Γλώσσα, Ισχύ, Έναρξη και Διάρκεια («Αποθήκευση χρονοδιαγράμματος») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-add-catalogue-line | Προσθέτω γραμμή από τον Κατάλογο («Προσθήκη») | D2 /app/agreements/[id] | agreements.draft | both | old-clients-agreement-prefill |
| clients-d2-add-free-line | Προσθέτω ελεύθερη γραμμή με τιμή («Προσθήκη ελεύθερης γραμμής») | D2 /app/agreements/[id] | agreements.draft + finance.amounts | app | — |
| clients-d2-edit-line | Επεξεργάζομαι γραμμή: περιγραφή (και English), ποσότητα, τιμή μονάδας | D2 /app/agreements/[id] | agreements.draft + finance.amounts | both | old-clients-agreement-save |
| clients-d2-edit-line-hours-and-cost | Επεξεργάζομαι Ώρες γυρίσματος, Ώρες μοντάζ και Άμεσο κόστος γραμμής | D2 /app/agreements/[id] | finance.costManage + finance.cost | app | — |
| clients-d2-edit-line-provisions | Ορίζω Παροχές γραμμής | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-remove-line | Αφαιρώ γραμμή από τη Συμφωνία («Αφαίρεση») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-view-cost | Βλέπω Κόστος και περιθώριο της Συμφωνίας | D2 /app/agreements/[id] | finance.cost | app | — |
| clients-d2-view-history | Βλέπω Αιτήματα αλλαγών από τον πελάτη, Αναθεωρήσεις και Υπογραφή | D2 /app/agreements/[id] | agreements.view | both | old-contracts-review-signed |
| clients-d2-view-periods-and-productions | Βλέπω Περιόδους και Παραγωγές της Συμφωνίας | D2 /app/agreements/[id] | productions.manage | app | — |
| clients-d2-dissolve | Καταχωρώ Λύση Συμφωνίας («Καταχώριση Λύσης») | D2 /app/agreements/[id] | agreements.terminate | app | — |
| clients-d2-cancel-dissolution | Ακυρώνω Λύση («Ακύρωση Λύσης») | D2 /app/agreements/[id] | agreements.terminate | app | — |
| clients-d2-set-no-continuation | Ορίζω «Δεν συνεχίζει μετά τη Λήξη» | D2 /app/agreements/[id] | agreements.terminate | app | — |
| clients-d2-set-continues-normally | Ορίζω «Συνεχίζει κανονικά» | D2 /app/agreements/[id] | agreements.terminate | app | — |
| clients-d2-renew-now | Ανανεώνω τη Συμφωνία τώρα («Ανανέωση τώρα») | D2 /app/agreements/[id] | agreements.draft | app | — |
| clients-d2-attach-signed-file | Ανεβάζω ή αντικαθιστώ το υπογεγραμμένο αρχείο («Ανέβασμα») | D2 /app/agreements/[id] | agreements.deviate | app | — |
| clients-d2-download-signed-file | Κατεβάζω το υπογεγραμμένο αρχείο | D2 /app/agreements/[id] → /app/agreements/[id]/signed-file | agreements.view | both | old-contracts-pdf-download |
| clients-d2-open-client-and-opportunity | Ανοίγω τον Πελάτη και την Ευκαιρία της Συμφωνίας | D2 /app/agreements/[id] → B2 /app/clients/[id], B4 /app/pipeline/[id] | agreements.view | app | — |
| clients-d2-open-cost-settings | Ανοίγω Ρυθμίσεις Οικονομικών από το Κόστος | D2 /app/agreements/[id] → O6 /app/settings/finance | finance.cost | app | — |
| clients-d4-view-queue | Βλέπω την ουρά Προτάσεων προς έγκριση | D4 /app/agreements/approvals | agreements.deviate | app | — |
| clients-d4-approve | Εγκρίνω πρόταση («Εγκρίνω»· στέλνεται αμέσως σε όλους τους παραλήπτες) | D4 /app/agreements/approvals | agreements.deviate + finance.amounts | app | — |
| clients-d4-reject | Απορρίπτω πρόταση με υποχρεωτικό σχόλιο («Απορρίπτω») | D4 /app/agreements/approvals | agreements.deviate | app | — |
| clients-d4-open-agreement | Ανοίγω Συμφωνία από την ουρά | D4 /app/agreements/approvals → D2 /app/agreements/[id] | agreements.deviate | app | — |
| clients-d4-see-amounts | Βλέπω ποσά των προτάσεων στην ουρά | D4 /app/agreements/approvals | finance.amounts | app | — |

## Παραγωγή

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| production-filming-list-view | Βλέπω τη λίστα των Γυρισμάτων ανά προβολή | E1 /app/filming | filming.view | both | old-filming-prep-view-list |
| production-filming-list-tabs | Φιλτράρω τα Γυρίσματα με τις προβολές «Ανοιχτά», «Επόμενες 7 ημέρες», «Θέλουν «έγινε»», «Έγιναν ή ακυρώθηκαν», «Όλα» | E1 /app/filming | filming.view | app | — |
| production-filming-list-open-row | Ανοίγω Γύρισμα από τη γραμμή της λίστας | E1 /app/filming | filming.view | app | — |
| production-filming-new-button | Δημιουργώ Νέο Γύρισμα από το κουμπί της λίστας | E1 /app/filming | filming.book | app | — |
| production-queue-view | Βλέπω την ουρά «Αναμένουν έγκριση» (νέες κρατήσεις, αιτήματα ακύρωσης και μετάθεσης) | E2 /app/filming/queue | filming.approve | both | old-filming-requests-view-list |
| production-queue-approve-filming | Εγκρίνω νέα κράτηση Γυρίσματος από την ουρά | E2 /app/filming/queue | filming.approve | both | old-filming-request-approve-hold |
| production-queue-reject-filming | Απορρίπτω κράτηση Γυρίσματος με υποχρεωτικό λόγο | E2 /app/filming/queue | filming.approve | both | old-filming-request-reject-hold |
| production-queue-accept-cancel | Δέχομαι αίτημα ακύρωσης μετά το Όριο | E2 /app/filming/queue | filming.approve | app | — |
| production-queue-refuse-cancel | Αρνούμαι αίτημα ακύρωσης μετά το Όριο | E2 /app/filming/queue | filming.approve | app | — |
| production-queue-approve-reschedule | Εγκρίνω αίτημα μετάθεσης Γυρίσματος | E2 /app/filming/queue | filming.approve | app | — |
| production-queue-reject-reschedule | Απορρίπτω αίτημα μετάθεσης με υποχρεωτικό λόγο | E2 /app/filming/queue | filming.approve | app | — |
| production-filming-detail-view | Βλέπω στοιχεία Γυρίσματος (πότε, πού, Παραγωγή, Συμφωνία, Παροχή, σημειώσεις, ιστορικό) | E3 /app/filming/[id] | filming.view | both | old-filming-request-review |
| production-filming-approve | Εγκρίνω Γύρισμα σε κατάσταση «αναμένει έγκριση» | E3 /app/filming/[id] | viewerCan.approve | app | — |
| production-filming-reject | Απορρίπτω Γύρισμα με υποχρεωτικό λόγο | E3 /app/filming/[id] | viewerCan.reject | app | — |
| production-filming-reschedule | Αλλάζω μέρα ή ώρα Γυρίσματος («Αλλαγή μέρας/ώρας») | E3 /app/filming/[id] | viewerCan.reschedule | app | — |
| production-filming-mark-done | Σημειώνω «Έγινε» και πόση ώρα κράτησε | E3 /app/filming/[id] | viewerCan.markDone | app | — |
| production-filming-mark-no-show | Σημειώνω «Δεν έγινε» μετά από επιβεβαίωση | E3 /app/filming/[id] | viewerCan.markNoShow | app | — |
| production-filming-cancel | Ακυρώνω Γύρισμα από την ομάδα με υποχρεωτικό λόγο | E3 /app/filming/[id] | viewerCan.cancel | both | old-calendar-event-delete |
| production-filming-undo-outcome | Αναιρώ «έγινε» ή «δεν έγινε» που μπήκε κατά λάθος, με λόγο | E3 /app/filming/[id] | viewerCan.undo | app | — |
| production-filming-decide-reschedule-accept | Εγκρίνω μετάθεση που ζήτησε ο πελάτης | E3 /app/filming/[id] | viewerCan.decideReschedule | app | — |
| production-filming-decide-reschedule-refuse | Απορρίπτω μετάθεση που ζήτησε ο πελάτης, με λόγο | E3 /app/filming/[id] | viewerCan.decideReschedule | app | — |
| production-filming-decide-cancel | Δέχομαι ή Αρνούμαι αίτημα ακύρωσης του πελάτη | E3 /app/filming/[id] | viewerCan.decideCancel | app | — |
| production-filming-crew-add | Προσθέτω άτομο στο Συνεργείο | E3 /app/filming/[id] | viewerCan.crew | both | old-filming-prep-assign-crew |
| production-filming-crew-remove | Αφαιρώ άτομο από το Συνεργείο | E3 /app/filming/[id] | viewerCan.crew | app | — |
| production-filming-crew-apply-template | Εφαρμόζω Πρότυπο Συνεργείου στο Γύρισμα | E3 /app/filming/[id] | viewerCan.crew | app | — |
| production-filming-crew-reply | Απαντώ «Επιβεβαιώνω» ή «Δεν μπορώ» ως μέλος του Συνεργείου | E3 /app/filming/[id] | any-team | app | — |
| production-filming-equipment-reserve | Δεσμεύω αντικείμενο Εξοπλισμού στο Γύρισμα | E3 /app/filming/[id] | viewerCan.equipment | both | old-filming-prep-equipment-edit |
| production-filming-equipment-release | Αποδεσμεύω αντικείμενο Εξοπλισμού από το Γύρισμα | E3 /app/filming/[id] | viewerCan.equipment | app | — |
| production-filming-equipment-apply-template | Εφαρμόζω Πρότυπο Εξοπλισμού στο Γύρισμα | E3 /app/filming/[id] | viewerCan.equipment | app | — |
| production-filming-details-edit | Αλλάζω τα στοιχεία χώρου του Γυρίσματος (επαφή, τηλέφωνο, φάκελος αρχείων) | E3 /app/filming/[id] | team.canEditDetails | both | old-calendar-event-edit |
| production-filming-sheet-save | Γράφω το Δελτίο γυρίσματος (λήψεις, πλάνο) και τη σημείωση για το Συνεργείο | E3 /app/filming/[id] | sheet.canEdit | both | old-filming-prep-shot-list-create, old-filming-prep-shot-list-save, old-filming-prep-concept-note-create, old-filming-prep-concept-note-edit, old-filming-prep-concept-note-delete |
| production-filming-sheet-issue | Στέλνω το Δελτίο γυρίσματος ή νέα έκδοσή του στο Συνεργείο | E3 /app/filming/[id] | sheet.canEdit | app | — |
| production-filming-related-links | Ανοίγω τη Συμφωνία, την Παραγωγή και τα Γυρίσματα συνδεδεμένα με το Γύρισμα | E3 /app/filming/[id] | any-team | app | — |
| production-booking-new-client | Κλείνω νέο Γύρισμα για Πελάτη (Συμφωνία, ώρες, μέρα, ώρα, τοποθεσία, σημείωση) | E4 /app/filming/new | filming.book | both | old-calendar-event-create |
| production-booking-new-internal | Κλείνω Εσωτερικό Γύρισμα σε Εσωτερική Παραγωγή (χωρίς Πελάτη) | E4 /app/filming/new | filming.book | app | — |
| production-booking-new-from-blocked | Μετατρέπω Κλεισμένο χρόνο σε Γύρισμα (προσυμπλήρωση φόρμας) | E4 /app/filming/new | filming.book | app | — |
| production-booking-new-from-request | Δημιουργώ Γύρισμα από αίτημα μηνύματος του πελάτη (προσυμπλήρωση) | E4 /app/filming/new | filming.book | both | old-filming-request-convert-project |
| production-booking-guide | Στήνω Γύρισμα με τον οδηγό (μέρα με πιασμένα διαστήματα, κλειστές Παραγωγές) | E4 /app/filming/new | filming.book | app | — |
| production-booking-reopen-production | Ξανανοίγω Παραδομένη Παραγωγή από τον οδηγό, με λόγο | E4 /app/filming/new | filming.book | app | — |
| production-booking-pick-agreement-kind | Διαλέγω Συμφωνία, Πακέτο και Τι κλείνω | E5 /app/book | c.book | app | — |
| production-booking-pick-hours-day-time | Διαλέγω ώρες, μέρα και ώρα έναρξης | E5 /app/book | c.book | app | — |
| production-booking-confirm | Επιβεβαιώνω κράτηση Γυρίσματος | E5 /app/book | c.book | app | — |
| production-booking-request-extra | Ζητώ επιπλέον Γύρισμα (αίτημα μηνύματος) όταν δεν μένει στο πακέτο | E5 /app/book | c.book | app | — |
| production-booking-reschedule | Μετακινώ υπάρχον Γύρισμα σε νέα μέρα ή ώρα (?reschedule) | E5 /app/book | c.book | app | — |
| production-crew-template-list | Βλέπω τα Πρότυπα Συνεργείου | E7 /app/filming/crew-templates | filming.crew | app | — |
| production-crew-template-create | Δημιουργώ Πρότυπο Συνεργείου με άτομα | E7 /app/filming/crew-templates | filming.crew | app | — |
| production-crew-template-edit | Αλλάζω Πρότυπο Συνεργείου | E7 /app/filming/crew-templates | filming.crew | app | — |
| production-crew-template-delete | Διαγράφω Πρότυπο Συνεργείου | E7 /app/filming/crew-templates | filming.crew | app | — |
| production-google-deletion-view | Βλέπω Γυρίσματα που διαγράφηκαν στο Google | A7 /app/calendar/google-deletions | calendar.google | app | — |
| production-google-deletion-confirm-cancel | Επιβεβαιώνω την ακύρωση Γυρίσματος που διαγράφηκε στο Google | A7 /app/calendar/google-deletions | calendar.google | both | old-google-sync-confirm-delete |
| production-google-deletion-confirm-keep | Επιβεβαιώνω την απόρριψη της διαγραφής (κρατώ το Γύρισμα) | A7 /app/calendar/google-deletions | calendar.google | both | old-google-sync-keep-after-delete |
| production-equipment-registry-view | Βλέπω το μητρώο Εξοπλισμού | F1 /app/equipment | equipment.view | app | — |
| production-equipment-registry-filter | Φιλτράρω Εξοπλισμό με αναζήτηση, Κατηγορία και Κατάσταση | F1 /app/equipment | equipment.view | app | — |
| production-equipment-open-item | Ανοίγω αντικείμενο Εξοπλισμού | F1 /app/equipment | equipment.view | app | — |
| production-equipment-item-create | Προσθέτω νέο αντικείμενο (ή περισσότερα) στο μητρώο | F1 /app/equipment | equipment.manage | app | — |
| production-equipment-category-create | Δημιουργώ Κατηγορία Εξοπλισμού | F1 /app/equipment | equipment.manage | app | — |
| production-equipment-category-rename | Μετονομάζω Κατηγορία Εξοπλισμού | F1 /app/equipment | equipment.manage | app | — |
| production-equipment-category-retire | Αποσύρω Κατηγορία Εξοπλισμού | F1 /app/equipment | equipment.manage | app | — |
| production-equipment-category-restore | Επαναφέρω αποσυρμένη Κατηγορία Εξοπλισμού | F1 /app/equipment | equipment.manage | app | — |
| production-equipment-category-delete | Διαγράφω Κατηγορία Εξοπλισμού | F1 /app/equipment | equipment.manage | app | — |
| production-equipment-item-view | Βλέπω στοιχεία αντικειμένου, κατάσταση, ιστορικό και δεσμεύσεις του | F2 /app/equipment/[id] | equipment.view | app | — |
| production-equipment-item-edit | Αλλάζω στοιχεία αντικειμένου (όνομα, κατηγορία, κωδικός, σημείωση) | F2 /app/equipment/[id] | equipment.manage | app | — |
| production-equipment-item-repair | Βάζω αντικείμενο σε επισκευή, με λόγο και πότε επιστρέφει | F2 /app/equipment/[id] | equipment.manage | app | — |
| production-equipment-item-available | Κάνω αντικείμενο ξανά διαθέσιμο | F2 /app/equipment/[id] | equipment.manage | app | — |
| production-equipment-item-retire | Αποσύρω αντικείμενο με προαιρετικό λόγο | F2 /app/equipment/[id] | equipment.manage | app | — |
| production-equipment-item-delete | Διαγράφω αντικείμενο που δεν δεσμεύτηκε ποτέ | F2 /app/equipment/[id] | equipment.manage | app | — |
| production-equipment-reserve | Δεσμεύω αντικείμενο σε ανοιχτό Γύρισμα | F2 /app/equipment/[id] | equipment.reserve | app | — |
| production-equipment-release | Αποδεσμεύω δέσμευση αντικειμένου από Γύρισμα | F2 /app/equipment/[id] | equipment.reserve | app | — |
| production-equipment-templates-view | Βλέπω τα Πρότυπα εξοπλισμού | F3 /app/equipment/templates | equipment.view | app | — |
| production-equipment-template-create | Δημιουργώ Πρότυπο εξοπλισμού με αντικείμενα | F3 /app/equipment/templates | equipment.reserve | app | — |
| production-equipment-template-edit | Αλλάζω Πρότυπο εξοπλισμού | F3 /app/equipment/templates | equipment.reserve | app | — |
| production-equipment-template-delete | Διαγράφω Πρότυπο εξοπλισμού | F3 /app/equipment/templates | equipment.reserve | app | — |
| production-productions-list-view | Βλέπω τη λίστα των Παραγωγών ανά προβολή | G1 /app/productions | productions.manage | both | old-projects-view-list |
| production-productions-filter-client | Φιλτράρω Παραγωγές ανά Πελάτη | G1 /app/productions | productions.manage | app | — |
| production-productions-board-view | Βλέπω τον Πίνακα Σταδίων | G1 /app/productions | productions.manage | app | — |
| production-productions-board-move | Μετακινώ Παραγωγή σε άλλο Στάδιο στον πίνακα | G1 /app/productions | productions.manage | both | old-projects-board-status |
| production-productions-stages-edit | Προσθέτω, μετονομάζω, μετακινώ και (απ)ενεργοποιώ Στάδια | G1 /app/productions | production_stages_view.canEdit | app | — |
| production-productions-workload-view | Βλέπω τον Φόρτο ανά άτομο | G1 /app/productions | productions.manage | app | — |
| production-productions-create-internal | Δημιουργώ Νέα Εσωτερική Παραγωγή | G1 /app/productions | productions.manage | both | old-projects-create, old-clients-project-create |
| production-productions-open | Ανοίγω Παραγωγή από τη λίστα ή τον πίνακα | G1 /app/productions | productions.manage | app | — |
| production-production-view | Βλέπω Παραγωγή (στοιχεία, Γυρίσματα, Παραδοτέα, εργασίες) | G2 /app/productions/[id] | productions.manage | both | old-projects-edit, old-projects-view-overview |
| production-production-deliver | Παραδίδω Παραγωγή χειροκίνητα, με υποχρεωτικό σχόλιο | G2 /app/productions/[id] | viewerCan.deliver | app | — |
| production-production-reopen | Ξανανοίγω Παραδομένη Παραγωγή, με υποχρεωτικό λόγο | G2 /app/productions/[id] | viewerCan.reopen | app | — |
| production-production-cancel | Ακυρώνω Παραγωγή, με υποχρεωτικό λόγο | G2 /app/productions/[id] | viewerCan.cancel | both | old-projects-delete |
| production-production-change-owner | Αλλάζω τον Υπεύθυνο της Παραγωγής | G2 /app/productions/[id] | viewerCan.transfer | both | old-projects-assign |
| production-production-member-add | Προσθέτω Μέλος στην Παραγωγή | G2 /app/productions/[id] | viewerCan.members | app | — |
| production-production-member-remove | Αφαιρώ Μέλος από την Παραγωγή | G2 /app/productions/[id] | viewerCan.members | app | — |
| production-production-task-add | Προσθέτω Εργασία στην Παραγωγή | G2 /app/productions/[id] | viewerCan.members | both | old-projects-tasks-create |
| production-production-task-edit | Αλλάζω τίτλο, ανάθεση ή προθεσμία Εργασίας | G2 /app/productions/[id] | viewerCan.members | both | old-projects-tasks-edit |
| production-production-task-status | Σημειώνω Εργασία ως ολοκληρωμένη ή την ανοίγω ξανά | G2 /app/productions/[id] | viewerCan.members | both | old-projects-tasks-status |
| production-production-task-priority | Αλλάζω προτεραιότητα Εργασίας | G2 /app/productions/[id] | viewerCan.members | app | — |
| production-production-task-delete | Διαγράφω Εργασία | G2 /app/productions/[id] | viewerCan.members | both | old-projects-tasks-delete |
| production-production-trail | Βλέπω το ίχνος ενεργειών της Παραγωγής | G2 /app/productions/[id] | viewerCan.members | app | — |
| production-production-money-view | Βλέπω Τιμή και Τιμολογητέα της Παραγωγής (όχι για Εσωτερικές) | G2 /app/productions/[id] | any-team | app | — |
| production-production-costs-link | Ανοίγω Κόστος και ώρες της Παραγωγής | G2 /app/productions/[id] | finance.cost | app | — |
| production-production-new-deliverable | Δημιουργώ Νέο Παραδοτέο από την Παραγωγή | G2 /app/productions/[id] | deliverables.work | app | — |
| production-production-open-filming | Ανοίγω Γύρισμα ή Παραδοτέο της Παραγωγής | G2 /app/productions/[id] | any-team | app | — |
| production-production-notes-thread | Ανοίγω τη Συνομιλία των μηνυμάτων της ετικέτας | G2 /app/productions/[id] | any-team | both | old-projects-messages-send |
| production-deliverables-queue-view | Βλέπω την ουρά των Παραδοτέων | H1 /app/deliverables | deliverables.work | app | — |
| production-deliverables-queue-tabs | Φιλτράρω την ουρά με «για μένα», «προς έλεγχο» και «στον πελάτη» | H1 /app/deliverables | deliverables.work | app | — |
| production-deliverables-filter-who | Φιλτράρω «Μόνο εμένα» ή «Όλη η ομάδα» | H1 /app/deliverables | deliverables.work | app | — |
| production-deliverables-filter-late | Φιλτράρω τα Παραδοτέα που «Καθυστερούν» | H1 /app/deliverables | deliverables.work | app | — |
| production-deliverables-filter-client | Φιλτράρω Παραδοτέα ανά Πελάτη | H1 /app/deliverables | deliverables.work | app | — |
| production-deliverables-review-table | Βλέπω τα Παραδοτέα που περιμένουν έλεγχο | H1 /app/deliverables | deliverables.review | app | — |
| production-deliverables-charges-panel | Βλέπω και αποφασίζω τις Αποφάσεις χρέωσης | H1 /app/deliverables | finance.amounts | app | — |
| production-deliverables-rules-view | Βλέπω τους Κανόνες Παραδοτέων (μόνο ανάγνωση) | H1 /app/deliverables | deliverables.review | app | — |
| production-deliverables-open-item | Ανοίγω Παραδοτέο από την ουρά | H1 /app/deliverables | deliverables.work | app | — |
| production-deliverable-view | Βλέπω Παραδοτέο (Εκδόσεις, σχόλια, χρεώσεις, αιτήματα, ίχνος) | H2 /app/deliverables/[id] | deliverables.work | app | — |
| production-deliverable-edit | Αλλάζω ανατεθειμένο, προθεσμία και στοιχεία Παραδοτέου | H2 /app/deliverables/[id] | detail.can.edit | both | old-projects-deliverables-edit |
| production-deliverable-final-files | Βάζω τελικά αρχεία (link) στο Παραδοτέο | H2 /app/deliverables/[id] | detail.can.edit | both | old-projects-deliverables-download |
| production-deliverable-cancel | Ακυρώνω Παραδοτέο με λόγο | H2 /app/deliverables/[id] | detail.can.cancel | both | old-projects-deliverables-delete |
| production-deliverable-add-version | Δημιουργώ Νέα Έκδοση (link) του Παραδοτέου | H2 /app/deliverables/[id] | detail.can.addVersion | both | old-projects-deliverables-upload |
| production-deliverable-fix-link | Διορθώνω το link μιας Έκδοσης | H2 /app/deliverables/[id] | detail.can.edit | app | — |
| production-deliverable-approve-internal | Εγκρίνω Έκδοση οριστικά στον εσωτερικό έλεγχο | H2 /app/deliverables/[id] | detail.can.approveInternal | app | — |
| production-deliverable-send | Στέλνω Έκδοση στον πελάτη | H2 /app/deliverables/[id] | detail.can.send | both | old-projects-deliverables-status |
| production-deliverable-return | Επιστρέφω Έκδοση για αλλαγές, με λόγο | H2 /app/deliverables/[id] | detail.can.return | both | old-projects-deliverables-revision |
| production-deliverable-comment-add | Προσθέτω σχόλιο σε Έκδοση (με χρόνο στο video, προαιρετικά) | H2 /app/deliverables/[id] | detail.can.comment | both | old-projects-annotations-comment |
| production-deliverable-comment-reply | Απαντώ σε σχόλιο Έκδοσης | H2 /app/deliverables/[id] | detail.can.comment | app | — |
| production-deliverable-comment-resolve | Επιλύω σχόλιο Έκδοσης | H2 /app/deliverables/[id] | detail.can.comment | both | old-projects-annotations-resolve |
| production-deliverable-charge-decide | Αποφασίζω χρέωση του Παραδοτέου (Χρεώνεται ή Χωρίς χρέωση) | H2 /app/deliverables/[id] | detail.can.decideCharge | app | — |
| production-deliverable-round-charge-decide | Αποφασίζω χρέωση γύρου πέρα από το όριο | H2 /app/deliverables/[id] | detail.can.decideRoundCharge | app | — |
| production-deliverable-request-decide | Αποφασίζω αίτημα αλλαγής μετά την έγκριση (δεκτό ως γύρος ή με χρέωση) | H2 /app/deliverables/[id] | any-team | app | — |
| production-deliverable-request-amounts | Βλέπω ποσά των αιτημάτων αλλαγής | H2 /app/deliverables/[id] | finance.amounts | app | — |
| production-deliverable-open-filming | Ανοίγω το Γύρισμα του Παραδοτέου | H2 /app/deliverables/[id] | any-team | app | — |
| production-deliverable-create | Δημιουργώ Νέο Παραδοτέο (φόρμα «Νέο Παραδοτέο» μέσα στην Παραγωγή) | G2 /app/productions/[id] | deliverables.work | app | — |

## Χρήματα

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| money-invoices-list | Βλέπω όλα τα Τιμολόγια με Σύνολο, Εξοφλήθηκε και Υπόλοιπο | I2 /app/finance/invoices | finance.view + finance.amounts(all) | both | old-invoices-view-list |
| money-invoices-totals | Βλέπω τις κάρτες «Μπήκαν», «Τιμολογήθηκαν» και «Μας χρωστούν» του μήνα | I2 /app/finance/invoices | finance.view + finance.amounts(all) | app | — |
| money-invoices-totals-link | Ανοίγω τις Αναφορές Τζίρου και Ανεξόφλητων από τις κάρτες | I2 /app/finance/invoices | reports.view | app | — |
| money-invoices-filter-status | Φιλτράρω τα Τιμολόγια σε όλα, ανεξόφλητα, ληξιπρόθεσμα ή πιστωτικά | I2 /app/finance/invoices | finance.view + finance.amounts(all) | app | — |
| money-invoices-filter-client | Φιλτράρω τα Τιμολόγια ανά Πελάτη (με αναζήτηση) | I2 /app/finance/invoices | finance.view + finance.amounts(all) | app | — |
| money-invoices-filter-month | Φιλτράρω τα Τιμολόγια ανά μήνα έκδοσης | I2 /app/finance/invoices | finance.view + finance.amounts(all) | app | — |
| money-invoices-open-register | Ανοίγω την Καταχώρηση Τιμολογίου | I2 /app/finance/invoices | finance.invoices | app | — |
| money-invoices-export-csv | Εξάγω τις γραμμές που βλέπω σε CSV | I2 /app/finance/invoices | finance.view + finance.amounts(all) | both | old-invoices-export-csv |
| money-invoices-open-detail | Ανοίγω ένα Τιμολόγιο από τον αριθμό του | I2 /app/finance/invoices | finance.view + finance.amounts(all) | app | — |
| money-invoices-pdf-list | Κατεβάζω το PDF ενός Τιμολογίου από τη γραμμή του | I2 /app/finance/invoices + /app/finance/invoices/[id]/pdf | finance.view + finance.amounts(all) | app | — |
| money-invoices-collect-row | Καταχωρώ Είσπραξη από τη γραμμή ενός ανεξόφλητου Τιμολογίου | I2 /app/finance/invoices | finance.receipts | both | old-projects-invoices-mark-paid, old-clients-invoice-mark-paid |
| money-invoices-correct-row | Διορθώνω ή ακυρώνω Τιμολόγιο από τη γραμμή του | I2 /app/finance/invoices | finance.invoices | app | — |
| money-invoices-voided-card | Βλέπω τις ακυρωμένες καταχωρίσεις με τον λόγο ακύρωσης | I2 /app/finance/invoices (filter=all) | finance.view + finance.amounts(all) | app | — |
| money-invoice-register-client | Διαλέγω Πελάτη για νέα καταχώριση Τιμολογίου (και τον αλλάζω) | I3 /app/finance/invoices/new | finance.invoices | both | old-projects-invoices-create, old-clients-invoice-create |
| money-invoice-register-pdf | Ανεβάζω το PDF του Τιμολογίου (έως 4 MB) | I3 /app/finance/invoices/new | finance.invoices | both | old-invoices-upload-pdf |
| money-invoice-register-fields | Συμπληρώνω είδος, αριθμό, ημερομηνίες, καθαρό, ΦΠΑ, σύνολο, ΜΑΡΚ και ΑΦΜ του PDF | I3 /app/finance/invoices/new | finance.invoices | app | — |
| money-invoice-register-credit | Καταχωρώ πιστωτικό που διορθώνει υπάρχον Τιμολόγιο | I3 /app/finance/invoices/new | finance.invoices | app | — |
| money-invoice-register-tax-confirm | Επιβεβαιώνω ότι η διαφορά ΑΦΜ του PDF είναι σωστή | I3 /app/finance/invoices/new | finance.invoices | app | — |
| money-invoice-register-submit | Επιβεβαιώνω και καταχωρώ το Τιμολόγιο (στέλνει email με το PDF στους Χρήστες του Πελάτη) | I3 /app/finance/invoices/new | finance.invoices | both | old-invoices-mark-sent |
| money-invoice-register-again | Ξεκινώ νέα καταχώριση μετά την επιτυχία | I3 /app/finance/invoices/new | finance.invoices | app | — |
| money-invoice-trail | Βλέπω το Ίχνος μιας καταχώρισης | I3 /app/finance/invoices/new?invoice=[id] | finance.invoices | app | — |
| money-invoice-correct-fields | Διορθώνω αριθμό, ημερομηνίες, ποσά ή ΜΑΡΚ μιας καταχώρισης με λόγο (χωρίς email) | I3 /app/finance/invoices/new?invoice=[id] | finance.invoices | app | — |
| money-invoice-void | Ακυρώνω μια καταχώριση με υποχρεωτικό λόγο | I3 /app/finance/invoices/new?invoice=[id] | finance.invoices | both | old-invoices-delete |
| money-invoice-detail-view | Βλέπω ένα Τιμολόγιο με Σύνολο, Εξοφλήθηκε, Υπόλοιπο και Λήξη | I8 /app/finance/invoices/[id] | finance.view + finance.amounts(all) | both | old-invoices-view-detail |
| money-invoice-detail-payments | Βλέπω τις Πληρωμές του Τιμολογίου (ποσό, Τρόπος, παρακράτηση) | I8 /app/finance/invoices/[id] | finance.view + finance.amounts(all) | app | — |
| money-invoice-detail-collect | Καταχωρώ Είσπραξη για το υπόλοιπο του Τιμολογίου | I8 /app/finance/invoices/[id] | finance.receipts | both | old-invoices-record-payment |
| money-invoice-detail-pdf | Κατεβάζω το PDF του Τιμολογίου | I8 /app/finance/invoices/[id] | finance.view + finance.amounts(all) | both | old-invoices-preview-pdf, old-invoices-download-pdf |
| money-invoice-detail-correct | Ανοίγω τη Διόρθωση ή ακύρωση του Τιμολογίου | I8 /app/finance/invoices/[id] | finance.invoices | app | — |
| money-invoice-detail-related | Ανοίγω τον Πελάτη, τις Συμφωνίες και τις Παραγωγές που αφορά το Τιμολόγιο | I8 /app/finance/invoices/[id] | finance.view + finance.amounts(all) | app | — |
| money-invoice-detail-trail | Βλέπω το Ίχνος του Τιμολογίου | I8 /app/finance/invoices/[id] | finance.view + finance.amounts(all) | app | — |
| money-to-invoice-list | Βλέπω τι περιμένει τιμολόγηση ανά Πελάτη, με σύνολο και μέρες ανοιχτό | I1 /app/finance/to-invoice | finance.view + finance.amounts(all) | app | — |
| money-to-invoice-register-link | Καταχωρώ Τιμολόγιο για τον Πελάτη από την ομάδα του | I1 /app/finance/to-invoice | finance.invoices | app | — |
| money-receipts-list | Βλέπω τις Εισπράξεις με ποσό, Τιμολόγια, Τρόπο, σημείωση και ποιος τις καταχώρισε | I4 /app/finance/receipts | finance.view + finance.amounts(all) | app | — |
| money-receipts-export-csv | Εξάγω τις Εισπράξεις της σελίδας σε CSV | I4 /app/finance/receipts | finance.view + finance.amounts(all) | app | — |
| money-receipts-register | Καταχωρώ νέα Είσπραξη (ποσό, ημερομηνία, Τρόπος, σημείωση) | I4 /app/finance/receipts | finance.receipts | app | — |
| money-receipts-invoice-pick | Διαλέγω τα Τιμολόγια στα οποία κατανέμεται η Είσπραξη (ή αφήνω το παλαιότερο) | I4 /app/finance/receipts | finance.receipts | app | — |
| money-receipts-withholding | Βάζω παρακράτηση φόρου με είδος και ποσό | I4 /app/finance/receipts | finance.receipts | app | — |
| money-receipts-preview | Βλέπω προεπισκόπηση της κατανομής πριν την καταχώρηση | I4 /app/finance/receipts | finance.receipts | app | — |
| money-receipts-prefill | Ανοίγω τη φόρμα Είσπραξης έτοιμη για συγκεκριμένο Τιμολόγιο | I4 /app/finance/receipts?client=&invoice= | finance.receipts | app | — |
| money-receipts-correct | Διορθώνω Είσπραξη με λόγο (ποσό, ημερομηνία, Τρόπος, σημείωση, παρακράτηση) | I4 /app/finance/receipts | finance.receipts | app | — |
| money-receipts-delete | Διαγράφω Είσπραξη με υποχρεωτικό λόγο | I4 /app/finance/receipts | finance.receipts | app | — |
| money-ledger-client-pick | Διαλέγω Πελάτη για να δω την Καρτέλα του | I5 /app/finance/ledger | finance.view + finance.amounts(all) | app | — |
| money-ledger-balance | Βλέπω υπόλοιπο λογαριασμού, ληξιπρόθεσμο και υπόλοιπο υπέρ του Πελάτη | I5 /app/finance/ledger | finance.view + finance.amounts(all) | app | — |
| money-ledger-movements | Βλέπω τις κινήσεις της Καρτέλας με χρέωση, πίστωση και υπόλοιπο | I5 /app/finance/ledger | finance.view + finance.amounts(all) | app | — |
| money-ledger-copy-iban | Αντιγράφω το IBAN για πληρωμή | I5 /app/finance/ledger | finance.view + finance.amounts(all) | app | — |
| money-ledger-to-invoice-link | Ανοίγω τα Τιμολογητέα από την Καρτέλα | I5 /app/finance/ledger | finance.view + finance.amounts(all) | app | — |
| money-expenses-view | Βλέπω έξοδα και Κόστος ώρας του μήνα | I6 /app/finance/expenses | finance.cost | both | old-expenses-view-list |
| money-expenses-month | Αλλάζω μήνα στα Έξοδα | I6 /app/finance/expenses?month= | finance.cost | app | — |
| money-expenses-history | Βλέπω ιστορικό Κόστους ώρας ανά μήνα | I6 /app/finance/expenses | finance.cost | app | — |
| money-expenses-add-category | Προσθέτω κατηγορία εξόδων (μόνο τρέχων ή επόμενος μήνας) | I6 /app/finance/expenses | finance.costManage + finance.cost (canEdit από cost_expenses_view) | app | — |
| money-expenses-edit-lines | Γράφω είδη και γραμμές εξόδων με περιγραφή και ποσό | I6 /app/finance/expenses | finance.costManage + finance.cost (canEdit από cost_expenses_view) | both | old-expenses-create |
| money-expenses-remove | Αφαιρώ κατηγορία, είδος ή γραμμή και το Αναιρώ | I6 /app/finance/expenses | finance.costManage + finance.cost (canEdit από cost_expenses_view) | both | old-expenses-delete |
| money-expenses-hours | Γράφω παραγωγικές ώρες του μήνα | I6 /app/finance/expenses | finance.costManage + finance.cost (canEdit από cost_expenses_view) | app | — |
| money-expenses-save | Αποθηκεύω τα Έξοδα του μήνα (ισχύουν από αυτόν τον μήνα και μετά) | I6 /app/finance/expenses | finance.costManage + finance.cost (cost_save_expenses) | app | — |
| money-profit-view | Βλέπω Κερδοφορία των τελευταίων 12 μηνών: τιμή, κόστος και περιθώριο | I7 /app/finance/profitability | finance.cost | app | — |
| money-profit-switch | Αλλάζω προβολή Κερδοφορίας (ανά Παραγωγή, Πελάτη ή μήνα) | I7 /app/finance/profitability?view= | finance.cost | app | — |
| money-profit-production-link | Ανοίγω την Παραγωγή από την Κερδοφορία (G3) | I7 /app/finance/profitability | finance.cost | app | — |
| money-reports-catalogue | Βλέπω τον κατάλογο Αναφορών (Οικονομικές και Πωλήσεων) | M1 /app/reports | reports.view | both | old-reports-view, old-leads-view-sales-report |
| money-report-turnover | Βλέπω Τζίρο ανά μήνα (τιμολογήθηκε και μπήκε) | M1 /app/reports?report=turnover | reports.view + finance.view | app | — |
| money-report-by-client | Βλέπω Τζίρο ανά Πελάτη | M1 /app/reports?report=by-client | reports.view + finance.view | app | — |
| money-report-receivables | Βλέπω Ανεξόφλητα ανά ηλικία και τα ληξιπρόθεσμα | M1 /app/reports?report=receivables | reports.view + finance.view | app | — |
| money-report-receivables-client-link | Ανοίγω την Καρτέλα (I5) ή τη Σελίδα Πελάτη από τα Ανεξόφλητα | M1 /app/reports?report=receivables | reports.view + finance.view (I5 με finance.amounts(all)) | app | — |
| money-report-profit | Βλέπω Έσοδα, Έξοδα και Κέρδος ανά μήνα | M1 /app/reports?report=profit | reports.view + finance.view + finance.cost | app | — |
| money-report-expenses | Βλέπω Έξοδα ανά κατηγορία | M1 /app/reports?report=expenses | reports.view + finance.cost (ή finance.amounts(all)) | app | — |
| money-report-payment-methods | Βλέπω Τρόπους είσπραξης | M1 /app/reports?report=payment-methods | reports.view + finance.view | app | — |
| money-report-productions | Βλέπω Παραγωγές ανά κατάσταση και είδος | M1 /app/reports?report=productions | reports.view + productions.manage | app | — |
| money-report-sales-pipeline | Βλέπω το Pipeline πωλήσεων ανά Στάδιο και αξία | M1 /app/reports?report=pipeline | reports.view + clients.manage | app | — |
| money-report-sales-results | Βλέπω κερδισμένες και χαμένες Ευκαιρίες και τον λόγο | M1 /app/reports?report=results | reports.view + clients.manage | app | — |
| money-report-sales-sources | Βλέπω τις Πηγές δουλειάς | M1 /app/reports?report=sources | reports.view + clients.manage | app | — |
| money-report-filter-period | Αλλάζω Περίοδο Αναφοράς | M1 /app/reports?report=…&period= | reports.view | both | old-reports-date-filter |
| money-report-filter-client | Φιλτράρω Αναφορά ανά Πελάτη | M1 /app/reports?report=…&client= | reports.view | app | — |
| money-report-filter-seller | Φιλτράρω Αναφορά πωλήσεων ανά Πωλητή | M1 /app/reports?report=…&seller= | reports.view + clients.manage | app | — |
| money-report-basis | Βλέπω πώς μετράει κάθε Αναφορά | M1 /app/reports?report=… | reports.view | app | — |
| money-report-export-xlsx | Εξάγω την Αναφορά σε Excel | M1 /app/reports?report=… | reports.export | app | — |
| money-report-export-csv | Εξάγω την Αναφορά σε CSV | M1 /app/reports?report=… | reports.export | app | — |
| money-reports-cost-link | Ανοίγω Κόστος και ώρες (G3) από τις Αναφορές | M1 /app/reports | finance.cost | app | — |
| money-reports-export-link | Ανοίγω την Εξαγωγή δεδομένων (M2) από τις Αναφορές | M1 /app/reports | reports.export | app | — |
| money-export-open | Βλέπω τη σελίδα Εξαγωγής δεδομένων | M2 /app/reports/export | reports.export | app | — |
| money-export-pack-month | Αλλάζω μήνα στο Πακέτο λογιστή | M2 /app/reports/export?month= | reports.export + finance.view | app | — |
| money-export-pack-download | Κατεβάζω το Πακέτο λογιστή (.zip με Excel Τιμολογίων, Εισπράξεων, Εξόδων και τα PDF Τιμολογίων του μήνα) | M2 /app/reports/export | reports.export + finance.view | app | — |
| money-export-dataset-choice | Διαλέγω σύνολο δεδομένων (Τιμολόγια, Εισπράξεις, Τιμολογητέα, Καρτέλες, Πελάτες, Συμφωνίες, Έξοδα) | M2 /app/reports/export?dataset= | reports.export + finance.view / clients.view / agreements.view / finance.cost ανά σύνολο | app | — |
| money-export-dataset-period | Διαλέγω Περίοδο για το σύνολο δεδομένων | M2 /app/reports/export?period= | reports.export | app | — |
| money-export-dataset-download | Εξάγω το σύνολο δεδομένων σε Excel ή CSV | M2 /app/reports/export?format= | reports.export + πηγή του συνόλου | app | — |
| money-export-history | Βλέπω το ιστορικό εξαγωγών | M2 /app/reports/export | reports.export | app | — |
| money-costs-picker | Διαλέγω Παραγωγή από την κάρτα (τρεις ομάδες, με αναζήτηση) | G3 /app/productions/costs?production= | finance.cost | app | — |
| money-costs-detail | Βλέπω εκτίμηση, πραγματικό κόστος και διαφορά της Παραγωγής | G3 /app/productions/costs?production= | finance.cost | app | — |
| money-costs-signals | Βλέπω σήματα: χωρίς πραγματικές ώρες, υπέρβαση κόστους, εσωτερική δουλειά | G3 /app/productions/costs?production= | finance.cost | both | old-pricing-health-view |
| money-costs-hours-save | Αποθηκεύω ώρες γυρίσματος, μοντάζ και άμεσο κόστος (με επιβεβαίωση μοντάζ) | G3 /app/productions/costs?production= | finance.costManage + finance.cost (canEdit από production_cost_view) | app | — |
| money-costs-internal-estimate | Αποθηκεύω εκτίμηση εσωτερικής δουλειάς (ώρες γυρίσματος, μοντάζ, άμεσο κόστος) | G3 /app/productions/costs?production= | finance.costManage + finance.cost (μόνο εσωτερική Παραγωγή) | app | — |
| money-costs-production-link | Ανοίγω την Παραγωγή (G2) από το κόστος της | G3 /app/productions/costs?production= | finance.cost | app | — |
| money-catalogue-prices-link | Ανοίγω τον Κατάλογο (Τιμές) από τα Χρήματα | C1 /app/catalogue (σύνδεσμος του Χώρου) | catalogue.view | app | — |

## Εταιρεία

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| company-team-view-active | Βλέπω τους ενεργούς Χρήστες ομάδας | `N1 /app/team` | access.team | both | old-users-view-list |
| company-team-view-inactive | Βλέπω τους απενεργοποιημένους Χρήστες ομάδας (καρτέλα «Απενεργοποιημένοι») | `N1 /app/team?status=inactive` | access.team | app | — |
| company-team-open-user | Ανοίγω τη σελίδα ενός Χρήστη ομάδας | `N1 /app/team/[userId]` | access.team | app | — |
| company-team-view-role-reach | Βλέπω τι βλέπει κάθε Ρόλος ομάδας (πίνακας Τι βλέπει ο καθένας) | `N1 /app/team` | access.team | app | — |
| company-team-view-invitations | Βλέπω τις προσκλήσεις σε εκκρεμότητα και τη λήξη τους | `N1 /app/team` | access.team | app | — |
| company-team-invite-member | Προσκαλώ άνθρωπο της ομάδας με έναν ή περισσότερους Ρόλους και γλώσσα πρόσκλησης | `N1 /app/team#n1-invite` / `N6 /app/team/invite` | access.team | both | old-users-invite-member, old-settings-team-invite |
| company-team-invite-client-user | Προσκαλώ Χρήστη Πελάτη σε Πελάτη με Ρόλο πελάτη | `N1 /app/team#n1-invite` / `N6 /app/team/invite?kind=client&client=<id>` | access.clientUsers | app | — |
| company-team-invite-reactivate-offer | Επανενεργοποιώ απενεργοποιημένο Χρήστη όταν το email που προσκαλώ του ανήκει | `N1 /app/team` | access.team | app | — |
| company-team-invite-resend | Ξαναστέλνω πρόσκληση σε εκκρεμότητα (νέος σύνδεσμος 7 ημερών) | `N1 /app/team` | access.team | app | — |
| company-team-invite-cancel | Ακυρώνω πρόσκληση σε εκκρεμότητα | `N1 /app/team` | access.team | app | — |
| company-team-user-change-roles | Αλλάζω Ρόλους Χρήστη ομάδας (με προεπισκόπηση Ρόλων) | `N1 /app/team/[userId]` | access.team | both | old-users-change-role, old-settings-team-change-role |
| company-team-user-deactivate | Απενεργοποιώ Χρήστη ομάδας αφού δω τις ανοιχτές αναθέσεις του | `N1 /app/team/[userId]?confirm=deactivate` | access.team | both | old-users-deactivate-member, old-settings-team-deactivate |
| company-team-user-reactivate | Επανενεργοποιώ Χρήστη ομάδας με τους Ρόλους που είχε | `N1 /app/team/[userId]` | access.team | both | old-users-reactivate-member |
| company-team-user-view-history | Ανοίγω το ιστορικό αλλαγών του Χρήστη ομάδας στο Ίχνος | `N1 /app/team/[userId]` | audit.view | app | — |
| company-team-gdpr-export-user | Εξάγω τα δεδομένα Χρήστη ομάδας (GDPR) | `N1 /app/team/[userId]` | owner | app | — |
| company-team-gdpr-anonymize-user | Ανωνυμοποιώ Χρήστη ομάδας (GDPR) γράφοντας το όνομά του για επιβεβαίωση | `N1 /app/team/[userId]?confirm=anonymize` | owner | app | — |
| company-team-gdpr-view-requests | Βλέπω το μητρώο των αιτημάτων GDPR και τα ανοιχτά | `N1 /app/team/gdpr` | owner | app | — |
| company-team-gdpr-new-request | Καταγράφω νέο αίτημα GDPR (εξαγωγή ή ανωνυμοποίηση) για Χρήστη | `N1 /app/team/gdpr` | owner | app | — |
| company-team-gdpr-complete-request | Κλείνω αίτημα GDPR με ημερομηνία ολοκλήρωσης και σημείωση | `N1 /app/team/gdpr` | owner | app | — |
| company-team-gdpr-export-detached-user | Εξάγω δεδομένα Χρήστη πελάτη που δεν ανήκει σε Πελάτη | `N1 /app/team/gdpr` | owner | app | — |
| company-roles-view-list | Βλέπω Ρόλους ομάδας και Ρόλους πελάτη με πλήθος Χρηστών | `N4 /app/team/roles` | owner | app | — |
| company-roles-view-owner-only | Βλέπω τη λίστα των ενεργειών που κάνει μόνο ο Ιδιοκτήτης | `N4 /app/team/roles` | owner | app | — |
| company-roles-new | Φτιάχνω νέο Ρόλο ομάδας ή πελάτη με όνομα | `N4 /app/team/roles/new?kind=team | client` | owner | app | — |
| company-roles-new-copy-from | Φτιάχνω Ρόλο ως «Αντίγραφο του» έτοιμου ή δικού μου Ρόλου | `N4 /app/team/roles/new?from=<id>` | owner | app | — |
| company-roles-edit-name-description | Αλλάζω όνομα και περιγραφή Ρόλου | `N4 /app/team/roles/[roleId]` | owner | app | — |
| company-roles-edit-permissions | Αλλάζω Δικαιώματα και Εύρος («Όσα με αφορούν» / «Όλα» / Ναι-Όχι) ενός Ρόλου | `N4 /app/team/roles/[roleId]` | owner | app | — |
| company-roles-save-preview | Βλέπω ποιοι Χρήστες επηρεάζονται πριν αποθηκεύσω Ρόλο και επιβεβαιώνω | `N4 /app/team/roles/[roleId]` | owner | app | — |
| company-roles-view-holders | Βλέπω τους Χρήστες που έχουν κάθε Ρόλο | `N4 /app/team/roles/[roleId]` | owner | app | — |
| company-roles-give-to-user | Δίνω Ρόλο σε Χρήστη από τη σελίδα του Ρόλου | `N4 /app/team/roles/[roleId]` | owner | app | — |
| company-roles-first-steps | Γράφω το κείμενο της κάρτας «Πρώτα βήματα» για τον Ρόλο | `N4 /app/team/roles/[roleId]#role-first-steps` | owner | app | — |
| company-roles-delete-free | Διαγράφω Ρόλο που δεν τον έχει κανείς, από τη λίστα | `N4 /app/team/roles` | owner | app | — |
| company-roles-delete-move | Διαγράφω Ρόλο που τον έχουν Χρήστες, μετακινώντας τους σε άλλο Ρόλο | `N4 /app/team/roles/[roleId]?confirm=delete` | owner | app | — |
| company-roles-view-history | Ανοίγω το ιστορικό αλλαγών του Ρόλου στο Ίχνος | `N4 /app/team/roles/[roleId]` | audit.view | app | — |
| company-settings-company-view | Βλέπω τις Ρυθμίσεις Εταιρείας | `O1 /app/settings/company` | settings.manage | app | — |
| company-settings-edit-details | Αλλάζω Στοιχεία εταιρείας (επωνυμία, διακριτικός τίτλος, διεύθυνση, τηλέφωνο, email, email απαντήσεων) | `O1 /app/settings/company` | settings.manage | both | old-settings-company-profile-save |
| company-settings-edit-signer | Αλλάζω Υπογράφοντα εταιρείας (όνομα, ιδιότητα) | `O1 /app/settings/company` | settings.manage | app | — |
| company-settings-edit-tax | Αλλάζω Φορολογικά (ΑΦΜ, ΔΟΥ, ΓΕΜΗ) | `O1 /app/settings/company` | owner | app | — |
| company-settings-edit-vat | Αλλάζω γενικό συντελεστή ΦΠΑ | `O1 /app/settings/company` | owner | app | — |
| company-settings-logo-upload | Ανεβάζω λογότυπο (PNG, JPG ή WebP έως 1 MB) | `O1 /app/settings/company` | settings.manage | both | old-settings-branding-save |
| company-settings-logo-remove | Αφαιρώ το λογότυπο | `O1 /app/settings/company` | settings.manage | app | — |
| company-settings-bank-add | Προσθέτω λογαριασμό τράπεζας (τράπεζα, δικαιούχος, IBAN) | `O1 /app/settings/company?bank=new` | owner | app | — |
| company-settings-bank-set-default | Ορίζω προεπιλεγμένο λογαριασμό τράπεζας | `O1 /app/settings/company` | owner | app | — |
| company-settings-bank-retire | Αποσύρω λογαριασμό τράπεζας | `O1 /app/settings/company` | owner | app | — |
| company-settings-assistant-limits | Αλλάζω όρια Βοηθού (μηνύματα ανά Συζήτηση και ανά διεύθυνση τη μέρα) | `O1 /app/settings/company` | settings.manage | app | — |
| company-settings-assistant-cap | Αλλάζω πλαφόν AI μήνα και μερίδιο widget | `O1 /app/settings/company` | owner | app | — |
| company-settings-view-ai-spend | Βλέπω τη δαπάνη AI του μήνα | `O1 /app/settings/company` | settings.manage | app | — |
| company-settings-view-recent-changes | Βλέπω τις τελευταίες αλλαγές των Ρυθμίσεων και ανοίγω όλες στο Ίχνος | `O1 /app/settings/company` | audit.view | app | — |
| company-sales-settings-view | Βλέπω τις Ρυθμίσεις Πωλήσεων | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-routing-edit | Αλλάζω πού πάνε οι νέες Ευκαιρίες από τη φόρμα (Ιδιοκτήτης, συγκεκριμένο πρόσωπο ή κοινή ουρά) | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-guide-edit | Ορίζω Ενότητα Γνώσης ως Οδηγό πωλήσεων | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-list-add | Προσθέτω νέα τιμή σε Στάδια, Πηγές, Λόγους απώλειας ή Είδη Δραστηριότητας | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-list-rename | Μετονομάζω τιμή λίστας πωλήσεων | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-list-move | Αλλάζω σειρά τιμής λίστας πωλήσεων (↑ ↓) | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-list-delete | Διαγράφω τιμή λίστας πωλήσεων που δεν έχει χρησιμοποιηθεί ποτέ | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-list-retire | Αποσύρω τιμή λίστας πωλήσεων | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-stage-retire-transfer | Αποσύρω Στάδιο μεταφέροντας τις ανοιχτές Ευκαιρίες σε άλλο Στάδιο | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-list-reactivate | Επανενεργοποιώ αποσυρμένη τιμή λίστας πωλήσεων | `O2 /app/settings/sales?retired=1` | settings.manage | app | — |
| company-sales-source-needs-detail | Ορίζω ότι μια Πηγή θέλει περιγραφή στη Νέα Ευκαιρία | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-stage-probability | Ορίζω προεπιλεγμένη Πιθανότητα % για Στάδιο | `O2 /app/settings/sales` | settings.manage | app | — |
| company-sales-show-retired | Δείχνω ή κρύβω τις αποσυρμένες τιμές των λιστών | `O2 /app/settings/sales?retired=1` | settings.manage | app | — |
| company-agreements-settings-view | Βλέπω τις Ρυθμίσεις Συμφωνιών | `O3 /app/settings/agreements` | settings.manage | both | old-contracts-templates-view |
| company-agreements-email-status | Βλέπω αν η αποστολή email των Συμφωνιών είναι συνδεδεμένη | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-terms-switch | Εναλλάσσω σετ Όρων (Μηνιαίες ή Εφάπαξ Συμφωνίες) | `O3 /app/settings/agreements?set=monthly | one_off` | both | old-contracts-templates-delete | — |
| company-agreements-terms-save | Αλλάζω Όρους Συμφωνίας προεπιλογής (μέρες πληρωμής, χάρη, διάρκεια, ανανέωση, ρήτρα λύσης, δόσεις) | `O3 /app/settings/agreements?set=…` | settings.manage | both | old-contracts-templates-create, old-contracts-templates-edit |
| company-agreements-policy-save | Αλλάζω Πολιτική Γυρισμάτων (ώρες προειδοποίησης και ακύρωσης, καύση Παροχής) | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-pricing-save | Αλλάζω Προεπιλογές τιμολόγησης (ισχύς πρότασης, προκαταβολή, τυπική έκπτωση) | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-kind-add | Προσθέτω Είδος Παροχής (ελληνικά και αγγλικά, μονάδα, τρόπος μέτρησης) | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-kind-edit | Αλλάζω Είδος Παροχής (ετικέτες, μονάδα, προεπιλεγμένη διάρκεια) | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-kind-move | Αλλάζω σειρά Είδους Παροχής (↑ ↓) | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-kind-retire | Αποσύρω Είδος Παροχής | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-kind-reactivate | Επανενεργοποιώ αποσυρμένο Είδος Παροχής | `O3 /app/settings/agreements?retired=1` | settings.manage | app | — |
| company-agreements-kind-delete | Διαγράφω Είδος Παροχής που δεν έχει χρησιμοποιηθεί | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-agreements-show-retired-kinds | Δείχνω ή κρύβω τα αποσυρμένα Είδη Παροχής | `O3 /app/settings/agreements?retired=1` | settings.manage | app | — |
| company-agreements-revision-limits-save | Αλλάζω όριο αλλαγών (γύροι) ανά Είδος Παροχής | `O3 /app/settings/agreements` | settings.manage | app | — |
| company-finance-settings-view | Βλέπω τα στοιχεία κόστους των Οικονομικών (έξοδα, ώρες, Εύρος τιμής) | `O6 /app/settings/finance` | finance.cost | both | old-cost-model-view-summary |
| company-finance-open-expenses | Ανοίγω Έξοδα και Κόστος ώρας από τις Ρυθμίσεις Οικονομικών | `O6 /app/settings/finance` → `I6 /app/finance/expenses` | finance.cost | app | — |
| company-finance-month-costs-save | Αλλάζω Έξοδα ενός μήνα (τρέχων και έως 6 μήνες μπροστά) | `O6 /app/settings/finance` | finance.costManage | app | — |
| company-finance-hours-cost-save | Αλλάζω Παραγωγικές ώρες και Κόστος ώρας ενός μήνα | `O6 /app/settings/finance` | finance.costManage | both | old-cost-model-settings-save |
| company-finance-multipliers-save | Αλλάζω πολλαπλασιαστές Εύρους τιμής Πακέτων και Υπηρεσιών | `O6 /app/settings/finance` | finance.costManage | app | — |
| company-finance-overrun-save | Αλλάζω Όριο Υπέρβασης κόστους (%) | `O6 /app/settings/finance` | finance.costManage | app | — |
| company-finance-payment-method-add | Προσθέτω Τρόπο είσπραξης | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-payment-method-rename | Μετονομάζω Τρόπο είσπραξης | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-payment-method-retire | Αποσύρω Τρόπο είσπραξης (χωρίς διαγραφή) | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-payment-method-restore | Επαναφέρω αποσυρμένο Τρόπο είσπραξης | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-withholding-add | Προσθέτω ποσοστό παρακράτησης φόρου | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-withholding-edit | Αλλάζω ονομασία ή ποσοστό παρακράτησης φόρου | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-withholding-retire | Αποσύρω ποσοστό παρακράτησης φόρου | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-withholding-restore | Επαναφέρω αποσυρμένο ποσοστό παρακράτησης φόρου | `O6 /app/settings/finance` | settings.manage | app | — |
| company-finance-view-recent-changes | Βλέπω τις τελευταίες αλλαγές Οικονομικών ρυθμίσεων (και ανοίγω το Ίχνος) | `O6 /app/settings/finance` | audit.view | app | — |
| company-readiness-view | Βλέπω τον Έλεγχο ετοιμότητας (τι λείπει πριν ανοίξω σε πελάτες) | `O7 /app/settings/readiness` | settings.manage | app | — |
| company-readiness-fix-line | Ανοίγω τη σελίδα όπου συμπληρώνεται κάθε εκκρεμής γραμμή ετοιμότητας | `O7 /app/settings/readiness` | settings.manage | app | — |
| company-readiness-confirm-manual | Επιβεβαιώνω ή αναιρώ χειροκίνητο στοιχείο ετοιμότητας | `O7 /app/settings/readiness` | owner | app | — |
| company-readiness-open-to-clients | Πατάω «Άνοιγμα σε πελάτες» όταν εκκρεμούν 0 στοιχεία | `O7 /app/settings/readiness` | owner | app | — |
| company-readiness-open-confirm | Επιβεβαιώνω το μη αναστρέψιμο άνοιγμα σε πελάτες | `O7 /app/settings/readiness?open=confirm` | owner | app | — |
| company-integrations-view | Βλέπω τις συνδέσεις (Google, Email, AI, Turnstile, GA4/Pixel) με κατάσταση και χρήση | `O8 /app/settings/integrations` | owner | app | — |
| company-integrations-check-now | Πατάω «Έλεγχος τώρα» σε σύνδεση Google, Email ή AI | `O8 /app/settings/integrations` | owner | both | old-api-google-calendar-diag |
| company-integrations-analytics-save | Αλλάζω GA4 Measurement ID και Meta Pixel ID | `O8 /app/settings/integrations` | owner | app | — |
| company-integrations-test-email | Στέλνω δοκιμαστικό email στον εαυτό μου | `O8 /app/settings/integrations` | owner | app | — |
| company-integrations-google-create-calendar | Δημιουργώ ημερολόγιο Google Γυρισμάτων και το μοιράζω σε email | `O8 /app/settings/integrations` | owner | both | old-api-google-calendar-setup |
| company-integrations-google-sync-now | Πατάω «Συγχρονισμός τώρα» με το Google ημερολόγιο | `O8 /app/settings/integrations` | owner | app | — |
| company-integrations-google-resync-all | Πατάω «Ξαναγράψε όλα» για τα Γυρίσματα στο Google | `O8 /app/settings/integrations` | owner | app | — |
| company-integrations-subscription-add | Προσθέτω συνδρομή (πάροχος, τι, πλάνο, μηνιαίο κόστος, ανανέωση, πληρώνει) | `O8 /app/settings/integrations?sub=new` | owner | app | — |
| company-integrations-subscription-edit | Επεξεργάζομαι συνδρομή | `O8 /app/settings/integrations?sub=<id>` | owner | app | — |
| company-integrations-subscription-delete | Διαγράφω συνδρομή | `O8 /app/settings/integrations?sub=<id>` | owner | app | — |
| company-integrations-subscriptions-total | Βλέπω σύνολο μηνιαίων συνδρομών | `O8 /app/settings/integrations` | owner | app | — |
| company-integrations-open-sends | Ανοίγω Ιστορικό αποστολών από τις Ενσωματώσεις | `O8 /app/settings/integrations` → `K3 /app/settings/sends` | owner | app | — |
| company-automations-view-catalogue | Βλέπω τον κατάλογο Αυτοματισμών ανά ομάδα Γεγονότων | `K1 /app/settings/automations` | automations.manage | app | — |
| company-automations-filter | Φιλτράρω Γεγονότα ανά ομάδα και κατάσταση (με Ενεργούς, Προς πελάτη, Σβηστούς, Συνδεδεμένα) | `K1 /app/settings/automations?group=&only=` | automations.manage | app | — |
| company-automations-open-event | Ανοίγω Γεγονός και τους Αυτοματισμούς του | `K1 /app/settings/automations/[event]` | automations.manage | app | — |
| company-automations-add | Προσθέτω Αυτοματισμό σε Γεγονός | `K1 /app/settings/automations/[event]` | automations.manage | app | — |
| company-automations-edit | Αλλάζω Αυτοματισμό (κανάλι, παραλήπτες, χρονισμός, θέμα και κείμενο el/en, «Απαραίτητο») | `K1 /app/settings/automations/[event]` | automations.manage | both | old-settings-notifications-save |
| company-automations-toggle-enabled | Ενεργοποιώ ή απενεργοποιώ Αυτοματισμό με τον διακόπτη «Ενεργός» | `K1 /app/settings/automations/[event]` | automations.manage | app | — |
| company-automations-delete | Διαγράφω Αυτοματισμό με δύο βήματα επιβεβαίωσης (όχι τους αρχικούς, αυτοί μόνο σβήνουν) | `K1 /app/settings/automations/[event]` | automations.manage | app | — |
| company-automations-holidays-view | Βλέπω τις Αργίες της χρονιάς στο Γεγονός «Αργία» | `K1 /app/settings/automations/holiday.greeting` | automations.manage | app | — |
| company-automations-holiday-add | Προσθέτω αργία (όνομα, ημερομηνία, κάθε χρόνο) | `K1 /app/settings/automations/holiday.greeting` | automations.manage | app | — |
| company-automations-holiday-toggle | Ενεργοποιώ ή απενεργοποιώ αργία | `K1 /app/settings/automations/holiday.greeting` | automations.manage | app | — |
| company-automations-holiday-remove | Σβήνω αργία που πρόσθεσα εγώ | `K1 /app/settings/automations/holiday.greeting` | automations.manage | app | — |
| company-system-messages-view | Βλέπω τα Μηνύματα συστήματος | `K2 /app/settings/system-messages` | automations.manage | app | — |
| company-system-messages-edit | Αλλάζω κείμενο Μηνύματος συστήματος (ελληνικά και αγγλικά, με προεπισκόπηση) | `K2 /app/settings/system-messages/[code]` | automations.manage | app | — |
| company-system-messages-reset | Επαναφέρω το αρχικό κείμενο Μηνύματος συστήματος | `K2 /app/settings/system-messages/[code]` | automations.manage | app | — |
| company-sends-view | Βλέπω Ιστορικό αποστολών (Στάλθηκαν, Προγραμματισμένα, Απέτυχαν) | `K3 /app/settings/sends` | automations.manage | app | — |
| company-sends-filter | Φιλτράρω αποστολές ανά πελάτη και κανάλι | `K3 /app/settings/sends` | automations.manage | app | — |
| company-sends-paginate | Βλέπω παλαιότερες ή επόμενες αποστολές | `K3 /app/settings/sends` | automations.manage | app | — |
| company-sends-retry | Ξαναστέλνω αποτυχημένη αποστολή με επιβεβαίωση | `K3 /app/settings/sends?tab=failed` | automations.manage | app | — |
| company-health-view | Βλέπω Υγεία συστήματος (σύνοψη, εργασίες, αποστολές, Google, κολλημένα Γεγονότα, Βοηθός) | `P2 /app/health` | health.view | app | — |
| company-health-external-check | Ανοίγω τον εξωτερικό έλεγχο παρακολούθησης του συστήματος | `P2 /app/health` | health.view | app | — |
| company-health-down-view | Βλέπω τι γίνεται όταν το σύστημα δεν απαντά | `P2 /app/health?view=down` | health.view | app | — |
| company-health-resend-failed-send | Ξαναστέλνω αποτυχημένη αποστολή από την Υγεία (με επιβεβαίωση) | `P2 /app/health` | health.view | app | — |
| company-health-ignore-failed-send | Αγνοώ αποτυχημένη αποστολή (γράφεται στο Ίχνος) | `P2 /app/health` | health.view | app | — |
| company-health-retry-stuck-event | Ξαναδοκιμάζω κολλημένο Γεγονός (με επιβεβαίωση) | `P2 /app/health` | health.view | app | — |
| company-health-open-sends | Ανοίγω Ιστορικό αποστολών από την Υγεία | `P2 /app/health` → `K3 /app/settings/sends?tab=failed` | health.view | app | — |
| company-health-open-assistant-settings | Ανοίγω όρια Βοηθού (O1) και χρήση και συνδρομές (O8) από την Υγεία | `P2 /app/health` | owner | app | — |
| company-audit-view | Βλέπω Ίχνος ενεργειών | `P1 /app/audit` | audit.view | app | — |
| company-audit-filter | Φιλτράρω Ίχνος ανά πρόσωπο, περιοχή, οντότητα, ενέργεια και περίοδο | `P1 /app/audit?who=&area=&entity=&action=&period=` | audit.view | app | — |
| company-audit-paginate | Βλέπω παλαιότερες εγγραφές Ίχνους | `P1 /app/audit?before=&beforeId=` | audit.view | app | — |
| company-audit-export | Εξάγω Ίχνος σε Excel ή CSV με τα ίδια φίλτρα | `P1 /app/audit` | reports.export | app | — |
| company-knowledge-manage-view-items | Βλέπω στοιχεία Γνώσης (πρόχειρα και δημοσιευμένα) | `L1 /app/knowledge/manage` | knowledge.manage | both | old-university-view, old-chatbot-knowledge-view |
| company-knowledge-manage-filter | Φιλτράρω στοιχεία Γνώσης ανά κατάσταση και Ενότητα | `L1 /app/knowledge/manage?status=&section=` | knowledge.manage | app | — |
| company-knowledge-create-article | Φτιάχνω νέο Άρθρο | `L1 /app/knowledge/manage` | knowledge.manage | both | old-university-article-create |
| company-knowledge-create-file | Φτιάχνω νέο στοιχείο τύπου Αρχείο | `L1 /app/knowledge/manage` | knowledge.manage | app | — |
| company-knowledge-edit-content | Αλλάζω τίτλο, περίληψη και κείμενο (Markdown) στοιχείου | `L1 /app/knowledge/manage/[id]` | knowledge.manage | both | old-university-article-edit |
| company-knowledge-insert-image | Ανεβάζω εικόνα και τη βάζω στο κείμενο | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-insert-video | Βάζω βίντεο (YouTube, Vimeo ή Google Drive) στο κείμενο | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-preview | Βλέπω προεπισκόπηση του κειμένου πριν τη δημοσίευση | `L1 /app/knowledge/manage/[id]` | knowledge.manage | both | old-university-article-preview |
| company-knowledge-file-upload | Ανεβάζω ή αντικαθιστώ Αρχείο στοιχείου (έως 25 MB) | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-file-download | Κατεβάζω το Αρχείο του στοιχείου | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-audience-save | Αλλάζω Κοινό στοιχείου (Ρόλοι ομάδας και πελάτη, και «δημόσιο») | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-publish | Δημοσιεύω πρόχειρο στοιχείο (με λίστα όσων λείπουν) | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-unpublish | Αποσύρω δημοσιευμένο στοιχείο | `L1 /app/knowledge/manage/[id]` | knowledge.manage | app | — |
| company-knowledge-delete-item | Διαγράφω στοιχείο Γνώσης | `L1 /app/knowledge/manage/[id]` | knowledge.manage | both | old-university-article-delete, old-chatbot-knowledge-delete |
| company-knowledge-sections-view | Βλέπω τις Ενότητες της Γνώσης | `L1 /app/knowledge/manage?tab=sections` | knowledge.manage | app | — |
| company-knowledge-section-create | Προσθέτω Ενότητα | `L1 /app/knowledge/manage?tab=sections` | knowledge.manage | both | old-university-category-save |
| company-knowledge-section-edit | Μετονομάζω Ενότητα | `L1 /app/knowledge/manage?tab=sections` | knowledge.manage | app | — |
| company-knowledge-section-move | Αλλάζω σειρά Ενότητας (↑ ↓) | `L1 /app/knowledge/manage?tab=sections` | knowledge.manage | app | — |
| company-knowledge-section-delete | Διαγράφω Ενότητα | `L1 /app/knowledge/manage?tab=sections` | knowledge.manage | both | old-university-category-delete |
| company-knowledge-rebuild-memory | Ξαναφτιάχνω τη μνήμη του Βοηθού από τη Γνώση | `L1 /app/knowledge/manage` | knowledge.manage | both | old-chatbot-knowledge-seed |
| company-knowledge-link-unanswered | Ανοίγω Αναπάντητες ερωτήσεις από τη Διαχείριση Γνώσης | `L1 /app/knowledge/manage` → `L3 /app/knowledge/unanswered` | knowledge.manage | app | — |
| company-knowledge-link-conversations | Ανοίγω Συζητήσεις Βοηθού από τη Διαχείριση Γνώσης | `L1 /app/knowledge/manage` → `L2 /app/knowledge/conversations` | knowledge.manage | app | — |
| company-knowledge-link-assistant-limits | Ανοίγω τα όρια του Βοηθού στις Ρυθμίσεις Εταιρείας | `L1 /app/knowledge/manage` → `O1 /app/settings/company#assistant` | settings.manage | app | — |
| company-knowledge-conversations-list | Βλέπω Συζητήσεις Βοηθού (όλες, δημόσιες, πελατών ή ομάδας) | `L2 /app/knowledge/conversations?tab=&page=` | knowledge.manage | app | — |
| company-knowledge-conversation-open | Ανοίγω μία Συζήτηση Βοηθού (μόνο ανάγνωση) | `L2 /app/knowledge/conversations/[id]` | knowledge.manage | both | old-chatbot-conversation-view |
| company-knowledge-conversation-delete | Διαγράφω Συζήτηση Βοηθού με επιβεβαίωση | `L2 /app/knowledge/conversations/[id]` | knowledge.manage | both | old-chatbot-conversation-delete |
| company-knowledge-conversations-usage | Βλέπω κατανάλωση Βοηθού του μήνα και το όριό της | `L2 /app/knowledge/conversations` | health.view | both | old-chatbot-view-stats |
| company-knowledge-unanswered-list | Βλέπω Αναπάντητες ερωτήσεις (Ανοιχτές, Καλύφθηκαν, Αγνοήθηκαν) | `L3 /app/knowledge/unanswered?tab=` | knowledge.manage | app | — |
| company-knowledge-unanswered-cover | Κλείνω ερώτηση ως «Καλύφθηκε» από δημοσιευμένο στοιχείο | `L3 /app/knowledge/unanswered?close=<id>` | knowledge.manage | app | — |
| company-knowledge-unanswered-ignore | Αγνοώ ερώτηση με λόγο | `L3 /app/knowledge/unanswered?close=<id>&reason=` | knowledge.manage | app | — |
| company-knowledge-unanswered-reopen | Ξανανοίγω κλειστή ερώτηση | `L3 /app/knowledge/unanswered` | knowledge.manage | app | — |
| company-knowledge-unanswered-new-article | Φτιάχνω νέο Άρθρο για ερώτηση που λείπει | `L3 /app/knowledge/unanswered?close=<id>` → `L1 /app/knowledge/manage` | knowledge.manage | app | — |
| company-colleagues-view | Βλέπω τους συναδέλφους στον τρέχοντα Πελάτη μου | `N3 /app/colleagues` | c.colleagues | app | — |
| company-colleagues-invite | Προσκαλώ συνάδελφο στον τρέχοντα Πελάτη μου | `N3 /app/colleagues` | c.colleagues | app | — |
| company-colleagues-remove | Αφαιρώ συνάδελφο από τον Πελάτη μου (με επιβεβαίωση) | `N3 /app/colleagues` | c.colleagues | app | — |
| company-kit-view | Βλέπω τον κατάλογο στοιχείων του Kit (κουμπιά, πεδία, πίνακες, καταστάσεις) | `KIT /app/kit` | owner | app | — |
| company-kit-switch-state | Αλλάζω την κατάσταση δείγματος στα Χειριστήρια του Kit (?f=) | `KIT /app/kit?f=` | owner | app | — |

## Κοινές οθόνες (Γνώση, Ρυθμίσεις, Προφίλ, Είσοδος, δημόσιοι σύνδεσμοι)

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| misc-knowledge-search | Αναζητώ στη «Γνώση» με το πεδίο «Αναζήτηση στη Γνώση» και το κουμπί «Αναζήτηση» (?q=, ελληνικό full-text στο Κοινό μου) | `A8 /app/knowledge` | any-team (team ή client, signed-in) | app | — |
| misc-knowledge-browse-sections | Βλέπω τις Ενότητες με τα δημοσιευμένα στοιχεία του Κοινού μου (Περίληψη, είδος) και ανοίγω μία Ενότητα (?section=) με «← Όλη η Γνώση» για επιστροφή | `A8 /app/knowledge` | any-team (team ή client, signed-in) | app | — |
| misc-knowledge-open-item | Ανοίγω ένα στοιχείο της Γνώσης από τη λίστα (σελίδα άρθρου/αρχείου) | `A8 /app/knowledge` | any-team (team ή client, signed-in) | app | — |
| misc-knowledge-to-manage | Πηγαίνω στη «Διαχείριση Γνώσης →» (L1) από τη «Γνώση» | `A8 /app/knowledge` | knowledge.manage | app | — |
| misc-knowledge-item-read-article | Διαβάζω ένα Άρθρο της Γνώσης (Ενότητα, ημερομηνία ενημέρωσης, Περίληψη, κείμενο markdown) | `A8 /app/knowledge/[id]` | any-team (team ή client, signed-in) | app | — |
| misc-knowledge-item-download-file | Κατεβάζω το αρχείο ενός στοιχείου Γνώσης με το κουμπί «Λήψη» (βλέπω «Αρχείο», «Μέγεθος») | `A8 /app/knowledge/[id]` | any-team (team ή client, signed-in) | app | — |
| misc-knowledge-item-back | Γυρίζω πίσω στη «← Γνώση» | `A8 /app/knowledge/[id]` | any-team (team ή client, signed-in) | app | — |
| misc-knowledge-item-assistant-note | Βλέπω ως διαχειριστής σημείωση ότι ο Βοηθός διαβάζει μόνο την Περίληψη ενός Αρχείου που είναι εικόνα | `A8 /app/knowledge/[id]` | knowledge.manage | app | — |
| misc-production-costs-redirect | Ανοίγω την παλιά διεύθυνση του κόστους μιας Παραγωγής και μεταφέρομαι στην οθόνη «Κόστος και ώρες» με επιλεγμένη την Παραγωγή (redirect, καμία δική της ενέργεια) | `G3 /app/productions/[id]/costs` → `/app/productions/costs?production=` | finance.cost (ελέγχεται στο G3) | app | — |
| misc-costs-pick-production | Διαλέγω Παραγωγή από τις ομάδες του επιλογέα «Παραγωγές» (θέλουν ώρες / υπέρβαση / υπόλοιπες) με αναζήτηση | `G3 /app/productions/costs` (στόχος του redirect) | finance.cost | app | — |
| misc-costs-view-figures | Βλέπω τα νούμερα κόστους της Παραγωγής και τα σήματα «Χωρίς πραγματικές ώρες» και «Υπέρβαση κόστους» | `G3 /app/productions/costs` (στόχος του redirect) | finance.cost | app | — |
| misc-costs-save-hours | Γράφω «Ώρες γυρίσματος», «Ώρες μοντάζ» και «Πραγματικό άμεσο κόστος» και πατάω «Αποθήκευση ωρών» στην «Πραγματικές ώρες» | `G3 /app/productions/costs` (στόχος του redirect) | finance.costManage | app | — |
| misc-costs-confirm-hours | Τσεκάρω «Επιβεβαιώνω τις ώρες γυρίσματος» και την αντίστοιχη επιβεβαίωση ωρών μοντάζ | `G3 /app/productions/costs` (στόχος του redirect) | finance.costManage | app | — |
| misc-costs-internal-estimate | Αποθηκεύω «Εκτίμηση εσωτερικής δουλειάς» (Γύρισμα ώρες, Μοντάζ ώρες, Άμεσο κόστος €) με «Αποθήκευση εκτίμησης», μόνο σε Εσωτερική Παραγωγή (προαιρετική, μόνο ο Ιδιοκτήτης) | `G3 /app/productions/costs` (στόχος του redirect) | finance.costManage | app | — |
| misc-costs-back-to-production | Επιστρέφω στην Παραγωγή με «Πίσω στην Παραγωγή (G2)» | `G3 /app/productions/costs` (στόχος του redirect) | finance.cost | app | — |
| misc-settings-redirect-company | Ανοίγω τις «Ρυθμίσεις» και πάω αυτόματα στην πρώτη καρτέλα, «Εταιρεία» (redirect, καμία δική της ενέργεια) | `O1 /app/settings` → `/app/settings/company` | settings.manage | app | — |
| misc-settings-tabs-nav | Μετακινούμαι ανάμεσα στις καρτέλες Ρυθμίσεων «Εταιρεία», «Πωλήσεις», «Συμφωνίες», «Γυρίσματα», «Παραδοτέα», «Οικονομικά», «Μηνύματα» και «Έλεγχος ετοιμότητας» | `O4/O5/messages /app/settings/*` (κοινό SettingsTabs) | settings.manage | app | — |
| misc-settings-deliverables-internal-review | Επιλέγω «Εσωτερικός έλεγχος πριν τον πελάτη» ναι/όχι και πατάω «Αποθήκευση» στην κάρτα «Εσωτερικός έλεγχος και αλλαγές» | `O5 /app/settings/deliverables` | settings.manage | app | — |
| misc-settings-deliverables-rework-deadline | Ορίζω «Νέα προθεσμία μετά από «χρειάζεται αλλαγές» (εργάσιμες)» (0 έως 30) | `O5 /app/settings/deliverables` | settings.manage | app | — |
| misc-settings-deliverables-kind-deadlines | Ορίζω «Προθεσμία (εργάσιμες)» (1 έως 90) ανά είδος Παροχής στην «Προθεσμία ανά είδος Παροχής» και πατάω «Αποθήκευση» | `O5 /app/settings/deliverables` | settings.manage | app | — |
| misc-settings-deliverables-links | Ακολουθώ τους συνδέσμους «αλλάζει στις Συμφωνίες» (όριο αλλαγών, μόνο ανάγνωση) και «Αυτοματισμούς» (υπενθυμίσεις πελάτη) | `O5 /app/settings/deliverables` | settings.manage (και automations.manage για το link στους Αυτοματισμούς) | app | — |
| misc-settings-filming-tabs | Αλλάζω μέρος των Ρυθμίσεων Γυρισμάτων από τις καρτέλες «Κανόνες», «Ωράριο και Χωρητικότητα», «Αργίες», «Είδη κλεισμένου χρόνου», «Ημερολόγιο Google» (?part=) | `O4 /app/settings/filming` | settings.manage | app | — |
| misc-settings-filming-rules | Αλλάζω τους έντεκα «Κανόνες γυρισμάτων» (έγκριση κράτησης Πελάτη, «Ορίζοντας κρατήσεων (μέρες)», εκτός Περιόδου, μετάθεση, «Αν ο Πελάτης δεν απαντήσει», «Χωρίς απάντηση μετά από (ώρες)», «Σύγκρουση εξοπλισμού», «Ο Πελάτης βλέπει τον Εξοπλισμό», μηδενισμός απαντήσεων, «Αποστολή δελτίου», «Σήμανση «έγινε»») και πατάω «Αποθήκευση» | `O4 /app/settings/filming` | settings.manage | app | — |
| misc-settings-filming-weekday-hours | Ορίζω το «Εβδομαδιαίο πρόγραμμα» κρατήσεων: για κάθε μέρα της εβδομάδας «ανοιχτά/κλειστά» και ώρες «από» και «έως» | `O4 /app/settings/filming` (καρτέλα «Ωράριο και Χωρητικότητα», ?part=hours) | settings.manage | both | old-settings-booking-weekday-hours |
| misc-settings-filming-capacity | Ορίζω τη «Χωρητικότητα» (πόσα Γυρίσματα χωράνε ταυτόχρονα, 1 έως 20) | `O4 /app/settings/filming` (?part=hours) | settings.manage | both | old-settings-booking-capacity |
| misc-settings-filming-durations | Επιλέγω τις «Επιτρεπτές διάρκειες» (ώρες) που μπορεί να διαλέξει ο πελάτης | `O4 /app/settings/filming` (?part=hours) | settings.manage | both | old-settings-booking-durations |
| misc-settings-filming-slot-step | Επιλέγω το «Βήμα ώρας έναρξης» (διάστημα slot) | `O4 /app/settings/filming` (?part=hours) | settings.manage | both | old-settings-booking-slot-interval |
| misc-settings-filming-exception-add | Προσθέτω «+ Νέα εξαίρεση» για μια μέρα (Μέρα, «Τι ισχύει»: Κλειστή ή Άλλες ώρες, Από, Έως, Χωρητικότητα προαιρετική, Σημείωση) με «Προσθήκη εξαίρεσης» | `O4 /app/settings/filming` (?part=hours) | settings.manage | both | old-availability-set-day |
| misc-settings-filming-exception-delete | Διαγράφω μια εξαίρεση ημέρας με «Διαγραφή» από τις «Εξαιρέσεις ανά μέρα» | `O4 /app/settings/filming` (?part=hours) | settings.manage | app | — |
| misc-settings-filming-holiday-toggle | Ανοίγω μια επίσημη αργία ως εξαίρεση («Άνοιγμα ως εξαίρεση») ή τη «Κλείσιμο ξανά» (μόνο μελλοντικές) | `O4 /app/settings/filming` (?part=holidays) | settings.manage | app | — |
| misc-settings-filming-kind-add | Προσθέτω «+ Νέο Είδος» κλεισμένου χρόνου με «Προσθήκη Είδους» | `O4 /app/settings/filming` (?part=calendar) | settings.manage | app | — |
| misc-settings-filming-kind-rename | Μετονομάζω ένα Είδος κλεισμένου χρόνου («Μετονομασία», «Αποθήκευση») | `O4 /app/settings/filming` (?part=calendar) | settings.manage | app | — |
| misc-settings-filming-kind-style | Αλλάζω «Χρώμα», «Εικονίδιο» και «Μπορεί να γίνει Γύρισμα» ενός Είδους | `O4 /app/settings/filming` (?part=calendar) | settings.manage | app | — |
| misc-settings-filming-kind-retire-restore | Αποσύρω ένα Είδος («Απόσυρση») ή το επαναφέρω («Επαναφορά»), χωρίς διαγραφή | `O4 /app/settings/filming` (?part=calendar) | settings.manage | app | — |
| misc-settings-filming-google-rules | Ορίζω τους «Κανόνες ημερολογίου Google»: «Νέο γεγονός από το Google», «Προθεσμία επιβεβαίωσης διαγραφής», «Γράφονται στο Google τα Γυρίσματα που αναμένουν έγκριση» | `O4 /app/settings/filming` (?part=google) | settings.manage | app | — |
| misc-settings-filming-templates-link | Ακολουθώ τον σύνδεσμο «Πρότυπα (E7)» για τα Πρότυπα συνεργείου και εξοπλισμού | `O4 /app/settings/filming` (?part=google) | settings.manage | app | — |
| misc-settings-filming-recent-changes | Βλέπω τις «Τελευταίες αλλαγές» των Ρυθμίσεων Γυρισμάτων και ανοίγω το Ίχνος με «Όλες οι αλλαγές στο Ίχνος (Ρυθμίσεις)» | `O4 /app/settings/filming` | settings.manage (το link στο Ίχνος: audit.view) | app | — |
| misc-settings-messages-edit-minutes | Ορίζω «Διόρθωση Μηνύματος (λεπτά)»: όσο μπορεί κάποιος να διορθώσει ή να σβήσει το Μήνυμά του | `/app/settings/messages` (καρτέλα «Μηνύματα», κωδικός tab `messages`, χωρίς κωδικό screens.ts) | settings.manage | app | — |
| misc-settings-messages-request-days | Ορίζω «Ανοιχτό Αίτημα (μέρες)»: από πότε ένα ανοιχτό Αίτημα σημαίνεται ως καθυστερημένο, και πατάω «Αποθήκευση Ρυθμίσεων» | `/app/settings/messages` (καρτέλα «Μηνύματα», κωδικός tab `messages`, χωρίς κωδικό screens.ts) | settings.manage | app | — |
| misc-settings-messages-automation-link | Ανοίγω τους «Αυτοματισμούς» για τη σύνοψη αδιάβαστων προς τον πελάτη | `/app/settings/messages` | automations.manage | app | — |
| misc-profile-view-details | Βλέπω στο «Στοιχεία» το Όνομα και το Email μου | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-change-password-link | Πατάω «Αλλαγή κωδικού» στην κάρτα «Είσοδος» και πάω στο `/auth/set-password` | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-theme | Διαλέγω «Θέμα»: «Σκοτεινό», «Φωτεινό» ή «Όπως η συσκευή» (αποθηκεύεται στον browser) | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-calendar-link-create | Δημιουργώ «Δημιουργία συνδέσμου» ημερολογίου («Στο κινητό σου»), αντιγράφω τον με «Αντιγραφή» (φαίνεται μόνο μία φορά) | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-calendar-link-renew | Ανανεώνω τον σύνδεσμο ημερολογίου με «Ανανέωση συνδέσμου» και επιβεβαίωση «Ανανέωση τώρα» (ο παλιός σταματά) | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-calendar-link-revoke | Καταργώ τον σύνδεσμο ημερολογίου με «Κατάργηση συνδέσμου» και «Κατάργηση τώρα» | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-calendar-link-help | Διαβάζω «Τι περιέχει» και «Πώς το βάζω στο κινητό» (iPhone, Google) | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-notification-prefs-link | Ανοίγω «Προτιμήσεις Ειδοποιήσεων» (/app/notifications?tab=prefs) | `A3 /app/settings/profile` | any-team (team ή client, signed-in) | app | — |
| misc-profile-my-roles | Βλέπω «Οι Ρόλοι μου» και ανοίγω «Ρόλοι και Δικαιώματα» (N4, μόνο ο Ιδιοκτήτης βλέπει το link, οι άλλοι βλέπουν ότι τους Ρόλους δεν τους αλλάζουν οι ίδιοι) | `A3 /app/settings/profile` | owner | app | — |
| misc-switch-client-denied-for-team | Βλέπω «Χωρίς δικαίωμα: Την εναλλαγή Πελάτη την έχουν μόνο οι Χρήστες πελάτη». Ο Ιδιοκτήτης είναι Χρήστης ομάδας και δεν έχει δική του ενέργεια εδώ (η οθόνη, κάρτες «Δουλεύεις τώρα με» και «Αλλαγή», είναι μόνο για Χρήστη πελάτη) | `A4 /app/settings/switch-client` | client (νav requires «client»), όχι team | app | — |
| misc-auth-set-password-new | Ορίζω «Νέος κωδικός» και «Ξανά ο κωδικός» (τουλάχιστον 8 χαρακτήρες) και πατάω «Αποθήκευση και είσοδος», όταν έρχομαι από πρόσκληση ή επαναφορά | `R10 /auth/set-password` (context link) | signed-in (αλλιώς redirect σε `/login?error=link`) | app | — |
| misc-auth-set-password-profile | Αλλάζω κωδικό από το Προφίλ: «Τωρινός κωδικός», «Νέος κωδικός», «Ξανά ο κωδικός» και «Αλλαγή κωδικού» | `R10 /auth/set-password` (context profile) | signed-in | app | — |
| misc-auth-set-password-send-link | Ζητώ «Στείλε μου σύνδεσμο αλλαγής» στο email μου όταν δεν θυμάμαι τον τωρινό κωδικό | `R10 /auth/set-password` (context profile) | signed-in | app | — |
| misc-auth-set-password-back | Γυρίζω «Πίσω στο Προφίλ» | `R10 /auth/set-password` (context profile) | signed-in | app | — |
| misc-login-password | Μπαίνω με «Email» και «Κωδικός» και πατάω «Είσοδος» (επιστρέφω στο ?next= αν είναι ασφαλές) | `R9 /login` | public | app | — |
| misc-login-magic-link | Ζητώ «Στείλτε μου σύνδεσμο εισόδου» με «Email για σύνδεσμο εισόδου» | `R9 /login` | public | app | — |
| misc-login-forgot-link | Πηγαίνω στο «Ξεχάσατε τον κωδικό;» (/login/reset) | `R9 /login` | public | app | — |
| misc-login-demo | Μπαίνω με τα κουμπιά «Δες ως…» της «Επίδειξη: δες τις οθόνες χωρίς κωδικό» όταν υπάρχουν demo logins | `R9 /login` | public (μόνο όταν είναι ρυθμισμένο το demo) | app | — |
| misc-login-dead-link | Βλέπω «Ο σύνδεσμος δεν ισχύει πια» (?error=link) με «Είσοδος» και «Νέος σύνδεσμος επαναφοράς» | `R13 /login?error=link` | public | app | — |
| misc-login-already-signed-in | Αν είμαι ήδη συνδεδεμένος, μεταφέρομαι κατευθείαν στο σύστημα (redirect) | `R9 /login` | signed-in | app | — |
| misc-login-reset-request | Γράφω «Email» και πατάω «Στείλτε μου σύνδεσμο» για επαναφορά κωδικού | `R10 /login/reset` | public | app | — |
| misc-login-reset-back | Γυρίζω «← Πίσω στην Είσοδο» | `R10 /login/reset` | public | app | — |
| misc-proposal-link-read | Διαβάζω το έγγραφο μιας πρότασης (ελληνικά ή αγγλικά) χωρίς λογαριασμό, ανώνυμα με token | `D5 /p/[token]` | public | app | — |
| misc-proposal-link-sign | Υπογράφω την πρόταση: όνομα, «Αποδέχομαι τους όρους», κωδικός 6 ψηφίων, «Υπογραφή» (μόνο ο Υπογράφων, ζητώ και «Νέος κωδικός») | `D5 /p/[token]` | public (token, μόνο ο Υπογράφων) | app | — |
| misc-proposal-link-request-changes | Στέλνω «Θέλω αλλαγές» με μήνυμα και «Αποστολή» (κάθε παραλήπτης) | `D5 /p/[token]` | public | app | — |
| misc-proposal-link-decline | Απορρίπτω την πρόταση με «Απόρριψη», προαιρετικός λόγος και «Ναι, απορρίπτω την πρόταση» (μόνο ο Υπογράφων) | `D5 /p/[token]` | public (token, μόνο ο Υπογράφων) | app | — |
| misc-proposal-link-print | Εκτυπώνω ή αποθηκεύω ως PDF με «Εκτύπωση / Αποθήκευση ως PDF» | `D5 /p/[token]` | public | app | — |
| misc-proposal-link-dead | Βλέπω μήνυμα όταν ο Σύνδεσμος έληξε, ανακλήθηκε, υπάρχει νεότερος, υπογράφηκε, έκλεισε ή δεν υπάρχει | `D5 /p/[token]` | public | app | — |
| misc-unsubscribe | Διακόπτω τα μη απαραίτητα email ενός Αυτοματισμού με «Διακοπή · Unsubscribe» (δίγλωσση, POST, χωρίς είσοδο) | `A10 /u/[token]` | public | app | — |
| misc-signout-profile-menu | Αποσυνδέομαι από το μενού προφίλ (avatar) με «Έξοδος» (signOut, μετά redirect στο /login). Δεν υπάρχει σε καμία από τις 14 σελίδες, ζει στο κοινό κέλυφος | `shell /app/* (spaces/shell/top-tools.tsx)` | any-team (team ή client, signed-in, canSignOut) | both | old-auth-signout |

## Μόνο στο παλιό DMS (χωρίς αντίστοιχο στη νέα εφαρμογή)

| feature_id | what the user can do | where | permission | source | refs |
|---|---|---|---|---|---|
| old-settings-stripe-copy | «Αντιγράφω τα στοιχεία ρύθμισης Stripe» | old /admin/settings | admin | old | — |
| old-availability-view-month | «Βλέπω τη διαθεσιμότητα του μήνα» | old /admin/availability | admin | old | — |
| old-availability-apply-template | «Εφαρμόζω το εβδομαδιαίο πρότυπο στον μήνα» | old /admin/availability | admin | old | — |
| old-clients-cleanup-orphans | «Καθαρίζω ορφανούς πελάτες» | old /admin/clients | admin | old | — |
| old-invoices-bulk-status | «Αλλάζω την κατάσταση πολλών τιμολογίων μαζί (απεστάλη ή πληρώθηκε)» | old /admin/invoices | admin | old | — |
| old-invoices-bulk-delete | «Διαγράφω πολλά τιμολόγια μαζί» | old /admin/invoices | admin | old | — |
| old-invoices-parse-pdf | «Αναλύω αυτόματα το PDF τιμολογίου για συμπλήρωση πεδίων» | old /api/invoices/parse (φόρμα τιμολογίου) | admin | old | — |
| old-expenses-quarterly-export | «Ανοίγω τριμηνιαία εξαγωγή εξόδων (δεν παράγει ακόμα αρχείο)» | old /admin/invoices/expenses | admin | old | — |
| old-cost-model-categories-save | «Δημιουργώ και επεξεργάζομαι κατηγορίες κόστους» | old /admin/cost-model | admin | old | — |
| old-cost-model-categories-delete | «Διαγράφω κατηγορία κόστους» | old /admin/cost-model | admin | old | — |
| old-cost-model-items-save | «Δημιουργώ και επεξεργάζομαι στοιχεία κόστους» | old /admin/cost-model | admin | old | — |
| old-cost-model-items-delete | «Διαγράφω στοιχείο κόστους» | old /admin/cost-model | admin | old | — |
| old-cost-model-breakdowns-save | «Δημιουργώ και επεξεργάζομαι αναλύσεις κόστους ανά στοιχείο» | old /admin/cost-model | admin | old | — |
| old-cost-model-breakdowns-delete | «Διαγράφω ανάλυση κόστους» | old /admin/cost-model | admin | old | — |
| old-pricing-health-edit | «Επεξεργάζομαι την τιμολόγηση έργου» | old /admin/pricing-health | admin | old | — |
| old-pricing-health-reset-snapshot | «Επαναφέρω το στιγμιότυπο τιμολόγησης έργου» | old /admin/pricing-health | admin | old | — |
| old-sales-resources-view | «Βλέπω το υλικό πωλήσεων ανά κατηγορία» | old /admin/sales-resources | admin | old | — |
| old-sales-resources-upload | «Ανεβάζω υλικό πωλήσεων» | old /admin/sales-resources (+ /api/sales-resources/upload) | admin | old | — |
| old-sales-resources-download | «Κατεβάζω υλικό πωλήσεων» | old /admin/sales-resources | admin | old | — |
| old-sales-resources-delete | «Διαγράφω υλικό πωλήσεων» | old /admin/sales-resources | admin | old | — |
| old-sales-resources-categories-save | «Δημιουργώ και μετονομάζω κατηγορίες υλικού» | old /admin/sales-resources | admin | old | — |
| old-sales-resources-categories-delete | «Διαγράφω κατηγορία υλικού» | old /admin/sales-resources | admin | old | — |
| old-google-sync-accept-change | «Αποδέχομαι αλλαγή συμβάντος από το Google Calendar» | old /admin/notifications | admin | old | — |
| old-google-sync-reject-change | «Απορρίπτω αλλαγή συμβάντος από το Google Calendar» | old /admin/notifications | admin | old | — |
| old-google-sync-create-from-event | «Δημιουργώ εκδήλωση από συμβάν του Google Calendar» | old /admin/notifications | admin | old | — |
| old-google-sync-ignore-event | «Αγνοώ συμβάν του Google Calendar» | old /admin/notifications | admin | old | — |
