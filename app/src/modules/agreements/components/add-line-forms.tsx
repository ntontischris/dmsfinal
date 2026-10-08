"use client";

import { useState } from "react";

import { Input, Select } from "@/components/ui/field";

import { addCatalogueLine, addFreeLine } from "../actions-draft";
import { formatMoney, provisionsText, sortOptions } from "../helpers";
import type { CatalogueOption, KindInfo } from "../types";

import { ActionForm } from "./action-form";
import { FieldWithHint, MutedNote } from "./terms-section-parts";

interface AddLineFormsProps {
  agreementId: string;
  options: readonly CatalogueOption[];
  kinds: readonly KindInfo[];
  canEditPrices: boolean; // η ελεύθερη γραμμή θέλει τιμή: μόνο όποιος «Βλέπει ποσά»
}

// Τι θα αντιγραφεί από τον Κατάλογο: η τιμή (αν τη δικαιούται ο θεατής) και οι Παροχές ανά μονάδα.
const optionSummary = (
  option: CatalogueOption,
  kinds: readonly KindInfo[],
): string => {
  const price = option.price === null ? null : formatMoney(option.price);
  const provisions = provisionsText(option.provisions, kinds);
  return [price, provisions === "—" ? null : provisions]
    .filter((part) => part !== null)
    .join(" · ");
};

function CatalogueLineForm({
  agreementId,
  options,
  kinds,
}: Omit<AddLineFormsProps, "canEditPrices">) {
  const [selectedId, setSelectedId] = useState("");
  const selected = options.find((option) => option.itemId === selectedId);
  return (
    <ActionForm action={addCatalogueLine} submitLabel="Προσθήκη">
      <input type="hidden" name="agreementId" value={agreementId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <FieldWithHint
          label="Προσθήκη από τον Κατάλογο"
          hint={selected ? optionSummary(selected, kinds) : undefined}
        >
          <Select
            name="itemId"
            required
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Διάλεξε Πακέτο ή Υπηρεσία…</option>
            {sortOptions(options).map((option) => (
              <option key={option.itemId} value={option.itemId}>
                {option.name}
              </option>
            ))}
          </Select>
        </FieldWithHint>
        <FieldWithHint label="Ποσότητα">
          <Input
            type="number"
            name="quantity"
            min={1}
            max={999}
            step={1}
            defaultValue={1}
          />
        </FieldWithHint>
      </div>
    </ActionForm>
  );
}

function FreeLineForm({ agreementId }: { agreementId: string }) {
  return (
    <ActionForm
      action={addFreeLine}
      submitLabel="Προσθήκη ελεύθερης γραμμής"
      resetOnSuccess
    >
      <input type="hidden" name="agreementId" value={agreementId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldWithHint label="Περιγραφή ελεύθερης γραμμής">
          <Input name="description" autoComplete="off" />
        </FieldWithHint>
        <FieldWithHint label="Περιγραφή ελεύθερης γραμμής (English)">
          <Input name="descriptionEn" autoComplete="off" />
        </FieldWithHint>
        <FieldWithHint label="Τιμή ελεύθερης γραμμής (€)">
          <Input name="price" inputMode="decimal" autoComplete="off" />
        </FieldWithHint>
      </div>
      <MutedNote>Η ελεύθερη γραμμή είναι πάντα Παρέκκλιση.</MutedNote>
    </ActionForm>
  );
}

// Νέες γραμμές: από τον Κατάλογο (αντιγράφει όνομα, τιμή, Παροχές, ώρες και κόστος) ή ελεύθερες.
export function AddLineForms({
  agreementId,
  options,
  kinds,
  canEditPrices,
}: AddLineFormsProps) {
  return (
    <div className="grid gap-4 border-t pt-4">
      <CatalogueLineForm
        agreementId={agreementId}
        options={options}
        kinds={kinds}
      />
      {canEditPrices && <FreeLineForm agreementId={agreementId} />}
    </div>
  );
}
