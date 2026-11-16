import type { E1Filming } from "./e1-groups";
import { needsOutcome } from "./e1-groups";

// Ο Πίνακας (Kanban) της E1: τέσσερις στήλες, οι επιτρεπτές μετακινήσεις και τα φίλτρα. Καθαρές συναρτήσεις.
// Η μετακίνηση δεν γίνεται αμέσως: ανοίγει τη φόρμα της ενέργειας και την ξαναελέγχει η βάση.

export type BoardColumnId =
  "pending" | "scheduled" | "needs_outcome" | "closed";

export interface BoardColumn {
  id: BoardColumnId;
  title: string;
  isAttention: boolean;
  filmings: readonly E1Filming[];
}

const COLUMNS: readonly Omit<BoardColumn, "filmings">[] = [
  { id: "pending", title: "Αναμένουν έγκριση", isAttention: false },
  { id: "scheduled", title: "Προγραμματισμένα", isAttention: false },
  { id: "needs_outcome", title: "Θέλουν «έγινε»", isAttention: true },
  { id: "closed", title: "Κλειστά", isAttention: false },
];

export const columnTitle = (id: BoardColumnId): string =>
  COLUMNS.find((column) => column.id === id)?.title ?? id;

const CLOSED_WINDOW_MS = 30 * 24 * 3_600_000;

export const columnOf = (filming: E1Filming, nowMs: number): BoardColumnId => {
  if (filming.state === "pending") return "pending";
  if (filming.state !== "scheduled") return "closed";
  return needsOutcome(filming, nowMs) ? "needs_outcome" : "scheduled";
};

const isRecent = (filming: E1Filming, nowMs: number): boolean =>
  filming.startsAtMs >= nowMs - CLOSED_WINDOW_MS;

const sorterOf = (id: BoardColumnId) =>
  id === "closed"
    ? (a: E1Filming, b: E1Filming) => b.startsAtMs - a.startsAtMs
    : (a: E1Filming, b: E1Filming) => a.startsAtMs - b.startsAtMs;

export const boardOf = (
  filmings: readonly E1Filming[],
  nowMs: number,
): readonly BoardColumn[] =>
  COLUMNS.map((column) => ({
    ...column,
    filmings: filmings
      .filter((f) => columnOf(f, nowMs) === column.id)
      .filter((f) => column.id !== "closed" || isRecent(f, nowMs))
      .sort(sorterOf(column.id)),
  }));

// ───────────── Μετακινήσεις ─────────────

export type BoardMove =
  "approve" | "reject" | "done" | "noshow" | "cancel" | "move" | "undo";

export interface BoardCaps {
  canApprove: boolean;
  canBook: boolean;
  canCrew: boolean;
}

// Χονδρικός έλεγχος για το σύρσιμο· ο ακριβής (ανά Γύρισμα) είναι στη φόρμα και στη βάση.
const isAllowed = (move: BoardMove, caps: BoardCaps): boolean => {
  if (move === "approve" || move === "reject" || move === "undo")
    return caps.canApprove;
  if (move === "done" || move === "noshow") return caps.canCrew;
  return caps.canBook;
};

const rawMoves = (
  filming: E1Filming,
  to: BoardColumnId,
  nowMs: number,
): readonly BoardMove[] => {
  const from = columnOf(filming, nowMs);
  if (from === "pending") {
    if (to === "scheduled") return ["approve"];
    return to === "closed" ? ["reject"] : [];
  }
  if (from === "scheduled") return to === "closed" ? ["cancel"] : [];
  if (from === "needs_outcome") {
    if (to === "closed") return ["done", "noshow", "cancel"];
    return to === "scheduled" ? ["move"] : [];
  }
  const isUndoable = filming.state === "done" || filming.state === "no_show";
  const backTo = columnOf({ ...filming, state: "scheduled" }, nowMs);
  return isUndoable && to === backTo ? ["undo"] : [];
};

export const movesFor = (
  filming: E1Filming,
  to: BoardColumnId,
  nowMs: number,
  caps: BoardCaps,
): readonly BoardMove[] =>
  rawMoves(filming, to, nowMs).filter((move) => isAllowed(move, caps));

export const targetsOf = (
  filming: E1Filming,
  nowMs: number,
  caps: BoardCaps,
): readonly BoardColumnId[] =>
  COLUMNS.map((column) => column.id).filter(
    (id) => movesFor(filming, id, nowMs, caps).length > 0,
  );

export const canDrag = (
  filming: E1Filming,
  nowMs: number,
  caps: BoardCaps,
): boolean => targetsOf(filming, nowMs, caps).length > 0;

// ───────────── Φίλτρα ─────────────

export type BoardPeriod =
  | { kind: "all" }
  | { kind: "week" }
  | { kind: "month" }
  | { kind: "range"; from: string; to: string };

export interface BoardFilters {
  clientId: string | null;
  crewUserId: string | null;
  period: BoardPeriod;
  isCareOnly: boolean;
}

export const NO_FILTERS: BoardFilters = {
  clientId: null,
  crewUserId: null,
  period: { kind: "all" },
  isCareOnly: false,
};

const plusDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 24 * 3_600_000)
    .toISOString()
    .slice(0, 10);

const inPeriod = (
  date: string,
  period: BoardPeriod,
  today: string,
): boolean => {
  if (period.kind === "all") return true;
  if (period.kind === "month") return date.slice(0, 7) === today.slice(0, 7);
  if (period.kind === "week")
    return date >= today && date <= plusDays(today, 6);
  return date >= period.from && date <= period.to;
};

const hasSignal = ({ signals }: E1Filming): boolean =>
  signals.equipmentConflict ||
  signals.crewDeclined ||
  signals.cancelRequest ||
  signals.slotProblem !== null ||
  signals.pendingReschedule !== null;

export const needsCare = (filming: E1Filming, nowMs: number): boolean =>
  (filming.state === "pending" || filming.state === "scheduled") &&
  (needsOutcome(filming, nowMs) || hasSignal(filming));

export const filterBoard = (
  filmings: readonly E1Filming[],
  filters: BoardFilters,
  { nowMs, today }: { nowMs: number; today: string },
): readonly E1Filming[] =>
  filmings.filter(
    (f) =>
      (filters.clientId === null || f.clientId === filters.clientId) &&
      (filters.crewUserId === null ||
        f.crewUserIds.includes(filters.crewUserId)) &&
      inPeriod(f.date, filters.period, today) &&
      (!filters.isCareOnly || needsCare(f, nowMs)),
  );
