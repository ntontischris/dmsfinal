import { describe, expect, it } from "vitest";

import { sheetMessageFor, type SheetRow } from "./deliver-sheet";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const FILMING_ID = "f-42";

const issuedRow = (payload: Record<string, unknown>, locale = "el"): SheetRow => ({
  kind: "sheet_issued",
  to_name: "Μαρία",
  locale,
  payload: {
    filmingId: FILMING_ID,
    version: 2,
    startsAt: "2026-10-12T11:30:00Z",
    hours: 3,
    location: "Στούντιο Α",
    production: "Σποτ Καλοκαιριού",
    change: "Άλλαξε η λήψη",
    ...payload,
  },
});

const declinedRow = (payload: Record<string, unknown>): SheetRow => ({
  kind: "crew_declined",
  to_name: "Νίκος",
  locale: "el",
  payload: {
    filmingId: FILMING_ID,
    member: "Κώστας",
    reason: "Αρρώστησα",
    startsAt: "2026-10-12T11:30:00Z",
    production: "Σποτ Καλοκαιριού",
    ...payload,
  },
});

describe("το email της έκδοσης του Δελτίου", () => {
  it("έχει θέμα με παραγωγή και ημέρα, χωρίς ημέρα της εβδομάδας", () => {
    const message = sheetMessageFor(issuedRow({}), ORIGIN);
    expect(typeof message).toBe("object");
    if (typeof message === "string") return;
    expect(message.subject).toBe("Δελτίο γυρίσματος · Σποτ Καλοκαιριού · 12 Οκτωβρίου");
  });

  it("γράφει την ώρα της Αθήνας και την αλλαγή", () => {
    const message = sheetMessageFor(issuedRow({}), ORIGIN);
    if (typeof message === "string") throw new Error(message);
    expect(message.text).toContain("14:30");
    expect(message.text).toContain("Τι άλλαξε: Άλλαξε η λήψη");
  });

  it("δείχνει κουμπί προς το Γύρισμα", () => {
    const message = sheetMessageFor(issuedRow({}, "en"), ORIGIN);
    if (typeof message === "string") throw new Error(message);
    expect(message.html).toContain(`${ORIGIN}/app/filming/${FILMING_ID}`);
  });

  it("αποτυγχάνει όταν το payload δεν έχει σωστό σχήμα", () => {
    expect(sheetMessageFor(issuedRow({ version: 0 }), ORIGIN)).toBe("Μη έγκυρο περιεχόμενο ειδοποίησης");
  });
});

describe("το email «δεν μπορώ» του Συνεργείου", () => {
  it("έχει θέμα με το μέλος, την παραγωγή και την ημέρα", () => {
    const message = sheetMessageFor(declinedRow({}), ORIGIN);
    if (typeof message === "string") throw new Error(message);
    expect(message.subject).toBe("Κώστας δεν μπορεί στο Γύρισμα Σποτ Καλοκαιριού 12 Οκτωβρίου");
    expect(message.text).toContain("Λόγος: Αρρώστησα");
  });

  it("αποτυγχάνει όταν λείπει η παραγωγή", () => {
    expect(sheetMessageFor(declinedRow({ production: undefined }), ORIGIN)).toBe(
      "Μη έγκυρο περιεχόμενο ειδοποίησης",
    );
  });
});
