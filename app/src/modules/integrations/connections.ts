import { AI_MODELS } from "@/lib/ai/config";

import type { IntegrationsFacts, CheckFacts } from "./schemas";

// Η κατάσταση κάθε σύνδεσης (Ν9), ως καθαρή συνάρτηση: γεγονότα της βάσης + «υπάρχει η ρύθμιση;» → κάρτα. Το ίδιο
// αποτέλεσμα θα δείξει και η Υγεία (P2). Τιμές μυστικών δεν φτάνουν ποτέ εδώ: μόνο booleans.

export const CONNECTION_IDS = [
  "google",
  "email",
  "ai",
  "turnstile",
  "analytics",
  "errors",
] as const;
export type ConnectionId = (typeof CONNECTION_IDS)[number];

export const CHECKABLE_IDS = ["google", "email", "ai"] as const;
export type CheckableId = (typeof CHECKABLE_IDS)[number];

export type ConnectionState = "ok" | "warning" | "down" | "not_set_up";

export interface ConnectionUsage {
  label: string;
  used: number;
  limit: number;
  unit: "emails" | "USD";
}

export interface ConnectionStatus {
  id: ConnectionId;
  state: ConnectionState;
  // Γιατί «προσοχή» ή «δεν λειτουργεί»· κενό όταν λειτουργεί.
  reason: string;
  lastSuccessAt: string | null;
  usage: ConnectionUsage | null;
  // Τα μοντέλα AI από το αρχείο ρυθμίσεων του κώδικα, μόνο για ανάγνωση.
  models: readonly { label: string; id: string }[];
  isCheckable: boolean;
  lastCheck: { at: string; isOk: boolean; error: string | null } | null;
}

// Ποιες συνδέσεις έχουν στηθεί (από το περιβάλλον, στον server). Μόνο ναι/όχι.
export type ConfiguredMap = Readonly<Record<CheckableId, boolean>>;

// Το δωρεάν πλάνο του Resend (ADR 0016): 100 την ημέρα· στα 70 ώρα για το επόμενο πλάνο.
export const EMAIL_DAILY_LIMIT = 100;
export const EMAIL_WARN_AT = 70;
const STALE_JOB_MS = 10 * 60_000;
const GOOGLE_STOPPED_MS = 30 * 60_000;

const time = (value: string | null | undefined): number =>
  value ? Date.parse(value) : Number.NaN;

export function latest(
  ...values: readonly (string | null | undefined)[]
): string | null {
  const known = values.filter(
    (value): value is string => Boolean(value) && !Number.isNaN(time(value)),
  );
  return known.length === 0
    ? null
    : known.reduce((a, b) => (time(a) >= time(b) ? a : b));
}

// Ο τελευταίος έλεγχος απέτυχε και από τότε δεν υπάρχει καμία επιτυχία.
const failedSince = (
  check: CheckFacts | undefined,
  lastSuccess: string | null,
): boolean =>
  Boolean(check?.lastFailedAt) &&
  (lastSuccess === null || time(check?.lastFailedAt) > time(lastSuccess));

function lastCheckOf(
  check: CheckFacts | undefined,
): ConnectionStatus["lastCheck"] {
  const at = latest(check?.lastOkAt, check?.lastFailedAt);
  if (!check || !at) return null;
  const isOk = at === check.lastOkAt;
  return { at, isOk, error: isOk ? null : check.lastError };
}

interface Verdict {
  state: ConnectionState;
  reason: string;
}

const OK: Verdict = { state: "ok", reason: "" };
const down = (reason: string): Verdict => ({ state: "down", reason });
const warning = (reason: string): Verdict => ({ state: "warning", reason });
const CHECK_FAILED = "Ο τελευταίος «Έλεγχος τώρα» απέτυχε.";

function base(
  id: ConnectionId,
  check: CheckFacts | undefined,
  isCheckable: boolean,
) {
  return {
    id,
    isCheckable,
    lastCheck: lastCheckOf(check),
    usage: null,
    models: [],
  };
}

function notSetUp(id: ConnectionId, isCheckable: boolean): ConnectionStatus {
  return {
    ...base(id, undefined, isCheckable),
    state: "not_set_up",
    reason: "",
    lastSuccessAt: null,
  };
}

function emailVerdict(
  facts: IntegrationsFacts,
  lastSuccess: string | null,
  now: number,
): Verdict {
  const { email } = facts;
  if (failedSince(facts.checks.email, lastSuccess)) return down(CHECK_FAILED);
  if (email.jobOkAt && now - time(email.jobOkAt) > STALE_JOB_MS)
    return down("Η ουρά email δεν έχει τρέξει με επιτυχία πάνω από 10 λεπτά.");
  if (email.failedToday > 0)
    return warning(`Απέτυχαν σήμερα ${email.failedToday} αποστολές.`);
  if (email.sentToday >= EMAIL_WARN_AT)
    return warning(
      `Πάνω από ${EMAIL_WARN_AT} emails σήμερα: ώρα για το επόμενο πλάνο.`,
    );
  return OK;
}

function emailStatus(facts: IntegrationsFacts, now: number): ConnectionStatus {
  const lastSuccessAt = latest(
    facts.email.lastSentAt,
    facts.checks.email?.lastOkAt,
  );
  return {
    ...base("email", facts.checks.email, true),
    ...emailVerdict(facts, lastSuccessAt, now),
    lastSuccessAt,
    usage: {
      label: "Σήμερα",
      used: facts.email.sentToday,
      limit: EMAIL_DAILY_LIMIT,
      unit: "emails",
    },
  };
}

function googleVerdict(
  facts: IntegrationsFacts,
  lastSuccess: string | null,
  now: number,
): Verdict {
  const { google } = facts;
  if (failedSince(facts.checks.google, lastSuccess)) return down(CHECK_FAILED);
  if (google.errorSince && now - time(google.errorSince) > GOOGLE_STOPPED_MS)
    return down("Ο συγχρονισμός αποτυγχάνει για πάνω από 30 λεπτά.");
  if (!google.calendarConnected)
    return warning("Το Εταιρικό ημερολόγιο δεν έχει δημιουργηθεί ακόμα.");
  if (google.lastError)
    return warning("Ο τελευταίος συγχρονισμός είχε σφάλμα.");
  if (!google.lastSyncAt || now - time(google.lastSyncAt) > GOOGLE_STOPPED_MS)
    return warning("Δεν έχει γίνει συγχρονισμός τα τελευταία 30 λεπτά.");
  return OK;
}

function googleStatus(facts: IntegrationsFacts, now: number): ConnectionStatus {
  const lastSuccessAt = latest(
    facts.google.lastSyncAt,
    facts.checks.google?.lastOkAt,
  );
  return {
    ...base("google", facts.checks.google, true),
    ...googleVerdict(facts, lastSuccessAt, now),
    lastSuccessAt,
  };
}

function aiVerdict(
  facts: IntegrationsFacts,
  lastSuccess: string | null,
): Verdict {
  const { spentMicros, capMicros } = facts.ai;
  if (failedSince(facts.checks.ai, lastSuccess)) return down(CHECK_FAILED);
  if (capMicros <= 0) return down("Το πλαφόν είναι 0: το AI είναι κλειστό.");
  if (spentMicros >= capMicros)
    return down(
      "Η δαπάνη του μήνα έφτασε το πλαφόν: το AI σταμάτησε ως την 1η του μήνα.",
    );
  if (spentMicros * 100 >= capMicros * 80)
    return warning("Η δαπάνη του μήνα πέρασε το 80% του πλαφόν.");
  return OK;
}

export const AI_MODEL_LIST: ConnectionStatus["models"] = [
  { label: "Συζήτηση", id: AI_MODELS.chat },
  { label: "Αναζήτηση (embeddings)", id: AI_MODELS.embedding },
];

function aiStatus(facts: IntegrationsFacts): ConnectionStatus {
  const lastSuccessAt = latest(facts.ai.lastUsedAt, facts.checks.ai?.lastOkAt);
  return {
    ...base("ai", facts.checks.ai, true),
    ...aiVerdict(facts, lastSuccessAt),
    lastSuccessAt,
    usage: {
      label: "Αυτόν τον μήνα",
      used: facts.ai.spentMicros / 1_000_000,
      limit: facts.ai.capMicros / 1_000_000,
      unit: "USD",
    },
    models: AI_MODEL_LIST,
  };
}

// Όλες οι κάρτες, με τη σειρά της οθόνης. Turnstile, στατιστικά και καταγραφή σφαλμάτων: «δεν έχει στηθεί» ως την Ιστοσελίδα.
export function connectionStatuses(
  facts: IntegrationsFacts,
  configured: ConfiguredMap,
): ConnectionStatus[] {
  const now = time(facts.now);
  return [
    configured.google ? googleStatus(facts, now) : notSetUp("google", true),
    configured.email ? emailStatus(facts, now) : notSetUp("email", true),
    configured.ai ? aiStatus(facts) : { ...notSetUp("ai", true), models: AI_MODEL_LIST },
    notSetUp("turnstile", false),
    notSetUp("analytics", false),
    notSetUp("errors", false),
  ];
}
