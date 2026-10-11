import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { deadlineText } from "../helpers";
import { NO_ASSIGNEE_LABEL, NO_DEADLINE_LABEL, STATE_LABELS } from "../labels";
import type { DeliverableCandidates, DeliverableCard } from "../types";

import { MutedNote } from "./form-fields";
import { NewDeliverableDetails } from "./new-deliverable-details";
import { SignalBadges } from "./signal-badges";

interface ProductionDeliverablesProps {
  productionId: string;
  productionTitle: string;
  client: string | null;
  isInternal: boolean;
  cards: readonly DeliverableCard[];
  candidates: DeliverableCandidates | null;
}

// G2: η ενότητα «Παραδοτέα» της Παραγωγής. Ο πίνακας από τη βάση· το «Νέο Παραδοτέο» μόνο όπου επιτρέπεται.
export function ProductionDeliverables({
  productionId,
  productionTitle,
  client,
  isInternal,
  cards,
  candidates,
}: ProductionDeliverablesProps) {
  return (
    <Panel label="Παραδοτέα" aside={`${cards.length}`}>
      <div className="grid gap-4">
        {candidates && (
          <NewDeliverableDetails
            productionId={productionId}
            productionTitle={productionTitle}
            client={client}
            isInternal={isInternal}
            candidates={candidates}
          />
        )}
        {cards.length === 0 ? (
          <MutedNote>Η Παραγωγή δεν έχει ακόμα Παραδοτέα.</MutedNote>
        ) : (
          <DeliverableRows cards={cards} />
        )}
      </div>
    </Panel>
  );
}

function DeliverableRows({ cards }: { cards: readonly DeliverableCard[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Παραδοτέο</Th>
          <Th>Είδος</Th>
          <Th>Υπεύθυνος</Th>
          <Th>Κατάσταση</Th>
          <Th>Προθεσμία</Th>
          <Th>Σήματα</Th>
        </tr>
      </thead>
      <tbody>
        {cards.map((card) => (
          <Tr key={card.id}>
            <Td data-label="Παραδοτέο">
              <Link href={`/app/deliverables/${card.id}`} className="font-medium">
                {card.title}
              </Link>
            </Td>
            <Td data-label="Είδος">{card.kind}</Td>
            <Td data-label="Υπεύθυνος">{card.assigneeName ?? NO_ASSIGNEE_LABEL}</Td>
            <Td data-label="Κατάσταση">
              <Badge tone={card.state === "approved" ? "ok" : undefined}>{STATE_LABELS[card.state]}</Badge>
            </Td>
            <Td data-label="Προθεσμία">{deadlineText(card.deadline) || NO_DEADLINE_LABEL}</Td>
            <Td data-label="Σήματα">
              <SignalBadges card={card} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
