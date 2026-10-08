import type { Viewer } from "@/modules/access";

import { costOf, marginOf, roundMoney } from "./cost";
import { NEW_ITEM_TYPE_LABELS, NOT_PRICED_LABEL } from "./labels";
import type {
  CatalogueCaps,
  CatalogueItem,
  CatalogueRow,
  CostHint,
  KindFilter,
  MonthOption,
  MonthStatus,
  Provision,
  ProvisionKind,
} from "./types";

// Καθαρές συναρτήσεις του module: Δικαιώματα της οθόνης, μορφοποίηση ποσών και ημερομηνιών Αθήνας, γραμμές της C1.
// Καμία είσοδος/έξοδος· η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

const ATHENS = "Europe/Athens";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^-?\d+([.,]\d+)?$/;
// «1.300» ή «1,300»: ένας διαχωριστής και ακριβώς τρία ψηφία μετά. Με ομάδα χιλιάδων μπροστά (1-3 ψηφία, όχι μηδέν) διαβάζεται και ως 1300 και ως 1,3.
const AMBIGUOUS_GROUPING = /^-?[1-9]\d{0,2}[.,]\d{3}$/;

const MONTH_NAMES: readonly string[] = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const NO_CAPS: CatalogueCaps = {
  canView: false,
  canManage: false,
  canSeePrice: false,
  canEditPrice: false,
  canSeeCost: false,
  canEditDirectCost: false,
  canManageCost: false,
  canManageSettings: false,
};

// Ό,τι ζητά η οθόνη, από τα Δικαιώματα. Μόνο για να κρύβει κουμπιά· τα χρήματα τα κρύβει η βάση.
export const catalogueCaps = (viewer: Viewer): CatalogueCaps => {
  if (viewer.status !== "signed-in" || !viewer.team) return NO_CAPS;
  const grants = viewer.team.permissions;
  const has = (permission: string): boolean => grants[permission] !== undefined;
  const canManage = has("catalogue.manage");
  const canSeeCost = has("finance.cost");
  return {
    canView: has("catalogue.view") || canManage,
    canManage,
    canSeePrice: has("finance.amounts"),
    canEditPrice: canManage && has("finance.amounts"),
    canSeeCost,
    canEditDirectCost: canManage && canSeeCost,
    canManageCost: has("finance.costManage") && canSeeCost,
    canManageSettings: has("settings.manage"),
  };
};

export const itemKindLabel = (
  item: Pick<CatalogueItem, "kind" | "billing">,
): string => {
  if (item.kind === "service") return NEW_ITEM_TYPE_LABELS.service;
  return item.billing === "one_off"
    ? NEW_ITEM_TYPE_LABELS.package_one_off
    : NEW_ITEM_TYPE_LABELS.package_monthly;
};

// ───────────── Αριθμοί ─────────────

const MONEY = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});
const SHORT_NUMBER = new Intl.NumberFormat("el-GR", {
  maximumFractionDigits: 1,
});
const MULTIPLIER = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 2 });

export const formatMoney = (amount: number): string => MONEY.format(amount);

export const formatHours = (hours: number): string =>
  `${SHORT_NUMBER.format(hours)} ${hours === 1 ? "ώρα" : "ώρες"}`;

export const formatPercent = (fraction: number): string =>
  `${SHORT_NUMBER.format(fraction * 100)}%`;

export const formatMultiplier = (value: number): string =>
  MULTIPLIER.format(value);

export const withVat = (price: number, vatRate: number): number =>
  roundMoney(price * (1 + vatRate / 100));

// Το κείμενο που θα μπορούσε να είναι ομάδα χιλιάδων («1.300»). Δεν μαντεύουμε: το parseDecimal το απορρίπτει και η φόρμα ζητά να γραφτεί χωρίς τελεία.
export const isAmbiguousGrouping = (text: string): boolean =>
  AMBIGUOUS_GROUPING.test(text.trim());

// Ό,τι γράφεται σε φόρμα με ελληνικό πληκτρολόγιο: «1300,5» ή «1300.5». Τα «1.300,5» και «1.300» είναι αμφίσημα και δεν γίνονται δεκτά: ένα ποσό χιλιάδες φορές λάθος δεν πρέπει να περνά σιωπηλά.
export const parseDecimal = (text: string): number | null => {
  const value = text.trim();
  if (!DECIMAL.test(value) || isAmbiguousGrouping(value)) return null;
  return Number(value.replace(",", "."));
};

// ───────────── Ημερομηνίες ─────────────

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

export const athensMonthStart = (now: Date = new Date()): string => {
  const p = athensParts(now);
  return `${p.year}-${p.month}-01`;
};

export const formatMonth = (monthStart: string): string => {
  const [year, month] = monthStart.split("-");
  const name = MONTH_NAMES[Number(month) - 1] ?? month;
  return `${name} ${year}`;
};

const addMonths = (monthStart: string, count: number): string => {
  const [year, month] = monthStart.split("-").map(Number);
  const index = (year ?? 0) * 12 + (month ?? 1) - 1 + count;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
};

export const monthOptions = (current: string, count: number): MonthOption[] =>
  Array.from({ length: count }, (_, offset) => {
    const value = addMonths(current, offset);
    return { value, label: formatMonth(value) };
  });

// Οι ημερομηνίες YYYY-MM-01 συγκρίνονται σωστά ως κείμενο.
export const monthStatus = (month: string, current: string): MonthStatus => {
  if (month < current) return "closed";
  return month === current ? "current" : "future";
};

// ───────────── Τιμή και Παροχές ─────────────

export const priceSuffix = (
  item: Pick<CatalogueItem, "kind" | "billing" | "unit">,
): string => {
  if (item.kind === "service") return item.unit;
  if (item.billing === "monthly") return "/ μήνα";
  return item.billing === "one_off" ? "εφάπαξ" : "";
};

export const priceText = (item: CatalogueItem): string | null => {
  if (item.price === null) return null;
  return `${formatMoney(item.price)} ${priceSuffix(item)}`.trim();
};

export const publicPriceText = (item: CatalogueItem): string | null =>
  item.price === null ? null : `από ${formatMoney(item.price)} + ΦΠΑ`;

export const provisionsText = (
  provisions: readonly Provision[],
  kinds: readonly ProvisionKind[],
): string => {
  if (provisions.length === 0) return NOT_PRICED_LABEL;
  return provisions
    .map((provision) => {
      const kind = kinds.find((candidate) => candidate.id === provision.kindId);
      if (!kind) return NOT_PRICED_LABEL;
      // Ένα: η ετικέτα στον ενικό («1 Γύρισμα»)· αλλιώς η μονάδα στον πληθυντικό («2 Γυρίσματα»).
      const word = provision.quantity === 1 ? kind.label : kind.unit;
      return `${provision.quantity} ${word}`;
    })
    .join(", ");
};

export const activeKinds = (kinds: readonly ProvisionKind[]): ProvisionKind[] =>
  kinds
    .filter((kind) => !kind.isRetired)
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

export const nextSort = (items: readonly { sort: number }[]): number =>
  items.length === 0 ? 10 : Math.max(...items.map((item) => item.sort)) + 10;

// ───────────── Γραμμές της C1 ─────────────

interface RowContext {
  kinds: readonly ProvisionKind[];
  hint: CostHint | null;
}

type CostCells = Pick<CatalogueRow, "cost" | "margin" | "isBelowMin">;

// Κόστος και περιθώριο της γραμμής: null όταν δεν υπολογίζονται, «—» όταν το στοιχείο δεν έχει ακόμα ώρες ούτε Άμεσο κόστος.
const costCells = (item: CatalogueItem, hint: CostHint | null): CostCells => {
  const cost = costOf(item, hint);
  if (cost === null) return { cost: null, margin: null, isBelowMin: false };
  if (!cost.hasHours && cost.directCost === 0)
    return {
      cost: NOT_PRICED_LABEL,
      margin: item.price === null ? null : NOT_PRICED_LABEL,
      isBelowMin: false,
    };
  const costText = formatMoney(cost.estimatedCost);
  if (item.price === null)
    return { cost: costText, margin: null, isBelowMin: false };
  const margin = marginOf(item.price, cost);
  return {
    cost: costText,
    margin: `${formatMoney(margin.amount)} · ${formatPercent(margin.percent)}`,
    isBelowMin: margin.isBelowMin,
  };
};

export const toCatalogueRow = (
  item: CatalogueItem,
  context: RowContext,
): CatalogueRow => ({
  id: item.id,
  href: `/app/catalogue/${item.id}`,
  name: item.name,
  kind: item.kind,
  kindLabel: itemKindLabel(item),
  provisions: provisionsText(item.provisions, context.kinds),
  price: priceText(item),
  ...costCells(item, context.hint),
  isPublic: item.isPublic,
  isRetired: item.isRetired,
});

// Αναζήτηση χωρίς τόνους και χωρίς διάκριση πεζών-κεφαλαίων («εκδηλωση» βρίσκει «Εκδήλωση»).
const plain = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");

export const filterRows = (
  rows: readonly CatalogueRow[],
  filter: { query: string; kind: KindFilter; withRetired: boolean },
): CatalogueRow[] => {
  const needle = plain(filter.query.trim());
  return rows.filter(
    (row) =>
      (filter.withRetired || !row.isRetired) &&
      (filter.kind === "all" || row.kind === filter.kind) &&
      plain(row.name).includes(needle),
  );
};
