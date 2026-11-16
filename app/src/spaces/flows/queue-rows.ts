// «Ξεκινώ τη μέρα μου» = η ουρά «Τι πρέπει να κάνω τώρα» (docs/flows/xekino-ti-mera/flow.md). Καθαρό αρχείο: από τις
// μισές δουλειές, τον κανόνα ουράς κάθε οδηγού και τις κάρτες της Σήμερα βγαίνει μία λίστα, ένα πράγμα ανά γραμμή.

import { agoText, dayText, startOfToday } from "./athens-time";
import type { JobDigest } from "./digests";
import { flowOf, markOf, stepHref, totalOf, type Flow } from "./flows";
import type { LaterMap } from "./later";
import type { Parked } from "./parked";

export interface QueueRow {
  // Μία γραμμή ανά δουλειά: το κλειδί του «Αργότερα».
  key: string;
  title: string;
  sub: string;
  area: string;
  href: string;
  // Από πότε περιμένει (ms): η σειρά και το «από χθες». hasSince = false: άγνωστο, μετρά ως «τώρα».
  since: number;
  hasSince: boolean;
  // Το ποσό της γραμμής: ό,τι έχει ποσό πάει πρώτο, το μεγαλύτερο πρώτο.
  amountCents: number | null;
  // Γύρισε από «Αργότερα»: πάνω-πάνω, με «Νέο ·».
  isNew: boolean;
  // Η μισή δουλειά της γραμμής: η καρτέλα παίρνει τη θέση της πριν ανοίξει.
  parked: Parked | null;
  // Γραμμή Ειδοποίησης: το άνοιγμα τις σημειώνει διαβασμένες (και η γραμμή φεύγει).
  noticeIds?: readonly string[];
}

const count = (n: number, one: string, many: string): string =>
  n === 1 ? `1 ${one}` : `${n} ${many}`;

// Η γραμμή κάθε δουλειάς με τα λόγια του κανόνα ουράς της.
export const digestTitle = (digest: JobDigest, now: number): string => {
  const { oldest } = digest;
  if (digest.job === "apanto-se-pelates")
    return `Απαντώ σε Πελάτες — ${count(digest.count, "σε περιμένει", "σε περιμένουν")}${
      oldest
        ? ` (ο πιο παλιός: ${oldest.who}, ${agoText(Date.parse(oldest.since), now)})`
        : ""
    }`;
  return `Αιτήματα γυρίσματος — ${count(digest.count, "περιμένει απάντηση", "περιμένουν απάντηση")}${
    oldest
      ? ` (παλαιότερο: ${oldest.who}, ${dayText(oldest.day ?? oldest.since)})`
      : ""
  }`;
};

// Οι Χώροι των φίλτρων πάνω από τη λίστα.
export const AREAS = [
  "Πελάτες",
  "Παραγωγή",
  "Χρήματα",
  "Επικοινωνία",
  "Εταιρεία",
] as const;
export type Area = (typeof AREAS)[number];

export const parkedTitle = (flow: Flow, row: Parked): string => {
  const question = flow.steps[row.step - 1]?.question ?? "";
  return row.reason === "wait"
    ? `${flow.name} — περιμένουμε την ομάδα· μετά: ${question}`
    : `${flow.queueName ?? flow.name} — συνέχισε: ${question}`;
};

const parkedRow = (row: Parked): QueueRow | null => {
  const flow = flowOf(row.job);
  const step = flow?.steps[row.step - 1];
  if (!flow || !step) return null;
  return {
    key: row.job,
    title: parkedTitle(flow, row),
    sub: `Βήμα ${markOf(flow, row.step)} από ${totalOf(flow)}: ${step.question}`,
    area: step.area,
    href: stepHref(flow, row.step, { date: row.date }),
    since: row.at,
    hasSince: true,
    amountCents: null,
    isNew: false,
    parked: row,
  };
};

const digestRow = (digest: JobDigest, now: number): QueueRow | null => {
  const flow = flowOf(digest.job);
  if (!flow || digest.count < 1) return null;
  return {
    key: digest.job,
    title: digestTitle(digest, now),
    sub: flow.name,
    area: flow.area,
    href: stepHref(flow, 1),
    since: digest.oldest ? Date.parse(digest.oldest.since) : now,
    hasSince: digest.oldest !== null,
    amountCents: null,
    isNew: false,
    parked: null,
  };
};

export interface QueueInput {
  digests: readonly JobDigest[];
  parked: readonly Parked[];
  // Οι γραμμές των καρτών της Σήμερα (today-rows.ts), έτοιμες από τον server.
  cards?: readonly QueueRow[];
  later: LaterMap;
  now: number;
}

export interface Queue {
  today: readonly QueueRow[];
  fromYesterday: readonly QueueRow[];
  postponed: readonly { row: QueueRow; until: number }[];
}

// Σειρά σημασίας: όσα γύρισαν από «Αργότερα» πάνω· μετά ό,τι έχει ποσό (μεγαλύτερο πρώτο)· μετά το παλαιότερο.
export const byImportance = (a: QueueRow, b: QueueRow): number =>
  Number(b.isNew) - Number(a.isNew) ||
  Number(b.amountCents !== null) - Number(a.amountCents !== null) ||
  (b.amountCents ?? 0) - (a.amountCents ?? 0) ||
  a.since - b.since;

// Ένα πράγμα, μία γραμμή: η μισή δουλειά ενός οδηγού παίρνει τη θέση της γραμμής του κανόνα του.
export const rowsOf = ({
  digests,
  parked,
  cards = [],
  now,
}: QueueInput): QueueRow[] => {
  const fromParked = parked.flatMap((row) => parkedRow(row) ?? []);
  const jobs = new Set(fromParked.map((row) => row.key));
  const fromDigests = digests
    .filter((digest) => !jobs.has(digest.job))
    .flatMap((digest) => digestRow(digest, now) ?? []);
  return [...fromParked, ...fromDigests, ...cards].sort(byImportance);
};

// Γραμμή που το «Αργότερα» της έληξε: ξαναβγαίνει πάνω με «Νέο ·».
const asReturned = (row: QueueRow): QueueRow => ({
  ...row,
  title: `Νέο · ${row.title}`,
  isNew: true,
});

// Τα «Αργότερα» που δεν έληξαν βγαίνουν από τη λίστα· ό,τι περιμένει από πριν από σήμερα πάει στο «Έμειναν από χθες».
export const queueOf = (input: QueueInput): Queue => {
  const rows = rowsOf(input);
  const isPostponed = (row: QueueRow) =>
    (input.later[row.key] ?? 0) > input.now;
  const active = rows
    .filter((row) => !isPostponed(row))
    .map((row) => (input.later[row.key] !== undefined ? asReturned(row) : row))
    .sort(byImportance);
  const dayStart = startOfToday(input.now);
  return {
    today: active.filter((row) => row.since >= dayStart),
    fromYesterday: active.filter((row) => row.since < dayStart),
    postponed: rows
      .filter(isPostponed)
      .map((row) => ({ row, until: input.later[row.key] })),
  };
};

export const queueHeader = (queue: Queue): string =>
  `Τι πρέπει να κάνω τώρα — ${queue.today.length} για σήμερα, ${queue.fromYesterday.length} από χθες`;

// Done when του «Ξεκινώ τη μέρα μου».
// closed = null: δεν επιτρέπεται να διαβαστεί το Ίχνος, οπότε η πρόταση δεν λέει αριθμό που δεν ξέρει.
export const daySentence = (closed: number | null, postponed: number): string =>
  `Η λίστα σου άδειασε: ${closed === null ? "" : `έκλεισες ${closed} σήμερα, `}${postponed} περιμένουν στο «Αργότερα» και ξαναβγαίνουν μόνα τους την ώρα τους — ό,τι νέο ζητήσει κίνηση θα μπει εδώ.`;

// Οι γραμμές ενός Χώρου (null = όλες).
export const inArea = (
  rows: readonly QueueRow[],
  area: string | null,
): readonly QueueRow[] =>
  area === null ? rows : rows.filter((row) => row.area === area);

// Πόσα περιμένουν σε κάθε δουλειά-οδηγό (για τις πόρτες «Τι θέλεις να κάνεις;»).
export const waitingOf = (digests: readonly JobDigest[], job: string): number =>
  digests.find((digest) => digest.job === job)?.count ?? 0;
