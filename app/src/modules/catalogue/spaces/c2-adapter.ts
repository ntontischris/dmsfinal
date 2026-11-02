import { activeKinds, formatMoney, publicPriceText, withVat } from "../helpers";
import { MEASURE_LABELS } from "../labels";
import type { CatalogueItem, Provision, ProvisionKind } from "../types";

// Καθαρή λογική της C2 στη νέα εμφάνιση: τα κείμενα των ενοτήτων και οι γραμμές του επεξεργαστή Παροχών.
// Ίδιοι κανόνες με τις σημερινές φόρμες (components/item-*.tsx, provisions-editor.tsx).

export const provisionsIntro = (
  item: Pick<CatalogueItem, "kind" | "billing">,
): string => {
  if (item.kind === "service")
    return "Τι δίνει μία μονάδα της Υπηρεσίας. Κενό σημαίνει ότι δεν καταναλώνει Παροχή (π.χ. drone).";
  return item.billing === "monthly"
    ? "Τι παίρνει ο πελάτης σε κάθε Περίοδο."
    : "Τι παίρνει ο πελάτης συνολικά.";
};

export const measureText = (kind: ProvisionKind | undefined): string => {
  if (!kind) return "";
  if (kind.measure === null) return "μετράει σε πλήθος";
  const label = MEASURE_LABELS[kind.measure];
  return kind.defaultHours === null
    ? label
    : `${label}, έως ${kind.defaultHours} ώρες`;
};

export const vatHint = (
  price: number | null,
  vatRate: number | null,
): string | null =>
  price === null || vatRate === null
    ? null
    : `Με ΦΠΑ ${vatRate}%: ${formatMoney(withVat(price, vatRate))}.`;

// Τι θα δει ο Επισκέπτης, από τις τρέχουσες επιλογές.
export const visitorLine = (
  item: CatalogueItem,
  state: { isPublic: boolean; showsPrice: boolean },
): string => {
  if (!state.isPublic) return "Δεν φαίνεται στην Ιστοσελίδα.";
  if (!state.showsPrice) return "Ο Επισκέπτης βλέπει το Πακέτο χωρίς τιμή.";
  const price = publicPriceText(item);
  return price === null
    ? "Ο Επισκέπτης βλέπει το Πακέτο με ένδειξη τιμής."
    : `Ο Επισκέπτης βλέπει «${price}».`;
};

export const usesText = (uses: number): string =>
  uses === 0
    ? "Καμία Συμφωνία δεν το έχει αντιγράψει ακόμα."
    : `${uses} Συμφωνίες το έχουν αντιγράψει.`;

// ───────────── Γραμμές Παροχών ─────────────

export interface DraftRow {
  key: number;
  kindId: string; // "" = δεν διαλέχτηκε ακόμα είδος
  quantity: string;
}

export const toDrafts = (initial: readonly Provision[]): DraftRow[] =>
  initial.map((provision, key) => ({
    key,
    kindId: provision.kindId,
    quantity: String(provision.quantity),
  }));

// Οι γραμμές χωρίς είδος μένουν έξω· ποσότητα που δεν διαβάζεται γίνεται 0, ώστε να τη ρίξει ο έλεγχος με καθαρό μήνυμα.
export const serializeDrafts = (rows: readonly DraftRow[]): string =>
  JSON.stringify(
    rows
      .filter((row) => row.kindId !== "")
      .map((row) => ({
        kindId: row.kindId,
        quantity: Number(row.quantity) || 0,
      })),
  );

// Τα είδη μιας γραμμής: τα ενεργά που δεν τα έχει άλλη γραμμή, και το δικό της αν έχει αποσυρθεί.
export const kindOptions = (
  row: DraftRow,
  rows: readonly DraftRow[],
  kinds: readonly ProvisionKind[],
): { id: string; label: string }[] => {
  const takenElsewhere = new Set(
    rows.filter((other) => other.key !== row.key).map((other) => other.kindId),
  );
  const own = kinds.find((kind) => kind.id === row.kindId && kind.isRetired);
  return [
    ...activeKinds(kinds)
      .filter((kind) => !takenElsewhere.has(kind.id))
      .map((kind) => ({ id: kind.id, label: kind.unit })),
    ...(own ? [{ id: own.id, label: `${own.unit} (αποσυρμένο)` }] : []),
  ];
};

export const hasFreeKind = (
  rows: readonly DraftRow[],
  kinds: readonly ProvisionKind[],
): boolean =>
  activeKinds(kinds).some(
    (kind) => !rows.some((row) => row.kindId === kind.id),
  );
