"use client";

import { useState } from "react";

import { signOutside } from "../actions-flow";
import type { AgreementDetail } from "../types";
import { signatoryNameOf, type UsedKind } from "./d2-model";
import { D2Form, IdField } from "./d2-ui";

export type { UsedKind } from "./d2-model";

// «Υπογράφηκε εκτός συστήματος» (prototype `screens/d2-outside.tsx`): αρχείο, ποιος υπέγραψε, ημερομηνία υπογραφής και
// Έναρξη, που μπορεί να είναι στο παρελθόν. Ίδια πεδία με τη σημερινή φόρμα· την απόφαση την παίρνει η βάση.

const FILE_HINT =
  "Όνομα αρχείου ή σύνδεσμος· η αποθήκευση αρχείων έρχεται με το module Αρχεία.";

const startsBeforeThisMonth = (start: string, today: string): boolean =>
  start !== "" && start < `${today.slice(0, 7)}-01`;

const usedField = (values: Readonly<Record<string, string>>): string =>
  JSON.stringify(
    Object.entries(values)
      .filter(([, value]) => value.trim() !== "")
      .map(([kindId, value]) => ({ kindId, used: Number(value) || 0 })),
  );

function UsedInputs({ kinds }: { kinds: readonly UsedKind[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <span className="stack">
      <span className="muted">
        Η έναρξη είναι παλιά: ανοίγει μόνο η τρέχουσα Περίοδος και γράφεις πόσες
        Παροχές έχουν ήδη χρησιμοποιηθεί.
      </span>
      <input type="hidden" name="used" value={usedField(values)} />
      {kinds.map((kind) => (
        <label key={kind.id} className="stack">
          <span className="muted">Έχουν ήδη καταναλωθεί · {kind.unit}</span>
          <input
            className="input"
            type="number"
            min={0}
            max={999}
            step={1}
            inputMode="numeric"
            value={values[kind.id] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [kind.id]: event.target.value,
              }))
            }
          />
        </label>
      ))}
      <label className="row">
        <input type="checkbox" name="invoiced" />
        <span>Ο τρέχων μήνας τιμολογήθηκε ήδη εκτός συστήματος</span>
      </label>
    </span>
  );
}

interface OutsideProps {
  agreement: AgreementDetail;
  kinds: readonly UsedKind[];
  today: string;
}

function Fields({ agreement, kinds, today }: OutsideProps) {
  const [start, setStart] = useState("");
  const showUsed =
    agreement.kind === "monthly" &&
    kinds.length > 0 &&
    startsBeforeThisMonth(start, today);
  return (
    <>
      <IdField id={agreement.id} />
      <p className="note">
        Η υπογραφή κλείνει την Ευκαιρία ως κερδισμένη και παγώνει την πρόταση.
      </p>
      <label className="stack">
        <span className="muted">Αρχείο υπογραφής</span>
        <input
          className="input"
          name="reference"
          placeholder="symfonia-ypogegrammeni.pdf"
          autoComplete="off"
        />
      </label>
      <span className="muted">{FILE_HINT}</span>
      <label className="stack">
        <span className="muted">Ποιος υπέγραψε</span>
        <input
          className="input"
          name="signedBy"
          defaultValue={signatoryNameOf(agreement)}
        />
      </label>
      <label className="stack">
        <span className="muted">Ημερομηνία υπογραφής</span>
        <input
          className="input"
          type="date"
          name="signedOn"
          defaultValue={today}
          max={today}
        />
      </label>
      <label className="stack">
        <span className="muted">Έναρξη</span>
        <input
          className="input"
          type="date"
          name="start"
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </label>
      {showUsed && <UsedInputs kinds={kinds} />}
    </>
  );
}

export function OutsideSignatureForm(props: OutsideProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <button
        type="button"
        className="button"
        aria-expanded={false}
        onClick={() => setIsOpen(true)}
      >
        Υπογράφηκε εκτός συστήματος
      </button>
    );
  return (
    <fieldset className="d2-form">
      <legend>Υπογράφηκε εκτός συστήματος</legend>
      <D2Form action={signOutside} hideSubmit>
        {(isPending) => (
          <>
            <Fields {...props} />
            <span className="btn-row">
              <button
                type="submit"
                className="button"
                data-primary="true"
                disabled={isPending}
              >
                Καταχώριση υπογραφής
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setIsOpen(false)}
              >
                Άκυρο
              </button>
            </span>
          </>
        )}
      </D2Form>
    </fieldset>
  );
}
