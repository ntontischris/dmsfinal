import { CHARGE_LABELS, VERSION_STATE_LABELS } from "./labels";
import type { DeliverableHistoryEntry, VersionState } from "./types";

// Το Ίχνος του Παραδοτέου ως γραμμές κειμένου. Κάθε εγγραφή γίνεται μία πρόταση στα ελληνικά.

export interface HistoryLine {
  at: string;
  actor: string;
  text: string;
}

const UNKNOWN_ACTOR = "—";
type Row = Record<string, unknown> | null;

const textOf = (value: unknown): string =>
  typeof value === "string" ? value : "";
const numberOf = (value: unknown): string =>
  typeof value === "number" ? String(value) : "";

const cancelledText = (before: Row, after: Row): string | null => {
  if (!after?.cancelled_at || before?.cancelled_at) return null;
  return `Ακυρώθηκε. Λόγος: ${textOf(after.cancel_reason)}`;
};

const deliverableUpdateText = (before: Row, after: Row): string => {
  const cancelled = cancelledText(before, after);
  if (cancelled !== null) return cancelled;
  if (after?.approved_at && !before?.approved_at) return "Εγκρίθηκε";
  if (before?.charge === "pending" && after?.charge !== "pending")
    return `Χρέωση: ${CHARGE_LABELS[textOf(after?.charge) as keyof typeof CHARGE_LABELS] ?? ""}`;
  return "Ενημερώθηκε το Παραδοτέο";
};

const deliverableText = (entry: DeliverableHistoryEntry): string => {
  if (entry.action === "insert") return "Δημιουργήθηκε το Παραδοτέο";
  if (entry.action === "update")
    return deliverableUpdateText(entry.before, entry.after);
  return "Ενημέρωση του Παραδοτέου";
};

const versionText = (entry: DeliverableHistoryEntry): string => {
  const number = numberOf(entry.after?.number);
  if (entry.action === "insert") return `Νέα Έκδοση ${number}`;
  const state = textOf(entry.after?.state) as VersionState;
  if (entry.after?.state !== entry.before?.state && VERSION_STATE_LABELS[state])
    return `Έκδοση ${number}: ${VERSION_STATE_LABELS[state]}`;
  return `Ενημερώθηκε η Έκδοση ${number}`;
};

const commentText = (entry: DeliverableHistoryEntry): string =>
  entry.action === "insert" ? "Νέο σχόλιο" : "Ενημερώθηκε σχόλιο";

const textFor = (entry: DeliverableHistoryEntry): string => {
  if (entry.entity === "deliverable_versions") return versionText(entry);
  if (entry.entity === "deliverable_comments") return commentText(entry);
  return deliverableText(entry);
};

// Μία γραμμή για κάθε εγγραφή του Ίχνους, νεότερη πρώτη (όπως έρχεται από τη βάση).
export const historyLines = (
  entries: readonly DeliverableHistoryEntry[],
): HistoryLine[] =>
  entries.map((entry) => ({
    at: entry.at,
    actor: entry.actorName ?? UNKNOWN_ACTOR,
    text: textFor(entry),
  }));
