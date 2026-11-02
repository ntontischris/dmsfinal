import Link from "next/link";

import { ListRow, TimeLead } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { PENDING_STATUS, type A5Item as Item } from "./a5-model";

// Ένα στοιχείο του Ημερολογίου, από το prototype (`screens/a5-item.tsx`): κουτάκι στις μέρες, γραμμή στη λίστα.

interface A5ItemProps {
  item: Item;
  compact?: boolean;
}

const timeLabel = (item: Item): string | null => {
  if (item.kind === "closed" || item.kind === "day") return null;
  return item.from ? `${item.from}–${item.to ?? ""}` : "όλη μέρα";
};

function StatusBadge({ item }: { item: Item }) {
  if (item.kind === "day" && item.status) return <Badge>{item.status}</Badge>;
  if (item.kind !== "filming") return null;
  if (item.status === PENDING_STATUS)
    return <Badge tone="attention">Αναμένει έγκριση</Badge>;
  return null;
}

export function A5Item({ item, compact = false }: A5ItemProps) {
  const time = timeLabel(item);
  const content = (
    <>
      {time && <span className="a5-time">{time}</span>}
      <span className="a5-title">{item.title}</span>
      {!compact && item.detail && (
        <span className="a5-detail">{item.detail}</span>
      )}
      <StatusBadge item={item} />
    </>
  );
  const props = {
    className: "a5-item",
    "data-kind": item.kind,
    "data-status": item.status ?? undefined,
    "data-pending": item.status === PENDING_STATUS,
  };
  return item.href ? (
    <Link href={item.href} {...props}>
      {content}
    </Link>
  ) : (
    <div {...props}>{content}</div>
  );
}

const RANGE_TONE_FADED = new Set(["busy", "closed"]);

// Μία γραμμή της λίστας (screens2): ώρα μπροστά, τίτλος + λεπτομέρεια, κατάσταση δεξιά.
export function A5Row({ item }: { item: Item }) {
  const hasRange = item.kind !== "closed" && item.kind !== "day";
  const lead =
    hasRange && item.from ? (
      <TimeLead start={item.from} end={item.to ?? undefined} />
    ) : hasRange ? (
      <span className="part-sub">{timeLabel(item)}</span>
    ) : undefined;
  return (
    <ListRow
      lead={lead}
      title={item.title}
      href={item.href ?? undefined}
      sub={item.detail ?? undefined}
      aside={<StatusBadge item={item} />}
      isHighlighted={item.status === PENDING_STATUS}
      isFaded={RANGE_TONE_FADED.has(item.kind)}
    />
  );
}
