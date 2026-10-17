import type { Tone } from "@/components/ui/badge";

import type {
  ConnectionId,
  ConnectionState,
  ConnectionUsage,
} from "./connections";

// Κείμενα της N5. Οι συνδέσεις στήνονται από τον developer χωρίς κλειδιά εδώ (ADR 0016).

export const STATE_LABELS: Readonly<Record<ConnectionState, string>> = {
  ok: "λειτουργεί",
  warning: "προσοχή",
  down: "δεν λειτουργεί",
  not_set_up: "δεν έχει στηθεί",
};

export const STATE_TONES: Readonly<Record<ConnectionState, Tone | undefined>> =
  {
    ok: "ok",
    warning: "strong",
    down: "attention",
    not_set_up: undefined,
  };

interface ConnectionText {
  name: string;
  purpose: string;
  developerOnly: string;
}

export const CONNECTION_TEXTS: Readonly<Record<ConnectionId, ConnectionText>> =
  {
    google: {
      name: "Google ημερολόγιο",
      purpose: "Το Εταιρικό ημερολόγιο, αμφίδρομα.",
      developerOnly:
        "ο λογαριασμός υπηρεσίας του Google και τα στοιχεία του στο Vercel.",
    },
    email: {
      name: "Αποστολή email",
      purpose: "Κάθε email του συστήματος, μέσω Resend.",
      developerOnly:
        "ο πάροχος, το κλειδί, το domain αποστολής και οι εγγραφές DNS.",
    },
    ai: {
      name: "AI (Βοηθός και αναζήτηση)",
      purpose: "Κάθε κλήση AI περνά από ένα σημείο, με μετρητή και πλαφόν.",
      developerOnly:
        "οι πάροχοι, τα κλειδιά τους και τα μοντέλα (απόφαση ποιότητας που θέλει δοκιμή).",
    },
    turnstile: {
      name: "Έλεγχος ανθρώπου",
      purpose: "Δημόσιες φόρμες, είσοδος και widget του Βοηθού.",
      developerOnly: "όλη η σύνδεση, μαζί με την Ιστοσελίδα.",
    },
    analytics: {
      name: "Στατιστικά και διαφήμιση",
      purpose:
        "Google Analytics και Meta Pixel, μόνο μετά από Αποδοχή cookies.",
      developerOnly:
        "η μπάρα cookies και η φόρτωση των κωδικών, μαζί με την Ιστοσελίδα.",
    },
    errors: {
      name: "Καταγραφή σφαλμάτων",
      purpose: "Ό,τι σπάει στο σύστημα φτάνει στον developer.",
      developerOnly: "όλη η ρύθμιση, μαζί με την Ιστοσελίδα.",
    },
  };

export const NOT_SET_UP_NOTE = "Δεν έχει στηθεί ακόμα. Τη στήνει ο developer.";

const DATE_TIME = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatAt = (value: string | null): string =>
  value ? DATE_TIME.format(new Date(value)) : "—";

const DECIMAL = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Ποσό με τον κωδικό ISO του νομίσματος: «20,00 USD». Χωρίς μετατροπή.
export const formatMoney = (value: number, currency: string): string =>
  `${DECIMAL.format(value)} ${currency}`;

export const formatUsage = (usage: ConnectionUsage): string =>
  usage.unit === "USD"
    ? `${formatMoney(usage.used, "USD")} από ${formatMoney(usage.limit, "USD")}`
    : `${usage.used} από ${usage.limit} emails`;

export const usageRatio = (usage: ConnectionUsage): number =>
  usage.limit <= 0 ? 1 : Math.min(usage.used / usage.limit, 1);

// «2026-10-25» → «25/10/2026».
export const formatDay = (value: string | null): string => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};
