// J3 (νέα εμφάνιση): η Συνομιλία και τα Αιτήματα του Χρήστη πελάτη στα σχήματα του prototype. Καθαρές συναρτήσεις·
// ο πελάτης δεν βλέπει ποτέ υπεύθυνο ή μέρες ανοιχτό, ούτε σύνδεσμο προς Γύρισμα (ίδιος κανόνας με τη σημερινή οθόνη).

import { formatWhen } from "../helpers";
import {
  clientChatHref,
  clientDeliverableHref,
  resultLink,
  sortClientRequests,
} from "../request-helpers";
import {
  CLIENT_DELIVERABLE_LINK,
  REQUEST_KIND_LABELS,
  REQUEST_STATE_LABELS,
} from "../request-labels";
import type {
  ClientRequest,
  MessageRequest,
  RequestKind,
  Thread,
  ThreadMessage,
} from "../view-schema";
import { j2MessageOf, type J2Message } from "./j2-adapter";

export interface J3Link {
  href: string;
  label: string;
  isExternal: boolean;
}

export interface J3Request {
  title: string;
  state: string;
  isOpen: boolean;
  closedWhen: string | null;
  links: J3Link[];
  comment: string | null;
  reply: string | null;
}

interface ClosingFields {
  kind: MessageRequest["kind"] | "change";
  state: MessageRequest["state"];
  link: string | null;
  comment: string | null;
  reply: string | null;
  resultKind: MessageRequest["resultKind"];
  resultId: string | null;
}

// Αποτέλεσμα (Παραδοτέο) και σύνδεσμος κλεισίματος, όταν ολοκληρώθηκε.
const linksOf = (fields: ClosingFields): J3Link[] => {
  if (fields.state !== "done") return [];
  const result = resultLink(fields.resultKind, fields.resultId, false);
  return [
    ...(result ? [{ ...result, isExternal: false }] : []),
    ...(fields.link
      ? [{ href: fields.link, label: fields.link, isExternal: true }]
      : []),
  ];
};

const requestOf = (
  fields: ClosingFields,
  closedAt: string | null,
  now: Date,
): J3Request => ({
  title: `Αίτημα · ${REQUEST_KIND_LABELS[fields.kind]}`,
  state: REQUEST_STATE_LABELS[fields.state],
  isOpen: fields.state === "open",
  closedWhen: closedAt === null ? null : formatWhen(closedAt, now),
  links: linksOf(fields),
  comment: fields.state === "done" ? fields.comment : null,
  reply: fields.state === "rejected" ? fields.reply : null,
});

export const j3RequestOf = (
  request: MessageRequest,
  now: Date = new Date(),
): J3Request => requestOf(request, request.closedAt, now);

export interface J3Item {
  message: J2Message;
  isOwn: boolean;
  request: J3Request | null;
}

// Ένα Μήνυμα για τον πελάτη: ετικέτα χωρίς σύνδεσμο, καμία ενέργεια της ομάδας (ετικέτα, «Σημείωσε ως Αίτημα»).
export const j3ItemOf = (
  thread: Thread,
  message: ThreadMessage,
  now: Date = new Date(),
): J3Item => {
  const view = j2MessageOf(thread, message, now);
  return {
    message: { ...view, tagHref: null, canTag: false, canMark: false },
    isOwn: message.mine,
    request:
      message.request === null || message.deleted
        ? null
        : j3RequestOf(message.request, now),
  };
};

export interface J3RequestRow {
  key: string;
  title: string;
  isFaded: boolean;
  when: string;
  text: string;
  about: string | null;
  box: J3Request;
  chatHref: string | null;
  deliverable: J3Link | null;
}

// Η καρτέλα «Αιτήματα»: ανοιχτά πρώτα, μετά τα νεότερα. Ένα αίτημα αλλαγής ανοίγει το Παραδοτέο του.
export const j3RequestRowsOf = (
  items: readonly ClientRequest[],
  now: Date = new Date(),
): J3RequestRow[] =>
  sortClientRequests(items).map((item) => {
    const box = requestOf(item, null, now);
    const href = clientDeliverableHref(item);
    const isShown = box.links.some((link) => link.href === href);
    return {
      key: `${item.messageId ?? item.deliverableId}-${item.at}`,
      title: REQUEST_KIND_LABELS[item.kind],
      isFaded: item.state !== "open",
      when: formatWhen(item.at, now),
      text: item.text,
      about: item.kind === "change" ? item.deliverableTitle : null,
      box,
      chatHref: clientChatHref(item),
      deliverable:
        href === null || isShown
          ? null
          : { href, label: CLIENT_DELIVERABLE_LINK, isExternal: false },
    };
  });

// Τα είδη Αιτήματος όπως τα βλέπει ο πελάτης (prototype `j3-compose-model.ts`), μόνο όσα υπάρχουν στη βάση.
export const CLIENT_REQUEST_KINDS: readonly {
  kind: RequestKind;
  label: string;
}[] = [
  { kind: "deliverable", label: "Ένα νέο βίντεο ή υλικό" },
  { kind: "filming", label: "Γύρισμα (νέο ή άλλη μέρα)" },
  { kind: "other", label: "Κάτι άλλο" },
];

export const j3RecipientOf = (managerName: string | null): string =>
  managerName
    ? `${managerName} και η ομάδα της Devre Media`
    : "η ομάδα της Devre Media";

// Η επιβεβαίωση μετά την αποστολή: τι στάλθηκε, ποιον ειδοποιήσαμε, τι ακολουθεί.
export const j3SentNoticeOf = (
  isRequest: boolean,
  recipient: string,
): string => {
  const who = `Ειδοποιήθηκαν: ${recipient}.`;
  return isRequest
    ? `Το Αίτημα στάλθηκε. ${who} Θα δεις εδώ πότε ολοκληρωθεί ή αν απορριφθεί.`
    : `Το μήνυμα στάλθηκε. ${who} Θα δεις την απάντηση εδώ.`;
};

// Σειρά της Συνομιλίας, στη διεύθυνση (`?order=old`): προεπιλογή τα νεότερα πρώτα (φόρμα πάνω),
// αλλιώς χρονολογικά με τη φόρμα κάτω, όπως στη σημερινή οθόνη.
export type J3Order = "new" | "old";

export const parseJ3Order = (value: string | undefined): J3Order =>
  value === "old" ? "old" : "new";

// Η χρονική σειρά έρχεται παλαιότερο πρώτο· για «νεότερα πρώτα» αντιστρέφεται (χωρίς να πειραχτεί το αρχικό).
export const orderedOf = <T>(
  chronological: readonly T[],
  order: J3Order,
): T[] => (order === "old" ? [...chronological] : [...chronological].reverse());

export const j3OrderHrefOf = (order: J3Order, tabPath: string): string =>
  order === "old" ? `${tabPath}?order=old` : tabPath;
