// Το E4 μέσα στον οδηγό «Στήνω γύρισμα»: ποια Παραγωγή κρατά τη μέρα κλειστή. Η βάση βάζει το Γύρισμα στην Παραγωγή
// της Περιόδου της μέρας (εφάπαξ: στη μοναδική, χωρίς Περίοδο) και αρνείται αν δεν είναι ανοιχτή. Ο οδηγός το λέει πριν.
// Καθαρό αρχείο: τις Παραγωγές τις δίνει η σελίδα (οι Παραγωγές εισάγουν ήδη τα Γυρίσματα· έτσι δεν κάνουμε κύκλο).

import type { BookingAgreement } from "../types";

export interface HeldProduction {
  id: string;
  title: string;
  state: "delivered" | "cancelled";
  clientId: string | null;
  period: { starts: string; ends: string } | null;
}

export const heldProductionOf = (
  agreement: Pick<BookingAgreement, "kind" | "client"> | undefined,
  date: string,
  held: readonly HeldProduction[],
): HeldProduction | undefined =>
  agreement
    ? held.find(
        (item) =>
          item.clientId === agreement.client.id &&
          (item.period
            ? item.period.starts <= date && date <= item.period.ends
            : agreement.kind === "one_off"),
      )
    : undefined;
