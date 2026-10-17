import { Segmented } from "@/components/ui/segmented";

import { dateLabel } from "../format";
import { PARTIAL_BADGE, PERIOD_LABEL } from "../labels";
import { getPeriods } from "../queries";
import { isPeriodCode, reportHref, type PeriodCode } from "../url";

interface PeriodFilterProps {
  reportId: string;
  period: PeriodCode;
  clientId?: string;
}

// Οι πέντε Περίοδοι, όπως τις υπολογίζει η βάση (ώρα Ελλάδας), και το εύρος της τρέχουσας («ως σήμερα» αν περιέχει το σήμερα).
// Αν δεν φορτώσουν, δεν φαίνονται· το σώμα της Αναφοράς δείχνει το δικό του σφάλμα με «Ξαναδοκίμασε».
export async function PeriodFilter({ reportId, period, clientId }: PeriodFilterProps) {
  const periods = await getPeriods();
  if (!periods.ok) return null;
  const items = periods.data.items.flatMap((item) =>
    isPeriodCode(item.code) ? [{ ...item, code: item.code }] : [],
  );
  const current = items.find((item) => item.code === period);
  return (
    <div className="grid gap-2">
      <Segmented
        label={PERIOD_LABEL}
        options={items.map((item) => ({
          label: item.label,
          href: reportHref({ report: reportId, period: item.code, client: clientId }),
          isCurrent: item.code === period,
        }))}
      />
      {current && (
        <p className="m-0 text-sm text-muted-foreground">
          {dateLabel(current.from)} – {dateLabel(current.through)}
          {current.isPartial && ` · ${PARTIAL_BADGE}`}
        </p>
      )}
    </div>
  );
}
