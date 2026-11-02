// Καθαρές συναρτήσεις της D2 στη νέα εμφάνιση (prototype `screens/d2-model.ts`, `d2-action-bar.tsx`), με την πραγματική Συμφωνία.

import { formatDate, formatNumber, provisionsText } from "../helpers";
import type {
  AgreementDetail,
  AgreementLine,
  Deviation,
  KindInfo,
} from "../types";

export interface LossReason {
  id: string;
  label: string;
}

export interface UsedKind {
  id: string;
  unit: string;
}

// Μία γραμμή κάτω από τις ενέργειες: τι σημαίνει η πορεία όπου βρίσκεται η πρόταση.
export const pathHint = (
  a: Pick<AgreementDetail, "state" | "path" | "validUntil" | "can">,
): string | null => {
  if (a.state !== "proposal")
    return a.state === "expired" || a.state === "dissolved"
      ? "Η Συμφωνία έκλεισε: μόνο ανάγνωση."
      : "Η Συμφωνία έχει υπογραφεί και δεν αλλάζει.";
  const validity = formatDate(a.validUntil);
  switch (a.path) {
    case "draft":
      return a.can.edit
        ? "Σε σύνταξη: όσα αλλάζεις φαίνονται αμέσως στις Παρεκκλίσεις και στο περιθώριο."
        : null;
    case "awaiting_approval":
      return a.can.edit
        ? "Αν αλλάξεις την πρόταση, το αίτημα Έγκρισης αποσύρεται."
        : null;
    case "sent":
      return `Οι Σύνδεσμοι είναι ενεργοί ως τις ${validity}. Για αλλαγές: νέα αναθεώρηση.`;
    case "expired":
      return `Η Ισχύς έληξε στις ${validity}. Οι Σύνδεσμοι δεν δουλεύουν· η Ευκαιρία μένει ανοιχτή.`;
    case "lost":
      return "Χάθηκε: μόνο ανάγνωση.";
    default:
      return null;
  }
};

// Τα είδη Παροχής που υπάρχουν στις γραμμές, με τη μονάδα τους (για τα «έχουν ήδη καταναλωθεί»).
export const usedKindsOf = (
  agreement: Pick<AgreementDetail, "lines">,
  kinds: readonly KindInfo[],
): UsedKind[] => {
  const ids = new Set(
    agreement.lines.flatMap((line) => line.provisions.map((p) => p.kindId)),
  );
  return kinds
    .filter((kind) => ids.has(kind.id))
    .map((kind) => ({ id: kind.id, unit: kind.unit }));
};

export const signatoryNameOf = (a: Pick<AgreementDetail, "recipients">) =>
  a.recipients.find((r) => r.isSignatory)?.name ?? "";

// Οι Παρεκκλίσεις μιας γραμμής: η βάση τις κλειδώνει ως «είδος:id γραμμής».
export const lineDeviationsOf = (
  deviations: readonly Deviation[],
  lineId: string,
): Deviation[] => deviations.filter((d) => d.key.endsWith(`:${lineId}`));

// Οι Παροχές είναι ανά μονάδα· η γραμμή τις πολλαπλασιάζει με την ποσότητά της.
export const lineProvisionsText = (
  line: Pick<AgreementLine, "provisions" | "quantity">,
  kinds: readonly KindInfo[],
): string =>
  provisionsText(
    line.provisions.map((p) => ({
      kindId: p.kindId,
      quantity: p.quantity * line.quantity,
    })),
    kinds,
  );

export const hoursText = (
  line: Pick<AgreementLine, "hoursShoot" | "hoursEdit">,
): string =>
  `${line.hoursShoot === null ? "—" : formatNumber(line.hoursShoot)} / ${line.hoursEdit === null ? "—" : formatNumber(line.hoursEdit)}`;

// Σε ποια αναθεώρηση εγκρίθηκαν οι Παρεκκλίσεις: η πιο πρόσφατη εγκεκριμένη.
export const approvedRevisionOf = (
  a: Pick<AgreementDetail, "revisions">,
): number | null => {
  const approved = a.revisions
    .filter((r) => r.approval?.state === "approved")
    .map((r) => r.number);
  return approved.length === 0 ? null : Math.max(...approved);
};

// Μια γραμμή του ποσού της τιμής για το Σύνολο: «/ μήνα» για τη μηνιαία.
export const perPeriodSuffix = (kind: AgreementDetail["kind"]): string =>
  kind === "monthly" ? " / μήνα" : "";
