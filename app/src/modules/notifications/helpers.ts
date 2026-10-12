// Καθαρά βοηθητικά των Ειδοποιήσεων (A2): φίλτρο, «Παλαιότερες», ασφαλές link, σχετικός χρόνος, ετικέτα καμπανακιού.

export const NOTIFICATIONS_PATH = "/app/notifications";

export type NotificationFilter = "unread" | "all";

export const parseFilter = (value: string | undefined): NotificationFilter =>
  value === "all" ? "all" : "unread";

// Το «Παλαιότερες από»: μόνο έγκυρη στιγμή ISO, αλλιώς null (πρώτη σελίδα).
export const parseBefore = (value: string | undefined): string | null =>
  value && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : null;

export const notificationsHref = (
  filter: NotificationFilter,
  before: string | null = null,
): string => {
  const params = new URLSearchParams();
  if (filter === "all") params.set("show", "all");
  if (before) params.set("before", before);
  const query = params.toString();
  return query ? `${NOTIFICATIONS_PATH}?${query}` : NOTIFICATIONS_PATH;
};

// Πού οδηγεί το «Άνοιγμα»: μόνο εσωτερική διαδρομή /app/…· αλλιώς η σελίδα των Ειδοποιήσεων.
export const safeLink = (link: string | null | undefined): string =>
  link && /^\/app(\/|\?|$)/.test(link) && !link.startsWith("//")
    ? link
    : NOTIFICATIONS_PATH;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (count: number, one: string, many: string): string =>
  `πριν από ${count} ${count === 1 ? one : many}`;

const athensDate = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// «μόλις τώρα», «πριν από 5 λεπτά», «πριν από 2 ώρες», «χθες», «πριν από 3 μέρες», αλλιώς η ημερομηνία (ώρα Ελλάδας).
export function relativeTime(iso: string, now: Date): string {
  const diff = now.getTime() - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  if (diff < MINUTE) return "μόλις τώρα";
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "λεπτό", "λεπτά");
  if (diff < DAY) return plural(Math.floor(diff / HOUR), "ώρα", "ώρες");
  if (diff < 2 * DAY) return "χθες";
  if (diff < 7 * DAY) return plural(Math.floor(diff / DAY), "μέρα", "μέρες");
  return athensDate.format(new Date(iso));
}

// Η ετικέτα του καμπανακιού για αναγνώστες οθόνης, με το πλήθος.
export const bellLabel = (unread: number): string =>
  unread === 0
    ? "Ειδοποιήσεις: καμία αδιάβαστη"
    : `Ειδοποιήσεις: ${unread} ${unread === 1 ? "αδιάβαστη" : "αδιάβαστες"}`;

export const badgeText = (unread: number): string =>
  unread > 99 ? "99+" : String(unread);
