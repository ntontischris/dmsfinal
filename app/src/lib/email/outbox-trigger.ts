import { timingSafeEqual } from "node:crypto";

// Το «σκούντημα» της ουράς: μετά από κάθε εγγραφή, καλεί το cron route ώστε το μήνυμα να φύγει τώρα,
// όχι στο επόμενο λεπτό. Δεν περιμένουμε την απάντηση· το cron κάθε λεπτού είναι το δίχτυ ασφαλείας.

const OUTBOX_PATH = "/api/cron/outbox";

const sameText = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Το Vercel στέλνει «Authorization: Bearer <CRON_SECRET>» στα crons· αλλιώς 401.
export const isCronAuthorized = (header: string | null, secret: string | undefined): boolean =>
  Boolean(secret) && header !== null && sameText(header, `Bearer ${secret}`);

export function kickOutbox(origin: string, secret: string | undefined = process.env.CRON_SECRET): void {
  if (!secret) return;
  void fetch(`${origin}${OUTBOX_PATH}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  }).catch(() => console.error("kickOutbox", "το σκούντημα απέτυχε"));
}
