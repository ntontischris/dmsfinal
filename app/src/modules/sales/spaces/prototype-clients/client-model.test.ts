// PROTOTYPE — throwaway, branch prototype/clients-three-levels.
import { describe, expect, it } from "vitest";

import { briefingOf, timelineOf, type ClientFacts } from "./client-model";

const factsOf = (over: Partial<ClientFacts> = {}): ClientFacts => ({
  name: "Δοκιμαστικός Πελάτης",
  stage: "Ενεργός",
  activeAgreement: null,
  money: null,
  overdueCount: 0,
  next: null,
  filming: null,
  agreementEnd: null,
  attention: null,
  lastContact: null,
  ...over,
});

describe("briefingOf", () => {
  it("should say nothing is owed and no next step when the client is quiet", () => {
    expect(briefingOf(factsOf())).toBe(
      "Δοκιμαστικός Πελάτης: ενεργός. Δεν χρωστά τίποτα. Δεν έχει κανονιστεί Επόμενο βήμα.",
    );
  });

  it("should name overdue invoices and a late next step", () => {
    const text = briefingOf(
      factsOf({
        overdueCount: 2,
        next: { step: "Κλήση", due: "01/01/2099", isLate: true },
      }),
    );
    expect(text).toContain("2 Τιμολόγια ληξιπρόθεσμα");
    expect(text).toContain("Κλήση, 01/01/2099 — έχει περάσει");
  });
});

describe("timelineOf", () => {
  it("should put a late next step under now and an upcoming filming under coming", () => {
    const line = timelineOf(
      factsOf({
        filming: "02/02/2099 10:00",
        next: { step: "Κλήση", due: "01/01/2000", isLate: true },
      }),
      [],
    );
    expect(line.coming.map((item) => item.key)).toEqual(["filming"]);
    expect(line.now.map((item) => item.key)).toEqual(["late"]);
  });
});
