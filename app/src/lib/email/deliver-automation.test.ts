import { describe, expect, it } from "vitest";

import { automationMessageFor } from "./deliver-automation";
import { absoluteLink, bodyParagraphs } from "./templates/automation-messages";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const INVALID = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const row = (payload: Record<string, unknown>, locale = "el") => ({
  locale,
  payload,
});

const VALID = {
  subject: "Νέα Έκδοση για έγκριση: Reel καφέ",
  body: "Γεια σας Μαρία,\n\nη Έκδοση 2 του Reel καφέ σας περιμένει.",
  link: "/app/deliverables/d-1",
  automationId: "a-1",
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
    (locale) => {
      expect(
        automationMessageFor(row(VALID, locale), ORIGIN),
      ).toMatchSnapshot();
    },
  );

  it("should escape the text of the automation", () => {
    const message = automationMessageFor(
      row({ ...VALID, subject: "<b>Θέμα</b>", body: "Α & <script>x</script>" }),
      ORIGIN,
    );
    if (typeof message === "string") throw new Error(message);
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&#60;script&#62;");
    expect(message.subject).toBe("<b>Θέμα</b>");
  });

  it("should open the DMS home when there is no link", () => {
    const message = automationMessageFor(row({ ...VALID, link: null }), ORIGIN);
    if (typeof message === "string") throw new Error(message);
    expect(message.text).toContain(`Άνοιγμα στο DMS: ${ORIGIN}/app`);
  });

  it("should refuse a payload without subject or with an unsafe link", () => {
    expect(automationMessageFor(row({ ...VALID, subject: " " }), ORIGIN)).toBe(
      INVALID,
    );
    expect(
      automationMessageFor(
        row({ ...VALID, link: "http://x.example.com" }),
        ORIGIN,
      ),
    ).toBe(INVALID);
  });
});
