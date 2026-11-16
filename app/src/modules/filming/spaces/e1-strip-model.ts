import type { StatProps } from "@/spaces/kit/panel";

import { needsOutcome, type E1Filming } from "./e1-groups";

// Τα τρία χοντρά της καρτέλας Γυρίσματα: ό,τι περιμένει απάντηση, ό,τι θέλει «έγινε», ό,τι μένει χωρίς ομάδα.
// Οι κάρτες μένουν πάντα στη θέση τους· στο 0 είναι ήσυχες, ώστε η σελίδα να μη χορεύει.

interface StripInput {
  filmings: readonly E1Filming[];
  // Τα αιτήματα του οδηγού «Εγκρίνω»: κρατήσεις, αλλαγές, ακυρώσεις, διαγραφές στο Google.
  // null = ο Χρήστης δεν εγκρίνει, οπότε η κάρτα δεν μπαίνει.
  requestCount: number | null;
  nowMs: number;
  today: string;
}

const WEEK_DAYS = 7;

const plusDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

const isMissingCrew = (
  filming: E1Filming,
  { nowMs, today }: Pick<StripInput, "nowMs" | "today">,
): boolean =>
  (filming.state === "pending" || filming.state === "scheduled") &&
  filming.endsAtMs > nowMs &&
  filming.date <= plusDays(today, WEEK_DAYS - 1) &&
  filming.crew !== null &&
  (filming.crew.total === 0 || filming.signals.crewDeclined);

const statOf = (
  stat: Omit<StatProps, "value" | "tone">,
  count: number,
): StatProps => ({
  ...stat,
  value: String(count),
  tone: count > 0 ? "attention" : undefined,
});

const requestsStat = (count: number): StatProps =>
  statOf(
    {
      label: "Αναμένουν απάντηση",
      hint: "κρατήσεις, αλλαγές, ακυρώσεις",
      href: "/app/filming/queue?job=egkrino-gyrismata&step=1",
    },
    count,
  );

export const filmingStripOf = (input: StripInput): readonly StatProps[] => [
  ...(input.requestCount === null ? [] : [requestsStat(input.requestCount)]),
  statOf(
    {
      label: "Θέλουν «έγινε»",
      hint: "τελείωσαν και δεν σημειώθηκαν",
      href: "/app/filming?view=list",
    },
    input.filmings.filter((f) => needsOutcome(f, input.nowMs)).length,
  ),
  statOf(
    {
      label: "Ομάδα που λείπει",
      hint: "επόμενες 7 ημέρες",
      href: "/app/filming?period=week",
    },
    input.filmings.filter((f) => isMissingCrew(f, input)).length,
  ),
];
