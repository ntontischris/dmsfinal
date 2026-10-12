import { describe, expect, it } from "vitest";

import { toReplyTo } from "./reply-to";

describe("toReplyTo", () => {
  it("should keep a valid address without surrounding spaces", () => {
    expect(toReplyTo("  hello@studio.example.com ")).toBe(
      "hello@studio.example.com",
    );
  });

  it("should drop an empty, invalid or missing address", () => {
    expect(toReplyTo("")).toBeUndefined();
    expect(toReplyTo("όχι email")).toBeUndefined();
    expect(toReplyTo(null)).toBeUndefined();
  });
});
