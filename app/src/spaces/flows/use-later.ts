"use client";

import { useOptimistic, useState, useTransition } from "react";

import type { LaterMap } from "./later";
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

const NOT_READ =
  "Δεν φάνηκε τι έχεις αφήσει για αργότερα. Ξαναδοκίμασε σε λίγο.";

// Το «Αργότερα» της λίστας ζει μόνο στον λογαριασμό (ίδιο σε κάθε συσκευή). Αν δεν διαβάστηκε, το λέει.
export function useLater(
  snoozed: readonly string[] | null,
  now: number,
): Later {
  const [keys, applyOptimistic] = useOptimistic(snoozed ?? [], applyChange);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
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
    error: error ?? (snoozed === null ? NOT_READ : null),
  };
}
