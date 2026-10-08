// Τύποι του module «Συμφωνίες». Καθρεφτίζουν τα JSON της βάσης (§2.7) σε camelCase. null σε ποσό, ώρες ή κόστος σημαίνει «δεν δικαιούσαι να το δεις», ποτέ μηδέν.

export type AgreementKind = "monthly" | "one_off";
export type AgreementState = "proposal" | "signed" | "active" | "expired" | "dissolved";
export type ProposalPath = "draft" | "awaiting_approval" | "sent" | "expired" | "signed" | "lost";
export type UnusedProvisions = "lost" | "next_period" | "accumulate";
export type Renewal = "new_opportunity" | "auto";
export type MilestoneTrigger = "signature" | "date" | "filming_done" | "delivered";
export type LineKind = "package" | "service" | "free";
export type LinkStatus = "active" | "expired" | "revoked" | "superseded" | "signed" | "closed";
export type ApprovalState = "pending" | "approved" | "rejected" | "withdrawn";
export type DeviationStatus = "new" | "deeper" | "covered";
export type DeviationKind =
  | "free_line" | "price" | "provisions" | "discount_percent" | "discount_months" | "payment_days" | "grace_days"
  | "unused_provisions" | "dissolution_notice" | "dissolution_fee" | "filming_notice" | "cancel_hours"
  | "late_cancel_burns" | "no_show_burns" | "revision_limit" | "advance";
export type OutboxKind = "proposal_link" | "signing_code" | "signed_copy" | "client_invite";
export type OutboxStatus = "pending" | "sent" | "manual" | "cancelled" | "failed";
export type PeriodState = "closed" | "current" | "next";
export type Language = "el" | "en";
export type Bucket = "proposal" | "active" | "closed";
export type BucketFilter = "open" | Bucket | "all";   // D1: «Ανοιχτές» (default) | «Προτάσεις» | «Ενεργές» | «Κλειστές» | «Όλες»
export type KindFilter = "all" | AgreementKind;

// null σε ποσό / ώρες / κόστος σημαίνει «δεν δικαιούσαι να το δεις», ποτέ μηδέν (βλ. §0.8).
export interface AgreementRow {            // D1
  id: string; opportunityId: string; clientId: string; clientName: string; title: string;
  kind: AgreementKind; state: AgreementState; path: ProposalPath; revision: number;
  managerId: string | null; managerName: string | null; validUntil: string; startOn: string | null; endOn: string | null;
  signedAt: string | null; signatoryName: string | null;
  total: number | null; discountPercent: number | null; discountMonths: number | null;
  changeRequestsOpen: number; linksOpened: number; expiresInDays: number | null; isLowMargin: boolean | null; updatedAt: string;
}
export interface Provision { kindId: string; quantity: number; catalogQuantity: number | null }
export interface AgreementLine {
  id: string; position: number; kind: LineKind; itemId: string | null; description: string; descriptionEn: string; unit: string;
  quantity: number; unitPrice: number | null; catalogPrice: number | null; lineTotal: number | null;
  hoursShoot: number | null; hoursEdit: number | null; directCost: number | null; provisions: Provision[];
}
export interface Milestone { id: string; trigger: MilestoneTrigger; percent: number; dueOn: string | null; amount: number | null }
export interface RevisionLimit { kindId: string; label: string; labelEn: string; rounds: number; baseRounds: number | null }
export interface LinkInfo { id: string; status: LinkStatus; isOpened: boolean; openCount: number; firstOpenedAt: string | null }
export interface Recipient { id: string; name: string; email: string; isSignatory: boolean; link: LinkInfo | null }
export interface RevisionEntry {
  number: number; createdAt: string; createdByName: string | null; summary: string; sentAt: string | null;
  approval: { state: ApprovalState; requestedAt: string | null; requestedByName: string | null; decidedAt: string | null; decidedByName: string | null; comment: string } | null;
}
export interface Deviation {
  key: string; kind: DeviationKind; subject: string; depth: number | null; baseValue: string | null; value: string | null; status: DeviationStatus;
}
export interface Totals { price: number; discountedPrice: number; vatRate: number; vat: number; gross: number }
export interface CostBlock {
  hourCost: number | null; hourCostMonth: string | null; estimatedCost: number | null;
  multiplierMin: number; multiplierTarget: number; multiplierMax: number; isLowMargin: boolean; isFrozen: boolean;
}
export interface PeriodRow {
  n: number; starts: string; ends: string; isPartial: boolean; givesProvisions: boolean; isDiscounted: boolean; state: PeriodState; amount: number | null;
}
export interface ChangeRequest { id: string; revision: number; fromName: string; message: string; createdAt: string }
export interface SignatureInfo {
  method: "link" | "outside"; signedName: string; signedOn: string; recordedAt: string; otpDelivery: "manual" | "email" | null;
  documentHash: string; reference: string | null; ip: string | null;
  usedProvisions: { kindId: string; used: number }[] | null; monthInvoiced: boolean | null;
}
export interface Can {
  seeAmounts: boolean; seeCost: boolean; manageCost: boolean; edit: boolean; editPrices: boolean; editCost: boolean; send: boolean;
  requestApproval: boolean; withdrawApproval: boolean; decide: boolean; newRevision: boolean; extend: boolean; closeLost: boolean;
  manageLinks: boolean; signOutside: boolean;
}
export interface AgreementDetail {          // D2: agreement_view, camelCase
  id: string; kind: AgreementKind; title: string; language: Language; state: AgreementState; path: ProposalPath; revision: number;
  validUntil: string; startOn: string | null; endOn: string | null; durationMonths: number | null; signedAt: string | null; updatedAt: string;
  opportunity: { id: string; title: string; outcome: "open" | "won" | "lost"; managerId: string | null; managerName: string | null };
  client: { id: string; name: string; contactName: string; contactEmail: string };
  terms: { paymentDays: number; unusedProvisions: UnusedProvisions; graceDays: number; renewal: Renewal | null; dissolutionNoticeDays: number;
           filmingNoticeHours: number; filmingCancelHours: number; lateCancelBurns: boolean; noShowBurns: boolean };
  moneyTerms: { discountPercent: number; discountMonths: number; dissolutionFee: number; vatRate: number } | null;
  baseline: { paymentDays: number; unusedProvisions: UnusedProvisions; graceDays: number; dissolutionNoticeDays: number; dissolutionFee: number | null;
              filmingNoticeHours: number; filmingCancelHours: number; lateCancelBurns: boolean; noShowBurns: boolean;
              standardDiscountPercent: number; standardDiscountMonths: number; advancePercent: number } | null;
  lines: AgreementLine[]; milestones: Milestone[]; milestonesTotal: number; revisionLimits: RevisionLimit[];
  recipients: Recipient[]; revisions: RevisionEntry[]; deviations: Deviation[]; needsApproval: boolean;
  totals: Totals | null; cost: CostBlock | null; periods: PeriodRow[]; changeRequests: ChangeRequest[]; signature: SignatureInfo | null;
  document: { revision: number; hash: string; createdAt: string } | null;
  outboxPending: number; emailSenderConnected: boolean; proposalValidityDays: number; can: Can;
}
export interface ProposalSummary {          // B4: agreement_for_opportunity
  agreementId: string; kind: AgreementKind; title: string; state: AgreementState; path: ProposalPath; revision: number; validUntil: string;
  signedAt: string | null; signatoryName: string | null; total: number | null; linksTotal: number; linksOpened: number;
  changeRequestsOpen: number; approvalPendingDays: number | null; needsApproval: boolean; deviationCount: number; hasLines: boolean;
  outboxPending: number; canDraft: boolean; canDeviate: boolean;
}
export interface ApprovalItem {             // D4: agreement_approvals_view
  agreementId: string; opportunityId: string; clientName: string; title: string; kind: AgreementKind; revision: number;
  managerName: string | null; requestedAt: string; requestedByName: string | null; pendingDays: number; workingDays: number; isReminderDue: boolean;
  total: number | null; isLowMargin: boolean | null; deviations: Deviation[];
  lines: { description: string; quantity: number; catalogPrice: number | null; unitPrice: number | null; isFree: boolean; isBelow: boolean }[];
  previous: { revision: number; decidedByName: string | null; decidedAt: string | null; comment: string } | null;
}
export interface OutboxItem {
  id: string; kind: OutboxKind; toName: string; toEmail: string; status: OutboxStatus; createdAt: string; handledAt: string | null;
  linkPath: string | null; code: string | null; codeExpiresAt: string | null;
}
export interface CatalogueOption { itemId: string; kind: "package" | "service"; billing: AgreementKind | null; name: string; unit: string; price: number | null; provisions: { kindId: string; quantity: number }[] }
export interface AgreementDefaults {         // O3: agreements_defaults_view
  proposalValidityDays: number; standardDiscountPercent: number; standardDiscountMonths: number; advancePercent: number;
  paymentDaysMonthly: number; paymentDaysOneOff: number; unusedProvisions: UnusedProvisions; graceDays: number; durationMonths: number;
  renewal: Renewal; dissolutionNoticeDays: number; dissolutionFee: number | null; filmingNoticeHours: number; filmingCancelHours: number;
  lateCancelBurns: boolean; noShowBurns: boolean; emailSenderConnected: boolean; openProposals: number; liveAgreements: number; updatedAt: string;
}
export interface KindInfo { id: string; label: string; labelEn: string; unit: string; unitEn: string; sort: number; isRetired: boolean; revisionLimit: number | null }

// Το έγγραφο του πελάτη (§2.7). Καμία ώρα, κόστος, Παρέκκλιση.
export interface ProvisionText { label: string; labelEn: string; unit: string; unitEn: string; quantity: number }
export interface ProposalDocument {
  revision: number; language: Language; title: string; kind: AgreementKind; validUntil: string; startOn: string | null; durationMonths: number | null;
  company: { legalName: string; tradeName: string; taxId: string; taxOffice: string; gemi: string; address: string; phone: string; email: string; signatoryName: string; signatoryTitle: string };
  client: { name: string; legalName: string; afm: string | null; city: string };
  lines: { description: string; descriptionEn: string; unit: string; quantity: number; unitPrice: number; lineTotal: number; provisions: ProvisionText[] }[];
  provisionTotals: ProvisionText[];
  totals: { net: number; discountPercent: number; discountMonths: number; discountedNet: number; vatRate: number; vat: number; gross: number; discountedVat: number; discountedGross: number };
  terms: { paymentDays: number; unusedProvisions: UnusedProvisions; graceDays: number; renewal: Renewal | null; dissolutionNoticeDays: number; dissolutionFee: number;
           filmingNoticeHours: number; filmingCancelHours: number; lateCancelBurns: boolean; noShowBurns: boolean; revisionLimits: { label: string; labelEn: string; rounds: number }[] };
  milestones: { trigger: MilestoneTrigger; percent: number; dueOn: string | null; amount: number }[];
}
export type PublicProposal =                 // D5: agreement_public_view
  | { status: "unknown" }
  | { status: "expired"; language: Language; managerName: string | null; company: PublicCompany; validUntil: string }
  | { status: "signed"; language: Language; managerName: string | null; company: PublicCompany; signedAt: string | null }
  | { status: "revoked" | "superseded" | "closed"; language: Language; managerName: string | null; company: PublicCompany }
  | { status: "active"; language: Language; managerName: string | null; company: PublicCompany; document: ProposalDocument; validUntil: string;
      canSign: boolean; signatoryName: string | null; viewerName: string; maskedEmail: string; codeChannel: "manual" | "email" };
export interface PublicCompany { name: string; email: string; phone: string }
export type PublicResult =                   // αποτέλεσμα των δημόσιων ενεργειών (§4.8): ποτέ exception, πάντα status
  | { status: "sent"; channel: "manual" | "email"; maskedEmail: string }
  | { status: "signed"; signedAt: string | null }
  | { status: "ok" | "declined" }
  | { status: "wrong_code"; attemptsLeft: number }
  | { status: "rate_limited"; retryAfter: number | null }
  | { status: "locked" | "code_expired" | "invalid_name" | "not_accepted" | "invalid_message" | "not_signatory" | "unknown" | "error" }
  | { status: LinkStatus };
export interface AgreementCaps {              // από τα Δικαιώματα, μόνο για να κρύβει κουμπιά
  canView: boolean; canDraft: boolean; canDeviate: boolean; canSeeAmounts: boolean; canSeeCost: boolean; canManageCost: boolean; canManageSettings: boolean;
}
export interface AgreementRowView {           // γραμμή της D1 έτοιμη για εμφάνιση (περνά σε client component)
  id: string; href: string; clientName: string; clientHref: string; title: string; kindLabel: string; statusLabel: string; bucket: Bucket;
  amount: string | null; discountNote: string | null; timeText: string; expiryText: string | null; managerName: string | null;
  isAttention: boolean; attentionLabel: string | null; hasChangeRequests: boolean; isLowMargin: boolean;
}
