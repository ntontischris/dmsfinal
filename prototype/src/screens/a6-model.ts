import { memberName } from "@/data/calendar";
import {
  BLOCKED_TIMES,
  FILMINGS,
  NOW,
  OPEN_STATES,
  type BlockedTime,
  type Filming,
} from "@/data/filming";
import { blockedOverlaps, toMinutes } from "@/data/filming-access";
import { fmtDay } from "@/screens/e3-model";

export const isAllDay = (blocked: Pick<BlockedTime, "from" | "to">): boolean =>
  blocked.from === "00:00" && blocked.to === "24:00";

export const lastDayOf = (blocked: BlockedTime): string =>
  blocked.untilDate ?? blocked.date;

// «Επόμενο»: το τέλος της τελευταίας μέρας (ώρα «έως») είναι μετά το NOW.
export const isUpcomingBlocked = (blocked: BlockedTime): boolean =>
  Date.parse(`${lastDayOf(blocked)}T00:00`) + toMinutes(blocked.to) * 60_000 >
  Date.parse(NOW);

export const whenLabel = (blocked: BlockedTime): string => {
  const days = blocked.untilDate
    ? `${fmtDay(blocked.date)} – ${fmtDay(blocked.untilDate)}`
    : fmtDay(blocked.date);
  return isAllDay(blocked)
    ? `${days} · όλη μέρα`
    : `${days} · ${blocked.from}–${blocked.to}`;
};

// Τα άλλα άτομα που μοιράζονται το ίδιο γεγονός Google.
export const sharedWith = (blocked: BlockedTime): readonly string[] =>
  blocked.googleEventId
    ? BLOCKED_TIMES.filter(
        (other) =>
          other.googleEventId === blocked.googleEventId &&
          other.id !== blocked.id,
      ).map((other) => memberName(other.personId))
    : [];

export const filmingConflicts = (draft: BlockedTime): readonly Filming[] =>
  FILMINGS.filter(
    (filming) =>
      OPEN_STATES.includes(filming.state) &&
      filming.crew.some((slot) => slot.personId === draft.personId) &&
      blockedOverlaps(draft, filming),
  );

export interface Draft {
  personId: string;
  date: string;
  untilDate: string;
  from: string;
  to: string;
  allDay: boolean;
  label: string;
}

export const draftOf = (
  blocked: BlockedTime | null,
  personId: string,
): Draft =>
  blocked
    ? {
        personId: blocked.personId,
        date: blocked.date,
        untilDate: blocked.untilDate ?? "",
        from: isAllDay(blocked) ? "09:00" : blocked.from,
        to: isAllDay(blocked) ? "10:00" : blocked.to,
        allDay: isAllDay(blocked),
        label: blocked.label,
      }
    : {
        personId,
        date: NOW.slice(0, 10),
        untilDate: "",
        from: "09:00",
        to: "10:00",
        allDay: false,
        label: "",
      };

export const validateDraft = (draft: Draft): string | null => {
  if (draft.label.trim() === "") return "Ο τίτλος είναι υποχρεωτικός.";
  if (draft.date === "") return "Διάλεξε μέρα.";
  if (draft.allDay)
    return draft.untilDate !== "" && draft.untilDate < draft.date
      ? "Η «Έως μέρα» πρέπει να είναι ίδια ή μετά την αρχική."
      : null;
  return toMinutes(draft.to) <= toMinutes(draft.from)
    ? "Η ώρα «Έως» πρέπει να είναι μετά την ώρα «Από»."
    : null;
};

export const blockedFromDraft = (
  draft: Draft,
  id: string,
  createdBy: string,
  base?: BlockedTime,
): BlockedTime => ({
  id,
  personId: draft.personId,
  date: draft.date,
  untilDate:
    draft.allDay && draft.untilDate > draft.date ? draft.untilDate : undefined,
  from: draft.allDay ? "00:00" : draft.from,
  to: draft.allDay ? "24:00" : draft.to,
  label: draft.label.trim(),
  source: base?.source ?? "DMS",
  createdBy: base?.createdBy ?? createdBy,
  googleEventId: base?.googleEventId,
});
