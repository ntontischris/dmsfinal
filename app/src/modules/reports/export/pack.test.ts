import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { mapLimit } from "@/lib/export/map-limit";

import type { ExportSheet } from "./columns";
import {
  buildAccountantPack,
  packFileName,
  type PackPayload,
} from "./pack";

const INVOICES: ExportSheet = {
  name: "Τιμολόγια",
  columns: [
    { header: "Αριθμός", type: "text" },
    { header: "Σύνολο", type: "money" },
  ],
  rows: [
    ["A-1", 124],
    ["A-2", 62],
    ["B/1", 248],
    ["B-2", 10],
  ],
};

const RECEIPTS: ExportSheet = {
  name: "Εισπράξεις",
  columns: [{ header: "Ποσό", type: "money" }],
  rows: [[124]],
};

const payload = (overrides: Partial<PackPayload> = {}): PackPayload => ({
  month: "2026-09",
  monthLabel: "Σεπτέμβριος 2026",
  isPartial: false,
  invoices: INVOICES,
  receipts: RECEIPTS,
  files: [
    {
      number: "A-1",
      clientName: "Πελάτης Α",
      url: "https://storage.example/a1",
      missing: null,
    },
    {
      number: "A-2",
      clientName: "Πελάτης Α",
      url: "https://storage.example/a2",
      missing: null,
    },
    {
      number: "B/1",
      clientName: "Πελάτης Β",
      url: null,
      missing: "Το PDF δεν βρέθηκε στην αποθήκευση",
    },
    {
      number: "B-2",
      clientName: "Πελάτης Β",
      url: "https://storage.example/broken",
      missing: null,
    },
  ],
  ...overrides,
});

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const fakeFetch = async (url: string): Promise<Uint8Array | null> => {
  if (url.endsWith("broken")) throw new Error("network");
  return PDF;
};

const unzip = async (p: PackPayload) => {
  const pack = await buildAccountantPack(p, fakeFetch);
  return { pack, files: unzipSync(pack.bytes) };
};

describe("buildAccountantPack", () => {
  it("should zip one workbook, the PDFs it fetched and a README", async () => {
    const { files, pack } = await unzip(payload());
    expect(Object.keys(files).sort()).toEqual([
      "Πακέτο λογιστή 2026-09/PDF/A-1 Πελάτης Α.pdf",
      "Πακέτο λογιστή 2026-09/PDF/A-2 Πελάτης Α.pdf",
      "Πακέτο λογιστή 2026-09/ΔΙΑΒΑΣΕ.txt",
      "Πακέτο λογιστή 2026-09/Τιμολόγια και Εισπράξεις 2026-09.xlsx",
    ]);
    expect([...files["Πακέτο λογιστή 2026-09/PDF/A-1 Πελάτης Α.pdf"]]).toEqual([
      ...PDF,
    ]);
    expect(pack.fileName).toBe("Πακέτο λογιστή 2026-09.zip");
    expect(pack.pdfCount).toBe(2);
  });

  it("should list every invoice without a PDF, never skip it silently", async () => {
    const { files, pack } = await unzip(payload());
    expect(pack.missing.map((m) => m.number)).toEqual(["B/1", "B-2"]);
    const readme = strFromU8(files["Πακέτο λογιστή 2026-09/ΔΙΑΒΑΣΕ.txt"]);
    expect(readme).toContain("Τιμολόγια ΧΩΡΙΣ PDF σε αυτό το πακέτο (2):");
    expect(readme).toContain(
      "- B/1 · Πελάτης Β · Το PDF δεν βρέθηκε στην αποθήκευση",
    );
    expect(readme).toContain("- B-2 · Πελάτης Β · Το PDF δεν κατέβηκε");
  });

  it("should write two sheets with a PDF column on the invoices", async () => {
    const { files } = await unzip(payload());
    const workbook = unzipSync(
      files["Πακέτο λογιστή 2026-09/Τιμολόγια και Εισπράξεις 2026-09.xlsx"],
    );
    expect(strFromU8(workbook["xl/workbook.xml"])).toContain(
      'name="Εισπράξεις" sheetId="2"',
    );
    const invoices = strFromU8(workbook["xl/worksheets/sheet1.xml"]);
    expect(invoices).toContain("Αρχείο PDF");
    expect(invoices).toContain("PDF/A-1 Πελάτης Α.pdf");
    expect(invoices).toContain("Χωρίς PDF: Το PDF δεν βρέθηκε στην αποθήκευση");
  });

  it("should name two PDFs of the same invoice and client uniquely", async () => {
    const twin = {
      number: "A-1",
      clientName: "Πελάτης Α",
      url: "https://storage.example/x",
      missing: null,
    };
    const { files } = await unzip(
      payload({
        files: [twin, twin],
        invoices: { ...INVOICES, rows: INVOICES.rows.slice(0, 2) },
      }),
    );
    expect(Object.keys(files)).toContain(
      "Πακέτο λογιστή 2026-09/PDF/A-1 Πελάτης Α (2).pdf",
    );
  });

  it("should say so when all invoices have their PDF, and mark a month in progress", async () => {
    const { files } = await unzip(
      payload({
        files: [],
        invoices: { ...INVOICES, rows: [] },
        isPartial: true,
      }),
    );
    const readme = strFromU8(files["Πακέτο λογιστή 2026-09/ΔΙΑΒΑΣΕ.txt"]);
    expect(readme).toContain("Σεπτέμβριος 2026 (ως σήμερα)");
    expect(readme).toContain("Όλα τα Τιμολόγια έχουν το PDF τους");
  });
});

describe("mapLimit", () => {
  it("should keep the order and never run more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const result = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
      return n * 2;
    });
    expect(result).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("should handle an empty list", async () => {
    expect(await mapLimit([], 4, async (n: number) => n)).toEqual([]);
  });
});

describe("packFileName", () => {
  it("should name the zip after the month", () => {
    expect(packFileName("2026-09")).toBe("Πακέτο λογιστή 2026-09.zip");
  });
});
