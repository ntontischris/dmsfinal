// Η Σήμερα της ομάδας ως ενημέρωση (#241): ποια κάρτα πάει σε ποιο κομμάτι της σελίδας.
// Αποφάσεις → «Μόνο εσύ μπορείς», Γυρίσματα → «Το πρόγραμμα», ληξιπρόθεσμα → «Χρήματα»· το υπόλοιπο μπαίνει στη λίστα.

import type { CardContent, CardDef } from "./a1-model";

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

export interface Brief<T extends BuiltCard> {
  decisions: readonly T[];
  // Ο Χρήστης έχει έστω μία κάρτα απόφασης (ακόμα κι άδεια ή χαλασμένη).
  hasDecisions: boolean;
  // Κάποια κάρτα απόφασης δεν φόρτωσε: το σύνολο των αποφάσεων δεν είναι γνωστό.
  isDecisionsPartial: boolean;
  week: T | null;
  money: T | null;
  // Τα ληξιπρόθεσμα Τιμολόγια (για την πρόταση της κορυφής)· null χωρίς την κάρτα ή όταν δεν φόρτωσε.
  overdue: number | null;
}

interface BriefInput<T extends BuiltCard> {
  built: readonly T[];
  failed: ReadonlySet<string>;
  groupOf: (code: string) => string | undefined;
  // Τα Χρήματα φορτώθηκαν (today_money): το κομμάτι μένει και χωρίς ληξιπρόθεσμα, για τον ρυθμό του μήνα.
  hasMoneyPanel?: boolean;
}

const WEEK = "week_filming";
const MONEY = "overdue_invoices";
// Τα Αιτήματα πελατών είναι της ομάδας «Η δουλειά μου», αλλά απαντά μόνο ο Χρήστης.
const ALSO_DECISIONS: ReadonlySet<string> = new Set(["requests_mentions"]);

const isDecision = (card: CardDef, groupOf: BriefInput<BuiltCard>["groupOf"]) =>
  ALSO_DECISIONS.has(card.id) ||
  (groupOf(card.id) === "decide" &&
    !card.isTechnical &&
    card.id !== "google_deletions");

const isEmpty = ({ content }: BuiltCard): boolean =>
  content.count === 0 && content.rows.length === 0 && !content.teamRows?.length;

const overdueOf = (item: BuiltCard | undefined): number | null =>
  item ? item.content.count : null;

export function briefOf<T extends BuiltCard>({
  built,
  failed,
  groupOf,
  hasMoneyPanel = false,
}: BriefInput<T>): Brief<T> {
  const isFailed = (item: T) => failed.has(item.card.id);
  const placed = (item: T): boolean =>
    !isFailed(item) &&
    item.card.id === MONEY &&
    (hasMoneyPanel || !isEmpty(item));
  const money = built.find((item) => placed(item) && item.card.id === MONEY);
  const overdue = built.find(
    (item) => !isFailed(item) && item.card.id === MONEY,
  );
  return {
    decisions: built.filter(
      (item) => !isFailed(item) && isDecision(item.card, groupOf),
    ),
    hasDecisions: built.some((item) => isDecision(item.card, groupOf)),
    isDecisionsPartial: built.some(
      (item) => isFailed(item) && isDecision(item.card, groupOf),
    ),
    week:
      built.find((item) => !isFailed(item) && item.card.id === WEEK) ?? null,
    money: money ?? null,
    overdue: overdueOf(overdue),
  };
}
