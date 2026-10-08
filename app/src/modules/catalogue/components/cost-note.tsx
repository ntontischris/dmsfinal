import Link from "next/link";

import { formatMoney, formatMonth, formatMultiplier } from "../helpers";
import type { CostHint } from "../types";

interface CostNoteProps {
  hint: CostHint | null; // null: η ανάγνωση πέτυχε αλλά δεν γύρισε τίποτα
}

function FinanceLink() {
  return (
    <Link href="/app/settings/finance" className="whitespace-nowrap">
      Ρυθμίσεις › Οικονομικά
    </Link>
  );
}

function HourCostText({ hint }: { hint: CostHint & { hourCost: number } }) {
  const { min, target, max } = hint.multipliers;
  const month = hint.hourCostMonth ? ` ${formatMonth(hint.hourCostMonth)}` : "";
  const multipliers = `×${formatMultiplier(min)} / ×${formatMultiplier(target)} / ×${formatMultiplier(max)}`;
  return (
    <span>
      Κόστος ώρας{month}: {formatMoney(hint.hourCost)} · Εύρος τιμής{" "}
      {multipliers}
    </span>
  );
}

// Η γραμμή πάνω από τον Κατάλογο για όποιον βλέπει κόστος: ποιο Κόστος ώρας ισχύει σήμερα, ή ότι λείπει.
export function CostNote({ hint }: CostNoteProps) {
  return (
    <p className="m-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border bg-card px-3 py-2 text-sm">
      {hint === null || hint.hourCost === null ? (
        <span>
          Δεν έχει οριστεί Κόστος ώρας· χωρίς αυτό δεν φαίνονται κόστος και
          περιθώριο.
        </span>
      ) : (
        <HourCostText hint={{ ...hint, hourCost: hint.hourCost }} />
      )}
      <FinanceLink />
    </p>
  );
}
