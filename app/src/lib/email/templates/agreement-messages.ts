import { pick, type Locale } from "../locale";
import { customizeParts, type CustomText } from "../system-texts";

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
  // Το κείμενο του admin (K2, #173)· το κουμπί μένει πάντα.
  custom?: CustomText;
}

export function proposalLinkMessage(input: ProposalLinkInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Πρόταση: ${input.agreementTitle}`, `Proposal: ${input.agreementTitle}`);
  const url = `${input.origin}/p/${encodeURIComponent(input.token)}`;
  const greeting = pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`);
  const text = pick(locale, "Σου στέλνουμε την πρόταση για έλεγχο και υπογραφή.", "We are sending you the proposal to review and sign.");
  const parts = customizeParts({ heading: subject, subject, paragraphs: [greeting, text] }, input.custom, {
    recipientName: input.name,
    agreement: input.agreementTitle,
    link: url,
  });
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: parts.heading,
    paragraphs: parts.paragraphs,
    action: { label: pick(locale, "Δες την πρόταση", "View the proposal"), url },
  });
  return { subject: parts.subject, ...rendered };
}

export interface SigningCodeInput {
  locale: Locale;
  origin: string;
  name: string;
  agreementTitle: string;
  code: string;
  // Το κείμενο του admin (K2, #173)· ο κωδικός μπαίνει πάντα.
  custom?: CustomText;
}

export function signingCodeMessage(input: SigningCodeInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Κωδικός υπογραφής: ${input.agreementTitle}`, `Signing code: ${input.agreementTitle}`);
  const greeting = pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`);
  const codeLine = pick(
    locale,
    `Ο κωδικός υπογραφής σου είναι: ${input.code}. Ισχύει 10 λεπτά.`,
    `Your signing code is: ${input.code}. It is valid for 10 minutes.`,
  );
  const parts = customizeParts({ heading: subject, subject, paragraphs: [greeting, codeLine] }, input.custom, {
    recipientName: input.name,
    agreement: input.agreementTitle,
    code: input.code,
  });
  // Ο κωδικός φαίνεται πάντα, ακόμα κι αν το κείμενο του admin δεν τον έχει.
  const paragraphs = parts.paragraphs.some((paragraph) => paragraph.includes(input.code))
    ? parts.paragraphs
    : [...parts.paragraphs, codeLine];
  const rendered = renderShell({ locale, origin: input.origin, heading: parts.heading, paragraphs });
  return { subject: parts.subject, ...rendered };
}

export interface SignedCopyInput {
  locale: Locale;
  origin: string;
  name: string;
  agreementTitle: string;
  managerName: string;
  custom?: CustomText;
}

export function signedCopyMessage(input: SignedCopyInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Υπογεγραμμένη: ${input.agreementTitle}`, `Signed: ${input.agreementTitle}`);
  const manager = input.managerName || pick(locale, "η ομάδα της Devre Media", "the Devre Media team");
  const greeting = pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`);
  const text = pick(
    locale,
    `Η πρόταση «${input.agreementTitle}» υπογράφηκε. Ο υπεύθυνος είναι ${manager}.`,
    `The proposal “${input.agreementTitle}” was signed. The account manager is ${manager}.`,
  );
  const parts = customizeParts({ heading: subject, subject, paragraphs: [greeting, text] }, input.custom, {
    recipientName: input.name,
    agreement: input.agreementTitle,
    manager,
  });
  const rendered = renderShell({ locale, origin: input.origin, heading: parts.heading, paragraphs: parts.paragraphs });
  return { subject: parts.subject, ...rendered };
}
