// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «7 Παραγωγές», και οι υπολογισμοί πάνω στις Παραγωγές.
// Πηγές: 01-roles-and-permissions.md (Παραγωγές: βλέπει, διαχειρίζεται, παραδίδει χειροκίνητα · ποσά · κόστος),
// κεφ. 3.5 «Λεπτομέρειες κανόνων: Παραγωγή», κεφ. 3.3 «Το μοντέλο κόστους», ADR 0017.

import {
  agreementTotal,
  findAgreement,
  periodAmount,
  type AgreementPeriod,
  type AgreementRecord,
} from "@/data/agreements";
import { COST_SETTINGS, hourCost } from "@/data/catalogue";
import {
  FILMINGS,
  NOW,
  OPEN_STATES,
  PERSON_OF_ROLE,
  PRODUCTIONS,
  type Filming,
  type ProductionStub,
} from "@/data/filming";
import {
  DELIVERABLES,
  HOUR_COST_BY_MONTH,
  TASKS,
  deliverablesOf,
  findProductionRecord,
  tasksOf,
  type DeliverableSummary,
  type ProductionRecord,
  type ProductionState,
} from "@/data/productions";
import type { RoleId } from "@/data/roles";
import { KYPSELI_ID, findClient } from "@/data/sales";

export interface ProductionCaps {
  canSee: boolean;
  isScoped: boolean;
  isClient: boolean;
  canManage: boolean;
  canCreateInternal: boolean;
  canCancel: boolean;
  canSeeAmounts: boolean;
  canSeeCost: boolean;
  canManageCost: boolean;
}

export const productionCapsOf = (role: RoleId): ProductionCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  return {
    canSee: isAdminLike || role === "production" || role === "client",
    isScoped: role === "production",
    isClient: role === "client",
    canManage: isAdminLike || role === "production",
    canCreateInternal: isAdminLike,
    canCancel: isAdminLike,
    canSeeAmounts: isAdminLike,
    canSeeCost: isAdminLike,
    canManageCost: role === "owner",
  };
};

export const isInternal = (production: ProductionStub): boolean =>
  production.clientId === "";

export const recordOf = (production: ProductionStub): ProductionRecord =>
  findProductionRecord(production.id) ?? {
    id: production.id,
    state: "ανοιχτή",
    createdAt: NOW.slice(0, 10),
    extras: [],
    hours: { shoot: null, shootConfirmed: false, edit: null, directCost: null },
    trail: [],
  };

export const stateOf = (production: ProductionStub): ProductionState =>
  recordOf(production).state;

export const clientNameOfProduction = (production: ProductionStub): string =>
  isInternal(production)
    ? "Εσωτερική"
    : (findClient(production.clientId)?.name ?? "—");

// «Με αφορά» για την Παραγωγή: Μέλος της Παραγωγής (ο Υπεύθυνος είναι πάντα Μέλος).
const isMember = (role: RoleId, production: ProductionStub): boolean =>
  production.memberIds.includes(PERSON_OF_ROLE[role] ?? "");

// Ο πελάτης βλέπει τις Παραγωγές του, όχι τις Εσωτερικές.
export const visibleProductions = (role: RoleId): readonly ProductionStub[] => {
  const caps = productionCapsOf(role);
  if (!caps.canSee) return [];
  if (caps.isClient)
    return PRODUCTIONS.filter((p) => p.clientId === KYPSELI_ID);
  return caps.isScoped
    ? PRODUCTIONS.filter((p) => isMember(role, p))
    : PRODUCTIONS;
};

export const canOpenProduction = (
  role: RoleId,
  production: ProductionStub,
): boolean => visibleProductions(role).some((p) => p.id === production.id);

// Μέλη και πώς έγιναν Μέλη: Υπεύθυνος, από ανάθεση (εργασία, Παραδοτέο, Συνεργείο) ή με το χέρι.
export type MemberReason = "Υπεύθυνος" | "από ανάθεση" | "με το χέρι";

export interface ProductionMember {
  personId: string;
  reason: MemberReason;
  openAssignments: number;
}

export const filmingsOf = (production: ProductionStub): readonly Filming[] =>
  FILMINGS.filter((filming) => filming.productionId === production.id);

const openAssignmentsOf = (
  production: ProductionStub,
  personId: string,
): number =>
  tasksOf(production.id).filter((t) => t.assigneeId === personId && !t.doneAt)
    .length +
  deliverablesOf(production.id).filter(
    (d) =>
      d.assigneeId === personId &&
      (d.state === "σε εργασία" || d.state === "αναμένει πελάτη"),
  ).length +
  filmingsOf(production).filter(
    (f) =>
      OPEN_STATES.includes(f.state) &&
      f.crew.some((slot) => slot.personId === personId),
  ).length;

const hasAnyAssignment = (
  production: ProductionStub,
  personId: string,
): boolean =>
  TASKS.some(
    (t) => t.productionId === production.id && t.assigneeId === personId,
  ) ||
  DELIVERABLES.some(
    (d) => d.productionId === production.id && d.assigneeId === personId,
  ) ||
  filmingsOf(production).some((f) =>
    f.crew.some((slot) => slot.personId === personId),
  );

export const membersOf = (
  production: ProductionStub,
): readonly ProductionMember[] =>
  production.memberIds.map((personId) => ({
    personId,
    reason:
      personId === production.ownerId
        ? "Υπεύθυνος"
        : hasAnyAssignment(production, personId)
          ? "από ανάθεση"
          : "με το χέρι",
    openAssignments: openAssignmentsOf(production, personId),
  }));

// Περίοδος, Συμφωνία, Παροχές.
export const agreementOf = (
  production: ProductionStub,
): AgreementRecord | undefined => findAgreement(production.agreementId);

export const periodOfProduction = (
  production: ProductionStub,
): AgreementPeriod | undefined =>
  agreementOf(production)?.periods.find(
    (period) => period.label === production.periodLabel,
  );

// Καθυστέρηση: μόνο όταν οφείλεται σε εμάς. «Αναμένει πελάτη» δεν αργεί ποτέ.
export const isLate = (deliverable: DeliverableSummary): boolean =>
  deliverable.state === "σε εργασία" && deliverable.deadline < NOW.slice(0, 10);

export const daysWaiting = (deliverable: DeliverableSummary): number =>
  deliverable.state === "αναμένει πελάτη" && deliverable.latest?.sentAt
    ? Math.floor(
        (Date.parse(NOW) - Date.parse(deliverable.latest.sentAt)) / 86_400_000,
      )
    : 0;

export interface DeliverableProgress {
  total: number;
  approved: number;
  waitingClient: number;
  inWork: number;
  inReview: number;
  cancelled: number;
  late: number;
}

export const progressOf = (production: ProductionStub): DeliverableProgress => {
  const all = deliverablesOf(production.id);
  const live = all.filter((d) => d.state !== "ακυρώθηκε");
  return {
    total: live.length,
    approved: live.filter((d) => d.state === "εγκρίθηκε").length,
    waitingClient: live.filter((d) => d.state === "αναμένει πελάτη").length,
    inWork: live.filter((d) => d.state === "σε εργασία").length,
    inReview: live.filter((d) => d.latest?.inReview).length,
    cancelled: all.length - live.length,
    late: live.filter(isLate).length,
  };
};

// Τι λείπει για να γίνει παραδομένη μόνη της: όλα τα μη ακυρωμένα Παραδοτέα εγκεκριμένα (τουλάχιστον ένα)
// και κανένα ανοιχτό Γύρισμα. Οι ανοιχτές εργασίες δεν εμποδίζουν.
export const deliveryBlockers = (
  production: ProductionStub,
): readonly string[] => {
  const progress = progressOf(production);
  const openFilmings = filmingsOf(production).filter((f) =>
    OPEN_STATES.includes(f.state),
  ).length;
  return [
    ...(progress.total === 0 ? ["δεν υπάρχει ακόμα Παραδοτέο"] : []),
    ...(progress.total > progress.approved
      ? [`${progress.total - progress.approved} Παραδοτέα δεν έχουν εγκριθεί`]
      : []),
    ...(openFilmings > 0 ? [`${openFilmings} ανοιχτά Γυρίσματα`] : []),
  ];
};

// Ανοιχτή Παραγωγή ακυρώνεται μόνο όταν δεν έχει δουλειά που έγινε.
export const canBeCancelled = (production: ProductionStub): boolean =>
  stateOf(production) === "ανοιχτή" &&
  !deliverablesOf(production.id).some((d) => d.state === "εγκρίθηκε") &&
  !filmingsOf(production).some((f) => f.state === "έγινε");

// ── Κόστος, ώρες, περιθώριο (μόνο για όσους βλέπουν κόστος) ──

// Ο μήνας της Παραγωγής: της Περιόδου στη μηνιαία, της παράδοσης στην εφάπαξ και στην Εσωτερική.
export const monthOf = (production: ProductionStub): string => {
  const period = periodOfProduction(production);
  if (period) return period.starts.slice(0, 7);
  const record = recordOf(production);
  return (record.delivery?.when ?? NOW).slice(0, 7);
};

export const hourCostOfMonth = (month: string): number =>
  HOUR_COST_BY_MONTH[month] ?? hourCost();

export interface Hours {
  shoot: number;
  edit: number;
}

const sumHours = (a: Hours, b: Hours): Hours => ({
  shoot: a.shoot + b.shoot,
  edit: a.edit + b.edit,
});

// Τιμή της Παραγωγής: της Περιόδου (μετά την έκπτωση πρώτων μηνών, αναλογική στη σπασμένη) ή όλης της εφάπαξ,
// συν τα Τιμολογητέα έξτρα της. Η Εσωτερική δεν έχει τιμή.
export const priceOf = (production: ProductionStub): number | null => {
  const agreement = agreementOf(production);
  if (!agreement) return null;
  const period = periodOfProduction(production);
  const base = period
    ? periodAmount(agreement, period)
    : agreementTotal(agreement);
  return base + recordOf(production).extras.reduce((s, e) => s + e.amount, 0);
};

export interface Estimate {
  hours: Hours;
  hourCost: number;
  directCost: number;
  cost: number;
}

// Εκτίμηση: το στιγμιότυπο της υπογραφής (ώρες γραμμών ανά Περίοδο, Κόστος ώρας της υπογραφής) συν τις ώρες των έξτρα.
// Στη σπασμένη πρώτη Περίοδο οι ώρες είναι ολόκληρες, όπως και οι Παροχές της.
export const estimateOf = (production: ProductionStub): Estimate | null => {
  const record = recordOf(production);
  const agreement = agreementOf(production);
  const extraHours = record.extras.reduce<Hours>(
    (sum, extra) => sumHours(sum, extra.hours),
    { shoot: 0, edit: 0 },
  );
  if (!agreement) {
    if (!record.internalEstimate) return null;
    const rate = hourCostOfMonth(monthOf(production));
    const hours = record.internalEstimate;
    return {
      hours,
      hourCost: rate,
      directCost: 0,
      cost: (hours.shoot + hours.edit) * rate,
    };
  }
  const lineHours = agreement.lines.reduce<Hours>(
    (sum, line) => sumHours(sum, line.hours),
    { shoot: 0, edit: 0 },
  );
  const hours = sumHours(lineHours, extraHours);
  const rate = agreement.start?.startsWith("2025")
    ? hourCostOfMonth("2025-06")
    : hourCost();
  const directCost = agreement.lines.reduce(
    (s, line) => s + line.directCost,
    0,
  );
  return {
    hours,
    hourCost: rate,
    directCost,
    cost: (hours.shoot + hours.edit) * rate + directCost,
  };
};

// Ώρες γυρίσματος που προτείνει το σύστημα: για κάθε Γύρισμα «έγινε», διάρκεια × άτομα Συνεργείου που επιβεβαίωσαν.
export const suggestedShootHours = (production: ProductionStub): number =>
  filmingsOf(production)
    .filter((f) => f.state === "έγινε")
    .reduce(
      (sum, f) =>
        sum +
        (f.outcome?.actualHours ?? f.hours) *
          Math.max(
            1,
            f.crew.filter((slot) => slot.response === "επιβεβαιώνω").length,
          ),
      0,
    );

// Πλήρεις ώρες = γύρισμα επιβεβαιωμένο και μοντάζ γραμμένο. Μισές ώρες = «χωρίς πραγματικές ώρες».
export const hasActualHours = (production: ProductionStub): boolean => {
  const { hours } = recordOf(production);
  return hours.shootConfirmed && hours.shoot !== null && hours.edit !== null;
};

export interface Actual {
  hours: Hours;
  hourCost: number;
  directCost: number;
  cost: number;
}

export const actualOf = (production: ProductionStub): Actual | null => {
  if (!hasActualHours(production)) return null;
  const { hours } = recordOf(production);
  const rate = hourCostOfMonth(monthOf(production));
  const estimate = estimateOf(production);
  const directCost = hours.directCost ?? estimate?.directCost ?? 0;
  const actualHours = { shoot: hours.shoot ?? 0, edit: hours.edit ?? 0 };
  return {
    hours: actualHours,
    hourCost: rate,
    directCost,
    cost: (actualHours.shoot + actualHours.edit) * rate + directCost,
  };
};

export interface Overrun {
  hoursOver: boolean;
  belowMinimum: boolean;
  hoursPercent: number;
}

// Υπέρβαση κόστους: ακολουθεί τα νούμερα. Ανάβει αν οι ώρες ξεπερνούν την εκτίμηση πάνω από το όριο,
// ή αν η τιμή είναι κάτω από πραγματικό κόστος × μικρότερο πολλαπλασιαστή. Σβήνει αν μια διόρθωση το αναιρέσει.
export const overrunOf = (production: ProductionStub): Overrun | null => {
  const actual = actualOf(production);
  const estimate = estimateOf(production);
  if (!actual || !estimate) return null;
  const estimated = estimate.hours.shoot + estimate.hours.edit;
  const real = actual.hours.shoot + actual.hours.edit;
  const hoursPercent = estimated > 0 ? (real - estimated) / estimated : 0;
  const price = priceOf(production);
  return {
    hoursOver: hoursPercent * 100 > COST_SETTINGS.overrunPercent,
    belowMinimum:
      price !== null && price < actual.cost * COST_SETTINGS.multipliers.min,
    hoursPercent,
  };
};

export const isOverrun = (production: ProductionStub): boolean => {
  const overrun = overrunOf(production);
  return !!overrun && (overrun.hoursOver || overrun.belowMinimum);
};

// Παραδομένη χωρίς πλήρεις ώρες: θέλει Πραγματικές ώρες (Γεγονός 41).
export const needsHours = (production: ProductionStub): boolean =>
  stateOf(production) === "παραδομένη" && !hasActualHours(production);
