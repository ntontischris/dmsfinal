import type { Viewer } from "@/modules/access";

import { NO_MANAGER_LABEL } from "./labels";
import type {
  ActivityLookups,
  ActivityRow,
  BoardColumn,
  ClientAccess,
  ClientRow,
  FormRouting,
  ListItem,
  Opportunity,
  Outcome,
  PickerClient,
  SalesCaps,
  SalesSettings,
} from "./types";

// Καθαρές συναρτήσεις του module: ημερομηνίες Αθήνας, Δικαιώματα της οθόνης, ομαδοποίηση, κείμενα Δραστηριοτήτων.
// Καμία είσοδος/έξοδος· η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

const ATHENS = "Europe/Athens";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DASH = "—";

const athensParts = (date: Date): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ATHENS,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

export const athensToday = (now: Date = new Date()): string => {
  const p = athensParts(now);
  return `${p.year}-${p.month}-${p.day}`;
};

// Ξεχασμένη = ανοιχτή Ευκαιρία με Επόμενο βήμα που η ημερομηνία του πέρασε (ίδια μέρα δεν μετράει).
export const isForgotten = (
  opportunity: { outcome: Outcome; nextStepDue: string | null },
  today: string,
): boolean =>
  opportunity.outcome === "open" &&
  opportunity.nextStepDue !== null &&
  opportunity.nextStepDue < today;

const DAY_MS = 86_400_000;
const dayNumber = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS;

export const daysOverdue = (due: string, today: string): number =>
  Math.max(0, Math.round(dayNumber(today) - dayNumber(due)));

// Μόνο ημερομηνία (YYYY-MM-DD) δεν μετακινείται από ζώνη ώρας· το timestamp διαβάζεται στην Αθήνα.
export const formatDate = (iso: string): string => {
  if (DATE_ONLY.test(iso)) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }
  const p = athensParts(new Date(iso));
  return `${p.day}/${p.month}/${p.year}`;
};

export const formatDateTime = (iso: string): string => {
  const p = athensParts(new Date(iso));
  return `${p.day}/${p.month}/${p.year}, ${p.hour}:${p.minute}`;
};

export const takenMessage = (managerName: string | null): string =>
  managerName
    ? `Ο Πελάτης ανήκει στον/στην ${managerName}. Για νέα Ευκαιρία ζήτα πρόσβαση από τη Διαχείριση.`
    : "Ο Πελάτης δεν έχει ακόμα Υπεύθυνο. Για νέα Ευκαιρία ζήτα πρόσβαση από τη Διαχείριση.";

const NO_CAPS: SalesCaps = {
  userId: null,
  canViewClients: false,
  canManage: false,
  manageScope: null,
  canTransfer: false,
  canMerge: false,
  canManageSettings: false,
};

export const salesCaps = (viewer: Viewer): SalesCaps => {
  if (viewer.status !== "signed-in" || !viewer.team) return NO_CAPS;
  const grants = viewer.team.permissions;
  const has = (permission: string): boolean => grants[permission] !== undefined;
  return {
    userId: viewer.userId,
    canViewClients: has("clients.view") || has("clients.manage"),
    canManage: has("clients.manage"),
    manageScope: grants["clients.manage"] ?? null,
    canTransfer: has("clients.transfer"),
    canMerge: has("clients.merge"),
    canManageSettings: has("settings.manage"),
  };
};

export const clientAccess = (
  caps: SalesCaps,
  client: { managerId: string | null },
): ClientAccess => {
  if (caps.userId !== null && client.managerId === caps.userId) return "owner";
  if (caps.manageScope === "all") return "all";
  return "granted";
};

export const toPickerClient = (row: ClientRow, caps: SalesCaps): PickerClient => ({
  id: row.id,
  name: row.name,
  isMine:
    caps.manageScope === "all" ||
    (caps.userId !== null && row.managerId === caps.userId),
  managerName: row.managerName,
});

// Πρώτη η πιο πρόσφατη προθεσμία (δηλαδή οι ξεχασμένες)· χωρίς ημερομηνία πάνε στο τέλος.
const byDueDate = (a: Opportunity, b: Opportunity): number => {
  if (a.nextStepDue === b.nextStepDue) return 0;
  if (a.nextStepDue === null) return 1;
  if (b.nextStepDue === null) return -1;
  return a.nextStepDue < b.nextStepDue ? -1 : 1;
};

export const groupByStage = (
  stages: readonly ListItem[],
  open: readonly Opportunity[],
): BoardColumn[] =>
  stages
    .filter((stage) => !stage.isRetired)
    .toSorted((a, b) => a.sort - b.sort)
    .map((stage) => ({
      stage,
      cards: open
        .filter((o) => o.outcome === "open" && o.stageId === stage.id)
        .toSorted(byDueDate),
    }));

const nameIn = (names: Readonly<Record<string, string>>, id: string | null): string =>
  (id !== null ? names[id] : undefined) ?? DASH;

const describeAssignment = (a: ActivityRow, users: ActivityLookups["users"]): string => {
  if (a.subjectId === null) return `Η Ευκαιρία γύρισε στην ουρά «${NO_MANAGER_LABEL}».`;
  if (a.previousId === null) return `Ανατέθηκε στον/στην ${nameIn(users, a.subjectId)}.`;
  return `Μεταβιβάστηκε από ${nameIn(users, a.previousId)} σε ${nameIn(users, a.subjectId)}.`;
};

const SYSTEM_KIND = "σύστημα";

export const describeActivity = (
  a: ActivityRow,
  lookups: ActivityLookups,
): { kind: string; text: string } => {
  switch (a.event) {
    case null:
      return {
        kind: (a.kindId !== null ? lookups.kinds[a.kindId] : undefined) ?? "Δραστηριότητα",
        text: a.body,
      };
    case "created":
      return {
        kind: SYSTEM_KIND,
        text: `Η Ευκαιρία δημιουργήθηκε στο Στάδιο «${nameIn(lookups.stages, a.subjectId)}».`,
      };
    case "stage_changed":
      return {
        kind: SYSTEM_KIND,
        text: `Αλλαγή Σταδίου: «${nameIn(lookups.stages, a.previousId)}» → «${nameIn(lookups.stages, a.subjectId)}».`,
      };
    case "assigned":
      return { kind: SYSTEM_KIND, text: describeAssignment(a, lookups.users) };
    case "lost":
      return {
        kind: SYSTEM_KIND,
        text: `Έκλεισε ως χαμένη: ${nameIn(lookups.lossReasons, a.subjectId)}.`,
      };
    // Το κείμενο το γράφει η βάση των Συμφωνιών στο body.
    case "agreement":
      return { kind: "Συμφωνία", text: a.body };
  }
};

export const nextSort = (items: readonly { sort: number }[]): number =>
  items.length === 0 ? 10 : Math.max(...items.map((item) => item.sort)) + 10;

// Η επιλογή «Πού πάνε οι νέες Ευκαιρίες» είναι ένα πεδίο: owner | queue | id προσώπου.
export const parseRoutingValue = (
  value: string,
): { routing: FormRouting; assigneeId: string | null } | null => {
  if (value === "owner" || value === "queue") return { routing: value, assigneeId: null };
  if (UUID.test(value)) return { routing: "person", assigneeId: value };
  return null;
};

export const routingValue = (
  settings: Pick<SalesSettings, "formRouting" | "formAssigneeId">,
): string =>
  settings.formRouting === "person" && settings.formAssigneeId
    ? settings.formAssigneeId
    : settings.formRouting === "queue"
      ? "queue"
      : "owner";
