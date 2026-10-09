// Τύποι του module «Εξοπλισμός» (F1, F2, F3). Τα JSON της βάσης έρχονται σε snake_case· εδώ camelCase.
// Το null σημαίνει «δεν υπάρχει», ποτέ μηδέν: ο Εξοπλισμός δεν έχει ποσότητα, αξία ή κόστος.

export const EQUIPMENT_STATUSES = ["available", "in_repair", "retired"] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export interface EquipmentCategory {
  id: string;
  name: string;
  sortOrder: number;
  isRetired: boolean;
  itemCount: number;
  updatedAt: string;
}

export interface EquipmentItemRow {
  id: string;
  name: string;
  code: string | null;
  note: string | null;
  status: EquipmentStatus;
  statusNote: string | null;
  categoryId: string;
  categoryName: string;
  categoryRetired: boolean;
  updatedAt: string;
}

export interface TemplateLink {
  id: string;
  name: string;
}

export interface HistoryEntry {
  at: string;
  action: "insert" | "update" | "delete" | "event";
  event: string | null;
  actorName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface EquipmentItemDetail extends EquipmentItemRow {
  updatedByName: string | null;
  templates: TemplateLink[];
  history: HistoryEntry[];
}

export interface TemplateItem {
  id: string;
  name: string;
  status: EquipmentStatus;
}

export interface EquipmentTemplate {
  id: string;
  name: string;
  note: string | null;
  items: TemplateItem[];
  updatedAt: string;
}

// Τι δικαιούται ο θεατής στον Εξοπλισμό. Η βάση αποφασίζει ξανά σε κάθε RPC.
export interface EquipmentCaps {
  canView: boolean;
  canManage: boolean;
  canEditTemplates: boolean;
}

export interface HistoryLine {
  at: string;
  actor: string;
  text: string;
}

// Μονάδες με το ίδιο βασικό όνομα και την ίδια Κατηγορία φαίνονται μαζί στο F1 (#123).
export interface UnitGroup {
  baseName: string;
  categoryName: string;
  units: EquipmentItemRow[]; // όλες οι μονάδες, για το πλήθος
  shown: EquipmentItemRow[]; // όσες ταιριάζουν στο φίλτρο, για τη λίστα
  counts: Record<EquipmentStatus, number>;
}

export type RegistryRow =
  | { kind: "item"; item: EquipmentItemRow }
  | { kind: "group"; group: UnitGroup };
