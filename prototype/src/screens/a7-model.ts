import {
  DELETION_HOURS,
  GOOGLE_DELETIONS,
  memberName,
  type GoogleDeletion,
} from "@/data/calendar";
import { NOW, findFilming, type Filming } from "@/data/filming";
import { clientNameOf, endTime } from "@/data/filming-access";
import { fmtDay } from "@/screens/e3-model";
import { screenHref } from "@/screens/shared";
import type { RoleId } from "@/data/roles";

export interface DeletionItem {
  id: string;
  filmingHref: string;
  clientName: string;
  when: string;
  filmingState: string;
  isAwaitingApproval: boolean;
  deletedBy: string;
  deletedAtLabel: string;
  deadlineLabel: string;
  hoursLeft: number;
  isDeadlineFilmingStart: boolean;
  resolution: string;
}

const HOUR_MS = 3_600_000;
const asUtc = (local: string): number => Date.parse(`${local}:00Z`);

export const fmtLocal = (local: string): string => {
  const [date, time] = local.split("T");
  return `${fmtDay(date)} ${time}`;
};

const fmtMs = (ms: number): string =>
  fmtLocal(new Date(ms).toISOString().slice(0, 16));

export const hoursLeftLabel = (hours: number): string => {
  if (hours <= 0) return "έληξε";
  if (hours < 1) return "σε λιγότερο από 1 ώρα";
  const rounded = Math.round(hours);
  return `σε ${rounded} ${rounded === 1 ? "ώρα" : "ώρες"}`;
};

// Προθεσμία = 24 ώρες από τη διαγραφή ή η έναρξη του Γυρίσματος, ό,τι έρθει πρώτο.
export const deadlineOf = (
  deletion: GoogleDeletion,
  filming: Filming,
): { ms: number; isFilmingStart: boolean } => {
  const byRule = asUtc(deletion.deletedAt) + DELETION_HOURS * HOUR_MS;
  const start = asUtc(`${filming.date}T${filming.start}`);
  return start < byRule
    ? { ms: start, isFilmingStart: true }
    : { ms: byRule, isFilmingStart: false };
};

const resolutionOf = (deletion: GoogleDeletion): string => {
  const at = deletion.resolvedAt ? fmtLocal(deletion.resolvedAt) : "";
  if (deletion.status === "επανήλθε αυτόματα") {
    return `Επανήλθε αυτόματα στις ${at}.`;
  }
  const who = deletion.resolvedBy ? memberName(deletion.resolvedBy) : "—";
  if (deletion.status === "επανήλθε") return `Επανήλθε από ${who}.`;
  if (deletion.status === "επιβεβαιώθηκε") {
    return `Επιβεβαιώθηκε από ${who}: ${deletion.reason ?? "—"}`;
  }
  return "";
};

const toItem = (
  role: RoleId,
  deletion: GoogleDeletion,
  filming: Filming,
): DeletionItem => {
  const deadline = deadlineOf(deletion, filming);
  const hoursLeft = (deadline.ms - asUtc(NOW)) / HOUR_MS;
  return {
    id: deletion.id,
    filmingHref: screenHref(role, "E3", { id: filming.id }),
    clientName: clientNameOf(filming),
    when: `${fmtDay(filming.date)} ${filming.start}–${endTime(filming)}`,
    filmingState: filming.state,
    isAwaitingApproval: filming.state === "αναμένει έγκριση",
    deletedBy: memberName(deletion.deletedBy),
    deletedAtLabel: fmtLocal(deletion.deletedAt),
    deadlineLabel: `λήγει ${fmtMs(deadline.ms)} (${hoursLeftLabel(hoursLeft)})`,
    hoursLeft,
    isDeadlineFilmingStart: deadline.isFilmingStart,
    resolution: resolutionOf(deletion),
  };
};

export const deletionItems = (
  role: RoleId,
): { pending: DeletionItem[]; recent: DeletionItem[] } => {
  const items = GOOGLE_DELETIONS.flatMap((deletion) => {
    const filming = findFilming(deletion.filmingId);
    return filming ? [{ deletion, item: toItem(role, deletion, filming) }] : [];
  });
  const pick = (isPending: boolean) =>
    items
      .filter(({ deletion }) => (deletion.status === "αναμένει") === isPending)
      .map(({ item }) => item);
  return { pending: pick(true), recent: pick(false) };
};
