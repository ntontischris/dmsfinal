import { describe, expect, it } from "vitest";

import { pickTemplate } from "./default-templates";

const templates = [
  { id: "a", name: "Βασικό συνεργείο" },
  { id: "b", name: "Podcast στούντιο" },
];

describe("pickTemplate", () => {
  it("should prefer the template named after the kind, ignoring case and accents", () => {
    expect(pickTemplate(templates, "PODCAST")?.id).toBe("b");
    expect(pickTemplate(templates, "βασικο")?.id).toBe("a");
  });

  it("should fall back to the first template when no name matches", () => {
    expect(pickTemplate(templates, "Social")?.id).toBe("a");
    expect(pickTemplate(templates, "")?.id).toBe("a");
  });

  it("should give nothing when there are no templates", () => {
    expect(pickTemplate([], "Social")).toBeUndefined();
  });
});
