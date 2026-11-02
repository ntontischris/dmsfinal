// O7 (νέα εμφάνιση): οι πραγματικές γραμμές ετοιμότητας (public.readiness) στη μορφή LineView του prototype. Καθαρές συναρτήσεις.

import type { ReadinessRow } from "../queries";
import { READINESS, actionOf } from "../readiness";

export interface LineView {
  id: string;
  what: string;
  who: string;
  done: boolean;
  // Πού συμπληρώνεται (αν έχει σελίδα).
  href: string | null;
  // Επιβεβαιώνεται με το χέρι από τον Ιδιοκτήτη (νομικά κείμενα, ταυτότητα).
  isManual: boolean;
  // «έρχεται με …»: γραμμή που θα συμπληρωθεί όταν χτιστεί το module της.
  comesWith: string | null;
}

export const linesOf = (rows: readonly ReadinessRow[]): readonly LineView[] =>
  rows.map((row) => {
    const info = READINESS[row.item];
    const action = actionOf(row.note);
    return {
      id: row.item,
      what: info?.label ?? row.item,
      who: info?.who ?? "—",
      done: row.done,
      href: info?.href ?? null,
      isManual: action.kind === "confirm",
      comesWith: action.kind === "module" ? action.name : null,
    };
  });

export const pendingOf = (lines: readonly LineView[]): number =>
  lines.filter((line) => !line.done).length;

const OPENED = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const fmtOpened = (iso: string): string => OPENED.format(new Date(iso));
