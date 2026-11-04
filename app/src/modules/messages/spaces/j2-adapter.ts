// J2 (νέα εμφάνιση): η πραγματική Συνομιλία (messages_thread) στα σχήματα του prototype. Καθαρές συναρτήσεις· οι κανόνες
// (ποιος σημειώνει Αίτημα, ποια ετικέτα προεπιλέγεται) είναι ίδιοι με της σημερινής οθόνης.

import type { FilterGroup } from "@/spaces/kit/filter-bar";

import { formatSize } from "../attachment-rules";
import {
  attachmentHref,
  formatWhen,
  threadHref,
  type MessageFilters,
  type ProductionChip,
} from "../helpers";
import { CLIENT_STATUS, NO_MANAGER } from "../labels";
import {
  DELIVERABLES_PATH,
  resultLink,
  type SideRequest,
} from "../request-helpers";
import {
  NO_ASSIGNEE,
  REQUEST_KIND_LABELS,
  REQUEST_STATE_LABELS,
  daysOpenText,
} from "../request-labels";
import type {
  ChangeRequest,
  MessageRequest,
  Thread,
  ThreadMessage,
  ThreadProduction,
} from "../view-schema";

export interface J2Attachment {
  id: string;
  name: string;
  href: string;
  size: string;
}

export interface J2Request {
  kind: MessageRequest["kind"];
  title: string;
  state: string;
  isOpen: boolean;
  isStale: boolean;
  assignee: string;
  assigneeId: string | null;
  daysOpen: string | null;
  isDeclaredByTeam: boolean;
  link: string | null;
  comment: string | null;
  reply: string | null;
  isAutomatic: boolean;
  result: { href: string; label: string } | null;
  canHandle: boolean;
  canReassign: boolean;
}

export interface J2Message {
  id: string;
  anchor: string;
  side: "client" | "team";
  authorName: string;
  isInternal: boolean;
  at: string;
  when: string;
  // Για το «νέο»: Μήνυμα άλλου, όχι διαγραμμένο (η σύγκριση με τον δείκτη ανάγνωσης γίνεται στον browser).
  canBeNew: boolean;
  productionId: string | null;
  tagTitle: string | null;
  tagHref: string | null;
  isDeleted: boolean;
  body: string | null;
  attachments: J2Attachment[];
  mentions: string | null;
  isEdited: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canTag: boolean;
  canMark: boolean;
  isOwnRequest: boolean;
  editMinutesLeft: number | null;
  request: J2Request | null;
}

// Γράφει ο θεατής στην ετικέτα του Μηνύματος (ίδιος κανόνας με το message_can_write): χωρίς ετικέτα θέλει «γενικά».
const canWriteTag = (
  productionId: string | null,
  productions: readonly ThreadProduction[],
  canWriteUntagged: boolean,
): boolean =>
  productionId === null
    ? canWriteUntagged
    : productions.some((production) => production.id === productionId);

export const j2RequestOf = (request: MessageRequest): J2Request => {
  const isOpen = request.state === "open";
  return {
    kind: request.kind,
    title: `Αίτημα: ${REQUEST_KIND_LABELS[request.kind]}`,
    state: REQUEST_STATE_LABELS[request.state],
    isOpen,
    isStale: request.stale === true,
    assignee: `Ανατέθηκε: ${request.assigneeName ?? NO_ASSIGNEE}`,
    assigneeId: request.assigneeId ?? null,
    daysOpen:
      isOpen && typeof request.daysOpen === "number"
        ? daysOpenText(request.daysOpen)
        : null,
    isDeclaredByTeam: request.declaredBy === "team",
    link: request.link,
    comment: request.comment,
    reply: request.reply,
    isAutomatic: request.automatic,
    result: resultLink(request.resultKind, request.resultId),
    canHandle: isOpen && request.canHandle === true,
    canReassign: isOpen && request.canReassign === true,
  };
};

const minutesLeft = (at: string, editMinutes: number, now: Date): number =>
  Math.max(
    0,
    editMinutes - Math.floor((now.getTime() - Date.parse(at)) / 60_000),
  );

export const j2MessageOf = (
  thread: Thread,
  message: ThreadMessage,
  now: Date = new Date(),
): J2Message => {
  const isDeleted = message.deleted;
  return {
    id: message.id,
    anchor: `m-${message.id}`,
    side: message.authorKind,
    authorName: message.authorName ?? "—",
    isInternal: message.internal === true,
    at: message.at,
    when: formatWhen(message.at, now),
    canBeNew: !message.mine && !isDeleted,
    productionId: message.productionId,
    tagTitle: message.productionTitle,
    tagHref:
      message.productionId === null
        ? null
        : threadHref(thread.client.id, { production: message.productionId }),
    isDeleted,
    body: message.body,
    attachments: isDeleted
      ? []
      : message.attachments.map((file) => ({
          id: file.id,
          name: file.name,
          href: attachmentHref(file.id),
          size: formatSize(file.size),
        })),
    mentions:
      (message.mentions ?? []).length > 0
        ? (message.mentions ?? []).map((person) => person.name).join(", ")
        : null,
    isEdited: message.editedAt !== null && !isDeleted,
    canEdit: !isDeleted && message.canEdit,
    canDelete: !isDeleted && message.canDelete,
    canTag: !isDeleted,
    canMark:
      !isDeleted &&
      message.authorKind === "client" &&
      message.request === null &&
      canWriteTag(
        message.productionId,
        thread.productions,
        thread.canWriteUntagged,
      ),
    isOwnRequest: !isDeleted && message.mine && message.request !== null,
    editMinutesLeft:
      message.mine && message.canEdit
        ? minutesLeft(message.at, thread.editMinutes, now)
        : null,
    request:
      message.request === null || isDeleted
        ? null
        : j2RequestOf(message.request),
  };
};

export interface J2Change {
  id: string;
  when: string;
  about: string;
  body: string;
  isOpen: boolean;
  state: string;
  deliverableHref: string;
}

export const j2ChangeOf = (
  change: ChangeRequest,
  now: Date = new Date(),
): J2Change => ({
  id: change.id,
  when: formatWhen(change.at, now),
  about: `Παραδοτέο: ${change.deliverableTitle}`,
  body: change.body,
  isOpen: change.state === "open",
  state: REQUEST_STATE_LABELS[change.state === "open" ? "open" : "done"],
  deliverableHref: `${DELIVERABLES_PATH}/${change.deliverableId}`,
});

export interface J2Header {
  name: string;
  href: string | undefined;
  sub: string;
}

export const j2HeaderOf = (
  client: Thread["client"],
  clientHref: string | undefined,
): J2Header => ({
  name: client.name,
  href: clientHref,
  sub: `Υπεύθυνος Πελάτη: ${client.managerName ?? NO_MANAGER} · Κατάσταση: ${CLIENT_STATUS[client.status] ?? client.status}`,
});

// Τα φίλτρα του prototype ως μία κάρτα «Παραγωγή»: όλα, μία επιλογή ανά ετικέτα με ορατά Μηνύματα, Χωρίς ετικέτα (όχι σε
// μερική όψη), Εσωτερικά.
export const j2FilterOf = (
  clientId: string,
  chips: readonly ProductionChip[],
  active: MessageFilters,
  hideUntagged: boolean,
): FilterGroup => {
  const isTagged = active.production !== undefined;
  return {
    label: "Παραγωγή",
    isSearchable: true,
    all: {
      label: "όλα",
      href: threadHref(clientId),
      isCurrent: !isTagged && active.filter === "all",
    },
    options: j2OptionsOf(clientId, chips, active, hideUntagged),
  };
};

const j2OptionsOf = (
  clientId: string,
  chips: readonly ProductionChip[],
  active: MessageFilters,
  hideUntagged: boolean,
): FilterGroup["options"] => {
  const isTagged = active.production !== undefined;
  return [
    ...chips.map((chip) => ({
      label: chip.title,
      href: threadHref(clientId, { production: chip.id }),
      isCurrent: active.production === chip.id,
    })),
    ...(hideUntagged
      ? []
      : [
          {
            label: "Χωρίς ετικέτα",
            href: threadHref(clientId, { filter: "untagged" }),
            isCurrent: !isTagged && active.filter === "untagged",
          },
        ]),
    {
      label: "Εσωτερικά",
      href: threadHref(clientId, { filter: "internal" }),
      isCurrent: !isTagged && active.filter === "internal",
    },
  ];
};

export interface J2SideRow {
  key: string;
  href: string;
  title: string;
  sub: string;
  state: string;
  isOpen: boolean;
}

const SIDE_TITLE_LIMIT = 50;

export const j2SideOf = (items: readonly SideRequest[]): J2SideRow[] =>
  items.map((item) => {
    const isOpen = item.state === "open";
    const who =
      item.kind === "change" ? null : (item.assigneeName ?? NO_ASSIGNEE);
    const days =
      isOpen && item.daysOpen !== null ? daysOpenText(item.daysOpen) : null;
    return {
      key: item.key,
      href: item.href,
      title: `${REQUEST_KIND_LABELS[item.kind]}: ${item.text.slice(0, SIDE_TITLE_LIMIT) || "—"}`,
      sub: [who, days]
        .filter((part): part is string => part !== null)
        .join(" · "),
      state: REQUEST_STATE_LABELS[item.state],
      isOpen,
    };
  });

// Η ετικέτα που προεπιλέγεται στον συντάκτη: του ?production= αν επιτρέπεται, αλλιώς καμία (ή η πρώτη όταν δεν
// επιτρέπεται «χωρίς ετικέτα»). Ίδιος κανόνας με τη σημερινή οθόνη.
export const j2DefaultTag = (
  productions: readonly ThreadProduction[],
  canWriteUntagged: boolean,
  wanted: string | undefined,
): string => {
  if (wanted !== undefined && productions.some((p) => p.id === wanted))
    return wanted;
  return canWriteUntagged ? "" : (productions[0]?.id ?? "");
};

// Οι @αναφορές του Εσωτερικού Μηνύματος: όσοι διαλέχτηκαν και το «@Όνομα» τους έμεινε στο κείμενο (όπως στο prototype).
export const mentionsIn = (
  text: string,
  picked: readonly string[],
  people: readonly { id: string; name: string }[],
): string[] =>
  people
    .filter(
      (person) =>
        picked.includes(person.id) && text.includes(`@${person.name}`),
    )
    .map((person) => person.id);
