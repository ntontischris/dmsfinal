import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type { GdprExportData } from "./schemas";
import { buildGdprZip, sectionSheet, type GdprPayload } from "./zip";

const DATA: GdprExportData = {
  subject: { kind: "client", id: "c1", label: "Κυψέλη Καφέ" },
  sections: {
    details: { name: "Κυψέλη Καφέ", contactName: "Μαρία Παπαδάκη", afm: null },
    users: [
      {
        name: "Κώστας",
        email: "kostas@example.com",
        joinedAt: "2026-01-02T10:00:00+00:00",
        removedAt: null,
      },
    ],
    invoices: [
      {
        id: "i1",
        number: "Α-12",
        issueDate: "2026-01-25",
        total: 124.5,
        pdfPath: "c1/a-12.pdf",
      },
      {
        id: "i2",
        number: "Α-13",
        issueDate: "2026-02-25",
        total: 62,
        pdfPath: "c1/a-13.pdf",
      },
      {
        id: "i3",
        number: "Α/14",
        issueDate: "2026-03-25",
        total: 10,
        pdfPath: "c1/a-14.pdf",
      },
    ],
    receipts: [],
    messages: [
      {
        at: "2026-02-01T09:00:00+00:00",
        author: "Ελένη",
        body: "Γεια σας",
        isPublic: true,
      },
    ],
  },
};

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const FOLDER = "GDPR Κυψέλη Καφέ 2026-10-17";

const payload = (overrides: Partial<GdprPayload> = {}): GdprPayload => ({
  data: DATA,
  exportedOn: "2026-10-17",
  pdfs: [
    { number: "Α-12", url: "https://storage.example/a12", missing: null },
    {
      number: "Α-13",
      url: null,
      missing: "το αρχείο δεν βρέθηκε στην αποθήκευση",
    },
    { number: "Α/14", url: "https://storage.example/broken", missing: null },
  ],
  ...overrides,
});

const fakeFetch = async (url: string): Promise<Uint8Array | null> => {
  if (url.endsWith("broken")) throw new Error("network");
  return PDF;
};

const unzip = async (p: GdprPayload) => {
  const zip = await buildGdprZip(p, fakeFetch);
  return { zip, files: unzipSync(zip.bytes) };
};

describe("buildGdprZip", () => {
  it("should zip a README, the JSON, one CSV per non-empty section and the PDFs it fetched", async () => {
    const { files, zip } = await unzip(payload());
    expect(Object.keys(files).sort()).toEqual(
      [
        `${FOLDER}/Τιμολόγια PDF/Α-12.pdf`,
        `${FOLDER}/ΔΙΑΒΑΣΕ.txt`,
        `${FOLDER}/δεδομένα.json`,
        `${FOLDER}/Συνομιλία.csv`,
        `${FOLDER}/Τιμολόγια.csv`,
        `${FOLDER}/Χρήστες.csv`,
      ].sort(),
    );
    expect([...files[`${FOLDER}/Τιμολόγια PDF/Α-12.pdf`]]).toEqual([...PDF]);
    expect(zip.fileName).toBe(`${FOLDER}.zip`);
    expect(zip.pdfCount).toBe(1);
  });

  it("should list every invoice without a PDF explicitly, never skip it", async () => {
    const { files, zip } = await unzip(payload());
    expect(zip.missing.map((m) => m.number)).toEqual(["Α-13", "Α/14"]);
    const readme = strFromU8(files[`${FOLDER}/ΔΙΑΒΑΣΕ.txt`]);
    expect(readme).toContain("Τιμολόγια ΧΩΡΙΣ PDF σε αυτό το αρχείο (2):");
    expect(readme).toContain("- Α-13 · το αρχείο δεν βρέθηκε στην αποθήκευση");
    expect(readme).toContain("- Α/14 · το αρχείο δεν κατέβηκε");
    expect(readme).toContain(
      "Τα Εσωτερικά Μηνύματα της ομάδας δεν περιλαμβάνονται.",
    );
  });

  it("should keep the invoices in the JSON with their PDF file, without storage paths or ids", async () => {
    const { files } = await unzip(payload());
    const json = JSON.parse(strFromU8(files[`${FOLDER}/δεδομένα.json`]));
    expect(json.subject.label).toBe("Κυψέλη Καφέ");
    expect(json.sections.invoices).toEqual([
      {
        number: "Α-12",
        issueDate: "2026-01-25",
        total: 124.5,
        pdfFile: "Τιμολόγια PDF/Α-12.pdf",
      },
      {
        number: "Α-13",
        issueDate: "2026-02-25",
        total: 62,
        pdfFile: "Χωρίς PDF: το αρχείο δεν βρέθηκε στην αποθήκευση",
      },
      {
        number: "Α/14",
        issueDate: "2026-03-25",
        total: 10,
        pdfFile: "Χωρίς PDF: το αρχείο δεν κατέβηκε",
      },
    ]);
    expect(strFromU8(files[`${FOLDER}/δεδομένα.json`])).not.toContain(
      "c1/a-12.pdf",
    );
    const csv = strFromU8(files[`${FOLDER}/Τιμολόγια.csv`]);
    expect(csv).toContain("Αριθμός;Έκδοση;Σύνολο;Αρχείο PDF");
    expect(csv).toContain("Α-12;25/01/2026;124,50;Τιμολόγια PDF/Α-12.pdf");
  });

  it("should say so when every invoice has its PDF, and mention no PDFs when there are no invoices", async () => {
    const all = await unzip(
      payload({
        pdfs: [
          { number: "Α-12", url: "https://storage.example/a", missing: null },
        ],
      }),
    );
    expect(strFromU8(all.files[`${FOLDER}/ΔΙΑΒΑΣΕ.txt`])).toContain(
      "Όλα τα Τιμολόγια έχουν το PDF τους",
    );
    const person: GdprExportData = {
      subject: { kind: "team_user", id: "a4", label: "Λένα" },
      sections: { details: { name: "Λένα" }, messages: [] },
    };
    const none = await unzip(payload({ data: person, pdfs: [] }));
    const readme = strFromU8(none.files["GDPR Λένα 2026-10-17/ΔΙΑΒΑΣΕ.txt"]);
    expect(readme).toContain("Χρήστης ομάδας: Λένα");
    expect(readme).toContain("- Συνομιλία: 0");
    expect(readme).not.toContain("PDF");
  });
});

describe("sectionSheet", () => {
  it("should write Greek headers, Ναι/Όχι for booleans and empty cells for nulls", () => {
    const sheet = sectionSheet("messages", [
      { author: "Ελένη", body: "Γεια", isPublic: true, editedAt: null },
      { author: "Γιώργος", body: "Καλώς ήρθατε", isPublic: false },
    ]);
    expect(sheet.name).toBe("Συνομιλία");
    expect(sheet.columns.map((c) => c.header)).toEqual([
      "Από",
      "Κείμενο",
      "isPublic",
      "Διορθώθηκε",
    ]);
    expect(sheet.rows).toEqual([
      ["Ελένη", "Γεια", "Ναι", null],
      ["Γιώργος", "Καλώς ήρθατε", "Όχι", null],
    ]);
  });
});
