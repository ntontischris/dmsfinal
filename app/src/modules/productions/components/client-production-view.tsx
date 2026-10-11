import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ClientCardList, type ClientDeliverableCard } from "@/modules/deliverables";
import { formatDateTime, periodLabel } from "../helpers";
import type { PeriodBalance, ProductionDetail, ProductionFilming, ProductionPeriod } from "../types";

import { FILMING_STATE_LABELS } from "./production-filmings";
import { MutedNote } from "./form-fields";

interface ClientProductionViewProps {
  production: ProductionDetail;
  awaiting: readonly ClientDeliverableCard[];
  deliverables: readonly ClientDeliverableCard[];
}

// G2 για τον Πελάτη: Παροχές της Περιόδου, Γυρίσματα, «Περιμένουν εσένα» και τα Παραδοτέα της.
// Χωρίς Εσωτερικές, Μέλη, προθεσμίες, κόστος, Ίχνος ή το link «Κόστος και ώρες».
export function ClientProductionView({ production, awaiting, deliverables }: ClientProductionViewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ClientProvisionsPanel period={production.period} balances={production.balances} />
      <ClientFilmingsPanel filmings={production.filmings} />
      <Panel label="Περιμένουν εσένα">
        {awaiting.length === 0 ? (
          <MutedNote>Τίποτα δεν περιμένει εσένα σε αυτή την Παραγωγή.</MutedNote>
        ) : (
          <ClientCardList cards={awaiting} />
        )}
      </Panel>
      <Panel label="Τα Παραδοτέα της">
        {deliverables.length === 0 ? (
          <MutedNote>Κανένα Παραδοτέο ακόμα. Για νέο Παραδοτέο, στείλε μας Μήνυμα.</MutedNote>
        ) : (
          <ClientCardList cards={deliverables} />
        )}
      </Panel>
    </div>
  );
}

function ClientProvisionsPanel({
  period,
  balances,
}: {
  period: ProductionPeriod | null;
  balances: readonly PeriodBalance[];
}) {
  if (!period) {
    return (
      <Panel label="Παροχές">
        <MutedNote>Εφάπαξ Παραγωγή: καμία Περίοδος Παροχών.</MutedNote>
      </Panel>
    );
  }
  return (
    <Panel label={`Παροχές της Περιόδου · ${periodLabel(period.starts)}`}>
      {balances.length === 0 ? (
        <MutedNote>Η Περίοδος δεν έχει Παροχές.</MutedNote>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Είδος Παροχής</Th>
              <Th isNumeric>χρησιμοποιήθηκαν</Th>
              <Th isNumeric>απομένουν</Th>
              <Th isNumeric>σύνολο</Th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <Tr key={balance.kindId}>
                <Td data-label="Είδος Παροχής">{balance.label}</Td>
                <Td data-label="Χρησιμοποιήθηκαν" isNumeric>{balance.used + balance.reserved}</Td>
                <Td data-label="Απομένουν" isNumeric>{balance.balance}</Td>
                <Td data-label="Σύνολο" isNumeric>{balance.given + balance.carried}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function ClientFilmingsPanel({ filmings }: { filmings: readonly ProductionFilming[] }) {
  return (
    <Panel label="Γυρίσματα">
      {filmings.length === 0 ? (
        <MutedNote>Κανένα Γύρισμα για αυτή την Παραγωγή.</MutedNote>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {filmings.map((filming) => (
            <li key={filming.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{formatDateTime(filming.startsAt)}</span>
              <Badge>{FILMING_STATE_LABELS[filming.state] ?? filming.state}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
