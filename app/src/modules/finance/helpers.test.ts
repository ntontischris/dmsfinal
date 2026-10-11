import { describe, expect, it } from "vitest";

import { csvCell, receiptsToCsv } from "./helpers";
import type { ReceiptRow } from "./types";

const ROW: ReceiptRow = {
  id: "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f",
  clientId: "0b8c7d6e-5f4a-4b3c-8d2e-1f0a9b8c7d6e",
  clientName: "Κυψέλη Καφέ",
  receivedOn: "2026-10-05",
  amount: 300,
  methodId: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  methodLabel: "Τραπεζική κατάθεση",
  note: "Προκαταβολή",
  createdByName: "Γιώργος",
  deleted: false,
  deleteReason: null,
  canEdit: true,
};

describe("csvCell", () => {
  it("βάζει εισαγωγικά σε κείμενο με ελληνικό ερωτηματικό ή κόμμα", () => {
    expect(csvCell('λέξη "μία", δύο')).toBe('"λέξη ""μία"", δύο"');
  });

  it("προστατεύει από τύπους που ξεκινούν με =, +, -, @", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("-10")).toBe("'-10");
  });

  it("προστατεύει από tab και CR στην αρχή και βάζει εισαγωγικά σε CR", () => {
    expect(csvCell("\tcmd")).toBe("'\tcmd");
    expect(csvCell("α\rβ")).toBe('"α\rβ"');
  });
});

describe("receiptsToCsv", () => {
  it("γράφει επικεφαλίδα, ελληνικό BOM και την κατάσταση της διαγραφής", () => {
    const deleted: ReceiptRow = { ...ROW, deleted: true, deleteReason: "Διπλή" };
    const csv = receiptsToCsv([ROW, deleted]);
    expect(csv.startsWith("﻿Ημερομηνία;Πελάτης;Ποσό;Τρόπος;Σημείωση;Καταχώρησε;Κατάσταση")).toBe(true);
    expect(csv).toContain("05/10/2026");
    expect(csv).toContain("Ενεργή");
    expect(csv).toContain("Διαγράφηκε: Διπλή");
  });
});
