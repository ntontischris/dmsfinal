// A1 «Σήμερα» ως μία λίστα: οι κάρτες της βάσης σε 7 ομάδες, με σταθερή σειρά ομάδων.
// Καθαρές συναρτήσεις, χωρίς βάση: τα δεδομένα έρχονται από τα υπάρχοντα RPC (Built).

import type { Built } from "./a1-adapter";
import type { CardRow } from "./a1-model";
import { itemKeyOf } from "./a1-later";
import { withoutRepeats } from "./a1-zones";

export type TodayGroupId =
  "time" | "client" | "mine" | "externals" | "money" | "keep" | "company";

export const GROUPS: readonly { id: TodayGroupId; title: string }[] = [
  { id: "time", title: "Σήμερα με ώρα" },
  { id: "client", title: "Ο Πελάτης περιμένει" },
  { id: "mine", title: "Η δουλειά μου σήμερα" },
  { id: "externals", title: "Περιμένω από εξωτερικούς" },
  { id: "money", title: "Χρήματα" },
  { id: "keep", title: "Κράτα τον Πελάτη" },
  { id: "company", title: "Η εταιρεία δουλεύει" },
];

// Η ομάδα «company» εδώ πρέπει να ταιριάζει με τον κατάλογο του today_loaded_cards
// (supabase/migrations/20261123110100_today_closed_fix.sql, «Έκλεισες»).
export const GROUP_OF: Readonly<Record<string, TodayGroupId>> = {
  week_filming: "time",
  unread_messages: "client",
  requests_mentions: "client",
  filming_approvals: "client",
  versions_to_review: "client",
  proposal_approvals: "client",
  my_tasks: "mine",
  my_deliverables: "mine",
  client_reminders: "mine",
  unassigned: "externals",
  crew_declined: "externals",
  crew_silent: "externals",
  to_invoice: "money",
  overdue_invoices: "money",
  rounds_over_limit: "money",
  cost_hours: "money",
  next_steps_due: "keep",
  proposals_in_progress: "keep",
  health: "company",
  readiness: "company",
  gdpr: "company",
  google_deletions: "company",
  unanswered: "company",
};

export interface ListLine {
  cardId: string;
  row: CardRow;
  laterKey: string | null;
}

export interface ListMore {
  count: number;
  href: string;
}

export interface ListGroup {
  id: TodayGroupId;
  title: string;
  lines: readonly ListLine[];
  more: ListMore[];
  failed: readonly string[];
}

export interface ListInput {
  built: readonly Built[];
  failed: ReadonlySet<string>;
  // «ΕΕΕΕ-ΜΜ-ΗΗTΩΩ:ΛΛ» ώρα Αθήνας: από αυτή κρίνεται το «σήμερα» και το «αύριο».
  stamp: string;
}

interface Prepared extends Built {
  more: ListMore[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_NOTE = "αναμένει έγκριση";
const SUMMARY_CODES: ReadonlySet<string> = new Set(["health", "readiness"]);
const OFFSET_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/;
const ATHENS_DAY = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Athens",
});

const groupIdOf = (cardId: string): TodayGroupId =>
  GROUP_OF[cardId] ?? "company";

const indexOfCard = (cardId: string): number =>
  GROUPS.findIndex((group) => group.id === groupIdOf(cardId));

// Η μέρα (ΕΕΕΕ-ΜΜ-ΗΗ) μιας ημερομηνίας: με ζώνη ώρας μετριέται στην Αθήνα, αλλιώς το πρώτο μέρος είναι ήδη Αθήνα.
const dayOf = (at: string): string =>
  OFFSET_SUFFIX.test(at) ? ATHENS_DAY.format(new Date(at)) : at.slice(0, 10);

const nextDayOf = (day: string): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

// Γύρισμα της μέρας ή της αυριανής, που δεν είναι ακόμα σε έγκριση.
const isPlannedSoon =
  (stamp: string) =>
  (row: CardRow): boolean => {
    const today = stamp.slice(0, 10);
    const isSoon =
      row.at !== undefined && [today, nextDayOf(today)].includes(dayOf(row.at));
    return isSoon && !(row.note?.includes(PENDING_NOTE) ?? false);
  };

const plannedRowsOf = ({ card, content }: Built, stamp: string) =>
  card.id === "week_filming"
    ? content.rows.filter(isPlannedSoon(stamp))
    : content.rows;

// Health και Readiness δίνουν μία γραμμή σύνοψης η καθεμία (χωρίς κλειδί «Αργότερα»).
const summaryRowOf = ({ card, content }: Built): CardRow | null => {
  if (content.count === 0) return null;
  return card.id === "health"
    ? { label: "Κάτι δεν λειτουργεί", href: content.allHref, isUrgent: true }
    : {
        label: `Μένουν ${content.count} βήματα ρύθμισης`,
        href: content.allHref,
      };
};

// Η εβδομάδα κρύβει ό,τι είναι εκτός σήμερα/αύριο στο «Πρόγραμμα», όχι στο «και άλλα N».
const moreOf = ({ card, content }: Built): ListMore[] => {
  if (card.id === "week_filming") return [];
  const hidden = content.count - content.rows.length;
  return hidden > 0 ? [{ count: hidden, href: content.allHref }] : [];
};

const prepareCard = (built: Built, stamp: string): Prepared => {
  if (SUMMARY_CODES.has(built.card.id)) {
    const row = summaryRowOf(built);
    return {
      card: built.card,
      content: { ...built.content, rows: row ? [row] : [] },
      more: [],
    };
  }
  return {
    card: built.card,
    content: { ...built.content, rows: plannedRowsOf(built, stamp) },
    more: moreOf(built),
  };
};

// Η ώρα που περιμένει η γραμμή (waitingSince, αλλιώς at)· χωρίς ώρα → null.
const timeOf = (row: CardRow): number | null => {
  const time = Date.parse(row.waitingSince ?? row.at ?? "");
  return Number.isFinite(time) ? time : null;
};

// Όσα δεν έχουν ώρα μπαίνουν τελευταία.
const compareTimes = (a: number | null, b: number | null): number => {
  if (a === null || b === null) return Number(a === null) - Number(b === null);
  return a - b;
};

// Επείγον πρώτο, μετά το παλαιότερο, μετά το μεγαλύτερο ποσό. Η σταθερή ταξινόμηση κρατά τη σειρά του Χρήστη.
const compareLines = (a: ListLine, b: ListLine): number =>
  Number(b.row.isUrgent ?? false) - Number(a.row.isUrgent ?? false) ||
  compareTimes(timeOf(a.row), timeOf(b.row)) ||
  (b.row.amountCents ?? 0) - (a.row.amountCents ?? 0);

const linesOf = (prepared: Prepared): ListLine[] =>
  prepared.content.rows.map((row) => ({
    cardId: prepared.card.id,
    row,
    laterKey: itemKeyOf(prepared.card.id, row),
  }));

const groupFrom = (
  group: (typeof GROUPS)[number],
  prepared: readonly Prepared[],
  failed: ReadonlySet<string>,
): ListGroup => {
  const cards = prepared.filter((item) => groupIdOf(item.card.id) === group.id);
  return {
    id: group.id,
    title: group.title,
    lines: cards.flatMap(linesOf).sort(compareLines),
    more: cards.flatMap((item) => item.more),
    failed: [...failed].filter((code) => groupIdOf(code) === group.id),
  };
};

// Η ομάδα «Η εταιρεία δουλεύει» φαίνεται μόνο όταν κάτι είναι επείγον ή δεν φόρτωσε.
const isVisible = (group: ListGroup): boolean => {
  if (group.id === "company") {
    return (
      group.lines.some((line) => line.row.isUrgent) || group.failed.length > 0
    );
  }
  return (
    group.lines.length > 0 || group.more.length > 0 || group.failed.length > 0
  );
};

// Οι ομάδες με τη σειρά τους, χωρίς κενές. Η σειρά καρτών της βάσης μένει μέσα σε κάθε ομάδα.
export function listOf(input: ListInput): readonly ListGroup[] {
  const { built, failed, stamp } = input;
  const prepared = built
    .filter((item) => !failed.has(item.card.id))
    .map((item) => prepareCard(item, stamp))
    .sort((a, b) => indexOfCard(a.card.id) - indexOfCard(b.card.id));
  const shown = withoutRepeats(prepared, null);
  return GROUPS.map((group) => groupFrom(group, shown, failed)).filter(
    isVisible,
  );
}

// Η εταιρεία μετράει μόνο τα επείγοντα (η σύνοψη «Μένουν N» της σελίδας)· οι άλλες ομάδες και τα «και άλλα N».
const countedOf = (group: ListGroup): number => {
  if (group.id === "company") {
    return group.lines.filter((line) => line.row.isUrgent).length;
  }
  return (
    group.lines.length +
    group.more.reduce((moreSum, item) => moreSum + item.count, 0)
  );
};

// Πόσες δουλειές μένουν σε όλες τις ομάδες που φαίνονται.
export function remainingOf(groups: readonly ListGroup[]): number {
  return groups.reduce((sum, group) => sum + countedOf(group), 0);
}
