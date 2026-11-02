// H1 (νέα εμφάνιση): οι πραγματικές κάρτες της ουράς (deliverables_queue_view) στα κείμενα του prototype
// (`screens/h1-model.tsx`, `screens/h1-filters.ts`). Καθαρές συναρτήσεις, χωρίς είσοδο/έξοδο.

import { fmtDate } from "@/spaces/screens/shared";

import type { DeliverableCard, QueueView } from "../types";

// Οι καρτέλες με τα ονόματα του prototype· στη διεύθυνση μένουν οι τιμές της βάσης (mine, review, client).
export const VIEW_LABELS: Readonly<Record<QueueView, string>> = {
  mine: "για μένα",
  review: "προς έλεγχο",
  client: "στον πελάτη",
};

export const EMPTY: Readonly<
  Record<QueueView, { title: string; text: string }>
> = {
  mine: {
    title: "Τίποτα δεν περιμένει εσένα.",
    text: "Δεν υπάρχει Παραδοτέο που να περιμένει εσένα αυτή τη στιγμή.",
  },
  review: {
    title: "Καμία Έκδοση δεν περιμένει έλεγχο.",
    text: "Όταν κάποιος προσθέσει Έκδοση, θα εμφανιστεί εδώ.",
  },
  client: {
    title: "Τίποτα δεν περιμένει πελάτη.",
    text: "Κανένα Παραδοτέο δεν αναμένει απάντηση πελάτη.",
  },
};

// Φίλτρα της ουράς: ανά άτομο (id Χρήστη), ανά πελάτη (όνομα, η κάρτα δεν φέρνει id) και «Καθυστερούν».
export interface QueueFilter {
  person?: string;
  client?: string;
  isLateOnly?: boolean;
}

export interface FilterOption {
  id: string;
  name: string;
}

// Οι παράμετροι της διεύθυνσης όπως τις δίνει το Next· οι οθόνες κρατούν μόνο τις απλές (μία τιμή) τιμές.
export type RawQuery = Readonly<Record<string, string | string[] | undefined>>;
export type TextQuery = Readonly<Record<string, string | undefined>>;

export const textQuery = (params: RawQuery): TextQuery =>
  Object.fromEntries(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );

export const countLabel = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

// «Πελάτης — Παραγωγή» χωρίς διπλό όνομα· η Εσωτερική Παραγωγή μόνο με τον τίτλο της.
export const clientAndTitle = (client: string | null, title: string): string =>
  client === null || title.startsWith(client) ? title : `${client} — ${title}`;

export const productionLabel = (card: DeliverableCard): string =>
  clientAndTitle(card.client, card.production);

export const filterQueue = (
  items: readonly DeliverableCard[],
  { person, client, isLateOnly = false }: QueueFilter,
): readonly DeliverableCard[] =>
  items.filter(
    (card) =>
      (!person || card.assigneeId === person) &&
      (!client || card.client === client) &&
      (!isLateOnly || card.isLate),
  );

export const lateCount = (items: readonly DeliverableCard[]): number =>
  items.filter((card) => card.isLate).length;

const unique = (options: readonly FilterOption[]): readonly FilterOption[] =>
  options
    .filter((o, i) => o.id && options.findIndex((x) => x.id === o.id) === i)
    .sort((a, b) => a.name.localeCompare(b.name, "el"));

export const filterOptions = (items: readonly DeliverableCard[]) => ({
  people: unique(
    items.map((card) => ({
      id: card.assigneeId ?? "",
      name: card.assigneeName ?? "",
    })),
  ),
  clients: unique(
    items.map((card) => ({ id: card.client ?? "", name: card.client ?? "" })),
  ),
});

export const deadlineLabel = (card: DeliverableCard): string => {
  if (card.deadline) return fmtDate(card.deadline);
  return card.filmingId ? "μετά το Γύρισμα" : "—";
};

// Τι περιμένει ο Ανατεθειμένος, από την κατάσταση του Παραδοτέου (η κάρτα φέρνει το πλήθος των Εκδόσεων).
export const waitingOn = (card: DeliverableCard): string => {
  if (card.versionCount === 0) return "καμία Έκδοση ακόμα";
  const version = `v${card.versionCount}`;
  if (card.state === "returned") return `${version} επιστράφηκε από έλεγχο`;
  if (card.state === "changes_requested")
    return `${version}: ο πελάτης ζήτησε αλλαγές`;
  return `${version}: ${WAITING_STATES[card.state] ?? ""}`;
};

const WAITING_STATES: Partial<Record<DeliverableCard["state"], string>> = {
  draft: "καμία Έκδοση ακόμα",
  in_review: "αναμένει εσωτερικό έλεγχο",
  awaiting_client: "αναμένει πελάτη",
  approved: "εγκρίθηκε",
};

// Πόσο περιμένει στον έλεγχο ή στον πελάτη (η βάση μετρά μέρες).
export const waitLabel = (days: number): string =>
  days === 0 ? "από σήμερα" : countLabel(days, "μέρα", "μέρες");
