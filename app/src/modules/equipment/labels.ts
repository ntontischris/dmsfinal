import type { EquipmentStatus } from "./types";

// Κείμενα του module: οι κωδικοί της βάσης σε ελληνικά.

export const STATUS_LABELS: Readonly<Record<EquipmentStatus, string>> = {
  available: "διαθέσιμο",
  in_repair: "σε επισκευή",
  retired: "αποσυρμένο",
};

export const REPAIR_NOTE_LABEL = "Τι έπαθε και πότε επιστρέφει (υποχρεωτικό)";
export const RETIRE_NOTE_LABEL = "Λόγος (προαιρετικός)";
export const UNKNOWN_ACTOR_LABEL = "—";
