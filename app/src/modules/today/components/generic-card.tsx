import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import type { CardViewProps } from "../cards/types";
import { formatAt, formatCents } from "../helpers";
import { EMPTY_TEXT, OPEN_LABEL, URGENT_LABEL } from "../labels";
import type { CardItem } from "../view-schema";

function CountBadge({ count, hasUrgent }: { count: number; hasUrgent: boolean }) {
  return (
    <span aria-label={`${count} σε αναμονή`}>
      <Badge tone={hasUrgent ? "attention" : undefined}>{count}</Badge>
    </span>
  );
}

function ItemRow({ item }: { item: CardItem }) {
  const meta = [item.subtitle, item.at ? formatAt(item.at) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="grid gap-0.5 border-b py-2 last:border-b-0">
      <span className="flex flex-wrap items-center gap-2">
        <Link href={item.link}>{item.title}</Link>
        {item.urgent && <Badge tone="attention">{URGENT_LABEL}</Badge>}
        {item.amountCents !== null && (
          <span className="ml-auto tabular-nums">{formatCents(item.amountCents)}</span>
        )}
      </span>
      {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
    </li>
  );
}

// Η γενική κάρτα: τίτλος, πλήθος, τα 3 πιο επείγοντα και «Άνοιγμα →» προς την ουρά.
export function GenericCard({ card, data }: CardViewProps) {
  const hasUrgent = data.items.some((item) => item.urgent);
  const isHealthy = card.kind === "health" && data.count === 0;
  return (
    <Panel
      label={card.label}
      aside={
        isHealthy ? (
          <Badge tone="ok">σε λειτουργία</Badge>
        ) : (
          <CountBadge count={data.count} hasUrgent={hasUrgent} />
        )
      }
    >
      {data.items.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{EMPTY_TEXT[card.kind]}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {data.items.slice(0, 3).map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <p className="m-0 mt-3 text-sm">
        <Link href={card.link}>{OPEN_LABEL}</Link>
      </p>
    </Panel>
  );
}
