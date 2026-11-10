import { describe, expect, it } from "vitest";

import { defaultLookOf, parseLook } from "./look";

describe("parseLook", () => {
  it("δίνει τη νέα εμφάνιση όταν δεν υπάρχει cookie", () => {
    expect(parseLook(undefined)).toBe("spaces");
  });

  it("σέβεται τη ρητή επιλογή στο cookie", () => {
    expect(parseLook("spaces", "classic")).toBe("spaces");
    expect(parseLook("classic")).toBe("classic");
  });

  it("παίρνει την προεπιλογή για άδεια ή άγνωστη τιμή", () => {
    expect(parseLook("")).toBe("spaces");
    expect(parseLook("Spaces", "classic")).toBe("classic");
  });
});

describe("defaultLookOf", () => {
  it("είναι οι Χώροι, εκτός αν ζητηθεί ρητά η παλιά", () => {
    expect(defaultLookOf(undefined)).toBe("spaces");
    expect(defaultLookOf("")).toBe("spaces");
    expect(defaultLookOf("classic")).toBe("classic");
  });
});
