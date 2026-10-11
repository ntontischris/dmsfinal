// Τύποι του module «Παραγωγές» (G1, G2). Τα JSON της βάσης έρχονται σε snake_case· εδώ camelCase.
// Κανένα ποσό ούτε κόστος: οι Παροχές μετριούνται σε πλήθος, το υπόλοιπο είναι αριθμός Παροχών.

import type { DeliverableCard } from "@/modules/deliverables";

export const PRODUCTION_STATES = ["open", "delivered", "cancelled"] as const;
export type ProductionState = (typeof PRODUCTION_STATES)[number];

export const PRODUCTION_TABS = ["open", "delivered", "all"] as const;
export type ProductionTab = (typeof PRODUCTION_TABS)[number];

export const PERIOD_STATES = ["closed", "current", "next"] as const;
export type PeriodState = (typeof PERIOD_STATES)[number];

export interface ProductionClient {
  id: string;
  name: string;
}

export interface ProductionPeriod {
  n: number;
  starts: string;
  ends: string;
  state: PeriodState;
}

// Ο Υπεύθυνος: ο Πελάτης βλέπει μόνο το όνομα, άρα το id λείπει (null).
export interface ProductionOwner {
  id: string | null;
  name: string;
}

export interface ProductionCard {
  id: string;
  title: string;
  client: ProductionClient | null; // null = Εσωτερική
  period: ProductionPeriod | null; // null = εφάπαξ ή Εσωτερική
  owner: ProductionOwner | null; // null = «Χωρίς υπεύθυνο»
  state: ProductionState;
  isInternal: boolean;
}

export interface PeriodBalance {
  kindId: string;
  code: string | null;
  label: string;
  unit: string;
  given: number;
  carried: number;
  used: number;
  reserved: number;
  balance: number;
}

export interface ProductionMember {
  userId: string;
  name: string;
}

export interface ProductionAgreement {
  id: string;
  title: string;
  kind: string;
}

export interface ProductionHistoryEntry {
  at: string;
  action: "insert" | "update" | "delete" | "event";
  event: string | null;
  actorName: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface ProductionViewerCan {
  deliver: boolean;
  reopen: boolean;
  cancel: boolean;
  transfer: boolean;
  members: boolean;
}

export interface ProductionDetail extends ProductionCard {
  agreement: ProductionAgreement | null;
  balances: PeriodBalance[];
  deliveredAt: string | null;
  deliveredNote: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  members: ProductionMember[];
  history: ProductionHistoryEntry[];
  viewerCan: ProductionViewerCan;
  filmings: ProductionFilming[];
  deliverables: DeliverableCard[]; // μόνο για την ομάδα· ο πελάτης παίρνει []
  tasks: ProductionTask[]; // μόνο για την ομάδα· ο πελάτης παίρνει []
  autoDelivered: boolean; // παραδόθηκε αυτόματα μετά την τελευταία έγκριση
}

// Μια Εργασία της Παραγωγής (G2): απλή, με έναν υπεύθυνο και προαιρετική προθεσμία.
export interface ProductionTask {
  id: string;
  title: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null; // YYYY-MM-DD
  isLate: boolean;
  done: boolean;
}

export interface HistoryLine {
  at: string;
  actor: string;
  text: string;
}

// Τι δικαιούται ο θεατής στις Παραγωγές. Η βάση αποφασίζει ξανά σε κάθε RPC.
export interface ProductionsCaps {
  canView: boolean;
  canCreateInternal: boolean;
  isClient: boolean;
}

export interface OwnerCandidate {
  id: string;
  name: string;
}

// Τα Γυρίσματα της Παραγωγής όσα βλέπει ο Χρήστης (G2). Χωρίς Συνεργείο και σημειώσεις.
export interface ProductionFilming {
  id: string;
  startsAt: string;
  hours: number;
  state: string;
  isExtra: boolean;
  kind: string | null;
}
