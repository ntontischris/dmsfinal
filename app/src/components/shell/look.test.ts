import { describe, expect, it } from "vitest";

import { parseLook } from "./look";

describe("parseLook", () => {
  it("δίνει τη νέα εμφάνιση μόνο για την τιμή spaces", () => {
    expect(parseLook("spaces")).toBe("spaces");
  });

  it("κρατά την παλιά εμφάνιση όταν δεν υπάρχει cookie", () => {
    expect(parseLook(undefined)).toBe("classic");
  });

  it("κρατά την παλιά εμφάνιση για άδεια ή άγνωστη τιμή", () => {
    expect(parseLook("")).toBe("classic");
    expect(parseLook("Spaces")).toBe("classic");
    expect(parseLook("classic")).toBe("classic");
  });
});
