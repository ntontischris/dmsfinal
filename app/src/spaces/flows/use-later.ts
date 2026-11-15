"use client";

import {
  useOptimistic,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import {
  parseLater,
  postpone as postponeLocal,
  readLaterRaw,
  restore as restoreLocal,
  type LaterMap,
} from "./later";
import { subscribeParked } from "./parked";
import { postponeRows, restoreRows } from "./today-actions";
import { dbKeyOf, dbKeysOfRows, laterFromDb } from "./today-later";

export interface Later {
  later: LaterMap;
  postpone: (rowKeys: readonly string[], until: number) => void;
  restore: (rowKeys: readonly string[]) => void;
  // Το «Αργότερα» δεν αποθηκεύτηκε στη βάση.
  error: string | null;
}

interface Change {
  add: readonly string[];
  remove: readonly string[];
}

const applyChange = (keys: readonly string[], change: Change): string[] => [
  ...keys.filter((key) => !change.remove.includes(key)),
  ...change.add,
];

// Το «Αργότερα» της λίστας: στη βάση (ίδιο σε κάθε συσκευή)· μόνο αν η βάση δεν απάντησε, στον browser.
export function useLater(
  snoozed: readonly string[] | null,
  now: number,
): Later {
  const local = parseLater(
    useSyncExternalStore(subscribeParked, readLaterRaw, () => "{}"),
  );
  const [keys, applyOptimistic] = useOptimistic(snoozed ?? [], applyChange);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  if (snoozed === null)
    return {
      later: local,
      postpone: postponeLocal,
      restore: restoreLocal,
      error: null,
    };
  const db = laterFromDb(keys, now);
  const run = (change: Change, save: () => Promise<{ error: string | null }>) =>
    startTransition(async () => {
      applyOptimistic(change);
      const result = await save();
      setError(result.error);
    });
  return {
    later: db.later,
    postpone: (rowKeys, until) => {
      const stale = dbKeysOfRows(db, rowKeys);
      run(
        { add: rowKeys.map((key) => dbKeyOf(key, until)), remove: stale },
        () => postponeRows({ rowKeys, until, stale }),
      );
    },
    restore: (rowKeys) => {
      const stale = dbKeysOfRows(db, rowKeys);
      if (stale.length === 0) return;
      run({ add: [], remove: stale }, () => restoreRows(stale));
    },
    error,
  };
}
