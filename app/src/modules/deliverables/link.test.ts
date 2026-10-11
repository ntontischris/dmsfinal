import { describe, expect, it } from "vitest";

import { hostOf, linkProblem } from "./link";

describe("hostOf", () => {
  it("should read the host of an https link and drop www.", () => {
    expect(hostOf("https://www.youtube.com/watch?v=abc")).toBe("youtube.com");
    expect(hostOf("https://drive.google.com/file/d/abc")).toBe("drive.google.com");
  });

  it("should give null for a link that is not https", () => {
    expect(hostOf("http://drive.google.com/file/d/abc")).toBeNull();
    expect(hostOf("drive.google.com")).toBeNull();
  });
});

describe("linkProblem", () => {
  it("should accept the platforms of the database list", () => {
    expect(linkProblem("https://vimeo.com/123")).toBeNull();
    expect(linkProblem("https://youtu.be/xyz")).toBeNull();
    expect(linkProblem("https://docs.google.com/document/d/abc")).toBeNull();
  });

  it("should ask for https", () => {
    expect(linkProblem("http://vimeo.com/123")).toBe("Το link θέλει https.");
  });

  it("should refuse a platform that is not on the list", () => {
    expect(linkProblem("https://example.com/video")).toBe(
      "Το link δεν είναι από επιτρεπτή πλατφόρμα.",
    );
  });

  it("should refuse a link longer than 2000 characters", () => {
    const longUrl = `https://vimeo.com/${"a".repeat(2000)}`;
    expect(linkProblem(longUrl)).toBe("Το link είναι πολύ μεγάλο.");
  });
});
