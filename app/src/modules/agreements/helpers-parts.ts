// Μορφοποίηση και ανάγνωση αριθμών και ημερομηνιών (Αθήνα). Καθαρές συναρτήσεις· τις εξάγει το helpers.ts.
// Δικό μας αντίγραφο των κανόνων του Καταλόγου: ένα module δεν εισάγει εσωτερικά ένα άλλο.

const ATHENS = "Europe/Athens";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^-?\d+([.,]\d+)?$/;
// «1.300» ή «1,300»: ένας διαχωριστής και ακριβώς τρία ψηφία μετά. Διαβάζεται και ως 1300 και ως 1,3, άρα δεν γίνεται δεκτό.
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

const MONEY = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});
const SHORT_NUMBER = new Intl.NumberFormat("el-GR", {
  maximumFractionDigits: 1,
});
const PLAIN_NUMBER = new Intl.NumberFormat("el-GR", {
  maximumFractionDigits: 2,
});

export const formatMoney = (amount: number): string => MONEY.format(amount);

export const formatPercent = (fraction: number): string =>
  `${SHORT_NUMBER.format(fraction * 100)}%`;

// Αριθμός όπως είναι (ποσοστά, μήνες): χωρίς σύμβολο, το πολύ 2 δεκαδικά.
export const formatNumber = (value: number): string =>
  PLAIN_NUMBER.format(value);

export const isAmbiguousGrouping = (text: string): boolean =>
  AMBIGUOUS_GROUPING.test(text.trim());

// Ό,τι γράφεται σε φόρμα με ελληνικό πληκτρολόγιο: «1300,5» ή «1300.5». Τα «1.300,5» και «1.300» είναι αμφίσημα και
// απορρίπτονται: ένα ποσό χιλιάδες φορές λάθος δεν πρέπει να περνά σιωπηλά.
export const parseDecimal = (text: string): number | null => {
  const value = text.trim();
  if (!DECIMAL.test(value) || isAmbiguousGrouping(value)) return null;
  return Number(value.replace(",", "."));
};

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

export const formatMonth = (monthStart: string): string => {
  const [year, month] = monthStart.split("-");
  const name = MONTH_NAMES[Number(month) - 1] ?? month;
  return `${name} ${year}`;
};

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

// Λήξη = Έναρξη + Διάρκεια − 1 μέρα, όπως στη βάση (Postgres: 31/1 + 1 μήνας = 28/2, μέρα που δεν υπάρχει κόβεται στον μήνα).
export const endOfTerm = (startOn: string, months: number): string => {
  const [year = 0, month = 1, day = 1] = startOn.split("-").map(Number);
  const target = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(target / 12);
  const targetMonth = target % 12;
  const clamped = Math.min(day, daysInMonth(targetYear, targetMonth));
  const end = new Date(Date.UTC(targetYear, targetMonth, clamped - 1));
  return end.toISOString().slice(0, 10);
};

// Η σημερινή ημερομηνία της Αθήνας, όπως τη βλέπει η βάση (public.sales_today()).
export const athensToday = (now: Date = new Date()): string => {
  const p = athensParts(now);
  return `${p.year}-${p.month}-${p.day}`;
};
