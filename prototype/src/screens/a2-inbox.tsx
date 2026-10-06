import Link from "next/link";

import type { InboxItem } from "@/data/notifications";
import type { RoleId } from "@/data/roles";
import { fmtWhen, unreadCount, type A2Show } from "@/screens/a2-model";
import { Badge, screenHref, type ScreenQuery } from "@/screens/shared";

export function BellPreview({ items }: { items: readonly InboxItem[] }) {
  return (
    <section className="card" aria-label="Το καμπανάκι στη μπάρα">
      <h2 className="card-title">Έτσι φαίνεται το καμπανάκι</h2>
      <div className="a2-bell">
        <span className="a2-bell-icon" aria-hidden="true">
          🔔 <Badge tone="attention">{unreadCount(items)}</Badge>
        </span>
        <ul className="list a2-bell-list">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              {!item.isRead && "● "}
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface FiltersProps {
  role: RoleId;
  show: A2Show;
  query: ScreenQuery;
}

export function InboxFilters({ role, show, query }: FiltersProps) {
  const href = (value: A2Show) =>
    screenHref(role, "A2", {
      show: value === "unread" ? undefined : value,
      state: query.state,
    });
  return (
    <div className="toolbar">
      <Link
        className="tab"
        href={href("unread")}
        aria-current={show === "unread" ? "page" : undefined}
      >
        Αδιάβαστες
      </Link>
      <Link
        className="tab"
        href={href("all")}
        aria-current={show === "all" ? "page" : undefined}
      >
        Όλες
      </Link>
      <button type="button" className="button">
        Όλες διαβασμένες
      </button>
    </div>
  );
}

export function InboxList({
  role,
  items,
}: {
  role: RoleId;
  items: readonly InboxItem[];
}) {
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item.id} className="a2-item" data-unread={!item.isRead}>
          <div className="a2-item-meta">
            <span>{fmtWhen(item.at)}</span>
            {!item.isRead && <Badge tone="strong">Νέα</Badge>}
          </div>
          <span className="a2-text">{item.text}</span>
          {item.link && (
            <Link href={screenHref(role, item.link.code, item.link.params)}>
              Άνοιγμα
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
