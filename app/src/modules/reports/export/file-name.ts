// Ονόματα αρχείων των εξαγωγών: ελληνικά, χωρίς χαρακτήρες που δεν δέχονται τα Windows ή το macOS.

const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001F]+/g;
const MAX_NAME = 120;

// «Τιμολόγια», «2026-01-01 – 2026-12-31» → «Τιμολόγια 2026-01-01 – 2026-12-31». Κενά κομμάτια παραλείπονται.
export const fileBase = (
  parts: readonly (string | null | undefined)[],
): string => {
  const name = parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.replace(FORBIDDEN, " ").replace(/\s+/g, " ").trim())
    .join(" ")
    .replace(/^\.+/, "")
    .slice(0, MAX_NAME)
    .trim();
  return name || "Εξαγωγή";
};

export const fileName = (
  parts: readonly (string | null | undefined)[],
  extension: string,
): string => `${fileBase(parts)}.${extension}`;

// Το διάστημα μιας Περιόδου για το όνομα αρχείου.
export const periodPart = (
  period: { from: string; to: string } | null | undefined,
): string | null => (period ? `${period.from} – ${period.to}` : null);

// Μοναδικό όνομα μέσα σε ένα zip: «A-1 Πελάτης.pdf», «A-1 Πελάτης (2).pdf», …
export const uniqueName = (
  base: string,
  extension: string,
  used: ReadonlySet<string>,
): string => {
  const lower = (name: string) => name.toLowerCase();
  const taken = new Set([...used].map(lower));
  let name = `${base}.${extension}`;
  for (let n = 2; taken.has(lower(name)); n += 1)
    name = `${base} (${n}).${extension}`;
  return name;
};
