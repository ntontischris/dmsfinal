// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «12 Ειδοποιήσεις και Αυτοματισμοί».
// Πηγές: κεφ. 4 «Λεπτομέρειες κανόνων», 01-roles-and-permissions.md («Διαχειρίζεται Αυτοματισμούς
// και Μηνύματα συστήματος», «Βλέπει Υγεία συστήματος»), ADR 0006, ADR 0007.

import { PERSON_OF_ROLE } from "@/data/filming";
import {
  AUTOMATIONS,
  EVENTS,
  INBOX,
  SENDS,
  type Automation,
  type InboxItem,
  type Recipient,
  type Send,
} from "@/data/notifications";
import type { RoleId } from "@/data/roles";

export interface NotificationCaps {
  // K1, K2, K3: «Διαχειρίζεται Αυτοματισμούς και Μηνύματα συστήματος» (Ιδιοκτήτης, Διαχείριση).
  canManage: boolean;
  // A2: όλοι οι Χρήστες, ομάδας και πελάτη. Ο Επισκέπτης δεν έχει καμπανάκι.
  hasInbox: boolean;
  isClient: boolean;
}

export const notificationCapsOf = (role: RoleId): NotificationCaps => ({
  canManage: role === "owner" || role === "admin",
  hasInbox: role !== "visitor",
  isClient: role === "client",
});

// Ο Χρήστης κάθε ρόλου στο prototype· ο Λογιστής είναι εξωτερικό γραφείο με λογαριασμό.
export const inboxPersonOf = (role: RoleId): string =>
  role === "client"
    ? "client"
    : role === "accountant"
      ? "accountant"
      : (PERSON_OF_ROLE[role] ?? "");

export const inboxOf = (role: RoleId): readonly InboxItem[] =>
  [...INBOX.filter((item) => item.personId === inboxPersonOf(role))].sort(
    (a, b) => b.at.localeCompare(a.at),
  );

// Ποιοι παραλήπτες «πιάνουν» κάθε ρόλο, για τις Προτιμήσεις της A2. Προσέγγιση του prototype:
// στο πραγματικό σύστημα το αποφασίζουν τα Δικαιώματα και η σχέση με το Γεγονός.
const ROLE_HINTS: Readonly<Record<RoleId, readonly string[]>> = {
  owner: [
    "Υπεύθυνος",
    "υπεύθυνος",
    "Διαχείριση",
    "Συνεργείο",
    "Παραγωγής",
    "αναφέρθηκε",
    "διέγραψε",
    "ανέλαβε",
    "Ανατεθειμένος",
  ],
  admin: [
    "Διαχείριση",
    "Συνεργείο",
    "Υπεύθυνος του Πελάτη",
    "υπεύθυνος του Αιτήματος",
    "αναφέρθηκε",
    "διέγραψε",
  ],
  production: [
    "Συνεργείο",
    "Παραγωγής",
    "Ανατεθειμένος",
    "ανέλαβε",
    "αναφέρθηκε",
    "Μέλη",
  ],
  sales: [
    "Ευκαιρίας",
    "Υπεύθυνος του Πελάτη",
    "υπεύθυνος του Αιτήματος",
    "αναφέρθηκε",
  ],
  accountant: ["Λογιστής"],
  client: [],
  visitor: [],
};

const ROLE_PERMISSIONS: Readonly<Record<RoleId, readonly string[]>> = {
  owner: [
    "Παρεκκλίνει από τον Κατάλογο",
    "Εγκρίνει κράτηση",
    "Ελέγχει Παραδοτέα",
    "Καταχωρεί Τιμολόγια",
    "Βλέπει κόστος και κερδοφορία",
    "Βλέπει Υγεία συστήματος",
  ],
  admin: [],
  production: [],
  sales: [],
  accountant: [],
  client: [],
  visitor: [],
};

const reaches = (role: RoleId, recipient: Recipient): boolean => {
  if (role === "client")
    return recipient.kind === "σχετικός" && !!recipient.isClient;
  if (recipient.kind === "δικαίωμα")
    return ROLE_PERMISSIONS[role].includes(recipient.permission);
  if (recipient.kind !== "σχετικός" || recipient.isClient) return false;
  return ROLE_HINTS[role].some((hint) => recipient.label.includes(hint));
};

export interface Preference {
  automation: Automation;
  eventTitle: string;
  // Ο πελάτης δεν σβήνει τα απαραίτητα· η ομάδα σβήνει οποιονδήποτε για τον εαυτό της.
  canMute: boolean;
  isMuted: boolean;
}

// Όσα έχει ήδη σβήσει ο Χρήστης του κάθε ρόλου στο prototype.
const MUTED: Readonly<Partial<Record<RoleId, readonly string[]>>> = {
  owner: ["au-11-1"],
  client: ["au-44-2"],
};

export const preferencesOf = (role: RoleId): readonly Preference[] =>
  AUTOMATIONS.filter(
    (a) => a.isActive && a.recipients.some((r) => reaches(role, r)),
  ).map((automation) => ({
    automation,
    eventTitle: EVENTS.find((e) => e.id === automation.eventId)?.title ?? "—",
    canMute: role !== "client" || !automation.isEssential,
    isMuted: (MUTED[role] ?? []).includes(automation.id),
  }));

// Ιστορικό αποστολών ανά Πελάτη (B2): μόνο ό,τι πήγε στους Χρήστες του Πελάτη, όχι οι Ειδοποιήσεις της ομάδας.
export const clientSendsOf = (clientId: string): readonly Send[] =>
  SENDS.filter((s) => s.clientId === clientId && s.recipient.isClient);

export type LogTab = "all" | "scheduled" | "failed";

export const sendsFor = (tab: LogTab): readonly Send[] =>
  SENDS.filter((s) =>
    tab === "scheduled"
      ? s.state === "προγραμματισμένο"
      : tab === "failed"
        ? s.state === "απέτυχε"
        : s.state !== "προγραμματισμένο",
  );

export const findAutomation = (id: string): Automation | undefined =>
  AUTOMATIONS.find((a) => a.id === id);
