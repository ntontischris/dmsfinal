// «Ξεκινώ τη μέρα μου» (docs/flows/xekino-ti-mera/flow.md): πού ανοίγει κάθε γραμμή, ποιες φαίνονται στο βήμα 1,
// ποια τονίζεται και ο μετρητής «Γραμμή n από N». Καθαρό αρχείο.

import { XEKINO_JOB } from "./flow-xekino";
import { flowOf, withQuery } from "./flows";
import type { Parked } from "./parked";
import type { Queue, QueueRow } from "./queue-rows";

// Η λίστα του βήματος 1: εκεί γυρνά ο οδηγός μιας γραμμής όταν τελειώσει.
export const XEKINO_LIST = `/app?job=${XEKINO_JOB}&step=1`;
// Πόσες γραμμές φαίνονται συνολικά· οι υπόλοιπες πίσω από το «Περισσότερα (N)».
export const SHOWN = 5;

// Γραμμή που είναι οδηγός (μισή δουλειά ή κανόνας ουράς): ανοίγει τον οδηγό, που στο «Τέλος» γυρνά στη λίστα.
export const isGuideRow = (row: QueueRow): boolean =>
  row.parked !== null || flowOf(row.key) !== undefined;

// Κάθε άλλη γραμμή ανοίγει τον σταθμό της με τη μπάρα του βήματος 2.
export const openHrefOf = (row: QueueRow): string =>
  isGuideRow(row)
    ? withQuery(row.href, { from: XEKINO_LIST })
    : withQuery(row.href, { job: XEKINO_JOB, step: "2", item: row.key });

// Η θέση του ίδιου του «Ξεκινώ» δεν είναι γραμμή: λέει ποια γραμμή είχε ανοίξει (για το «Συνέχισε»).
export const xekinoPlaceOf = (parked: readonly Parked[]): Parked | null =>
  parked.find((row) => row.job === XEKINO_JOB) ?? null;

export const withoutXekino = (parked: readonly Parked[]): readonly Parked[] =>
  parked.filter((row) => row.job !== XEKINO_JOB);

// «Συνέχισε»: η γραμμή που είχε ανοίξει μπαίνει πρώτη.
export const withResumed = (
  rows: readonly QueueRow[],
  item: string | undefined,
): readonly QueueRow[] => {
  const resumed = rows.find((row) => row.key === item);
  if (!resumed) return rows;
  return [
    { ...resumed, title: `Συνέχισε · ${resumed.title}` },
    ...rows.filter((row) => row !== resumed),
  ];
};

export interface ShownQueue {
  fromYesterday: readonly QueueRow[];
  today: readonly QueueRow[];
  rest: readonly QueueRow[];
}

// 5 γραμμές συνολικά: πρώτα «Έμειναν από χθες», μετά οι σημερινές· οι υπόλοιπες στο «Περισσότερα».
export const shownOf = (
  queue: Pick<Queue, "fromYesterday" | "today">,
  limit = SHOWN,
): ShownQueue => {
  const yesterday = queue.fromYesterday.slice(0, limit);
  const today = queue.today.slice(0, limit - yesterday.length);
  return {
    fromYesterday: yesterday,
    today,
    rest: [
      ...queue.fromYesterday.slice(yesterday.length),
      ...queue.today.slice(today.length),
    ],
  };
};

// Η τονισμένη γραμμή: η πρώτη, εκτός από αυτήν που μόλις άφησα («Επόμενο» → ?after=).
export const firstAfter = (
  rows: readonly QueueRow[],
  after: string | null,
): QueueRow | null => rows.find((row) => row.key !== after) ?? null;

export interface XekinoRound {
  day: string;
  // Όσες γραμμές πέρασαν από τη λίστα σήμερα, με τη σειρά που φάνηκαν.
  keys: readonly string[];
}

// Ο γύρος της μέρας: όσες ήταν στη λίστα όταν άνοιξε, συν όσες ήρθαν στο μεταξύ. Νέα μέρα = νέος γύρος.
export const withRoundKeys = (
  round: XekinoRound | null,
  keys: readonly string[],
  day: string,
): XekinoRound => {
  const kept = round?.day === day ? round.keys : [];
  return { day, keys: [...kept, ...keys.filter((key) => !kept.includes(key))] };
};

// «Γραμμή n από N»· null = η γραμμή δεν είναι στον γύρο.
export const roundCounterOf = (
  round: XekinoRound | null,
  item: string,
): string | null => {
  const index = round?.keys.indexOf(item) ?? -1;
  return round && index >= 0
    ? `Γραμμή ${index + 1} από ${round.keys.length}`
    : null;
};

export interface XekinoDone {
  // Η γραμμή ήταν ήδη κλειστή όταν άνοιξε (την έκλεισε άλλος).
  wasDoneBefore: boolean;
  // Η κίνηση έγινε (η γραμμή δεν είναι πια στη λίστα).
  isDone: boolean;
}

// Μία ανάγνωση της λίστας: τα κλειδιά των γραμμών και οι κάρτες που δεν φόρτωσαν.
export interface QueueRead {
  keys: readonly string[];
  failed: readonly string[];
}

// Η γραμμή λείπει από την ανάγνωση επειδή έκλεισε — όχι επειδή η κάρτα της δεν φόρτωσε ή επειδή η κάρτα δείχνει
// μόνο τις πρώτες γραμμές («άλλα N»), οπότε μπορεί απλώς να σπρώχτηκε πιο κάτω.
const isGoneFrom = (read: QueueRead, item: string): boolean => {
  const card = item.slice(0, item.indexOf(":"));
  return (
    !read.keys.includes(item) &&
    !read.failed.includes(card) &&
    !read.keys.includes(`${card}:rest`)
  );
};

const NOT_JUDGED: XekinoDone = { wasDoneBefore: false, isDone: false };

// Από τις αναγνώσεις της λίστας: η πρώτη λέει αν ήταν ήδη κλειστή, κάθε επόμενη αν έκλεισε τώρα.
// Οι γραμμές Ειδοποίησης φεύγουν μόλις ανοίξουν: δεν λένε τίποτα.
export const doneOf = (
  item: string,
  reads: readonly QueueRead[],
): XekinoDone => {
  if (item.startsWith("notice:") || !item.includes(":") || reads.length === 0)
    return NOT_JUDGED;
  const wasDoneBefore = isGoneFrom(reads[0], item);
  return {
    wasDoneBefore,
    isDone: !wasDoneBefore && isGoneFrom(reads[reads.length - 1], item),
  };
};
