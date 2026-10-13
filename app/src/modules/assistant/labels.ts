import type { Language } from "./prompt";

// Τα κείμενα του Βοηθού (A9), κατά το prototype.

export const ASSISTANT_TITLE = "Βοηθός";
export const ASSISTANT_NOTE = "Απαντά στη γλώσσα σου, με πηγές.";
export const RETENTION_NOTE =
  "Οι Συζητήσεις κρατιούνται 12 μήνες από το τελευταίο μήνυμα και τις βλέπει η εταιρεία.";
export const WELCOME_TEXT =
  "Γεια σου! Ρώτα με ό,τι θέλεις και θα σου απαντήσω με πηγές.";

export const SUGGESTIONS: Readonly<
  Record<"client" | "team", readonly string[]>
> = {
  client: [
    "Πώς κλείνω Γύρισμα;",
    "Πώς εγκρίνω ένα Παραδοτέο;",
    "Πού βλέπω τα Τιμολόγιά μου;",
  ],
  team: [
    "Τι ώρα πρέπει να είμαστε στο σετ;",
    "Ποιοι είναι οι κανόνες στο σετ;",
    "Τι λέμε όταν μας λένε ότι είναι ακριβό;",
  ],
};

// «Δεν ξέρω» στη γλώσσα του ερωτώντα (γράφεται και στη Συζήτηση).
export const UNKNOWN_TEXT: Readonly<Record<Language, string>> = {
  el: "Δεν το βρίσκω στη Γνώση, οπότε δεν ξέρω.",
  en: "I can't find this in our knowledge base, so I don't know.",
};

export const UNAVAILABLE_TEXT = {
  capped: "Ο Βοηθός δεν είναι διαθέσιμος ως την 1η του μήνα.",
  unavailable: "Ο Βοηθός δεν είναι διαθέσιμος τώρα.",
} as const;

export const ERROR_TEXT = "Η απάντηση δεν ήρθε. Δοκίμασε ξανά σε λίγο.";
export const CHAT_LINK_TEXT = "Γράψε στη Συνομιλία με την ομάδα";
export const SEARCH_LINK_TEXT = "Ψάξε στη Γνώση";
export const ROUTED_TEXT = "Η ερώτηση πήγε σε όσους διαχειρίζονται τη Γνώση.";
export const RECORDED_TEXT = "Η ερώτηση καταγράφηκε στις Αναπάντητες.";
