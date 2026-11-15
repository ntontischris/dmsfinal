// Οι κάρτες της «Σήμερα» ως γραμμές της μίας λίστας «Τι πρέπει να κάνω τώρα» (καθαρό αρχείο): ένα πράγμα = μία γραμμή,
// «<είδος>: <τι> — <Πελάτης> · <ποσό ή πόσο περιμένει>». Ό,τι ήδη μετρά ένας οδηγός (Απαντώ, Εγκρίνω) δεν ξαναμπαίνει.

import { wholeEuros, type CardContent, type CardRow } from "@/modules/today";

import { agoText } from "./athens-time";
import type { Area, QueueRow } from "./queue-rows";

// Ο Χώρος κάθε κάρτας: εκεί ανήκει η γραμμή στα φίλτρα.
const CARD_AREA: Readonly<Record<string, Area>> = {
  health: "Εταιρεία",
  readiness: "Εταιρεία",
  gdpr: "Εταιρεία",
  unanswered: "Εταιρεία",
  proposal_approvals: "Πελάτες",
  unassigned: "Πελάτες",
  next_steps_due: "Πελάτες",
  client_reminders: "Πελάτες",
  proposals_in_progress: "Πελάτες",
  my_deliverables: "Παραγωγή",
  my_tasks: "Παραγωγή",
  versions_to_review: "Παραγωγή",
  rounds_over_limit: "Παραγωγή",
  to_invoice: "Χρήματα",
  overdue_invoices: "Χρήματα",
  cost_hours: "Χρήματα",
};

// Το είδος στην αρχή της γραμμής (ενικός).
const KIND: Readonly<Record<string, string>> = {
  health: "Υγεία συστήματος",
  readiness: "Έλεγχος ετοιμότητας",
  proposal_approvals: "Πρόταση προς έγκριση",
  unassigned: "Χωρίς υπεύθυνο",
  gdpr: "GDPR με προθεσμία",
  my_deliverables: "Παραδοτέο για μένα",
  versions_to_review: "Έκδοση προς έλεγχο",
  next_steps_due: "Επόμενο βήμα που έληξε",
  proposals_in_progress: "Πρόταση σε εξέλιξη",
  my_tasks: "Εργασία",
  client_reminders: "Υπενθύμιση",
  rounds_over_limit: "Γύροι πέρα από το όριο",
  to_invoice: "Προς τιμολόγηση",
  overdue_invoices: "Ληξιπρόθεσμο Τιμολόγιο",
  cost_hours: "Ώρες και Υπέρβαση κόστους",
  unanswered: "Αναπάντητη ερώτηση Βοηθού",
};

// Τα μετρά ήδη η γραμμή ενός οδηγού (Απαντώ σε Πελάτες, Αιτήματα γυρίσματος). Το πρόγραμμα της εβδομάδας δεν είναι
// κάτι που κλείνει: μένει στο «Το πρόγραμμα».
const NOT_ROWS: ReadonlySet<string> = new Set([
  "requests_mentions",
  "unread_messages",
  "filming_approvals",
  "google_deletions",
  "week_filming",
]);

export const isCardRow = (code: string): boolean =>
  !NOT_ROWS.has(code) && !code.startsWith("client_");

export interface CardInput {
  card: { id: string; title: string };
  content: Pick<CardContent, "count" | "rows" | "allHref">;
}

const sinceOf = (row: CardRow, now: number): number | null => {
  const waiting = row.waitingSince ? Date.parse(row.waitingSince) : NaN;
  if (!Number.isNaN(waiting)) return waiting;
  // Οι ημερομηνίες προθεσμίας είναι μπροστά μας: μετρούν μόνο όταν πέρασαν.
  const at = row.at ? Date.parse(row.at) : NaN;
  return !Number.isNaN(at) && at <= now ? at : null;
};

const tailOf = (row: CardRow, since: number | null, now: number): string =>
  row.amountCents !== undefined
    ? ` · ${wholeEuros(row.amountCents)}`
    : since !== null
      ? ` · ${agoText(since, now)}`
      : "";

export const cardRowTitle = (
  code: string,
  label: string,
  row: CardRow,
  now: number,
): string =>
  `${KIND[code] ?? label}: ${row.label}${row.note ? ` — ${row.note}` : ""}${tailOf(row, sinceOf(row, now), now)}`;

const rowOf = (item: CardInput, row: CardRow, now: number): QueueRow => {
  const since = sinceOf(row, now);
  return {
    key: `${item.card.id}:${row.id ?? row.href}`,
    title: cardRowTitle(item.card.id, item.card.title, row, now),
    sub: item.card.title,
    area: CARD_AREA[item.card.id] ?? "Εταιρεία",
    href: row.href,
    since: since ?? now,
    hasSince: since !== null,
    amountCents: row.amountCents ?? null,
    isNew: false,
    parked: null,
  };
};

// Όσα δεν χωρούν στις γραμμές της κάρτας: μία γραμμή «άλλα N» προς όλη την ουρά, για να μη χαθεί κανένα.
const restRows = (item: CardInput, now: number): QueueRow[] => {
  const rest = item.content.count - item.content.rows.length;
  if (rest <= 0) return [];
  return [
    {
      key: `${item.card.id}:rest`,
      title: `${item.card.title}: ${item.content.rows.length > 0 ? "άλλα " : ""}${rest} →`,
      sub: "Όλη η λίστα",
      area: CARD_AREA[item.card.id] ?? "Εταιρεία",
      href: item.content.allHref,
      since: now,
      hasSince: false,
      amountCents: null,
      isNew: false,
      parked: null,
    },
  ];
};

export const cardRowsOf = (
  items: readonly CardInput[],
  now: number,
): QueueRow[] =>
  items
    .filter((item) => isCardRow(item.card.id))
    .flatMap((item) => [
      ...item.content.rows.map((row) => rowOf(item, row, now)),
      ...restRows(item, now),
    ]);
