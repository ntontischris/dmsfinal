import { timingSafeEqual } from "node:crypto";

import { appOrigin } from "@/lib/app-origin";

// Το «σκούντημα» της ουράς: μετά από κάθε εγγραφή καλεί το cron route ώστε το μήνυμα να φύγει τώρα.
// Τρέχει με after() της Next (μετά την απάντηση)· το cron κάθε λεπτού είναι το δίχτυ ασφαλείας.

const OUTBOX_PATH = "/api/cron/outbox";

const sameText = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Το Vercel στέλνει «Authorization: Bearer <CRON_SECRET>» στα crons· αλλιώς 401.
export const isCronAuthorized = (header: string | null, secret: string | undefined): boolean =>
  Boolean(secret) && header !== null && sameText(header, `Bearer ${secret}`);

export async function kickOutbox(secret: string | undefined = process.env.CRON_SECRET): Promise<void> {
  if (!secret) return;
  await fetch(`${appOrigin()}${OUTBOX_PATH}`, { headers: { Authorization: `Bearer ${secret}` } }).catch(() =>
    console.error("kickOutbox", "το σκούντημα απέτυχε"),
  );
}
