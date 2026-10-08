"use client";

import { useState } from "react";

import { Input, Select } from "@/components/ui/field";

import { createItem } from "../actions-items";
import { NEW_ITEM_TYPE_LABELS } from "../labels";
import type { NewItemType, ProvisionKind } from "../types";

import { ActionForm } from "./action-form";
import {
  FormRow,
  MutedNote,
  Textarea,
  WithSuffix,
} from "./item-basics-form-parts";
import { ProvisionsEditor } from "./provisions-editor";

interface NewItemFormProps {
  kinds: readonly ProvisionKind[];
  canEditPrice: boolean;
  initialType: NewItemType;
}

const TYPES: readonly NewItemType[] = [
  "package_monthly",
  "package_one_off",
  "service",
];

const NO_PRICE_NOTE =
  "Δεν βλέπεις ποσά· την τιμή θα τη γράψει όποιος τα βλέπει. Μέχρι τότε ο Κατάλογος δεν είναι έτοιμος.";

const PRICE_SUFFIX: Readonly<Record<NewItemType, string>> = {
  package_monthly: "€ / μήνα",
  package_one_off: "€ εφάπαξ",
  service: "€ ανά μονάδα",
};

// Το είδος διαλέγεται από τη λίστα· ό,τι δεν αναγνωρίζεται μένει στο προηγούμενο.
const parseType = (value: string, fallback: NewItemType): NewItemType =>
  TYPES.find((type) => type === value) ?? fallback;

// Δημιουργία Πακέτου ή Υπηρεσίας. Ώρες, κόστος και «δημόσιο» ορίζονται στη σελίδα του στοιχείου, μετά τη δημιουργία.
export function NewItemForm({
  kinds,
  canEditPrice,
  initialType,
}: NewItemFormProps) {
  const [type, setType] = useState<NewItemType>(initialType);
  return (
    <ActionForm
      action={createItem}
      submitLabel="Δημιουργία"
      pendingLabel="Δημιουργία…"
    >
      <FormRow
        id="new-item-type"
        label="Είδος"
        hint="Το είδος δεν αλλάζει αφού γραφτεί."
      >
        <Select
          id="new-item-type"
          name="type"
          value={type}
          onChange={(event) => setType(parseType(event.target.value, type))}
        >
          {TYPES.map((option) => (
            <option key={option} value={option}>
              {NEW_ITEM_TYPE_LABELS[option]}
            </option>
          ))}
        </Select>
      </FormRow>
      <FormRow id="new-item-name" label="Όνομα">
        <Input id="new-item-name" name="name" required />
      </FormRow>
      {type === "service" && (
        <FormRow id="new-item-unit" label="Μονάδα" hint="π.χ. ανά reel">
          <Input id="new-item-unit" name="unit" required />
        </FormRow>
      )}
      <FormRow
        id="new-item-description"
        label="Περιγραφή"
        hint="Εσωτερική. Ό,τι βλέπει ο πελάτης γράφεται στην ενότητα «Δημόσιο»."
      >
        <Textarea id="new-item-description" name="description" rows={3} />
      </FormRow>
      {canEditPrice ? (
        <FormRow id="new-item-price" label="Τιμή χωρίς ΦΠΑ">
          <WithSuffix suffix={PRICE_SUFFIX[type]}>
            <Input
              id="new-item-price"
              name="price"
              inputMode="decimal"
              autoComplete="off"
              placeholder="π.χ. 1300"
            />
          </WithSuffix>
        </FormRow>
      ) : (
        <MutedNote>{NO_PRICE_NOTE}</MutedNote>
      )}
      <div className="grid gap-2">
        <span className="kit-label">Παροχές</span>
        <ProvisionsEditor
          kinds={kinds}
          initial={[]}
          isPerPeriod={type === "package_monthly"}
        />
      </div>
      <MutedNote>
        Μετά τη δημιουργία ορίζεις ώρες, κόστος και «δημόσιο» στη σελίδα του
        στοιχείου.
      </MutedNote>
    </ActionForm>
  );
}
