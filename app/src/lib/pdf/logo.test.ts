import { describe, expect, it } from "vitest";

import { pdfLogoOf } from "./logo";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const bytesOf = (...bytes: number[]) => ({ bytes: Uint8Array.from(bytes) });

describe("pdfLogoOf", () => {
  it("should use the brand logo when there is no Company logo", () => {
    const logo = pdfLogoOf(null);
    expect(logo.isFallback).toBe(true);
    expect(logo.format).toBe("png");
    expect([...logo.data.subarray(0, 8)]).toEqual(PNG_MAGIC);
  });

  it("should keep a PNG Company logo", () => {
    const logo = pdfLogoOf({ bytes: TINY_PNG });
    expect(logo).toMatchObject({ format: "png", isFallback: false });
  });

  it("should keep a JPG Company logo", () => {
    const logo = pdfLogoOf(bytesOf(0xff, 0xd8, 0xff, 0xe0, 0, 0xff, 0xd9));
    expect(logo).toMatchObject({ format: "jpg", isFallback: false });
  });

  it("should use the brand logo for WebP, SVG or empty bytes", () => {
    const webp = { bytes: Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1") };
    const svg = {
      bytes: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
    };
    expect(pdfLogoOf(webp).isFallback).toBe(true);
    expect(pdfLogoOf(svg).isFallback).toBe(true);
    expect(pdfLogoOf(bytesOf()).isFallback).toBe(true);
  });

  it("should use the brand logo for a truncated PNG or JPG", () => {
    expect(pdfLogoOf(bytesOf(...PNG_MAGIC, 1, 2, 3)).isFallback).toBe(true);
    expect(pdfLogoOf({ bytes: TINY_PNG.subarray(0, 20) }).isFallback).toBe(
      true,
    );
    expect(pdfLogoOf(bytesOf(0xff, 0xd8, 0xff, 0xe0, 0)).isFallback).toBe(true);
  });
});
