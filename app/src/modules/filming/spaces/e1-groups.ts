import { activeSignals } from "../helpers";
import { STATE_LABELS } from "../labels";
import type { FilmingFlags, FilmingSignals, FilmingState } from "../types";

// Ομαδοποίηση της λίστας Γυρισμάτων (E1, prototype `screens/e1-groups.ts`): ό,τι θέλει «έγινε» πρώτα, μετά τα επόμενα
// και τα παλιά ανά μήνα. Καθαρές συναρτήσεις πάνω στη γραμμή της νέας εμφάνισης (βλ. e1-adapter).

// Ένα Γύρισμα της λίστας, σε ώρα Αθήνας.
export interface E1Filming {
  id: string;
  // «ΕΕΕΕ-ΜΜ-ΗΗ» και «ΩΩ:ΛΛ» της Αθήνας.
  date: string;
  start: string;
  end: string;
  startsAtMs: number;
  endsAtMs: number;
  state: FilmingState;
  clientName: string | null;
  productionTitle: string;
  crew: { confirmed: number; total: number } | null;
  signals: FilmingSignals;
}

export interface FilmingGroup {
  id: string;
  label: string;
  filmings: readonly E1Filming[];
  isAttention: boolean;
  // Το πρώτο ανοιχτό μελλοντικό Γύρισμα, για την ένδειξη «Επόμενο».
  nextId?: string;
}

const OPEN_STATES: readonly FilmingState[] = ["pending", "scheduled"];

const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

// Προγραμματισμένο που τελείωσε χωρίς σήμανση: θέλει «έγινε» ή «δεν έγινε».
export const needsOutcome = (filming: E1Filming, nowMs: number): boolean =>
  filming.state === "scheduled" && filming.endsAtMs <= nowMs;

const monthKey = (filming: E1Filming): string => filming.date.slice(0, 7);

const monthLabel = (key: string): string => {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
};

const byMonth = (
  filmings: readonly E1Filming[],
  suffix: string,
): FilmingGroup[] =>
  [...new Set(filmings.map(monthKey))].map((key) => ({
    id: `${suffix}-${key}`,
    label: `${monthLabel(key)} · ${suffix}`,
    filmings: filmings.filter((f) => monthKey(f) === key),
    isAttention: false,
  }));

export const groupFilmings = (
  filmings: readonly E1Filming[],
  nowMs: number,
  { isClient = false }: { isClient?: boolean } = {},
): readonly FilmingGroup[] => {
  // Ο πελάτης δεν σημειώνει «έγινε»· τα βλέπει μαζί με τα παλιά.
  const isLate = (f: E1Filming) => !isClient && needsOutcome(f, nowMs);
  const oldestFirst = (a: E1Filming, b: E1Filming) =>
    a.startsAtMs - b.startsAtMs;
  const late = filmings.filter(isLate).sort(oldestFirst);
  const rest = filmings.filter((f) => !isLate(f));
  const upcoming = rest.filter((f) => f.endsAtMs > nowMs).sort(oldestFirst);
  const past = rest
    .filter((f) => f.endsAtMs <= nowMs)
    .sort((a, b) => oldestFirst(b, a));
  const nextId = upcoming.find((f) => OPEN_STATES.includes(f.state))?.id;
  const upcomingGroups = byMonth(upcoming, "επόμενα").map((group) =>
    group.filmings.some((f) => f.id === nextId) ? { ...group, nextId } : group,
  );
  const lateGroup: FilmingGroup[] =
    late.length > 0
      ? [
          {
            id: "late",
            label: "Θέλουν «έγινε»",
            filmings: late,
            isAttention: true,
          },
        ]
      : [];
  return [...lateGroup, ...upcomingGroups, ...byMonth(past, "πέρασαν")];
};

// Πόσες μέρες πέρασαν από το Γύρισμα, σε ημερολογιακές μέρες (η «σήμερα» είναι η ημέρα της Αθήνας).
export const daysLateLabel = (filming: E1Filming, today: string): string => {
  const days = Math.round(
    (Date.parse(`${today}T00:00Z`) - Date.parse(`${filming.date}T00:00Z`)) /
      86_400_000,
  );
  if (days <= 0) return "σήμερα";
  if (days === 1) return "χθες";
  return `πριν από ${days} ημέρες`;
};

// Τόνος ανά σημασία: πρόβλημα (κόκκινο), εκκρεμεί απόφαση (κίτρινο), σειρά σου, σίγουρο, έγινε, κλειστό.
export type StatusTone =
  "problem" | "pending" | "action" | "neutral" | "ok" | "muted";

export interface StatusLook {
  tone: StatusTone;
  icon: string;
  label: string;
}

// Η κατάσταση με τις λέξεις του prototype (πεζά, όπως στο Γλωσσάρι).
export const stateWord = (state: FilmingState): string =>
  STATE_LABELS[state].toLocaleLowerCase("el");

const isLive = (filming: E1Filming, nowMs: number): boolean =>
  filming.endsAtMs > nowMs && OPEN_STATES.includes(filming.state);

const hasCantDo = (filming: E1Filming): boolean =>
  filming.state === "scheduled" && filming.signals.crewDeclined;

const hasConflict = (filming: E1Filming, nowMs: number): boolean =>
  isLive(filming, nowMs) && filming.signals.equipmentConflict;

export const statusLook = (filming: E1Filming, nowMs: number): StatusLook => {
  const word = stateWord(filming.state);
  if (needsOutcome(filming, nowMs))
    return { tone: "action", icon: "→", label: "θέλει «έγινε»" };
  if (filming.signals.cancelRequest)
    return {
      tone: "pending",
      icon: "?",
      label: "ζητήθηκε ακύρωση · εκκρεμεί απόφαση",
    };
  if (filming.state === "pending")
    return { tone: "pending", icon: "?", label: word };
  if (hasCantDo(filming) || hasConflict(filming, nowMs))
    return { tone: "problem", icon: "!", label: `${word} · θέλει κοίταγμα` };
  if (filming.state === "scheduled")
    return { tone: "neutral", icon: "●", label: word };
  if (filming.state === "done") return { tone: "ok", icon: "✓", label: word };
  return { tone: "muted", icon: "×", label: word };
};

// Για τον πελάτη: μόνο η κατάσταση και το δικό του αίτημα, όχι τα εσωτερικά του Συνεργείου.
export const clientStatusLook = (filming: E1Filming): StatusLook => {
  const word = stateWord(filming.state);
  if (filming.signals.cancelRequest)
    return { tone: "pending", icon: "?", label: "ζητήθηκε ακύρωση" };
  if (filming.state === "pending")
    return { tone: "pending", icon: "?", label: word };
  if (filming.state === "scheduled")
    return { tone: "neutral", icon: "●", label: word };
  if (filming.state === "done") return { tone: "ok", icon: "✓", label: word };
  return { tone: "muted", icon: "×", label: word };
};

// Σήματα της λίστας με λόγια. Η λίστα της βάσης δίνει το είδος του σήματος (όχι ποιος ή ποιο αντικείμενο)·
// τα ονόματα φαίνονται στη σελίδα του Γυρίσματος.
export interface FilmingSignal {
  label: string;
}

export const signalsOf = (
  filming: E1Filming,
  nowMs: number,
): readonly FilmingSignal[] => {
  const { signals } = filming;
  const live = isLive(filming, nowMs);
  return [
    ...(hasCantDo(filming) ? [{ label: "Κάποιος δεν μπορεί" }] : []),
    ...(hasConflict(filming, nowMs) ? [{ label: "Σύγκρουση εξοπλισμού" }] : []),
    ...(live && signals.slotProblem ? [{ label: signals.slotProblem }] : []),
    ...(live && signals.pendingReschedule
      ? [{ label: "Ζητήθηκε μετάθεση" }]
      : []),
  ];
};

// Τα σήματα του πελάτη όπως στη σημερινή σελίδα: όσα δίνει η βάση για αυτόν, με τις λέξεις της (Έξτρα, Αίτημα ακύρωσης…).
export interface ClientSignal {
  key: keyof FilmingFlags;
  label: string;
  // Θέλει προσοχή (όλα εκτός από το «Έξτρα»).
  isAttention: boolean;
}

export const clientSignalsOf = (filming: E1Filming): readonly ClientSignal[] =>
  activeSignals(filming.signals).map((signal) => ({
    ...signal,
    isAttention: signal.key !== "isExtra",
  }));
