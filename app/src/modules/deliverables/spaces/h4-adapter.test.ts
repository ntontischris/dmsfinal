import { expect, test } from "vitest";

import type { ClientDeliverableDetail, ClientVersion } from "../client-types";
import {
  answerLineOf,
  answerNoticeOf,
  fmtDay,
  isDeliveredOf,
  selectedNumberOf,
  statusWordOf,
  versionWordOf,
  versionsInOrder,
} from "./h4-adapter";

const versionOf = (overrides: Partial<ClientVersion> = {}): ClientVersion => ({
  number: 1,
  url: "https://vimeo.com/123",
  host: "vimeo.com",
  sentAt: "2026-10-10T09:00:00Z",
  state: "awaiting_client",
  answeredByName: null,
  answeredAt: null,
  answerNote: null,
  linkBroken: false,
  comments: [],
  ...overrides,
});

const detailOf = (
  overrides: Partial<ClientDeliverableDetail> = {},
): ClientDeliverableDetail => ({
  id: "11111111-1111-4111-8111-111111111111",
  productionId: "p1",
  title: "Reel Κυψέλη",
  production: "Κυψέλη Οκτώβριος",
  kind: "Reel",
  state: "awaiting_you",
  roundsUsed: 0,
  roundsLimit: 2,
  overLimit: false,
  versions: [],
  finalFilesUrl: null,
  openRequest: null,
  can: { answer: true, comment: true, reportLink: true, requestChange: false },
  ...overrides,
});

test("οι Εκδόσεις πάνε v1 → vN, όπως οι καρτέλες του prototype", () => {
  const ordered = versionsInOrder([
    versionOf({ number: 3 }),
    versionOf({ number: 1 }),
    versionOf({ number: 2 }),
  ]);
  expect(ordered.map((v) => v.number)).toEqual([1, 2, 3]);
});

test("η Έκδοση της διεύθυνσης αν υπάρχει, αλλιώς η τελευταία", () => {
  const versions = [versionOf({ number: 1 }), versionOf({ number: 2 })];
  expect(selectedNumberOf(versions, "1")).toBe(1);
  expect(selectedNumberOf(versions, "9")).toBe(2);
  expect(selectedNumberOf(versions, undefined)).toBe(2);
  expect(selectedNumberOf([], "1")).toBeUndefined();
});

test("οι καταστάσεις Έκδοσης στις λέξεις του πελάτη", () => {
  expect(versionWordOf("awaiting_client")).toBe("περιμένει εσένα");
  expect(versionWordOf("changes_requested")).toBe("ζητήθηκαν αλλαγές");
  expect(versionWordOf("superseded")).toBe("αντικαταστάθηκε");
  expect(versionWordOf("άγνωστη")).toBe("σε εργασία");
});

test("«παραδόθηκε» μόνο όταν εγκρίθηκε και υπάρχουν τελικά αρχεία", () => {
  const approved = detailOf({ state: "approved" });
  expect(isDeliveredOf(approved)).toBe(false);
  expect(statusWordOf(approved)).toBe("εγκρίθηκε");
  const delivered = detailOf({
    state: "approved",
    finalFilesUrl: "https://drive.google.com/x",
  });
  expect(statusWordOf(delivered)).toBe("παραδόθηκε");
});

test("η ειδοποίηση μετά την απάντηση βγαίνει από την κατάσταση της βάσης", () => {
  expect(answerNoticeOf(detailOf())).toBeNull();
  expect(answerNoticeOf(detailOf({ state: "changes_requested" }))?.title).toBe(
    "Στάλθηκε το αίτημα αλλαγών",
  );
  expect(answerNoticeOf(detailOf({ state: "approved" }))?.title).toBe(
    "Εγκρίθηκε ✓",
  );
  expect(
    answerNoticeOf(
      detailOf({ state: "approved", finalFilesUrl: "https://vimeo.com/1" }),
    )?.title,
  ).toBe("Παραδόθηκε ✓");
});

test("η γραμμή απάντησης θέλει ποιον και πότε", () => {
  expect(answerLineOf(versionOf())).toBeNull();
  expect(
    answerLineOf(
      versionOf({
        state: "approved",
        answeredByName: "Μαρία",
        answeredAt: "2026-10-11T10:00:00Z",
      }),
    ),
  ).toEqual({ by: "Μαρία", when: "2026-10-11T10:00:00Z", isApproval: true });
});

test("η μέρα γράφεται στην ώρα Αθήνας", () => {
  expect(fmtDay("2026-10-10T22:30:00Z")).toBe("11/10/2026");
});
