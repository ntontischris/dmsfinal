import type {
  ConversationAudience,
  IgnoreReason,
  UnansweredStatus,
} from "./assistant-view-schema";

// Βοηθητικά των Συζητήσεων (L2) και των Αναπάντητων (L3): διαδρομές, καρτέλες, κείμενα «ρωτήθηκε».

export const CONVERSATIONS_PATH = "/app/knowledge/conversations";
export const UNANSWERED_PATH = "/app/knowledge/unanswered";

export const conversationHref = (id: string): string =>
  `${CONVERSATIONS_PATH}/${id}`;

// Μετά από επιτυχία οι actions γυρίζουν στη λίστα με ?done=…, ώστε το μήνυμα να μείνει ενώ η γραμμή φεύγει από την καρτέλα.
export const DONE_CODES = [
  "covered",
  "covered_not_public",
  "ignored",
  "reopened",
  "deleted",
] as const;
export type DoneCode = (typeof DONE_CODES)[number];

export const parseDone = (value: string | undefined): DoneCode | null =>
  DONE_CODES.find((code) => code === value) ?? null;

export const parseAudienceTab = (
  value: string | undefined,
): ConversationAudience | null =>
  value === "public" || value === "client" || value === "team" ? value : null;

export const parseUnansweredTab = (
  value: string | undefined,
): UnansweredStatus =>
  value === "covered" || value === "ignored" ? value : "open";

export const parsePage = (value: string | undefined): number => {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? Math.min(page, 10_000) : 1;
};

export const pageCount = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));

// Η διεύθυνση μιας λίστας με τα φίλτρα της· οι κενές τιμές παραλείπονται.
export const listHref = (
  path: string,
  params: Record<string, string | number | null>,
): string => {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string | number] => entry[1] !== null)
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  return query ? `${path}?${query}` : path;
};

export const askedText = (count: number): string =>
  `ρωτήθηκε ${count} ${count === 1 ? "φορά" : "φορές"}`;

export const AUDIENCE_LABEL: Readonly<Record<ConversationAudience, string>> = {
  public: "δημόσια",
  client: "πελάτη",
  team: "ομάδας",
};

export const IGNORE_REASON_LABEL: Readonly<Record<IgnoreReason, string>> = {
  off_topic: "εκτός θέματος",
  personal_data: "προσωπικά δεδομένα",
  abuse: "κατάχρηση",
};

// Ποιος ρώτησε, σε μία γραμμή: Επισκέπτης, ή «Όνομα (Πελάτης)».
export const whoText = (
  audience: ConversationAudience,
  who: string | null,
  clientName: string | null,
): string => {
  if (audience === "public") return "Επισκέπτης";
  const name = who ?? "Χρήστης που δεν υπάρχει πια";
  return clientName ? `${name} (${clientName})` : name;
};

const DATE_TIME = new Intl.DateTimeFormat("el-GR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Athens",
});

export const formatDateTime = (iso: string): string =>
  DATE_TIME.format(new Date(iso));
