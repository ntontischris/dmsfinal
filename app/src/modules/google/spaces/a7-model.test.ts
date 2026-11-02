import { expect, test } from "vitest";

import { deletionItemOf, hoursLeftLabel, stateLabelOf } from "./a7-model";

const NOW = Date.parse("2026-10-09T08:00:00Z");
const format = {
  dateTime: (iso: string) => iso.slice(0, 16),
  filmingHref: (id: string) => `/app/filming/${id}`,
};

test("η προθεσμία γράφεται με όσες ώρες μένουν", () => {
  expect(hoursLeftLabel(0)).toBe("έληξε");
  expect(hoursLeftLabel(0.5)).toBe("σε λιγότερο από 1 ώρα");
  expect(hoursLeftLabel(1)).toBe("σε 1 ώρα");
  expect(hoursLeftLabel(5.6)).toBe("σε 6 ώρες");
});

test("η κατάσταση με τις λέξεις του prototype", () => {
  expect(stateLabelOf("pending")).toBe("αναμένει έγκριση");
  expect(stateLabelOf("scheduled")).toBe("προγραμματισμένο");
});

test("η διαγραφή γίνεται κάρτα, με προθεσμία την έναρξη όταν έρχεται πρώτη", () => {
  const item = deletionItemOf(
    {
      filmingId: "f1",
      title: null,
      startsAt: "2026-10-09T12:00:00Z",
      state: "pending",
      detectedAt: "2026-10-09T07:00:00Z",
      deadlineAt: "2026-10-09T12:00:00Z",
    },
    NOW,
    format,
  );
  expect(item).toMatchObject({
    title: "Γύρισμα",
    filmingHref: "/app/filming/f1",
    isAwaitingApproval: true,
    hoursLeft: 4,
    isDeadlineFilmingStart: true,
  });
  expect(item.deadlineLabel).toBe("2026-10-09T12:00 · σε 4 ώρες");
});
