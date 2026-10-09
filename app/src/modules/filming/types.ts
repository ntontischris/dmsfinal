// Τύποι του module «Γυρίσματα» (E1–E4, E6, E7, Ρυθμίσεις, F2 Δεσμεύσεις, G2 λίστα). Τα JSON της βάσης έρχονται camelCase·
// εδώ ό,τι γυρνά η βάση, χωρίς ποσά: οι Παροχές μετριούνται σε πλήθος ή ώρες.

export const FILMING_STATES = [
  "pending",
  "scheduled",
  "done",
  "no_show",
  "cancelled",
  "rejected",
] as const;
export type FilmingState = (typeof FILMING_STATES)[number];

export const FILMING_TABS = [
  "open",
  "pending",
  "needs_outcome",
  "closed",
  "all",
] as const;
export type FilmingTab = (typeof FILMING_TABS)[number];

export const CREW_RESPONSES = ["pending", "confirmed", "declined"] as const;
export type CrewResponse = (typeof CREW_RESPONSES)[number];

export const NO_ANSWER_ACTIONS = ["none", "approve", "reject"] as const;
export type NoAnswerAction = (typeof NO_ANSWER_ACTIONS)[number];

export const EQUIPMENT_CONFLICT_MODES = ["warn", "block"] as const;
export type EquipmentConflictMode = (typeof EQUIPMENT_CONFLICT_MODES)[number];

export const SHEET_SENDING_MODES = ["manual", "auto"] as const;
export type SheetSendingMode = (typeof SHEET_SENDING_MODES)[number];

export const DONE_MARKING_MODES = ["manual", "auto"] as const;
export type DoneMarkingMode = (typeof DONE_MARKING_MODES)[number];

export interface NamedRef {
  id: string;
  name: string;
}

export interface NamedProduction {
  id: string;
  title: string;
}

export interface FilmingSignals {
  equipmentConflict: boolean;
  isExtra: boolean;
  cancelRequest: boolean;
  crewDeclined: boolean;
}

// Μία γραμμή της λίστας (E1).
export interface FilmingRow {
  id: string;
  startsAt: string;
  hours: number;
  state: FilmingState;
  client: NamedRef | null;
  production: NamedProduction;
  crew: { confirmed: number; total: number } | null;
  signals: FilmingSignals;
}

export interface PendingEntry {
  id: string;
  startsAt: string;
  hours: number;
  createdAt: string;
  waitingHours: number;
  waitingLong: boolean;
  client: NamedRef | null;
  production: NamedProduction;
  provision: ProvisionBalance | null;
}

export interface CancelRequestEntry {
  id: string;
  startsAt: string;
  hours: number;
  requestedAt: string;
  reason: string;
  client: NamedRef | null;
  production: NamedProduction;
  willBurn: boolean;
}

export interface FilmingQueue {
  pending: PendingEntry[];
  cancelRequests: CancelRequestEntry[];
}

export type ProvisionMeasure = "per_filming" | "per_hour" | "per_day";

export interface ProvisionKind {
  id: string;
  label: string;
  measure: ProvisionMeasure;
}

// Υπόλοιπο Παροχής της Περιόδου (ή της εφάπαξ) για ένα είδος. Πλήθος ή ώρες, όχι ποσά.
export interface ProvisionBalance {
  given: number;
  carried: number;
  used: number;
  reserved: number;
  balance: number;
  kind: ProvisionKind;
}

export interface CrewMember {
  userId: string;
  name: string;
  response: CrewResponse;
  reason: string | null;
  respondedAt: string | null;
}

export interface EquipmentLine {
  itemId: string;
  name: string;
  status: string;
  conflict: boolean;
}

export interface FilmingHistoryEntry {
  at: string;
  action: "insert" | "update" | "delete" | "event";
  event: string | null;
  actorName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface FilmingViewerCan {
  approve: boolean;
  reject: boolean;
  cancel: boolean;
  reschedule: boolean;
  markDone: boolean;
  markNoShow: boolean;
  undo: boolean;
  crew: boolean;
  equipment: boolean;
  decideCancel: boolean;
  clientCancel: boolean;
  requestCancel: boolean;
}

export interface FilmingPeriod {
  n: number;
  starts: string;
  ends: string;
  state: "closed" | "current" | "next";
}

export interface FilmingCard {
  id: string;
  startsAt: string;
  hours: number;
  actualHours: number | null;
  location: string | null;
  origin: "client" | "team" | "blocked_time";
  state: FilmingState;
  isExtra: boolean;
  burned: boolean;
  kind: ProvisionKind | null;
  client: NamedRef | null;
  production: { id: string; title: string; isInternal: boolean };
  agreement: {
    id: string;
    title: string;
    kind: string;
    filmingCancelHours: number;
  } | null;
  period: FilmingPeriod | null;
  clientNote: string | null;
  internalNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  cancelledAt: string | null;
  cancelledSide: "team" | "client" | null;
  cancelledReason: string | null;
  cancelRequest: { at: string; reason: string } | null;
  doneAt: string | null;
  noShowAt: string | null;
  provision: ProvisionBalance | null;
  crew: CrewMember[];
  equipment: EquipmentLine[];
  history: FilmingHistoryEntry[];
  signals: FilmingSignals;
  viewerCan: FilmingViewerCan;
}

// Τα Γυρίσματά μου (E6).
export interface MineEntry {
  id: string;
  startsAt: string;
  hours: number;
  location: string | null;
  state: FilmingState;
  note: string | null;
  myResponse: CrewResponse;
  myReason: string | null;
  production: NamedProduction;
  client: NamedRef | null;
}

// Η επιλογή της Συμφωνίας στο E4, με τα είδη Παροχής και το υπόλοιπό τους (null = χωρίς μέτρηση).
export interface BookingKind {
  id: string;
  label: string;
  measure: ProvisionMeasure;
  defaultHours: number | null;
  balance: number | null;
}

export interface BookingAgreement {
  id: string;
  title: string;
  kind: string;
  client: NamedRef;
  noticeHours: number;
  cancelHours: number;
  horizonDays: number;
  bookingNeedsApproval: boolean;
  period: { id: string; n: number; starts: string; ends: string } | null;
  kinds: BookingKind[];
}

export interface CrewTemplate {
  id: string;
  name: string;
  note: string | null;
  members: NamedRef[];
}

export interface EquipmentCandidate {
  id: string;
  name: string;
  code: string | null;
  status: string;
  categoryName: string;
}

// Μία δέσμευση αντικειμένου (F2): ο σύνδεσμος στο Γύρισμα μόνο όπου το βλέπει ο Χρήστης (αλλιώς null).
export interface ItemReservation {
  filmingId: string | null;
  startsAt: string;
  hours: number;
  state: FilmingState;
  conflict: boolean;
}

// Ανοιχτό Γύρισμα για δέσμευση από την F2.
export interface OpenFilmingOption {
  id: string;
  startsAt: string;
  hours: number;
  production: NamedProduction;
}

export interface FilmingSettings {
  bookingNeedsApproval: boolean;
  noAnswerAction: NoAnswerAction;
  noAnswerHours: number;
  horizonDays: number;
  allowOutsidePeriod: boolean;
  rescheduleNeedsApproval: boolean;
  equipmentConflict: EquipmentConflictMode;
  clientSeesEquipment: boolean;
  sheetSending: SheetSendingMode;
  changeResetsConfirmations: boolean;
  doneMarking: DoneMarkingMode;
}

export interface FilmingCaps {
  canView: boolean;
  canApprove: boolean;
  canBook: boolean;
  canCrew: boolean;
  canReserve: boolean;
  canManageSettings: boolean;
  canBookInternal: boolean;
}
