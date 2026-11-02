import { expect, test } from "vitest";

import type {
  ClientDeliverableCard,
  ClientDeliverablesView,
} from "../client-types";
import {
  CLIENT_WORDS,
  countWord,
  groupsOf,
  roundsLabel,
  rowSubOf,
  waitingOf,
} from "./h3-adapter";

const cardOf = (
  overrides: Partial<ClientDeliverableCard> = {},
): ClientDeliverableCard => ({
  id: "d1",
  productionId: "p1",
  title: "Reel Κυψέλη",
  kind: "Reel",
  state: "in_progress",
  roundsUsed: 1,
  roundsLimit: 2,
  waitingSince: null,
  ...overrides,
});

const viewOf = (
  overrides: Partial<ClientDeliverablesView> = {},
): ClientDeliverablesView => ({
  periods: [],
  awaitingYou: [],
  ...overrides,
});

test("ο πελάτης βλέπει «περιμένει εσένα» για ό,τι περιμένει την απάντησή του", () => {
  expect(CLIENT_WORDS.awaiting_you).toBe("περιμένει εσένα");
  expect(CLIENT_WORDS.approved).toBe("εγκρίθηκε");
});

test("οι γύροι αλλαγών γράφουν το Όριο μόνο όταν η Συμφωνία έχει", () => {
  expect(roundsLabel(1, 2)).toBe("γύροι αλλαγών: 1 από 2");
  expect(roundsLabel(3, null)).toBe("γύροι αλλαγών: 3");
  expect(rowSubOf(cardOf())).toBe("Reel · γύροι αλλαγών: 1 από 2");
});

test("οι Περίοδοι χωρίς Παραδοτέα δεν φαίνονται και οι Παροχές γίνονται μετρητές", () => {
  const groups = groupsOf(
    viewOf({
      periods: [
        {
          periodId: "per-1",
          periodLabel: "Οκτώβριος 2026",
          provisions: [{ kind: "Reel", used: 2, remaining: 2, total: 4 }],
          deliverables: [cardOf()],
        },
        {
          periodId: null,
          periodLabel: "εφάπαξ",
          provisions: [],
          deliverables: [],
        },
      ],
    }),
  );
  expect(groups).toEqual([
    {
      key: "per-1",
      label: "Οκτώβριος 2026",
      rows: [{ label: "Reel", total: 4, used: 2, left: 2 }],
      deliverables: [cardOf()],
    },
  ]);
});

test("χωρίς Περίοδο το κλειδί της ομάδας είναι η ετικέτα της", () => {
  const [group] = groupsOf(
    viewOf({
      periods: [
        {
          periodId: null,
          periodLabel: "εφάπαξ",
          provisions: [],
          deliverables: [cardOf()],
        },
      ],
    }),
  );
  expect(group?.key).toBe("εφάπαξ");
});

test("όποιο περιμένει περισσότερο τον πελάτη μπαίνει πρώτο", () => {
  const waiting = waitingOf(
    viewOf({
      awaitingYou: [
        cardOf({ id: "new", waitingSince: "2026-10-20T10:00:00Z" }),
        cardOf({ id: "old", waitingSince: "2026-10-01T10:00:00Z" }),
      ],
    }),
  );
  expect(waiting.map((c) => c.id)).toEqual(["old", "new"]);
});

test("ενικός και πληθυντικός στους μετρητές", () => {
  expect(countWord(1, "μένει", "μένουν")).toBe("μένει");
  expect(countWord(0, "μένει", "μένουν")).toBe("μένουν");
});
