import type { BadgeTone } from "@/spaces/screens/shared";

// Πόσο από ένα Τιμολογητέο έχει καλυφθεί από Τιμολόγια: σε λέξη και χρώμα για το πάνελ «Τιμή και Τιμολογητέα».
export function coverageOf(
  net: number,
  covered: number,
): { word: string; tone: BadgeTone | undefined } {
  if (covered >= net) return { word: "τιμολογήθηκε", tone: "ok" };
  if (covered > 0) return { word: "μερικώς τιμολογημένο", tone: "waiting" };
  return { word: "προς τιμολόγηση", tone: "attention" };
}

// Από πού έρχεται η τιμή που δείχνουμε.
export const PRICE_OF_LABELS = {
  period: "τιμή της Περιόδου",
  agreement: "τιμή της Συμφωνίας",
} as const;
