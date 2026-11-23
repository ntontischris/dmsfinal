"use client";

import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";

import { createItem } from "../actions-items";
import { NEW_ITEM_TYPE_LABELS } from "../labels";
import type { NewItemType, ProvisionKind } from "../types";

import { provisionsIntro } from "./c2-adapter";
import { C2Step } from "./c2-box";
import { C2Form, C2Submit, Field } from "./c2-form";
import { ProvisionsEditor, ProvisionsNote } from "./c2-provisions";

interface C2NewProps {
  kinds: readonly ProvisionKind[];
  canEditPrice: boolean;
  canManageSettings: boolean;
  initialType: NewItemType;
}

const TYPES: readonly NewItemType[] = [
  "package_monthly",
  "package_one_off",
  "service",
];

const PRICE_SUFFIX: Readonly<Record<NewItemType, string>> = {
  package_monthly: "€ / μήνα",
  package_one_off: "€ εφάπαξ",
  service: "€ ανά μονάδα",
};

const NO_PRICE_NOTE =
  "Δεν βλέπεις ποσά· την τιμή θα τη γράψει όποιος τα βλέπει. Μέχρι τότε ο Κατάλογος δεν είναι έτοιμος.";

const parseType = (value: string, fallback: NewItemType): NewItemType =>
  TYPES.find((type) => type === value) ?? fallback;

const asItem = (type: NewItemType) => ({
  kind: type === "service" ? ("service" as const) : ("package" as const),
  billing: type === "package_monthly" ? ("monthly" as const) : null,
});

function BasicsFields({
  type,
  onType,
}: {
  type: NewItemType;
  onType: (type: NewItemType) => void;
}) {
  return (
    <dl className="dl">
      <Field
        id="c2-name"
        label="Όνομα"
        editable
        value={null}
        input={<input id="c2-name" name="name" className="input" required />}
      />
      <Field
        id="c2-kind"
        label="Είδος"
        editable
        value={null}
        hint="Το είδος δεν αλλάζει αφού γραφτεί."
        input={
          <select
            id="c2-kind"
            name="type"
            className="select"
            value={type}
            onChange={(event) => onType(parseType(event.target.value, type))}
          >
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {NEW_ITEM_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        }
      />
      {type === "service" && (
        <Field
          id="c2-unit"
          label="Μονάδα"
          editable
          value={null}
          input={
            <input
              id="c2-unit"
              name="unit"
              className="input"
              placeholder="π.χ. ανά reel"
              required
            />
          }
        />
      )}
      <Field
        id="c2-description"
        label="Περιγραφή"
        editable
        value={null}
        hint="Εσωτερική. Ό,τι βλέπει ο πελάτης γράφεται στην ενότητα «Δημόσιο»."
        input={
          <textarea
            id="c2-description"
            name="description"
            className="input"
            rows={2}
          />
        }
      />
    </dl>
  );
}

function PriceFields({
  type,
  canEditPrice,
}: {
  type: NewItemType;
  canEditPrice: boolean;
}) {
  return (
    <>
      {canEditPrice ? (
        <dl className="dl">
          <Field
            id="c2-price"
            label="Τιμή χωρίς ΦΠΑ"
            editable
            value={null}
            input={
              <span className="btn-row">
                <input
                  id="c2-price"
                  name="price"
                  className="input"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="π.χ. 1300"
                  style={{ width: "8rem" }}
                />
                <span className="muted">{PRICE_SUFFIX[type]}</span>
              </span>
            }
          />
        </dl>
      ) : (
        <p className="muted">{NO_PRICE_NOTE}</p>
      )}
      <p className="muted">
        Η τιμή είναι η αρχή για κάθε πρόταση. Στη Συμφωνία αλλάζει ελεύθερα·
        τιμή κάτω από αυτήν είναι Παρέκκλιση.
      </p>
    </>
  );
}

// Πάνω στη σελίδα: ο τίτλος ακολουθεί το Είδος που διαλέγεις στο βήμα 1.
function NewHero({ type }: { type: NewItemType }) {
  const isService = type === "service";
  return (
    <header className="ml-hero c2-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {isService ? "ΝΥ" : "ΝΠ"}
      </span>
      <div>
        <span className="ml-tag">{NEW_ITEM_TYPE_LABELS[type]}</span>
        <h1>{isService ? "Νέα Υπηρεσία" : "Νέο Πακέτο"}</h1>
        <p className="c2-lead">
          Όνομα, τιμή και Παροχές· τα υπόλοιπα στη σελίδα του στοιχείου.
        </p>
      </div>
    </header>
  );
}

// Νέο Πακέτο ή Υπηρεσία: hero και βήματα Βασικά → Τιμή → Παροχές → Δημιουργία, όπως η Καταχώρηση Τιμολογίου.
// Μία φόρμα, η πραγματική ενέργεια createItem. Ώρες, κόστος και «Δημόσιο» ορίζονται μετά, στη σελίδα του στοιχείου.
export function C2New({
  kinds,
  canEditPrice,
  canManageSettings,
  initialType,
}: C2NewProps) {
  const [type, setType] = useState<NewItemType>(initialType);
  return (
    <div className="ml-stack">
      <NewHero type={type} />
      <C2Form action={createItem}>
        <div className="ml-stack">
          <C2Step no={1} title="Βασικά" hint="Όνομα, Είδος, Περιγραφή">
            <BasicsFields type={type} onType={setType} />
          </C2Step>
          <C2Step no={2} title="Τιμή" hint={PRICE_SUFFIX[type]}>
            <PriceFields type={type} canEditPrice={canEditPrice} />
          </C2Step>
          <C2Step no={3} title="Παροχές" hint="Τι περιλαμβάνει">
            <ProvisionsEditor
              kinds={kinds}
              initial={[]}
              isPerPeriod={type === "package_monthly"}
              intro={provisionsIntro(asItem(type))}
            >
              <ProvisionsNote canManageSettings={canManageSettings} />
            </ProvisionsEditor>
          </C2Step>
          <C2Step no={4} title="Δημιουργία">
            <div className="c2-go">
              <C2Submit
                label="Δημιουργία"
                pendingLabel="Δημιουργία…"
                cancelHref={hrefOf("C1")}
                aside="Μετά τη δημιουργία ορίζεις ώρες, κόστος και «Δημόσιο» στη σελίδα του στοιχείου."
              />
            </div>
          </C2Step>
        </div>
      </C2Form>
    </div>
  );
}
