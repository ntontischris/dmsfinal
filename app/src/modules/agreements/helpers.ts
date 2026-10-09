import type { Viewer } from "@/modules/access";

import {
  formatDate,
  formatMoney,
  formatMonth,
  formatNumber,
} from "./helpers-parts";
import {
  KIND_LABELS,
  MILESTONE_LABELS,
  PATH_LABELS,
  STATE_LABELS,
  UNUSED_LABELS,
} from "./labels";
import type {
  AgreementCaps,
  AgreementRow,
  AgreementRowView,
  AgreementState,
  Bucket,
  BucketFilter,
  CatalogueOption,
  Deviation,
  KindFilter,
  KindInfo,
  Language,
  Milestone,
  PeriodRow,
  ProposalPath,
} from "./types";

// Καθαρές συναρτήσεις του module: Δικαιώματα της οθόνης, ετικέτες, κουβάδες της D1, κείμενα. Καμία είσοδος/έξοδος·
// η απόφαση για το τι επιτρέπεται μένει πάντα στη βάση.

export {
  athensToday,
  endOfTerm,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonth,
  formatNumber,
  formatPercent,
  isAmbiguousGrouping,
  parseDecimal,
} from "./helpers-parts";

const DOC_LOCALES: Readonly<Record<Language, string>> = {
  el: "el-GR",
  en: "en-IE",
};

// Ποσοστά του εγγράφου του πελάτη στη γλώσσα του εγγράφου («33,33» / «33.33»), το πολύ 2 δεκαδικά.
export const formatDocNumber = (language: Language, value: number): string =>
  new Intl.NumberFormat(DOC_LOCALES[language], {
    maximumFractionDigits: 2,
  }).format(value);

// Οι ετικέτες του εγγράφου παίρνουν αριθμό και τον γράφουν με τελεία· αντικαθιστά την πρώτη εμφάνιση με τη μορφή της γλώσσας.
export const localizeNumberIn = (
  language: Language,
  label: string,
  value: number,
): string => label.replace(String(value), formatDocNumber(language, value));

const NO_CAPS: AgreementCaps = {
  canView: false,
  canDraft: false,
  canDeviate: false,
  canSeeAmounts: false,
  canSeeCost: false,
  canManageCost: false,
  canManageSettings: false,
  canSeeProductions: false,
};

// Ό,τι ζητά η οθόνη, από τα Δικαιώματα. Μόνο για να κρύβει κουμπιά· τα χρήματα και οι εγγραφές τα αποφασίζει η βάση.
export const agreementCaps = (viewer: Viewer): AgreementCaps => {
  if (viewer.status !== "signed-in" || !viewer.team) return NO_CAPS;
  const grants = viewer.team.permissions;
  const has = (permission: string): boolean => grants[permission] !== undefined;
  const canDraft = has("agreements.draft");
  const canDeviate = has("agreements.deviate");
  return {
    canView: has("agreements.view") || canDraft || canDeviate,
    canDraft,
    canDeviate,
    canSeeAmounts: has("finance.amounts"),
    canSeeCost: has("finance.cost"),
    canManageCost: has("finance.costManage") && has("finance.cost"),
    canManageSettings: has("settings.manage"),
    canSeeProductions: has("productions.manage"),
  };
};

// ───────────── Κατάσταση και κουβάδες ─────────────

type StatusInput = { state: AgreementState; path: ProposalPath };

export const statusLabel = (a: StatusInput): string =>
  a.state === "proposal"
    ? `${STATE_LABELS.proposal} · ${PATH_LABELS[a.path]}`
    : STATE_LABELS[a.state];

export const bucketOf = (a: StatusInput): Bucket => {
  if (a.state === "proposal") return a.path === "lost" ? "closed" : "proposal";
  return a.state === "signed" || a.state === "active" ? "active" : "closed";
};

// «Ανοιχτές» = προτάσεις και ενεργές. Η «Όλες» δείχνει τα πάντα.
export const matchesBucket = (
  bucket: Bucket,
  filter: BucketFilter,
): boolean => {
  if (filter === "all") return true;
  if (filter === "open") return bucket === "proposal" || bucket === "active";
  return bucket === filter;
};

// ───────────── Χρόνος ─────────────

type TimeInput = Pick<
  AgreementRow,
  "state" | "kind" | "startOn" | "endOn" | "validUntil" | "path"
>;

export const timeText = (a: TimeInput): string => {
  if (a.state === "proposal") return `ισχύει ως ${formatDate(a.validUntil)}`;
  if (a.startOn === null) return "—";
  if (a.endOn === null) return `από ${formatDate(a.startOn)}`;
  return `${formatDate(a.startOn)} – ${formatDate(a.endOn)}`;
};

export const expiryText = (days: number | null): string | null => {
  if (days === null) return null;
  if (days === 0) return "λήγει σήμερα";
  return `λήγει σε ${days} ${days === 1 ? "μέρα" : "μέρες"}`;
};

export const periodLabel = (p: Pick<PeriodRow, "starts">): string =>
  formatMonth(p.starts);

// ───────────── Γραμμές της D1 ─────────────

const amountText = (row: AgreementRow): string | null =>
  row.total === null
    ? null
    : `${formatMoney(row.total)}${row.kind === "monthly" ? " / μήνα" : " εφάπαξ"}`;

const discountNote = (row: AgreementRow): string | null => {
  if (row.discountPercent === null || row.discountPercent <= 0) return null;
  const months = row.discountMonths ?? 0;
  return `−${formatNumber(row.discountPercent)}% ${months} ${months === 1 ? "μήνα" : "μήνες"}`;
};

const attentionLabel = (row: AgreementRow): string | null => {
  if (row.path === "awaiting_approval") return PATH_LABELS.awaiting_approval;
  if (row.path === "expired") return PATH_LABELS.expired;
  return row.changeRequestsOpen > 0 ? "Ζήτησε αλλαγές" : null;
};

export const toAgreementRowView = (row: AgreementRow): AgreementRowView => {
  const label = attentionLabel(row);
  return {
    id: row.id,
    href: `/app/agreements/${row.id}`,
    clientName: row.clientName,
    clientHref: `/app/clients/${row.clientId}`,
    title: row.title,
    kindLabel: KIND_LABELS[row.kind],
    statusLabel: statusLabel(row),
    bucket: bucketOf(row),
    amount: amountText(row),
    discountNote: discountNote(row),
    timeText: timeText(row),
    expiryText: expiryText(row.expiresInDays),
    managerName: row.managerName,
    isAttention: label !== null,
    attentionLabel: label,
    hasChangeRequests: row.changeRequestsOpen > 0,
    isLowMargin: row.isLowMargin === true,
  };
};

// Αναζήτηση χωρίς τόνους και χωρίς διάκριση πεζών-κεφαλαίων («εκδηλωση» βρίσκει «Εκδήλωση»).
const plain = (text: string): string =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ς/g, "σ");

export const filterRows = (
  rows: readonly AgreementRowView[],
  filter: { query: string; kind: KindFilter; bucket: BucketFilter },
): AgreementRowView[] => {
  const needle = plain(filter.query.trim());
  return rows.filter(
    (row) =>
      matchesBucket(row.bucket, filter.bucket) &&
      (filter.kind === "all" || row.kindLabel === KIND_LABELS[filter.kind]) &&
      (plain(row.clientName).includes(needle) ||
        plain(row.title).includes(needle)),
  );
};

export const proposalUrl = (origin: string, linkPath: string): string =>
  `${origin.replace(/\/+$/, "")}/${linkPath.replace(/^\/+/, "")}`;

// ───────────── Κείμενα της D2 ─────────────

const isUnusedCode = (code: string): code is keyof typeof UNUSED_LABELS =>
  Object.hasOwn(UNUSED_LABELS, code);

const unusedLabel = (code: string | null): string =>
  code !== null && isUnusedCode(code) ? UNUSED_LABELS[code] : "—";

const money = (value: string | null): string => {
  const amount = value === null ? Number.NaN : Number(value);
  return Number.isNaN(amount) ? "—" : formatMoney(amount);
};

const orDash = (value: string | null): string => value ?? "—";

// Η έκπτωση είναι όρος τιμής: χωρίς «Βλέπει ποσά» η βάση επιστρέφει null τιμές και η πρόταση δεν έχει αριθμούς.
const DISCOUNT_WITHOUT_NUMBERS = "Έκπτωση πρώτων μηνών πάνω από την τυπική";
const hasDiscountValues = (d: Deviation): boolean =>
  d.value !== null && d.baseValue !== null;

type DeviationText = (d: Deviation, canSeeAmounts: boolean) => string;

// Μια πρόταση για κάθε είδος Παρέκκλισης. Τα ποσά μπαίνουν μόνο όταν ο θεατής «Βλέπει ποσά»· αλλιώς η απλή πρόταση.
const DEVIATION_TEXT: Readonly<Record<Deviation["kind"], DeviationText>> = {
  free_line: (d) => `Ελεύθερη γραμμή: «${d.subject}»`,
  price: (d, amounts) =>
    `Τιμή κάτω από τον Κατάλογο: «${d.subject}»${amounts ? ` (${money(d.baseValue)} → ${money(d.value)})` : ""}`,
  provisions: (d) => `Περισσότερες Παροχές από τον Κατάλογο: «${d.subject}»`,
  discount_percent: (d) =>
    hasDiscountValues(d)
      ? `Έκπτωση ${orDash(d.value)}% αντί για την τυπική ${orDash(d.baseValue)}%`
      : DISCOUNT_WITHOUT_NUMBERS,
  discount_months: (d) =>
    hasDiscountValues(d)
      ? `Έκπτωση για ${orDash(d.value)} μήνες αντί για την τυπική ${orDash(d.baseValue)}`
      : DISCOUNT_WITHOUT_NUMBERS,
  payment_days: (d) =>
    `Μέρες πληρωμής ${orDash(d.value)} αντί για ${orDash(d.baseValue)}`,
  grace_days: (d) =>
    `Περίοδος χάριτος ${orDash(d.value)} μέρες αντί για ${orDash(d.baseValue)}`,
  unused_provisions: (d) =>
    `Αχρησιμοποίητες Παροχές «${unusedLabel(d.value)}» αντί για «${unusedLabel(d.baseValue)}»`,
  dissolution_notice: (d) =>
    `Ειδοποίηση λύσης ${orDash(d.value)} μέρες αντί για ${orDash(d.baseValue)}`,
  dissolution_fee: (d, amounts) =>
    amounts && d.value !== null && d.baseValue !== null
      ? `Ρήτρα λύσης ${money(d.value)} αντί για ${money(d.baseValue)}`
      : "Ρήτρα λύσης κάτω από την τυπική",
  filming_notice: (d) =>
    `Ελάχιστη προειδοποίηση κράτησης ${orDash(d.value)} ώρες αντί για ${orDash(d.baseValue)}`,
  cancel_hours: (d) =>
    `Όριο ακύρωσης ${orDash(d.value)} ώρες αντί για ${orDash(d.baseValue)}`,
  late_cancel_burns: () => "Η αργή ακύρωση δεν καίει Παροχή",
  no_show_burns: () => "Το «δεν έγινε» δεν καίει Παροχή",
  revision_limit: (d) =>
    `Όριο αλλαγών ${d.subject}: ${orDash(d.value)} γύροι αντί για ${orDash(d.baseValue)}`,
  advance: (d) =>
    `Προκαταβολή ${orDash(d.value)}% αντί για ${orDash(d.baseValue)}%`,
};

export const describeDeviation = (
  d: Deviation,
  canSeeAmounts: boolean,
): string => DEVIATION_TEXT[d.kind](d, canSeeAmounts);

export const milestoneText = (m: Milestone): string => {
  const when =
    m.trigger === "date" && m.dueOn !== null
      ? formatDate(m.dueOn)
      : MILESTONE_LABELS[m.trigger];
  const parts = [`${formatNumber(m.percent)}%`, when];
  return (m.amount === null ? parts : [...parts, formatMoney(m.amount)]).join(
    " · ",
  );
};

// ───────────── Επιλογές και Παροχές ─────────────

const OPTION_ORDER: Readonly<Record<CatalogueOption["kind"], number>> = {
  package: 0,
  service: 1,
};

export const sortOptions = (
  options: readonly CatalogueOption[],
): CatalogueOption[] =>
  [...options].sort(
    (a, b) =>
      OPTION_ORDER[a.kind] - OPTION_ORDER[b.kind] ||
      a.name.localeCompare(b.name, "el"),
  );

export const activeKinds = (kinds: readonly KindInfo[]): KindInfo[] =>
  kinds
    .filter((kind) => !kind.isRetired)
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

// Ένα: η ετικέτα στον ενικό («1 Γύρισμα»)· αλλιώς η μονάδα στον πληθυντικό («2 Γυρίσματα»). Άγνωστο είδος: «—».
export const provisionsText = (
  provisions: readonly { kindId: string; quantity: number }[],
  kinds: readonly KindInfo[],
): string => {
  if (provisions.length === 0) return "—";
  return provisions
    .map((provision) => {
      const kind = kinds.find((candidate) => candidate.id === provision.kindId);
      if (!kind) return "—";
      return `${provision.quantity} ${provision.quantity === 1 ? kind.label : kind.unit}`;
    })
    .join(", ");
};
