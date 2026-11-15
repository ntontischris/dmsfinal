// Το «Αργότερα» της λίστας στη βάση (today_snoozes), καθαρό αρχείο. Το κλειδί της βάσης δέχεται μόνο
// «<κωδικός>:<id>», οπότε: οι κάρτες περνούν όπως είναι, οι οδηγοί γίνονται «flow:<οδηγός>», και η ώρα που διάλεξε
// ο Χρήστης γράφεται στο τέλος ως «@<ms>» (η βάση κρατά μόνο ως πότε ζει η εγγραφή).

import { addDays, athensAt, athensDay } from "./athens-time";
import type { LaterMap } from "./later";

const DB_KEY = /^[a-z][a-z0-9_]{0,39}:\S{1,200}$/;
const HAS_CODE = /^[a-z][a-z0-9_]{0,39}:/;
const WITH_UNTIL = /^(.+)@(\d{1,15})$/;
const FLOW = "flow:";

export const isDbKey = (key: string): boolean => DB_KEY.test(key);

const baseOf = (rowKey: string): string =>
  HAS_CODE.test(rowKey) ? rowKey : `${FLOW}${rowKey}`;

const rowKeyOf = (base: string): string =>
  base.startsWith(FLOW) ? base.slice(FLOW.length) : base;

export const dbKeyOf = (rowKey: string, until: number): string =>
  `${baseOf(rowKey)}@${Math.round(until)}`;

// Το επόμενο 08:00 της Αθήνας: τότε λήγει ένα «Αργότερα» της βάσης χωρίς δική του ώρα.
export const nextMorning = (now: number): number => {
  const today = athensDay(now);
  const eight = athensAt(today, 8);
  return now < eight ? eight : athensAt(addDays(today, 1), 8);
};

interface DbEntry {
  rowKey: string;
  until: number;
}

const entryOf = (dbKey: string, now: number): DbEntry => {
  const match = WITH_UNTIL.exec(dbKey);
  return match
    ? { rowKey: rowKeyOf(match[1]), until: Number(match[2]) }
    : { rowKey: rowKeyOf(dbKey), until: nextMorning(now) };
};

export interface DbLater {
  later: LaterMap;
  // Τα κλειδιά της βάσης ανά γραμμή: η «Αναίρεση» και η νέα ώρα σβήνουν όλα.
  keysOf: Readonly<Record<string, readonly string[]>>;
}

// Τα κλειδιά του today_snoozed → «γραμμή → ως πότε». Δύο ώρες για την ίδια γραμμή: κρατά την αργότερη.
export const laterFromDb = (dbKeys: readonly string[], now: number): DbLater =>
  dbKeys.reduce<DbLater>(
    (acc, dbKey) => {
      const { rowKey, until } = entryOf(dbKey, now);
      return {
        later: {
          ...acc.later,
          [rowKey]: Math.max(until, acc.later[rowKey] ?? 0),
        },
        keysOf: {
          ...acc.keysOf,
          [rowKey]: [...(acc.keysOf[rowKey] ?? []), dbKey],
        },
      };
    },
    { later: {}, keysOf: {} },
  );

// Οι γραμμές που κρύβονται ακόμα (η ώρα τους δεν ήρθε), με το κλειδί της γραμμής (για τις κάρτες: «κωδικός:id»).
export const hiddenRowKeys = (
  dbKeys: readonly string[],
  now: number,
): string[] =>
  Object.entries(laterFromDb(dbKeys, now).later)
    .filter(([, until]) => until > now)
    .map(([rowKey]) => rowKey);

// Τα κλειδιά της βάσης των γραμμών (για σβήσιμο).
export const dbKeysOfRows = (
  db: DbLater,
  rowKeys: readonly string[],
): string[] => rowKeys.flatMap((key) => db.keysOf[key] ?? []);
