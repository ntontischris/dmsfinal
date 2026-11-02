// G3 (νέα εμφάνιση): οι κρίσεις του prototype (`screens/g3-model.ts`) πάνω στα πραγματικά νούμερα. Καθαρές συναρτήσεις.
// Ίδιος τύπος με τη βάση (authz.production_cost_row): κόστος = (γύρισμα + μοντάζ) × Κόστος ώρας + άμεσο κόστος,
// υπέρβαση = ώρες πάνω από την εκτίμηση κατά περισσότερο από το Ποσοστό υπέρβασης, ή τιμή κάτω από κόστος × ελάχιστη.
// Διαφορά από το prototype: η εφαρμογή επιβεβαιώνει και το μοντάζ, όχι μόνο το γύρισμα.

// Τα πεδία της φόρμας «Πραγματικές ώρες» (κείμενο όπως γράφεται) και οι αποθηκευμένες τιμές.
export interface HoursForm {
  shoot: string;
  shootConfirmed: boolean;
  edit: string;
  editConfirmed: boolean;
  directCost: string;
}

export interface HoursValue {
  shoot: number | null;
  shootConfirmed: boolean;
  edit: number | null;
  editConfirmed: boolean;
  directCost: number | null;
}

export interface CostFigure {
  hours: { shoot: number; edit: number };
  hourCost: number | null; // null = δεν υπάρχει Κόστος ώρας: το κόστος μένει «—»
  directCost: number;
  cost: number | null;
}

// Ό,τι δεν αλλάζει με τη φόρμα: η εκτίμηση, η τιμή, το Κόστος ώρας του μήνα και οι Ρυθμίσεις.
export interface CostBasis {
  estimate: CostFigure | null; // null = Εσωτερική χωρίς εκτίμηση
  price: number | null; // null = Εσωτερική
  hourCost: number | null;
  overrunPercent: number;
  multiplierMin: number;
}

export interface Figures {
  estimate: CostFigure | null;
  actual: CostFigure | null;
  price: number | null;
  isOverrun: boolean;
  hoursOver: boolean;
  belowMinimum: boolean;
  hoursPercent: number;
  minimumPrice: number | null;
  missing: readonly string[];
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const parseNumber = (text: string): number | null => {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) || value < 0
    ? null
    : value;
};

// Η δεκαδική υποδιαστολή του ελληνικού πληκτρολογίου.
const decimal = (value: number): string => String(value).replace(".", ",");

export const valueOf = (form: HoursForm): HoursValue => ({
  shoot: parseNumber(form.shoot),
  shootConfirmed: form.shootConfirmed,
  edit: parseNumber(form.edit),
  editConfirmed: form.editConfirmed,
  directCost: parseNumber(form.directCost),
});

export const formOf = (
  value: HoursValue,
  suggestedShoot: number,
): HoursForm => ({
  shoot:
    value.shoot !== null
      ? decimal(value.shoot)
      : suggestedShoot
        ? decimal(suggestedShoot)
        : "",
  shootConfirmed: value.shootConfirmed,
  edit: value.edit === null ? "" : decimal(value.edit),
  editConfirmed: value.editConfirmed,
  directCost: value.directCost === null ? "" : decimal(value.directCost),
});

// Μισές ώρες μετράνε ως λείπουσες: λέμε τι ακριβώς λείπει.
export const missingOf = (value: HoursValue): readonly string[] => [
  ...(value.shoot === null ? ["λείπουν οι ώρες γυρίσματος"] : []),
  ...(value.shoot !== null && !value.shootConfirmed
    ? ["οι ώρες γυρίσματος δεν επιβεβαιώθηκαν"]
    : []),
  ...(value.edit === null ? ["λείπει το μοντάζ"] : []),
  ...(value.edit !== null && !value.editConfirmed
    ? ["το μοντάζ δεν επιβεβαιώθηκε"]
    : []),
];

const actualOf = (
  basis: CostBasis,
  value: HoursValue,
  missing: readonly string[],
): CostFigure | null => {
  if (missing.length > 0) return null;
  const hours = { shoot: value.shoot ?? 0, edit: value.edit ?? 0 };
  const directCost = value.directCost ?? basis.estimate?.directCost ?? 0;
  const cost =
    basis.hourCost === null
      ? null
      : roundMoney((hours.shoot + hours.edit) * basis.hourCost + directCost);
  return { hours, hourCost: basis.hourCost, directCost, cost };
};

export const figuresOf = (basis: CostBasis, value: HoursValue): Figures => {
  const { estimate, price } = basis;
  const missing = missingOf(value);
  const actual = actualOf(basis, value, missing);
  const estimated = estimate ? estimate.hours.shoot + estimate.hours.edit : 0;
  const real = actual ? actual.hours.shoot + actual.hours.edit : 0;
  const hoursPercent = estimated > 0 ? (real - estimated) / estimated : 0;
  const minimumPrice =
    actual?.cost === null || actual?.cost === undefined
      ? null
      : actual.cost * basis.multiplierMin;
  const hoursOver =
    !!actual && estimated > 0 && hoursPercent * 100 > basis.overrunPercent;
  const belowMinimum =
    price !== null && minimumPrice !== null && price < minimumPrice;
  return {
    estimate,
    actual,
    price,
    isOverrun: hoursOver || belowMinimum,
    hoursOver,
    belowMinimum,
    hoursPercent,
    minimumPrice,
    missing,
  };
};

export const isSameValue = (a: HoursValue, b: HoursValue): boolean =>
  a.shoot === b.shoot &&
  a.shootConfirmed === b.shootConfirmed &&
  a.edit === b.edit &&
  a.editConfirmed === b.editConfirmed &&
  a.directCost === b.directCost;
