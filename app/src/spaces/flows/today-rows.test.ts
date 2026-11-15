import { describe, expect, it } from "vitest";

import { cardRowsOf, isCardRow, type CardInput } from "./today-rows";

const NOW = Date.UTC(2026, 10, 15, 10);
const DAY = 86_400_000;

const input = (
  over: Partial<CardInput["content"]> = {},
  id = "overdue_invoices",
): CardInput => ({
  card: { id, title: "Ληξιπρόθεσμα Τιμολόγια" },
  content: {
    count: 1,
    allHref: "/app/finance/invoices?filter=overdue",
    rows: [
      {
        id: "i1",
        label: "2026-041",
        note: "Κάβα Νικολάου",
        href: "/app/finance/invoices/i1",
        amountCents: 62_000,
        waitingSince: new Date(NOW - 12 * DAY).toISOString(),
      },
    ],
    ...over,
  },
});

describe("cardRowsOf", () => {
  it("should word a card item as «είδος: τι — Πελάτης · ποσό»", () => {
    const [row] = cardRowsOf([input()], NOW);
    expect(row).toMatchObject({
      key: "overdue_invoices:i1",
      area: "Χρήματα",
      amountCents: 62_000,
      hasSince: true,
      href: "/app/finance/invoices/i1",
    });
    expect(row.title).toMatch(
      /^Ληξιπρόθεσμο Τιμολόγιο: 2026-041 — Κάβα Νικολάου · 620\s€$/,
    );
  });

  it("should say how long it waits when there is no amount", () => {
    const since = new Date(NOW - 3 * DAY).toISOString();
    const [row] = cardRowsOf(
      [
        input(
          {
            rows: [
              {
                id: "s1",
                label: "Τηλέφωνο",
                href: "/app/pipeline",
                waitingSince: since,
              },
            ],
          },
          "next_steps_due",
        ),
      ],
      NOW,
    );
    expect(row.title).toMatch(/^Επόμενο βήμα που έληξε: Τηλέφωνο · /);
    expect(row.area).toBe("Πελάτες");
  });

  it("should not count a future deadline as waiting", () => {
    const due = new Date(NOW + DAY).toISOString();
    const [row] = cardRowsOf(
      [
        input(
          {
            rows: [{ id: "t1", label: "Μοντάζ", href: "/app/tasks", at: due }],
          },
          "my_tasks",
        ),
      ],
      NOW,
    );
    expect(row.title).toBe("Εργασία: Μοντάζ");
    expect(row.hasSince).toBe(false);
    expect(row.area).toBe("Παραγωγή");
  });

  it("should not lose items beyond the card rows", () => {
    const rows = cardRowsOf([input({ count: 4 })], NOW);
    expect(rows.map((row) => row.key)).toEqual([
      "overdue_invoices:i1",
      "overdue_invoices:rest",
    ]);
    expect(rows[1]).toMatchObject({
      title: "Ληξιπρόθεσμα Τιμολόγια: άλλα 3 →",
      href: "/app/finance/invoices?filter=overdue",
    });
  });

  it("should leave out what a guide already counts and the week programme", () => {
    expect(isCardRow("unread_messages")).toBe(false);
    expect(isCardRow("filming_approvals")).toBe(false);
    expect(isCardRow("week_filming")).toBe(false);
    expect(isCardRow("client_filming")).toBe(false);
    expect(isCardRow("health")).toBe(true);
    expect(cardRowsOf([input({}, "requests_mentions")], NOW)).toEqual([]);
  });
});
