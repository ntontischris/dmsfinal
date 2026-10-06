import Link from "next/link";

import type { SystemMessage } from "@/data/notifications";
import type { RoleId } from "@/data/roles";
import { whenEdited } from "@/screens/k2-model";
import { Badge, screenHref } from "@/screens/shared";

import "./k2.css";

interface MessageListProps {
  role: RoleId;
  messages: readonly SystemMessage[];
}

export function MessageList({ role, messages }: MessageListProps) {
  return (
    <ul className="list k2-list">
      {messages.map((m) => (
        <li key={m.id} className="k2-item">
          <div className="row">
            <strong>{m.title}</strong>
            <span className="k2-meta">
              <Badge>πάντα ενεργό</Badge>
              {m.isEdited && <Badge tone="strong">αλλαγμένο κείμενο</Badge>}
            </span>
          </div>
          <p className="muted">{m.when}</p>
          {m.isEdited && (
            <p className="muted">Τελευταία αλλαγή: {whenEdited(m)}</p>
          )}
          <Link
            className="button"
            href={screenHref(role, "K2", { message: m.id })}
          >
            Επεξεργασία
          </Link>
        </li>
      ))}
    </ul>
  );
}
