// Η ετικέτα ιδιοκτησίας ενός Πελάτη για τις Πωλήσεις με Εύρος «όσα με αφορούν» (prototype `b1-ownership.ts`).
// Ίδιος κανόνας με το τι ανοίγει: δικός μου (Υπεύθυνος), μέσω δικής μου Ευκαιρίας, ή άλλου (κατειλημμένος, δεν ανοίγει).

export type ListAccess = "owner" | "granted" | "taken";

export interface OwnershipLabel {
  badge: string;
  note: string;
}

// Η πρόσβαση ζητιέται από το «Νέος Πελάτης / Ευκαιρία» (Αίτημα πρόσβασης), όχι από τη σελίδα του Πελάτη.
export const ownershipOf = (access: ListAccess, ownerName: string | null): OwnershipLabel | null => {
  if (access === "owner") return null;
  if (access === "granted")
    return {
      badge: "Μέσω της Ευκαιρίας σου",
      note: ownerName ? `Υπεύθυνος: ${ownerName}` : "Δεν έχει ακόμα Υπεύθυνο",
    };
  if (!ownerName)
    return {
      badge: "Χωρίς Υπεύθυνο",
      note: "Ζήτα πρόσβαση από το «Νέος Πελάτης / Ευκαιρία»",
    };
  return {
    badge: "Ανήκει σε άλλον πωλητή",
    note: `Υπεύθυνος: ${ownerName} · ζήτα πρόσβαση από το «Νέος Πελάτης / Ευκαιρία»`,
  };
};
