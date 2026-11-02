import { describe, expect, it } from "vitest";

import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("κρατά τα δύο πρώτα αρχικά, κεφαλαία χωρίς τόνο", () => {
    expect(initialsOf("Άρης Κωνσταντίνου")).toBe("ΑΚ");
    expect(initialsOf("ελένη μαρία παππά")).toBe("ΕΜ");
  });

  it("αντέχει διπλά κενά και ένα μόνο όνομα", () => {
    expect(initialsOf("  Ίρις  ")).toBe("Ι");
    expect(initialsOf("Studio  Κίνηση")).toBe("SΚ");
  });
});
