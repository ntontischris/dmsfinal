import type { DeliverableCard } from "@/modules/deliverables";
import type { StatProps } from "@/spaces/kit/panel";
import type { BadgeTone } from "@/spaces/screens/shared";

import type {
  PeriodBalance,
  ProductionDetail,
  ProductionFilming,
  ProductionHistoryEntry,
  ProductionTask,
} from "../types";

// Καθαρές συναρτήσεις της Σελίδας Παραγωγής (prototype `screens/g2-model.ts`, `g2-strip.ts`, `g2-sections.tsx`) πάνω στην
// πραγματική Παραγωγή της βάσης. Οι αλλαγές δεν γίνονται εδώ (όπως στο prototype): τις κάνει η βάση και η σελίδα ξαναδιαβάζεται.

export const countLabel = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const OPEN_FILMING_STATES = ["pending", "scheduled"];

const isOpenDeliverable = (card: DeliverableCard): boolean =>
  card.state !== "approved" && card.state !== "cancelled";

const liveDeliverables = (detail: ProductionDetail): DeliverableCard[] =>
  detail.deliverables.filter((card) => card.state !== "cancelled");

// Τι λείπει για την αυτόματη παράδοση: ίδιος κανόνας με τη βάση (authz.production_is_complete).
export const deliveryBlockers = (detail: ProductionDetail): string[] => {
  const live = liveDeliverables(detail);
  const notApproved = live.filter(isOpenDeliverable).length;
  const openFilmings = detail.filmings.filter((filming) =>
    OPEN_FILMING_STATES.includes(filming.state),
  ).length;
  return [
    ...(live.length === 0 ? ["δεν υπάρχει ακόμα Παραδοτέο"] : []),
    ...(notApproved > 0 ? [`${notApproved} Παραδοτέα δεν έχουν εγκριθεί`] : []),
    ...(openFilmings > 0 ? [`${openFilmings} ανοιχτά Γυρίσματα`] : []),
  ];
};

// Η λωρίδα της σελίδας: πού βρίσκεται η δουλειά. Το «Τώρα» του prototype λείπει (δεν υπάρχει ανάγνωση ανά Παραγωγή).
export const productionStats = (detail: ProductionDetail): StatProps[] => {
  const live = liveDeliverables(detail);
  const approved = live.filter((card) => card.state === "approved").length;
  return [
    {
      label: "Παραδοτέα",
      value: `${approved}/${live.length}`,
      hint: "εγκεκριμένα",
    },
    { label: "Γυρίσματα", value: String(detail.filmings.length) },
    {
      label: "Ανοιχτές εργασίες",
      value: String(detail.tasks.filter((task) => !task.done).length),
    },
  ];
};

// ── Μέλη ──

export interface MemberRow {
  userId: string;
  name: string;
  reason: string;
  open: number;
  isOwner: boolean;
}

// Ο λόγος που κάποιος είναι Μέλος: από το τελευταίο «Προστέθηκε Μέλος» του Ίχνους (ανάθεση ή με το χέρι).
const reasonOf = (
  history: readonly ProductionHistoryEntry[],
  userId: string,
): string => {
  const added = history.find(
    (entry) =>
      entry.event === "member_added" && entry.after?.user_id === userId,
  );
  if (!added) return "Μέλος";
  return added.after?.reason === "assignment" ? "από ανάθεση" : "με το χέρι";
};

// Ανοιχτές αναθέσεις: Εργασίες που δεν έγιναν και Παραδοτέα που δεν εγκρίθηκαν ούτε ακυρώθηκαν.
export const openAssignmentsOf = (
  detail: ProductionDetail,
  userId: string,
): number =>
  detail.tasks.filter((task) => task.assigneeId === userId && !task.done)
    .length +
  detail.deliverables.filter(
    (card) => card.assigneeId === userId && isOpenDeliverable(card),
  ).length;

// Ο Υπεύθυνος πρώτος (στη βάση δεν γράφεται στα Μέλη), μετά τα Μέλη. Το Ίχνος έρχεται νεότερο πρώτο.
export const memberRowsOf = (detail: ProductionDetail): MemberRow[] => {
  const owner = detail.owner;
  const ownerRow: MemberRow[] = owner?.id
    ? [
        {
          userId: owner.id,
          name: owner.name,
          reason: "Υπεύθυνος",
          open: openAssignmentsOf(detail, owner.id),
          isOwner: true,
        },
      ]
    : [];
  return [
    ...ownerRow,
    ...detail.members.map((member) => ({
      userId: member.userId,
      name: member.name,
      reason: reasonOf(detail.history, member.userId),
      open: openAssignmentsOf(detail, member.userId),
      isOwner: false,
    })),
  ];
};

// ── Εργασίες ──

export const taskSummary = (tasks: readonly ProductionTask[]): string => {
  const done = tasks.filter((task) => task.done).length;
  return `${done}/${tasks.length} ολοκληρώθηκαν · ${countLabel(
    tasks.length - done,
    "ανοιχτή",
    "ανοιχτές",
  )}`;
};

// ── Παροχές της Περιόδου ──

export interface ProvisionRow {
  kindId: string;
  label: string;
  total: number;
  used: number;
  reserved: number;
  left: number;
}

export const provisionRowsOf = (
  balances: readonly PeriodBalance[],
): ProvisionRow[] =>
  balances.map((balance) => ({
    kindId: balance.kindId,
    label: balance.label,
    total: balance.given + balance.carried,
    used: balance.used,
    reserved: balance.reserved,
    left: Math.max(0, balance.balance),
  }));

export const provisionSub = (row: ProvisionRow): string =>
  [
    `σύνολο ${row.total}`,
    `χρησιμοποιήθηκαν ${row.used}`,
    row.reserved > 0 && `δεσμεύτηκαν ${row.reserved}`,
    `απομένουν ${row.left}`,
  ]
    .filter(Boolean)
    .join(" · ");

// ── Γυρίσματα ──

export const FILMING_WORDS: Readonly<Record<string, string>> = {
  pending: "αναμένει έγκριση",
  scheduled: "προγραμματισμένο",
  done: "έγινε",
  no_show: "δεν έγινε",
  cancelled: "ακυρώθηκε",
  rejected: "απορρίφθηκε",
};

export const filmingWord = (filming: ProductionFilming): string =>
  FILMING_WORDS[filming.state] ?? filming.state;

// ── Παραδοτέα ──

const DELIVERABLE_WORDS: Readonly<Record<DeliverableCard["state"], string>> = {
  draft: "σε εργασία",
  in_review: "σε εργασία",
  returned: "σε εργασία",
  awaiting_client: "αναμένει πελάτη",
  changes_requested: "χρειάζεται αλλαγές",
  approved: "εγκρίθηκε",
  superseded: "αντικαταστάθηκε",
  cancelled: "ακυρώθηκε",
};

const DELIVERABLE_TONE: Readonly<Record<string, BadgeTone | undefined>> = {
  εγκρίθηκε: "strong",
  "αναμένει πελάτη": "waiting",
  ακυρώθηκε: "faded",
};

const CHARGE_WORDS: Readonly<Record<DeliverableCard["charge"], string | null>> =
  {
    included: null,
    free: "χωρίς χρέωση",
    charged: "χρεώνεται",
    pending: "να αποφασιστεί χρέωση",
  };

const CANCEL_WORDS: Readonly<Record<string, string>> = {
  consumed: "καταναλώθηκε",
  returned: "επιστρέφει",
};

export interface DeliverableLine {
  id: string;
  title: string;
  lead: string;
  sub: string;
  state: string;
  tone: BadgeTone | undefined;
  isFaded: boolean;
  badges: readonly { text: string; tone?: BadgeTone }[];
}

const fmtDay = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const subOf = (card: DeliverableCard, isInternal: boolean): string =>
  [
    card.kind,
    card.assigneeName ?? "χωρίς ανάθεση",
    card.deadline && `προθεσμία ${fmtDay(card.deadline)}`,
    card.state === "awaiting_client" &&
      card.daysWaiting > 0 &&
      `${countLabel(card.daysWaiting, "μέρα", "μέρες")} στον πελάτη`,
    !isInternal &&
      `γύροι ${card.roundsUsed}${card.roundsLimit === null ? "" : `/${card.roundsLimit}`}`,
    card.cancelledAt &&
      `Ακυρώθηκε: ${card.cancelReason ?? "—"} Παροχή: ${CANCEL_WORDS[card.cancelOutcome ?? ""] ?? "—"}.`,
  ]
    .filter(Boolean)
    .join(" · ");

const badgesOf = (card: DeliverableCard): DeliverableLine["badges"] => {
  const charge = CHARGE_WORDS[card.charge];
  return [
    ...(card.isLate
      ? [{ text: "καθυστερεί", tone: "attention" as const }]
      : []),
    ...(card.state === "in_review"
      ? [{ text: "αναμένει εσωτερικό έλεγχο" }]
      : []),
    ...(card.state === "returned" ? [{ text: "επιστράφηκε από έλεγχο" }] : []),
    ...(charge ? [{ text: `έξτρα · ${charge}` }] : []),
  ];
};

export const deliverableLineOf = (
  card: DeliverableCard,
  isInternal: boolean,
): DeliverableLine => {
  const state = DELIVERABLE_WORDS[card.state];
  return {
    id: card.id,
    title: card.title,
    lead: card.versionCount > 0 ? `v${card.versionCount}` : "—",
    sub: subOf(card, isInternal),
    state,
    tone: DELIVERABLE_TONE[state],
    isFaded: card.state === "cancelled",
    badges: badgesOf(card),
  };
};

// ── Κατάσταση ──

// Ημέρα στη ζώνη της Αθήνας (dd/mm/yyyy) από στιγμή της βάσης.
export const athensDay = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

export interface StateStory {
  when: string;
  by: string; // «σύστημα» ή όνομα
  text: string; // σχόλιο παράδοσης ή λόγος ακύρωσης
}

const actorOfEvent = (
  history: readonly ProductionHistoryEntry[],
  event: string,
): string =>
  history.find((entry) => entry.event === event)?.actorName ?? "—";

// Πότε και από ποιον παραδόθηκε: αυτόματα = «σύστημα», αλλιώς ο Χρήστης του τελευταίου «Παραδόθηκε» στο Ίχνος.
export const deliveryOf = (detail: ProductionDetail): StateStory | null =>
  detail.deliveredAt
    ? {
        when: athensDay(detail.deliveredAt),
        by: detail.autoDelivered
          ? "σύστημα"
          : actorOfEvent(detail.history, "delivered"),
        text: detail.autoDelivered ? "" : (detail.deliveredNote ?? ""),
      }
    : null;

export const cancellationOf = (detail: ProductionDetail): StateStory | null =>
  detail.cancelledAt
    ? {
        when: athensDay(detail.cancelledAt),
        by: actorOfEvent(detail.history, "cancelled"),
        text: detail.cancelledReason ?? "",
      }
    : null;
