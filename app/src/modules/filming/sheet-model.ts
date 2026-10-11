import type { SheetShot } from "./sheet-types";

// Η λίστα λήψεων στη μνήμη της φόρμας. Κάθε αλλαγή επιστρέφει νέα λίστα· η βάση ξαναελέγχει ό,τι αποθηκεύεται.

export const SHOT_LIMIT = 100;

export const addShot = (
  shots: readonly SheetShot[],
  text: string,
  id: string,
): SheetShot[] => {
  const trimmed = text.trim();
  if (trimmed === "" || shots.length >= SHOT_LIMIT) return [...shots];
  return [...shots, { id, text: trimmed }];
};

export const renameShot = (
  shots: readonly SheetShot[],
  id: string,
  text: string,
): SheetShot[] => shots.map((shot) => (shot.id === id ? { ...shot, text } : shot));

export const removeShot = (shots: readonly SheetShot[], id: string): SheetShot[] =>
  shots.filter((shot) => shot.id !== id);

// Μετακίνηση κατά μία θέση πάνω (-1) ή κάτω (+1). Έξω από τα όρια η λίστα μένει ίδια.
export const moveShot = (
  shots: readonly SheetShot[],
  id: string,
  direction: -1 | 1,
): SheetShot[] => {
  const from = shots.findIndex((shot) => shot.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= shots.length) return [...shots];
  const next = [...shots];
  const moved = next.splice(from, 1);
  next.splice(to, 0, ...moved);
  return next;
};
