import { findAgreement } from "@/data/agreements";
import { FILMINGS, OPEN_STATES, type Filming } from "@/data/filming";
import {
  capacityOf,
  clientNameOf,
  filmingCapsOf,
  hoursUntil,
  pendingApprovalFilmings,
  productionOf,
  shootBalance,
  takenAt,
} from "@/data/filming-access";
import { E2Queue, type CancelItem, type PendingItem } from "@/screens/e2-queue";
import { hoursSince, whenLabel } from "@/screens/e1-format";
import {
  StateNotice,
  StateSwitcher,
  ErrorNotice,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

const toPending = (
  filming: Filming,
  role: ScreenProps["role"],
): PendingItem => {
  const balance = shootBalance(filming);
  return {
    id: filming.id,
    filmingHref: screenHref(role, "E3", { id: filming.id }),
    clientName: clientNameOf(filming),
    production: productionOf(filming)?.title ?? "—",
    when: whenLabel(filming),
    hours: filming.hours,
    location: filming.location,
    clientNote: filming.clientNote ?? null,
    bookedBy: filming.createdBy,
    waitingHours: hoursSince(`${filming.createdAt}T00:00`),
    balance: balance
      ? `${balance.periodLabel}: ${balance.left} από ${balance.total} διαθέσιμα μετά από αυτό το Γύρισμα`
      : null,
    taken: takenAt(filming.date, filming.start, filming.hours),
    capacity: capacityOf(filming.date),
  };
};

const toCancel = (filming: Filming, role: ScreenProps["role"]): CancelItem => {
  const terms = findAgreement(productionOf(filming)?.agreementId)?.terms;
  return {
    id: filming.id,
    filmingHref: screenHref(role, "E3", { id: filming.id }),
    clientName: clientNameOf(filming),
    production: productionOf(filming)?.title ?? "—",
    when: whenLabel(filming),
    by: filming.cancelRequest?.by ?? "—",
    reason: filming.cancelRequest?.reason ?? "",
    hoursLeft: Math.round(hoursUntil(filming)),
    limitHours: terms?.filming.cancelHours ?? 0,
    burns: terms?.filming.lateCancelBurns ?? false,
  };
};

const pendingOldestFirst = (): readonly Filming[] =>
  [...pendingApprovalFilmings()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

const cancelRequests = (): readonly Filming[] =>
  FILMINGS.filter((f) => f.cancelRequest && OPEN_STATES.includes(f.state));

// Ουρά «Αναμένουν έγκριση» και αιτήματα ακύρωσης μετά το Όριο. Μόνο Ιδ · Δι.
export function E2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = filmingCapsOf(role);
  const pending =
    state === "empty"
      ? []
      : pendingOldestFirst().map((f) => toPending(f, role));
  const cancels =
    state === "empty" ? [] : cancelRequests().map((f) => toCancel(f, role));

  return (
    <>
      <StateSwitcher role={role} code="E2" state={state} />
      {state === "error" ? (
        <ErrorNotice what="η ουρά «Αναμένουν έγκριση»" />
      ) : !caps.canApprove ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα." />
      ) : pending.length === 0 && cancels.length === 0 ? (
        <>
          <StateNotice kind="empty" title="Τίποτα δεν περιμένει απάντηση.">
            Όταν ένας πελάτης κλείσει Γύρισμα ή ζητήσει ακύρωση μετά το Όριο, θα
            εμφανιστεί εδώ.
          </StateNotice>
        </>
      ) : (
        <E2Queue key={state} role={role} pending={pending} cancels={cancels} />
      )}
    </>
  );
}
