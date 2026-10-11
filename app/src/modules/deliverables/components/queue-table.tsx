import Link from "next/link";

import { Notice } from "@/components/ui/notice";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import {
  CLIENT_QUEUE_NOTE,
  INTERNAL_LABEL,
  NO_ASSIGNEE_LABEL,
  NO_DEADLINE_LABEL,
  QUEUE_EMPTY,
} from "../labels";
import { deadlineText } from "../helpers";
import type { DeliverableCard, QueueView } from "../types";

import { SignalBadges } from "./signal-badges";
import { MutedNote } from "./form-fields";

interface QueueTableProps {
  cards: readonly DeliverableCard[];
  view: QueueView;
}

// Η ουρά: μία γραμμή ανά Παραδοτέο. Στο «Στον πελάτη» μπαίνουν οι μέρες αναμονής αντί για την προθεσμία.
export function QueueTable({ cards, view }: QueueTableProps) {
  const isClientView = view === "client";
  if (cards.length === 0)
    return (
      <Notice kind="empty" title={QUEUE_EMPTY[view].title}>
        <p className="m-0">{QUEUE_EMPTY[view].text}</p>
      </Notice>
    );
  return (
    <div className="grid gap-3">
      {isClientView && <MutedNote>{CLIENT_QUEUE_NOTE}</MutedNote>}
      <Table>
        <thead>
          <tr>
            <Th>Παραδοτέο</Th>
            <Th>Παραγωγή</Th>
            <Th>Είδος</Th>
            <Th>Υπεύθυνος</Th>
            {isClientView ? <Th>Αναμονή</Th> : <Th>Προθεσμία</Th>}
            <Th>Σήματα</Th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <QueueRow key={card.id} card={card} isClientView={isClientView} />
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function QueueRow({ card, isClientView }: { card: DeliverableCard; isClientView: boolean }) {
  return (
    <Tr>
      <Td data-label="Παραδοτέο">
        <Link href={`/app/deliverables/${card.id}`} className="font-medium">
          {card.title}
        </Link>
      </Td>
      <Td data-label="Παραγωγή">
        <Link href={`/app/productions/${card.productionId}`}>{card.production}</Link>
        <span className="block text-xs text-muted-foreground">{card.client ?? INTERNAL_LABEL}</span>
      </Td>
      <Td data-label="Είδος">{card.kind}</Td>
      <Td data-label="Υπεύθυνος">{card.assigneeName ?? NO_ASSIGNEE_LABEL}</Td>
      {isClientView ? (
        <Td data-label="Αναμονή">{card.daysWaiting} μέρες</Td>
      ) : (
        <Td data-label="Προθεσμία">{deadlineText(card.deadline) || NO_DEADLINE_LABEL}</Td>
      )}
      <Td data-label="Σήματα">
        <SignalBadges card={card} />
      </Td>
    </Tr>
  );
}
