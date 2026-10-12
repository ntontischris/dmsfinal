import { describe, expect, it } from "vitest";

import { proposalLinkMessage, signingCodeMessage } from "./agreement-messages";
import { invitationMessage } from "./auth-messages";
import { clientAddedMessage } from "./system-messages";

// Τα Μηνύματα συστήματος με κείμενο του admin (K2, #173): θέμα και παράγραφοι από τον admin, το κουμπί και ο κωδικός
// πάντα από τον κώδικα.

const ORIGIN = "https://dmsfinal-app.vercel.app";
const LINK = `${ORIGIN}/auth/confirm?token_hash=abc&type=invite`;

describe("τα πρότυπα με κείμενο του admin", () => {
  it("πρόσκληση με δικό της θέμα και κείμενο", () => {
    expect(
      invitationMessage({
        locale: "el",
        origin: ORIGIN,
        name: "Μαρία",
        link: LINK,
        kind: "client",
        clientName: "Acme",
        custom: {
          subject: "Καλώς ήρθες στην {place}",
          body: "Γεια {recipientName}!\n\nΣε περιμένουμε.",
        },
      }),
    ).toMatchSnapshot();
  });

  it("κωδικός υπογραφής: ο κωδικός μπαίνει ακόμα κι αν λείπει από το κείμενο", () => {
    const message = signingCodeMessage({
      locale: "el",
      origin: ORIGIN,
      name: "Νίκος",
      agreementTitle: "Μηνιαίο",
      code: "482913",
      custom: { subject: null, body: "Γεια {recipientName}, ορίστε." },
    });
    expect(message.text).toContain("482913");
    expect(message).toMatchSnapshot();
  });

  it("σύνδεσμος πρότασης: το κουμπί μένει όταν το κείμενο δεν έχει {link}", () => {
    const message = proposalLinkMessage({
      locale: "en",
      origin: ORIGIN,
      name: "Nick",
      agreementTitle: "Monthly",
      token: "tok",
      custom: {
        subject: "Our proposal {agreement}",
        body: "Hi {recipientName}",
      },
    });
    expect(message.subject).toBe("Our proposal Monthly");
    expect(message.html).toContain(`${ORIGIN}/p/tok`);
    expect(message).toMatchSnapshot();
  });

  it("προσθήκη σε Πελάτη χωρίς αλλαγή μένει ίδια", () => {
    const input = {
      locale: "el" as const,
      origin: ORIGIN,
      name: "Μαρία",
      clientName: "Acme",
      link: LINK,
    };
    expect(
      clientAddedMessage({ ...input, custom: { subject: null, body: null } }),
    ).toEqual(clientAddedMessage(input));
  });
});
