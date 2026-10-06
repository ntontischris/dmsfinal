import type {
  LinkHost,
  Version,
  VersionComment,
  VersionState,
} from "@/data/deliverables";
import {
  clientVersions,
  detailOf,
  findDeliverable,
  roundsOf,
  visibleDeliverables,
} from "@/data/deliverables-access";
import { provisionsOf } from "@/data/agreements";
import { NOW, type ProductionStub } from "@/data/filming";
import type { DeliverableState, DeliverableSummary } from "@/data/productions";
import {
  agreementOf,
  periodOfProduction,
  recordOf,
  visibleProductions,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import { whoLabel } from "@/screens/g2-model";

export const DEFAULT_DELIVERABLE_ID = "d-kypseli-09-3";
export const CLIENT_USER = "Μαρία Παπαδάκη";
export const TODAY_ISO = NOW.slice(0, 10);

export type ClientStatus =
  "σε εργασία" | "περιμένει εσένα" | "εγκρίθηκε" | "ακυρώθηκε";

// Όπως το βλέπει ο πελάτης: «αναμένει πελάτη» γίνεται «περιμένει εσένα».
export const clientStatusOf = (state: DeliverableState): ClientStatus =>
  state === "αναμένει πελάτη" ? "περιμένει εσένα" : state;

const VERSION_LABELS: Readonly<Record<VersionState, string>> = {
  "αναμένει εσωτερικό έλεγχο": "σε εργασία",
  "επιστράφηκε από έλεγχο": "σε εργασία",
  "αναμένει πελάτη": "περιμένει εσένα",
  εγκρίθηκε: "εγκρίθηκε",
  "χρειάζεται αλλαγές": "ζητήθηκαν αλλαγές",
  αντικαταστάθηκε: "αντικαταστάθηκε",
};

export const fmtClock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// mm:ss σε δευτερόλεπτα· null όταν δεν είναι έγκυρο.
export const parseClock = (text: string): number | null => {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(text.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export interface ClientComment {
  id: string;
  who: string;
  isClient: boolean;
  when: string;
  text: string;
  at?: number;
  isBrokenLink?: boolean;
}

export interface ClientVersionView {
  number: number;
  link: string;
  host: LinkHost;
  sentAt: string;
  stateLabel: string;
  isApproved: boolean;
  answer?: { by: string; when: string; isApproval: boolean };
  linkFixedAt?: string;
  comments: readonly ClientComment[];
}

export interface H4View {
  id: string;
  title: string;
  kindName: string;
  productionId: string;
  status: ClientStatus;
  rounds: { used: number; limit: number; nextIsCharged: boolean };
  approvedAt?: string;
  finalLink?: string;
  openRequest?: { when: string; text: string };
  versions: readonly ClientVersionView[];
}

const toClientComment = (c: VersionComment): ClientComment => ({
  id: c.id,
  who: c.isClient ? c.who : whoLabel(c.who),
  isClient: c.isClient,
  when: c.when,
  text: c.text,
  at: c.at,
  isBrokenLink: c.isBrokenLink,
});

const toVersionView = (v: Version): ClientVersionView => ({
  number: v.number,
  link: v.link,
  host: v.host,
  sentAt: v.sentAt ?? v.addedAt,
  stateLabel: VERSION_LABELS[v.state],
  isApproved: v.state === "εγκρίθηκε",
  answer: v.answer && { ...v.answer, isApproval: v.state === "εγκρίθηκε" },
  linkFixedAt: v.linkFixedAt,
  comments: v.comments.map(toClientComment),
});

export const viewOf = (
  d: DeliverableSummary,
  kindName: string,
  isEmpty: boolean,
): H4View => {
  const detail = detailOf(d);
  const versions = isEmpty ? [] : clientVersions(detail).map(toVersionView);
  const approved = versions.find((v) => v.isApproved);
  const open = detail.requests.find((r) => !r.decided);
  return {
    id: d.id,
    title: d.title,
    kindName,
    productionId: d.productionId,
    status: clientStatusOf(d.state),
    rounds: roundsOf(d),
    approvedAt: d.approvedAt,
    finalLink: detail.finalFiles ?? approved?.link,
    openRequest: open && { when: open.when, text: open.text },
    versions,
  };
};

export const deliverableForClient = (
  role: RoleId,
  id: string | undefined,
): DeliverableSummary | undefined => {
  const found = findDeliverable(id ?? DEFAULT_DELIVERABLE_ID);
  return found && visibleDeliverables(role).some((d) => d.id === found.id)
    ? found
    : undefined;
};

export interface ProvisionRow {
  kindId: DeliverableSummary["kindId"];
  total: number;
  used: number;
}

// Τοπικό αντίγραφο του provisionRows του g2-sections.tsx.
const provisionRowsOf = (
  production: ProductionStub,
  deliverables: readonly DeliverableSummary[],
): readonly ProvisionRow[] => {
  const period = periodOfProduction(production);
  if (period)
    return period.provisions.map((p) => ({
      kindId: p.kindId,
      total: p.given + p.carried,
      used: p.used,
    }));
  const agreement = agreementOf(production);
  if (!agreement) return [];
  return provisionsOf(agreement).map((p) => ({
    kindId: p.kindId,
    total: p.quantity,
    used: deliverables.filter(
      (d) =>
        d.kindId === p.kindId &&
        !(
          d.state === "ακυρώθηκε" && d.cancellation?.provision === "επιστρέφει"
        ),
    ).length,
  }));
};

export interface PeriodGroup {
  production: ProductionStub;
  label: string;
  deliverables: readonly DeliverableSummary[];
  rows: readonly ProvisionRow[];
}

const sortKeyOf = (production: ProductionStub): string =>
  periodOfProduction(production)?.starts ??
  recordOf(production).delivery?.when ??
  NOW;

// Ομάδες ανά Περίοδο, νεότερη πρώτα· οι Παραγωγές χωρίς Παραδοτέα δεν φαίνονται.
export const groupsOf = (role: RoleId): readonly PeriodGroup[] => {
  const all = visibleDeliverables(role);
  return [...visibleProductions(role)]
    .sort((a, b) => sortKeyOf(b).localeCompare(sortKeyOf(a)))
    .map((production) => {
      const deliverables = all.filter((d) => d.productionId === production.id);
      return {
        production,
        label: production.periodLabel ?? "εφάπαξ",
        deliverables,
        rows: provisionRowsOf(production, deliverables),
      };
    })
    .filter((g) => g.deliverables.length > 0);
};
