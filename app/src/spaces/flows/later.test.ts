import { describe, expect, it } from "vitest";

import {
  closedSince,
  parseClosed,
  parseLater,
  withLater,
  withoutLater,
} from "./later";

describe("later", () => {
  it("should keep only numeric dates from storage", () => {
    expect(parseLater('{"a":5,"b":"x"}')).toEqual({ a: 5 });
    expect(parseLater("[1]")).toEqual({});
    expect(parseLater("not json")).toEqual({});
  });

  it("should postpone and restore rows by key", () => {
    const later = withLater({ a: 1 }, ["b", "c"], 9);
    expect(later).toEqual({ a: 1, b: 9, c: 9 });
    expect(withoutLater(later, ["a", "c"])).toEqual({ b: 9 });
  });

  it("should read closed jobs and filter them by day", () => {
    const closed = parseClosed(
      '[{"job":"x","at":10},{"job":1},{"job":"y","at":2}]',
    );
    expect(closed).toEqual([
      { job: "x", at: 10 },
      { job: "y", at: 2 },
    ]);
    expect(closedSince(closed, 5)).toEqual([{ job: "x", at: 10 }]);
  });
});
