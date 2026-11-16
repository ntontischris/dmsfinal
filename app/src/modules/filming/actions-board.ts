"use server";

import { getFilming } from "./queries";
import { uuid } from "./schemas";
import type { FilmingCard } from "./types";

// Ο Πίνακας της E1 φέρνει την κάρτα του Γυρίσματος μόλις αφεθεί σε στήλη: το viewerCan της βάσης αποφασίζει τη φόρμα.
// Η βάση κρύβει ό,τι δεν βλέπει ο Χρήστης (null), όπως στη σελίδα Γυρίσματος.
export async function loadFilmingCard(
  filmingId: string,
): Promise<{ card: FilmingCard | null; error: string | null }> {
  const parsed = uuid.safeParse(filmingId);
  if (!parsed.success) return { card: null, error: "Το Γύρισμα δεν βρέθηκε." };
  const result = await getFilming(parsed.data);
  if (!result.ok)
    return { card: null, error: "Δεν φορτώθηκε το Γύρισμα. Δοκίμασε ξανά." };
  return result.data
    ? { card: result.data, error: null }
    : { card: null, error: "Το Γύρισμα δεν βρέθηκε." };
}
