import type { Tone } from "@/components/ui/badge";

import { QUEUE_LABELS } from "./labels";
import type { DeliverableCan, DeliverableCard, QueueView } from "./types";
import { QUEUE_VIEWS } from "./types";

// Καθαρές συναρτήσεις του module: σήματα, διαθέσιμες ενέργειες, καρτέλες ουράς, μορφοποίηση.
// Καμία είσοδος/έξοδος· η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

export interface Signal {
  label: string;
  tone: Tone;
}

export type DeliverableAction =
  | "addVersion"
  | "send"
  | "return"
  | "approveInternal"
  | "fixLink"
  | "cancel"
  | "edit";

// Τα σήματα της ουράς και της σελίδας: καθυστερεί, πάνω από το όριο, σπασμένο link.
export const signalsOf = (card: DeliverableCard): Signal[] => {
  const signals: Signal[] = [];
  if (card.isLate) signals.push({ label: "Καθυστερεί", tone: "attention" });
  if (card.overLimit) signals.push({ label: "Πάνω από το όριο", tone: "attention" });
  if (card.linkBroken) signals.push({ label: "Το link δεν ανοίγει", tone: "attention" });
  return signals;
};

// Οι καρτέλες της ουράς: το «Προς έλεγχο» μόνο για όποιον ελέγχει.
export const queueViewsOf = (canReview: boolean): QueueView[] =>
  QUEUE_VIEWS.filter((view) => view !== "review" || canReview);

// Η καρτέλα από τη διεύθυνση· άγνωστη ή μη διαθέσιμη = η πρώτη.
export const parseQueueView = (value: string | undefined, views: readonly QueueView[]): QueueView =>
  views.find((view) => view === value) ?? views[0] ?? "mine";

export const queueLabelOf = (view: QueueView): string => QUEUE_LABELS[view];

// Οι ενέργειες που φαίνονται σε αυτόν τον θεατή, με τη σειρά της φόρμας. Η «Διόρθωση link» θέλει Έκδοση.
export const availableActions = (
  can: DeliverableCan,
  versionCount: number,
): DeliverableAction[] => {
  const allowed: [DeliverableAction, boolean][] = [
    ["addVersion", can.addVersion],
    ["send", can.send],
    ["return", can.return],
    ["approveInternal", can.approveInternal],
    ["fixLink", can.edit && versionCount > 0],
    ["cancel", can.cancel],
    ["edit", can.edit],
  ];
  return allowed.filter(([, isAllowed]) => isAllowed).map(([action]) => action);
};

// «2027-03-10» → «10/03/2027». Απουσία = κενό.
export const deadlineText = (deadline: string | null): string => {
  if (deadline === null) return "";
  const [year, month, day] = deadline.split("-");
  return `${day}/${month}/${year}`;
};

// Ημερομηνία και ώρα στη ζώνη της Αθήνας.
export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export const isInternalCard = (card: DeliverableCard): boolean => card.client === null;
