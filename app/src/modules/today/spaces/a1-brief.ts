// Η Σήμερα της ομάδας ως ενημέρωση (#241): ποια κάρτα πάει σε ποιο κομμάτι της σελίδας.
// Αποφάσεις → «Μόνο εσύ μπορείς», Γυρίσματα → «Το πρόγραμμα», ληξιπρόθεσμα → «Χρήματα»,
// Υγεία πάνω μόνο όταν κάτι χάλασε, και όλα τα υπόλοιπα σε μία κλειστή γραμμή «Και άλλα».

import type { CardContent, CardDef } from "./a1-model";

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

export interface OtherCard {
  id: string;
  title: string;
  // null: η κάρτα δεν φόρτωσε.
  count: number | null;
  href: string;
  isFailed: boolean;
}

export interface QuietCard {
  id: string;
  title: string;
  href: string;
}

export interface Brief<T extends BuiltCard> {
  healthAlert: T | null;
  healthOk: QuietCard | null;
  decisions: readonly T[];
  // Ο Χρήστης έχει έστω μία κάρτα απόφασης (ακόμα κι άδεια ή χαλασμένη).
  hasDecisions: boolean;
  // Κάποια κάρτα απόφασης δεν φόρτωσε: το σύνολο των αποφάσεων δεν είναι γνωστό.
  isDecisionsPartial: boolean;
  week: T | null;
  money: T | null;
  // Τα ληξιπρόθεσμα Τιμολόγια (για την πρόταση της κορυφής)· null χωρίς την κάρτα ή όταν δεν φόρτωσε.
  overdue: number | null;
  others: readonly OtherCard[];
  quiet: readonly QuietCard[];
}

interface BriefInput<T extends BuiltCard> {
  built: readonly T[];
  failed: ReadonlySet<string>;
  groupOf: (code: string) => string | undefined;
}

const HEALTH = "health";
const WEEK = "week_filming";
const MONEY = "overdue_invoices";
// Τα Αιτήματα πελατών είναι της ομάδας «Η δουλειά μου», αλλά απαντά μόνο ο Χρήστης.
const ALSO_DECISIONS: ReadonlySet<string> = new Set(["requests_mentions"]);

const isDecision = (card: CardDef, groupOf: BriefInput<BuiltCard>["groupOf"]) =>
  ALSO_DECISIONS.has(card.id) ||
  (groupOf(card.id) === "decide" &&
    !card.isTechnical &&
    card.id !== "google_deletions");

const quietOf = ({ card, content }: BuiltCard): QuietCard => ({
  id: card.id,
  title: card.title,
  href: content.allHref,
});

const otherOf = (
  { card, content }: BuiltCard,
  isFailed: boolean,
): OtherCard => ({
  ...quietOf({ card, content }),
  count: isFailed ? null : content.count,
  isFailed,
});

const isEmpty = ({ content }: BuiltCard): boolean =>
  content.count === 0 && content.rows.length === 0 && !content.teamRows?.length;

const overdueOf = (item: BuiltCard | undefined): number | null =>
  item ? item.content.count : null;

export function briefOf<T extends BuiltCard>({
  built,
  failed,
  groupOf,
}: BriefInput<T>): Brief<T> {
  const isFailed = (item: T) => failed.has(item.card.id);
  const health = built.find(({ card }) => card.id === HEALTH);
  const isHealthBad = !!health && (isFailed(health) || !isEmpty(health));
  const rest = built.filter(({ card }) => card.id !== HEALTH);
  const placed = (item: T): boolean =>
    !isFailed(item) &&
    (isDecision(item.card, groupOf) ||
      item.card.id === WEEK ||
      (item.card.id === MONEY && !isEmpty(item)));
  const unplaced = rest.filter((item) => !placed(item));
  return {
    healthAlert: isHealthBad ? health : null,
    healthOk: health && !isHealthBad ? quietOf(health) : null,
    decisions: rest.filter(
      (item) => !isFailed(item) && isDecision(item.card, groupOf),
    ),
    hasDecisions: rest.some((item) => isDecision(item.card, groupOf)),
    isDecisionsPartial: rest.some(
      (item) => isFailed(item) && isDecision(item.card, groupOf),
    ),
    week: rest.find((item) => !isFailed(item) && item.card.id === WEEK) ?? null,
    money: rest.find((item) => placed(item) && item.card.id === MONEY) ?? null,
    overdue: overdueOf(rest.find((item) => !isFailed(item) && item.card.id === MONEY)),
    others: unplaced
      .filter((item) => isFailed(item) || !isEmpty(item))
      .map((item) => otherOf(item, isFailed(item))),
    quiet: unplaced
      .filter((item) => !isFailed(item) && isEmpty(item))
      .map(quietOf),
  };
}
