"use server";

import { loadEgkrinoRows, sentLineOf } from "@/modules/filming";

// Για τον browser (η μηχανή των οδηγών): το module των Γυρισμάτων δεν μπαίνει σε client αρχείο, μόνο μέσα από εδώ.

// Οι γραμμές του «Εγκρίνω αιτήματα γυρίσματος»: μία ανά Γύρισμα, κλειδί = το ?req=.
export async function loadEgkrinoLoop() {
  return loadEgkrinoRows();
}

// «Στάλθηκαν 3 ώρες στον Πελάτη «Ταβέρνα»» για το {sent} του βήματος.
export async function loadSentLine(
  sent: string | null,
  client: string | null,
): Promise<string> {
  return sentLineOf(sent, client);
}
