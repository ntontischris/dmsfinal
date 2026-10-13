import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

import { extractFileText, MAX_ZIP_ENTRY_BYTES, MAX_ZIP_TOTAL_BYTES, officeXmlText } from "./extract";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const LONG = "Η Devre Media γυρίζει βίντεο για μικρές επιχειρήσεις σε όλη την Ελλάδα.";

const paragraph = (prefix: "w" | "a", text: string) =>
  `<${prefix}:p><${prefix}:r><${prefix}:t xml:space="preserve">${text}</${prefix}:t></${prefix}:r></${prefix}:p>`;

const docx = (...paragraphs: string[]) =>
  zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "word/document.xml": strToU8(`<w:document><w:body>${paragraphs.map((p) => paragraph("w", p)).join("")}</w:body></w:document>`),
  });

const pptx = (slides: Record<number, string>) =>
  zipSync(
    Object.fromEntries(
      Object.entries(slides).map(([n, text]) => [`ppt/slides/slide${n}.xml`, strToU8(`<p:sld>${paragraph("a", text)}</p:sld>`)]),
    ),
  );

// Ελάχιστο PDF με ένα κείμενο (Helvetica, ASCII) και σωστό πίνακα xref.
function pdf(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 712 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return strToU8(body);
}

describe("officeXmlText", () => {
  it("ενώνει τα runs μιας παραγράφου και αποκωδικοποιεί τα entities", () => {
    const xml = `<w:p><w:r><w:t>Γύρισμα &amp; </w:t></w:r><w:r><w:t>μοντάζ</w:t></w:r></w:p><w:p><w:r><w:t>&#x391;&#x392;</w:t></w:r></w:p>`;
    expect(officeXmlText(xml, "w")).toBe("Γύρισμα & μοντάζ\nΑΒ");
  });
});

describe("extractFileText", () => {
  it("DOCX: όλο το κείμενο, μία γραμμή ανά παράγραφο", async () => {
    expect(await extractFileText(docx(LONG, "Δεύτερη παράγραφος."), DOCX)).toEqual({
      status: "ok",
      text: `${LONG}\nΔεύτερη παράγραφος.`,
    });
  });

  it("PPTX: οι διαφάνειες με τη σειρά τους (2 πριν από 10)", async () => {
    const result = await extractFileText(pptx({ 10: "Τέλος της παρουσίασης.", 2: LONG }), PPTX);
    expect(result.status).toBe("ok");
    expect(result.text).toBe(`${LONG}\n\nΤέλος της παρουσίασης.`);
  });

  it("PDF: το κείμενο της σελίδας", async () => {
    const result = await extractFileText(pdf("Devre Media films videos for small businesses across Greece."), "application/pdf");
    expect(result).toEqual({ status: "ok", text: "Devre Media films videos for small businesses across Greece." });
  });

  it("σχεδόν άδειο κείμενο (σαρωμένο): μόνο εικόνα", async () => {
    expect(await extractFileText(docx("Σελίδα 1"), DOCX)).toEqual({ status: "image_only", text: "" });
  });

  it("εικόνα: μόνο εικόνα, χωρίς ανάγνωση", async () => {
    expect(await extractFileText(new Uint8Array([1, 2, 3]), "image/png")).toEqual({ status: "image_only", text: "" });
  });

  it("zip bomb: ένα XML πάνω από το όριο → failed, χωρίς αποσυμπίεση", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const huge = zipSync({ "word/document.xml": new Uint8Array(MAX_ZIP_ENTRY_BYTES + 1) });
    expect(await extractFileText(huge, DOCX)).toEqual({ status: "failed", text: "" });
  });

  it("zip bomb: διαφάνειες που μαζί ξεπερνούν το όριο → failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const slide = new Uint8Array(Math.floor(MAX_ZIP_TOTAL_BYTES / 3) + 1);
    const bomb = zipSync({ "ppt/slides/slide1.xml": slide, "ppt/slides/slide2.xml": slide, "ppt/slides/slide3.xml": slide });
    expect(await extractFileText(bomb, PPTX)).toEqual({ status: "failed", text: "" });
  });

  it("χαλασμένο αρχείο: failed, χωρίς να σκάει", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await extractFileText(strToU8("όχι zip"), DOCX)).toEqual({ status: "failed", text: "" });
  });
});
