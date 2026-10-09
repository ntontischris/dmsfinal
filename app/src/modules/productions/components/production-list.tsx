import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { NO_OWNER_LABEL, NO_PERIOD_LABEL, INTERNAL_LABEL, STATE_LABELS } from "../labels";
import { periodLabel, stateTone } from "../helpers";
import type { ProductionCard, ProductionTab } from "../types";

import { ProductionTabs } from "./production-tabs";

interface ProductionListProps {
  productions: readonly ProductionCard[];
  tab: ProductionTab;
  internalOnly: boolean;
}

const EMPTY_TEXT: Readonly<Record<ProductionTab, string>> = {
  open: "Καμία ανοιχτή Παραγωγή.",
  delivered: "Καμία παραδομένη Παραγωγή.",
  all: "Καμία Παραγωγή σε αυτή τη λίστα.",
};

// G1: η λίστα των Παραγωγών με καρτέλες και φίλτρο Εσωτερικών. Η βάση φιλτράρει· εδώ μόνο εμφανίζεται.
export function ProductionList({ productions, tab, internalOnly }: ProductionListProps) {
  return (
    <div className="grid gap-4">
      <ProductionTabs tab={tab} internalOnly={internalOnly} />
      {productions.length === 0 ? (
        <Notice kind="empty" title="Καμία Παραγωγή εδώ">
          <p className="m-0">{EMPTY_TEXT[tab]}</p>
        </Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Παραγωγή</Th>
              <Th>Πελάτης</Th>
              <Th>Περίοδος</Th>
              <Th>Υπεύθυνος</Th>
              <Th>Κατάσταση</Th>
            </tr>
          </thead>
          <tbody>
            {productions.map((production) => (
              <ProductionRow key={production.id} production={production} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function ProductionRow({ production }: { production: ProductionCard }) {
  return (
    <Tr>
      <Td data-label="Παραγωγή">
        <Link href={`/app/productions/${production.id}`} className="font-medium">
          {production.title}
        </Link>
      </Td>
      <Td data-label="Πελάτης">
        {production.client?.name ?? INTERNAL_LABEL}
      </Td>
      <Td data-label="Περίοδος">
        {production.period ? periodLabel(production.period.starts) : NO_PERIOD_LABEL}
      </Td>
      <Td data-label="Υπεύθυνος">{production.owner?.name ?? NO_OWNER_LABEL}</Td>
      <Td data-label="Κατάσταση">
        <Badge tone={stateTone(production.state)}>{STATE_LABELS[production.state]}</Badge>
      </Td>
    </Tr>
  );
}
