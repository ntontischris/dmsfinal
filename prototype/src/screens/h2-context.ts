import { provisionsOf } from "@/data/agreements";
import { PROVISION_KINDS, provisionKind } from "@/data/catalogue";
import { DELIVERABLE_RULES, type DeliverableDetail } from "@/data/deliverables";
import {
  deadlineOf,
  deliverableCapsOf,
  detailOf,
  meOf,
} from "@/data/deliverables-access";
import { personName, type Filming, type ProductionStub } from "@/data/filming";
import { deliverablesOf, type DeliverableSummary } from "@/data/productions";
import {
  agreementOf,
  clientNameOfProduction,
  filmingsOf,
  isInternal,
  membersOf,
  periodOfProduction,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import type { H2Context, Live, PersonOption } from "@/screens/h2-model";
import { screenHref } from "@/screens/shared";

export const peopleOf = (production: ProductionStub): PersonOption[] =>
  membersOf(production).map((m) => ({
    id: m.personId,
    name: personName(m.personId),
  }));

export const contextOf = (
  role: RoleId,
  deliverable: DeliverableSummary,
  production: ProductionStub,
): H2Context => {
  const caps = deliverableCapsOf(role);
  const meId = meOf(role);
  const deadline = deadlineOf(deliverable);
  return {
    caps,
    meId,
    deliverableId: deliverable.id,
    title: deliverable.title,
    kindName: provisionKind(deliverable.kindId).name,
    limit: deliverable.rounds.limit,
    extra: deliverable.extra,
    isInternalProduction: isInternal(production),
    internalReview: DELIVERABLE_RULES.internalReview,
    daysAfterChanges: DELIVERABLE_RULES.daysAfterChanges,
    production: {
      id: production.id,
      title: production.title,
      clientName: clientNameOfProduction(production),
      periodLabel: production.periodLabel ?? "εφάπαξ",
      href: screenHref(role, "G2", { id: production.id }),
    },
    people: peopleOf(production),
    basis: deadline.basis,
    filmingDate: deadline.filming?.date ?? null,
    canDecideRequests: caps.canSeeAmounts || meId === production.ownerId,
    newDeliverableHref: screenHref(role, "H2", { production: production.id }),
  };
};

export const initialLiveOf = (
  deliverable: DeliverableSummary,
  detail: DeliverableDetail,
  isEmpty: boolean,
): Live => ({
  assigneeId: deliverable.assigneeId,
  deadline: deadlineOf(deliverable).date,
  state: deliverable.state,
  versions: isEmpty ? [] : detail.versions,
  finalFiles: isEmpty ? undefined : detail.finalFiles,
  charge: isEmpty ? undefined : detail.charge,
  requests: isEmpty ? [] : detail.requests,
  roundsUsed: deliverable.rounds.used,
  approvedAt: deliverable.approvedAt,
  cancellation: deliverable.cancellation,
  log: isEmpty ? [] : detail.trail.map((t) => ({ ...t })),
});

export const liveOf = (
  deliverable: DeliverableSummary,
  isEmpty: boolean,
): Live => initialLiveOf(deliverable, detailOf(deliverable), isEmpty);

// Τοπικό αντίγραφο του provisionRows του g2-sections: μετρητής Παροχής της Περιόδου.
export interface KindRow {
  kindId: string;
  name: string;
  total: number | null;
  used: number;
}

const countedRows = (
  production: ProductionStub,
  deliverables: readonly DeliverableSummary[],
): readonly {
  kindId: DeliverableSummary["kindId"];
  total: number;
  used: number;
}[] => {
  const period = periodOfProduction(production);
  if (period)
    return period.provisions.map((p) => ({
      kindId: p.kindId,
      total: p.given + p.carried,
      used: p.used,
    }));
  const agreement = agreementOf(production);
  if (!agreement) return [];
  return provisionsOf(agreement).map((p) => ({
    kindId: p.kindId,
    total: p.quantity,
    used: deliverables.filter(
      (d) =>
        d.kindId === p.kindId &&
        !(
          d.state === "ακυρώθηκε" && d.cancellation?.provision === "επιστρέφει"
        ),
    ).length,
  }));
};

export const kindRowsOf = (production: ProductionStub): readonly KindRow[] => {
  if (isInternal(production))
    return PROVISION_KINDS.filter((k) => k.id !== "shoot").map((k) => ({
      kindId: k.id,
      name: k.name,
      total: null,
      used: 0,
    }));
  return countedRows(production, deliverablesOf(production.id))
    .filter((r) => r.kindId !== "shoot")
    .map((r) => ({ ...r, name: provisionKind(r.kindId).name }));
};

export const filmingOptionsOf = (
  production: ProductionStub,
): readonly Filming[] =>
  [...filmingsOf(production)]
    .filter((f) => f.state !== "ακυρώθηκε" && f.state !== "απορρίφθηκε")
    .sort((a, b) => b.date.localeCompare(a.date));
