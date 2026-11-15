import { describe, expect, it } from "vitest";

import {
  CREW_STEP,
  depthOf,
  flowOf,
  isLast,
  markOf,
  nextOf,
  oldestHref,
  prevOf,
  primaryLabelOf,
  resumeHref,
  stepHref,
  totalOf,
} from "./flows";

const stino = flowOf("stino-gyrisma")!;
const apanto = flowOf("apanto-se-pelates")!;
const egkrino = flowOf("egkrino-gyrismata")!;

describe("apanto-se-pelates", () => {
  it("should have one step per row of flow.md", () => {
    expect(apanto.steps).toHaveLength(3);
    expect(apanto.isLoop).toBe(true);
  });

  it("should start at the inbox", () => {
    expect(stepHref(apanto, 1)).toBe(
      "/app/messages?job=apanto-se-pelates&step=1",
    );
  });

  it("should skip the conditional step 2 and loop back from the reply", () => {
    expect(nextOf(apanto, 1)).toBe(3);
    expect(nextOf(apanto, 2)).toBe(3);
    expect(nextOf(apanto, 3)).toBe(1);
  });

  it("should never be finished by its steps alone", () => {
    expect([1, 2, 3].some((step) => isLast(apanto, step))).toBe(false);
  });

  it("should stay on the thread page while answering", () => {
    expect(stepHref(apanto, 3, { pathname: "/app/messages/client-1" })).toBe(
      "/app/messages/client-1?job=apanto-se-pelates&step=3",
    );
  });

  it("should open the oldest thread at the next step", () => {
    expect(oldestHref(apanto, 1, "/app/messages/client-1")).toBe(
      "/app/messages/client-1?job=apanto-se-pelates&step=3",
    );
    expect(oldestHref(apanto, 1, "/app/messages/settings")).toBeNull();
    expect(oldestHref(apanto, 1, undefined)).toBeNull();
    expect(oldestHref(apanto, 3, "/app/messages/client-1")).toBeNull();
  });

  it("should open each row at the step its kind needs", () => {
    expect(
      oldestHref(apanto, 1, "/app/messages/client-1#m-7", "request"),
    ).toBe("/app/messages/client-1?job=apanto-se-pelates&step=2#m-7");
    expect(oldestHref(apanto, 1, "/app/messages/client-1", "reply")).toBe(
      "/app/messages/client-1?job=apanto-se-pelates&step=3",
    );
    expect(oldestHref(apanto, 1, "/app/messages/client-1", "mention")).toBe(
      "/app/messages/client-1?job=apanto-se-pelates&step=3",
    );
  });

  it("should move on by itself when the conversation reports what happened", () => {
    expect(apanto.steps[1].advancesOn).toEqual({
      worked: 3,
      rejected: 1,
      reply: 1,
    });
    expect(apanto.steps[2].advancesOn?.reply).toBe(1);
    expect(apanto.steps[2].advancesOn?.["no-reply"]).toBe(1);
    expect(apanto.steps[2].choices?.find((choice) => choice.skips)?.to).toBe(1);
  });

  it("should leave the send button as the main action on steps 2 and 3", () => {
    expect(apanto.steps[1].isStationPrimary).toBe(true);
    expect(apanto.steps[2].isStationPrimary).toBe(true);
  });

  it("should end with the generic done phrase and a tally version", () => {
    expect(apanto.done).toContain("Κανείς δεν σε περιμένει");
    expect(apanto.doneTally).toContain("{reply}");
    expect(apanto.doneTally).toContain("{worked}");
    expect(apanto.doneTally).toContain("{rejected}");
  });

  it("should resume at the reply once a thread is open", () => {
    expect(
      resumeHref(apanto, 1, { pathname: "/app/messages/client-1", search: "" }),
    ).toBe("/app/messages/client-1?job=apanto-se-pelates&step=3");
  });
});

describe("egkrino-gyrismata", () => {
  it("should have one step per row of flow.md with its marks", () => {
    expect(egkrino.steps.map((_, index) => markOf(egkrino, index + 1))).toEqual(
      ["1", "2α", "2β", "2γ", "⏳3"],
    );
    expect(totalOf(egkrino)).toBe(3);
    expect(depthOf(egkrino, 5)).toBe(3);
  });

  it("should start at the approvals queue", () => {
    expect(stepHref(egkrino, 1)).toBe(
      "/app/filming/queue?job=egkrino-gyrismata&step=1",
    );
  });

  it("should reuse the crew step of stino-gyrisma", () => {
    const { mark, isBranch, then, ...crew } = egkrino.steps[1];
    expect(crew).toEqual(CREW_STEP);
    expect(stino.steps[2]).toEqual(CREW_STEP);
    expect([mark, isBranch, then]).toEqual(["2α", true, 1]);
  });

  it("should answer through the request card, which sends to the right branch", () => {
    expect(nextOf(egkrino, 1)).toBeNull();
    expect(egkrino.steps[0].choices).toBeUndefined();
    expect(egkrino.steps[0].submits).toEqual({
      form: "e2-answer",
      label: "Στέλνω την απάντηση",
    });
    expect(egkrino.steps[2].submits?.form).toBe("e3-offer");
    expect(egkrino.steps[3].submits?.form).toBe("e2-reason");
  });

  it("should never claim the templates all went in", () => {
    expect(CREW_STEP.preset).not.toContain("Μπήκαν τα πρότυπα");
    expect(CREW_STEP.preset).toContain("ό,τι δεν μπήκε");
  });

  it("should wait for the client after proposing times, then loop", () => {
    expect(nextOf(egkrino, 3)).toBe(5);
    expect(nextOf(egkrino, 5)).toBe(1);
    expect(nextOf(egkrino, 2)).toBe(1);
    expect(nextOf(egkrino, 4)).toBe(1);
  });

  it("should go back to the step that led here", () => {
    expect(prevOf(egkrino, 1)).toBeNull();
    expect(prevOf(egkrino, 2)).toBe(1);
    expect(prevOf(egkrino, 5)).toBe(3);
  });

  it("should go back from a branch nobody links to the nearest plain step", () => {
    expect(prevOf(egkrino, 3)).toBe(1);
    expect(prevOf(egkrino, 4)).toBe(1);
  });

  it("should keep its place on the filming page while proposing times", () => {
    expect(
      resumeHref(egkrino, 3, { pathname: "/app/filming/abc", search: "" }),
    ).toBe("/app/filming/abc?job=egkrino-gyrismata&step=3");
  });

  it("should label the primary button by loop, wait and finish", () => {
    expect(primaryLabelOf(egkrino, 2, false)).toBe("Επόμενο αίτημα");
    expect(primaryLabelOf(egkrino, 5, false)).toBe("Εντάξει, περιμένω");
    expect(primaryLabelOf(egkrino, 1, true)).toBe("Τέλος");
    expect(primaryLabelOf(stino, 1, false)).toBe("Επόμενο");
  });
});

describe("stino-gyrisma counter", () => {
  it("should keep five plain steps", () => {
    expect(totalOf(stino)).toBe(5);
    expect(prevOf(stino, 3)).toBe(2);
    expect(nextOf(stino, 5)).toBeNull();
  });
});
