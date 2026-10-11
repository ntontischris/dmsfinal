import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { attachmentName, invoiceMessageFor, type InvoiceBody } from "./deliver-invoice";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const PATH = "pending/6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f.pdf";
const INVALID = "Μη έγκυρο περιεχόμενο ειδοποίησης";
const MISSING = "Το PDF του Τιμολογίου δεν βρέθηκε";

const payload = {
  invoiceId: "inv-1",
  kind: "invoice",
  number: "87",
  issueDate: "2026-06-03",
  dueDate: "2026-06-23",
  total: 1612,
  pdfPath: PATH,
};

// Ψεύτικος admin client: το bucket επιστρέφει το αρχείο ή σφάλμα.
function adminWith(result: { data: Blob | null; error: { message: string } | null }): SupabaseClient {
  const bucket = { download: async () => result };
  return { storage: { from: () => bucket } } as unknown as SupabaseClient;
}

const pdfBlob = () => new Blob(["%PDF-1.4 φανταστικό"], { type: "application/pdf" });

describe("invoiceMessageFor", () => {
  it("should attach the downloaded PDF as base64 with a safe file name", async () => {
    const admin = adminWith({ data: pdfBlob(), error: null });

    const message = (await invoiceMessageFor(
      admin,
      { to_name: "Μαρία", locale: "el", payload },
      ORIGIN,
    )) as InvoiceBody;

    expect(message.subject).toBe("Νέο τιμολόγιο 87");
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments[0]?.filename).toBe("invoice-87.pdf");
    expect(Buffer.from(message.attachments[0]?.content ?? "", "base64").toString()).toContain("%PDF-1.4");
    expect(message.html).toContain(`${ORIGIN}/app/finance/invoices`);
  });

  it("should write the English subject for the en locale", async () => {
    const admin = adminWith({ data: pdfBlob(), error: null });

    const message = (await invoiceMessageFor(
      admin,
      { to_name: "Maria", locale: "en", payload: { ...payload, kind: "credit", dueDate: null } },
      ORIGIN,
    )) as InvoiceBody;

    expect(message.subject).toBe("New credit note 87");
    expect(message.text).not.toContain("Due date");
  });

  it("should fail the row with a short reason when the PDF is missing", async () => {
    const admin = adminWith({ data: null, error: { message: "Object not found" } });

    expect(await invoiceMessageFor(admin, { to_name: "Μαρία", locale: "el", payload }, ORIGIN)).toBe(MISSING);
  });

  it("should refuse a payload with a path outside pending", async () => {
    const admin = adminWith({ data: pdfBlob(), error: null });

    expect(
      await invoiceMessageFor(
        admin,
        { to_name: "Μαρία", locale: "el", payload: { ...payload, pdfPath: "other/x.pdf" } },
        ORIGIN,
      ),
    ).toBe(INVALID);
  });
});

describe("attachmentName", () => {
  it("should replace characters that email clients mishandle", () => {
    expect(attachmentName("credit", "Π-12/β")).toBe("credit-_-12_.pdf");
  });
});
