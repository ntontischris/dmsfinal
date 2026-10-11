import type { DeliverableCan, DeliverableCard } from "./types";

// Δεδομένα των τεστ: ένα Παραδοτέο και τα δικαιώματά του, με τιμές που αλλάζουν μόνο όσα ζητά το τεστ.

export const cardFactory = (overrides: Partial<DeliverableCard> = {}): DeliverableCard => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Κυψέλη Καφέ — Μάρτιος",
  productionId: "22222222-2222-4222-8222-222222222222",
  production: "Μάρτιος",
  client: "Κυψέλη Καφέ",
  kind: "Reel",
  kindId: "33333333-3333-4333-8333-333333333333",
  assigneeId: null,
  assigneeName: null,
  filmingId: null,
  deadline: null,
  isLate: false,
  state: "draft",
  daysWaiting: 0,
  overLimit: false,
  linkBroken: false,
  versionCount: 0,
  roundsUsed: 0,
  roundsLimit: 2,
  charge: "included",
  chargeReason: null,
  approvedAt: null,
  cancelledAt: null,
  cancelReason: null,
  cancelOutcome: null,
  ...overrides,
});

export const canFactory = (overrides: Partial<DeliverableCan> = {}): DeliverableCan => ({
  addVersion: false,
  send: false,
  return: false,
  approveInternal: false,
  cancel: false,
  comment: false,
  decideCharge: false,
  edit: false,
  ...overrides,
});
