// Οι κάρτες-κάδρα της Σήμερα (ίδια μορφή με τα «Χρήματα»): καθαρές συναρτήσεις για αρχικά, ετικέτα και επιλογή ομάδας.

import { athensStamp } from "./a1-adapter";
import { daysWord } from "./a1-facts";
import { GROUP_OF } from "./a1-list";
import type { ListGroup, ListLine, ListMore, TodayGroupId } from "./a1-list";
import type { CardRow } from "./a1-model";

const DAY_MS = 86_400_000;
const MAX_FACES = 3;
const MAX_NAMED = 2;
const HALF_YEAR_DAYS = 183;
const OTHER_NOUN = "άλλα";

// Τι είναι κάθε γραμμή μιας κάρτας, στον πληθυντικό: για το «8 προς τιμολόγηση · …» και το «Και 5 ακόμα εργασίες».
const NOUN_OF: Readonly<Record<string, string>> = {
  week_filming: "γυρίσματα",
  filming_no_script: "χωρίς σενάριο",
  equipment_repair: "εξοπλισμός",
  unread_messages: "μηνύματα",
  requests_mentions: "αιτήματα",
  filming_approvals: "εγκρίσεις γυρισμάτων",
  versions_to_review: "εκδόσεις",
  proposal_approvals: "προτάσεις",
  my_tasks: "εργασίες",
  my_deliverables: "παραδοτέα",
  client_reminders: "υπενθυμίσεις",
  unassigned: "χωρίς ανάθεση",
  crew_declined: "αρνήσεις",
  crew_silent: "χωρίς απάντηση",
  version_late: "καθυστερημένες εκδόσεις",
  to_invoice: "προς τιμολόγηση",
  overdue_invoices: "ληξιπρόθεσμα",
  rounds_over_limit: "γύροι πάνω από όριο",
  cost_hours: "θέλουν ώρες",
  next_steps_due: "επόμενα βήματα",
  proposals_in_progress: "προτάσεις σε εξέλιξη",
  agreement_ending: "Συμφωνίες λήγουν",
  agreement_signed: "νέες Συμφωνίες",
  health: "υγεία",
  readiness: "ετοιμότητα",
  gdpr: "GDPR",
  google_deletions: "Google",
  unanswered: "αναπάντητες ερωτήσεις",
};

// Ο ενικός, όπου διαφέρει: «1 πρόταση», «Και 1 ακόμα ληξιπρόθεσμο».
const SINGULAR_OF: Readonly<Record<string, string>> = {
  week_filming: "γύρισμα",
  unread_messages: "μήνυμα",
  requests_mentions: "αίτημα",
  filming_approvals: "έγκριση γυρίσματος",
  versions_to_review: "έκδοση",
  proposal_approvals: "πρόταση",
  my_tasks: "εργασία",
  my_deliverables: "παραδοτέο",
  client_reminders: "υπενθύμιση",
  crew_declined: "άρνηση",
  version_late: "καθυστερημένη έκδοση",
  overdue_invoices: "ληξιπρόθεσμο",
  rounds_over_limit: "γύρος πάνω από όριο",
  cost_hours: "θέλει ώρες",
  next_steps_due: "επόμενο βήμα",
  proposals_in_progress: "πρόταση σε εξέλιξη",
  agreement_ending: "Συμφωνία λήγει",
  agreement_signed: "νέα Συμφωνία",
  unanswered: "αναπάντητη ερώτηση",
};

export const nounOf = (cardId: string, count = 2): string =>
  (count === 1 ? SINGULAR_OF[cardId] : undefined) ??
  NOUN_OF[cardId] ??
  OTHER_NOUN;

// Πού βρίσκεται ο Πελάτης στη γραμμή κάθε κάρτας (όπως τη χτίζει η βάση)· όσες λείπουν δεν έχουν Πελάτη.
const CLIENT_IN_LABEL: ReadonlySet<string> = new Set([
  "to_invoice",
  "overdue_invoices",
  "unread_messages",
  "agreement_ending",
  "agreement_signed",
]);
const CLIENT_IN_NOTE: ReadonlySet<string> = new Set([
  "cost_hours",
  "proposal_approvals",
  "versions_to_review",
  "rounds_over_limit",
]);

// Το σύμβολο της ομάδας, όταν η γραμμή δεν έχει Πελάτη.
const GLYPH_OF: Readonly<Record<TodayGroupId, string>> = {
  time: "◷",
  client: "✉",
  mine: "✓",
  externals: "⇄",
  money: "€",
  keep: "↻",
  company: "⚙",
};

// Το πρώτο μέρος της ετικέτας (πριν από «—», «·», «•» ή κόμμα)· δύο λέξεις → δύο γράμματα, μόνο λέξεις με γράμματα.
export const initialsOf = (label: string): string =>
  (label.split(/\s[—·•]\s|,\s/)[0] ?? "")
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const stampOf = (iso: string): string | null => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : athensStamp(new Date(time));
};

const daysBetween = (from: string, to: string): number =>
  Math.round(
    (Date.parse(`${to}T12:00Z`) - Date.parse(`${from}T12:00Z`)) / DAY_MS,
  );

const waitingTagOf = (since: string, today: string): string | null => {
  const stamp = stampOf(since);
  if (!stamp) return null;
  const days = Math.max(0, daysBetween(stamp.slice(0, 10), today));
  return days === 0 ? "σήμερα" : daysWord(days);
};

const atTagOf = (at: string, today: string): string | null => {
  const stamp = stampOf(at);
  if (!stamp) return null;
  const day = stamp.slice(0, 10);
  const time = stamp.slice(11, 16);
  const offset = daysBetween(today, day);
  if (offset === 0) return `σήμερα ${time}`;
  if (offset === 1) return `αύριο ${time}`;
  return `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
};

const MONTHS = [
  "Ιαν",
  "Φεβ",
  "Μαρ",
  "Απρ",
  "Μαΐ",
  "Ιουν",
  "Ιουλ",
  "Αυγ",
  "Σεπ",
  "Οκτ",
  "Νοε",
  "Δεκ",
];
const DEADLINE = /προθεσμία (\d{1,2}) (\p{L}+)/u;

// «προθεσμία 17 Οκτ» στη δεύτερη γραμμή: πόσες μέρες πέρασαν (χρονιά: η πιο κοντινή στο σήμερα).
const lateTagOf = (note: string | undefined, today: string): string | null => {
  const match = note ? DEADLINE.exec(note) : null;
  const month = match ? MONTHS.indexOf(match[2] ?? "") + 1 : 0;
  if (!match || month === 0) return null;
  const monthDay = `${String(month).padStart(2, "0")}-${(match[1] ?? "").padStart(2, "0")}`;
  const year = Number(today.slice(0, 4));
  const thisYear = `${year}-${monthDay}`;
  const due =
    daysBetween(today, thisYear) > HALF_YEAR_DAYS
      ? `${year - 1}-${monthDay}`
      : thisYear;
  const late = daysBetween(due, today);
  return late > 0 ? `${daysWord(late)} πίσω` : null;
};

// Η ετικέτα της γραμμής: πόσο περιμένει, αλλιώς πότε είναι, αλλιώς πόσο πέρασε η προθεσμία· αλλιώς τίποτα.
export const lineTagOf = (row: CardRow, today: string): string | null => {
  if (row.waitingSince) return waitingTagOf(row.waitingSince, today);
  if (row.at) return atTagOf(row.at, today);
  return lateTagOf(row.note, today);
};

const clientInitialsOf = ({ cardId, row }: ListLine): string => {
  if (CLIENT_IN_LABEL.has(cardId)) return initialsOf(row.label);
  if (CLIENT_IN_NOTE.has(cardId)) return initialsOf(row.note ?? "");
  return "";
};

// Το κουτάκι της γραμμής: τα αρχικά του Πελάτη, αλλιώς το σύμβολο της ομάδας.
export const thumbOf = (line: ListLine): { text: string; isIcon: boolean } => {
  const initials = clientInitialsOf(line);
  return initials
    ? { text: initials, isIcon: false }
    : { text: GLYPH_OF[GROUP_OF[line.cardId] ?? "company"], isIcon: true };
};

// Τα πρόσωπα της κάρτας: έως τρία διαφορετικά αρχικά Πελατών, με τη σειρά των γραμμών.
export const facesOf = (group: ListGroup): readonly string[] =>
  [...new Set(group.lines.map(clientInitialsOf).filter(Boolean))].slice(
    0,
    MAX_FACES,
  );

// Ίδια μέτρηση με το countedOf: η εταιρεία μόνο τα επείγοντα, οι άλλες γραμμές + «και άλλα N».
const countsOf = (group: ListGroup): ReadonlyMap<string, number> => {
  const lines =
    group.id === "company"
      ? group.lines.filter((line) => line.row.isUrgent)
      : group.lines;
  const items = [
    ...lines.map((line) => ({ cardId: line.cardId, count: 1 })),
    ...(group.id === "company" ? [] : group.more),
  ];
  return items.reduce(
    (map, { cardId, count }) => map.set(cardId, (map.get(cardId) ?? 0) + count),
    new Map<string, number>(),
  );
};

// Τι μετράει ο μεγάλος αριθμός: έως δύο είδη με όνομα (τα πολλά πρώτα), τα υπόλοιπα «άλλα».
export const breakdownOf = (group: ListGroup): string => {
  const sorted = [...countsOf(group)].sort((a, b) => b[1] - a[1]);
  const named = sorted
    .slice(0, MAX_NAMED)
    .map(([cardId, count]) => `${count} ${nounOf(cardId, count)}`);
  const rest = sorted
    .slice(MAX_NAMED)
    .reduce((sum, [, count]) => sum + count, 0);
  const other = rest === 1 ? "1 άλλο" : `${rest} ${OTHER_NOUN}`;
  return [...named, ...(rest > 0 ? [other] : [])].join(" · ");
};

export const moreLabelOf = ({ cardId, count }: ListMore): string =>
  `Και ${count} ακόμα ${nounOf(cardId, count)} →`;

// «ΕΠΕΙΓΕΙ» μόνο σε ό,τι μετράει και η πρώτη πρόταση (αποφάσεις, ληξιπρόθεσμα) και σε επείγουσα υγεία συστήματος.
const isUrgentLine = (
  { cardId, row }: ListLine,
  decisionIds: ReadonlySet<string>,
): boolean =>
  decisionIds.has(cardId) ||
  cardId === "overdue_invoices" ||
  (cardId === "health" && row.isUrgent === true);

export const isUrgentGroup = (
  group: ListGroup,
  decisionIds: ReadonlySet<string>,
): boolean => group.lines.some((line) => isUrgentLine(line, decisionIds));

// Η ανοιχτή κάρτα: όποια ζητήθηκε (?g=), αλλιώς η πρώτη με επείγον, αλλιώς η πρώτη.
export const selectedGroupOf = (
  groups: readonly ListGroup[],
  requested: string | undefined,
  decisionIds: ReadonlySet<string>,
): ListGroup | null =>
  groups.find((group) => group.id === requested) ??
  groups.find((group) => isUrgentGroup(group, decisionIds)) ??
  groups[0] ??
  null;
