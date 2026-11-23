export interface StageBox {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Override {
  base: string;
  to: string;
}

// Απόσταση στον άξονα: 0 όταν η τιμή είναι μέσα στο διάστημα.
const gap = (from: number, to: number, value: number): number =>
  Math.max(from - value, 0, value - to);

// Η Στήλη όπου αφήνεται η κάρτα. Πρώτα μετράει η οριζόντια θέση (Στήλες δίπλα-δίπλα, όσο κοντή κι αν είναι μία),
// μετά η κάθετη (Στήλες η μία κάτω από την άλλη στο κινητό). Κενά ανάμεσα πάνε στην πιο κοντινή.
export function nearestStage(
  boxes: readonly StageBox[],
  x: number,
  y: number,
): string | null {
  const ranked = boxes.toSorted(
    (a, b) =>
      gap(a.left, a.right, x) - gap(b.left, b.right, x) ||
      gap(a.top, a.bottom, y) - gap(b.top, b.bottom, y),
  );
  return ranked[0]?.id ?? null;
}

// Η Στήλη που δείχνει η κάρτα: η μετακίνηση ισχύει μόνο όσο τα δεδομένα του διακομιστή είναι ακόμα τα παλιά.
export const resolveStage = (
  serverStage: string,
  override: Override | undefined,
): string =>
  override && override.base === serverStage ? override.to : serverStage;
