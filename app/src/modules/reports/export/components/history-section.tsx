import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { findReport } from "@/modules/reports/catalog";
import { historyAt, historyWhat } from "../history";
import {
  HISTORY_COLUMNS,
  HISTORY_EMPTY,
  HISTORY_ERROR,
  HISTORY_OWN_NOTE,
  HISTORY_SECTION,
} from "../labels";
import { getExportHistory } from "../queries";

const reportTitle = (id: string): string | undefined => findReport(id)?.title;

// Ιστορικό εξαγωγών (Ρ7): ολόκληρο για όποιον «Βλέπει ίχνος ενεργειών», αλλιώς μόνο τα δικά του. Το κρίνει η βάση.
export async function HistorySection() {
  const result = await getExportHistory();
  if (!result.ok) {
    return (
      <Panel label={HISTORY_SECTION}>
        <p className="m-0 text-sm text-destructive">{HISTORY_ERROR}</p>
      </Panel>
    );
  }
  const { all, items } = result.data;
  return (
    <Panel label={HISTORY_SECTION}>
      <div className="grid gap-3">
        {!all && (
          <p className="m-0 text-sm text-muted-foreground">
            {HISTORY_OWN_NOTE}
          </p>
        )}
        {items.length === 0 ? (
          <Notice kind="empty" title={HISTORY_EMPTY} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{HISTORY_COLUMNS.at}</Th>
                <Th>{HISTORY_COLUMNS.by}</Th>
                <Th>{HISTORY_COLUMNS.what}</Th>
                <Th isNumeric>{HISTORY_COLUMNS.rows}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <Tr key={`${item.at}-${index}`}>
                  <Td
                    data-label={HISTORY_COLUMNS.at}
                    className="whitespace-nowrap"
                  >
                    {historyAt(item.at)}
                  </Td>
                  <Td data-label={HISTORY_COLUMNS.by}>{item.actorName}</Td>
                  <Td data-label={HISTORY_COLUMNS.what}>
                    {historyWhat(item, reportTitle)}
                  </Td>
                  <Td data-label={HISTORY_COLUMNS.rows} isNumeric>
                    {item.rows}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Panel>
  );
}
