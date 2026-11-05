import { describe, expect, it } from "vitest";

import { athensStamp } from "./a1-adapter";
import type { CardRow } from "./a1-model";
import {
  programmeDateOf,
  programmeOf,
  programmeRowsOf,
} from "./a1-programme";

// Ώρα Ελλάδας τον Νοέμβριο: UTC+2.
const filming = (label: string, at: string): CardRow => ({
  label,
  at,
  href: `/app/filming/${label}`,
});

const ROWS = [
  filming("απογευματινό", "2026-11-05T14:00:00+00:00"),
  filming("πρωινό", "2026-11-05T07:30:00+00:00"),
  filming("αυριανό", "2026-11-06T08:00:00+00:00"),
  filming("σάββατο", "2026-11-07T09:00:00+00:00"),
];

// Πέμπτη 5/11/2026.
const at = (iso: string) => athensStamp(new Date(iso));

describe("programmeOf", () => {
  it("ως τις 18:00 δείχνει τα σημερινά, με σειρά ώρας", () => {
    const programme = programmeOf(ROWS, at("2026-11-05T15:59:00Z"));
    expect(programme.day).toBe("today");
    expect(programme.heading).toBe("Σήμερα, Πέμπτη 5/11");
    expect(programme.slots.map((slot) => [slot.time, slot.label])).toEqual([
      ["09:30", "πρωινό"],
      ["16:00", "απογευματινό"],
    ]);
    expect(programme.next).toBeNull();
  });

  it("από τις 18:00 δείχνει τα αυριανά", () => {
    const programme = programmeOf(ROWS, at("2026-11-05T16:00:00Z"));
    expect(programme.day).toBe("tomorrow");
    expect(programme.heading).toBe("Αύριο, Παρασκευή 6/11");
    expect(programme.slots.map((slot) => slot.label)).toEqual(["αυριανό"]);
  });

  it("άδεια μέρα: το επόμενο Γύρισμα", () => {
    const programme = programmeOf(
      ROWS.filter((row) => row.label === "σάββατο"),
      at("2026-11-05T08:00:00Z"),
    );
    expect(programme.slots).toEqual([]);
    expect(programme.next).toMatchObject({
      label: "σάββατο",
      when: "Σάββατο 7/11, 11:00",
    });
  });

  it("χωρίς κανένα Γύρισμα: ούτε επόμενο", () => {
    const programme = programmeOf([], at("2026-11-05T08:00:00Z"));
    expect(programme.slots).toEqual([]);
    expect(programme.next).toBeNull();
  });

  it("με όλα τα Γυρίσματα της μέρας (today_programme): όλα, όχι μόνο τα 3 της κάρτας", () => {
    const day = [
      filming("τρίτο", "2026-11-05T15:00:00+00:00"),
      filming("πρώτο", "2026-11-05T06:00:00+00:00"),
      filming("δεύτερο", "2026-11-05T09:00:00+00:00"),
      filming("τέταρτο", "2026-11-05T17:00:00+00:00"),
    ];
    const programme = programmeOf(ROWS, at("2026-11-05T08:00:00Z"), day);
    expect(programme.slots.map((slot) => slot.label)).toEqual([
      "πρώτο",
      "δεύτερο",
      "τρίτο",
      "τέταρτο",
    ]);
  });

  it("programmeDateOf: η μέρα που ζητά το πρόγραμμα", () => {
    expect(programmeDateOf(at("2026-11-05T15:59:00Z"))).toEqual({
      day: "today",
      date: "2026-11-05",
    });
    expect(programmeDateOf(at("2026-11-30T16:00:00Z"))).toEqual({
      day: "tomorrow",
      date: "2026-12-01",
    });
  });

  it("programmeRowsOf: υπότιτλος και Συνεργείο στη γραμμή", () => {
    expect(
      programmeRowsOf({
        day: "2026-11-05",
        items: [
          {
            id: "f1",
            title: "Αθηνά, Κατάστημα",
            at: "2026-11-05T08:00:00+00:00",
            subtitle: "αναμένει έγκριση",
            crew: ["Πέτρος", "Σοφία"],
            link: "/app/filming/f1",
          },
        ],
      }),
    ).toEqual([
      {
        label: "Αθηνά, Κατάστημα",
        href: "/app/filming/f1",
        at: "2026-11-05T08:00:00+00:00",
        note: "αναμένει έγκριση · Πέτρος, Σοφία",
      },
    ]);
  });

  it("γραμμές χωρίς ώρα δεν μπαίνουν στο πρόγραμμα", () => {
    const programme = programmeOf(
      [{ label: "χωρίς", href: "/app/filming/x" }],
      at("2026-11-05T08:00:00Z"),
    );
    expect(programme.slots).toEqual([]);
  });
});
