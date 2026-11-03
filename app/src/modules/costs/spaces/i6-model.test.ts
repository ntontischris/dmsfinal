import { expect, test } from "vitest";

import { fmtMoney } from "@/spaces/screens/shared";

import { fmtMonth } from "./i6-model";

test("ο μήνας γράφεται στην ονομαστική, όχι «Ιανουαρίου»", () => {
  expect(fmtMonth("2026-01")).toBe("Ιανουάριος 2026");
  expect(fmtMonth("2026-08")).toBe("Αύγουστος 2026");
  expect(fmtMonth("2025-05")).toBe("Μάιος 2025");
});

test("η αφαίρεση γραμμής κρατά το προηγούμενο, ώστε να γίνεται «Αναίρεση»", async () => {
  const { applyRemoval, removeLine, removedLineText, undoLast, draftsTotal } = await import("./i6-model");
  const cats = [
    { id: "c0", name: "Μισθοί", items: [{ id: "c0i0", name: "Μισθοδοσία", lines: [{ id: "l0", label: "Μισθοδοσία", amount: 5600 }, { id: "l1", label: "ΕΦΚΑ", amount: 400 }] }] },
  ];
  const line = cats[0].items[0].lines[0];
  const removed = applyRemoval({ cats, undo: null }, removeLine(0, 0, 0), removedLineText(line));
  expect(draftsTotal(removed.cats)).toBe(400);
  expect(removed.undo?.message).toBe(`Αφαιρέθηκε η γραμμή «Μισθοδοσία» (${fmtMoney(5600)}).`);
  const restored = undoLast(removed);
  expect(restored.cats).toEqual(cats);
  expect(restored.undo).toBeNull();
});

test("μετά από άλλη αλλαγή η «Αναίρεση» δεν προσφέρεται πια", async () => {
  const { applyEdit, applyRemoval, editLine, removeLine } = await import("./i6-model");
  const cats = [
    { id: "c0", name: "Μισθοί", items: [{ id: "c0i0", name: "Μισθοδοσία", lines: [{ id: "l0", label: "Α", amount: 1 }, { id: "l1", label: "Β", amount: 2 }] }] },
  ];
  const removed = applyRemoval({ cats, undo: null }, removeLine(0, 0, 0), "x");
  expect(applyEdit(removed, editLine(0, 0, 0, { amount: 3 })).undo).toBeNull();
});
