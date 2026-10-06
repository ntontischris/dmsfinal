import type {
  ChargeDecision,
  LinkHost,
  PostApprovalRequest,
  Version,
} from "@/data/deliverables";
import type { DeliverableCaps } from "@/data/deliverables-access";
import { NOW, personName } from "@/data/filming";
import type { DeliverableState } from "@/data/productions";

export const TODAY = NOW.slice(0, 10);

export interface PersonOption {
  id: string;
  name: string;
}

export interface LogLine {
  when: string;
  who: string;
  what: string;
  notify?: string;
}

// Η ζωντανή κατάσταση του Παραδοτέου στη μνήμη της σελίδας (prototype: δεν αποθηκεύεται).
export interface Live {
  assigneeId: string;
  deadline: string | null;
  state: DeliverableState;
  versions: readonly Version[];
  finalFiles?: string;
  charge?: ChargeDecision;
  requests: readonly PostApprovalRequest[];
  roundsUsed: number;
  approvedAt?: string;
  cancellation?: { reason: string; provision: "καταναλώθηκε" | "επιστρέφει" };
  log: readonly LogLine[];
}

export type Change = (live: Live) => Live;
export type Update = (change: Change) => void;

// Ό,τι είναι σταθερό για το Παραδοτέο και δεν αλλάζει από τις ενέργειες (serializable).
export interface H2Context {
  caps: DeliverableCaps;
  meId: string;
  deliverableId: string;
  title: string;
  kindName: string;
  limit: number;
  extra?: "με χρέωση" | "χωρίς χρέωση";
  isInternalProduction: boolean;
  internalReview: boolean;
  daysAfterChanges: number;
  production: {
    id: string;
    title: string;
    clientName: string;
    periodLabel: string;
    href: string;
  };
  people: readonly PersonOption[];
  basis: string;
  filmingDate: string | null;
  canDecideRequests: boolean;
  newDeliverableHref: string;
}

export interface PanelProps {
  ctx: H2Context;
  live: Live;
  update: Update;
}

export const whoLabel = (who: string): string =>
  personName(who) === "—" ? who : personName(who);

export const LINK_ERROR =
  "Δεκτά μόνο links Google Drive, Vimeo ή YouTube. Το σύστημα δεν κρατά αρχεία.";

const HOSTS: readonly { host: LinkHost; names: readonly string[] }[] = [
  { host: "Google Drive", names: ["drive.google.com"] },
  { host: "Vimeo", names: ["vimeo.com", "player.vimeo.com"] },
  { host: "YouTube", names: ["youtube.com", "www.youtube.com", "youtu.be"] },
];

export const hostOf = (link: string): LinkHost | null => {
  try {
    const url = new URL(link.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return HOSTS.find((h) => h.names.includes(url.hostname))?.host ?? null;
  } catch {
    return null;
  }
};

export const fmtClock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// undefined = χωρίς χρόνο, null = άκυρο, αλλιώς δευτερόλεπτα.
export const parseClock = (text: string): number | null | undefined => {
  const value = text.trim();
  if (!value) return undefined;
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export const addBusinessDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  const step = (left: number): void => {
    if (left === 0) return;
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    step(day === 0 || day === 6 ? left : left - 1);
  };
  step(days);
  return date.toISOString().slice(0, 10);
};

export const latestOf = (live: Live): Version | undefined =>
  live.versions.at(-1);

// Καθυστέρηση μόνο όταν οφείλεται σε εμάς: σε εργασία και η Έκδοση δεν είναι σε έλεγχο.
export const isLateLive = (live: Live): boolean =>
  !!live.deadline &&
  live.state === "σε εργασία" &&
  latestOf(live)?.state !== "αναμένει εσωτερικό έλεγχο" &&
  live.deadline < TODAY;

export const daysSince = (iso: string): number =>
  Math.floor((Date.parse(NOW) - Date.parse(iso)) / 86_400_000);
