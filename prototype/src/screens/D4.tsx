import {
  costOfAgreement,
  deviationsOf,
  lineTotal,
  pendingApprovals,
  type AgreementRecord,
  type Revision,
} from "@/data/agreements";
import { TODAY, findClient, memberName } from "@/data/sales";
import { ApprovalQueue, type ApprovalItem } from "@/screens/d4-queue";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtMoney,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

const MS_PER_DAY = 86_400_000;
const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);

// Η Έγκριση δένεται με μία αναθεώρηση: δείχνουμε την τελευταία εγκεκριμένη πριν από αυτήν που περιμένει.
const previousApprovalOf = (
  revisions: readonly Revision[],
): ApprovalItem["previousApproval"] => {
  const approved = revisions
    .slice(0, -1)
    .filter((revision) => revision.approval?.state === "εγκρίθηκε")
    .at(-1);
  return approved
    ? {
        revision: approved.number,
        by: approved.approval?.by ?? "—",
        comment: approved.approval?.comment ?? "",
      }
    : null;
};

const toItem = (
  agreement: AgreementRecord,
  role: ScreenProps["role"],
): ApprovalItem => {
  const pending = agreement.revisions.at(-1);
  const suffix = agreement.kind === "μηνιαία" ? " / μήνα" : "";
  return {
    id: agreement.id,
    clientName: findClient(agreement.clientId)?.name ?? "—",
    title: agreement.title,
    kind: agreement.kind,
    editorHref: screenHref(role, "D2", { id: agreement.id }),
    owner: memberName(agreement.ownerId),
    revision: pending?.number ?? 1,
    pendingDays: pending ? daysBetween(pending.when, TODAY) : 0,
    deviations: deviationsOf(agreement),
    lines: agreement.lines.map((line) => ({
      id: line.id,
      description: line.description,
      catalog:
        line.catalogPrice === null
          ? null
          : fmtMoney(line.quantity * line.catalogPrice) + suffix,
      price: fmtMoney(lineTotal(line)) + suffix,
      isBelow: line.catalogPrice !== null && line.unitPrice < line.catalogPrice,
    })),
    isLowMargin: costOfAgreement(agreement).isLowMargin,
    previousApproval: previousApprovalOf(agreement.revisions),
  };
};

const RIGHTS_NOTE =
  "Ο Ιδιοκτήτης και η Διαχείριση έχουν το Δικαίωμα «Παρεκκλίνει από τον Κατάλογο», άρα οι δικές τους προτάσεις δεν περνούν από εδώ. Σε εταιρεία ενός ανθρώπου η λίστα μένει άδεια.";

// Προτάσεις προς έγκριση: ουρά όσων έχουν Παρέκκλιση και τη ζήτησαν. Μόνο Ιδ · Δι.
export function D4({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const items =
    state === "empty" ? [] : pendingApprovals().map((a) => toItem(a, role));

  return (
    <>
      <StateSwitcher role={role} code="D4" state={state} />
      {state === "error" ? (
        <ErrorNotice what="οι Προτάσεις προς έγκριση" />
      ) : (
        <>
          <p className="note">{RIGHTS_NOTE}</p>
          {items.length === 0 ? (
            <StateNotice
              kind="empty"
              title="Καμία πρόταση δεν περιμένει Έγκριση."
            />
          ) : (
            <ApprovalQueue key={state} items={items} />
          )}
        </>
      )}
    </>
  );
}
