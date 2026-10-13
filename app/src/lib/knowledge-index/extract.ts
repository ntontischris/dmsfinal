import { strFromU8, unzipSync } from "fflate";
import { extractText as extractPdfText } from "unpdf";

import { normalizeText } from "./chunk";

// Το κείμενο ενός Αρχείου Γνώσης (κανόνας #3): όλο το κείμενο PDF, DOCX, PPTX. Εικόνα ή σχεδόν άδειο κείμενο (π.χ. σαρωμένο)
// = «μόνο εικόνα»: ο Βοηθός διαβάζει τίτλο και Περίληψη. Αρχείο που δεν ανοίγει = «failed», με τον ίδιο τρόπο.

export type ExtractStatus = "ok" | "image_only" | "failed";
export interface Extracted {
  status: ExtractStatus;
  text: string;
}

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
// Όρια αποσυμπίεσης (zip bomb): μέγεθος ενός XML και όλων μαζί, όπως τα δηλώνει το zip. Πέρα από αυτά → «failed».
export const MAX_ZIP_ENTRY_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_TOTAL_BYTES = 20 * 1024 * 1024;
// Λιγότεροι χαρακτήρες (χωρίς κενά) από αυτούς = το Αρχείο είναι ουσιαστικά εικόνα.
export const MIN_TEXT_CHARS = 40;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const decodeXml = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X"))
      return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith("#"))
      return String.fromCodePoint(parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? whole;
  });

// Το κείμενο των <w:t> / <a:t> ενός XML του Office, με αλλαγή γραμμής στο τέλος κάθε παραγράφου.
export function officeXmlText(xml: string, prefix: "w" | "a"): string {
  const paragraphs = xml.split(new RegExp(`</${prefix}:p>`));
  const runs = new RegExp(
    `<${prefix}:t(?:\\s[^>]*)?>([^<]*)</${prefix}:t>`,
    "g",
  );
  return paragraphs
    .map((paragraph) =>
      [...paragraph.matchAll(runs)]
        .map((match) => decodeXml(match[1] ?? ""))
        .join(""),
    )
    .filter((line) => line.trim() !== "")
    .join("\n");
}

const slideNumber = (name: string): number =>
  Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);

function zipText(bytes: Uint8Array, mime: string): string {
  const isDocx = mime === DOCX;
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      const wanted = isDocx
        ? file.name === "word/document.xml"
        : /^ppt\/slides\/slide\d+\.xml$/.test(file.name);
      if (!wanted) return false;
      total += file.originalSize;
      if (
        file.originalSize > MAX_ZIP_ENTRY_BYTES ||
        total > MAX_ZIP_TOTAL_BYTES
      )
        throw new Error("Το Αρχείο αποσυμπιέζεται σε πάρα πολλά δεδομένα");
      return true;
    },
  });
  const names = Object.keys(files).sort(
    (a, b) => slideNumber(a) - slideNumber(b),
  );
  return names
    .map((name) => officeXmlText(strFromU8(files[name]!), isDocx ? "w" : "a"))
    .join("\n\n");
}

async function rawText(
  bytes: Uint8Array,
  mime: string,
): Promise<string | null> {
  if (mime === "application/pdf") {
    const { text } = await extractPdfText(new Uint8Array(bytes), {
      mergePages: true,
    });
    return text;
  }
  if (mime === DOCX || mime === PPTX) return zipText(bytes, mime);
  return null;
}

export async function extractFileText(
  bytes: Uint8Array,
  mime: string,
): Promise<Extracted> {
  if (mime.startsWith("image/")) return { status: "image_only", text: "" };
  try {
    const raw = await rawText(bytes, mime);
    if (raw === null) return { status: "failed", text: "" };
    const text = normalizeText(raw);
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS)
      return { status: "image_only", text: "" };
    return { status: "ok", text };
  } catch (error) {
    console.error(
      "extractFileText",
      error instanceof Error ? error.message : error,
    );
    return { status: "failed", text: "" };
  }
}
