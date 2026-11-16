import { describe, expect, it } from "vitest";

import {
  counterOf,
  counterText,
  emptyRun,
  isRoundOver,
  loopStateOf,
  parseRun,
  tallyText,
  withCount,
  withHandled,
  withOutcome,
  withoutSkipped,
  withSkipped,
  rowKeyOf,
} from "./loop-run";

const row = (key: string) => ({ key, href: key });

describe("loopStateOf", () => {
  it("should offer the oldest row that was not left for later", () => {
    const state = loopStateOf([row("/a"), row("/b"), row("/c")], ["/a"]);
    expect(state.next?.key).toBe("/b");
    expect(state.count).toBe(3);
    expect(state.skippedLeft).toBe(1);
  });

  it("should have no next row when every row was left for later", () => {
    const state = loopStateOf([row("/a")], ["/a"]);
    expect(state.next).toBeNull();
    expect(state.skippedLeft).toBe(1);
  });

  it("should not count skipped rows that no longer wait", () => {
    expect(loopStateOf([row("/b")], ["/a"]).skippedLeft).toBe(0);
  });
});

describe("counterOf", () => {
  it("should say row 1 of N before anything is done", () => {
    expect(counterOf(withCount(emptyRun("j"), 5), 0)).toEqual({ k: 1, n: 5 });
  });

  it("should keep N steady as rows get done and the list shrinks", () => {
    const run = withCount(withHandled(emptyRun("j")), 4);
    expect(counterOf(run, 0)).toEqual({ k: 2, n: 5 });
  });

  it("should count rows left for later as passed", () => {
    const run = withCount(withSkipped(emptyRun("j"), "/a"), 5);
    expect(counterOf(run, 1)).toEqual({ k: 2, n: 5 });
  });

  it("should be unknown before the list was read or when it is empty", () => {
    expect(counterOf(emptyRun("j"), 0)).toBeNull();
    expect(counterOf(withCount(emptyRun("j"), 0), 0)).toBeNull();
  });
});

describe("run changes", () => {
  it("should tally outcomes and finish the row only when it returns to step 1", () => {
    const worked = withOutcome(emptyRun("j"), "worked", false);
    const replied = withOutcome(worked, "reply", true);
    expect(replied.handled).toBe(1);
    expect(replied.tally).toEqual({ worked: 1, reply: 1 });
  });

  it("should not repeat a skipped row and bring them all back on request", () => {
    const run = withSkipped(withSkipped(emptyRun("j"), "/a"), "/a");
    expect(run.skipped).toEqual(["/a"]);
    expect(withoutSkipped(run).skipped).toEqual([]);
  });
});

describe("parseRun", () => {
  it("should read back a stored run of the same job", () => {
    const run = withOutcome(withCount(emptyRun("j"), 3), "reply", true);
    expect(parseRun(JSON.stringify(run), "j")).toEqual(run);
  });

  it("should start fresh on junk or another job", () => {
    expect(parseRun("{", "j")).toEqual(emptyRun("j"));
    expect(parseRun(JSON.stringify(emptyRun("k")), "j")).toEqual(emptyRun("j"));
    expect(parseRun(null, "j")).toEqual(emptyRun("j"));
  });
});

describe("tallyText", () => {
  it("should fill each number and use 0 for what did not happen", () => {
    expect(
      tallyText("απάντησες σε {reply}, απέρριψες {rejected}", { reply: 2 }),
    ).toBe("απάντησες σε 2, απέρριψες 0");
  });
});

describe("round end and counter text", () => {
  it("should name what the guide counts, «Γραμμή» by default", () => {
    expect(counterText(undefined, { k: 2, n: 5 })).toBe("Γραμμή 2 από 5");
    expect(counterText("Αίτημα", { k: 1, n: 2 })).toBe("Αίτημα 1 από 2");
  });

  it("should be over only when nothing waits, not even rows left for later", () => {
    expect(isRoundOver({ next: null, count: 0, skippedLeft: 0 })).toBe(true);
    expect(isRoundOver({ next: null, count: 2, skippedLeft: 2 })).toBe(false);
    expect(isRoundOver({ next: row("/a"), count: 1, skippedLeft: 0 })).toBe(false);
    expect(isRoundOver(undefined)).toBe(false);
  });

  it("should count a rejection as a reply too", () => {
    expect(tallyText("{reply}/{rejected}", { reply: 1, rejected: 2 })).toBe("3/2");
  });

  it("should key a request row by ?req= and other rows by the path", () => {
    expect(rowKeyOf("/app/filming/queue", "job=x&req=f1")).toBe("f1");
    expect(rowKeyOf("/app/messages/c1", "job=x")).toBe("/app/messages/c1");
  });
});
