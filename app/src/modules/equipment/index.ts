// Module «Εξοπλισμός» (F1 Μητρώο, F2 Αντικείμενο, F3 Πρότυπα εξοπλισμού). Έξω φαίνεται μόνο ό,τι εξάγεται εδώ·
// τα actions και τα zod schemas μένουν μέσα (τα εισάγουν τα components με σχετική διαδρομή).
export type {
  EquipmentItemRow,
  EquipmentStatus,
  EquipmentTemplate,
  HistoryLine,
  TemplateLink,
} from "./types";
export { EQUIPMENT_STATUSES } from "./types";
export { REPAIR_NOTE_LABEL, RETIRE_NOTE_LABEL, STATUS_LABELS } from "./labels";
export { filterItems, statusTone } from "./helpers";
export type { ReadResult } from "./read";
export { listTemplates } from "./queries";
// Νέα εμφάνιση (Χώροι): οι οθόνες F1–F3 του prototype.
export { SpacesEquipment } from "./spaces/f1-screen";
export { SpacesEquipmentItem } from "./spaces/f2-screen";
export { SpacesEquipmentTemplates } from "./spaces/f3-screen";
