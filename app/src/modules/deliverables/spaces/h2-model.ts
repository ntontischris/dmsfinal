// H2 (νέα εμφάνιση): το πραγματικό Παραδοτέο (deliverable_view) στις λέξεις και τα σχήματα του prototype
// (`screens/h2-model.ts`, `screens/h2-asks-model.ts`). Καθαρές συναρτήσεις, χωρίς είσοδο/έξοδο.

import type {
  AssigneeCandidate,
  Charge,
  DeliverableDetail,
  DeliverableState,
  DeliverableVersion,
  RequestDecision,
  VersionState,
} from "../types";

// Ό,τι χρειάζονται τα κομμάτια της σελίδας πέρα από το ίδιο το Παραδοτέο (serializable).
export interface H2Context {
  canSeeAmounts: boolean;
  canReview: boolean;
  // null: οι Κανόνες δεν φορτώθηκαν, άρα δεν ξέρουμε πού πάει η νέα Έκδοση (το αποφασίζει η βάση).
  goesToReview: boolean | null;
  // Ο κανόνας «Εσωτερικός έλεγχος» (null αν δεν φορτώθηκαν οι Κανόνες).
  internalReview: boolean | null;
  // null: δεν έχει «Δουλεύει Παραδοτέα» σε αυτή την Παραγωγή, άρα ούτε αλλαγή Ανατεθειμένου.
  assignees: readonly AssigneeCandidate[] | null;
  productionHref: string;
  filmingHref: string | null;
  initialVersion?: number;
}

export interface PanelProps {
  detail: DeliverableDetail;
  ctx: H2Context;
}

const DAY = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Η μέρα μιας στιγμής (ISO) στην Αθήνα, ως «10/09/2026», όπως το fmtDate του prototype.
export const fmtDay = (iso: string): string => DAY.format(new Date(iso));

// Η κατάσταση του Παραδοτέου με τις λέξεις του prototype (και του γλωσσαριού, για το «τι σημαίνει;»).
export const STATE_WORDS: Readonly<Record<DeliverableState, string>> = {
  draft: "σε εργασία",
  in_review: "σε εργασία",
  returned: "σε εργασία",
  changes_requested: "σε εργασία",
  awaiting_client: "αναμένει πελάτη",
  approved: "εγκρίθηκε",
  superseded: "αντικαταστάθηκε",
  cancelled: "ακυρώθηκε",
};

export const VERSION_WORDS: Readonly<Record<VersionState, string>> = {
  in_review: "αναμένει εσωτερικό έλεγχο",
  returned: "επιστράφηκε από έλεγχο",
  awaiting_client: "αναμένει πελάτη",
  approved: "εγκρίθηκε",
  changes_requested: "χρειάζεται αλλαγές",
  superseded: "αντικαταστάθηκε",
};

export const DECISION_WORDS: Readonly<Record<RequestDecision, string>> = {
  round: "δεκτό ως γύρος",
  charged: "χρεώνεται",
  new_deliverable: "νέο Παραδοτέο",
};

export const CANCEL_WORDS = {
  consumed: "καταναλώθηκε",
  returned: "επιστρέφει",
} as const;

// Η νέα Έκδοση πάει πρώτα σε έλεγχο όταν η Παραγωγή είναι Εσωτερική ή όταν ο έλεγχος είναι ενεργός και δεν ελέγχεις εσύ
// (ίδιος κανόνας με το authz.deliverable_goes_direct της βάσης).
export const goesToReviewOf = (
  isInternal: boolean,
  internalReview: boolean | null,
  canReview: boolean,
): boolean | null => {
  if (isInternal) return true;
  if (internalReview === null) return null;
  return internalReview && !canReview;
};

// Η Έκδοση με τη μεγαλύτερη αρίθμηση (η βάση τις δίνει νεότερη πρώτη, εδώ δεν το υποθέτουμε).
export const latestOf = (
  detail: Pick<DeliverableDetail, "versions">,
): DeliverableVersion | undefined =>
  [...detail.versions].sort((a, b) => b.number - a.number)[0];

// Οι Εκδόσεις με τη σειρά των καρτελών: v1, v2, ...
export const versionsInOrder = (
  versions: readonly DeliverableVersion[],
): readonly DeliverableVersion[] =>
  [...versions].sort((a, b) => a.number - b.number);

export const hasOpenRequest = (
  detail: Pick<DeliverableDetail, "requests">,
): boolean => detail.requests.some((request) => request.decision === null);

export const isReopened = (detail: DeliverableDetail): boolean =>
  detail.state === "approved" && hasOpenRequest(detail);

// Έξτρα Παραδοτέο (πέρα από την Παροχή): με ή χωρίς χρέωση, όταν έχει αποφασιστεί.
export const extraOf = (charge: Charge): string | null => {
  if (charge === "charged") return "με χρέωση";
  if (charge === "free") return "χωρίς χρέωση";
  return null;
};

export const roundsLabel = (used: number, limit: number | null): string => {
  const rounds = `${used} ${used === 1 ? "γύρος" : "γύροι"}`;
  if (limit === null) return `${rounds} (χωρίς όριο)`;
  return `${rounds} (όριο ${limit})${used > limit ? " · πέρα από το όριο" : ""}`;
};

// Όποιος σχολιάζει χωρίς όνομα ομάδας είναι ο πελάτης (η βάση δίνει όνομα μόνο για Χρήστες της ομάδας).
export const CLIENT_NAME = "Πελάτης";
export const whoOf = (name: string | null): string => name ?? CLIENT_NAME;

// «Τι ζήτησε ο πελάτης»: ανοιχτά αιτήματα και σχόλια του πελάτη από όλες τις Εκδόσεις, νεότερη πρώτη.
export interface ClientAsk {
  id: string;
  source: string;
  who: string;
  when: string;
  text: string;
}

export const OPEN_REQUEST_SOURCE = "αίτημα μετά την έγκριση";

export const clientAsksOf = (
  detail: Pick<DeliverableDetail, "requests" | "versions">,
): readonly ClientAsk[] => {
  const open = detail.requests
    .filter((request) => request.decision === null)
    .map((request) => ({
      id: request.id,
      source: OPEN_REQUEST_SOURCE,
      who: whoOf(request.createdByName),
      when: request.createdAt,
      text: request.body,
    }));
  const comments = [...detail.versions]
    .sort((a, b) => b.number - a.number)
    .flatMap((version) =>
      version.comments
        .filter((comment) => comment.authorName === null && !comment.isInternal)
        .map((comment) => ({
          id: `v${version.number}-${comment.id}`,
          source: `σχόλιο στη v${version.number}`,
          who: CLIENT_NAME,
          when: comment.createdAt,
          text: comment.body,
        })),
    );
  return [...open, ...comments];
};
