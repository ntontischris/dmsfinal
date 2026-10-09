// Module «Εξοπλισμός» (F1 Μητρώο, F2 Αντικείμενο, F3 Πρότυπα εξοπλισμού). Έξω φαίνεται μόνο ό,τι εξάγεται εδώ·
// τα actions και τα zod schemas μένουν μέσα (τα εισάγουν τα components με σχετική διαδρομή).
export type {
  EquipmentCaps,
  EquipmentCategory,
  EquipmentItemDetail,
  EquipmentItemRow,
  EquipmentStatus,
  EquipmentTemplate,
  HistoryLine,
  TemplateLink,
} from "./types";
export { EQUIPMENT_STATUSES } from "./types";
export { REPAIR_NOTE_LABEL, RETIRE_NOTE_LABEL, STATUS_LABELS } from "./labels";
export { equipmentCaps } from "./caps";
export {
  filterItems,
  formatDateTime,
  historyLines,
  selectableCategories,
  statusTone,
} from "./helpers";
export type { ReadResult } from "./read";
export { getItem, listCategories, listItems, listTemplates } from "./queries";
export { CategoryManager } from "./components/category-manager";
export { EquipmentTable } from "./components/equipment-table";
export { ItemDangerPanel } from "./components/item-danger-panel";
export { ItemForm } from "./components/item-form";
export { ItemHistory } from "./components/item-history";
export { ItemStatusPanel } from "./components/item-status-panel";
export { MutedNote } from "./components/equipment-fields";
export { NewItemDetails } from "./components/new-item-details";
export { TemplateList } from "./components/template-list";
