// A1 «Σήμερα»: τύποι, βοηθητικά και η διάταξη των καρτών.
// Κάθε κάρτα βγαίνει από μία ουρά που έγινε ήδη τελική και φαίνεται μόνο σε όποιον έχει πρόσβαση σε αυτή
// (Δικαίωμα και Εύρος). Η προεπιλεγμένη σειρά είναι μία, η σειρά του καταλόγου (a1-catalogue.ts):
// κάθε Ρόλος, και κάθε νέος Ρόλος που φτιάχνει ο Ιδιοκτήτης, παίρνει όσες κάρτες του επιτρέπουν τα Δικαιώματά του.

import { TODAY } from "@/data/finance-access";
import type { RoleId } from "@/data/roles";

export type CardKind = "action" | "info" | "status";

export interface CardRow {
  label: string;
  meta?: string;
  href: string;
  isUrgent?: boolean;
}

export interface CardContent {
  count: number;
  summary?: string;
  rows: readonly CardRow[];
  allHref: string;
  emptyText: string;
  cta?: { label: string; href: string };
  // Η κάρτα δείχνει ένα ποσό, όχι πλήθος: χωρίς αριθμό στη γωνία.
  isCountless?: boolean;
}

export interface CardDef {
  id: string;
  title: string;
  // Η οθόνη-ουρά της κάρτας: εκεί οδηγεί το «Όλα →».
  source: string;
  // action: κάτι περιμένει εμένα· κρύβεται όταν είναι άδεια.
  // info: η εβδομάδα μου· μένει και άδεια, με μία γραμμή.
  // status: η Υγεία· μένει πάντα, πράσινη ή κόκκινη.
  kind: CardKind;
  // Αφορά δεύτερο άνθρωπο (αρχή «Λειτουργεί με έναν άνθρωπο»): χωρίς ομάδα δεν εμφανίζεται.
  needsTeam?: boolean;
  isFor: (role: RoleId) => boolean;
  build: (role: RoleId) => CardContent;
}

export const ROWS_SHOWN = 3;

export const daysTo = (date: string): number =>
  Math.round((Date.parse(date.slice(0, 10)) - Date.parse(TODAY)) / 86_400_000);

export const dueLabel = (date: string): string => {
  const days = daysTo(date);
  if (days < 0)
    return `έληξε πριν από ${-days} ${days === -1 ? "μέρα" : "μέρες"}`;
  if (days === 0) return "λήγει σήμερα";
  return `σε ${days} ${days === 1 ? "μέρα" : "μέρες"}`;
};

// --- Διάταξη: η προσωπική επιλογή ζει στον λογαριασμό· στο prototype στη διεύθυνση (?cards=a,b,c).

export const availableCards = (
  catalogue: readonly CardDef[],
  role: RoleId,
  isSolo: boolean,
): readonly CardDef[] =>
  catalogue.filter((card) => card.isFor(role) && !(isSolo && card.needsTeam));

export const parseLayout = (
  value: string | undefined,
): readonly string[] | null =>
  value === undefined ? null : value.split(",").filter(Boolean);

// Η σειρά του Χρήστη, αλλιώς η προεπιλογή. Κάρτα που χάθηκε (έφυγε Δικαίωμα) απλώς δεν φαίνεται.
export const chosenCards = (
  available: readonly CardDef[],
  layout: readonly string[] | null,
): readonly CardDef[] =>
  layout === null
    ? available
    : layout.flatMap((id) => available.filter((card) => card.id === id));

export const layoutParam = (ids: readonly string[]): string => ids.join(",");

export const toggled = (
  ids: readonly string[],
  id: string,
): readonly string[] =>
  ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];

export const moved = (
  ids: readonly string[],
  id: string,
  step: -1 | 1,
): readonly string[] => {
  const from = ids.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  return ids.map((other, index) =>
    index === from ? ids[to] : index === to ? id : other,
  );
};
