import { describe, expect, it } from "vitest";

import { calendarHref, parseCalendarParams } from "./url-state";

const TODAY = "2026-10-11";

describe("parseCalendarParams", () => {
  it("should default to the week of today with every layer on", () => {
    expect(parseCalendarParams({}, TODAY)).toEqual({
      view: "week",
      date: TODAY,
      layers: ["filmings", "blocked", "nextSteps", "deadlines", "busy"],
      person: null,
    });
  });

  it("should keep the person as «me» or a member id and drop anything else", () => {
    const member = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(parseCalendarParams({ person: "me" }, TODAY).person).toBe("me");
    expect(parseCalendarParams({ person: member }, TODAY).person).toBe(member);
    expect(parseCalendarParams({ person: "Νίκος" }, TODAY).person).toBeNull();
  });

  it("should fall back to the defaults when the view or the day is not valid", () => {
    const parsed = parseCalendarParams({ view: "year", date: "2026-02-30" }, TODAY);
    expect(parsed.view).toBe("week");
    expect(parsed.date).toBe(TODAY);
  });

  it("should keep a valid month view and day", () => {
    const parsed = parseCalendarParams({ view: "month", date: "2026-12-01" }, TODAY);
    expect(parsed).toMatchObject({ view: "month", date: "2026-12-01" });
  });

  it("should keep only the layers named in the url", () => {
    const parsed = parseCalendarParams({ layers: "blocked,unknown" }, TODAY);
    expect(parsed.layers).toEqual(["blocked"]);
  });

  it("should read the first value when a parameter repeats", () => {
    expect(parseCalendarParams({ view: ["list", "week"] }, TODAY).view).toBe("list");
  });
});

describe("calendarHref", () => {
  it("should write the view, the day and the layers", () => {
    const params = { view: "week" as const, date: TODAY, layers: ["filmings" as const], person: null };
    expect(calendarHref(params, { view: "list" })).toBe(
      "/app/calendar?view=list&date=2026-10-11&layers=filmings",
    );
  });

  it("should write the person only when one is picked", () => {
    const params = { view: "week" as const, date: TODAY, layers: ["filmings" as const], person: null };
    expect(calendarHref(params, { person: "me" })).toBe(
      "/app/calendar?view=week&date=2026-10-11&layers=filmings&person=me",
    );
  });
});
