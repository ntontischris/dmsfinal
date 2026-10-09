// Ο ένας δρόμος αποστολής (ADR 0016): Resend μέσω fetch, χωρίς νέο πακέτο.
// Κανόνες: EMAIL_ALLOWED_DOMAINS (μόνο αυτά τα domains παραλήπτες, αλλιώς «suppressed»)· χωρίς RESEND_API_KEY
// στα τοπικά περιβάλλοντα γράφεται «local» (τα e2e δεν καλούν τον πάροχο)· σε production χωρίς κλειδί αποτυγχάνει.

export interface EmailEnv {
  apiKey: string;
  from: string;
  allowedDomains: readonly string[];
  isProduction: boolean;
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

export const DEFAULT_FROM = "Devre Media <noreply@devremedia.com>";
const RESEND_URL = "https://api.resend.com/emails";
const LOCAL_PROVIDER_ID = "local";

export function readEmailEnv(env: Readonly<Record<string, string | undefined>> = process.env): EmailEnv {
  return {
    apiKey: env.RESEND_API_KEY ?? "",
    from: env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    allowedDomains: (env.EMAIL_ALLOWED_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    // Το NODE_ENV είναι «production» και στο `next start` των e2e, γι' αυτό κρίνουμε μόνο το περιβάλλον του Vercel.
    isProduction: env.VERCEL_ENV === "production",
  };
}

export const emailDomain = (email: string): string => email.split("@").pop()?.toLowerCase() ?? "";

// Ο παραλήπτης εκτός λίστας δεν στέλνεται ποτέ όταν η λίστα υπάρχει (E8).
export const isAllowedRecipient = (email: string, allowedDomains: readonly string[]): boolean =>
  allowedDomains.length === 0 || allowedDomains.includes(emailDomain(email));

// Το όνομα του παραλήπτη χωρίς <, > ή κόμματα, ώστε να μην αλλάζει τη διεύθυνση.
const displayName = (name: string): string => name.replace(/[<>,"]/g, "").trim();

const recipientHeader = (to: string, toName: string): string => {
  const name = displayName(toName);
  return name ? `${name} <${to}>` : to;
};

const suppressed = (reason: string): SendOutcome => ({ status: "suppressed", providerId: "", error: reason });
const failed = (reason: string): SendOutcome => ({ status: "failed", providerId: "", error: reason });
const sent = (providerId: string): SendOutcome => ({ status: "sent", providerId, error: "" });

async function postToResend(message: EmailMessage, env: EmailEnv, fetchImpl: typeof fetch): Promise<SendOutcome> {
  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.from,
      to: [recipientHeader(message.to, message.toName)],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Το σώμα της απάντησης μπορεί να περιέχει στοιχεία του αιτήματος· κρατάμε μόνο τον κωδικό.
    return failed(`Resend ${response.status}`);
  }
  const body = (await response.json().catch(() => ({}))) as { id?: unknown };
  return typeof body.id === "string" ? sent(body.id) : sent("");
}

// Η απόφαση πριν από κάθε κλήση στον πάροχο. Καθαρή συνάρτηση, για τα τεστ.
export function decideDelivery(message: Pick<EmailMessage, "to">, env: EmailEnv): SendOutcome | null {
  if (!isAllowedRecipient(message.to, env.allowedDomains)) return suppressed("Ο παραλήπτης δεν είναι στα επιτρεπόμενα domains");
  if (env.apiKey) return null;
  return env.isProduction ? failed("Λείπει το RESEND_API_KEY") : sent(LOCAL_PROVIDER_ID);
}

export async function sendEmail(
  message: EmailMessage,
  env: EmailEnv = readEmailEnv(),
  fetchImpl: typeof fetch = fetch,
): Promise<SendOutcome> {
  const decided = decideDelivery(message, env);
  if (decided) return decided;
  try {
    return await postToResend(message, env, fetchImpl);
  } catch (error) {
    console.error("sendEmail", error instanceof Error ? error.name : "άγνωστο σφάλμα");
    return failed("Η αποστολή απέτυχε");
  }
}
