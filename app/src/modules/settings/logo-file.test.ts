import { describe, expect, it } from "vitest";

import {
  LOGO_MAX_BYTES,
  hasLogoSignature,
  isLogoFileOk,
  logoExtension,
} from "./logo-file";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

const fileOf = (size: number, type: string) =>
  new File([new Uint8Array(size)], "logo", { type });

describe("logo-file", () => {
  it("should accept png, jpeg and webp and refuse svg", () => {
    expect(logoExtension("image/png")).toBe("png");
    expect(logoExtension("image/jpeg")).toBe("jpg");
    expect(logoExtension("image/webp")).toBe("webp");
    expect(logoExtension("image/svg+xml")).toBeNull();
  });

  it("should refuse empty files and files over 1 MB", () => {
    expect(isLogoFileOk(fileOf(10, "image/png"))).toBe(true);
    expect(isLogoFileOk(fileOf(0, "image/png"))).toBe(false);
    expect(isLogoFileOk(fileOf(LOGO_MAX_BYTES + 1, "image/png"))).toBe(false);
    expect(isLogoFileOk(fileOf(10, "image/svg+xml"))).toBe(false);
    expect(isLogoFileOk("logo.png")).toBe(false);
  });

  it("should check the first bytes against the declared type", () => {
    expect(hasLogoSignature(new Uint8Array(PNG), "png")).toBe(true);
    expect(hasLogoSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "jpg")).toBe(true);
    expect(hasLogoSignature(new Uint8Array(WEBP), "webp")).toBe(true);
    expect(hasLogoSignature(new Uint8Array(PNG), "jpg")).toBe(false);
    expect(hasLogoSignature(new TextEncoder().encode("<svg></svg>"), "png")).toBe(false);
    expect(hasLogoSignature(new Uint8Array(PNG), "gif")).toBe(false);
  });
});
