import Link from "next/link";

import { Panel } from "@/components/ui/panel";

import type { DeliverableCard } from "../types";

import { ChargeDecisionForm } from "./charge-decision-form";
import { MutedNote } from "./form-fields";

interface ChargeDecisionsPanelProps {
  cards: readonly DeliverableCard[];
}

// «Αποφάσεις χρέωσης» στην ουρά: τα Παραδοτέα που περιμένουν απόφαση, όσο υπάρχουν.
export function ChargeDecisionsPanel({ cards }: ChargeDecisionsPanelProps) {
  return (
    <Panel label="Αποφάσεις χρέωσης">
      <div className="grid gap-5">
        {cards.map((card) => (
          <div key={card.id} className="grid gap-2">
            <Link href={`/app/deliverables/${card.id}`} className="font-medium">
              {card.title}
            </Link>
            <MutedNote>
              Η δουλειά δεν σταμάτησε. Η Παροχή δεν έφτανε για το Παραδοτέο.
            </MutedNote>
            <ChargeDecisionForm deliverableId={card.id} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
