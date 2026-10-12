import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Το γενικό email των Αυτοματισμών (#170, Α6): θέμα και σώμα έρχονται έτοιμα από τη βάση (οι μεταβλητές έχουν ήδη μπει).
// Εδώ μόνο μπαίνουν στο εταιρικό κέλυφος: κάθε κενή γραμμή αρχίζει νέα παράγραφο, το escaping το κάνει το κέλυφος,
// και το κουμπί ανοίγει την οντότητα στο DMS.

export interface AutomationMessageInput {
  locale: Locale;
  origin: string;
  subject: string;
  body: string;
  link: string | null;
  // Το μπλοκ λεπτομερειών του Γεγονότος, κάτω από το κείμενο του Αυτοματισμού (#171).
  details?: readonly string[];
  // Ο σύνδεσμος διακοπής των email ενός μη απαραίτητου Αυτοματισμού (#171, Α10).
  unsubscribeUrl?: string | null;
}

// Οι παράγραφοι του σώματος: χωρίζονται με κενή γραμμή, χωρίς κενές.
export const bodyParagraphs = (body: string): string[] =>
  body
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

// Απόλυτο URL για το κουμπί: εσωτερική διαδρομή /app/… πάνω στο origin, https ως έχει, αλλιώς η αρχή του DMS.
export const absoluteLink = (origin: string, link: string | null): string => {
  if (link && /^\/app(\/|\?|$)/.test(link)) return `${origin}${link}`;
  if (link && /^https:\/\/\S+$/.test(link)) return link;
  return `${origin}/app`;
};

export function automationMessage(
  input: AutomationMessageInput,
): EmailMessageBody {
  const rendered = renderShell({
    locale: input.locale,
    origin: input.origin,
    heading: input.subject,
    paragraphs: [...bodyParagraphs(input.body), ...(input.details ?? [])],
    action: {
      label: pick(input.locale, "Άνοιγμα στο DMS", "Open in DMS"),
      url: absoluteLink(input.origin, input.link),
    },
    ...(input.unsubscribeUrl
      ? {
          footerLink: {
            label: pick(input.locale, "Να μη λαμβάνω αυτά τα email", "Stop receiving these emails"),
            url: input.unsubscribeUrl,
          },
        }
      : {}),
  });
  return { subject: input.subject, ...rendered };
}
