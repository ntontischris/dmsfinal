import { describe, expect, it } from "vitest";

import type { EmailMessageBody } from "./templates/auth-messages";
import { deliverableReminderFor, productionDeliveredFor } from "./deliver-completion";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const PRODUCTION_ID = "7d1f2a3e-4b5c-4d6e-8f70-123456789abc";
const DELIVERABLE_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1234567890ab";
const INVALID = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const deliveredPayload = {
  productionId: PRODUCTION_ID,
  title: "Reel Καφέ",
  deliverables: [
    { title: "Reel", finalFilesUrl: "https://drive.example/final", url: "https://vimeo.com/1" },
    { title: "Video", finalFilesUrl: null, url: "https://vimeo.com/2" },
  ],
};

const reminderPayload = {
  deliverableId: DELIVERABLE_ID,
  title: "Reel Καφέ",
  production: "Μηνιαίο καφέ",
  version: 2,
  days: 3,
};

describe("productionDeliveredFor", () => {
  it("should build the delivered email with the final files link when it exists", () => {
    const message = productionDeliveredFor(
      { to_name: "Μαρία", locale: "el", payload: deliveredPayload },
      ORIGIN,
    ) as EmailMessageBody;

    expect(message.subject).toBe("Παραδόθηκε: Reel Καφέ");
    expect(message.text).toContain("Reel: https://drive.example/final");
    expect(message.text).toContain("Video: https://vimeo.com/2");
    expect(message.text).not.toContain("https://vimeo.com/1");
    expect(message.html).toContain(`${ORIGIN}/app/productions/${PRODUCTION_ID}`);
  });

  it("should write the subject in English for the en locale", () => {
    const message = productionDeliveredFor(
      { to_name: "Maria", locale: "en", payload: deliveredPayload },
      ORIGIN,
    ) as EmailMessageBody;

    expect(message.subject).toBe("Delivered: Reel Καφέ");
  });

  it("should refuse a payload that does not match the database shape", () => {
    expect(
      productionDeliveredFor({ to_name: "Μαρία", locale: "el", payload: { title: "x" } }, ORIGIN),
    ).toBe(INVALID);
  });
});

describe("deliverableReminderFor", () => {
  it("should ask the client to answer and link to the deliverable", () => {
    const message = deliverableReminderFor(
      { to_name: "Μαρία", locale: "el", payload: reminderPayload },
      ORIGIN,
    ) as EmailMessageBody;

    expect(message.subject).toBe("Περιμένει την απάντησή σου: Reel Καφέ");
    expect(message.html).toContain(`${ORIGIN}/app/deliverables/${DELIVERABLE_ID}`);
    expect(message.text).toContain("Έχουν περάσει 3 μέρες");
  });

  it("should refuse a reminder without a deliverable id", () => {
    expect(
      deliverableReminderFor(
        { to_name: "Μαρία", locale: "el", payload: { ...reminderPayload, deliverableId: "" } },
        ORIGIN,
      ),
    ).toBe(INVALID);
  });

  it("should match the stored message snapshot", () => {
    const message = deliverableReminderFor(
      { to_name: "Maria", locale: "en", payload: reminderPayload },
      ORIGIN,
    );

    expect(message).toMatchSnapshot();
  });
});
