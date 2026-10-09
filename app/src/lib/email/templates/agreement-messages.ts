import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μηνύματα των Συμφωνιών: σύνδεσμος πρότασης, κωδικός υπογραφής, αντίγραφο υπογεγραμμένης.
// Κρατάμε απλό κείμενο: τίτλος, σύνδεσμος ή κωδικός, σύνοψη.

export interface ProposalLinkInput {
  locale: Locale;
  origin: string;
  name: string;
  agreementTitle: string;
  token: string;
}

export function proposalLinkMessage(input: ProposalLinkInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Πρόταση: ${input.agreementTitle}`, `Proposal: ${input.agreementTitle}`);
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      pick(locale, "Σου στέλνουμε την πρόταση για έλεγχο και υπογραφή.", "We are sending you the proposal to review and sign."),
    ],
    action: {
      label: pick(locale, "Δες την πρόταση", "View the proposal"),
      url: `${input.origin}/p/${encodeURIComponent(input.token)}`,
    },
  });
  return { subject, ...rendered };
}

export interface SigningCodeInput {
  locale: Locale;
  origin: string;
  name: string;
  agreementTitle: string;
  code: string;
}

export function signingCodeMessage(input: SigningCodeInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Κωδικός υπογραφής: ${input.agreementTitle}`, `Signing code: ${input.agreementTitle}`);
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      pick(
        locale,
        `Ο κωδικός υπογραφής σου είναι: ${input.code}. Ισχύει 10 λεπτά.`,
        `Your signing code is: ${input.code}. It is valid for 10 minutes.`,
      ),
    ],
  });
  return { subject, ...rendered };
}

export interface SignedCopyInput {
  locale: Locale;
  origin: string;
  name: string;
  agreementTitle: string;
  managerName: string;
}

export function signedCopyMessage(input: SignedCopyInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Υπογεγραμμένη: ${input.agreementTitle}`, `Signed: ${input.agreementTitle}`);
  const manager = input.managerName || pick(locale, "η ομάδα της Devre Media", "the Devre Media team");
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      pick(
        locale,
        `Η πρόταση «${input.agreementTitle}» υπογράφηκε. Ο υπεύθυνος είναι ${manager}.`,
        `The proposal “${input.agreementTitle}” was signed. The account manager is ${manager}.`,
      ),
    ],
  });
  return { subject, ...rendered };
}
