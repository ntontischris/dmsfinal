import Link from "next/link";

import { activeAgreementsOf } from "@/data/agreements";
import { catalogueCapsOf } from "@/data/catalogue-access";
import {
  CATALOGUE,
  COST_SETTINGS,
  costOf,
  hourCost,
  kindLabel,
  priceSuffix,
  provisionsText,
} from "@/data/catalogue";
import {
  CatalogueTable,
  type CatalogueRow,
} from "@/screens/c1-catalogue-table";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtMoney,
  fmtPercent,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

// Λίστα Πακέτων και Υπηρεσιών. Ιδιοκτήτης και Διαχείριση: όλα, με κόστος και περιθώριο. Πωλήσεις: μόνο ανάγνωση, τιμές και Παροχές, χωρίς κόστος και χωρίς αρχειοθετημένα.
export function C1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = catalogueCapsOf(role);

  const rows: readonly CatalogueRow[] = CATALOGUE.filter(
    (item) => caps.canSeeArchived || !item.isArchived,
  ).map((item) => {
    const cost = costOf(item);
    return {
      id: item.id,
      href: screenHref(role, "C2", { id: item.id }),
      name: item.name,
      kind: item.kind,
      kindLabel: kindLabel(item),
      provisions: provisionsText(item.provisions),
      price: `${fmtMoney(item.price)} ${priceSuffix(item)}`,
      cost: caps.canSeeCost ? fmtMoney(cost.estimatedCost) : null,
      margin: caps.canSeeCost
        ? `${fmtMoney(cost.margin)} · ${fmtPercent(cost.marginPercent)}`
        : null,
      isBelowMin: caps.canSeeCost && cost.isBelowMin,
      isPublic: item.kind === "package" && item.isPublic,
      isArchived: item.isArchived,
      activeAgreements: activeAgreementsOf(item.id),
    };
  });

  return (
    <>
      <StateSwitcher role={role} code="C1" state={state} />
      <div className="toolbar">
        <span className="muted grow">
          {caps.isReadOnly
            ? "Μόνο ανάγνωση: τιμές και Παροχές, για να διαλέγεις γραμμές στην πρόταση."
            : "Ό,τι αλλάζεις εδώ ισχύει για νέες προτάσεις. Οι υπογεγραμμένες Συμφωνίες κρατούν το δικό τους."}
        </span>
        {caps.canManage && (
          <span className="btn-row">
            <Link
              className="button"
              data-primary="true"
              href={screenHref(role, "C2", { new: "package" })}
            >
              Νέο Πακέτο
            </Link>
            <Link
              className="button"
              href={screenHref(role, "C2", { new: "service" })}
            >
              Νέα Υπηρεσία
            </Link>
          </span>
        )}
      </div>
      {caps.canSeeCost && state === "normal" && (
        <p className="note">
          Κόστος ώρας {COST_SETTINGS.monthLabel}:{" "}
          <strong>{fmtMoney(hourCost())}</strong> (
          {fmtMoney(COST_SETTINGS.monthlyExpenses)} έξοδα ÷{" "}
          {COST_SETTINGS.productiveHours} ώρες) · Εύρος τιμής ×
          {COST_SETTINGS.multipliers.min} / ×{COST_SETTINGS.multipliers.target}{" "}
          / ×{COST_SETTINGS.multipliers.max}. Αλλάζουν στα{" "}
          <Link href={screenHref(role, "I6", {})}>Έξοδα και Κόστος ώρας</Link>.
        </p>
      )}
      {state === "error" && <ErrorNotice what="ο Κατάλογος" />}
      {state === "empty" && (
        <StateNotice kind="empty" title="Ο Κατάλογος είναι άδειος">
          <p>
            {caps.canManage
              ? "Γράψε το πρώτο Πακέτο ή Υπηρεσία. Μέχρι τότε ο έλεγχος ετοιμότητας δείχνει «εκκρεμεί» και το σύστημα δεν ανοίγει σε πελάτες."
              : "Η Διαχείριση δεν έχει γράψει ακόμα Πακέτα και Υπηρεσίες."}
          </p>
        </StateNotice>
      )}
      {state === "normal" && (
        <CatalogueTable
          rows={rows}
          showCost={caps.canSeeCost}
          showArchivedFilter={caps.canSeeArchived}
        />
      )}
    </>
  );
}
