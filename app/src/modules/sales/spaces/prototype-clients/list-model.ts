// PROTOTYPE — throwaway. Οι «απαντήσεις» της λίστας Πελατών από τις γραμμές που φορτώνει ήδη η B1.

import type { B1Row } from "../b1-adapter";

// Τα φίλτρα της παραλλαγής (?pick=): ποιοι χρωστούν, ποιοι δεν έχουν γύρισμα, ποιοι σώπασαν, ποιοι είναι υποψήφιοι.
export type Pick =
  | "owes"
  | "overdue"
  | "noshoot"
  | "quiet"
  | "renew"
  | "candidate";

const PICKS: readonly Pick[] = ["owes", "noshoot", "quiet", "renew", "candidate"];
const ALL_PICKS: readonly Pick[] = [...PICKS, "overdue"];

// Ένα σύνολο Πελατών (ids).
export type RenewIds = ReadonlySet<string>;
const NO_RENEW: RenewIds = new Set();

// Τα σύνολα που φέρνει η οθόνη από τις υπάρχουσες αναγνώσεις: ανανεώσεις (η κάρτα «Λήγει η Συμφωνία» του Σήμερα)
// και ληξιπρόθεσμα (invoices_view «overdue»).
export interface PickSets {
  renew: RenewIds;
  overdue: RenewIds;
}
export const NO_SETS: PickSets = { renew: NO_RENEW, overdue: NO_RENEW };

// Ο Πελάτης από τον σύνδεσμο της κάρτας του Σήμερα (/app/clients/<id>?tab=…).
export const clientIdOfLink = (link: string): string | null =>
  /^\/app\/clients\/([^/?#]+)/.exec(link)?.[1] ?? null;

export const parsePick = (value: unknown): Pick | null =>
  ALL_PICKS.find((pick) => pick === value) ?? null;

// Πόσες μέρες χωρίς επαφή κάνουν έναν ενεργό Πελάτη «ήσυχο».
const QUIET_DAYS = 45;
const MS_PER_DAY = 86_400_000;

const daysSince = (iso: string, today: string): number =>
  Math.floor((Date.parse(today) - Date.parse(iso.slice(0, 10))) / MS_PER_DAY);

export const isQuiet = (row: B1Row, today: string): boolean =>
  row.status === "Ενεργός" &&
  (row.lastContact === null || daysSince(row.lastContact, today) > QUIET_DAYS);

const matchesPick = (
  row: B1Row,
  pick: Pick,
  today: string,
  sets: PickSets,
): boolean => {
  if (row.isTaken) return false;
  if (pick === "renew") return sets.renew.has(row.id);
  if (pick === "overdue") return sets.overdue.has(row.id);
  if (pick === "owes") return row.hasBalance === true;
  if (pick === "noshoot") return row.month?.hasNoShoot === true;
  if (pick === "quiet") return isQuiet(row, today);
  return row.status === "Υποψήφιος";
};

export const rowsOfPick = (
  rows: readonly B1Row[],
  pick: Pick,
  today: string,
  sets: PickSets = NO_SETS,
): B1Row[] => rows.filter((row) => matchesPick(row, pick, today, sets));

export interface Answer {
  pick: Pick;
  count: number;
  // «3 χρωστούν»: η απάντηση, όχι ο πίνακας.
  title: string;
  // Τα πρώτα ονόματα, για να ξέρεις ποιοι πριν ανοίξεις.
  names: string;
  question: string;
}

const TEXT: Readonly<
  Record<Pick, { one: string; many: string; question: string }>
> = {
  owes: { one: "χρωστά", many: "χρωστούν", question: "Ποιος χρωστά;" },
  overdue: {
    one: "με ληξιπρόθεσμο τιμολόγιο",
    many: "με ληξιπρόθεσμο τιμολόγιο",
    question: "Ποιος έχει ληξιπρόθεσμο;",
  },
  noshoot: {
    one: "χωρίς γύρισμα αυτόν τον μήνα",
    many: "χωρίς γύρισμα αυτόν τον μήνα",
    question: "Ποιος δεν έχει γύρισμα;",
  },
  renew: {
    one: "ανανεώνεται σύντομα",
    many: "ανανεώνονται σύντομα",
    question: "Ποιανού λήγει η Συμφωνία;",
  },
  quiet: {
    one: "ενεργός χωρίς επαφή 45+ μέρες",
    many: "ενεργοί χωρίς επαφή 45+ μέρες",
    question: "Ποιος σώπασε;",
  },
  candidate: {
    one: "υποψήφιος περιμένει απάντηση",
    many: "υποψήφιοι περιμένουν απάντηση",
    question: "Ποιος περιμένει πρόταση;",
  },
};

const namesOf = (rows: readonly B1Row[]): string => {
  const first = rows.slice(0, 3).map((row) => row.name);
  const rest = rows.length - first.length;
  return rest > 0 ? `${first.join(", ")} και άλλοι ${rest}` : first.join(", ");
};

export const answerOf = (
  rows: readonly B1Row[],
  pick: Pick,
  today: string,
  sets: PickSets = NO_SETS,
): Answer => {
  const picked = rowsOfPick(rows, pick, today, sets);
  const text = TEXT[pick];
  return {
    pick,
    count: picked.length,
    title: `${picked.length} ${picked.length === 1 ? text.one : text.many}`,
    names: namesOf(picked),
    question: text.question,
  };
};

// Ό,τι θέλει εσένα τώρα: μόνο οι απαντήσεις με κάποιον μέσα (το πολύ τέσσερις). Το «χρωστά» μόνο όταν η βάση
// έδωσε Υπόλοιπο (ο Χρήστης βλέπει Οικονομικά).
export const answersOf = (rows: readonly B1Row[], today: string): Answer[] =>
  PICKS.map((pick) => answerOf(rows, pick, today)).filter(
    (answer) => answer.count > 0,
  );

// Θέλει εσένα: χρωστά ή δεν έχει γύρισμα αυτόν τον μήνα.
export const needsYou = (row: B1Row): boolean =>
  !row.isTaken && (row.hasBalance === true || row.month?.hasNoShoot === true);

// B: θέλει εσένα = όποιος είναι σε ένα από τα τέσσερα πλακίδια.
export const TILE_PICKS: readonly Pick[] = ["overdue", "noshoot", "quiet", "renew"];

export const needsYouOf = (
  row: B1Row,
  today: string,
  sets: PickSets,
): boolean => TILE_PICKS.some((pick) => matchesPick(row, pick, today, sets));

export type Lane = "needs" | "running" | "quiet";

export const laneOf = (row: B1Row, today: string): Lane => {
  if (needsYou(row)) return "needs";
  if (row.status === "Ενεργός" && !isQuiet(row, today)) return "running";
  return "quiet";
};

// Οι πιο πρόσφατοι (τελευταία επαφή), για τα γρήγορα «chips».
export const recentOf = (rows: readonly B1Row[], count = 5): B1Row[] =>
  rows
    .filter((row) => !row.isTaken && row.lastContact !== null)
    .sort((a, b) => (b.lastContact ?? "").localeCompare(a.lastContact ?? ""))
    .slice(0, count);

export const duplicatesOf = (rows: readonly B1Row[]): number =>
  rows.filter((row) => row.isPossibleDuplicate).length;
