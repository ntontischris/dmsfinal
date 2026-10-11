import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { CLIENT_QUEUE_HINT, EMPTY_QUEUE_NOTE, NO_DELIVERABLES_NOTE } from "../client-labels";
import type {
  ClientDeliverableCard,
  ClientDeliverablesView,
  ClientPeriodGroup,
} from "../client-types";
import { awaitingFirst, roundsText, stateLabel, stateTone, waitingText } from "../client-helpers";

import { MutedNote } from "./form-fields";

// H3: τα Παραδοτέα του Πελάτη ανά Περίοδο. Πάνω πάνω ό,τι περιμένει τον πελάτη.
export function ClientQueueView({ view }: { view: ClientDeliverablesView }) {
  return (
    <div className="grid gap-5">
      <MutedNote>{CLIENT_QUEUE_HINT}</MutedNote>
      <AwaitingPanel cards={view.awaitingYou} />
      {view.periods.length === 0 ? (
        <Notice kind="empty" title="Κανένα Παραδοτέο ακόμα">
          <p className="m-0">{NO_DELIVERABLES_NOTE}</p>
        </Notice>
      ) : (
        view.periods.map((group) => (
          <PeriodGroupPanel key={group.periodId ?? group.periodLabel} group={group} />
        ))
      )}
    </div>
  );
}

function AwaitingPanel({ cards }: { cards: readonly ClientDeliverableCard[] }) {
  return (
    <Panel label="Περιμένουν εσένα">
      {cards.length === 0 ? (
        <MutedNote>{EMPTY_QUEUE_NOTE}</MutedNote>
      ) : (
        <ClientCardList cards={awaitingFirst(cards)} />
      )}
    </Panel>
  );
}

// Λίστα κάρτων Παραδοτέων για τον πελάτη (και στην H3, και στη σελίδα της Παραγωγής).
export function ClientCardList({ cards }: { cards: readonly ClientDeliverableCard[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {cards.map((card) => (
        <CardRow key={card.id} card={card} />
      ))}
    </ul>
  );
}

function PeriodGroupPanel({ group }: { group: ClientPeriodGroup }) {
  return (
    <Panel label={group.periodLabel}>
      <div className="grid gap-4">
        {group.provisions.length > 0 && (
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
              {group.provisions.map((provision) => (
                <Tr key={provision.kind}>
                  <Td data-label="Είδος Παροχής">{provision.kind}</Td>
                  <Td data-label="Χρησιμοποιήθηκαν" isNumeric>{provision.used}</Td>
                  <Td data-label="Απομένουν" isNumeric>{provision.remaining}</Td>
                  <Td data-label="Σύνολο" isNumeric>{provision.total}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {group.deliverables.length === 0 ? (
          <MutedNote>{NO_DELIVERABLES_NOTE}</MutedNote>
        ) : (
          <ClientCardList cards={group.deliverables} />
        )}
      </div>
    </Panel>
  );
}

function CardRow({ card }: { card: ClientDeliverableCard }) {
  const waiting = waitingText(card);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-sm border p-3 text-sm">
      <span className="grid gap-0.5">
        <Link href={`/app/deliverables/${card.id}`} className="font-medium">
          {card.title}
        </Link>
        <span className="text-muted-foreground">
          {card.kind} · {roundsText(card.roundsUsed, card.roundsLimit)}
          {waiting && ` · ${waiting}`}
        </span>
      </span>
      <Badge tone={stateTone(card.state)}>{stateLabel(card.state)}</Badge>
    </li>
  );
}
