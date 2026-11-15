// «Ξεκινώ τη μέρα μου» = η ουρά «Τι πρέπει να κάνω τώρα» (docs/flows/xekino-ti-mera/flow.md). Καθαρό αρχείο: από τις
// μισές δουλειές, τα «Αργότερα» και τον κανόνα ουράς κάθε οδηγού βγαίνουν οι γραμμές, μία ανά δουλειά.

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
  // Από πότε περιμένει (ms): η σειρά και το «από χθες».
  since: number;
  // Η μισή δουλειά της γραμμής: η καρτέλα παίρνει τη θέση της πριν ανοίξει.
  parked: Parked | null;
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
    parked: null,
  };
};

export interface QueueInput {
  digests: readonly JobDigest[];
  parked: readonly Parked[];
  later: LaterMap;
  now: number;
}

export interface Queue {
  today: readonly QueueRow[];
  fromYesterday: readonly QueueRow[];
  postponed: readonly { row: QueueRow; until: number }[];
}

const byOldest = (a: QueueRow, b: QueueRow): number => a.since - b.since;

// Ένα πράγμα, μία γραμμή: η μισή δουλειά ενός οδηγού παίρνει τη θέση της γραμμής του κανόνα του.
export const rowsOf = ({ digests, parked, now }: QueueInput): QueueRow[] => {
  const fromParked = parked.flatMap((row) => parkedRow(row) ?? []);
  const jobs = new Set(fromParked.map((row) => row.key));
  const fromDigests = digests
    .filter((digest) => !jobs.has(digest.job))
    .flatMap((digest) => digestRow(digest, now) ?? []);
  return [...fromParked, ...fromDigests].sort(byOldest);
};

// Τα «Αργότερα» που δεν έληξαν βγαίνουν από τη λίστα· ό,τι περιμένει από πριν από σήμερα πάει στο «Έμειναν από χθες».
export const queueOf = (input: QueueInput): Queue => {
  const rows = rowsOf(input);
  const isPostponed = (row: QueueRow) =>
    (input.later[row.key] ?? 0) > input.now;
  const active = rows.filter((row) => !isPostponed(row));
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
export const daySentence = (closed: number, postponed: number): string =>
  `Η λίστα σου άδειασε: έκλεισες ${closed} σήμερα, ${postponed} περιμένουν στο «Αργότερα» και ξαναβγαίνουν μόνα τους την ώρα τους — ό,τι νέο ζητήσει κίνηση θα μπει εδώ.`;
