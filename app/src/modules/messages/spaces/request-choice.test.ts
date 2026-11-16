import { describe, expect, it } from "vitest";

import {
  NO_AGREEMENT_WARNING,
  choicesOf,
  defaultAssigneeOf,
  defaultChoiceOf,
  hasOthersToAssign,
} from "./request-choice";

describe("defaultChoiceOf", () => {
  it("should preselect the decision from the request kind", () => {
    expect(defaultChoiceOf("deliverable", true)).toBe("deliverable");
    expect(defaultChoiceOf("filming", true)).toBe("filming");
    expect(defaultChoiceOf("other", true)).toBe("done");
  });

  it("should preselect completion for a filming request without an active agreement", () => {
    expect(defaultChoiceOf("filming", false)).toBe("done");
  });
});

describe("choicesOf", () => {
  it("should offer all four options and close the ones the request kind cannot do", () => {
    const options = choicesOf("deliverable", true);
    expect(options.map((option) => option.choice)).toEqual([
      "deliverable",
      "filming",
      "done",
      "reject",
    ]);
    expect(options.filter((option) => option.blockedBy !== null).map((o) => o.choice)).toEqual([
      "filming",
    ]);
  });

  it("should warn before filming when the client has no active agreement", () => {
    const filming = choicesOf("filming", false).find((o) => o.choice === "filming");
    expect(filming?.warning).toBe(NO_AGREEMENT_WARNING);
    expect(filming?.blockedBy).toBeNull();
  });
});

describe("hasOthersToAssign", () => {
  it("should offer reassignment only when someone else is on the team", () => {
    expect(hasOthersToAssign([{ id: "me" }], "me")).toBe(false);
    expect(hasOthersToAssign([{ id: "me" }, { id: "anna" }], "me")).toBe(true);
  });
});

describe("defaultAssigneeOf", () => {
  it("should default the assignee to me when I am a candidate", () => {
    expect(defaultAssigneeOf([{ id: "anna" }, { id: "me" }], "me")).toBe("me");
    expect(defaultAssigneeOf([{ id: "anna" }], "me")).toBe("");
  });
});
