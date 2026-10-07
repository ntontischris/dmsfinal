// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «11 Μηνύματα»: ορατότητα Μηνυμάτων, Συνομιλίες, ουρά Αιτημάτων.
// Πηγές: 01-roles-and-permissions.md («Συνομιλεί με πελάτη», «Μεταβιβάζει Υπεύθυνο»), κεφ. 3.6
// «Λεπτομέρειες κανόνων: Μηνύματα», ADR 0007, ADR 0012.

import {
  CREW_PEOPLE,
  NOW,
  PERSON_OF_ROLE,
  PRODUCTIONS,
  findProduction,
  type ProductionStub,
} from "@/data/filming";
import {
  MESSAGES,
  MESSAGE_RULES,
  UNREAD,
  type Message,
  type MessageRequest,
} from "@/data/messages";
import type { RoleId } from "@/data/roles";
import { canSee, findScreen } from "@/data/screens";
import {
  KYPSELI_ID,
  SALES_CLIENTS,
  TEAM,
  type SalesClient,
} from "@/data/sales";

export interface MessageCaps {
  canSee: boolean;
  isClient: boolean;
  // Εύρος «όσα με αφορούν»: Υπεύθυνος Πελάτη βλέπει όλη τη Συνομιλία, Μέλος μόνο την ετικέτα της Παραγωγής του.
  isScoped: boolean;
  canWrite: boolean;
  // Μοιράζει το «Χωρίς υπεύθυνο» και αλλάζει τον υπεύθυνο οποιουδήποτε Αιτήματος.
  canReassign: boolean;
}

// Ένα Δικαίωμα ομάδας, «Συνομιλεί με πελάτη»: διαβάζει, γράφει προς πελάτη και γράφει Εσωτερικά Μηνύματα.
export const messageCapsOf = (role: RoleId): MessageCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isTeamWriter = isAdminLike || role === "production" || role === "sales";
  return {
    canSee: isTeamWriter || role === "client",
    isClient: role === "client",
    isScoped: role === "production" || role === "sales",
    canWrite: isTeamWriter || role === "client",
    canReassign: isAdminLike,
  };
};

// Ο Χρήστης του ρόλου στο prototype· ο πελάτης είναι η Μαρία Παπαδάκη της Κυψέλης.
export const meOf = (role: RoleId): string =>
  role === "client" ? "client" : (PERSON_OF_ROLE[role] ?? "");

export const teamName = (id: string | null): string =>
  id === null
    ? "Χωρίς υπεύθυνο"
    : (CREW_PEOPLE.find((p) => p.id === id)?.name ??
      TEAM.find((m) => m.id === id)?.name ??
      "—");

// Όσοι μπορούν να @αναφερθούν: η ομάδα με «Συνομιλεί με πελάτη» (όχι ο Λογιστής).
export const MENTIONABLE: readonly { id: string; name: string }[] = [
  ...CREW_PEOPLE.map((p) => ({ id: p.id, name: p.name })),
  ...TEAM.filter((m) => !CREW_PEOPLE.some((p) => p.id === m.id)).map((m) => ({
    id: m.id,
    name: m.name,
  })),
];

export const findClientOf = (id: string): SalesClient | undefined =>
  SALES_CLIENTS.find((c) => c.id === id);

const isMemberOf = (personId: string, production: ProductionStub): boolean =>
  production.ownerId === personId || production.memberIds.includes(personId);

const isClientOwner = (personId: string, clientId: string): boolean =>
  findClientOf(clientId)?.ownerId === personId;

// Γιατί ένας Χρήστης ομάδας με Εύρος «όσα με αφορούν» βλέπει ένα Μήνυμα (ή γιατί όχι).
export type SeeReason =
  "όλα" | "Υπεύθυνος Πελάτη" | "Μέλος Παραγωγής" | "@αναφορά" | null;

export const seeReason = (role: RoleId, message: Message): SeeReason => {
  const caps = messageCapsOf(role);
  if (!caps.canSee || caps.isClient) return null;
  if (!caps.isScoped) return "όλα";
  const me = meOf(role);
  if (isClientOwner(me, message.clientId)) return "Υπεύθυνος Πελάτη";
  const production = message.productionId
    ? findProduction(message.productionId)
    : undefined;
  if (production && isMemberOf(me, production)) return "Μέλος Παραγωγής";
  if (message.mentions?.includes(me)) return "@αναφορά";
  return null;
};

// Ο πελάτης βλέπει όλη τη Συνομιλία του Πελάτη του εκτός από τα Εσωτερικά Μηνύματα.
export const canSeeMessage = (role: RoleId, message: Message): boolean =>
  messageCapsOf(role).isClient
    ? message.clientId === KYPSELI_ID && !message.isInternal
    : seeReason(role, message) !== null;

const byTime = (a: Message, b: Message): number => a.at.localeCompare(b.at);

export const messagesOf = (
  role: RoleId,
  clientId: string,
  productionId?: string,
): readonly Message[] =>
  MESSAGES.filter(
    (m) =>
      m.clientId === clientId &&
      canSeeMessage(role, m) &&
      (!productionId || m.productionId === productionId),
  ).sort(byTime);

export const isUnread = (role: RoleId, message: Message): boolean =>
  (UNREAD[meOf(role)] ?? []).includes(message.id);

export interface ConversationRow {
  client: SalesClient;
  last: Message | undefined;
  unread: number;
  openRequests: number;
  // Με Εύρος «όσα με αφορούν»: όλη τη Συνομιλία ή μόνο κομμάτια της (ετικέτα, @αναφορά).
  isPartial: boolean;
}

// Οι Συνομιλίες που βλέπει ο ρόλος, κατά τελευταίο Μήνυμα. Ο Υπεύθυνος Πελάτη τη βλέπει και όταν είναι άδεια.
export const conversationsOf = (role: RoleId): readonly ConversationRow[] => {
  const caps = messageCapsOf(role);
  if (!caps.canSee || caps.isClient) return [];
  const me = meOf(role);
  return SALES_CLIENTS.map((client) => {
    const visible = messagesOf(role, client.id);
    return {
      client,
      last: visible.at(-1),
      unread: visible.filter((m) => isUnread(role, m)).length,
      openRequests: visible.filter((m) => m.request?.state === "ανοιχτό")
        .length,
      isPartial: caps.isScoped && !isClientOwner(me, client.id),
    };
  })
    .filter(
      (row) =>
        row.last || (caps.isScoped ? isClientOwner(me, row.client.id) : false),
    )
    .sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""));
};

// Οι Παραγωγές που μπορεί να πάρει ως ετικέτα ένα Μήνυμα του Πελάτη (όχι οι Εσωτερικές).
export const productionsOfClient = (
  clientId: string,
): readonly ProductionStub[] =>
  PRODUCTIONS.filter((p) => p.clientId === clientId);

export type RequestView =
  "για μένα" | "όλα τα ανοιχτά" | "χωρίς υπεύθυνο" | "κλεισμένα";

// Το «Χωρίς υπεύθυνο» φαίνεται μόνο σε όσους το μοιράζουν (αρχή «Λειτουργεί με έναν άνθρωπο»).
export const requestViewsOf = (
  role: RoleId,
  isSolo = false,
): readonly RequestView[] =>
  messageCapsOf(role).canReassign && !isSolo
    ? ["για μένα", "όλα τα ανοιχτά", "χωρίς υπεύθυνο", "κλεισμένα"]
    : ["για μένα", "όλα τα ανοιχτά", "κλεισμένα"];

export type RequestMessage = Message & { request: MessageRequest };

const hasRequest = (m: Message): m is RequestMessage => !!m.request;

export const requestsOf = (
  role: RoleId,
  view: RequestView,
): readonly RequestMessage[] => {
  const me = meOf(role);
  const visible = MESSAGES.filter(
    (m) => hasRequest(m) && canSeeMessage(role, m),
  ).filter(hasRequest);
  const open = visible.filter((m) => m.request.state === "ανοιχτό");
  const picked =
    view === "για μένα"
      ? open.filter((m) => m.request.assigneeId === me)
      : view === "όλα τα ανοιχτά"
        ? open
        : view === "χωρίς υπεύθυνο"
          ? open.filter((m) => m.request.assigneeId === null)
          : visible.filter((m) => m.request.state !== "ανοιχτό");
  return [...picked].sort((a, b) =>
    view === "κλεισμένα"
      ? (b.request.closing?.when ?? "").localeCompare(
          a.request.closing?.when ?? "",
        )
      : a.request.declaredAt.localeCompare(b.request.declaredAt),
  );
};

const dayOf = (iso: string): number => Date.parse(iso.slice(0, 10));

export const daysOpen = (request: MessageRequest): number =>
  Math.round((dayOf(NOW) - dayOf(request.declaredAt)) / 86_400_000);

// Η ειδοποίηση «Αίτημα ανοιχτό Χ μέρες» (Γεγονός 47) έχει φύγει.
export const isStale = (request: MessageRequest): boolean =>
  request.state === "ανοιχτό" &&
  daysOpen(request) >= MESSAGE_RULES.requestOpenDays;

// Αυτόματη ανάθεση: Υπεύθυνος Παραγωγής της ετικέτας, αλλιώς Υπεύθυνος Πελάτη, αλλιώς «Χωρίς υπεύθυνο».
export const assigneeFor = (
  clientId: string,
  productionId?: string,
): string | null =>
  (productionId ? findProduction(productionId)?.ownerId : undefined) ??
  findClientOf(clientId)?.ownerId ??
  null;

// Ποιος κλείνει ένα Αίτημα: ο υπεύθυνός του ή όποιος «Μεταβιβάζει Υπεύθυνο».
export const canHandleRequest = (
  role: RoleId,
  request: MessageRequest,
): boolean =>
  request.state === "ανοιχτό" &&
  (messageCapsOf(role).canReassign || request.assigneeId === meOf(role));

// Ο αποστολέας διορθώνει για MESSAGE_RULES.editMinutes λεπτά· διαγράφει όποτε θέλει, εκτός αν έγινε Αίτημα.
export const isOwnMessage = (role: RoleId, message: Message): boolean =>
  message.author.kind === "team"
    ? message.author.personId === meOf(role)
    : role === "client" && message.author.name === "Μαρία Παπαδάκη";

export const minutesSince = (iso: string): number =>
  Math.round((Date.parse(NOW) - Date.parse(iso)) / 60_000);

export const canEditMessage = (role: RoleId, message: Message): boolean =>
  isOwnMessage(role, message) &&
  !message.deletedAt &&
  minutesSince(message.at) <= MESSAGE_RULES.editMinutes;

export const canDeleteMessage = (role: RoleId, message: Message): boolean =>
  isOwnMessage(role, message) && !message.deletedAt && !message.request;

export const authorName = (message: Message): string =>
  message.author.kind === "team"
    ? teamName(message.author.personId)
    : message.author.name;

export const productionTitle = (id: string | undefined): string | undefined =>
  id ? findProduction(id)?.title : undefined;

// Τα Μηνύματα όπου ο Χρήστης έχει @αναφερθεί (λίστα «Με ανέφεραν» στα Εισερχόμενα).
export const mentionsOf = (role: RoleId): readonly Message[] => {
  const me = meOf(role);
  return MESSAGES.filter((m) => m.mentions?.includes(me)).sort((a, b) =>
    b.at.localeCompare(a.at),
  );
};

// Ανοίγει ο ρόλος αυτή την οθόνη; Από τον κατάλογο οθονών, ώστε οι σύνδεσμοι να μην οδηγούν σε «Χωρίς δικαίωμα».
export const canOpenScreen = (role: RoleId, code: string): boolean => {
  const screen = findScreen(code);
  return screen ? canSee(screen, role) : true;
};
