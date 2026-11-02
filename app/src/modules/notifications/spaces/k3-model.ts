// K3 Ιστορικό αποστολών (νέα εμφάνιση): τι σημαίνει ένα σφάλμα για τον άνθρωπο που το διαβάζει (prototype `screens/k3-model.ts`),
// πάνω στις πραγματικές καταστάσεις αποστολής, και η ώρα/μέρα της γραμμής σε ώρα Ελλάδας. Καθαρές συναρτήσεις.

import type { Send } from "../sends-schema";

type Hint = Pick<Send, "state" | "reason">;

// Οδηγία δίπλα στον λόγο· null όταν δεν χρειάζεται κάτι.
export const whatNextOf = (send: Hint): string | null => {
  const reason = send.reason ?? "";
  if (reason.includes("ημερήσιο όριο"))
    return "Θα ξαναδοκιμάσει μόνο του αύριο το πρωί. Αν βιάζεσαι, πάτησε «Ξαναστείλε».";
  if (reason.includes("σβήσει για τον εαυτό"))
    return "Δεν χρειάζεται κάτι από σένα· είναι επιλογή του παραλήπτη.";
  if (send.state === "retrying")
    return "Ξαναδοκιμάζει μόνο του· δεν χρειάζεται κάτι από σένα.";
  if (send.state === "failed")
    return "Πάτησε «Ξαναστείλε». Αν αποτύχει ξανά, έλεγξε το email του παραλήπτη.";
  return null;
};

const athens = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Η στιγμή της αποστολής ως «ώρα» (μπροστά στη γραμμή) και «μέρα» (στον υπότιτλο).
export const timeParts = (iso: string): { time: string; date: string } => {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return { time: "—", date: "" };
  const parts = Object.fromEntries(
    athens.formatToParts(new Date(at)).map((part) => [part.type, part.value]),
  );
  return {
    time: `${parts.hour}:${parts.minute}`,
    date: `${parts.day}/${parts.month}/${parts.year}`,
  };
};

export const isAttention = (send: Pick<Send, "state">): boolean =>
  send.state === "failed" || send.state === "retrying";
