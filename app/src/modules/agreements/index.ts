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
export { IN_PROGRESS_DAYS, isInProgress, plusDays } from "./in-progress";
export {
  LIST_LIMIT as AGREEMENTS_LIST_LIMIT,
  getAgreement,
  getProposalPreview,
  getProposalSummary,
  listAgreements,
  listApprovals,
  listCatalogueOptions,
  listOutbox,
  listProvisionKinds,
} from "./queries-agreements";
export { getSignedFileLink } from "./queries-lifecycle";
export { getSignedAgreementPdf } from "./queries-signed-pdf";
export { getPublicProposal } from "./queries-public";
export { getDefaults } from "./queries-settings";
export { TermsCard } from "./components/terms-card";
export { PolicyCard } from "./components/policy-card";
export { PricingCard } from "./components/pricing-card";
export { RevisionLimitsCard } from "./components/revision-limits-card";
export { SpacesProposalPanel } from "./spaces/b4-proposal";
export { SpacesAgreements } from "./spaces/d1-screen";
export { SpacesAgreement } from "./spaces/d2-screen";
export { SpacesApprovals } from "./spaces/d4-screen";
export { SpacesAgreementsSettings } from "./spaces/o3-screen";
export { SpacesProposalLink } from "./spaces/d5-screen";
// Η όψη του Χρήστη πελάτη («Βλέπει Συμφωνίες»): μόνο ανάγνωση, από τις client_agreements_view / client_agreement_view.
export { SpacesClientAgreements } from "./spaces/d1-client-screen";
export { SpacesClientAgreement } from "./spaces/d2-client-screen";
export { getClientAgreement, listClientAgreements } from "./queries-client";
export type {
  ClientAgreement,
  ClientAgreementCard,
  ClientPeriod,
  ClientProvision,
} from "./client-view-schema";
// Ctrl+K: αναζήτηση εγγραφών.
export { searchAgreements } from "./queries-search";
