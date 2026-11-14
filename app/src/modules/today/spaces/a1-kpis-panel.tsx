import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Strip } from "@/spaces/shell/strip";

import type { TodayKpis } from "../view-schema";
import { kpiStatsOf, riskRowsOf } from "./a1-kpis";

// Δείκτες (d9): Τζίρος μήνα, Αξία pipeline, Ενεργές Παραγωγές, Περιθώριο φέτος, όσοι επιτρέπονται· από κάτω ο «ραντάρ
// κινδύνου» μόνο όταν κάτι κινδυνεύει. Χωρίς τίποτα, δεν πιάνει χώρο.
export function KpiBrief({ kpis }: { kpis: TodayKpis }) {
  const stats = kpiStatsOf(kpis);
  const risks = riskRowsOf(kpis.risks);
  if (stats.length === 0 && risks.length === 0) return null;
  return (
    <div className="a1-kpis" data-part="kpis">
      <Strip stats={stats} now={null} />
      {risks.length > 0 && (
        <div className="a1-brief-panel" data-part="risks">
          <Panel label="Ραντάρ κινδύνου">
            <div className="a1-rows">
              <RowList>
                {risks.map((risk) => (
                  <ListRow
                    key={risk.code}
                    title={risk.title}
                    href={risk.href}
                  />
                ))}
              </RowList>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
