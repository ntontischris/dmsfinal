"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

import { signOutside } from "../actions-flow";

import { ScopedForm } from "./agreement-actions-parts";
import { FieldWithHint, MutedNote } from "./terms-section-parts";

export interface UsedKind {
  id: string;
  unit: string;
}

interface OutsideSignFormProps {
  agreementId: string;
  defaultSignedBy: string;
  today: string; // YYYY-MM-DD, ημέρα Αθήνας
  isMonthly: boolean;
  kinds: readonly UsedKind[]; // τα είδη Παροχής που υπάρχουν στις γραμμές
}

const FILE_HINT =
  "Όνομα αρχείου ή σύνδεσμος· η αποθήκευση αρχείων έρχεται με το module Αρχεία.";

// Αν η Έναρξη είναι πριν τον τρέχοντα μήνα, μέρος της δουλειάς έχει ήδη γίνει: η ομάδα γράφει τι έχει καταναλωθεί.
const startsBeforeThisMonth = (start: string, today: string): boolean =>
  start !== "" && start < `${today.slice(0, 7)}-01`;

const usedField = (values: Readonly<Record<string, string>>): string =>
  JSON.stringify(
    Object.entries(values)
      .filter(([, value]) => value.trim() !== "")
      .map(([kindId, value]) => ({ kindId, used: Number(value) || 0 })),
  );

interface UsedInputsProps {
  kinds: readonly UsedKind[];
  values: Readonly<Record<string, string>>;
  onChange: (kindId: string, value: string) => void;
}

function UsedInputs({ kinds, values, onChange }: UsedInputsProps) {
  return (
    <div className="grid gap-3">
      <input type="hidden" name="used" value={usedField(values)} />
      {kinds.map((kind) => (
        <FieldWithHint
          key={kind.id}
          label={`Έχουν ήδη καταναλωθεί · ${kind.unit}`}
        >
          <Input
            type="number"
            min={0}
            max={999}
            step={1}
            inputMode="numeric"
            value={values[kind.id] ?? ""}
            onChange={(event) => onChange(kind.id, event.target.value)}
          />
        </FieldWithHint>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="invoiced" className="accent-primary" />Ο
        τρέχων μήνας τιμολογήθηκε ήδη εκτός συστήματος
      </label>
    </div>
  );
}

function Fields(props: OutsideSignFormProps) {
  const [start, setStart] = useState("");
  const [used, setUsed] = useState<Record<string, string>>({});
  const handleUsed = (kindId: string, value: string) =>
    setUsed((current) => ({ ...current, [kindId]: value }));
  const showUsed =
    props.isMonthly &&
    props.kinds.length > 0 &&
    startsBeforeThisMonth(start, props.today);
  return (
    <>
      <input type="hidden" name="agreementId" value={props.agreementId} />
      <FieldWithHint label="Αρχείο υπογραφής" hint={FILE_HINT}>
        <Input name="reference" autoComplete="off" />
      </FieldWithHint>
      <FieldWithHint label="Ποιος υπέγραψε">
        <Input name="signedBy" defaultValue={props.defaultSignedBy} />
      </FieldWithHint>
      <FieldWithHint label="Ημερομηνία υπογραφής">
        <Input
          type="date"
          name="signedOn"
          defaultValue={props.today}
          max={props.today}
        />
      </FieldWithHint>
      <FieldWithHint label="Έναρξη">
        <Input
          type="date"
          name="start"
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </FieldWithHint>
      {showUsed && (
        <UsedInputs kinds={props.kinds} values={used} onChange={handleUsed} />
      )}
    </>
  );
}

// «Υπογράφηκε εκτός συστήματος»: μαζεμένη φόρμα. Μόνο όποιος «Παρεκκλίνει» τη βλέπει· τη μόνη απόφαση (άδεια, κατάσταση) την παίρνει η βάση.
export function OutsideSignForm(props: OutsideSignFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="grid gap-3">
      <div>
        <Button
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          Υπογράφηκε εκτός συστήματος
        </Button>
      </div>
      {isOpen && (
        <ScopedForm action={signOutside} submitLabel="Καταχώριση υπογραφής">
          <MutedNote>
            Η υπογραφή κλείνει την Ευκαιρία ως κερδισμένη και παγώνει την
            πρόταση.
          </MutedNote>
          <Fields {...props} />
        </ScopedForm>
      )}
    </div>
  );
}
