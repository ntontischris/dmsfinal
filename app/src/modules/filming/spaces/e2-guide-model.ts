// Ο οδηγός «Εγκρίνω αιτήματα γυρίσματος» πάνω στο E2: ένα αίτημα τη φορά, με τις απαντήσεις του είδους του.
// Καθαρές συναρτήσεις (τις χρησιμοποιούν η σελίδα, η φόρμα και το server action).

import type { FilmingQueue } from "../types";
import { isPastStart, whenOf } from "./e2-adapter";
import { formatDateTime } from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";

export const EGKRINO_JOB = "egkrino-gyrismata";

// Τα βήματα του οδηγού όπως στο μητρώο (flow-registry.ts → EGKRINO).
export const EGKRINO_STEPS = {
  answer: 1,
  crew: 2,
  offer: 3,
  reason: 4,
  wait: 5,
} as const;

export type RequestKind = "booking" | "reschedule" | "cancel";
export type Answer = "approve" | "offer" | "reject";

export const REQUEST_KINDS: readonly RequestKind[] = [
  "booking",
  "reschedule",
  "cancel",
];
export const ANSWERS: readonly Answer[] = ["approve", "offer", "reject"];

export interface GuideRequest {
  id: string;
  kind: RequestKind;
  clientName: string;
  production: string;
  // Η ώρα που ισχύει σήμερα.
  when: string;
  // Η νέα ώρα που ζητά (μόνο μετάθεση).
  newWhen: string | null;
  // Η ώρα που θα εγκριθεί (ISO): η κράτηση ή η νέα ώρα της μετάθεσης.
  startsAt: string;
  hours: number;
  // Από πότε περιμένει (ISO), για τη σειρά.
  since: string;
  // Ο λόγος του Πελάτη (μόνο ακύρωση).
  reason: string | null;
  // Η ακύρωση καίει την Παροχή.
  burns: boolean;
  // Το είδος της Παροχής, για το προεπιλεγμένο Πρότυπο.
  kindLabel: string;
  // Το ίδιο Γύρισμα είχε κι άλλο αίτημα· φαίνεται μόνο το νεότερο.
  replaces: boolean;
  // Τι λέει η ουρά για τη νέα ώρα (μόνο μετάθεση).
  slotProblem: string | null;
}

export const KIND_TITLES: Readonly<Record<RequestKind, string>> = {
  booking: "Νέα κράτηση",
  reschedule: "Ζητά μετάθεση",
  cancel: "Ζητά ακύρωση μετά το Όριο",
};

export const ANSWER_LABELS: Readonly<
  Record<RequestKind, Readonly<Record<Answer, string>>>
> = {
  booking: {
    approve: "Εγκρίνω",
    offer: "Προτείνω άλλη ώρα",
    reject: "Απορρίπτω",
  },
  reschedule: {
    approve: "Εγκρίνω",
    offer: "Προτείνω άλλη ώρα",
    reject: "Απορρίπτω",
  },
  cancel: {
    approve: "Δέχομαι την ακύρωση",
    offer: "Προτείνω άλλη ώρα αντί για ακύρωση",
    reject: "Αρνούμαι",
  },
};

const client = (entry: { client: { name: string } | null }): string =>
  entry.client?.name ?? NO_CLIENT_LABEL;

const fromQueue = (queue: FilmingQueue): GuideRequest[] => [
  ...queue.pending.map((entry) => ({
    id: entry.id,
    kind: "booking" as const,
    clientName: client(entry),
    production: entry.production.title,
    when: whenOf(entry.startsAt, entry.hours),
    newWhen: null,
    startsAt: entry.startsAt,
    hours: entry.hours,
    since: entry.createdAt,
    reason: null,
    burns: false,
    kindLabel: entry.provision?.kind.label ?? "",
    replaces: false,
    slotProblem: null,
  })),
  ...queue.rescheduleRequests.map((entry) => ({
    id: entry.id,
    kind: "reschedule" as const,
    clientName: client(entry),
    production: entry.production.title,
    when: whenOf(entry.startsAt, entry.hours),
    newWhen: whenOf(entry.newStartsAt, entry.newHours),
    startsAt: entry.newStartsAt,
    hours: entry.newHours,
    since: entry.requestedAt,
    reason: null,
    burns: false,
    kindLabel: "",
    replaces: false,
    slotProblem: entry.slotProblem,
  })),
  ...queue.cancelRequests.map((entry) => ({
    id: entry.id,
    kind: "cancel" as const,
    clientName: client(entry),
    production: entry.production.title,
    when: whenOf(entry.startsAt, entry.hours),
    newWhen: null,
    startsAt: entry.startsAt,
    hours: entry.hours,
    since: entry.requestedAt,
    reason: entry.reason,
    burns: entry.willBurn,
    kindLabel: "",
    replaces: false,
    slotProblem: null,
  })),
];

// Ένα αίτημα ανά Γύρισμα (το νεότερο, με «αντικαθιστά το προηγούμενο»), το παλαιότερο πρώτο.
export const requestsOf = (queue: FilmingQueue): GuideRequest[] => {
  const groups = Map.groupBy(fromQueue(queue), (request) => request.id);
  return [...groups.values()]
    .map((group) => {
      const newest = group.reduce((a, b) => (b.since > a.since ? b : a));
      return { ...newest, replaces: group.length > 1 };
    })
    .sort((a, b) => a.since.localeCompare(b.since));
};

export interface Focus {
  request: GuideRequest;
  // 1-based.
  index: number;
  total: number;
}

// Το αίτημα του URL (?req=), αλλιώς το παλαιότερο.
export const focusOf = (
  requests: readonly GuideRequest[],
  reqId: string | null,
): Focus | null => {
  if (requests.length === 0) return null;
  const found = requests.findIndex((request) => request.id === reqId);
  const index = found === -1 ? 0 : found;
  return { request: requests[index], index: index + 1, total: requests.length };
};

// Γιατί δεν εγκρίνεται (η ώρα πέρασε ή πιάστηκε)· null = εγκρίνεται. Η ακύρωση δεν κλειδώνει.
export const lockOf = (
  request: GuideRequest,
  nowMs: number,
  slotProblem: string | null,
): string | null => {
  if (request.kind === "cancel") return null;
  if (isPastStart(request.startsAt, nowMs))
    return `Η ώρα (${formatDateTime(request.startsAt)}) έχει ήδη περάσει· δεν εγκρίνεται. Πρότεινε άλλη ώρα ή απόρριψε.`;
  const problem = slotProblem ?? request.slotProblem;
  return problem
    ? `Η ώρα πιάστηκε: ${problem}. Πρότεινε άλλη ώρα ή απόρριψε.`
    : null;
};

export const defaultAnswerOf = (lock: string | null): Answer =>
  lock ? "offer" : "approve";

const guideHref = (path: string, step: number, reqId?: string): string => {
  const query = new URLSearchParams({ job: EGKRINO_JOB, step: String(step) });
  if (reqId) query.set("req", reqId);
  return `${path}?${query.toString()}`;
};

export const queueHref = (
  step: number = EGKRINO_STEPS.answer,
  reqId?: string,
): string => guideHref("/app/filming/queue", step, reqId);

export const filmingGuideHref = (id: string, step: number): string =>
  guideHref(`/app/filming/${id}`, step, id);

export const waitHref = (): string => guideHref("/app", EGKRINO_STEPS.wait);

interface AnswerTarget {
  id: string;
  kind: RequestKind;
  answer: Answer;
  // Το Γύρισμα έμεινε χωρίς Συνεργείο ή Εξοπλισμό (μόνο μετά από έγκριση μετάθεσης).
  lacksTeam?: boolean;
}

// Πού συνεχίζει ο οδηγός μετά την απάντηση του βήματος 1.
export const answerTargetOf = ({
  id,
  kind,
  answer,
  lacksTeam = false,
}: AnswerTarget): string => {
  if (answer === "offer") return filmingGuideHref(id, EGKRINO_STEPS.offer);
  if (answer === "reject") return queueHref(EGKRINO_STEPS.reason, id);
  if (kind === "booking" || (kind === "reschedule" && lacksTeam))
    return filmingGuideHref(id, EGKRINO_STEPS.crew);
  return queueHref();
};

// «Πάνε: Άννα, Νίκος · Παίρνουν: Κάμερα Α» από τα προεπιλεγμένα Πρότυπα.
export const teamLineOf = (
  crew: readonly string[],
  items: readonly string[],
): string =>
  `Πάνε: ${crew.length ? crew.join(", ") : "κανείς από Πρότυπο"} · Παίρνουν: ${items.length ? items.join(", ") : "τίποτα από Πρότυπο"}`;

// «Θα ελευθερωθούν: 2 άτομα, 4 αντικείμενα, το γεγονός στο Google» (μόνο ό,τι υπάρχει).
export const freedLineOf = (
  crew: number,
  items: number,
  hasGoogle: boolean,
): string => {
  const parts = [
    crew > 0 ? `${crew} ${crew === 1 ? "άτομο" : "άτομα"}` : null,
    items > 0
      ? `${items} ${items === 1 ? "αντικείμενο" : "αντικείμενα"}`
      : null,
    hasGoogle ? "το γεγονός στο Google" : null,
  ].filter((part) => part !== null);
  return parts.length
    ? `Θα ελευθερωθούν: ${parts.join(", ")}`
    : "Δεν έχει ομάδα ή εξοπλισμό να ελευθερωθεί.";
};
