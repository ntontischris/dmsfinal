// Module «Παραδοτέα» (H1 ουρά, H2 σελίδα, H3/H4 όψη πελάτη, ενότητα της G2). Έξω φαίνεται μόνο ό,τι εξάγεται εδώ·
// τα actions μένουν μέσα (τα εισάγουν τα components με σχετική διαδρομή).
export type {
  AssigneeCandidate,
  Charge,
  DeliverableCan,
  DeliverableCandidates,
  DeliverableCard,
  DeliverableDetail,
  DeliverableRequest,
  DeliverableState,
  DeliverablesCaps,
  FilmingCandidate,
  KindCandidate,
  QueueView,
} from "./types";
export { QUEUE_VIEWS } from "./types";
export type {
  ClientDeliverableCard,
  ClientDeliverableDetail,
  ClientDeliverablesView,
  ClientPeriodGroup,
  ClientProvision,
} from "./client-types";
export { deliverablesCaps } from "./caps";
export { parseQueueView, queueViewsOf } from "./helpers";
export { queueFilterSchema } from "./schemas";
export { deliverableCardsSchema } from "./view-schema";
export type { ReadResult } from "./read";
export {
  getDeliverable,
  getDeliverableCandidates,
  listDeliverableQueue,
  listPendingCharges,
} from "./queries";
export { getClientDeliverable, listClientDeliverables } from "./client-queries";
export { clientCardsOf, roundsText } from "./client-helpers";
export { ClientDetailView } from "./components/client-detail-view";
export {
  ClientCardList,
  ClientQueueView,
} from "./components/client-queue-view";
export { ChargeDecisionsPanel } from "./components/charge-decisions-panel";
export { DeliverableDetailView } from "./components/deliverable-detail";
export {
  NewDeliverableForm,
  type FromRequest,
} from "./components/new-deliverable-form";
export { ProductionDeliverables } from "./components/production-deliverables";
export { DeliverableRulesForm } from "./components/rules-form";
export { QueueTable } from "./components/queue-table";
export { QueueTabs } from "./components/queue-tabs";
export { getDeliverableRules } from "./queries-rules";
export type { DeliverableRuleKind, DeliverableRules } from "./rules-types";
// Νέα εμφάνιση (Χώροι): οι οθόνες του prototype H1, H2 πάνω στα ίδια δεδομένα.
export { SpacesDeliverables } from "./spaces/h1-screen";
export { SpacesDeliverable } from "./spaces/h2-screen";
export { SpacesNewDeliverable } from "./spaces/h2-new";
// Η όψη πελάτη (H3, H4) στη νέα εμφάνιση.
export { SpacesClientDeliverables } from "./spaces/h3-screen";
export { SpacesClientDeliverable } from "./spaces/h4-screen";
// Η ενότητα Παραδοτέων της G2 και η πρόοδος των καρτών G1, όψη πελάτη.
export { G2ClientDeliverables } from "./spaces/g2-client";
export {
  clientProgressByProduction,
  type ClientProgress,
} from "./spaces/g2-client-model";
export { SpacesDeliverableSettings } from "./spaces/o5-screen";
// Ctrl+K: αναζήτηση εγγραφών.
export { searchDeliverables } from "./queries-search";
