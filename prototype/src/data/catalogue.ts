// Φανταστικά δεδομένα του module «2 Κατάλογος»: είδη Παροχής, Πακέτα, Υπηρεσίες και οι ρυθμίσεις κόστους του μήνα.
// Repo public: μόνο επινοημένα ονόματα και νούμερα. Οι τιμές είναι χωρίς ΦΠΑ.
// Τα νούμερα του μήνα ακολουθούν το Σενάριο 1 του κεφ. 3.3 (Κόστος ώρας 40 €, Εύρος ×1,3 / ×1,6 / ×2,0).

export type ProvisionKindId = "shoot" | "reel" | "video" | "photo" | "episode";

// Λίστα του admin (Ρυθμίσεις › Συμφωνίες). Ο Τρόπος μέτρησης αφορά μόνο ό,τι καταναλώνεται από Γυρίσματα.
export interface ProvisionKind {
  id: ProvisionKindId;
  name: string;
  nameEn: string;
  unit: string;
  counting?: "ανά Γύρισμα" | "ανά ώρα" | "ανά μέρα";
  defaultHours?: number;
}

export const PROVISION_KINDS: readonly ProvisionKind[] = [
  {
    id: "shoot",
    name: "Γύρισμα",
    nameEn: "Shoot",
    unit: "Γυρίσματα",
    counting: "ανά Γύρισμα",
    defaultHours: 4,
  },
  { id: "reel", name: "reel", nameEn: "reel", unit: "reels" },
  { id: "video", name: "βίντεο", nameEn: "video", unit: "βίντεο" },
  { id: "photo", name: "φωτογραφία", nameEn: "photo", unit: "φωτογραφίες" },
  {
    id: "episode",
    name: "επεισόδιο podcast",
    nameEn: "podcast episode",
    unit: "επεισόδια",
  },
];

export const provisionKind = (id: ProvisionKindId): ProvisionKind =>
  PROVISION_KINDS.find((kind) => kind.id === id) ?? PROVISION_KINDS[0];

// Ζουν στα Οικονομικά (I6). Κάθε μήνας κρατά το δικό του Κόστος ώρας· εδώ ο τρέχων.
export interface CostSettings {
  monthLabel: string;
  monthlyExpenses: number;
  productiveHours: number;
  multipliers: { min: number; target: number; max: number };
  overrunPercent: number;
  vatPercent: number;
}

export const COST_SETTINGS: CostSettings = {
  monthLabel: "Σεπτέμβριος 2026",
  monthlyExpenses: 8800,
  productiveHours: 220,
  multipliers: { min: 1.3, target: 1.6, max: 2.0 },
  overrunPercent: 20,
  vatPercent: 24,
};

export const hourCost = (settings: CostSettings = COST_SETTINGS): number =>
  settings.monthlyExpenses / settings.productiveHours;

export interface Provision {
  kindId: ProvisionKindId;
  quantity: number;
}

export interface EstimatedHours {
  shoot: number;
  edit: number;
}

// Μέσες Πραγματικές ώρες από τις Παραγωγές που χρησιμοποίησαν το στοιχείο. Τίποτα δεν αλλάζει μόνο του.
export interface ActualsSummary {
  avgShoot: number;
  avgEdit: number;
  productions: number;
}

interface CatalogueItemBase {
  id: string;
  name: string;
  description: string;
  provisions: readonly Provision[];
  price: number;
  hours: EstimatedHours;
  directCost: number;
  directCostNote?: string;
  actuals: ActualsSummary | null;
  isArchived: boolean;
  updated: { when: string; by: string };
}

export interface CataloguePackage extends CatalogueItemBase {
  kind: "package";
  billing: "μηνιαίο" | "εφάπαξ";
  isPublic: boolean;
  showsPrice: boolean;
  nameEn: string;
  descriptionPublic: string;
  descriptionPublicEn: string;
  sectors: readonly string[];
}

export interface CatalogueService extends CatalogueItemBase {
  kind: "service";
  unit: string;
}

export type CatalogueItem = CataloguePackage | CatalogueService;

export const SOCIAL_PACKAGE_ID = "pkg-social";

export const CATALOGUE: readonly CatalogueItem[] = [
  {
    kind: "package",
    id: SOCIAL_PACKAGE_ID,
    name: "Μηνιαία Παρουσία",
    description:
      "Το βασικό μηνιαίο πακέτο social: δύο Γυρίσματα στον χώρο του πελάτη και οκτώ reels.",
    billing: "μηνιαίο",
    provisions: [
      { kindId: "shoot", quantity: 2 },
      { kindId: "reel", quantity: 8 },
    ],
    price: 1300,
    hours: { shoot: 6, edit: 14 },
    directCost: 0,
    actuals: { avgShoot: 6.5, avgEdit: 15.5, productions: 6 },
    isArchived: false,
    isPublic: true,
    showsPrice: true,
    nameEn: "Monthly Presence",
    descriptionPublic:
      "Δύο Γυρίσματα και οκτώ reels κάθε μήνα, έτοιμα για ανάρτηση.",
    descriptionPublicEn:
      "Two shoots and eight reels every month, ready to post.",
    sectors: ["Social media"],
    updated: { when: "2026-08-12", by: "Δημήτρης Ιωάννου" },
  },
  {
    kind: "package",
    id: "pkg-podcast",
    name: "Podcast μηνιαίο",
    description:
      "Τέσσερα επεισόδια τον μήνα, γυρισμένα σε δύο ημέρες στο στούντιο.",
    billing: "μηνιαίο",
    provisions: [
      { kindId: "shoot", quantity: 2 },
      { kindId: "episode", quantity: 4 },
    ],
    price: 1100,
    hours: { shoot: 8, edit: 12 },
    directCost: 0,
    actuals: null,
    isArchived: false,
    isPublic: true,
    showsPrice: false,
    nameEn: "Monthly Podcast",
    descriptionPublic: "Τέσσερα επεισόδια τον μήνα, με ήχο και βίντεο.",
    descriptionPublicEn: "Four episodes a month, audio and video.",
    sectors: ["Podcast"],
    updated: { when: "2026-09-02", by: "Γιώργος Μαυρίδης" },
  },
  {
    kind: "package",
    id: "pkg-corporate",
    name: "Εταιρικό βίντεο",
    description:
      "Ολοήμερο Γύρισμα και ένα βίντεο 2–3 λεπτών, με τρία reels από το ίδιο υλικό.",
    billing: "εφάπαξ",
    provisions: [
      { kindId: "shoot", quantity: 1 },
      { kindId: "video", quantity: 1 },
      { kindId: "reel", quantity: 3 },
    ],
    price: 2400,
    hours: { shoot: 10, edit: 24 },
    directCost: 300,
    directCostNote: "εξωτερικός χειριστής κάμερας",
    actuals: { avgShoot: 9, avgEdit: 28, productions: 2 },
    isArchived: false,
    isPublic: true,
    showsPrice: true,
    nameEn: "Corporate video",
    descriptionPublic:
      "Μία ημέρα γύρισμα, ένα βίντεο για την εταιρεία σας και τρία reels.",
    descriptionPublicEn:
      "One day of filming, one company video and three reels.",
    sectors: ["Εταιρικά"],
    updated: { when: "2026-06-30", by: "Δημήτρης Ιωάννου" },
  },
  {
    kind: "package",
    id: "pkg-event-mini",
    name: "Εκδήλωση Μίνι",
    description: "Κάλυψη μικρής εκδήλωσης έως 3 ώρες και ένα σύντομο βίντεο.",
    billing: "εφάπαξ",
    provisions: [
      { kindId: "shoot", quantity: 1 },
      { kindId: "video", quantity: 1 },
    ],
    price: 400,
    hours: { shoot: 3, edit: 5 },
    directCost: 0,
    actuals: null,
    isArchived: false,
    isPublic: true,
    showsPrice: true,
    nameEn: "Event Mini",
    descriptionPublic: "Μικρή εκδήλωση, ένα βίντεο αναμνηστικό.",
    descriptionPublicEn: "A small event, one highlight video.",
    sectors: ["Εκδηλώσεις"],
    updated: { when: "2026-09-15", by: "Δημήτρης Ιωάννου" },
  },
  {
    kind: "package",
    id: "pkg-social-starter",
    name: "Social Starter 2025",
    description:
      "Το παλιό μικρό πακέτο. Δεν πουλιέται πια· μία Συμφωνία το κρατά ως τη λήξη της.",
    billing: "μηνιαίο",
    provisions: [
      { kindId: "shoot", quantity: 1 },
      { kindId: "reel", quantity: 4 },
    ],
    price: 600,
    hours: { shoot: 3, edit: 7 },
    directCost: 0,
    actuals: { avgShoot: 3.2, avgEdit: 7.8, productions: 11 },
    isArchived: true,
    isPublic: false,
    showsPrice: false,
    nameEn: "Social Starter 2025",
    descriptionPublic: "",
    descriptionPublicEn: "",
    sectors: [],
    updated: { when: "2026-03-01", by: "Γιώργος Μαυρίδης" },
  },
  {
    kind: "service",
    id: "svc-extra-reel",
    name: "Έξτρα reel",
    description: "Ένα reel πέρα από τις Παροχές, από υλικό που υπάρχει.",
    unit: "ανά reel",
    provisions: [{ kindId: "reel", quantity: 1 }],
    price: 120,
    hours: { shoot: 0, edit: 2 },
    directCost: 0,
    actuals: { avgShoot: 0, avgEdit: 2.3, productions: 14 },
    isArchived: false,
    updated: { when: "2026-05-20", by: "Δημήτρης Ιωάννου" },
  },
  {
    kind: "service",
    id: "svc-extra-shoot-hour",
    name: "Έξτρα ώρα γυρίσματος",
    description: "Όταν ένα Γύρισμα ξεπερνά τη διάρκεια που καλύπτει η Παροχή.",
    unit: "ανά ώρα",
    provisions: [],
    price: 90,
    hours: { shoot: 1, edit: 0 },
    directCost: 0,
    actuals: { avgShoot: 1, avgEdit: 0, productions: 5 },
    isArchived: false,
    updated: { when: "2026-05-20", by: "Δημήτρης Ιωάννου" },
  },
  {
    kind: "service",
    id: "svc-drone",
    name: "Drone",
    description: "Εναέρια πλάνα σε υπάρχον Γύρισμα. Το drone νοικιάζεται.",
    unit: "ανά Γύρισμα",
    provisions: [],
    price: 300,
    hours: { shoot: 1, edit: 1 },
    directCost: 120,
    directCostNote: "ενοικίαση drone και χειριστής",
    actuals: null,
    isArchived: false,
    updated: { when: "2026-07-08", by: "Γιώργος Μαυρίδης" },
  },
  {
    kind: "service",
    id: "svc-photos",
    name: "Φωτογράφιση προϊόντων",
    description:
      "Είκοσι επεξεργασμένες φωτογραφίες από μία συνεδρία στο στούντιο.",
    unit: "ανά 20 φωτογραφίες",
    provisions: [{ kindId: "photo", quantity: 20 }],
    price: 350,
    hours: { shoot: 3, edit: 3 },
    directCost: 0,
    actuals: { avgShoot: 3, avgEdit: 4, productions: 3 },
    isArchived: false,
    updated: { when: "2026-04-11", by: "Δημήτρης Ιωάννου" },
  },
  {
    kind: "service",
    id: "svc-transcript",
    name: "Μεταγραφή podcast",
    description: "Κείμενο επεισοδίου. Σταμάτησε να πουλιέται.",
    unit: "ανά επεισόδιο",
    provisions: [],
    price: 60,
    hours: { shoot: 0, edit: 1.5 },
    directCost: 0,
    actuals: { avgShoot: 0, avgEdit: 1.2, productions: 8 },
    isArchived: true,
    updated: { when: "2026-02-14", by: "Γιώργος Μαυρίδης" },
  },
];

export const findItem = (id: string): CatalogueItem | undefined =>
  CATALOGUE.find((item) => item.id === id);

export const isPackage = (item: CatalogueItem): item is CataloguePackage =>
  item.kind === "package";

// Εκτιμώμενο κόστος = Εκτιμώμενες ώρες × Κόστος ώρας + Άμεσο κόστος (ADR 0017).
export interface CostView {
  totalHours: number;
  estimatedCost: number;
  range: { min: number; target: number; max: number };
  margin: number;
  marginPercent: number;
  isBelowMin: boolean;
}

export const costOf = (
  item: Pick<CatalogueItem, "hours" | "directCost" | "price">,
  settings: CostSettings = COST_SETTINGS,
): CostView => {
  const totalHours = item.hours.shoot + item.hours.edit;
  const estimatedCost = totalHours * hourCost(settings) + item.directCost;
  const range = {
    min: estimatedCost * settings.multipliers.min,
    target: estimatedCost * settings.multipliers.target,
    max: estimatedCost * settings.multipliers.max,
  };
  const margin = item.price - estimatedCost;
  return {
    totalHours,
    estimatedCost,
    range,
    margin,
    marginPercent: item.price > 0 ? margin / item.price : 0,
    isBelowMin: item.price < range.min,
  };
};

export const provisionsText = (provisions: readonly Provision[]): string =>
  provisions.length === 0
    ? "—"
    : provisions
        .map(
          (provision) =>
            `${provision.quantity} ${provisionKind(provision.kindId).unit}`,
        )
        .join(", ");

export const kindLabel = (item: CatalogueItem): string =>
  isPackage(item) ? `Πακέτο ${item.billing}` : `Υπηρεσία ${item.unit}`;

export const priceSuffix = (item: CatalogueItem): string =>
  isPackage(item)
    ? item.billing === "μηνιαίο"
      ? "/ μήνα"
      : "εφάπαξ"
    : item.unit;
