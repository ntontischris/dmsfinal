import { athensDate, athensTime, athensToIso } from "@/modules/filming";

import type { BlockedTime } from "./types";

// Η φόρμα του Κλεισμένου χρόνου (A6) ως στιγμές. Η ώρα είναι της Αθήνας· «όλη μέρα» παίρνει τα μεσάνυχτα των ορίων.

export interface BlockedFormFields {
  day: string;
  untilDay: string | null;
  allDay: boolean;
  from: string;
  to: string;
}

export interface BlockedSpan {
  startsAt: string;
  endsAt: string;
}

// Όλη μέρα: από τα μεσάνυχτα της πρώτης μέρας έως τα μεσάνυχτα μετά την τελευταία (ή της πρώτης αν δεν έχει «έως»).
export function blockedSpan(fields: BlockedFormFields): BlockedSpan {
  if (fields.allDay) {
    return {
      startsAt: athensToIso(fields.day, "00:00"),
      endsAt: athensToIso(fields.untilDay ?? fields.day, "00:00"),
    };
  }
  return {
    startsAt: athensToIso(fields.day, fields.from),
    endsAt: athensToIso(fields.day, fields.to),
  };
}

// Οι τιμές της φόρμας επεξεργασίας, από ό,τι έδωσε η βάση.
// Η «όλη μέρα» τελειώνει τα μεσάνυχτα μετά την τελευταία μέρα, γι' αυτό διαβάζουμε την αμέσως προηγούμενη στιγμή.
export function blockedFormValues(time: BlockedTime): BlockedFormFields {
  const lastDay = athensDate(new Date(new Date(time.endsAt).getTime() - 1));
  const day = athensDate(time.startsAt);
  return {
    day,
    untilDay: time.allDay && lastDay !== day ? lastDay : null,
    allDay: time.allDay,
    from: athensTime(time.startsAt),
    to: athensTime(time.endsAt),
  };
}

const HOUR_MS = 3_600_000;
const MIN_FILMING_HOURS = 0.5;
const MAX_FILMING_HOURS = 12;
const DEFAULT_CONVERT_CLOCK = "09:00";

// Η μετατροπή σε Γύρισμα: η ώρα και η διάρκεια του κλεισμένου χρόνου. Η «όλη μέρα» δεν έχει ώρα, γι' αυτό
// μπαίνει 09:00 της μέρας και η διάρκεια μένει στην προεπιλογή του Είδους.
export function convertHref(time: BlockedTime): string {
  const query = new URLSearchParams({ fromBlocked: time.id });
  if (time.allDay) {
    query.set("startsAt", athensToIso(athensDate(time.startsAt), DEFAULT_CONVERT_CLOCK));
  } else {
    const hours = (new Date(time.endsAt).getTime() - new Date(time.startsAt).getTime()) / HOUR_MS;
    query.set("startsAt", time.startsAt);
    query.set("hours", String(clampHours(hours)));
  }
  return `/app/filming/new?${query.toString()}`;
}

const clampHours = (hours: number): number =>
  Math.min(MAX_FILMING_HOURS, Math.max(MIN_FILMING_HOURS, Math.round(hours * 2) / 2));
