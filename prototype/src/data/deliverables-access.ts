// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «8 Παραδοτέα», και οι υπολογισμοί της ουράς.
// Πηγές: 01-roles-and-permissions.md (Παραδοτέα: βλέπει, ανεβάζει και στέλνει, ακυρώνει · Ελέγχει Παραδοτέα · ποσά),
// κεφ. 3.5 «Λεπτομέρειες κανόνων: Παραδοτέα», ADR 0011.

import {
  FILMINGS,
  NOW,
  PERSON_OF_ROLE,
  findProduction,
  type Filming,
  type ProductionStub,
} from "@/data/filming";
import {
  findDeliverableDetail,
  type DeliverableDetail,
  type Version,
} from "@/data/deliverables";
import { DELIVERABLES, type DeliverableSummary } from "@/data/productions";
import {
  daysWaiting,
  isInternal,
  stateOf,
  visibleProductions,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";

export interface DeliverableCaps {
  canSee: boolean;
  isScoped: boolean;
  isClient: boolean;
  canWork: boolean;
  canReview: boolean;
  canSeeAmounts: boolean;
  canApprove: boolean;
}

// Ο «Πλήρης» πελάτη έχει «Εγκρίνει Παραδοτέα». «Ελέγχει Παραδοτέα» μόνο ο Ιδιοκτήτης· η Παραγωγή δεν ελέγχει και δεν βλέπει ποσά.
export const deliverableCapsOf = (role: RoleId): DeliverableCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  return {
    canSee: isAdminLike || role === "production" || role === "client",
    isScoped: role === "production",
    isClient: role === "client",
    canWork: isAdminLike || role === "production",
    canReview: role === "owner",
    canSeeAmounts: isAdminLike,
    canApprove: role === "client",
  };
};

export const meOf = (role: RoleId): string => PERSON_OF_ROLE[role] ?? "";

export const productionOf = (
  deliverable: DeliverableSummary,
): ProductionStub | undefined => findProduction(deliverable.productionId);

export const detailOf = (deliverable: DeliverableSummary): DeliverableDetail =>
  findDeliverableDetail(deliverable.id) ?? {
    id: deliverable.id,
    createdAt: NOW.slice(0, 10),
    createdBy: deliverable.assigneeId,
    versions: [],
    requests: [],
    trail: [],
  };

export const findDeliverable = (id: string): DeliverableSummary | undefined =>
  DELIVERABLES.find((d) => d.id === id);

// Ορατά Παραδοτέα: όσα ανήκουν σε Παραγωγές που βλέπει ο ρόλος (Μέλος για την Παραγωγή, δικές του για τον πελάτη).
export const visibleDeliverables = (
  role: RoleId,
): readonly DeliverableSummary[] => {
  const productionIds = new Set(visibleProductions(role).map((p) => p.id));
  return DELIVERABLES.filter((d) => productionIds.has(d.productionId));
};

export const canOpenDeliverable = (
  role: RoleId,
  deliverable: DeliverableSummary,
): boolean => visibleDeliverables(role).some((d) => d.id === deliverable.id);

export const latestVersion = (detail: DeliverableDetail): Version | undefined =>
  detail.versions.at(-1);

// Ο πελάτης δεν βλέπει Εκδόσεις σε εσωτερικό έλεγχο ή που επιστράφηκαν από τον έλεγχο, ούτε εσωτερικά σχόλια.
export const clientVersions = (detail: DeliverableDetail): readonly Version[] =>
  detail.versions
    .filter((v) => v.sentAt)
    .map((v) => ({ ...v, comments: v.comments.filter((c) => !c.isInternal) }));

// Η Εσωτερική Παραγωγή δεν έχει πελάτη: κάθε Έκδοση περνά από έλεγχο και ο Ελεγκτής εγκρίνει.
export const isInternalDeliverable = (
  deliverable: DeliverableSummary,
): boolean => {
  const production = productionOf(deliverable);
  return production ? isInternal(production) : false;
};

export type DeadlineBasis = "από το Γύρισμα" | "από τη δημιουργία";

export interface DeadlineInfo {
  // Χωρίς ημερομηνία όσο το Γύρισμα δεν έχει γίνει.
  date: string | null;
  basis: DeadlineBasis;
  filming?: Filming;
  isLate: boolean;
}

export const deadlineOf = (deliverable: DeliverableSummary): DeadlineInfo => {
  const detail = detailOf(deliverable);
  const filming = FILMINGS.find((f) => f.id === detail.filmingId);
  const waitsFilming = !!filming && filming.state !== "έγινε";
  const date = waitsFilming ? null : deliverable.deadline;
  return {
    date,
    basis: filming ? "από το Γύρισμα" : "από τη δημιουργία",
    filming,
    isLate:
      !!date &&
      deliverable.state === "σε εργασία" &&
      latestVersion(detail)?.state !== "αναμένει εσωτερικό έλεγχο" &&
      date < NOW.slice(0, 10),
  };
};

export interface RoundsInfo {
  used: number;
  limit: number;
  nextIsCharged: boolean;
}

export const roundsOf = (deliverable: DeliverableSummary): RoundsInfo => ({
  ...deliverable.rounds,
  nextIsCharged: deliverable.rounds.used >= deliverable.rounds.limit,
});

// Ανοιχτό Παραδοτέο: όχι ακυρωμένο, σε Παραγωγή που δεν έκλεισε.
const isLive = (deliverable: DeliverableSummary): boolean => {
  const production = productionOf(deliverable);
  return (
    deliverable.state !== "ακυρώθηκε" &&
    !!production &&
    stateOf(production) === "ανοιχτή"
  );
};

export type QueueView = "για μένα" | "προς έλεγχο" | "στον πελάτη";

export const QUEUE_VIEWS: readonly QueueView[] = [
  "για μένα",
  "προς έλεγχο",
  "στον πελάτη",
];

export const queueViewsOf = (role: RoleId): readonly QueueView[] =>
  deliverableCapsOf(role).canReview
    ? QUEUE_VIEWS
    : QUEUE_VIEWS.filter((v) => v !== "προς έλεγχο");

// «Περιμένει εμένα»: σε εργασία και η τελευταία Έκδοση δεν είναι σε έλεγχο (καμία, επιστράφηκε, ή ο πελάτης ζήτησε αλλαγές).
const waitsAssignee = (deliverable: DeliverableSummary): boolean =>
  deliverable.state === "σε εργασία" &&
  latestVersion(detailOf(deliverable))?.state !== "αναμένει εσωτερικό έλεγχο";

const byDeadline = (a: DeliverableSummary, b: DeliverableSummary): number =>
  (deadlineOf(a).date ?? "9999").localeCompare(deadlineOf(b).date ?? "9999");

export const queueOf = (
  role: RoleId,
  view: QueueView,
  isWholeTeam = false,
): readonly DeliverableSummary[] => {
  const live = visibleDeliverables(role).filter(isLive);
  const me = meOf(role);
  const picked =
    view === "για μένα"
      ? live.filter(
          (d) => waitsAssignee(d) && (isWholeTeam || d.assigneeId === me),
        )
      : view === "προς έλεγχο"
        ? live.filter(
            (d) =>
              latestVersion(detailOf(d))?.state === "αναμένει εσωτερικό έλεγχο",
          )
        : live.filter((d) => d.state === "αναμένει πελάτη");
  return view === "στον πελάτη"
    ? [...picked].sort((a, b) => daysWaiting(b) - daysWaiting(a))
    : [...picked].sort(byDeadline);
};

// Εκκρεμεί απόφαση χρέωσης για γύρο πέρα από το όριο: τη βλέπει και την παίρνει μόνο όποιος «Βλέπει ποσά».
export const pendingCharges = (role: RoleId): readonly DeliverableSummary[] =>
  deliverableCapsOf(role).canSeeAmounts
    ? visibleDeliverables(role).filter((d) => {
        const charge = detailOf(d).charge;
        return !!charge && !charge.decided;
      })
    : [];

// «Περιμένουν εσένα» του πελάτη: ό,τι αναμένει την απάντησή του.
export const waitingForClient = (
  role: RoleId,
): readonly DeliverableSummary[] =>
  visibleDeliverables(role).filter((d) => d.state === "αναμένει πελάτη");
