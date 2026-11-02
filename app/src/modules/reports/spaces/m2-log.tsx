import { Panel } from "@/spaces/kit/panel";
import { Person } from "@/spaces/kit/parts";
import { ErrorNotice } from "@/spaces/screens/shared";

import { findReport } from "../catalog";
import { historyWhat } from "../export/history";
import { HISTORY_EMPTY, HISTORY_OWN_NOTE } from "../export/labels";
import { getExportHistory } from "../export/queries";
import { historyWhen } from "./m2-model";

const reportTitle = (id: string): string | undefined => findReport(id)?.title;

// Ιστορικό εξαγωγών (prototype `screens/m2-log.tsx` + `LogRows`): ολόκληρο για όποιον «Βλέπει ίχνος ενεργειών», αλλιώς
// μόνο τα δικά του. Το κρίνει η βάση (export_history)· κάθε λήψη γράφεται εκεί και η σελίδα ξαναδιαβάζεται.
export async function LogSection() {
  const result = await getExportHistory();
  return (
    <div className="m2-section">
      <Panel label="Ιστορικό εξαγωγών">
        {!result.ok ? (
          <ErrorNotice what="το Ιστορικό εξαγωγών" />
        ) : (
          <>
            {!result.data.all && <p className="note">{HISTORY_OWN_NOTE}</p>}
            {result.data.items.length === 0 ? (
              <p className="muted">{HISTORY_EMPTY}</p>
            ) : (
              <div className="scroll">
                <table className="rtable m2-log">
                  <thead>
                    <tr>
                      <th>Πότε</th>
                      <th>Ποιος</th>
                      <th>Τι</th>
                      <th className="num">Γραμμές</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((e, index) => {
                      const when = historyWhen(e.at);
                      return (
                        <tr key={`${e.at}-${index}`}>
                          <td data-label="Πότε">
                            <strong>{when.date}</strong> {when.time}
                          </td>
                          <td data-label="Ποιος">
                            <Person name={e.actorName} />
                          </td>
                          <td data-label="Τι">
                            <strong>{historyWhat(e, reportTitle)}</strong>
                          </td>
                          <td className="num m2-rows" data-label="Γραμμές">
                            {e.rows}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
