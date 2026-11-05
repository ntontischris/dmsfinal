import { describe, expect, it } from "vitest";

import { leadOf } from "./a1-lead";

describe("leadOf", () => {
  it("μία πρόταση από τα τρία κομμάτια, με σωστό ενικό και πληθυντικό", () => {
    expect(
      leadOf({
        filming: { day: "tomorrow", count: 1 },
        decisions: 4,
        overdue: 6,
      }),
    ).toBe(
      "Αύριο έχεις 1 Γύρισμα. 4 αποφάσεις περιμένουν μόνο εσένα. 6 ληξιπρόθεσμα Τιμολόγια.",
    );
  });

  it("ενικός στις αποφάσεις και στα Τιμολόγια, πληθυντικός στα Γυρίσματα", () => {
    expect(
      leadOf({
        filming: { day: "today", count: 3 },
        decisions: 1,
        overdue: 1,
      }),
    ).toBe(
      "Σήμερα έχεις 3 Γυρίσματα. 1 απόφαση περιμένει μόνο εσένα. 1 ληξιπρόθεσμο Τιμολόγιο.",
    );
  });

  it("το μηδέν λέγεται με λέξεις", () => {
    expect(
      leadOf({
        filming: { day: "today", count: 0 },
        decisions: 0,
        overdue: 0,
      }),
    ).toBe(
      "Σήμερα δεν έχεις Γύρισμα. Καμία απόφαση δεν περιμένει εσένα. Κανένα ληξιπρόθεσμο Τιμολόγιο.",
    );
  });

  it("κομμάτι χωρίς κάρτα (ή χωρίς αριθμό) λείπει", () => {
    expect(leadOf({ filming: null, decisions: 2, overdue: null })).toBe(
      "2 αποφάσεις περιμένουν μόνο εσένα.",
    );
    expect(leadOf({ filming: null, decisions: null, overdue: null })).toBe("");
  });
});
