// Module «Συμφωνίες και υπογραφή» (D1, D2, D4, D5, O3 και το πάνελ πρότασης της B4).
// Έξω φαίνεται μόνο ό,τι εξάγεται εδώ· τα actions και τα zod schemas μένουν μέσα (τα εισάγουν τα components με σχετική διαδρομή).
export type {
  AgreementCaps,
  AgreementDefaults,
  AgreementDetail,
  AgreementKind,
  AgreementLine,
  AgreementRow,
  AgreementRowView,
  AgreementState,
  ApprovalItem,
  ApprovalState,
  Bucket,
  BucketFilter,
  Can,
  CatalogueOption,
  ChangeRequest,
  CostBlock,
  Deviation,
  DeviationKind,
  DeviationStatus,
  KindFilter,
  KindInfo,
  Language,
  LineKind,
  LinkInfo,
  LinkStatus,
  Milestone,
  MilestoneTrigger,
  OutboxItem,
  OutboxKind,
  OutboxStatus,
  PeriodRow,
  PeriodState,
  ProposalDocument as ProposalDocumentData,
  ProposalPath,
  ProposalSummary,
  Provision,
  ProvisionText,
  PublicCompany,
  PublicProposal,
  PublicResult,
  Recipient,
  Renewal,
  RevisionEntry,
  RevisionLimit,
  SignatureInfo,
  Totals,
  UnusedProvisions,
} from "./types";
export {
  AUTO_RENEWAL_NOTE,
  BUCKET_LABELS,
  DEVIATION_STATUS_LABELS,
  FORWARD_NOTE,
  KIND_LABELS,
  LINK_STATUS_LABELS,
  MANUAL_DELIVERY_NOTE,
  MILESTONE_LABELS,
  OUTBOX_KIND_LABELS,
  PATH_LABELS,
  RENEWAL_LABELS,
  STATE_LABELS,
  UNUSED_LABELS,
} from "./labels";
export {
  DEAD_LINK_CONTACT,
  DEAD_LINK_LABELS,
  DOC_LABELS,
  LOAD_ERROR_LABEL,
  SIGN_LABELS,
  fillTemplate,
  type DeadLinkKind,
  type DocLabels,
  type SignLabels,
} from "./labels-public";
export {
  activeKinds,
  agreementCaps,
  athensToday,
  bucketOf,
  describeDeviation,
  endOfTerm,
  expiryText,
  filterRows,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonth,
  formatNumber,
  formatPercent,
  matchesBucket,
  milestoneText,
  parseDecimal,
  periodLabel,
  proposalUrl,
  provisionsText,
  sortOptions,
  statusLabel,
  timeText,
  toAgreementRowView,
} from "./helpers";
export { marginOf, priceRange, roundMoney } from "./cost";
export type { ReadResult } from "./read";
export {
  getAgreement,
  getProposalPreview,
  getProposalSummary,
  listAgreements,
  listApprovals,
  listCatalogueOptions,
  listOutbox,
  listProvisionKinds,
} from "./queries-agreements";
export { getPublicProposal } from "./queries-public";
export { getDefaults } from "./queries-settings";
export { ActionForm } from "./components/action-form";
export { ProposalDocument } from "./components/proposal-document";
export { AgreementsTable } from "./components/agreements-table";
export { AgreementHeader } from "./components/agreement-header";
export { AgreementActions } from "./components/agreement-actions";
export { LinesSection } from "./components/lines-section";
export { CostSection } from "./components/cost-section";
export { DeviationsSection } from "./components/deviations-section";
export { TermsSection } from "./components/terms-section";
export { ScheduleSection } from "./components/schedule-section";
export { PeopleSection } from "./components/people-section";
export { OutboxSection } from "./components/outbox-section";
export { HistorySections } from "./components/history-sections";
export { ProposalPreview } from "./components/proposal-preview";
export { ApprovalQueue } from "./components/approval-queue";
export { ProposalPanel } from "./components/proposal-panel";
export { PublicProposalView } from "./components/public-proposal";
export { TermsCard } from "./components/terms-card";
export { PolicyCard } from "./components/policy-card";
export { PricingCard } from "./components/pricing-card";
export { RevisionLimitsCard } from "./components/revision-limits-card";
