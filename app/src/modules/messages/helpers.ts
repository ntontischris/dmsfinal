import type { InboxItem, ThreadMessage } from "./view-schema";

// Καθαρά βοηθητικά των Μηνυμάτων: κείμενα γραμμών, φίλτρα, σήμα «νέο», διευθύνσεις.

export const INBOX_TABS = ["conversations", "mentions"] as const;
export type InboxTab = (typeof INBOX_TABS)[number];

export const parseTab = (value: string | undefined): InboxTab =>
  INBOX_TABS.find((tab) => tab === value) ?? "conversations";

export type ThreadFilter = "all" | "untagged" | "internal";

export const parseFilter = (value: string | undefined): ThreadFilter =>
  value === "untagged" || value === "internal" ? value : "all";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const parseProduction = (
  value: string | undefined,
): string | undefined =>
  value !== undefined && UUID.test(value) ? value : undefined;

export const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

export const DELETED_PREVIEW = "Το Μήνυμα διαγράφηκε";
const PREVIEW_LIMIT = 90;

// Η γραμμή προεπισκόπησης μιας Συνομιλίας: «Εσωτερικό: …» για Εσωτερικά, σταθερό κείμενο για διαγραμμένο.
// Η βάση δίνει τους πρώτους 90 χαρακτήρες· αν γέμισε το όριο, προστίθεται «…».
export const previewLine = (item: InboxItem): string => {
  if (item.lastDeleted || item.preview === null) return DELETED_PREVIEW;
  const text =
    item.preview.length >= PREVIEW_LIMIT ? `${item.preview}…` : item.preview;
  return item.lastInternal ? `Εσωτερικό: ${text}` : text;
};

export const unreadTotal = (items: readonly InboxItem[]): number =>
  items.reduce((sum, item) => sum + item.unread, 0);

const ZONE = "Europe/Athens";

const yearOf = (value: Date): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, year: "numeric" }).format(
    value,
  );

// Η ώρα ενός Μηνύματος στην Αθήνα: «20/09 11:50», με έτος όταν δεν είναι του τρέχοντος έτους.
export const formatWhen = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const sameYear = yearOf(date) === yearOf(now);
  return new Intl.DateTimeFormat("el-GR", {
    timeZone: ZONE,
    day: "2-digit",
    month: "2-digit",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "");
};

// «Νέο»: Μήνυμα άλλου, όχι διαγραμμένο, νεότερο από τον δείκτη ανάγνωσης (ή χωρίς δείκτη).
export const isNewMessage = (
  message: ThreadMessage,
  readAt: string | null,
): boolean => {
  if (message.mine || message.deleted) return false;
  if (readAt === null) return true;
  return Date.parse(message.at) > Date.parse(readAt);
};

export interface MessageFilters {
  filter: ThreadFilter;
  production?: string;
}

// Η ετικέτα (?production=) υπερισχύει του ?filter=, όπως στο prototype.
export const filterMessages = (
  messages: readonly ThreadMessage[],
  { filter, production }: MessageFilters,
): ThreadMessage[] => {
  if (production !== undefined)
    return messages.filter((message) => message.productionId === production);
  if (filter === "untagged")
    return messages.filter((message) => message.productionId === null);
  if (filter === "internal")
    return messages.filter((message) => message.internal === true);
  return [...messages];
};

export interface ProductionChip {
  id: string;
  title: string;
}

// Οι ετικέτες που έχουν ορατά Μηνύματα, με τη σειρά που εμφανίζονται στη Συνομιλία.
export const productionChips = (
  messages: readonly ThreadMessage[],
): ProductionChip[] => {
  const seen = new Map<string, string>();
  for (const message of messages) {
    if (message.productionId !== null && !seen.has(message.productionId)) {
      seen.set(message.productionId, message.productionTitle ?? "Παραγωγή");
    }
  }
  return [...seen].map(([id, title]) => ({ id, title }));
};

export interface ThreadLinkOptions {
  production?: string;
  filter?: ThreadFilter;
}

export const MESSAGES_PATH = "/app/messages";

export const threadHref = (
  clientId: string,
  options: ThreadLinkOptions = {},
): string => {
  const query = new URLSearchParams();
  if (options.production) query.set("production", options.production);
  if (options.filter && options.filter !== "all")
    query.set("filter", options.filter);
  const suffix = query.toString();
  return `${MESSAGES_PATH}/${clientId}${suffix ? `?${suffix}` : ""}`;
};
