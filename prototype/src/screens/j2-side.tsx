import Link from "next/link";

import type { Message } from "@/data/messages";
import { daysOpen, teamName } from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { Badge, screenHref } from "@/screens/shared";

interface SideProps {
  role: RoleId;
  clientId: string;
  visible: readonly Message[];
}

const isOpen = (m: Message): boolean => m.request?.state === "ανοιχτό";

export function J2Side({ role, clientId, visible }: SideProps) {
  const requests = visible
    .filter((m) => m.request)
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)));
  return (
    <aside className="card j2-side">
      <h2 className="card-title">Αιτήματα αυτού του Πελάτη</h2>
      {requests.length === 0 && <p className="muted">Κανένα Αίτημα.</p>}
      <ul className="list">
        {requests.map((m) => (
          <li key={m.id} className="stack">
            <Link
              href={`${screenHref(role, "J2", { client: clientId, message: m.id })}#${m.id}`}
            >
              {m.request?.kind}: {m.text.slice(0, 50) || "—"}
            </Link>
            <span>
              <Badge tone={isOpen(m) ? "strong" : undefined}>
                {m.request?.state}
              </Badge>{" "}
              <span className="muted">
                {teamName(m.request?.assigneeId ?? null)}
                {m.request && isOpen(m) && ` · ${daysOpen(m.request)} μέρες`}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
