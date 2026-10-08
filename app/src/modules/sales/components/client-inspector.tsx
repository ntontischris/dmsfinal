"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inspector } from "@/components/ui/inspector";

import { CLIENT_STATUS_LABEL, NO_MANAGER_LABEL } from "../labels";
import type { AssignableUser, ClientDetail } from "../types";

import { EditClientForm } from "./edit-client-form";
import { TransferClientForm } from "./transfer-client-form";

type OpenPanel = "edit" | "transfer" | null;

interface ClientInspectorProps {
  client: ClientDetail;
  canEdit: boolean;
  canTransfer: boolean;
  assignable: readonly AssignableUser[];
}

const dash = (value: string): string => (value === "" ? "—" : value);

function ContactLines({ client }: { client: ClientDetail }) {
  const lines = [
    client.contactName,
    client.contactEmail,
    client.contactPhone,
  ].filter((line) => line !== "");
  if (lines.length === 0) return <>—</>;
  return (
    <span className="grid gap-0.5">
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  );
}

// Η ταυτότητα του Πελάτη (B2) με τις δύο ενέργειες πάνω του. Οι φόρμες ανοίγουν μέσα στην πλαϊνή στήλη, μία κάθε φορά.
export function ClientInspector({
  client,
  canEdit,
  canTransfer,
  assignable,
}: ClientInspectorProps) {
  const [open, setOpen] = useState<OpenPanel>(null);
  const toggle = (panel: Exclude<OpenPanel, null>) =>
    setOpen((current) => (current === panel ? null : panel));
  const hasActions = canEdit || canTransfer;
  return (
    <Inspector
      code="B2"
      title={client.name}
      fields={[
        { label: "Κατάσταση", value: <Badge>{CLIENT_STATUS_LABEL}</Badge> },
        { label: "Επωνυμία", value: dash(client.legalName) },
        { label: "Πόλη", value: dash(client.city) },
        { label: "ΑΦΜ", value: client.afm ?? "—" },
        { label: "Κύριο πρόσωπο", value: <ContactLines client={client} /> },
        { label: "Υπεύθυνος", value: client.managerName ?? NO_MANAGER_LABEL },
      ]}
    >
      {hasActions ? (
        <>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button
                aria-expanded={open === "edit"}
                onClick={() => toggle("edit")}
              >
                Επεξεργασία
              </Button>
            )}
            {canTransfer && (
              <Button
                aria-expanded={open === "transfer"}
                onClick={() => toggle("transfer")}
              >
                Μεταβίβαση Πελάτη
              </Button>
            )}
          </div>
          {open === "edit" && canEdit && <EditClientForm client={client} />}
          {open === "transfer" && canTransfer && (
            <TransferClientForm
              clientId={client.id}
              currentManagerId={client.managerId}
              assignable={assignable}
            />
          )}
        </>
      ) : null}
    </Inspector>
  );
}
