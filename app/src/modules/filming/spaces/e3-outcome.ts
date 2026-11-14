// Τι γίνεται με την Παροχή και τη χρέωση όταν πατηθεί «έγινε», «δεν έγινε» ή «αναίρεση» (c7). Καθαρό κείμενο πάνω στην
// κάρτα της βάσης· τα ποσά δεν φαίνονται εδώ (τα βλέπει όποιος έχει Δικαίωμα στα Τιμολογητέα).

import type { FilmingCard } from "../types";

export type OutcomeAction = "done" | "noshow" | "undo";

type OutcomeCard = Pick<
  FilmingCard,
  "agreement" | "burned" | "isExtra" | "kind" | "state" | "team"
>;

const USE_WORDS = {
  per_filming: "μετρά ως ένα Γύρισμα",
  per_hour: "μετρά με τις πραγματικές ώρες",
  per_day: "μετρά ως μία μέρα",
} as const;

function doneNotes(card: OutcomeCard): string[] {
  if (!card.agreement) return ["Εσωτερικό Γύρισμα: δεν μετρά σε Παροχή και δεν χρεώνεται."];
  if (card.isExtra) {
    return card.team?.outcome.extraBillable
      ? ["Έξτρα Γύρισμα: δεν τρώει Παροχή. Μπαίνει μόνο του στα Τιμολογητέα του Πελάτη σε λίγα λεπτά."]
      : ["Έξτρα Γύρισμα: δεν τρώει Παροχή και η Συμφωνία δεν έχει τιμή γι' αυτό, οπότε δεν χρεώνεται μόνο του. Αν πρέπει να χρεωθεί, βάλ' το με το χέρι στο τιμολόγιο."];
  }
  if (!card.kind) return ["Το Γύρισμα δεν έχει είδος Παροχής: δεν μετρά πουθενά."];
  return [`Η Παροχή «${card.kind.label}» ${USE_WORDS[card.kind.measure]}. Δεν βγαίνει ξεχωριστή χρέωση: καλύπτεται από τη Συμφωνία.`];
}

function noShowNotes(card: OutcomeCard): string[] {
  if (!card.agreement) return ["Εσωτερικό Γύρισμα: τίποτα δεν καίγεται και τίποτα δεν χρεώνεται."];
  const burns = card.team?.outcome.noShowBurns ?? false;
  if (card.isExtra) return ["Έξτρα Γύρισμα: δεν τρώει Παροχή και δεν χρεώνεται μόνο του."];
  return [
    burns
      ? "Ο πελάτης δεν εμφανίστηκε: κατά τους Όρους της Συμφωνίας η Παροχή καίγεται, σαν να έγινε."
      : "Ο πελάτης δεν εμφανίστηκε: κατά τους Όρους της Συμφωνίας η Παροχή επιστρέφει στο υπόλοιπο.",
  ];
}

function undoNotes(card: OutcomeCard): string[] {
  const notes = ["Το Γύρισμα ξαναγίνεται προγραμματισμένο."];
  const hasUsed = card.state === "done" || card.burned;
  if (card.agreement && !card.isExtra && card.kind && hasUsed) {
    notes.push(`Η Παροχή «${card.kind.label}» επιστρέφει στο υπόλοιπο.`);
  }
  const billable = card.team?.outcome.billable ?? "none";
  if (billable === "pending") {
    notes.push("Το Τιμολογητέο του έξτρα Γυρίσματος δεν σβήνεται μόνο του: διόρθωσέ το στα Τιμολογητέα πριν μπει σε τιμολόγιο.");
  }
  if (billable === "invoiced") {
    notes.push("Το έξτρα Γύρισμα έχει ήδη τιμολογηθεί: η διόρθωση γίνεται με πιστωτικό.");
  }
  return notes;
}

export function outcomeNotes(card: OutcomeCard, action: OutcomeAction): string[] {
  if (action === "done") return doneNotes(card);
  if (action === "noshow") return noShowNotes(card);
  return undoNotes(card);
}
