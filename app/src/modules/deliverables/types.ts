// Τύποι του module «Παραδοτέα» (H1, H2, ενότητα της G2). Τα JSON της βάσης έρχονται σε camelCase, εκτός από το Ίχνος.
// Κανένα ποσό· η Παροχή μετριέται σε πλήθος. Το `null` σημαίνει «δεν δικαιούσαι», όχι μηδέν.

export const DELIVERABLE_STATES = [
  "draft",
  "in_review",
  "returned",
  "awaiting_client",
  "changes_requested",
  "approved",
  "superseded",
  "cancelled",
] as const;
export type DeliverableState = (typeof DELIVERABLE_STATES)[number];

export const VERSION_STATES = [
  "in_review",
  "returned",
  "awaiting_client",
  "approved",
  "changes_requested",
  "superseded",
] as const;
export type VersionState = (typeof VERSION_STATES)[number];

export const CHARGES = ["included", "free", "charged", "pending"] as const;
export type Charge = (typeof CHARGES)[number];

export const CANCEL_OUTCOMES = ["consumed", "returned"] as const;
export type CancelOutcome = (typeof CANCEL_OUTCOMES)[number];

export const QUEUE_VIEWS = ["mine", "review", "client"] as const;
export type QueueView = (typeof QUEUE_VIEWS)[number];

export interface DeliverableCard {
  id: string;
  title: string;
  productionId: string;
  production: string;
  client: string | null; // null = Εσωτερική Παραγωγή
  kind: string;
  kindId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  filmingId: string | null;
  deadline: string | null;
  isLate: boolean;
  state: DeliverableState;
  daysWaiting: number;
  overLimit: boolean;
  linkBroken: boolean;
  versionCount: number;
  roundsUsed: number;
  roundsLimit: number | null;
  charge: Charge;
  chargeReason: string | null;
  approvedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelOutcome: CancelOutcome | null;
}

export interface DeliverableComment {
  id: string;
  body: string;
  atSeconds: number | null;
  isInternal: boolean;
  createdAt: string;
  authorName: string | null;
}

export interface DeliverableVersion {
  number: number;
  url: string;
  host: string;
  state: VersionState;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
  sentAt: string | null;
  answeredAt: string | null;
  answerNote: string | null;
  linkBroken: boolean;
  comments: DeliverableComment[];
}

export interface DeliverableCan {
  addVersion: boolean;
  send: boolean;
  return: boolean;
  approveInternal: boolean;
  cancel: boolean;
  comment: boolean;
  decideCharge: boolean;
  edit: boolean;
}

export interface DeliverableHistoryEntry {
  at: string;
  action: "insert" | "update" | "delete" | "event";
  entity: string;
  actorName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export const REQUEST_DECISIONS = ["round", "charged", "new_deliverable"] as const;
export type RequestDecision = (typeof REQUEST_DECISIONS)[number];

// Αίτημα αλλαγής μετά την έγκριση (H2). Ανοιχτό όσο δεν έχει `decision`.
export interface DeliverableRequest {
  id: string;
  body: string;
  createdAt: string;
  createdByName: string | null;
  decision: RequestDecision | null;
  decidedAt: string | null;
  decidedByName: string | null;
  decisionNote: string | null;
  newDeliverableId: string | null;
}

export interface DeliverableDetail extends DeliverableCard {
  versions: DeliverableVersion[];
  can: DeliverableCan;
  pendingCharge: boolean;
  history: DeliverableHistoryEntry[];
  requests: DeliverableRequest[];
  finalFilesUrl: string | null;
}

export interface KindCandidate {
  id: string;
  label: string;
  unit: string;
  balance: number | null;
}

export interface AssigneeCandidate {
  id: string;
  name: string;
}

export interface FilmingCandidate {
  id: string;
  startsAt: string;
  state: string;
}

export interface DeliverableCandidates {
  kinds: KindCandidate[];
  assignees: AssigneeCandidate[];
  filmings: FilmingCandidate[];
}

// Τι δικαιούται ο θεατής στα Παραδοτέα. Η βάση αποφασίζει ξανά σε κάθε RPC.
export interface DeliverablesCaps {
  canWork: boolean;
  canReview: boolean;
  canQueue: boolean;
  canSeeCharges: boolean;
  canSeeAmounts: boolean;
}
