import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_MAX_BYTES,
  ERROR_TOO_BIG,
  ERROR_TOO_MANY,
  ERROR_TYPE,
  ERROR_VIDEO,
  extensionOf,
  firstAttachmentError,
  formatSize,
} from "./attachment-rules";

const pdf = (size = 1000) => ({
  name: "προσφορά.pdf",
  type: "application/pdf",
  size,
});

describe("firstAttachmentError", () => {
  it("should accept up to 5 files of an allowed type and size", () => {
    expect(
      firstAttachmentError(0, [pdf(), pdf(), pdf(), pdf(), pdf()]),
    ).toBeNull();
  });

  it("should count the files already chosen toward the limit of 5", () => {
    expect(firstAttachmentError(4, [pdf(), pdf()])).toBe(ERROR_TOO_MANY);
    expect(firstAttachmentError(4, [pdf()])).toBeNull();
  });

  it("should accept exactly 10 MB and reject one byte more", () => {
    expect(firstAttachmentError(0, [pdf(ATTACHMENT_MAX_BYTES)])).toBeNull();
    expect(firstAttachmentError(0, [pdf(ATTACHMENT_MAX_BYTES + 1)])).toBe(
      `προσφορά.pdf: ${ERROR_TOO_BIG}`,
    );
  });

  it("should tell video apart from other unsupported types", () => {
    expect(
      firstAttachmentError(0, [{ name: "a.mp4", type: "video/mp4", size: 10 }]),
    ).toBe(`a.mp4: ${ERROR_VIDEO}`);
    expect(
      firstAttachmentError(0, [
        { name: "a.zip", type: "application/zip", size: 10 },
      ]),
    ).toBe(`a.zip: ${ERROR_TYPE}`);
  });

  it("should reject an empty file", () => {
    expect(firstAttachmentError(0, [pdf(0)])).toContain("κενό");
  });
});

describe("extensionOf", () => {
  it("should map each allowed mime type to its extension", () => {
    expect(extensionOf("image/jpeg")).toBe("jpg");
    expect(extensionOf("application/pdf")).toBe("pdf");
    expect(
      extensionOf(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
  });

  it("should return null for a type that is not allowed", () => {
    expect(extensionOf("video/mp4")).toBeNull();
    expect(extensionOf("")).toBeNull();
  });
});

describe("formatSize", () => {
  it("should show bytes, kilobytes and megabytes", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5,0 MB");
  });
});
