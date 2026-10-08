// Τύποι του module «Κατάλογος και Κόστος». Το null σε τιμή, ώρες ή κόστος σημαίνει «δεν δικαιούσαι να το δεις», ποτέ μηδέν.

export type ItemKind = "package" | "service";
export type Billing = "monthly" | "one_off";
export type Measure = "per_filming" | "per_hour" | "per_day";
export type NewItemType = "package_monthly" | "package_one_off" | "service"; // το πεδίο «Είδος» της δημιουργίας

export interface Provision {
  kindId: string;
  quantity: number;
}

export interface ProvisionKind {
  id: string;
  code: string | null;
  label: string;
  labelEn: string;
  unit: string;
  unitEn: string;
  measure: Measure | null;
  defaultHours: number | null;
  sort: number;
  isRetired: boolean;
}
export type KindUsage = Readonly<Record<string, number>>; // κλειδί: id του είδους

export interface CatalogueItem {
  id: string;
  kind: ItemKind;
  billing: Billing | null;
  name: string;
  nameEn: string;
  description: string;
  unit: string;
  isPublic: boolean;
  showsPrice: boolean;
  descriptionPublic: string;
  descriptionPublicEn: string;
  isRetired: boolean;
  price: number | null;
  hoursShoot: number | null;
  hoursEdit: number | null;
  directCost: number | null;
  directCostNote: string | null;
  provisions: Provision[];
  uses: number | null;
  updatedAt: string;
  updatedByName: string | null;
}

export interface Multipliers {
  min: number;
  target: number;
  max: number;
}
export interface CostHint {
  hourCostMonth: string | null; // YYYY-MM-01 του μήνα που ισχύει, null αν δεν έχει οριστεί ακόμα Κόστος ώρας
  hourCost: number | null;
  multipliers: Multipliers;
}
export interface CostMonth {
  month: string; // YYYY-MM-01
  expensesTotal: number;
  productiveHours: number;
  hourCost: number;
  isClosed: boolean;
  updatedAt: string;
  updatedByName: string | null;
}
export type MonthStatus = "closed" | "current" | "future";

export interface PriceRange {
  min: number;
  target: number;
  max: number;
}
export interface ItemCost {
  totalHours: number;
  hourCost: number;
  hoursCost: number;
  directCost: number;
  estimatedCost: number;
  range: PriceRange;
  hasHours: boolean;
}
export interface ItemMargin {
  amount: number;
  percent: number; // 0.3846 = 38,5%
  isBelowMin: boolean;
}

export interface CatalogueCaps {
  canView: boolean; // catalogue.view ή catalogue.manage
  canManage: boolean; // catalogue.manage
  canSeePrice: boolean; // finance.amounts
  canEditPrice: boolean; // catalogue.manage ∧ finance.amounts
  canSeeCost: boolean; // finance.cost
  canEditDirectCost: boolean; // catalogue.manage ∧ finance.cost
  canManageCost: boolean; // finance.costManage ∧ finance.cost
  canManageSettings: boolean; // settings.manage
}

// Μια γραμμή της C1, ήδη μορφοποιημένη (περνά σε client component).
export interface CatalogueRow {
  id: string;
  href: string;
  name: string;
  kind: ItemKind;
  kindLabel: string;
  provisions: string;
  price: string | null;
  cost: string | null;
  margin: string | null;
  isBelowMin: boolean;
  isPublic: boolean;
  isRetired: boolean;
}
export type KindFilter = "all" | ItemKind;
export interface MonthOption {
  value: string; // YYYY-MM-01
  label: string;
}
