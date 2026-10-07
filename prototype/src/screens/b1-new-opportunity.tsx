"use client";

import { useState } from "react";

import { takenMessage } from "@/data/access-requests";
import { AccessRequest } from "@/screens/access-request";

export interface PickerClient {
  id: string;
  name: string;
  isMine: boolean;
  ownerName: string | null;
}

const NEW_CLIENT = "__new__";

function Outcome({
  choice,
  newName,
  client,
}: {
  choice: string;
  newName: string;
  client: PickerClient | undefined;
}) {
  if (choice === NEW_CLIENT) {
    return newName.trim() === "" ? null : (
      <p className="note" role="status">
        Νέος Πελάτης «{newName.trim()}»: γίνεσαι Υπεύθυνος του Πελάτη και της
        Ευκαιρίας.
      </p>
    );
  }
  if (!client) return null;
  if (client.isMine) {
    return (
      <p className="note" role="status">
        Εντάξει: η Ευκαιρία ανοίγει στον Πελάτη σου «{client.name}».
      </p>
    );
  }
  return (
    <div className="note" role="alert">
      <p>{takenMessage(client.ownerName)}</p>
      <AccessRequest key={client.id} ownerName={client.ownerName} />
    </div>
  );
}

// «Νέα Ευκαιρία» για Πωλήσεις: νέος Πελάτης, δικός της, ή κατειλημμένος (μπλοκάρεται).
export function NewOpportunity({
  clients,
}: {
  clients: readonly PickerClient[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [newName, setNewName] = useState("");

  return (
    <>
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() => setIsOpen(!isOpen)}
      >
        Νέα Ευκαιρία
      </button>
      {isOpen && (
        <section className="card" style={{ flexBasis: "100%" }}>
          <h2>Νέα Ευκαιρία: διάλεξε Πελάτη</h2>
          <div className="toolbar">
            <select
              className="select"
              aria-label="Πελάτης της Ευκαιρίας"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
            >
              <option value="" disabled>
                Διάλεξε Πελάτη
              </option>
              <option value={NEW_CLIENT}>Νέος Πελάτης</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.isMine ? "" : " (κατειλημμένος)"}
                </option>
              ))}
            </select>
            {choice === NEW_CLIENT && (
              <input
                className="input grow"
                placeholder="Όνομα νέου Πελάτη"
                aria-label="Όνομα νέου Πελάτη"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            )}
          </div>
          <Outcome
            choice={choice}
            newName={newName}
            client={clients.find((client) => client.id === choice)}
          />
        </section>
      )}
    </>
  );
}
