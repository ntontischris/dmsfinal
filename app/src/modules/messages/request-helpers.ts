import { OPEN_RESULT_DELIVERABLE, OPEN_RESULT_FILMING } from "./request-labels";
import { MESSAGES_PATH, truncate } from "./helpers";
import type { ChangeRequest, ClientRequest, MessageRequest, QueueItem, ThreadMessage } from "./view-schema";

// Καθαρά βοηθητικά των Αιτημάτων: όψεις, ταξινόμηση, σύνδεσμοι.

export const REQUEST_VIEWS = ["mine", "open", "unassigned", "closed"] as const;
export type RequestView = (typeof REQUEST_VIEWS)[number];

export const parseRequestView = (value: string | undefined): RequestView =>
  REQUEST_VIEWS.find((view) => view === value) ?? "mine";

interface ViewRules {
  canReassign: boolean;
  solo: boolean;
}

// Το «χωρίς υπεύθυνο» φαίνεται μόνο σε όποιον μεταβιβάζει και όταν υπάρχουν περισσότερα από ένα ενεργά μέλη (Μ10).
export const visibleViews = ({ canReassign, solo }: ViewRules): RequestView[] =>
  REQUEST_VIEWS.filter(
    (view) => view !== "unassigned" || (canReassign && !solo),
  );

// Μια όψη που δεν φαίνεται (π.χ. ?view=unassigned χωρίς δικαίωμα) πέφτει στα «για μένα».
export const allowedView = (
  wanted: RequestView,
  canReassign: boolean,
): RequestView => (wanted === "unassigned" && !canReassign ? "mine" : wanted);

export const requestsHref = (view: RequestView): string =>
  view === "mine"
    ? `${MESSAGES_PATH}?tab=requests`
    : `${MESSAGES_PATH}?tab=requests&view=${view}`;

export const DELIVERABLES_PATH = "/app/deliverables";
export const FILMING_PATH = "/app/filming";
export const BOOK_PATH = "/app/book";

export const messageAnchor = (messageId: string): string => `m-${messageId}`;

// «Άνοιγμα»: στη Συνομιλία του Πελάτη με anchor στο Μήνυμα· για αλλαγή μετά την έγκριση, στη σελίδα του Παραδοτέου (H2).
export const queueItemHref = (item: QueueItem): string => {
  if (item.kind === "change" && item.deliverableId)
    return `${DELIVERABLES_PATH}/${item.deliverableId}`;
  const base = `${MESSAGES_PATH}/${item.clientId}`;
  return item.messageId ? `${base}#${messageAnchor(item.messageId)}` : base;
};

export interface ResultLink {
  href: string;
  label: string;
}

// Το αποτέλεσμα ενός αυτόματου κλεισίματος: Παραδοτέο ή Γύρισμα. Το Παραδοτέο έχει την ίδια διεύθυνση για ομάδα και πελάτη·
// το Γύρισμα ο πελάτης το βλέπει μόνο με c.book, που η Συνομιλία δεν ξέρει, άρα χωρίς σύνδεσμο.
export const resultLink = (
  kind: "deliverable" | "filming" | null,
  id: string | null,
  isTeamViewer = true,
): ResultLink | null => {
  if (kind === null || id === null) return null;
  if (kind === "filming" && !isTeamViewer) return null;
  return kind === "deliverable"
    ? { href: `${DELIVERABLES_PATH}/${id}`, label: OPEN_RESULT_DELIVERABLE }
    : { href: `${FILMING_PATH}/${id}`, label: OPEN_RESULT_FILMING };
};

// Η σελίδα του Παραδοτέου στο οποίο αναφέρεται ένα Αίτημα πελάτη (αλλαγή μετά την έγκριση ή Παραδοτέο που δημιουργήθηκε).
export const clientDeliverableHref = (item: ClientRequest): string | null => {
  if (item.kind === "change" && item.deliverableId)
    return `${DELIVERABLES_PATH}/${item.deliverableId}`;
  return item.resultKind === "deliverable" && item.resultId
    ? `${DELIVERABLES_PATH}/${item.resultId}`
    : null;
};

// Η Συνομιλία του πελάτη δεν έχει ξεχωριστή σελίδα ανά Μήνυμα: το anchor πηγαίνει στο Μήνυμα της σελίδας.
export const clientChatHref = (item: ClientRequest): string | null =>
  item.messageId ? `${MESSAGES_PATH}#${messageAnchor(item.messageId)}` : null;

// Ανοιχτά πρώτα, μετά νεότερα πρώτα (J3).
export const sortClientRequests = (
  items: readonly ClientRequest[],
): ClientRequest[] =>
  [...items].sort((a, b) => {
    if ((a.state === "open") !== (b.state === "open"))
      return a.state === "open" ? -1 : 1;
    return Date.parse(b.at) - Date.parse(a.at);
  });

export const openCountOf = (items: readonly ClientRequest[]): number =>
  items.filter((item) => item.state === "open").length;

export type TimelineEntry =
  | { type: "message"; at: string; message: ThreadMessage }
  | { type: "change"; at: string; change: ChangeRequest };

// Τα Μηνύματα και οι αλλαγές μετά την έγκριση στη χρονική τους θέση (Μ12). Σε ισοβαθμία προηγείται το Μήνυμα.
export const timelineOf = (
  messages: readonly ThreadMessage[],
  changes: readonly ChangeRequest[],
): TimelineEntry[] => {
  const entries: TimelineEntry[] = [
    ...messages.map((message): TimelineEntry => ({ type: "message", at: message.at, message })),
    ...changes.map((change): TimelineEntry => ({ type: "change", at: change.at, change })),
  ];
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => Date.parse(a.entry.at) - Date.parse(b.entry.at) || a.index - b.index)
    .map(({ entry }) => entry);
};

// Μια γραμμή του πλαϊνού «Αιτήματα αυτού του Πελάτη».
export interface SideRequest {
  key: string;
  kind: MessageRequest["kind"] | "change";
  state: MessageRequest["state"];
  text: string;
  assigneeName: string | null;
  daysOpen: number | null;
  href: string;
}

const SIDE_TEXT_LIMIT = 80;

// Ανοιχτά πρώτα· μέσα σε κάθε ομάδα όπως έρχονται (παλιότερα πρώτα). Μόνο ό,τι βλέπει ο θεατής.
export const sideRequestsOf = (
  messages: readonly ThreadMessage[],
  changes: readonly ChangeRequest[],
): SideRequest[] => {
  const fromMessages = messages.flatMap((message): SideRequest[] =>
    message.request === null || message.deleted
      ? []
      : [
          {
            key: message.id,
            kind: message.request.kind,
            state: message.request.state,
            text: truncate(message.body ?? "", SIDE_TEXT_LIMIT),
            assigneeName: message.request.assigneeName ?? null,
            daysOpen: message.request.daysOpen ?? null,
            href: `#${messageAnchor(message.id)}`,
          },
        ],
  );
  const fromChanges = changes.map(
    (change): SideRequest => ({
      key: change.id,
      kind: "change",
      state: change.state === "open" ? "open" : "done",
      text: truncate(change.body, SIDE_TEXT_LIMIT),
      assigneeName: null,
      daysOpen: null,
      href: `${DELIVERABLES_PATH}/${change.deliverableId}`,
    }),
  );
  const all = [...fromMessages, ...fromChanges];
  return [...all.filter((item) => item.state === "open"), ...all.filter((item) => item.state !== "open")];
};
