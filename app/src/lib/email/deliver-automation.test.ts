import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { automationMessageFor } from "./deliver-automation";
import { absoluteLink, bodyParagraphs } from "./templates/automation-messages";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const INVALID = "Μη έγκυρο περιεχόμενο ειδοποίησης";
const TOKEN = "a".repeat(64);
const PDF_PATH = "pending/7d1f2a3e-4b5c-4d6e-8f70-123456789abc.pdf";

// Ψεύτικο service role: μόνο το bucket των Τιμολογίων (κατεβάζει ένα «PDF» ή τίποτα).
function fakeAdmin(hasPdf = true) {
  const download = vi.fn(async () =>
    hasPdf
      ? { data: new Blob(["%PDF-1.4"]), error: null }
      : { data: null, error: { message: "not found" } },
  );
  const admin = { storage: { from: () => ({ download }) } };
  return admin as unknown as SupabaseClient;
}

const row = (payload: Record<string, unknown>, locale = "el") => ({
  to_name: "Μαρία",
  locale,
  payload,
});

const VALID = {
  subject: "Νέα Έκδοση για έγκριση: Reel καφέ",
  body: "Γεια σας Μαρία,\n\nη Έκδοση 2 του Reel καφέ σας περιμένει.",
  link: "/app/deliverables/d-1",
  automationId: "a-1",
};

const message = async (payload: Record<string, unknown>, locale = "el") => {
  const result = await automationMessageFor(
    fakeAdmin(),
    row(payload, locale),
    ORIGIN,
  );
  if (typeof result === "string") throw new Error(result);
  return result;
};

// Ένα μπλοκ ανά Γεγονός, όπως το γράφει το authz.ev_email_details (το Γύρισμα: 12/10/2026 11:30 UTC = 14:30 Αθήνα).
const DETAILS: Record<string, Record<string, unknown>> = {
  "filming.decided (εγκρίθηκε)": {
    kind: "filming.decided",
    filmingId: "f-1",
    decision: "approved",
    startsAt: "2026-10-12T11:30:00+00:00",
    hours: 2,
  },
  "filming.decided (απορρίφθηκε)": {
    kind: "filming.decided",
    filmingId: "f-1",
    decision: "rejected",
    startsAt: "2026-10-12T11:30:00+00:00",
    hours: 2,
    reason: "Κλειστό στούντιο",
  },
  "filming.decided (μετάθεση απορρίφθηκε)": {
    kind: "filming.decided",
    filmingId: "f-1",
    decision: "reschedule_rejected",
    startsAt: "2026-10-12T11:30:00+00:00",
    hours: 1,
    reason: "Γεμάτη ώρα",
  },
  "filming.rescheduled": {
    kind: "filming.rescheduled",
    filmingId: "f-1",
    startsAt: "2026-10-13T11:30:00+00:00",
    hours: 2,
    previousStartsAt: "2026-10-12T11:30:00+00:00",
  },
  "filming.sheet_issued": {
    kind: "filming.sheet_issued",
    filmingId: "f-1",
    version: 2,
    startsAt: "2026-10-12T11:30:00+00:00",
    hours: 2,
    location: "Αθήνα",
    production: "Reel καφέ",
    change: "Άλλαξε το Συνεργείο",
  },
  "filming.crew_declined": {
    kind: "filming.crew_declined",
    filmingId: "f-1",
    member: "Κώστας",
    reason: "Ταξίδι",
    startsAt: "2026-10-12T11:30:00+00:00",
    production: "Reel καφέ",
  },
  "deliverable.version_sent": {
    kind: "deliverable.version_sent",
    deliverableId: "d-1",
    title: "Reel καφέ",
    production: "Μηνιαίο",
    version: 2,
    roundsUsed: 1,
    roundsLimit: 3,
  },
  "production.delivered": {
    kind: "production.delivered",
    productionId: "p-1",
    title: "Μηνιαίο",
    deliverables: [
      { title: "Reel", finalFilesUrl: "https://drive.example.com/final" },
      { title: "Story", url: "https://vimeo.com/1" },
      { title: "Σημείωση" },
    ],
  },
  "invoice.registered": {
    kind: "invoice.registered",
    invoiceId: "i-1",
    docKind: "invoice",
    number: "87",
    issueDate: "2026-06-03",
    dueDate: "2026-06-23",
    total: 1612,
    pdfPath: PDF_PATH,
  },
  "request.closed": {
    kind: "request.closed",
    clientName: "Κυψέλη Καφέ",
    requestKind: "deliverable",
    outcome: "done",
    comment: "Έτοιμο",
    link: "https://example.com/reel",
    deliverableId: "d-9",
  },
};

describe("bodyParagraphs", () => {
  it("should start a new paragraph at every blank line and drop empty ones", () => {
    expect(bodyParagraphs("Α\n\nΒ\r\n  \r\nΓ\n\n\n")).toEqual(["Α", "Β", "Γ"]);
  });

  it("should keep single line breaks inside the same paragraph", () => {
    expect(bodyParagraphs("γραμμή 1\nγραμμή 2")).toEqual([
      "γραμμή 1\nγραμμή 2",
    ]);
  });
});

describe("absoluteLink", () => {
  it("should put an internal path on the origin", () => {
    expect(absoluteLink(ORIGIN, "/app/messages?tab=requests")).toBe(
      `${ORIGIN}/app/messages?tab=requests`,
    );
  });

  it("should keep an https link and fall back to the DMS home otherwise", () => {
    expect(absoluteLink(ORIGIN, "https://drive.example.com/x")).toBe(
      "https://drive.example.com/x",
    );
    expect(absoluteLink(ORIGIN, null)).toBe(`${ORIGIN}/app`);
    expect(absoluteLink(ORIGIN, "javascript:alert(1)")).toBe(`${ORIGIN}/app`);
  });
});

describe("automationMessageFor", () => {
  it.each(["el", "en"])(
    "should render subject, paragraphs and the open button (%s)",
    async (locale) => {
      expect(await message(VALID, locale)).toMatchSnapshot();
    },
  );

  it("should escape the text of the automation", async () => {
    const result = await message({
      ...VALID,
      subject: "<b>Θέμα</b>",
      body: "Α & <script>x</script>",
    });
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&#60;script&#62;");
    expect(result.subject).toBe("<b>Θέμα</b>");
  });

  it("should open the DMS home when there is no link", async () => {
    const result = await message({ ...VALID, link: null });
    expect(result.text).toContain(`Άνοιγμα στο DMS: ${ORIGIN}/app`);
  });

  it("should refuse a payload without subject or with an unsafe link", async () => {
    const refuse = async (payload: Record<string, unknown>) =>
      automationMessageFor(fakeAdmin(), row(payload), ORIGIN);
    expect(await refuse({ ...VALID, subject: " " })).toBe(INVALID);
    expect(await refuse({ ...VALID, link: "http://x.example.com" })).toBe(
      INVALID,
    );
    expect(await refuse({ ...VALID, unsubscribeToken: "short" })).toBe(INVALID);
  });
});

describe("automationMessageFor: μπλοκ λεπτομερειών", () => {
  it("should send the email without the block and log when the block does not match", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await message({ ...VALID, details: { kind: "filming.day" } });
    expect(result.text).toContain("η Έκδοση 2 του Reel καφέ σας περιμένει.");
    expect(result.attachments).toBeUndefined();
    expect(log).toHaveBeenCalledWith("automation details", expect.any(String));
    log.mockRestore();
  });

  it.each(Object.entries(DETAILS))(
    "should render the block of %s under the text",
    async (_name, details) => {
      const result = await message({ ...VALID, details });
      expect(result.text).toMatchSnapshot();
    },
  );

  it("should render the block in English for an English recipient", async () => {
    const result = await message(
      { ...VALID, details: DETAILS["filming.decided (απορρίφθηκε)"] },
      "en",
    );
    expect(result.text).toContain("Your filming was not approved.");
    expect(result.text).toContain("Reason: Κλειστό στούντιο");
  });

  it("should attach the invoice PDF", async () => {
    const result = await message({
      ...VALID,
      details: DETAILS["invoice.registered"],
    });
    expect(result.attachments).toEqual([
      {
        filename: "invoice-87.pdf",
        content: Buffer.from("%PDF-1.4").toString("base64"),
      },
    ]);
  });

  it("should fail when the invoice PDF is missing", async () => {
    const result = await automationMessageFor(
      fakeAdmin(false),
      row({ ...VALID, details: DETAILS["invoice.registered"] }),
      ORIGIN,
    );
    expect(result).toBe("Το PDF του Τιμολογίου δεν βρέθηκε");
  });
});

describe("automationMessageFor: σύνδεσμος διακοπής", () => {
  it("should add the unsubscribe link and the List-Unsubscribe header", async () => {
    const result = await message({ ...VALID, unsubscribeToken: TOKEN });
    expect(result.text).toContain(
      `Να μη λαμβάνω αυτά τα email: ${ORIGIN}/u/${TOKEN}`,
    );
    expect(result.html).toContain(`${ORIGIN}/u/${TOKEN}`);
    expect(result.headers).toEqual({
      "List-Unsubscribe": `<${ORIGIN}/u/${TOKEN}>`,
    });
  });

  it("should leave an essential email without unsubscribe link or header", async () => {
    const result = await message(VALID);
    expect(result.text).not.toContain("/u/");
    expect(result.headers).toBeUndefined();
  });
});
