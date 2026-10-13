import { describe, expect, it } from "vitest";

import { buildChunks, CHUNK_MAX_CHARS, chunkHeader, normalizeText, splitText } from "./chunk";

const header = { sectionName: "Οδηγοί πελάτη", title: "Πώς κλείνω Γύρισμα", summary: "Τα βήματα της Κράτησης." };

describe("chunkHeader", () => {
  it("Ενότητα · τίτλος · Περίληψη, χωρίς κενά μέρη", () => {
    expect(chunkHeader(header)).toBe("Οδηγοί πελάτη · Πώς κλείνω Γύρισμα · Τα βήματα της Κράτησης.");
    expect(chunkHeader({ ...header, summary: "" })).toBe("Οδηγοί πελάτη · Πώς κλείνω Γύρισμα");
  });
});

describe("normalizeText", () => {
  it("σβήνει χαρακτήρες ελέγχου και περιττά κενά, κρατά παραγράφους", () => {
    expect(normalizeText("Α\u0000Β   Γ\r\n\r\n\r\n\r\nΔ")).toBe("Α Β Γ\n\nΔ");
  });
});

describe("splitText", () => {
  it("σύντομο κείμενο: ένα κομμάτι", () => {
    expect(splitText("Μία πρόταση.")).toEqual(["Μία πρόταση."]);
  });

  it("άδειο κείμενο: κανένα κομμάτι", () => {
    expect(splitText("   ")).toEqual([]);
  });

  it("μεγάλο κείμενο: κομμάτια έως το όριο, με επικάλυψη, σε τέλος πρότασης", () => {
    const sentence = "Η ομάδα ετοιμάζει το Γύρισμα με προσοχή. ";
    const text = sentence.repeat(200);
    const parts = splitText(text);
    expect(parts.length).toBeGreaterThan(3);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
    expect(parts[0]?.endsWith(".")).toBe(true);
    const tail = parts[0]?.slice(-50) ?? "";
    expect(parts[1]?.includes(tail.trim().slice(0, 30))).toBe(true);
  });

  it("λέξη χωρίς κενά πάνω από το όριο κόβεται στο όριο", () => {
    const parts = splitText("α".repeat(CHUNK_MAX_CHARS * 2), CHUNK_MAX_CHARS, 0);
    expect(parts.map((part) => part.length)).toEqual([CHUNK_MAX_CHARS, CHUNK_MAX_CHARS]);
  });
});

describe("buildChunks", () => {
  it("κάθε κομμάτι ξεκινά με την κεφαλίδα", () => {
    const chunks = buildChunks(header, "Ανοίγεις την Κράτηση.\n\nΔιαλέγεις μέρα.");
    expect(chunks).toEqual([`${chunkHeader(header)}\n\nΑνοίγεις την Κράτηση.\n\nΔιαλέγεις μέρα.`]);
  });

  it("χωρίς κείμενο (Αρχείο-εικόνα): ένα κομμάτι μόνο με την κεφαλίδα", () => {
    expect(buildChunks(header, "")).toEqual([chunkHeader(header)]);
  });
});
