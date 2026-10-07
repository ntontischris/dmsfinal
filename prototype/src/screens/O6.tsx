import Link from "next/link";

import {
  COLLECTION_METHODS,
  EXPENSE_CATEGORIES,
  PRODUCTIVE_HOURS,
  TARGET_MARGIN,
  totalExpenses,
} from "@/data/settings-finance";
import { settingsCapsOf } from "@/data/settings-access";
import { O6AdminCost, O6CostBlock } from "@/screens/o6-cost";
import {
  ListEditor,
  SaveRow,
  SettingsCard,
  SettingsFrame,
} from "@/screens/o-shared";
import { screenHref, type ScreenProps } from "@/screens/shared";

import "./o6.css";

// O6 «Ρυθμίσεις: Οικονομικά»: περιθώριο και Τρόποι είσπραξης για τη Διαχείριση, κόστος μόνο για «Διαχειρίζεται κόστος».
export function O6({ role, query }: ScreenProps) {
  const caps = settingsCapsOf(role);
  return (
    <SettingsFrame
      role={role}
      query={query}
      code="O6"
      what="τις Ρυθμίσεις Οικονομικών"
    >
      {(state) => {
        const isEmpty = state === "empty";
        const hourCost = totalExpenses(EXPENSE_CATEGORIES) / PRODUCTIVE_HOURS;
        return (
          <>
            <SettingsCard title="Προεπιλεγμένο περιθώριο">
              <div className="o-fields">
                <span className="stack o-field">
                  <label htmlFor="o6-margin">Τιμή-στόχος (περιθώριο, %)</label>
                  <input
                    id="o6-margin"
                    className="input"
                    defaultValue={Math.round(TARGET_MARGIN * 100)}
                    inputMode="numeric"
                  />
                  <span className="muted o-hint">
                    Ο στόχος που προτείνεται σε κάθε νέα Προσφορά.
                  </span>
                </span>
              </div>
              <SaveRow role={role} query={query} code="O6" card="margin" />
              <p className="muted o-hint">
                Ο ΦΠΑ δεν ορίζεται εδώ: ζει στην καρτέλα{" "}
                <Link href={screenHref(role, "O1", {})}>Εταιρεία (O1)</Link>.
              </p>
            </SettingsCard>
            <ListEditor
              role={role}
              query={query}
              code="O6"
              listId="collect"
              title="Τρόποι είσπραξης"
              items={COLLECTION_METHODS}
            />
            {caps.canManageCost && (
              <O6CostBlock role={role} query={query} isEmpty={isEmpty} />
            )}
            {!caps.canManageCost && caps.seesCostTotals && (
              <O6AdminCost hourCost={hourCost} isEmpty={isEmpty} />
            )}
          </>
        );
      }}
    </SettingsFrame>
  );
}
