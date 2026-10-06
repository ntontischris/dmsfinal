import type { EquipmentStatus } from "@/data/equipment";
import type { Filming } from "@/data/filming";
import { clientNameOf, endTime } from "@/data/filming-access";
import { fmtDay } from "@/screens/e3-model";

// «Κυψέλη Καφέ · Παρ 02/10 09:00–13:00»
export const filmingLabel = (filming: Filming): string =>
  `${clientNameOf(filming)} · ${fmtDay(filming.date)} ${filming.start}–${endTime(filming)}`;

export const statusTone = (status: EquipmentStatus): "attention" | undefined =>
  status === "διαθέσιμο" ? undefined : "attention";

export const conflictText = (blocks: boolean): string =>
  blocks
    ? "Οι Κανόνες γυρισμάτων μπλοκάρουν τη σύγκρουση: νέα διπλή Δέσμευση δεν γίνεται."
    : "Οι Κανόνες γυρισμάτων μόνο προειδοποιούν: η διπλή Δέσμευση επιτρέπεται, με σήμα.";
