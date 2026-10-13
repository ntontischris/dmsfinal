// Κομμάτια για τη μνήμη του Βοηθού: ~500–800 tokens με επικάλυψη, και σε κάθε κομμάτι κεφαλίδα (Ενότητα · τίτλος · Περίληψη),
// ώστε το embedding να ξέρει από πού είναι (contextual chunks, ADR 0016). Τα ελληνικά βγάζουν ~1 token ανά 2–3 χαρακτήρες,
// άρα τα όρια είναι σε χαρακτήρες: έως 1.800 (~600–900 tokens) με επικάλυψη 200.

export const CHUNK_MAX_CHARS = 1800;
export const CHUNK_OVERLAP_CHARS = 200;
export const MAX_CHUNKS = 200;

export interface ChunkHeader {
  sectionName: string;
  title: string;
  summary: string;
}

export const chunkHeader = ({
  sectionName,
  title,
  summary,
}: ChunkHeader): string =>
  [sectionName, title, summary]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");

// Κενά σε ένα, χωρίς χαρακτήρες ελέγχου (η Postgres δεν δέχεται \u0000), με κρατημένες τις παραγράφους.
export const normalizeText = (text: string): string =>
  text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Το τέλος ενός κομματιού: σε αλλαγή παραγράφου, αλλιώς σε τέλος πρότασης, αλλιώς σε κενό, αλλιώς στο όριο.
function cutAt(text: string, start: number, max: number): number {
  const end = start + max;
  if (end >= text.length) return text.length;
  const window = text.slice(start, end);
  const minimum = Math.floor(max / 2);
  for (const pattern of [
    /\n\n(?![\s\S]*\n\n)/,
    /[.;!?·]\s(?![\s\S]*[.;!?·]\s)/,
    /\s(?![\s\S]*\s)/,
  ]) {
    const found = window.search(pattern);
    if (found >= minimum) return start + found + 1;
  }
  return end;
}

export function splitText(
  text: string,
  max = CHUNK_MAX_CHARS,
  overlap = CHUNK_OVERLAP_CHARS,
): string[] {
  const clean = normalizeText(text);
  const parts: string[] = [];
  let start = 0;
  while (start < clean.length && parts.length < MAX_CHUNKS) {
    const end = cutAt(clean, start, max);
    const part = clean.slice(start, end).trim();
    if (part) parts.push(part);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return parts;
}

// Τα κομμάτια ενός στοιχείου. Χωρίς κείμενο (π.χ. Αρχείο-εικόνα): ένα κομμάτι μόνο με την κεφαλίδα.
export function buildChunks(header: ChunkHeader, text: string): string[] {
  const head = chunkHeader(header);
  const parts = splitText(text);
  if (parts.length === 0) return [head];
  return parts.map((part) => `${head}\n\n${part}`);
}
