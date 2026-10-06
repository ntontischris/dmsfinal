import Link from "next/link";

import type { CalendarItem } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import { Badge, screenHref } from "@/screens/shared";

interface A5ItemProps {
  item: CalendarItem;
  role: RoleId;
  compact?: boolean;
}

const timeLabel = (item: CalendarItem): string | null => {
  if (item.kind === "closed" || item.kind === "day") return null;
  if (item.kind === "deadline") return "όλη μέρα";
  return item.from ? `${item.from}–${item.to ?? ""}` : "όλη μέρα";
};

function StatusBadge({ item }: { item: CalendarItem }) {
  if (item.kind === "day") return <Badge>{item.status}</Badge>;
  if (item.kind !== "filming") return null;
  if (item.status === "αναμένει έγκριση") {
    return <Badge tone="attention">Αναμένει έγκριση</Badge>;
  }
  if (item.status === "δεν έγινε") {
    return <Badge tone="attention">δεν έγινε</Badge>;
  }
  if (item.status === "έγινε") return <Badge>έγινε</Badge>;
  return null;
}

export function A5Item({ item, role, compact = false }: A5ItemProps) {
  const time = timeLabel(item);
  const href = item.link
    ? screenHref(role, item.link.code, item.link.params)
    : undefined;
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
    "data-status": item.status,
    "data-pending": item.status === "αναμένει έγκριση",
  };
  return href ? (
    <Link href={href} {...props}>
      {content}
    </Link>
  ) : (
    <div {...props}>{content}</div>
  );
}
