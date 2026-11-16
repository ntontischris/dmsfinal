// Ο κανόνας ουράς κάθε οδηγού (flow.md → Queue rule) από αναγνώσεις που υπάρχουν ήδη (μόνο ανάγνωση):
// πόσα περιμένουν και ποιο περιμένει πιο πολύ. Καθαρό αρχείο: τα σχήματα και οι μετατροπές, χωρίς βάση.

import { z } from "zod";

import type { NeedRow } from "@/modules/messages";

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

export type CardRead = z.output<typeof cardSchema>;

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

// «Απαντώ σε Πελάτες»: ο ίδιος αριθμός με το «Χρειάζονται εμένα» (readNeedsMe) — μία γραμμή ανά Πελάτη με ανοιχτό
// Αίτημα, Συνομιλία που «Περιμένει απάντηση» ή @αναφορά. null = δεν φόρτωσε: τίποτα.
export const apantoDigest = (needs: readonly NeedRow[] | null): JobDigest => {
  const rows = needs ?? [];
  return {
    job: "apanto-se-pelates",
    count: rows.length,
    oldest: oldestOf(
      rows.map((row) => ({
        who: row.who,
        since: row.since,
        day: null,
        href: row.href,
      })),
    ),
  };
};

// «Ταβέρνα Χ: ζητά μετάθεση» → «Ταβέρνα Χ».
const clientOfTitle = (title: string | undefined): string =>
  (title ?? "").split(": ")[0];

// «Αιτήματα γυρίσματος»: κρατήσεις, μεταθέσεις και ακυρώσεις προς έγκριση. Το πλήθος είναι του ίδιου του οδηγού
// (loadEgkrinoRows: ένα ανά Γύρισμα), ώστε η Σήμερα και ο οδηγός να λένε τον ίδιο αριθμό· χωρίς αυτό, της κάρτας.
// Οι διαγραφές στο Google είναι δική τους γραμμή κάρτας (today-rows).
export const egkrinoDigest = (
  approvals: CardRead | null,
  count: number | null,
): JobDigest => {
  const card = approvals ?? EMPTY_CARD;
  const items = card.items.map((item) => ({
    who: clientOfTitle(item.title),
    since: item.waiting_since ?? item.at ?? "",
    day: item.at ?? null,
    href: item.link,
  }));
  return {
    job: "egkrino-gyrismata",
    count: count ?? card.count,
    oldest: oldestOf(items.filter((item) => item.since)),
  };
};
