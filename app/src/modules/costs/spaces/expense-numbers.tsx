import { getViewer } from "@/modules/access";
import { athensMonthStart } from "@/modules/catalogue";
import { fmtMoney } from "@/spaces/screens/shared";
import { SectionNumbers } from "@/spaces/shell/section-numbers";

import { costsCaps } from "../caps";
import { getMonthExpenses } from "../queries-expenses";

// Η κάρτα «Έξοδα» (I6): τα έξοδα του μήνα αν γράφτηκαν, αλλιώς ότι μένουν να γραφτούν.
export async function ExpenseNumbers() {
  if (!costsCaps(await getViewer()).canView) return null;
  const month = await getMonthExpenses(athensMonthStart());
  if (!month.ok) return null;
  const saved = month.data.saved;
  return (
    <SectionNumbers
      numbers={{
        I6: saved
          ? { count: "✓", hint: `${fmtMoney(saved.expensesTotal)} τον μήνα` }
          : { count: "!", hint: "δεν γράφτηκαν ακόμα" },
      }}
    />
  );
}
