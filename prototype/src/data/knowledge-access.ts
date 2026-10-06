// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «13 Γνώση και Βοηθός».
// Πηγές: κεφ. 3.8 «Λεπτομέρειες κανόνων», 01-roles-and-permissions.md («Διαχειρίζεται Γνώση»· η ανάγνωση
// είναι βασικό δικαίωμα κάθε Χρήστη), ADR 0014.

import { CATALOGUE, isPackage } from "@/data/catalogue";
import {
  CONVERSATIONS,
  KB_ITEMS,
  KB_SECTIONS,
  UNANSWERED,
  type Conversation,
  type ConversationKind,
  type KbItem,
  type Source,
  type Unanswered,
  type UnansweredState,
} from "@/data/knowledge";
import type { RoleId } from "@/data/roles";

export interface KnowledgeCaps {
  // L1, L2, L3: «Διαχειρίζεται Γνώση» (Ιδιοκτήτης, Διαχείριση).
  canManage: boolean;
  // A8, A9: κάθε Χρήστης ομάδας ή πελάτη. Ο Επισκέπτης έχει μόνο το δημόσιο widget (R12).
  canRead: boolean;
  isClient: boolean;
}

export const knowledgeCapsOf = (role: RoleId): KnowledgeCaps => ({
  canManage: role === "owner" || role === "admin",
  canRead: role !== "visitor",
  isClient: role === "client",
});

// Ο κανόνας του Κοινού: ό,τι δεν βλέπει ο άνθρωπος, δεν το βλέπει ούτε ο Βοηθός γι' αυτόν.
export const isInAudience = (item: KbItem, role: RoleId): boolean => {
  if (!item.audience) return false;
  if (item.audience.kind === "δημόσιο") return true;
  return role !== "visitor" && item.audience.roles.includes(role);
};

// A8: μόνο δημοσιευμένα του Κοινού του, ακόμα κι αν διαχειρίζεται τη Γνώση (τα πρόχειρα ζουν στη L1).
export const readableItems = (role: RoleId): readonly KbItem[] =>
  KB_ITEMS.filter(
    (item) => item.state === "δημοσιευμένο" && isInAudience(item, role),
  );

export const sectionsWithItems = (items: readonly KbItem[]) =>
  KB_SECTIONS.map((section) => ({
    section,
    items: items.filter((item) => item.sectionId === section.id),
  })).filter((group) => group.items.length > 0);

// Αναζήτηση της A8: τίτλος, Περίληψη και κείμενο Άρθρου, χωρίς τόνους και κεφαλαία.
const normalize = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const searchItems = (
  items: readonly KbItem[],
  term: string,
): readonly KbItem[] => {
  const needle = normalize(term.trim());
  if (!needle) return items;
  return items.filter((item) =>
    normalize(
      [
        item.title,
        item.summary,
        ...(item.kind === "Άρθρο" ? item.body : []),
      ].join(" "),
    ).includes(needle),
  );
};

export const findKbItem = (id: string): KbItem | undefined =>
  KB_ITEMS.find((item) => item.id === id);

// Λόγοι που ένα πρόχειρο δεν δημοσιεύεται (L1).
export const publishBlockers = (item: KbItem): readonly string[] => [
  ...(item.summary.trim() ? [] : ["Λείπει η Περίληψη"]),
  ...(item.audience ? [] : ["Λείπει το Κοινό"]),
];

export const audienceText = (item: KbItem): string => {
  if (!item.audience) return "χωρίς Κοινό";
  if (item.audience.kind === "δημόσιο") return "δημόσιο";
  const labels: Readonly<Record<string, string>> = {
    owner: "Ιδιοκτήτης",
    admin: "Διαχείριση",
    production: "Παραγωγή",
    sales: "Πωλήσεις",
    accountant: "Λογιστής",
    client: "Πλήρης (πελάτη)",
  };
  return item.audience.roles.map((r) => labels[r]).join(", ");
};

export const sourceTitle = (source: Source): string => {
  if (source.kind === "διαγραμμένο") return `${source.title} (δεν υπάρχει πια)`;
  if (source.kind === "γνώση") return findKbItem(source.itemId)?.title ?? "—";
  const pkg = CATALOGUE.find((item) => item.id === source.packageId);
  return pkg && isPackage(pkg) ? `Πακέτο «${pkg.name}»` : "—";
};

export const conversationsOf = (
  kind: ConversationKind | undefined,
): readonly Conversation[] =>
  CONVERSATIONS.filter((c) => !kind || c.kind === kind).toSorted((a, b) =>
    b.lastAt.localeCompare(a.lastAt),
  );

export const findConversation = (id: string): Conversation | undefined =>
  CONVERSATIONS.find((c) => c.id === id);

export const unansweredIn = (state: UnansweredState): readonly Unanswered[] =>
  UNANSWERED.filter((u) => u.state === state).toSorted(
    (a, b) => b.timesAsked - a.timesAsked || b.lastAt.localeCompare(a.lastAt),
  );

export const openUnansweredCount = (): number =>
  UNANSWERED.filter((u) => u.state === "ανοιχτή").length;
