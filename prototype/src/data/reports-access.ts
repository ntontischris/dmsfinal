// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «14 Αναφορές», και οι υπολογισμοί των έτοιμων Αναφορών.
// Μια Αναφορά φαίνεται μόνο σε όποιον βλέπει την πηγή της· τα ποσά μόνο με «Βλέπει ποσά»·
// το Εύρος του Χρήστη περιορίζει τις γραμμές (ο πωλητής βλέπει μόνο τις δικές του Ευκαιρίες).
// Πηγές: κεφ. 2 «Αναφορές: λεπτομέρειες κανόνων», κεφ. 1, κεφ. 3.7 (Τζίρος ≠ Εισπράξεις).

import { RECEIPTS } from "@/data/finance";
import {
  TODAY,
  allStandings,
  isCredit,
  liveInvoices,
} from "@/data/finance-access";
import { OPPORTUNITIES, STAGES, type Opportunity } from "@/data/opportunities";
import {
  EXPORT_DATASETS,
  OPPORTUNITY_DATES,
  PAST_OPPORTUNITIES,
  PERIODS,
  REPORTS,
  type ExportDataset,
  type PeriodId,
  type ReportDef,
} from "@/data/reports";
import type { RoleId } from "@/data/roles";
import { SALES_USER_ID, findClient } from "@/data/sales";

export { TODAY };

export interface ReportCaps {
  canSeeReports: boolean;
  canSeeFinance: boolean;
  canSeeSales: boolean;
  canSeeAmounts: boolean;
  canSeeCost: boolean;
  canSeeClients: boolean;
  canSeeAgreements: boolean;
  isScoped: boolean;
  canExport: boolean;
}

// «Βλέπει Αναφορές»: Ιδιοκτήτης, Διαχείριση, Λογιστής (Ό), Πωλήσεις (Α). «Εξάγει δεδομένα»: Ιδιοκτήτης, Διαχείριση, Λογιστής.
export const reportCapsOf = (role: RoleId): ReportCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isSales = role === "sales";
  const isAccountant = role === "accountant";
  return {
    canSeeReports: isAdminLike || isSales || isAccountant,
    canSeeFinance: isAdminLike || isAccountant,
    canSeeSales: isAdminLike || isSales,
    canSeeAmounts: isAdminLike || isSales || isAccountant,
    canSeeCost: isAdminLike,
    canSeeClients: isAdminLike || isSales || isAccountant,
    canSeeAgreements: isAdminLike || isSales || isAccountant,
    isScoped: isSales,
    canExport: isAdminLike || isAccountant,
  };
};

export const visibleReports = (role: RoleId): readonly ReportDef[] => {
  const caps = reportCapsOf(role);
  return REPORTS.filter((r) =>
    r.family === "οικονομικές" ? caps.canSeeFinance : caps.canSeeSales,
  );
};

// ── Περίοδοι ──────────────────────────────────────────────────────────────

export interface PeriodRange {
  id: PeriodId;
  label: string;
  from: string;
  to: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const lastDay = (y: number, m: number): number =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();
const range = (y1: number, m1: number, y2: number, m2: number) => ({
  from: `${y1}-${pad(m1)}-01`,
  to: `${y2}-${pad(m2)}-${pad(lastDay(y2, m2))}`,
});

// Ημερομηνίες σε ώρα Ελλάδας· «σήμερα» = TODAY του prototype.
export const periodRange = (id: PeriodId): PeriodRange => {
  const [y, m] = TODAY.split("-").map(Number);
  const label = PERIODS.find((p) => p.id === id)?.label ?? id;
  const q = Math.floor((m - 1) / 3) * 3 + 1;
  const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  const spans: Record<PeriodId, { from: string; to: string }> = {
    "this-month": range(y, m, y, m),
    "last-month": range(prev.y, prev.m, prev.y, prev.m),
    "this-quarter": range(y, q, y, q + 2),
    "this-year": range(y, 1, y, 12),
    "last-year": range(y - 1, 1, y - 1, 12),
  };
  return { id, label, ...spans[id] };
};

export const parsePeriod = (value: string | undefined): PeriodId | undefined =>
  PERIODS.find((p) => p.id === value)?.id;

const inRange = (date: string, r: PeriodRange): boolean =>
  date >= r.from && date <= r.to;

// Οι μήνες της περιόδου ως σήμερα (οι μελλοντικοί δεν εμφανίζονται).
export const monthsOf = (r: PeriodRange): readonly string[] => {
  const months: string[] = [];
  const end = r.to < TODAY ? r.to : TODAY;
  for (let d = r.from.slice(0, 7); d <= end.slice(0, 7);) {
    months.push(d);
    const [y, m] = d.split("-").map(Number);
    d = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  }
  return months;
};

export const isCurrentMonth = (month: string): boolean =>
  month === TODAY.slice(0, 7);

const r2 = (value: number): number => Math.round(value * 100) / 100;

// ── Οικονομικές ───────────────────────────────────────────────────────────

const signedNet = (i: { net: number; kind: string }): number =>
  i.kind === "πιστωτικό" ? -i.net : i.net;

export interface TurnoverRow {
  month: string;
  revenue: number;
  receipts: number;
  invoiceCount: number;
  receiptCount: number;
  isPartial: boolean;
}

export const turnoverByMonth = (
  r: PeriodRange,
  clientId?: string,
): readonly TurnoverRow[] =>
  monthsOf(r).map((month) => {
    const invoices = liveInvoices(clientId).filter((i) =>
      i.issueDate.startsWith(month),
    );
    const receipts = RECEIPTS.filter(
      (x) => x.date.startsWith(month) && (!clientId || x.clientId === clientId),
    );
    return {
      month,
      revenue: r2(invoices.reduce((s, i) => s + signedNet(i), 0)),
      receipts: r2(receipts.reduce((s, x) => s + x.amount, 0)),
      invoiceCount: invoices.filter((i) => !isCredit(i)).length,
      receiptCount: receipts.length,
      isPartial: isCurrentMonth(month),
    };
  });

export interface ClientRevenueRow {
  clientId: string;
  clientName: string;
  revenue: number;
  share: number;
  invoiceCount: number;
}

export const revenueByClient = (
  r: PeriodRange,
): readonly ClientRevenueRow[] => {
  const invoices = liveInvoices().filter((i) => inRange(i.issueDate, r));
  const total = invoices.reduce((s, i) => s + signedNet(i), 0);
  const ids = [...new Set(invoices.map((i) => i.clientId))];
  return ids
    .map((clientId) => {
      const own = invoices.filter((i) => i.clientId === clientId);
      const revenue = r2(own.reduce((s, i) => s + signedNet(i), 0));
      return {
        clientId,
        clientName: findClient(clientId)?.name ?? clientId,
        revenue,
        share: total > 0 ? revenue / total : 0,
        invoiceCount: own.filter((i) => !isCredit(i)).length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

export const AGING_BUCKETS = [
  "Δεν έχει λήξει",
  "1–30 μέρες",
  "31–60 μέρες",
  "61–90 μέρες",
  "Πάνω από 90",
] as const;

export interface ReceivableRow {
  clientId: string;
  clientName: string;
  buckets: readonly number[];
  total: number;
  oldestDue?: string;
}

const bucketOf = (dueDate: string | undefined): number => {
  if (!dueDate || dueDate >= TODAY) return 0;
  const days = Math.floor(
    (Date.parse(TODAY) - Date.parse(dueDate)) / 86_400_000,
  );
  if (days <= 30) return 1;
  if (days <= 60) return 2;
  return days <= 90 ? 3 : 4;
};

export const receivablesAging = (): readonly ReceivableRow[] => {
  const open = allStandings().filter((s) => s.remaining > 0);
  const ids = [...new Set(open.map((s) => s.invoice.clientId))];
  return ids
    .map((clientId) => {
      const own = open.filter((s) => s.invoice.clientId === clientId);
      const buckets = AGING_BUCKETS.map((_, index) =>
        r2(
          own
            .filter((s) => bucketOf(s.invoice.dueDate) === index)
            .reduce((sum, s) => sum + s.remaining, 0),
        ),
      );
      const overdue = own
        .map((s) => s.invoice.dueDate)
        .filter((d): d is string => !!d && d < TODAY)
        .sort();
      return {
        clientId,
        clientName: findClient(clientId)?.name ?? clientId,
        buckets,
        total: r2(buckets.reduce((s, b) => s + b, 0)),
        oldestDue: overdue[0],
      };
    })
    .sort((a, b) => b.total - a.total);
};

// ── Πωλήσεις ──────────────────────────────────────────────────────────────

export interface SalesRow {
  id: string;
  clientName: string;
  title: string;
  ownerId: string | null;
  source: string;
  stage?: string;
  outcome: "Ανοιχτή" | "Κερδισμένη" | "Χαμένη";
  lostReason?: string;
  monthly: number | null;
  once: number | null;
  opened: string;
  closed?: string;
  isLive: boolean;
}

const proposalValue = (o: Opportunity) => {
  const p = o.proposal;
  if (!p) return { monthly: null, once: null };
  const sum = p.lines.reduce((s, l) => s + l.price, 0);
  return p.kind === "μηνιαία"
    ? { monthly: sum, once: null }
    : { monthly: null, once: sum };
};

const liveRow = (o: Opportunity): SalesRow => ({
  id: o.id,
  clientName: findClient(o.clientId)?.name ?? o.clientId,
  title: o.title,
  ownerId: o.ownerId,
  source: o.source,
  stage: o.stage,
  outcome: o.outcome,
  lostReason: o.lostReason,
  ...proposalValue(o),
  opened: OPPORTUNITY_DATES[o.id]?.opened ?? TODAY,
  closed: OPPORTUNITY_DATES[o.id]?.closed,
  isLive: true,
});

const pastRows = (): readonly SalesRow[] =>
  PAST_OPPORTUNITIES.map((p) => ({
    id: p.id,
    clientName: p.clientName,
    title: p.title,
    ownerId: p.ownerId,
    source: p.source,
    outcome: p.outcome,
    lostReason: p.lostReason,
    monthly: p.kind === "μηνιαία" ? p.value : null,
    once: p.kind === "εφάπαξ" ? p.value : null,
    opened: p.opened,
    closed: p.closed,
    isLive: false,
  }));

// Εύρος: ο πωλητής βλέπει μόνο όσες είναι Υπεύθυνος. Οι «Χωρίς υπεύθυνο» φαίνονται μόνο σε όποιον βλέπει όλες.
export const salesRows = (
  role: RoleId,
  sellerId?: string,
): readonly SalesRow[] => {
  const rows = [...OPPORTUNITIES.map(liveRow), ...pastRows()];
  const scoped = reportCapsOf(role).isScoped
    ? rows.filter((r) => r.ownerId === SALES_USER_ID)
    : rows;
  return sellerId ? scoped.filter((r) => r.ownerId === sellerId) : scoped;
};

// Το φίλτρο και η ομαδοποίηση «ανά πωλητή» εμφανίζονται μόνο όταν υπάρχουν πάνω από ένας (Λειτουργεί με έναν άνθρωπο).
export const sellersOf = (role: RoleId): readonly string[] =>
  reportCapsOf(role).isScoped
    ? []
    : [
        ...new Set(
          salesRows(role)
            .map((r) => r.ownerId)
            .filter((id): id is string => !!id),
        ),
      ];

export interface StageRow {
  stage: string;
  count: number;
  monthly: number;
  once: number;
  withoutProposal: number;
}

export const pipelineByStage = (
  role: RoleId,
  sellerId?: string,
): readonly StageRow[] => {
  const open = salesRows(role, sellerId).filter((r) => r.outcome === "Ανοιχτή");
  return STAGES.map((stage) => {
    const own = open.filter((r) => r.stage === stage);
    return {
      stage,
      count: own.length,
      monthly: own.reduce((s, r) => s + (r.monthly ?? 0), 0),
      once: own.reduce((s, r) => s + (r.once ?? 0), 0),
      withoutProposal: own.filter((r) => r.monthly === null && r.once === null)
        .length,
    };
  });
};

export interface ResultsSummary {
  won: readonly SalesRow[];
  lost: readonly SalesRow[];
  winRate: number | null;
  lossReasons: readonly { reason: string; count: number }[];
}

export const resultsOf = (
  role: RoleId,
  r: PeriodRange,
  sellerId?: string,
): ResultsSummary => {
  const closed = salesRows(role, sellerId).filter(
    (row) => !!row.closed && inRange(row.closed, r),
  );
  const won = closed.filter((row) => row.outcome === "Κερδισμένη");
  const lost = closed.filter((row) => row.outcome === "Χαμένη");
  const reasons = [...new Set(lost.map((row) => row.lostReason ?? "—"))];
  return {
    won,
    lost,
    winRate: closed.length > 0 ? won.length / closed.length : null,
    lossReasons: reasons
      .map((reason) => ({
        reason,
        count: lost.filter((row) => (row.lostReason ?? "—") === reason).length,
      }))
      .sort((a, b) => b.count - a.count),
  };
};

export interface SourceRow {
  source: string;
  opened: number;
  won: number;
  lost: number;
  open: number;
}

export const sourcesOf = (
  role: RoleId,
  r: PeriodRange,
  sellerId?: string,
): readonly SourceRow[] => {
  const opened = salesRows(role, sellerId).filter((row) =>
    inRange(row.opened, r),
  );
  return [...new Set(opened.map((row) => row.source))]
    .map((source) => {
      const own = opened.filter((row) => row.source === source);
      return {
        source,
        opened: own.length,
        won: own.filter((row) => row.outcome === "Κερδισμένη").length,
        lost: own.filter((row) => row.outcome === "Χαμένη").length,
        open: own.filter((row) => row.outcome === "Ανοιχτή").length,
      };
    })
    .sort((a, b) => b.opened - a.opened);
};

// ── Εξαγωγή (M2) ──────────────────────────────────────────────────────────

// Ένα σύνολο δεδομένων εξάγεται μόνο αν ο Χρήστης βλέπει την πηγή του.
export const exportableDatasets = (role: RoleId): readonly ExportDataset[] => {
  const caps = reportCapsOf(role);
  if (!caps.canExport) return [];
  const allowed = {
    clients: caps.canSeeClients,
    agreements: caps.canSeeAgreements,
    finance: caps.canSeeFinance,
    cost: caps.canSeeCost,
  };
  return EXPORT_DATASETS.filter((d) => allowed[d.needs]);
};

// «Πακέτο λογιστή»: για έναν κλεισμένο μήνα, Τιμολόγια + Εισπράξεις σε ένα Excel και τα PDF σε .zip.
export interface AccountantPack {
  month: string;
  invoiceCount: number;
  creditCount: number;
  receiptCount: number;
  pdfCount: number;
}

export const accountantPackOf = (month: string): AccountantPack => {
  const invoices = liveInvoices().filter((i) => i.issueDate.startsWith(month));
  return {
    month,
    invoiceCount: invoices.filter((i) => !isCredit(i)).length,
    creditCount: invoices.filter(isCredit).length,
    receiptCount: RECEIPTS.filter((x) => x.date.startsWith(month)).length,
    pdfCount: invoices.length,
  };
};

// Οι μήνες για το Πακέτο λογιστή: οι τελευταίοι 6 ως σήμερα, ο τρέχων σημειώνεται «ως σήμερα».
export const packMonths = (): readonly string[] =>
  monthsOf({
    id: "this-year",
    label: "",
    from: "2026-04-01",
    to: TODAY,
  }).toReversed();
