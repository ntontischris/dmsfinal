// A1 (νέα εμφάνιση): οι πραγματικές κάρτες της «Σήμερα» (today_counts + today_card) στο σχήμα καρτών του prototype.
// Καθαρές συναρτήσεις, χωρίς βάση: ό,τι δεν δίνει η βάση (π.χ. τα χρήματα του μήνα ως αριθμοί) απλώς δεν υπάρχει.

import { codeOfPath } from "@/spaces/data/screens";

import { withDayLabel } from "../cards/work-items";
import { formatAt, formatCents } from "../helpers";
import { EMPTY_TEXT } from "../labels";
import type { CardData, CardItem, TodayCard } from "../view-schema";
import type { CardContent, CardDef, CardKind, CardRow } from "./a1-model";

export interface Built {
  card: CardDef;
  content: CardContent;
}

const KINDS: Readonly<Record<TodayCard["kind"], CardKind>> = {
  action: "action",
  week: "info",
  health: "status",
};

// Τεχνικές κάρτες: όταν δεν έχουν πρόβλημα, κλειστές στο «Περισσότερα» (όπως η Υγεία και το Google στο prototype).
const TECHNICAL: ReadonlySet<string> = new Set(["google_deletions"]);

// Κάρτες με ημερομηνία ανά γραμμή: η μέρα με το πρόθεμά της (όπως οι renderers της ομάδας «Η δουλειά μου»).
const DATED: Readonly<Record<string, string>> = {
  my_deliverables: "προθεσμία",
  versions_to_review: "προθεσμία",
  next_steps_due: "έληξε",
  proposals_in_progress: "λήγει",
};

// Το κουμπί μιας κάρτας, όπου η εφαρμογή έχει ήδη ενέργεια (οι renderers του cards/client.tsx).
const CTAS: Readonly<Record<string, { label: string; href: string }>> = {
  client_filming: { label: "Κλείσε Γύρισμα", href: "/app/book" },
};

export const cardDefOf = (card: TodayCard): CardDef => ({
  id: card.code,
  title: card.label,
  source: codeOfPath(card.link.split("?")[0]) ?? "",
  kind: KINDS[card.kind],
  isTechnical: TECHNICAL.has(card.code),
});

const rowOf = (item: CardItem): CardRow => ({
  label: item.title,
  meta:
    [
      item.subtitle,
      item.at ? formatAt(item.at) : null,
      item.amountCents !== null ? formatCents(item.amountCents) : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined,
  href: item.link,
  isUrgent: item.urgent,
});

// Το περιεχόμενο μιας κάρτας. Χωρίς data (άδεια κάρτα ενέργειας, δεν χρειάστηκε φόρτωση): μόνο το πλήθος.
export const contentOf = (
  card: TodayCard,
  data: CardData | null,
): CardContent => {
  const items = data
    ? DATED[card.code]
      ? withDayLabel(data.items, DATED[card.code])
      : data.items
    : [];
  return {
    count: data?.count ?? card.count ?? 0,
    rows: items.map(rowOf),
    allHref: card.link,
    emptyText: EMPTY_TEXT[card.kind],
    cta: CTAS[card.code],
  };
};

export const builtOf = (card: TodayCard, data: CardData | null): Built => ({
  card: cardDefOf(card),
  content: contentOf(card, data),
});

// Ποιες κάρτες χρειάζονται τα στοιχεία τους: οι άδειες κάρτες ενέργειας μένουν στη γραμμή «Δεν σε περιμένει τίποτα».
export const needsItems = (card: TodayCard): boolean =>
  !card.hidden &&
  !card.failed &&
  !(card.kind === "action" && (card.count ?? 0) === 0);

export interface WeekPart {
  label: string;
  href: string;
}

// «Η εβδομάδα»: οι κάρτες εβδομάδας της βάσης (π.χ. Γυρίσματα των επόμενων 7 ημερών) σε μία γραμμή, κάθε κομμάτι πατήσιμο.
export const weekGlance = (cards: readonly TodayCard[]): readonly WeekPart[] =>
  cards
    .filter(
      (card) =>
        card.kind === "week" &&
        !card.hidden &&
        !card.failed &&
        card.count !== null,
    )
    .map((card) => ({ label: `${card.count} ${card.label}`, href: card.link }));

const ATHENS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Athens",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Η στιγμή σε ώρα Ελλάδας ως «ΕΕΕΕ-ΜΜ-ΗΗTΩΩ:ΛΛ», το σχήμα που περιμένουν ο χαιρετισμός και η ημερομηνία του prototype.
export const athensStamp = (date: Date): string =>
  ATHENS.format(date).replace(" ", "T");
