"use client";

import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

import { threadHref } from "../helpers";
import { NEW_MESSAGE_CTA, NEW_MESSAGE_LABEL } from "../labels";
import type { WritableClient } from "../view-schema";

// «Νέο Μήνυμα προς»: διαλέγεις Πελάτη από όσους μπορείς να γράψεις και ανοίγεις τη Συνομιλία του.
export function NewMessage({ clients }: { clients: readonly WritableClient[] }) {
  const [picked, setPicked] = useState(clients[0]?.id ?? "");
  const target = clients.find((client) => client.id === picked) ?? clients[0];
  if (!target) return null;
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 gap-1.5">
        <span className="kit-label">{NEW_MESSAGE_LABEL}</span>
        <Select value={target.id} onChange={(event) => setPicked(event.target.value)}>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </label>
      <Link className={buttonVariants({ variant: "primary" })} href={threadHref(target.id)}>
        {NEW_MESSAGE_CTA}
      </Link>
    </div>
  );
}
