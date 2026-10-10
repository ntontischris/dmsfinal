import { describe, expect, it } from "vitest";

import type { Locale } from "../locale";

import { invitationMessage, authLinkMessage } from "./auth-messages";
import { proposalLinkMessage, signedCopyMessage, signingCodeMessage } from "./agreement-messages";
import { clientAddedMessage, testMessage } from "./system-messages";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const LINK = `${ORIGIN}/auth/confirm?token_hash=abc&type=invite`;
const LOCALES: readonly Locale[] = ["el", "en"];

describe.each(LOCALES)("τα πρότυπα email (%s)", (locale) => {
  it("πρόσκληση ομάδας", () => {
    expect(invitationMessage({ locale, origin: ORIGIN, name: "Μαρία", link: LINK, kind: "team" })).toMatchSnapshot();
  });

  it("πρόσκληση πελάτη με όνομα πελάτη", () => {
    expect(
      invitationMessage({ locale, origin: ORIGIN, name: "Νίκος", link: LINK, kind: "client", clientName: "Acme" }),
    ).toMatchSnapshot();
  });

  it("σύνδεσμος εισόδου", () => {
    expect(authLinkMessage({ locale, origin: ORIGIN, type: "magiclink", link: LINK })).toMatchSnapshot();
  });

  it("δοκιμαστικό email", () => {
    expect(testMessage({ locale, origin: ORIGIN })).toMatchSnapshot();
  });

  it("προσθήκη σε Πελάτη", () => {
    expect(
      clientAddedMessage({ locale, origin: ORIGIN, name: "Νίκος", clientName: "Acme", link: LINK }),
    ).toMatchSnapshot();
  });

  it("σύνδεσμος πρότασης", () => {
    expect(
      proposalLinkMessage({ locale, origin: ORIGIN, name: "Νίκος", agreementTitle: "Σποτ", token: "tok" }),
    ).toMatchSnapshot();
  });

  it("κωδικός υπογραφής", () => {
    expect(
      signingCodeMessage({ locale, origin: ORIGIN, name: "Νίκος", agreementTitle: "Σποτ", code: "123456" }),
    ).toMatchSnapshot();
  });

  it("αντίγραφο υπογεγραμμένης", () => {
    expect(
      signedCopyMessage({ locale, origin: ORIGIN, name: "Νίκος", agreementTitle: "Σποτ", managerName: "Άννα" }),
    ).toMatchSnapshot();
  });
});

describe("ασφάλεια των προτύπων", () => {
  it("διαφεύγει το HTML του ονόματος", () => {
    const body = invitationMessage({ locale: "el", origin: ORIGIN, name: "<script>x</script>", link: LINK, kind: "team" });
    expect(body.html).not.toContain("<script>x</script>");
  });

  it("έχει το λογότυπο από την εφαρμογή", () => {
    expect(testMessage({ locale: "el", origin: ORIGIN }).html).toContain(`${ORIGIN}/logo-email.png`);
  });

  it("η πρόσκληση γράφει ότι ο σύνδεσμος ισχύει 24 ώρες", () => {
    expect(invitationMessage({ locale: "el", origin: ORIGIN, name: "Μαρία", link: LINK, kind: "team" }).text).toContain(
      "24 ώρες",
    );
  });
});
