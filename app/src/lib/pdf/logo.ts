import { readFileSync } from "node:fs";
import path from "node:path";

// Το λογότυπο ενός PDF: της Εταιρείας αν ο Ιδιοκτήτης ανέβασε PNG ή JPG, αλλιώς το οριζόντιο λογότυπο του brand.
// Το react-pdf διαβάζει μόνο PNG και JPG: SVG και WebP (που επιτρέπει το ανέβασμα) πέφτουν στο λογότυπο του brand.
// Κρίνουμε από τα bytes, όχι από τον τύπο που δηλώθηκε, ώστε ένα χαλασμένο αρχείο να μη φτάσει στο render.

export interface PdfLogo {
  data: Buffer;
  format: "png" | "jpg";
  isFallback: boolean;
}

// Δομικά ίδιο με το LogoFile του module Ρυθμίσεις· το lib δεν εξαρτάται από modules.
export interface LogoBytes {
  bytes: Uint8Array;
}

export const FALLBACK_LOGO_PATH = path.join(
  process.cwd(),
  "public/brand/logo-horizontal-light.png",
);

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPG = [0xff, 0xd8, 0xff];

const startsWith = (bytes: Uint8Array, magic: readonly number[]): boolean =>
  bytes.length > magic.length && magic.every((byte, i) => bytes[i] === byte);

// Ένα PNG ξεκινά με την υπογραφή και αμέσως το IHDR με πλάτος και ύψος· ένα JPG κλείνει με FFD9.
// Το react-pdf παραλείπει σιωπηλά μια εικόνα που δεν διαβάζει: χωρίς αυτόν τον έλεγχο το PDF θα έβγαινε χωρίς λογότυπο.
const isWholePng = (bytes: Uint8Array): boolean => {
  if (!startsWith(bytes, PNG) || bytes.length < 33) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const isHeader = String.fromCharCode(...bytes.subarray(12, 16)) === "IHDR";
  return isHeader && view.getUint32(16) > 0 && view.getUint32(20) > 0;
};

const isWholeJpg = (bytes: Uint8Array): boolean =>
  startsWith(bytes, JPG) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;

const formatOf = (bytes: Uint8Array): PdfLogo["format"] | null => {
  if (isWholePng(bytes)) return "png";
  if (isWholeJpg(bytes)) return "jpg";
  return null;
};

let fallback: PdfLogo | null = null;

export const fallbackLogo = (): PdfLogo => {
  fallback ??= {
    data: readFileSync(FALLBACK_LOGO_PATH),
    format: "png",
    isFallback: true,
  };
  return fallback;
};

export const pdfLogoOf = (file: LogoBytes | null): PdfLogo => {
  const format = file ? formatOf(file.bytes) : null;
  if (!file || !format) return fallbackLogo();
  return { data: Buffer.from(file.bytes), format, isFallback: false };
};
