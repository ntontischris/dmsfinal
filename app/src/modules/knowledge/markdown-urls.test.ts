import { describe, expect, it } from "vitest";

import {
  articleImageSrc,
  imageMarkdown,
  safeImageUrl,
  safeLinkUrl,
} from "./markdown-urls";

const ITEM = "11111111-1111-4111-8111-111111111111";
const IMAGE = `/app/knowledge/${ITEM}/images/img-22222222-2222-4222-8222-222222222222.png`;

describe("safeLinkUrl", () => {
  it("should keep https and internal /app links", () => {
    expect(safeLinkUrl("https://example.com/video")).toBe(
      "https://example.com/video",
    );
    expect(safeLinkUrl("/app/book")).toBe("/app/book");
    expect(safeLinkUrl("/app")).toBe("/app");
  });

  it("should drop every other scheme and path", () => {
    expect(safeLinkUrl("http://example.com")).toBe("");
    expect(safeLinkUrl("javascript:alert(1)")).toBe("");
    expect(safeLinkUrl("data:text/html,x")).toBe("");
    expect(safeLinkUrl("//evil.example.com")).toBe("");
    expect(safeLinkUrl("/login")).toBe("");
    expect(safeLinkUrl("/app/../login")).toBe("");
  });
});

describe("safeImageUrl", () => {
  it("should only allow images stored in the Knowledge", () => {
    expect(safeImageUrl(IMAGE)).toBe(IMAGE);
    expect(safeImageUrl("https://example.com/pixel.png")).toBe("");
    expect(safeImageUrl(`/app/knowledge/${ITEM}/file`)).toBe("");
  });
});

describe("image markdown", () => {
  it("should build the image route from the storage path", () => {
    expect(
      articleImageSrc(
        ITEM,
        `${ITEM}/img-22222222-2222-4222-8222-222222222222.png`,
      ),
    ).toBe(IMAGE);
  });

  it("should strip markdown characters from the alt text", () => {
    expect(imageMarkdown("σχέδιο [1].png", IMAGE)).toBe(
      `![σχέδιο 1.png](${IMAGE})`,
    );
    expect(imageMarkdown("[]", IMAGE)).toBe(`![εικόνα](${IMAGE})`);
  });
});
