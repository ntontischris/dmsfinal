import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μηνύματα της ουράς (ΧΩΡΙΣ σύνδεσμο εισόδου εκτός από την προσθήκη σε Πελάτη).

export interface TestInput {
  locale: Locale;
  origin: string;
}

export function testMessage(input: TestInput): EmailMessageBody {
  const heading = pick(input.locale, "Δοκιμαστικό email", "Test email");
  const rendered = renderShell({
    locale: input.locale,
    origin: input.origin,
    heading,
    paragraphs: [
      pick(
        input.locale,
        "Αν διαβάζεις αυτό, η αποστολή email του DMS λειτουργεί.",
        "If you can read this, sending email from DMS works.",
      ),
    ],
  });
  return { subject: `Devre Media · ${heading}`, ...rendered };
}

export interface ClientAddedInput {
  locale: Locale;
  origin: string;
  name: string;
  clientName: string;
  link: string;
}

export function clientAddedMessage(input: ClientAddedInput): EmailMessageBody {
  const { locale } = input;
  const heading = pick(locale, `Πρόσβαση στον Πελάτη ${input.clientName}`, `Access to client ${input.clientName}`);
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      pick(
        locale,
        `Πρόσθεσαν τον λογαριασμό σου στον Πελάτη «${input.clientName}». Μπορείς να μπεις και να διαλέξεις τον Πελάτη από την κεφαλίδα.`,
        `Your account was added to the client “${input.clientName}”. Sign in and choose the client from the header.`,
      ),
    ],
    action: { label: pick(locale, "Μπες στο σύστημα", "Open the system"), url: input.link },
  });
  return { subject: `Devre Media · ${heading}`, ...rendered };
}
