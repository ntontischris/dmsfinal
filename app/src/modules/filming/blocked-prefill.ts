import { z } from "zod";

import { athensDate, athensTime } from "./helpers-time";

// Η μετατροπή κλεισμένου χρόνου σε Γύρισμα: ό,τι φέρνει ο σύνδεσμος της φόρμας νέου Γυρίσματος.
// Ό,τι δεν είναι σωστό δεν προσυμπληρώνει τίποτα (η φόρμα ανοίγει κανονικά).

export interface NewFilmingPrefill {
  fromBlocked: string;
  date: string;
  time: string;
  hours: number | null;
}

const prefillQuery = z.object({
  fromBlocked: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  hours: z.coerce.number().min(0.5).max(12).optional(),
});

export function parseBlockedPrefill(
  query: Readonly<Record<string, string | string[] | undefined>>,
): NewFilmingPrefill | null {
  const parsed = prefillQuery.safeParse({
    fromBlocked: first(query.fromBlocked),
    startsAt: first(query.startsAt),
    hours: first(query.hours),
  });
  if (!parsed.success) return null;
  return {
    fromBlocked: parsed.data.fromBlocked,
    date: athensDate(parsed.data.startsAt),
    time: athensTime(parsed.data.startsAt),
    hours: parsed.data.hours ?? null,
  };
}

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
