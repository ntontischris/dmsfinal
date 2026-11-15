"use server";

import { readNeedsMe, type NeedRow } from "@/modules/messages";

// Οι γραμμές του οδηγού «Απαντώ σε Πελάτες» (λίστα «Χρειάζονται εμένα»), για τον browser. Μόνο ανάγνωση.
export async function loadNeedsMe(): Promise<NeedRow[] | null> {
  return readNeedsMe();
}
