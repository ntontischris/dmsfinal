"use client";

import Link from "next/link";
import { useState } from "react";

import "../../finance/spaces/money-lines.css";
import "./j1.css";

export interface NewMessageOption {
  id: string;
  name: string;
  href: string;
}

// «Νέο Μήνυμα προς»: οι Πελάτες στους οποίους μπορεί να γράψει ο Χρήστης, με ένα κύριο κουμπί.
export function NewMessage({
  options,
}: {
  options: readonly NewMessageOption[];
}) {
  const [picked, setPicked] = useState(options[0]?.id ?? "");
  const target = options.find((o) => o.id === picked) ?? options[0];
  if (!target) return null;
  return (
    <div className="j1-new">
      <label htmlFor="j1-new-client">Νέο Μήνυμα προς</label>
      <select
        id="j1-new-client"
        className="input"
        value={target.id}
        onChange={(event) => setPicked(event.target.value)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <span className="ml-quick">
        <Link data-primary href={target.href}>
          Νέο Μήνυμα
        </Link>
      </span>
    </div>
  );
}
