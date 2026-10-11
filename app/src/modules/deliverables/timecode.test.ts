import { describe, expect, it } from "vitest";

import { formatTimecode, parseTimecode } from "./timecode";

describe("parseTimecode", () => {
  it("should read mm:ss as seconds", () => {
    expect(parseTimecode("0:42")).toBe(42);
    expect(parseTimecode("1:15")).toBe(75);
    expect(parseTimecode("12:05")).toBe(725);
  });

  it("should give null for an empty time, which means no time", () => {
    expect(parseTimecode("   ")).toBeNull();
  });

  it("should refuse a time that is not mm:ss", () => {
    expect(parseTimecode("42")).toBeUndefined();
    expect(parseTimecode("1:75")).toBeUndefined();
    expect(parseTimecode("a:b")).toBeUndefined();
  });

  it("should refuse a time past the 23:59:59 limit of the database", () => {
    expect(parseTimecode("99:59")).toBe(5999);
    expect(parseTimecode("1440:00")).toBeUndefined();
  });
});

describe("formatTimecode", () => {
  it("should write seconds back as m:ss with two digits for the seconds", () => {
    expect(formatTimecode(42)).toBe("0:42");
    expect(formatTimecode(75)).toBe("1:15");
    expect(formatTimecode(65)).toBe("1:05");
  });
});
