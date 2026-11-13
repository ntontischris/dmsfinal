import { expect, test } from "vitest";

import { detailFactory } from "../test-factories";
import type {
  DeliverableComment,
  DeliverableRequest,
  DeliverableVersion,
} from "../types";
import {
  clientAsksOf,
  extraOf,
  fmtDay,
  goesToReviewOf,
  isReopened,
  latestOf,
  roundsLabel,
  versionsInOrder,
} from "./h2-model";

const comment = (
  overrides: Partial<DeliverableComment>,
): DeliverableComment => ({
  id: "c",
  body: "Σχόλιο",
  atSeconds: null,
  isInternal: false,
  createdAt: "2026-09-10T10:00:00Z",
  authorName: "Άρης Κωνσταντίνου",
  parentId: null,
  resolvedAt: null,
  resolvedByName: null,
  seenBy: [],
  ...overrides,
});

const version = (
  number: number,
  comments: DeliverableComment[] = [],
): DeliverableVersion => ({
  number,
  url: "https://vimeo.com/1",
  host: "vimeo.com",
  state: "superseded",
  note: null,
  reviewNote: null,
  createdAt: "2026-09-01T10:00:00Z",
  sentAt: null,
  answeredAt: null,
  answerNote: null,
  linkBroken: false,
  comments,
});

const request = (
  overrides: Partial<DeliverableRequest>,
): DeliverableRequest => ({
  id: "rq-1",
  body: "Μπορείτε να αλλάξετε τον τίτλο;",
  createdAt: "2026-09-19T09:00:00Z",
  createdByName: "Μαρία Παπαδάκη",
  decision: null,
  decidedAt: null,
  decidedByName: null,
  decisionNote: null,
  newDeliverableId: null,
  ...overrides,
});

test("μαζεύει τα ανοιχτά αιτήματα και τα σχόλια του πελάτη από όλες τις Εκδόσεις, νεότερη πρώτη", () => {
  const detail = detailFactory({
    requests: [request({}), request({ id: "rq-old", decision: "round" })],
    versions: [
      version(2, [
        comment({ id: "c2", authorName: null, body: "Πιο γρήγορα" }),
      ]),
      version(1, [
        comment({ id: "c1", authorName: null, body: "Αλλαγή μουσικής" }),
      ]),
    ],
  });
  const asks = clientAsksOf(detail);
  expect(asks[0]).toEqual({
    id: "rq-1",
    source: "αίτημα μετά την έγκριση",
    who: "Μαρία Παπαδάκη",
    when: "2026-09-19T09:00:00Z",
    text: "Μπορείτε να αλλάξετε τον τίτλο;",
  });
  expect(asks.map((a) => a.source)).toEqual([
    "αίτημα μετά την έγκριση",
    "σχόλιο στη v2",
    "σχόλιο στη v1",
  ]);
});

test("δεν φέρνει εσωτερικά σχόλια ή σχόλια της ομάδας", () => {
  const detail = detailFactory({
    versions: [
      version(1, [
        comment({ id: "team" }),
        comment({ id: "internal", authorName: null, isInternal: true }),
      ]),
    ],
  });
  expect(clientAsksOf(detail)).toEqual([]);
});

test("η νέα Έκδοση πάει σε έλεγχο όπως αποφασίζει η βάση", () => {
  expect(goesToReviewOf(true, null, true)).toBe(true);
  expect(goesToReviewOf(false, true, false)).toBe(true);
  expect(goesToReviewOf(false, true, true)).toBe(false);
  expect(goesToReviewOf(false, false, false)).toBe(false);
  expect(goesToReviewOf(false, null, false)).toBeNull();
});

test("οι Εκδόσεις: η τελευταία και η σειρά των καρτελών", () => {
  const detail = detailFactory({
    versions: [version(3), version(1), version(2)],
  });
  expect(latestOf(detail)?.number).toBe(3);
  expect(versionsInOrder(detail.versions).map((v) => v.number)).toEqual([
    1, 2, 3,
  ]);
  expect(latestOf(detailFactory())).toBeUndefined();
});

test("ξανάνοιξε μετά την έγκριση μόνο με ανοιχτό αίτημα", () => {
  expect(
    isReopened(detailFactory({ state: "approved", requests: [request({})] })),
  ).toBe(true);
  expect(
    isReopened(
      detailFactory({
        state: "approved",
        requests: [request({ decision: "round" })],
      }),
    ),
  ).toBe(false);
  expect(
    isReopened(
      detailFactory({ state: "awaiting_client", requests: [request({})] }),
    ),
  ).toBe(false);
});

test("γύροι αλλαγών και έξτρα", () => {
  expect(roundsLabel(1, 2)).toBe("1 γύρος (όριο 2)");
  expect(roundsLabel(3, 2)).toBe("3 γύροι (όριο 2) · πέρα από το όριο");
  expect(roundsLabel(0, null)).toBe("0 γύροι (χωρίς όριο)");
  expect(extraOf("charged")).toBe("με χρέωση");
  expect(extraOf("free")).toBe("χωρίς χρέωση");
  expect(extraOf("included")).toBeNull();
});

test("η μέρα μετρά στην ώρα της Αθήνας", () => {
  expect(fmtDay("2026-09-10T10:00:00Z")).toBe("10/09/2026");
  expect(fmtDay("2026-09-10T22:30:00Z")).toBe("11/09/2026");
});
