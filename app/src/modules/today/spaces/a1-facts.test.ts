import { describe, expect, it } from "vitest";

import {
  decisionFactOf,
  daysWord,
  suggestionFactOf,
  waitingOf,
} from "./a1-facts";

// Τα ποσά του Intl έχουν μη διαιρούμενο κενό (U+00A0) πριν από το €.

// Πέμπτη 5/11/2026, ώρα Ελλάδας (UTC+2).
const TODAY = "2026-11-05";

describe("daysWord", () => {
  it("ενικός για το 1, πληθυντικός για τα υπόλοιπα", () => {
    expect(daysWord(1)).toBe("1 ημέρα");
    expect(daysWord(17)).toBe("17 ημέρες");
  });
});

describe("waitingOf", () => {
  it("μετρά μέρες Ελλάδας, όχι 24ωρα", () => {
    expect(waitingOf("2026-11-04T22:30:00+00:00", TODAY)).toBe(
      "Περιμένει από σήμερα.",
    );
    expect(waitingOf("2026-11-04T21:00:00+00:00", TODAY)).toBe(
      "Περιμένει 1 ημέρα.",
    );
    expect(waitingOf("2026-10-19T15:27:00+00:00", TODAY)).toBe(
      "Περιμένει 17 ημέρες.",
    );
  });

  it("χωρίς στιγμή, ή με λάθος, δεν λέει τίποτα", () => {
    expect(waitingOf(undefined, TODAY)).toBeNull();
    expect(waitingOf("όχι-ημερομηνία", TODAY)).toBeNull();
  });
});

describe("decisionFactOf", () => {
  it("πρόταση: το ποσό με Παρέκκλιση και πόσο περιμένει", () => {
    expect(
      decisionFactOf(
        {
          cardId: "proposal_approvals",
          amountCents: 65_000,
          waitingSince: "2026-10-19T15:27:00+00:00",
          note: "Καφεκοπτείο Ρόδι · με Παρέκκλιση",
        },
        TODAY,
      ),
    ).toBe("650 € με Παρέκκλιση. Περιμένει 17 ημέρες.");
  });

  it("πρόταση χωρίς ποσό (χωρίς «Βλέπει ποσά»)", () => {
    expect(
      decisionFactOf({ cardId: "proposal_approvals" }, TODAY),
    ).toBe("Με Παρέκκλιση.");
  });

  it("κράτηση: η ώρα, πόσο περιμένει και αν η ώρα είναι ακόμα ελεύθερη", () => {
    expect(
      decisionFactOf(
        {
          cardId: "filming_approvals",
          at: "2026-11-10T15:00:00+00:00",
          waitingSince: "2026-11-02T10:00:00+00:00",
          isSlotFree: true,
        },
        TODAY,
      ),
    ).toBe("Τρίτη 10/11, 17:00. Περιμένει 3 ημέρες. Η ώρα είναι ακόμα ελεύθερη.");
  });

  it("κράτηση που δεν χωρά πια: καμία φράση για τη θέση (οι κρατήσεις δεν λήγουν)", () => {
    const fact = decisionFactOf(
      {
        cardId: "filming_approvals",
        at: "2026-11-10T15:00:00+00:00",
        waitingSince: "2026-11-05T08:00:00+00:00",
        isSlotFree: false,
      },
      TODAY,
    );
    expect(fact).toBe("Τρίτη 10/11, 17:00. Περιμένει από σήμερα.");
    expect(fact).not.toMatch(/χάνεται|θέση/);
  });

  it("αίτημα πελάτη και πρόσβαση: ο υπότιτλος της βάσης ως πρόταση", () => {
    expect(
      decisionFactOf(
        {
          cardId: "requests_mentions",
          note: "Κτήμα Αμπελώνες Ολύμπου",
          waitingSince: "2026-11-03T09:00:00+00:00",
        },
        TODAY,
      ),
    ).toBe("Κτήμα Αμπελώνες Ολύμπου. Περιμένει 2 ημέρες.");
    expect(
      decisionFactOf(
        {
          cardId: "unassigned",
          note: "Άγγελος ζητά πρόσβαση",
          waitingSince: "2026-11-01T09:00:00+00:00",
        },
        TODAY,
      ),
    ).toBe("Άγγελος ζητά πρόσβαση. Περιμένει 4 ημέρες.");
  });

  it("ο υπότιτλος ξεκινά με κεφαλαίο και δεν παίρνει δεύτερη τελεία", () => {
    expect(
      decisionFactOf({ cardId: "gdpr", note: "λήγει σε 5 μέρες" }, TODAY),
    ).toBe("Λήγει σε 5 μέρες.");
    expect(decisionFactOf({ cardId: "x", note: "Έτοιμο." }, TODAY)).toBe(
      "Έτοιμο.",
    );
  });

  it("χωρίς τίποτα από τη βάση: κενό", () => {
    expect(decisionFactOf({ cardId: "x" }, TODAY)).toBe("");
  });
});

describe("suggestionFactOf", () => {
  const suggestion = {
    client: "Ξενοδοχείο Γαλάζιο Ακρογιάλι",
    startsAt: "2026-11-11T10:00:00+00:00",
    isFreed: false,
    href: "/app/filming/m1",
  };

  it("ακύρωση: η θέση που αδειάζει χωράει τη μετάθεση του άλλου Πελάτη", () => {
    expect(
      decisionFactOf(
        {
          id: "cancel:k1",
          cardId: "filming_approvals",
          at: "2026-11-11T10:00:00+00:00",
          waitingSince: "2026-11-04T10:00:00+00:00",
          suggestion,
        },
        TODAY,
      ),
    ).toBe(
      "Τετάρτη 11/11, 12:00. Περιμένει 1 ημέρα. Η θέση που αδειάζει χωράει τη μετάθεση του Ξενοδοχείο Γαλάζιο Ακρογιάλι.",
    );
  });

  it("μετάθεση: γράφει τη θέση, και αν άδειασε ήδη", () => {
    expect(
      suggestionFactOf({ id: "reschedule:m1", cardId: "filming_approvals", suggestion }),
    ).toBe("Θέση που αδειάζει: Τετάρτη 11/11, 12:00. Χωράει αυτή τη μετάθεση.");
    expect(
      suggestionFactOf({
        id: "reschedule:m1",
        cardId: "filming_approvals",
        suggestion: { ...suggestion, isFreed: true },
      }),
    ).toBe("Θέση που άδειασε: Τετάρτη 11/11, 12:00. Χωράει αυτή τη μετάθεση.");
  });

  it("ποτέ «ο πελάτης το θέλει»· χωρίς πρόταση ή σε άλλη κάρτα: καμία φράση", () => {
    const fact = suggestionFactOf({ id: "cancel:k1", cardId: "filming_approvals", suggestion });
    expect(fact).not.toMatch(/θέλει|ζήτησε/);
    expect(suggestionFactOf({ id: "cancel:k1", cardId: "filming_approvals" })).toBeNull();
    expect(suggestionFactOf({ id: "x", cardId: "unassigned", suggestion })).toBeNull();
    expect(
      suggestionFactOf({
        id: "reschedule:m1",
        cardId: "filming_approvals",
        suggestion: { ...suggestion, startsAt: "όχι-ημερομηνία" },
      }),
    ).toBeNull();
  });
});
