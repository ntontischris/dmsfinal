import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import {
  athensMonthStart,
  catalogueCaps,
  formatHours,
  formatMoney,
  formatMonth,
  getCostHint,
  listCostMonths,
  monthOptions,
  saveCostMonth,
  saveMultipliers,
  type CostHint,
  type CostMonth,
} from "@/modules/catalogue";
import {
  financeCaps,
  listPaymentMethods,
  restoreMethod,
  retireMethod,
  saveMethod,
  type PaymentMethod,
} from "@/modules/finance";
import {
  SaveRow,
  SettingsCard,
  SettingsForm,
  SpacesSettingsTabs,
  recentChanges,
} from "@/modules/settings";
import { hrefOf } from "@/spaces/data/screens";
import { ListRow, RowList } from "@/spaces/kit/parts";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtPercent,
} from "@/spaces/screens/shared";

import {
  O6_AUDIT_ENTITIES,
  changeRowsOf,
  hourCostOf,
  methodItemsOf,
  monthRowsOf,
  multiplierRowsOf,
} from "./o6-adapter";
import { decimalText } from "./o6-live";
import { MethodsEditor } from "./o6-methods";
import { O6MonthCards } from "./o6-month";
import { AdminCost, MethodsList, RecentChanges } from "./o6-parts";

import "./o6.css";

// O6 Ρυθμίσεις Οικονομικών στη νέα εμφάνιση (prototype `screens/O6.tsx`). Η σελίδα ανοίγει σε όποιον «Βλέπει κόστος»·
// τα έξοδα, οι ώρες και το Εύρος τιμής φαίνονται και αλλάζουν μόνο με «Διαχειρίζεται κόστος».
// Οι Τρόποι είσπραξης αλλάζουν με «Διαχειρίζεται Ρυθμίσεις» (όπως η κλασική), στη μορφή του ListEditor.
// Το «Προεπιλεγμένο περιθώριο» του prototype δεν υπάρχει στη βάση.

const MONTHS_AHEAD = 6;
const FORWARD_NOTE =
  "Ισχύει από τον μήνα που ορίζεις και μετά, μέχρι να οριστεί νεότερος· οι κλεισμένοι μήνες δεν αλλάζουν.";
const RANGE_NOTE =
  "Είναι οδηγός δίπλα στην τιμή κάθε Πακέτου ή Υπηρεσίας (κόστος × πολλαπλασιαστής)· την τιμή τη γράφεις πάντα εσύ.";

const STATUS_TONE = {
  closed: undefined,
  current: "ok",
  future: "strong",
} as const;

function Methods({
  methods,
  canManage,
}: {
  methods: readonly PaymentMethod[];
  canManage: boolean;
}) {
  if (!canManage) return <MethodsList items={methodItemsOf(methods)} />;
  return (
    <MethodsEditor
      methods={methods}
      actions={{ save: saveMethod, retire: retireMethod, restore: restoreMethod }}
    />
  );
}

function MonthList({
  months,
  current,
}: {
  months: readonly CostMonth[];
  current: string;
}) {
  const rows = monthRowsOf(months, current, {
    money: formatMoney,
    hours: formatHours,
  });
  if (rows.length === 0) return null;
  return (
    <RowList>
      {rows.map((row) => (
        <ListRow
          key={row.month}
          isFaded={row.status === "closed"}
          title={row.label}
          sub={row.sub}
          aside={
            <>
              <strong>{formatMoney(row.expenses)}</strong>
              <Badge tone={STATUS_TONE[row.status]}>{row.statusLabel}</Badge>
            </>
          }
        />
      ))}
    </RowList>
  );
}

// «Έξοδα του μήνα» + «Παραγωγικές ώρες και Κόστος ώρας»: μία φόρμα του `saveCostMonth`, δύο κουμπιά όπως στο prototype.
function CostMonthCards({
  months,
  hint,
}: {
  months: readonly CostMonth[];
  hint: CostHint;
}) {
  const current = athensMonthStart();
  return (
    <SettingsForm action={saveCostMonth}>
      <O6MonthCards
        months={months}
        options={monthOptions(current, MONTHS_AHEAD)}
        current={current}
        inForceMonth={hint.hourCostMonth}
        forwardNote={FORWARD_NOTE}
        monthList={
          <>
            <MonthList months={months} current={current} />
            <p className="muted o-hint">
              <Link href={hrefOf("I6")}>
                Αναλυτικά έξοδα ανά κατηγορία: Έξοδα και Κόστος ώρας
              </Link>
            </p>
          </>
        }
        saveExpenses={<SaveRow card="expenses" />}
        saveHours={<SaveRow card="hours" />}
      />
    </SettingsForm>
  );
}

function InForce({ hint }: { hint: CostHint }) {
  if (hint.hourCostMonth === null || hint.hourCost === null) return null;
  return (
    <p className="muted o-hint">
      Κόστος ώρας που ισχύει: {formatMoney(hint.hourCost)} (
      {formatMonth(hint.hourCostMonth)})
    </p>
  );
}

function MultiplierRows({ hint }: { hint: CostHint }) {
  return (
    <RowList>
      {multiplierRowsOf(hint.multipliers).map((row) => (
        <ListRow
          key={row.name}
          title={row.label}
          sub={
            <>
              Ελάχιστο περιθώριο: {fmtPercent(row.margin)}
              <span className="muted"> (1 − 1/{decimalText(row.factor)})</span>
            </>
          }
          aside={
            <label className="o5-days">
              <span className="part-sub">Πολλαπλασιαστής</span>
              <input
                className="input"
                name={row.name}
                inputMode="decimal"
                required
                aria-label={`Πολλαπλασιαστής ${row.label}`}
                defaultValue={decimalText(row.factor)}
              />
            </label>
          }
        />
      ))}
    </RowList>
  );
}

// «Εύρος τιμής και Υπέρβαση κόστους»: οι τρεις πολλαπλασιαστές και το ποσοστό υπέρβασης, στο πραγματικό `saveMultipliers`.
function RangeCard({ hint }: { hint: CostHint }) {
  return (
    <SettingsForm action={saveMultipliers}>
      <SettingsCard title="Εύρος τιμής και Υπέρβαση κόστους">
        <MultiplierRows hint={hint} />
        <div className="o-fields">
          <span className="stack o-field">
            <label htmlFor="o6-overrun">Όριο Υπέρβασης κόστους (%)</label>
            <input
              id="o6-overrun"
              className="input"
              name="overrunPercent"
              inputMode="decimal"
              required
              defaultValue={decimalText(hint.overrunPercent)}
            />
            <span className="muted o-hint">
              Πάνω από αυτό, η Παραγωγή σημαίνεται «Υπέρβαση» στο Κόστος και
              ώρες· δεν μπλοκάρει τίποτα.
            </span>
          </span>
        </div>
        <SaveRow card="range" />
        <p className="muted o-hint">{RANGE_NOTE}</p>
      </SettingsCard>
    </SettingsForm>
  );
}

async function O6Body({ canManageCost }: { canManageCost: boolean }) {
  const viewer = await getViewer();
  const [months, hint, changes, methods] = await Promise.all([
    canManageCost ? listCostMonths() : null,
    getCostHint(),
    recentChanges(O6_AUDIT_ENTITIES),
    listPaymentMethods(),
  ]);
  if ((months && !months.ok) || !hint.ok || !hint.data)
    return <ErrorNotice what="τις Ρυθμίσεις Οικονομικών" />;
  const canSeeAudit = can(viewer, "audit.view");
  return (
    <>
      {/* Οι Τρόποι είσπραξης έχουν δικό τους Δικαίωμα· αν δεν φορτώσουν, μένει η υπόλοιπη σελίδα. */}
      {methods.ok ? (
        <Methods
          methods={methods.data}
          canManage={financeCaps(viewer).canManageMethods}
        />
      ) : (
        <ErrorNotice what="οι Τρόποι είσπραξης" />
      )}
      {months?.ok ? (
        <>
          <CostMonthCards months={months.data} hint={hint.data} />
          <InForce hint={hint.data} />
          <RangeCard hint={hint.data} />
        </>
      ) : (
        <AdminCost glance={hourCostOf(hint.data)} />
      )}
      {changes.ok && (changes.data.length > 0 || canSeeAudit) && (
        <RecentChanges
          rows={changeRowsOf(changes.data)}
          canSeeAudit={canSeeAudit}
        />
      )}
    </>
  );
}

export async function SpacesFinanceSettings() {
  const caps = catalogueCaps(await getViewer());
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O6" />
      {caps.canSeeCost ? (
        <O6Body canManageCost={caps.canManageCost} />
      ) : (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα στοιχεία κόστους τα βλέπει όποιος «Βλέπει κόστος και κερδοφορία».
        </StateNotice>
      )}
    </div>
  );
}
