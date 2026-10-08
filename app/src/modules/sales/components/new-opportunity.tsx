"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { createOpportunity } from "../actions-opportunities";
import { athensToday, takenMessage } from "../helpers";
import type { ListItem, PickerClient } from "../types";

import { AccessRequestForm } from "./access-request-form";
import { ActionForm } from "./action-form";
import { NewClientFields } from "./new-client-fields";

const NEW_CLIENT = "__new__";
const DAY_MS = 86_400_000;

const addDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

interface NewOpportunityProps {
  clients: readonly PickerClient[];
  sources: readonly ListItem[];
  preselectedClientId?: string;
}

// Κλειστό πίσω από το κουμπί: η Ευκαιρία γεννιέται εδώ, είτε σε υπάρχοντα Πελάτη είτε μαζί με νέο (ADR 0009).
export function NewOpportunity(props: NewOpportunityProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <div>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Νέα Ευκαιρία
        </Button>
      </div>
    );
  return (
    <Panel
      label="Νέα Ευκαιρία"
      aside={
        <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
          Κλείσιμο
        </Button>
      }
    >
      <NewOpportunityBody {...props} />
    </Panel>
  );
}

function NewOpportunityBody({
  clients,
  sources,
  preselectedClientId,
}: NewOpportunityProps) {
  const [choice, setChoice] = useState(preselectedClientId ?? "");
  const picked = clients.find((client) => client.id === choice);
  const selection = choice === NEW_CLIENT || picked ? choice : "";
  const activeSources = sources.filter((source) => !source.isRetired);
  return (
    <div className="grid gap-4">
      <Field label="Πελάτης της Ευκαιρίας">
        <Select
          value={selection}
          onChange={(event) => setChoice(event.target.value)}
        >
          <option value="" disabled>
            Διάλεξε Πελάτη
          </option>
          <option value={NEW_CLIENT}>Νέος Πελάτης</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.isMine ? client.name : `${client.name} (κατειλημμένος)`}
            </option>
          ))}
        </Select>
      </Field>
      {picked && !picked.isMine ? (
        <div className="grid gap-3">
          <p role="alert" className="m-0 text-sm text-destructive">
            {takenMessage(picked.managerName)}
          </p>
          <AccessRequestForm
            clientId={picked.id}
            managerName={picked.managerName}
            sources={activeSources}
          />
        </div>
      ) : selection !== "" ? (
        <CreateForm
          clientId={picked?.id ?? ""}
          clientName={picked?.name ?? ""}
          sources={activeSources}
        />
      ) : null}
    </div>
  );
}

interface CreateFormProps {
  clientId: string; // "" = νέος Πελάτης
  clientName: string;
  sources: readonly ListItem[];
}

// Το όνομα ζει εδώ και όχι στη φόρμα: όταν η επιλογή φύγει από «Νέος Πελάτης» το component ξεμοντάρεται
// μαζί με το πεδίο και το όνομα μηδενίζεται, άρα η σημείωση δεν μένει ποτέ πίσω από το πεδίο.
function NewClientIntro() {
  const [newName, setNewName] = useState("");
  const name = newName.trim();
  return (
    <>
      <p role="status" className="m-0 text-sm text-muted-foreground">
        {`Νέος Πελάτης${name ? ` «${name}»` : ""}: γίνεσαι Υπεύθυνος του Πελάτη και της Ευκαιρίας.`}
      </p>
      <NewClientFields onNameChange={setNewName} />
    </>
  );
}

function CreateForm({ clientId, clientName, sources }: CreateFormProps) {
  const defaultDue = addDays(athensToday(), 3);
  return (
    <ActionForm
      action={createOpportunity}
      submitLabel="Δημιουργία Ευκαιρίας"
      pendingLabel="Δημιουργία…"
    >
      <input type="hidden" name="clientId" value={clientId} />
      {clientId === "" ? (
        <NewClientIntro />
      ) : (
        <p role="status" className="m-0 text-sm text-muted-foreground">
          {`Εντάξει: η Ευκαιρία ανοίγει στον Πελάτη σου «${clientName}».`}
        </p>
      )}
      <Field label="Τίτλος Ευκαιρίας">
        <Input name="title" autoComplete="off" />
      </Field>
      <Field label="Πηγή">
        <Select name="sourceId" defaultValue="">
          <option value="" disabled>
            Διάλεξε Πηγή
          </option>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ποιος τον σύστησε" hint="Μόνο για Σύσταση">
        <Input name="referredBy" autoComplete="off" />
      </Field>
      <Field label="Επόμενο βήμα">
        <Input name="nextStep" autoComplete="off" />
      </Field>
      <Field label="Ημερομηνία επόμενου βήματος">
        <Input name="nextStepDue" type="date" defaultValue={defaultDue} />
      </Field>
    </ActionForm>
  );
}
