import { describe, expect, it } from "vitest";

import { defaultLookOf, parseLook } from "./look";

describe("parseLook", () => {
  it("δίνει τη νέα εμφάνιση για την τιμή spaces", () => {
    expect(parseLook("spaces", "classic")).toBe("spaces");
  });

  it("δίνει την παλιά εμφάνιση για την τιμή classic, ακόμα κι αν η προεπιλογή είναι η νέα", () => {
    expect(parseLook("classic", "spaces")).toBe("classic");
  });

  it("χωρίς cookie ισχύει η προεπιλογή", () => {
    expect(parseLook(undefined, "classic")).toBe("classic");
    expect(parseLook(undefined, "spaces")).toBe("spaces");
  });

  it("για άδεια ή άγνωστη τιμή ισχύει η προεπιλογή", () => {
    expect(parseLook("", "classic")).toBe("classic");
    expect(parseLook("Spaces", "spaces")).toBe("spaces");
  });
});

describe("defaultLookOf", () => {
  it("η νέα εμφάνιση είναι προεπιλογή μόνο όταν η ρύθμιση λέει ακριβώς spaces", () => {
    expect(defaultLookOf("spaces")).toBe("spaces");
    expect(defaultLookOf(undefined)).toBe("classic");
    expect(defaultLookOf("")).toBe("classic");
    expect(defaultLookOf("SPACES")).toBe("classic");
  });
});
