// Ελληνικά κείμενα της Εξαγωγής (M2, Ργ #200) και του Πακέτου λογιστή (Ρδ #201), όπως στο prototype.

export const EXPORT_TITLE = "Εξαγωγή δεδομένων";
export const EXPORT_EYEBROW = "M2 · Εξαγωγή";
export const EXPORT_LINK = "Εξαγωγή δεδομένων (M2)";
export const EXPORT_LINK_NOTE = "Ό,τι δεν δείχνει μια Αναφορά βγαίνει σε Excel ή CSV από την";
export const REPORTS_LINK_NOTE = "Οι έτοιμες Αναφορές είναι στις";
export const REPORTS_LINK = "Αναφορές (M1)";

export const EXPORT_NO_ACCESS = "Την Εξαγωγή την κάνουν όσοι έχουν «Εξάγει δεδομένα».";
export const EXPORT_LOAD_ERROR_TITLE = "Δεν φόρτωσε η Εξαγωγή";
export const EXPORT_LOAD_ERROR_TEXT = "Δεν χάθηκε τίποτα. Ξαναδοκίμασε σε λίγο.";
export const NO_DATASETS_TITLE = "Κανένα σύνολο δεδομένων για σένα";
export const NO_DATASETS_TEXT =
  "Ένα σύνολο εξάγεται μόνο αν βλέπεις την πηγή του: τα οικονομικά με «Βλέπει Οικονομικά», οι Πελάτες και οι Συμφωνίες με τα δικά τους «Βλέπει».";
export const COST_NOTE = "Τα Έξοδα τα εξάγει μόνο όποιος βλέπει κόστος και κερδοφορία.";
export const PROFITABILITY_NOTE =
  "Η Κερδοφορία ανά Παραγωγή θα εξάγεται όταν ανοίξει στα Οικονομικά· ως τότε ζει στο «Κόστος και ώρες».";

export const DATASET_SECTION = "Εξαγωγή συνόλου δεδομένων";
export const STEP_DATASET = "Τι θέλεις να εξάγεις";
export const STEP_PERIOD = "Περίοδος";
export const STEP_FORMAT = "Μορφή αρχείου";
export const STEP_PREVIEW = "Τι θα περιέχει";
export const ROW_IS = (row: string): string => `Μία γραμμή = ${row}.`;
export const NO_PERIOD_NOTE = "Χωρίς Περίοδο: όλα όσα βλέπεις.";
export const COLUMNS_LABEL = "Στήλες";
export const ROWS_LABEL = "Γραμμές";
export const DOWNLOAD_NOTE =
  "Το αρχείο κατεβαίνει αμέσως. Κάθε εξαγωγή γράφεται στο Ίχνος ενεργειών (ποιος, τι, πότε, με ποια φίλτρα).";
export const EMPTY_ROWS_NOTE = "Δεν υπάρχουν γραμμές σε αυτή την Περίοδο· το αρχείο θα έχει μόνο τους τίτλους.";

export const FORMATS = {
  xlsx: {
    label: "Excel (.xlsx)",
    hint: "Ποσά ως αριθμοί, ημερομηνίες ως ημερομηνίες, ελληνικοί τίτλοι στηλών.",
  },
  csv: {
    label: "CSV",
    hint: "UTF-8 με BOM και «;» ως διαχωριστικό, δεκαδικά με κόμμα, για να ανοίγει σωστά στο ελληνικό Excel.",
  },
} as const;

export const EXPORT_BUTTON = "Εξαγωγή";
export const EXPORTING = "Ετοιμάζεται…";
export const EXPORT_FAILED = "Η εξαγωγή δεν έγινε. Δοκίμασε ξανά.";
export const REPORT_EXPORT_LABEL = "Εξαγωγή όπως φαίνεται:";
export const AUDIT_EXPORT_LABEL = "Εξαγωγή με αυτά τα φίλτρα:";
export const AUDIT_EXPORT_NOTE =
  "Μόνο όσα βλέπεις, με τα ίδια κρυφά ποσά και κόστος. Η εξαγωγή γράφεται κι αυτή στο Ίχνος.";
export const AUDIT_TRUNCATED =
  "Το αρχείο έχει τις 10.000 πιο πρόσφατες γραμμές. Για τις παλαιότερες, στένεψε τα φίλτρα.";
export const AUDIT_DATASET_NOTE = "Για φίλτρα (πρόσωπο, περιοχή, στοιχείο, περίοδος), εξαγωγή από το";

export const PACK_SECTION = "Πακέτο λογιστή";
export const PACK_MONTH = "Μήνας";
export const PACK_TEXT =
  "Ένα Excel με δύο φύλλα (Τιμολόγια, Εισπράξεις) και τα PDF των Τιμολογίων του μήνα, σε ένα .zip.";
export const PACK_PARTIAL = "Ο μήνας δεν έχει κλείσει ακόμα· το πακέτο έχει ό,τι υπάρχει ως σήμερα.";
export const PACK_BUTTON = "Λήψη πακέτου (.zip)";
export const PACK_WORKING = "Ετοιμάζεται το πακέτο…";
export const PACK_DONE = (pdfs: number, missing: number): string =>
  missing === 0
    ? `Έτοιμο: ${pdfs} PDF μέσα στο πακέτο.`
    : `Έτοιμο: ${pdfs} PDF μέσα στο πακέτο· ${missing} Τιμολόγια χωρίς PDF, γραμμένα στο ΔΙΑΒΑΣΕ.txt.`;
export const PACK_NO_PDFS_NOTE = "Χωρίς «Βλέπει ποσά» το πακέτο δεν έχει ποσά ούτε PDF.";

export const HISTORY_SECTION = "Ιστορικό εξαγωγών";
export const HISTORY_OWN_NOTE = "Βλέπεις μόνο τις δικές σου εξαγωγές.";
export const HISTORY_EMPTY = "Δεν έχει γίνει καμία εξαγωγή ακόμα.";
export const HISTORY_COLUMNS = { at: "Πότε", by: "Ποιος", what: "Τι", rows: "Γραμμές" } as const;
export const HISTORY_ERROR = "Δεν φόρτωσε το Ιστορικό εξαγωγών.";

// Τα ονόματα μέσα στο Πακέτο λογιστή.
export const PACK_FOLDER = "Πακέτο λογιστή";
export const PACK_WORKBOOK = "Τιμολόγια και Εισπράξεις";
export const PACK_PDF_FOLDER = "PDF";
export const PACK_README = "ΔΙΑΒΑΣΕ.txt";
export const PACK_SHEET_INVOICES = "Τιμολόγια";
export const PACK_SHEET_RECEIPTS = "Εισπράξεις";
export const PACK_PDF_COLUMN = "Αρχείο PDF";
export const PDF_MISSING = {
  noAmounts: "Χωρίς «Βλέπει ποσά» δεν κατεβαίνουν PDF",
  notFound: "Το PDF δεν βρέθηκε στην αποθήκευση",
  failed: "Το PDF δεν κατέβηκε",
} as const;

// Οι πέντε Περίοδοι (Ρ3)· τα όριά τους τα υπολογίζει η βάση, σε ώρα Ελλάδας.
export const PERIOD_LABELS = {
  "this-month": "Αυτός ο μήνας",
  "last-month": "Προηγούμενος μήνας",
  "this-quarter": "Αυτό το τρίμηνο",
  "this-year": "Φέτος",
  "last-year": "Πέρυσι",
} as const;
export const PARTIAL_NOTE = "ως σήμερα";
