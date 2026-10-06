import {
  costOfAgreement,
  deviationItemsOf,
  deviationsOf,
  lineTotal,
  pendingApprovals,
  uncoveredDeviations,
  type AgreementRecord,
  type Deviation,
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

// Εργάσιμες (Δευ–Παρ) μετά την ημέρα του αιτήματος, ως και σήμερα.
const workingDaysBetween = (fromIso: string, toIso: string): number => {
  const total = daysBetween(fromIso, toIso);
  return Array.from({ length: Math.max(0, total) }, (_, index) =>
    new Date(Date.parse(fromIso) + (index + 1) * MS_PER_DAY).getUTCDay(),
  ).filter((weekday) => weekday !== 0 && weekday !== 6).length;
};

// Η Έγκριση δένεται με μία αναθεώρηση: τι από τα σημερινά καλύπτει η τελευταία εγκεκριμένη και τι όχι.
const previousApprovalOf = (
  agreement: AgreementRecord,
): ApprovalItem["previousApproval"] => {
  const approved = agreement.revisions
    .slice(0, -1)
    .filter((revision) => revision.approval?.state === "εγκρίθηκε")
    .at(-1);
  if (!approved) return null;
  const covered: readonly Deviation[] =
    approved.approval?.approvedDeviations ?? [];
  const current = deviationItemsOf(agreement);
  const uncovered = uncoveredDeviations(current, covered);
  return {
    revision: approved.number,
    by: approved.approval?.by ?? "—",
    comment: approved.approval?.comment ?? "",
    uncovered: uncovered.map((deviation) => ({
      label: deviation.label,
      isDeeper: covered.some((old) => old.key === deviation.key),
    })),
    covered: current
      .filter((deviation) => !uncovered.includes(deviation))
      .map((deviation) => deviation.label),
  };
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
    workingDays: pending ? workingDaysBetween(pending.when, TODAY) : 0,
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
    previousApproval: previousApprovalOf(agreement),
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
