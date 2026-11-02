"use client";

import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";

import { createItem } from "../actions-items";
import { NEW_ITEM_TYPE_LABELS } from "../labels";
import type { NewItemType, ProvisionKind } from "../types";

import { provisionsIntro } from "./c2-adapter";
import { C2Form, C2Submit, Field } from "./c2-form";
import { ProvisionsEditorPanel, ProvisionsNote } from "./c2-provisions";

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

function BasicsPanel({
  type,
  onType,
}: {
  type: NewItemType;
  onType: (type: NewItemType) => void;
}) {
  return (
    <Panel label="Βασικά">
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
    </Panel>
  );
}

function PricePanel({
  type,
  canEditPrice,
}: {
  type: NewItemType;
  canEditPrice: boolean;
}) {
  return (
    <Panel label="Τιμή">
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
    </Panel>
  );
}

// Νέο Πακέτο ή Υπηρεσία (prototype C2 με άδεια πεδία): μία φόρμα, η πραγματική ενέργεια createItem.
// Ώρες, κόστος και «Δημόσιο» ορίζονται στη σελίδα του στοιχείου, μετά τη δημιουργία.
export function C2New({
  kinds,
  canEditPrice,
  canManageSettings,
  initialType,
}: C2NewProps) {
  const [type, setType] = useState<NewItemType>(initialType);
  return (
    <C2Form action={createItem}>
      <div className="grid2">
        <BasicsPanel type={type} onType={setType} />
        <PricePanel type={type} canEditPrice={canEditPrice} />
      </div>
      <ProvisionsEditorPanel
        kinds={kinds}
        initial={[]}
        isPerPeriod={type === "package_monthly"}
        intro={provisionsIntro(asItem(type))}
      >
        <ProvisionsNote canManageSettings={canManageSettings} />
      </ProvisionsEditorPanel>
      <C2Submit
        label="Δημιουργία"
        pendingLabel="Δημιουργία…"
        cancelHref={hrefOf("C1")}
        aside="Μετά τη δημιουργία ορίζεις ώρες, κόστος και «Δημόσιο» στη σελίδα του στοιχείου."
      />
    </C2Form>
  );
}
