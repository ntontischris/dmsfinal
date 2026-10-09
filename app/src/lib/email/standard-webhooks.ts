import { createHmac, timingSafeEqual } from "node:crypto";

// Έλεγχος υπογραφής κατά standard-webhooks (ο τρόπος που υπογράφει η Supabase το Send Email Hook).
// Η υπογραφή καλύπτει «id.timestamp.σώμα». Η απόκλιση ωρολογίου επιτρέπεται μέχρι 5 λεπτά.

export const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface WebhookInput {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  secret: string;
  nowSeconds: number;
}

export type WebhookVerdict = { ok: true } | { ok: false; reason: string };

// Το μυστικό έρχεται ως «v1,whsec_<base64>». Κρατάμε μόνο το base64 του κλειδιού.
const secretKey = (secret: string): Buffer | null => {
  const match = secret.match(/whsec_([A-Za-z0-9+/=]+)$/);
  return match?.[1] ? Buffer.from(match[1], "base64") : null;
};

const signatureFor = (key: Buffer, input: WebhookInput & { timestamp: string; id: string }): string =>
  createHmac("sha256", key).update(`${input.id}.${input.timestamp}.${input.body}`).digest("base64");

// Η κεφαλίδα μπορεί να έχει πολλές υπογραφές χωρισμένες με κενό: αρκεί μία να ταιριάζει.
const providedSignatures = (header: string): string[] =>
  header
    .split(" ")
    .map((item) => item.split(","))
    .filter(([version, value]) => version === "v1" && value)
    .map(([, value]) => value ?? "");

const sameText = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function verifyStandardWebhook(input: WebhookInput): WebhookVerdict {
  const { id, timestamp, signature } = input;
  if (!id || !timestamp || !signature) return { ok: false, reason: "λείπουν κεφαλίδες υπογραφής" };
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(input.nowSeconds - seconds) > WEBHOOK_TOLERANCE_SECONDS)
    return { ok: false, reason: "παλιό ή μελλοντικό timestamp" };
  const key = secretKey(input.secret);
  if (!key) return { ok: false, reason: "μυστικό με λάθος μορφή" };
  const expected = signatureFor(key, { ...input, id, timestamp });
  const matches = providedSignatures(signature).some((candidate) => sameText(candidate, expected));
  return matches ? { ok: true } : { ok: false, reason: "λάθος υπογραφή" };
}
