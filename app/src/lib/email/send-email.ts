// Ο ένας δρόμος αποστολής (ADR 0016): Resend μέσω fetch, χωρίς νέο πακέτο.
// Κανόνες: EMAIL_ALLOWED_DOMAINS (μόνο αυτά τα domains παραλήπτες, αλλιώς «suppressed»)· στο Preview το
// EMAIL_ALLOWED_DOMAINS είναι υποχρεωτικό· χωρίς RESEND_API_KEY γράφεται «local» μόνο τοπικά (χωρίς VERCEL)·
// αλλού χωρίς κλειδί αποτυγχάνει με σαφές μήνυμα.

export interface EmailEnv {
  apiKey: string;
  from: string;
  allowedDomains: readonly string[];
  isLocal: boolean;
  isPreview: boolean;
}

export interface EmailMessage {
  to: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
}

export type SendStatus = "sent" | "failed" | "suppressed";

export interface SendOutcome {
  status: SendStatus;
  providerId: string;
  error: string;
}

export interface SendOptions {
  env?: EmailEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const DEFAULT_FROM = "Devre Media <noreply@devremedia.com>";
const RESEND_URL = "https://api.resend.com/emails";
const LOCAL_PROVIDER_ID = "local";
export const RESEND_TIMEOUT_MS = 10_000;

export function readEmailEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): EmailEnv {
  return {
    apiKey: env.RESEND_API_KEY ?? "",
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    allowedDomains: (env.EMAIL_ALLOWED_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    isLocal: !env.VERCEL,
    isPreview: env.VERCEL_ENV === "preview",
  };
}

export const emailDomain = (email: string): string =>
  email.split("@").pop()?.toLowerCase() ?? "";

// Ο παραλήπτης εκτός λίστας δεν στέλνεται ποτέ όταν η λίστα υπάρχει (E8).
export const isAllowedRecipient = (
  email: string,
  allowedDomains: readonly string[],
): boolean =>
  allowedDomains.length === 0 || allowedDomains.includes(emailDomain(email));

// Το όνομα του παραλήπτη χωρίς <, > ή κόμματα, ώστε να μην αλλάζει τη διεύθυνση.
const displayName = (name: string): string =>
  name.replace(/[<>,"]/g, "").trim();

const recipientHeader = (to: string, toName: string): string => {
  const name = displayName(toName);
  return name ? `${name} <${to}>` : to;
};

const suppressed = (reason: string): SendOutcome => ({
  status: "suppressed",
  providerId: "",
  error: reason,
});
const failed = (reason: string): SendOutcome => ({
  status: "failed",
  providerId: "",
  error: reason,
});
const sent = (providerId: string): SendOutcome => ({
  status: "sent",
  providerId,
  error: "",
});

async function postToResend(
  message: EmailMessage,
  env: EmailEnv,
  options: SendOptions,
): Promise<SendOutcome> {
  const response = await (options.fetchImpl ?? fetch)(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: [recipientHeader(message.to, message.toName)],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? RESEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    // Το σώμα της απάντησης μπορεί να περιέχει στοιχεία του αιτήματος· κρατάμε μόνο τον κωδικό.
    return failed(`Resend ${response.status}`);
  }
  const body = (await response.json().catch(() => ({}))) as { id?: unknown };
  return typeof body.id === "string" ? sent(body.id) : sent("");
}

// Η απόφαση πριν από κάθε κλήση στον πάροχο. Καθαρή συνάρτηση, για τα τεστ.
export function decideDelivery(
  message: Pick<EmailMessage, "to">,
  env: EmailEnv,
): SendOutcome | null {
  if (env.isPreview && env.allowedDomains.length === 0)
    return failed("Στο Preview το EMAIL_ALLOWED_DOMAINS είναι υποχρεωτικό");
  if (!isAllowedRecipient(message.to, env.allowedDomains))
    return suppressed("Ο παραλήπτης δεν είναι στα επιτρεπόμενα domains");
  if (env.apiKey) return null;
  return env.isLocal
    ? sent(LOCAL_PROVIDER_ID)
    : failed("Λείπει το RESEND_API_KEY");
}

export async function sendEmail(
  message: EmailMessage,
  options: SendOptions = {},
): Promise<SendOutcome> {
  const env = options.env ?? readEmailEnv();
  const decided = decideDelivery(message, env);
  if (decided) return decided;
  try {
    return await postToResend(message, env, options);
  } catch (error) {
    console.error(
      "sendEmail",
      error instanceof Error ? error.name : "άγνωστο σφάλμα",
    );
    return failed("Η αποστολή απέτυχε");
  }
}
