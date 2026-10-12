import { describe, expect, it } from "vitest";

import { digestMessageFor, requestClosedFor } from "./deliver-messages";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const INVALID = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const bodyOf = (
  message: unknown,
): { subject: string; html: string; text: string } => {
  if (typeof message === "string") throw new Error(message);
  return message as { subject: string; html: string; text: string };
};

describe("digestMessageFor", () => {
  const payload = { clientName: "Πελάτης Δοκιμής", count: 3 };

  it("should write the Greek subject with the count and link to the messages", () => {
    const message = bodyOf(
      digestMessageFor({ to_name: "Κώστας", locale: "el", payload }, ORIGIN),
    );

    expect(message.subject).toBe("Έχετε 3 αδιάβαστα Μηνύματα");
    expect(message.html).toContain(`${ORIGIN}/app/messages`);
    expect(message.text).toContain("Απάντησε στο DMS");
    expect(message.text).toContain("δεν φτάνει στην ομάδα");
  });

  it("should use the singular for one message and English for the en locale", () => {
    expect(
      bodyOf(
        digestMessageFor(
          { to_name: "K", locale: "el", payload: { ...payload, count: 1 } },
          ORIGIN,
        ),
      ).subject,
    ).toBe("Έχετε 1 αδιάβαστο Μήνυμα");
    expect(
      bodyOf(digestMessageFor({ to_name: "K", locale: "en", payload }, ORIGIN))
        .subject,
    ).toBe("You have 3 unread messages");
  });

  it("should reject a payload without a count", () => {
    expect(
      digestMessageFor(
        { to_name: "K", locale: "el", payload: { clientName: "X" } },
        ORIGIN,
      ),
    ).toBe(INVALID);
  });

  it("should match the snapshot", () => {
    expect(
      digestMessageFor({ to_name: "Κώστας", locale: "el", payload }, ORIGIN),
    ).toMatchSnapshot();
  });
});

describe("requestClosedFor", () => {
  const done = {
    clientName: "Πελάτης Δοκιμής",
    kind: "deliverable",
    outcome: "done",
    comment: "Έτοιμο",
    link: "https://example.com/reel",
    deliverableId: "d-42",
  };
  const rejected = {
    clientName: "Πελάτης Δοκιμής",
    kind: "other",
    outcome: "rejected",
    reply: "Δεν γίνεται τώρα",
  };

  it("should say the request is done with comment, link and the deliverable page", () => {
    const message = bodyOf(
      requestClosedFor(
        { to_name: "Κώστας", locale: "el", payload: done },
        ORIGIN,
      ),
    );

    expect(message.subject).toBe("Το Αίτημά σας ολοκληρώθηκε");
    expect(message.text).toContain("Σχόλιο: Έτοιμο");
    expect(message.text).toContain("Σύνδεσμος: https://example.com/reel");
    expect(message.text).toContain(`${ORIGIN}/app/deliverables/d-42`);
    expect(message.html).toContain(`${ORIGIN}/app/messages?tab=requests`);
  });

  it("should say the request was declined with the reply", () => {
    const message = bodyOf(
      requestClosedFor(
        { to_name: "Κώστας", locale: "el", payload: rejected },
        ORIGIN,
      ),
    );

    expect(message.subject).toBe("Το Αίτημά σας απορρίφθηκε");
    expect(message.text).toContain("Απάντηση ομάδας: Δεν γίνεται τώρα");
    expect(message.text).not.toContain("Σύνδεσμος");
  });

  it("should reject a link that is not https", () => {
    expect(
      requestClosedFor(
        {
          to_name: "K",
          locale: "el",
          payload: { ...done, link: "http://example.com" },
        },
        ORIGIN,
      ),
    ).toBe(INVALID);
  });

  it("should write English and match the snapshots", () => {
    expect(
      requestClosedFor(
        { to_name: "Kostas", locale: "en", payload: done },
        ORIGIN,
      ),
    ).toMatchSnapshot();
    expect(
      requestClosedFor(
        { to_name: "Κώστας", locale: "el", payload: rejected },
        ORIGIN,
      ),
    ).toMatchSnapshot();
  });
});
