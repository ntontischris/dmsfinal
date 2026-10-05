"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/screens/shared";

export interface QueueItem {
  id: string;
  href: string;
  title: string;
  clientName: string;
  source: string;
  received: string;
  isNewClient: boolean;
  isPossibleDuplicate: boolean;
}

interface QueueProps {
  items: readonly QueueItem[];
  members: readonly { id: string; name: string }[];
}

export function UnassignedQueue({ items, members }: QueueProps) {
  const [assigned, setAssigned] = useState<Readonly<Record<string, string>>>(
    {},
  );
  const [choice, setChoice] = useState<Readonly<Record<string, string>>>({});
  const pending = items.filter((item) => !(item.id in assigned));

  if (pending.length === 0) {
    return (
      <section className="card notice" role="status">
        <h2>Η ουρά είναι άδεια</h2>
        <p className="muted">Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο.</p>
      </section>
    );
  }

  return (
    <>
      <ul className="list">
        {pending.map((item) => (
          <li key={item.id} className="card">
            <div className="card-title">
              <h2>
                <Link href={item.href}>{item.title}</Link>
              </h2>
              <span className="btn-row">
                <Badge>Πηγή: {item.source}</Badge>
                {item.isNewClient && <Badge>Νέος Πελάτης</Badge>}
                {item.isPossibleDuplicate && (
                  <Badge tone="attention">Πιθανό διπλό</Badge>
                )}
              </span>
            </div>
            <p className="muted">
              {item.clientName} · έφτασε {item.received}
            </p>
            <div className="toolbar">
              <select
                className="select"
                aria-label="Υπεύθυνος"
                value={choice[item.id] ?? ""}
                onChange={(event) =>
                  setChoice({ ...choice, [item.id]: event.target.value })
                }
              >
                <option value="" disabled>
                  Διάλεξε Υπεύθυνο
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button"
                data-primary="true"
                disabled={!choice[item.id]}
                onClick={() =>
                  setAssigned({ ...assigned, [item.id]: choice[item.id] })
                }
              >
                Ανάθεση
              </button>
            </div>
          </li>
        ))}
      </ul>
      {Object.keys(assigned).length > 0 && (
        <p className="note">
          Ανατέθηκαν {Object.keys(assigned).length}: ο Υπεύθυνος ειδοποιείται
          και η Ευκαιρία φεύγει από την ουρά.
        </p>
      )}
    </>
  );
}
