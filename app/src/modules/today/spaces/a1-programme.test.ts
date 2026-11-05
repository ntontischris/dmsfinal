import { describe, expect, it } from "vitest";

import { athensStamp } from "./a1-adapter";
import type { CardRow } from "./a1-model";
import { programmeOf } from "./a1-programme";

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

  it("γραμμές χωρίς ώρα δεν μπαίνουν στο πρόγραμμα", () => {
    const programme = programmeOf(
      [{ label: "χωρίς", href: "/app/filming/x" }],
      at("2026-11-05T08:00:00Z"),
    );
    expect(programme.slots).toEqual([]);
  });
});
