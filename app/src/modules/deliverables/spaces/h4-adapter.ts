import type { ClientDeliverableDetail, ClientVersion } from "../client-types";
import { CLIENT_WORDS } from "./h3-adapter";

// Από τη σελίδα πελάτη της βάσης (client_deliverable_view) στη μορφή του prototype `screens/h3-model.ts` (H4View).

// Η κατάσταση Έκδοσης της βάσης με τις λέξεις του πελάτη (prototype VERSION_LABELS).
const VERSION_WORDS: Readonly<Record<string, string>> = {
  in_review: "σε εργασία",
  returned: "σε εργασία",
  awaiting_client: "περιμένει εσένα",
  approved: "εγκρίθηκε",
  changes_requested: "ζητήθηκαν αλλαγές",
  superseded: "αντικαταστάθηκε",
};

export const versionWordOf = (state: string): string =>
  VERSION_WORDS[state] ?? "σε εργασία";

// Η βάση δίνει τη νεότερη πρώτη· οι καρτέλες του prototype πάνε v1 → vN.
export const versionsInOrder = (
  versions: readonly ClientVersion[],
): readonly ClientVersion[] =>
  [...versions].sort((a, b) => a.number - b.number);

// Η Έκδοση της διεύθυνσης (?v=), αλλιώς η τελευταία.
export const selectedNumberOf = (
  versions: readonly ClientVersion[],
  requested: string | undefined,
): number | undefined => {
  const wanted = Number(requested);
  if (versions.some((v) => v.number === wanted)) return wanted;
  return versions.reduce<number | undefined>(
    (max, v) => (max === undefined || v.number > max ? v.number : max),
    undefined,
  );
};

// «Παραδόθηκε»: εγκρίθηκε και υπάρχει σύνδεσμος τελικών αρχείων.
export const isDeliveredOf = (detail: ClientDeliverableDetail): boolean =>
  detail.state === "approved" && detail.finalFilesUrl !== null;

export const statusWordOf = (detail: ClientDeliverableDetail): string =>
  isDeliveredOf(detail) ? "παραδόθηκε" : CLIENT_WORDS[detail.state];

export interface AnswerNotice {
  title: string;
  lines: readonly string[];
}

// Τι λέμε στον πελάτη μετά την απάντηση (prototype answerNoticeOf), από την κατάσταση που κράτησε η βάση.
export const answerNoticeOf = (
  detail: ClientDeliverableDetail,
): AnswerNotice | null => {
  if (detail.state === "changes_requested")
    return {
      title: "Στάλθηκε το αίτημα αλλαγών",
      lines: [
        "Ενημερώσαμε την ομάδα. Θα σου στείλει νέα Έκδοση εδώ και θα πάρεις email.",
      ],
    };
  if (detail.state !== "approved") return null;
  return isDeliveredOf(detail)
    ? {
        title: "Παραδόθηκε ✓",
        lines: [
          "Τα τελικά αρχεία είναι έτοιμα. Τα κατεβάζεις από το «Λήψη τελικού αρχείου» στην κορυφή.",
        ],
      }
    : {
        title: "Εγκρίθηκε ✓",
        lines: [
          "Τι γίνεται τώρα: η ομάδα ετοιμάζει τα τελικά αρχεία. Θα τα κατεβάσεις από αυτή τη σελίδα.",
          "Αν θέλεις κάτι ακόμα, γράψε το στο «Αλλαγή μετά την έγκριση» πιο κάτω.",
        ],
      };
};

// «Ενέκρινε η/ο Μαρία στις …» κάτω από τα σχόλια· μόνο όταν η βάση ξέρει ποιος και πότε.
export const answerLineOf = (
  version: ClientVersion,
): { by: string; when: string; isApproval: boolean } | null =>
  version.answeredByName && version.answeredAt
    ? {
        by: version.answeredByName,
        when: version.answeredAt,
        isApproval: version.state === "approved",
      }
    : null;

const DAY = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Η μέρα μιας στιγμής (ISO) στην Αθήνα, ως «10/09/2026», όπως το fmtDate του prototype.
export const fmtDay = (iso: string): string => DAY.format(new Date(iso));
