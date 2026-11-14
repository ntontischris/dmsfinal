import { describe, expect, it } from "vitest";

import {
  FLOWS,
  clientRowsOf,
  flowOf,
  isLast,
  parseStep,
  resumeHref,
  stepHref,
  withQuery,
} from "./flows";
import { parseParked, withParked, withoutJob } from "./parked";

const flow = flowOf("stino-gyrisma")!;

describe("flows", () => {
  it("should define stino-gyrisma with a done sentence and five steps", () => {
    expect(flow.steps).toHaveLength(5);
    expect(flow.done).toContain("Ημερολόγιο");
  });

  it("should cross at least two areas", () => {
    expect(
      new Set(flow.steps.map((step) => step.area)).size,
    ).toBeGreaterThanOrEqual(2);
  });

  it("should give every wave flow a unique id", () => {
    expect(new Set(FLOWS.map((item) => item.id)).size).toBe(FLOWS.length);
  });

  it("should clamp an invalid step to 1", () => {
    expect(parseStep("0", flow)).toBe(1);
    expect(parseStep("abc", flow)).toBe(1);
    expect(parseStep("99", flow)).toBe(1);
    expect(parseStep("3", flow)).toBe(3);
  });

  it("should carry job and step to the station route", () => {
    expect(stepHref(flow, 1)).toBe("/app/clients?job=stino-gyrisma&step=1");
    expect(stepHref(flow, 2)).toBe("/app/filming/new?job=stino-gyrisma&step=2");
    expect(stepHref(flow, 5)).toBe("/app/calendar?job=stino-gyrisma&step=5");
  });

  it("should open the calendar on the filming's day when it is known", () => {
    expect(stepHref(flow, 5, { date: "2026-11-16" })).toBe(
      "/app/calendar?date=2026-11-16&job=stino-gyrisma&step=5",
    );
    expect(stepHref(flow, 5, { date: "nope" })).toBe(
      "/app/calendar?job=stino-gyrisma&step=5",
    );
  });

  it("should stay on the filming page that was just booked", () => {
    expect(stepHref(flow, 3, { pathname: "/app/filming/abc" })).toBe(
      "/app/filming/abc?job=stino-gyrisma&step=3",
    );
    expect(stepHref(flow, 3, { pathname: "/app/clients" })).toBe(
      "/app/filming?job=stino-gyrisma&step=3",
    );
  });

  it("should send a wait step to the queue on Σήμερα", () => {
    expect(stepHref(flow, 4)).toBe("/app?job=stino-gyrisma&step=4");
  });

  it("should know the booking save lands on the filming page", () => {
    expect(flow.steps[1].landsOn?.test("/app/filming/abc")).toBe(true);
    expect(flow.steps[1].landsOn?.test("/app/filming/new")).toBe(false);
  });

  it("should mark only the last step as last", () => {
    expect(isLast(flow, 5)).toBe(true);
    expect(isLast(flow, 4)).toBe(false);
  });

  it("should add query params while keeping the existing ones", () => {
    expect(withQuery("/app/filming/new?job=x&step=2", { client: "c1" })).toBe(
      "/app/filming/new?job=x&step=2&client=c1",
    );
    expect(withQuery("/app", { job: "x" })).toBe("/app?job=x");
  });
});

describe("resumeHref", () => {
  it("should continue at step 3 after the booking save lands on the filming", () => {
    expect(
      resumeHref(flow, 2, { pathname: "/app/filming/abc", search: "" }),
    ).toBe("/app/filming/abc?job=stino-gyrisma&step=3");
  });

  it("should put the place back on the calendar while keeping its params", () => {
    expect(
      resumeHref(flow, 5, { pathname: "/app/calendar", search: "date=2026-11-23" }),
    ).toBe("/app/calendar?date=2026-11-23&job=stino-gyrisma&step=5");
  });

  it("should not resume on an unrelated page", () => {
    expect(
      resumeHref(flow, 5, { pathname: "/app/clients", search: "" }),
    ).toBeNull();
    expect(resumeHref(flow, 4, { pathname: "/app", search: "" })).toBeNull();
  });
});

describe("clientRowsOf", () => {
  it("should give one row per client with its packages joined", () => {
    const anna = { id: "a", name: "Άννα" };
    const rows = clientRowsOf([
      { title: "Social A", client: anna },
      { title: "Podcast B", client: { id: "b", name: "Βήτα" } },
      { title: "Podcast A", client: anna },
      { title: "Social A", client: anna },
    ]);
    expect(rows).toEqual([
      { id: "a", name: "Άννα", packages: "Social A · Podcast A" },
      { id: "b", name: "Βήτα", packages: "Podcast B" },
    ]);
  });
});

describe("parked queue", () => {
  it("should keep one row per job, newest first", () => {
    const rows = withParked([{ job: "a", step: 1, reason: "exit", at: 1 }], {
      job: "b",
      step: 2,
      reason: "wait",
      at: 2,
    });
    const again = withParked(rows, {
      job: "a",
      step: 3,
      reason: "exit",
      at: 3,
    });
    expect(again.map((row) => [row.job, row.step])).toEqual([
      ["a", 3],
      ["b", 2],
    ]);
    expect(withoutJob(again, "a").map((row) => row.job)).toEqual(["b"]);
  });

  it("should read broken storage as an empty queue", () => {
    expect(parseParked("not json")).toEqual([]);
    expect(parseParked(null)).toEqual([]);
    expect(parseParked('[{"job":"a"}]')).toEqual([]);
  });
});
