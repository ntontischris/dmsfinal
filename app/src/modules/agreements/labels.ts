import type {
  AgreementKind,
  AgreementState,
  BucketFilter,
  DeviationStatus,
  LinkStatus,
  MilestoneTrigger,
  OutboxKind,
  ProposalPath,
  Renewal,
  UnusedProvisions,
} from "./types";

// Οι ετικέτες της βάσης στα ελληνικά. Η βάση κρατά κωδικούς· τα κείμενα ζουν μόνο εδώ.

export const KIND_LABELS: Readonly<Record<AgreementKind, string>> = { monthly: "μηνιαία", one_off: "εφάπαξ" };
export const STATE_LABELS: Readonly<Record<AgreementState, string>> = { proposal: "πρόταση", signed: "υπογεγραμμένη", active: "ενεργή", expired: "έληξε", dissolved: "λύθηκε" };
export const PATH_LABELS: Readonly<Record<ProposalPath, string>> = { draft: "Σύνταξη", awaiting_approval: "Αναμένει Έγκριση", sent: "Εστάλη", expired: "Έληξε", signed: "Υπογράφηκε", lost: "Χάθηκε" };
export const UNUSED_LABELS: Readonly<Record<UnusedProvisions, string>> = { lost: "χάνονται", next_period: "περνούν στην επόμενη Περίοδο", accumulate: "μαζεύονται" };
export const RENEWAL_LABELS: Readonly<Record<Renewal, string>> = { new_opportunity: "νέα Ευκαιρία", auto: "αυτόματη συνέχιση" };
export const MILESTONE_LABELS: Readonly<Record<MilestoneTrigger, string>> = { signature: "Υπογραφή", date: "Ημερομηνία", filming_done: "Γύρισμα έγινε", delivered: "Παραγωγή παραδόθηκε" };
export const LINK_STATUS_LABELS: Readonly<Record<LinkStatus, string>> = { active: "ενεργός", expired: "έληξε", revoked: "ανακλήθηκε", superseded: "ακυρώθηκε από νεότερη έκδοση", signed: "έχει ήδη υπογραφεί", closed: "δεν είναι πια ανοιχτή" };
export const DEVIATION_STATUS_LABELS: Readonly<Record<DeviationStatus, string>> = { new: "θέλει Έγκριση", deeper: "βαθύτερη από την Έγκριση", covered: "εγκρίθηκε" };
export const OUTBOX_KIND_LABELS: Readonly<Record<OutboxKind, string>> = { proposal_link: "Σύνδεσμος πρότασης", signing_code: "Κωδικός υπογραφής", signed_copy: "Αντίγραφο υπογεγραμμένης Συμφωνίας", client_invite: "Πρόσκληση Χρήστη πελάτη" };
export const BUCKET_LABELS: Readonly<Record<BucketFilter, string>> = { open: "Ανοιχτές", proposal: "Προτάσεις", active: "Ενεργές", closed: "Κλειστές", all: "Όλες" };
export const FORWARD_NOTE = "Η αλλαγή ισχύει για νέες προτάσεις· οι ανοιχτές και οι υπογεγραμμένες Συμφωνίες κρατούν τους δικούς τους Όρους.";
export const MANUAL_DELIVERY_NOTE = "Ο πάροχος email δεν έχει συνδεθεί· τα μηνύματα τα παραδίδεις εσύ από εδώ.";
export const AUTO_RENEWAL_NOTE = "Η αυτόματη συνέχιση καταχωρίζεται και φαίνεται στην πρόταση, αλλά δεν εκτελείται ακόμα: μια τέτοια Συμφωνία δεν λήγει μόνη της.";
