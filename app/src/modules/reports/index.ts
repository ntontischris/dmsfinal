// Module «Αναφορές» (M1, #198): έτοιμες Αναφορές με φίλτρα στη διεύθυνση. Μητρώο στο catalog/ (μία Αναφορά ανά αρχείο
// στο reports/)· η βάση αποφασίζει ποιος βλέπει τι και αν φαίνονται τα ποσά. Έξω φαίνεται μόνο ό,τι χρειάζεται η σελίδα.
export { REPORTS_TITLE } from "./labels";
export { parseClient, parsePeriod, parseReportId, parseSeller } from "./url";
// Εξαγωγή (M2, #200) και Πακέτο λογιστή (#201).
export { EXPORT_TITLE } from "./export/labels";
export { parseDatasetParam, parseFormat, parseMonth } from "./export/url";
export { AuditExportButtons } from "./export/components/audit-export-buttons";
// Νέα εμφάνιση (Χώροι): οι οθόνες M1 και M2 του prototype πάνω στα ίδια RPC.
export { SpacesReports } from "./spaces/m1-screen";
export { SpacesExport } from "./spaces/m2-screen";
export { SpacesAuditExport } from "./spaces/p1-audit-export";
