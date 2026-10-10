import { describe, expect, it } from "vitest";

import type { Locale } from "../locale";

import { invitationMessage, authLinkMessage } from "./auth-messages";
import { proposalLinkMessage, signedCopyMessage, signingCodeMessage } from "./agreement-messages";
import {
  clientAddedMessage,
  decisionMessage,
  testMessage,
  type DecisionInput,
} from "./system-messages";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const LINK = `${ORIGIN}/auth/confirm?token_hash=abc&type=invite`;
const LOCALES: readonly Locale[] = ["el", "en"];

const DECISION_CASES: readonly { name: string; input: Partial<DecisionInput> }[] = [
  { name: "γύρισμα εγκρίθηκε", input: { kind: "filming_decision", decision: "approved" } },
  { name: "γύρισμα απορρίφθηκε με αιτιολογία", input: { kind: "filming_decision", decision: "rejected", reason: "Κλειστό στούντιο" } },
  { name: "μετάθεση εγκρίθηκε με προηγούμενη ώρα", input: { kind: "reschedule_decision", decision: "approved", previousStartsAt: "2026-10-12T09:00:00Z" } },
  { name: "μετάθεση απορρίφθηκε", input: { kind: "reschedule_decision", decision: "rejected", reason: "Δεν υπάρχει συνεργείο" } },
];

// Το γύρισμα είναι 12 Οκτωβρίου 2026, 11:30 UTC, δηλαδή 14:30 ώρα Αθήνας.
const decisionBase = (locale: Locale): DecisionInput => ({
  locale,
  origin: ORIGIN,
  name: "Νίκος",
  kind: "filming_decision",
  filmingId: "f-42",
  decision: "approved",
  startsAt: "2026-10-12T11:30:00Z",
  previousStartsAt: null,
  hours: 2,
  reason: null,
});

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

  it.each(DECISION_CASES)("απόφαση $name", ({ input }) => {
    expect(decisionMessage({ ...decisionBase(locale), ...input })).toMatchSnapshot();
  });

  it("αντίγραφο υπογεγραμμένης", () => {
    expect(
      signedCopyMessage({ locale, origin: ORIGIN, name: "Νίκος", agreementTitle: "Σποτ", managerName: "Άννα" }),
    ).toMatchSnapshot();
  });
});

describe("η απόφαση γυρίσματος", () => {
  it("γράφει την ώρα της Αθήνας και τη διάρκεια", () => {
    const text = decisionMessage({ ...decisionBase("el") }).text;
    expect(text).toContain("14:30");
    expect(text).toContain("2 ώρες");
  });

  it("δείχνει το κουμπί προς το γύρισμα", () => {
    expect(decisionMessage({ ...decisionBase("en") }).html).toContain(`${ORIGIN}/app/filming/f-42`);
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
