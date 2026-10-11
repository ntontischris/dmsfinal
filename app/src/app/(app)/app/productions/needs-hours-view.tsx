import { ScreenHeader } from "@/components/shell/screen-header";
import { CostList, listCostRows } from "@/modules/costs";
import { ProductionTabs } from "@/modules/productions";

import { LoadError } from "./productions-parts";

const EYEBROW = "G1 · Παραγωγές";

// G1 καρτέλα «Θέλουν ώρες»: οι Παραγωγές που έχουν παραδοθεί χωρίς πλήρεις πραγματικές ώρες.
export async function NeedsHoursView({ hoursCount }: { hoursCount: number }) {
  const rows = await listCostRows("needs_hours");
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Παραγωγές" />
      <div className="grid gap-4">
        <ProductionTabs tab="hours" internalOnly={false} hoursCount={hoursCount} />
        {rows.ok ? (
          <CostList rows={rows.data} emptyText="Καμία Παραγωγή δεν περιμένει ώρες." />
        ) : (
          <LoadError />
        )}
      </div>
    </>
  );
}
