// Τύποι του module «Πελάτες και Ευκαιρίες». Οι τιμές των λιστών (Στάδια, Πηγές…) είναι δεδομένα, όχι τύποι.

export type Outcome = "open" | "won" | "lost";
export type ActivityEvent = "created" | "stage_changed" | "assigned" | "lost";
export type FormRouting = "owner" | "person" | "queue";
export type DuplicateReason = "phone" | "email_domain" | "name";
export type ListName = "stages" | "sources" | "loss_reasons" | "activity_kinds";

export interface ListItem {
  id: string;
  code: string | null;
  label: string;
  sort: number;
  isSystem: boolean;
  isRetired: boolean;
}
export interface SalesLists {
  stages: ListItem[];
  sources: ListItem[];
  lossReasons: ListItem[];
  activityKinds: ListItem[];
}

export interface ClientRow {
  id: string;
  name: string;
  city: string;
  managerId: string | null;
  managerName: string | null;
  canOpen: boolean;
  openOpportunities: number | null;
  isPossibleDuplicate: boolean;
}
export interface ClientDetail {
  id: string;
  name: string;
  legalName: string;
  city: string;
  afm: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  managerId: string | null;
  managerName: string | null;
  archivedAt: string | null;
  mergedIntoId: string | null;
  createdAt: string;
}
export interface Opportunity {
  id: string;
  clientId: string;
  clientName: string | null;
  clientManagerId: string | null;
  title: string;
  stageId: string;
  sourceId: string;
  referredBy: string;
  managerId: string | null;
  managerName: string | null;
  outcome: Outcome;
  lossReasonId: string | null;
  nextStep: string;
  nextStepDue: string | null; // YYYY-MM-DD
  followsId: string | null;
  followsTitle: string | null;
  closedAt: string | null;
  createdAt: string;
}
export interface Pipeline {
  open: Opportunity[];
  closed: Opportunity[];
}

export interface ActivityRow {
  id: string;
  opportunityId: string;
  opportunityTitle: string | null;
  occurredAt: string;
  actorName: string | null;
  kindId: string | null;
  event: ActivityEvent | null;
  body: string;
  previousId: string | null;
  subjectId: string | null;
}
// Αντιστοίχιση id → όνομα για να γραφτούν οι αυτόματες Δραστηριότητες (απλά αντικείμενα: περνούν σε client components).
export interface ActivityLookups {
  stages: Readonly<Record<string, string>>;
  kinds: Readonly<Record<string, string>>;
  lossReasons: Readonly<Record<string, string>>;
  users: Readonly<Record<string, string>>;
}

export interface QueueItem {
  opportunityId: string;
  title: string;
  clientId: string;
  clientName: string;
  sourceId: string;
  createdAt: string;
  isNewClient: boolean;
  isPossibleDuplicate: boolean;
}
export interface AccessRequestRow {
  id: string;
  clientId: string;
  clientName: string;
  clientManagerName: string | null;
  requesterId: string;
  requesterName: string;
  topic: string;
  comment: string;
  sourceId: string;
  createdAt: string;
}
export interface AssignableUser {
  userId: string;
  name: string;
}

export interface DuplicateSide {
  id: string;
  name: string;
  legalName: string;
  afm: string | null;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  managerName: string | null;
  opportunities: number;
}
export interface DuplicatePair {
  flagId: string;
  reason: DuplicateReason;
  createdAt: string;
  candidate: DuplicateSide;
  existing: DuplicateSide;
}

export interface SalesSettings {
  formRouting: FormRouting;
  formAssigneeId: string | null;
  updatedAt: string;
}
export type ListUsage = Readonly<Record<string, number>>; // κλειδί: id της τιμής

export interface SalesCaps {
  userId: string | null;
  canViewClients: boolean; // clients.view ή clients.manage
  canManage: boolean; // clients.manage
  manageScope: "all" | "mine" | null;
  canTransfer: boolean; // clients.transfer
  canMerge: boolean; // clients.merge
  canManageSettings: boolean; // settings.manage
}
export type ClientAccess = "all" | "owner" | "granted";
export interface BoardColumn {
  stage: ListItem;
  cards: Opportunity[];
}
export interface PickerClient {
  id: string;
  name: string;
  isMine: boolean;
  managerName: string | null;
}
