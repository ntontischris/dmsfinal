// Ο κανόνας ουράς κάθε οδηγού (flow.md → Queue rule) από αναγνώσεις που υπάρχουν ήδη (μόνο ανάγνωση):
// πόσα περιμένουν και ποιο περιμένει πιο πολύ. Καθαρό αρχείο: τα σχήματα και οι μετατροπές, χωρίς βάση.

import { z } from "zod";

export interface Oldest {
  // Ο Πελάτης.
  who: string;
  // Από πότε περιμένει (ISO).
  since: string;
  // Η μέρα του Γυρίσματος (ISO), για τα αιτήματα γυρίσματος.
  day: string | null;
  // Πού ανοίγει.
  href: string;
}

export interface JobDigest {
  job: string;
  count: number;
  oldest: Oldest | null;
}

export interface JobDigests {
  // Πότε διαβάστηκαν (ms): το «πριν από πόσο» μετρά από εδώ ώσπου να τρέξει το ρολόι της σελίδας.
  at: number;
  jobs: readonly JobDigest[];
}

const inboxSchema = z.object({
  items: z.array(
    z.object({
      clientId: z.string(),
      clientName: z.string(),
      lastAt: z.string(),
      lastInternal: z.boolean(),
      unread: z.number(),
    }),
  ),
});

const cardSchema = z.object({
  count: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      title: z.string().optional(),
      subtitle: z.string().nullable().optional(),
      at: z.string().nullable().optional(),
      waiting_since: z.string().nullable().optional(),
      link: z.string(),
    }),
  ),
});

export type InboxRead = z.output<typeof inboxSchema>;
export type CardRead = z.output<typeof cardSchema>;

export const parseInboxRead = (data: unknown): InboxRead =>
  inboxSchema.parse(data);

export const parseCardRead = (data: unknown): CardRead =>
  cardSchema.parse(data);

const EMPTY_CARD: CardRead = { count: 0, items: [] };

const oldestOf = (items: readonly Oldest[]): Oldest | null =>
  items.reduce<Oldest | null>(
    (best, item) =>
      best === null || Date.parse(item.since) < Date.parse(best.since)
        ? item
        : best,
    null,
  );

// «Απαντώ σε Πελάτες»: Συνομιλίες όπου έγραψε τελευταίος ο Πελάτης και δεν το διάβασα, μαζί με Αιτήματα και
// @αναφορές. Ένας Πελάτης μετρά μία φορά· η κάρτα δίνει ως 3 γραμμές, οι υπόλοιπες μετρούν χωρίς όνομα.
export const apantoDigest = (
  inbox: InboxRead | null,
  requests: CardRead | null,
): JobDigest => {
  const card = requests ?? EMPTY_CARD;
  const waiting = (inbox?.items ?? []).filter(
    (item) => item.unread > 0 && !item.lastInternal,
  );
  const fromInbox = waiting.map((item) => ({
    who: item.clientName,
    since: item.lastAt,
    day: null,
    href: `/app/messages/${item.clientId}`,
  }));
  const fromCard = card.items.map((item) => ({
    who: item.subtitle ?? item.title ?? "",
    since: item.waiting_since ?? item.at ?? "",
    day: null,
    href: item.link,
  }));
  const clients = new Set([...fromInbox, ...fromCard].map((item) => item.who));
  const unnamed = Math.max(card.count - card.items.length, 0);
  return {
    job: "apanto-se-pelates",
    count: clients.size + unnamed,
    oldest: oldestOf([...fromInbox, ...fromCard].filter((item) => item.since)),
  };
};

// «Ταβέρνα Χ: ζητά μετάθεση» → «Ταβέρνα Χ».
const clientOfTitle = (title: string | undefined): string =>
  (title ?? "").split(": ")[0];

// «Αιτήματα γυρίσματος»: κρατήσεις, μεταθέσεις και ακυρώσεις προς έγκριση, και οι διαγραφές στο Google.
export const egkrinoDigest = (
  approvals: CardRead | null,
  deletions: CardRead | null,
): JobDigest => {
  const cards = [approvals ?? EMPTY_CARD, deletions ?? EMPTY_CARD];
  const items = cards.flatMap((card) =>
    card.items.map((item) => ({
      who: clientOfTitle(item.title),
      since: item.waiting_since ?? item.at ?? "",
      day: item.at ?? null,
      href: item.link,
    })),
  );
  return {
    job: "egkrino-gyrismata",
    count: cards.reduce((sum, card) => sum + card.count, 0),
    oldest: oldestOf(items.filter((item) => item.since)),
  };
};
