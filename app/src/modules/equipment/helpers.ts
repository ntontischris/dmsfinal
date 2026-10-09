import type { Tone } from "@/components/ui/badge";

import { STATUS_LABELS } from "./labels";
import {
  EQUIPMENT_STATUSES,
  type EquipmentItemRow,
  type EquipmentCategory,
  type EquipmentStatus,
  type HistoryEntry,
  type HistoryLine,
} from "./types";

// Καθαρές συναρτήσεις του module: Δικαιώματα της οθόνης, σήματα, μορφοποίηση και κείμενα του Ιστορικού.
// Καμία είσοδος/έξοδος· η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

const DETAIL_FIELDS = ["name", "code", "note", "category_id"] as const;

export const statusTone = (status: EquipmentStatus): Tone | undefined => {
  if (status === "available") return "ok";
  if (status === "in_repair") return "attention";
  return undefined;
};

export const isEquipmentStatus = (value: unknown): value is EquipmentStatus =>
  EQUIPMENT_STATUSES.some((status) => status === value);

const statusText = (value: unknown): string =>
  isEquipmentStatus(value) ? STATUS_LABELS[value] : String(value ?? "—");

export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

// Κατηγορίες που διαλέγονται σε αντικείμενο: οι ενεργές, και η τρέχουσα ακόμα κι αν έχει αποσυρθεί.
export const selectableCategories = (
  categories: readonly EquipmentCategory[],
  currentId?: string,
): EquipmentCategory[] =>
  categories.filter(
    (category) => !category.isRetired || category.id === currentId,
  );

const detailsChanged = (entry: HistoryEntry): boolean =>
  DETAIL_FIELDS.some((field) => entry.before?.[field] !== entry.after?.[field]);

const statusEventText = (entry: HistoryEntry): string => {
  const from = statusText(entry.after?.from);
  const to = statusText(entry.after?.to);
  const note = typeof entry.after?.note === "string" ? entry.after.note : "";
  return `Κατάσταση: ${from} → ${to}${note ? `. Λόγος: ${note}` : ""}`;
};

// Μία γραμμή για κάθε ενέργεια που αφορά τα στοιχεία. Η αλλαγή μόνο κατάστασης φαίνεται από το γεγονός της,
// γι' αυτό η ενημέρωση που δεν αλλάζει στοιχεία δεν εμφανίζεται δεύτερη φορά.
const lineOf = (entry: HistoryEntry): HistoryLine | null => {
  const actor = entry.actorName ?? "—";
  if (entry.action === "event" && entry.event === "status_changed")
    return { at: entry.at, actor, text: statusEventText(entry) };
  if (entry.action === "insert")
    return { at: entry.at, actor, text: "Προστέθηκε στο μητρώο." };
  if (entry.action === "update" && detailsChanged(entry))
    return { at: entry.at, actor, text: "Άλλαξαν τα στοιχεία." };
  if (entry.action === "delete")
    return { at: entry.at, actor, text: "Διαγράφηκε." };
  return null;
};

export const historyLines = (entries: readonly HistoryEntry[]): HistoryLine[] =>
  entries.flatMap((entry) => {
    const line = lineOf(entry);
    return line ? [line] : [];
  });

export interface ItemFilter {
  query: string;
  categoryId: string | "all";
  status: EquipmentStatus | "all";
}

const matchesQuery = (item: EquipmentItemRow, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return `${item.name} ${item.code ?? ""}`.toLowerCase().includes(needle);
};

// Χωρίς φίλτρο Κατάστασης κρύβονται τα αποσυρμένα (προεπιλογή του F1).
const matchesStatus = (item: EquipmentItemRow, status: ItemFilter["status"]): boolean =>
  status === "all" ? item.status !== "retired" : item.status === status;

export const filterItems = (
  items: readonly EquipmentItemRow[],
  filter: ItemFilter,
): EquipmentItemRow[] =>
  items.filter(
    (item) =>
      (filter.categoryId === "all" || item.categoryId === filter.categoryId) &&
      matchesStatus(item, filter.status) &&
      matchesQuery(item, filter.query),
  );
