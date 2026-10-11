// Τύποι της όψης πελάτη των Παραδοτέων (H3 λίστα, H4 σελίδα). Το `null` σημαίνει «δεν υπάρχει», όχι μηδέν.
// Ο πελάτης δεν βλέπει Υπεύθυνο, προθεσμία, χρέωση ή εσωτερικά σχόλια.

export const CLIENT_STATES = [
  "in_progress",
  "awaiting_you",
  "changes_requested",
  "approved",
  "cancelled",
] as const;
export type ClientDeliverableState = (typeof CLIENT_STATES)[number];

export interface ClientDeliverableCard {
  id: string;
  productionId: string;
  title: string;
  kind: string;
  state: ClientDeliverableState;
  roundsUsed: number;
  roundsLimit: number | null;
  waitingSince: string | null;
}

export interface ClientProvision {
  kind: string;
  used: number;
  remaining: number;
  total: number;
}

export interface ClientPeriodGroup {
  periodId: string | null;
  periodLabel: string;
  provisions: ClientProvision[];
  deliverables: ClientDeliverableCard[];
}

export interface ClientDeliverablesView {
  periods: ClientPeriodGroup[];
  awaitingYou: ClientDeliverableCard[];
}

export interface ClientComment {
  id: string;
  body: string;
  atSeconds: number | null;
  authorName: string | null;
  createdAt: string;
}

// Μόνο Εκδόσεις που στάλθηκαν. Το `url` ανοίγει σε νέα καρτέλα.
export interface ClientVersion {
  number: number;
  url: string;
  host: string;
  sentAt: string;
  state: string;
  answeredByName: string | null;
  answeredAt: string | null;
  answerNote: string | null;
  linkBroken: boolean;
  comments: ClientComment[];
}

export interface ClientOpenRequest {
  id: string;
  body: string;
  createdAt: string;
}

export interface ClientDeliverableCan {
  answer: boolean;
  comment: boolean;
  reportLink: boolean;
  requestChange: boolean;
}

export interface ClientDeliverableDetail {
  id: string;
  productionId: string;
  title: string;
  production: string;
  kind: string;
  state: ClientDeliverableState;
  roundsUsed: number;
  roundsLimit: number | null;
  overLimit: boolean;
  versions: ClientVersion[];
  finalFilesUrl: string | null;
  openRequest: ClientOpenRequest | null;
  can: ClientDeliverableCan;
}
