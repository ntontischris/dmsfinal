// Module «Πελάτες και Ευκαιρίες» (κεφ. 2, ADR 0009): Πελάτες (B1, B2), Pipeline (B3, B4), «Χωρίς υπεύθυνο» (B5),
// Πιθανά διπλά (B6) και Ρυθμίσεις › Πωλήσεις (O2). Έξω φαίνεται μόνο ό,τι εξάγεται εδώ·
// τα actions και τα zod schemas μένουν μέσα (τα εισάγουν τα components με σχετική διαδρομή).
export type {
  AccessRequestRow,
  ActivityEvent,
  ActivityLookups,
  ActivityRow,
  AssignableUser,
  BoardColumn,
  ClientAccess,
  ClientDetail,
  ClientOverview,
  ClientProvision,
  ClientRow,
  ClientStatus,
  DuplicatePair,
  DuplicateReason,
  DuplicateSide,
  FormRouting,
  ListItem,
  ListName,
  ListUsage,
  Opportunity,
  Outcome,
  Pipeline,
  PickerClient,
  QueueItem,
  SalesCaps,
  SalesLists,
  SalesSettings,
} from "./types";
export {
  CLIENT_STATUS_LABEL,
  DUPLICATE_REASON_LABELS,
  FORM_ROUTING_OWNER_LABEL,
  FORM_ROUTING_QUEUE_LABEL,
  LIST_LABELS,
  NO_MANAGER_LABEL,
  OUTCOME_LABELS,
} from "./labels";
export {
  athensToday,
  clientAccess,
  daysOverdue,
  describeActivity,
  formatDate,
  formatDateTime,
  groupByStage,
  isForgotten,
  nextSort,
  parseRoutingValue,
  routingValue,
  salesCaps,
  takenMessage,
  toPickerClient,
} from "./helpers";
export type { ReadResult } from "./read";
export {
  getClient,
  getClientCard,
  listClientActivities,
  listClientOpportunities,
  listClients,
} from "./queries-clients";
export { listClientOverviews } from "./queries-overview";
export {
  getOpportunity,
  listOpportunityActivities,
  listPipeline,
} from "./queries-opportunities";
export {
  listAccessRequests,
  listAssignableUsers,
  listDuplicatePairs,
  listQueue,
} from "./queries-queue";
export { getActivityLookups, listSalesLists } from "./queries-lists";
export { getSalesSettings, listListUsage } from "./queries-settings";
export { ActionForm } from "./components/action-form";
export { ActivityList } from "./components/activity-list";
export { OpportunityStatus } from "./components/opportunity-status";
export { ClientsTable } from "./components/clients-table";
export { ClientsSearch } from "./components/clients-search";
export { NewOpportunity } from "./components/new-opportunity";
export { AccessRequestForm } from "./components/access-request-form";
export { ClientInspector } from "./components/client-inspector";
export { EditClientForm } from "./components/edit-client-form";
export { TransferClientForm } from "./components/transfer-client-form";
export { ClientOpportunities } from "./components/client-opportunities";
export { DuplicatePairs } from "./components/duplicate-pairs";
export { PipelineBoard } from "./components/pipeline-board";
export { OpportunityPanel } from "./components/opportunity-panel";
export { LogActivityForm } from "./components/log-activity-form";
export { CloseLostForm } from "./components/close-lost-form";
export { FollowUpForm } from "./components/follow-up-form";
export { UnassignedQueue } from "./components/unassigned-queue";
export { AccessRequests } from "./components/access-requests";
export { SalesRoutingCard } from "./components/sales-routing-card";
export { ListEditor } from "./components/list-editor";
export { StagesEditor } from "./components/stages-editor";
export { SpacesClients } from "./spaces/b1-screen";
export { parseB1Filters } from "./spaces/b1-filters";
export { SpacesClient } from "./spaces/b2-screen";
export { SpacesOpportunity } from "./spaces/b4-screen";
export { SpacesPipeline } from "./spaces/b3-screen";
export { SpacesUnassigned } from "./spaces/b5-screen";
export { SpacesDuplicates } from "./spaces/b6-screen";
export { SpacesSalesSettings } from "./spaces/o2-screen";
// Ctrl+K: αναζήτηση εγγραφών.
export { searchClients } from "./queries-search";
