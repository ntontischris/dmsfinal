"use client";

import { useState } from "react";

import { Input } from "@/components/ui/field";

import { setPublic } from "../actions-items";
import { publicPriceText } from "../helpers";
import type { CatalogueItem } from "../types";

import { ActionForm } from "./action-form";
import {
  FormRow,
  MutedNote,
  ReadOnlyRow,
  Textarea,
} from "./item-basics-form-parts";

interface ItemPublicFormProps {
  item: CatalogueItem;
  canEdit: boolean;
}

const INTRO =
  "Πώς φαίνεται το Πακέτο στην Ιστοσελίδα και στον Βοηθό. Οι τιμές έχουν μία πηγή: εδώ.";
const EN_HINT =
  "Ελληνικά υποχρεωτικά για δημόσιο Πακέτο, αγγλικά προαιρετικά· χωρίς αγγλικά δεν φαίνεται στο /en.";
const SECTORS_NOTE =
  "Ποιοι Τομείς το δείχνουν ορίζεται από τον Τομέα, στην Ιστοσελίδα.";

const yesNo = (value: boolean): string => (value ? "Ναι" : "Όχι");

// Τι θα δει ο Επισκέπτης, από τις τρέχουσες επιλογές της φόρμας.
const visitorLine = (
  item: CatalogueItem,
  state: { isPublic: boolean; showsPrice: boolean },
): string => {
  if (!state.isPublic) return "Δεν φαίνεται στην Ιστοσελίδα.";
  if (!state.showsPrice) return "Ο Επισκέπτης βλέπει το Πακέτο χωρίς τιμή.";
  const price = publicPriceText(item);
  return price === null
    ? "Ο Επισκέπτης βλέπει το Πακέτο με ένδειξη τιμής."
    : `Ο Επισκέπτης βλέπει «${price}».`;
};

interface CheckboxProps {
  name: string;
  label: string; // το όνομα του πεδίου
  text: string; // το κείμενο δίπλα στο κουτάκι
  isChecked: boolean;
  isDisabled?: boolean;
  onChange: (isChecked: boolean) => void;
}

function Checkbox({
  name,
  label,
  text,
  isChecked,
  isDisabled,
  onChange,
}: CheckboxProps) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        aria-label={label}
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-primary"
      />
      <span>{text}</span>
    </label>
  );
}

function ReadOnlyPublic({ item }: { item: CatalogueItem }) {
  return (
    <div className="grid gap-3">
      <MutedNote>{INTRO}</MutedNote>
      <ReadOnlyRow label="Δημόσιο">{yesNo(item.isPublic)}</ReadOnlyRow>
      <ReadOnlyRow label="Ένδειξη τιμής">{yesNo(item.showsPrice)}</ReadOnlyRow>
      <ReadOnlyRow label="Όνομα (EN)">{item.nameEn || "—"}</ReadOnlyRow>
      <ReadOnlyRow label="Σύντομη περιγραφή">
        {item.descriptionPublic || "—"}
      </ReadOnlyRow>
      <ReadOnlyRow label="Σύντομη περιγραφή (EN)" hint={EN_HINT}>
        {item.descriptionPublicEn || "—"}
      </ReadOnlyRow>
      <MutedNote>{visitorLine(item, item)}</MutedNote>
      <MutedNote>{SECTORS_NOTE}</MutedNote>
    </div>
  );
}

function EditablePublic({ item }: { item: CatalogueItem }) {
  const [isPublic, setIsPublic] = useState(item.isPublic && !item.isRetired);
  const [showsPrice, setShowsPrice] = useState(item.showsPrice);
  return (
    <ActionForm action={setPublic} onlyWhenChanged submitLabel="Αποθήκευση">
      <input type="hidden" name="itemId" value={item.id} />
      <MutedNote>{INTRO}</MutedNote>
      <div className="grid gap-2">
        <Checkbox
          name="isPublic"
          label="Δημόσιο"
          text="Δημόσιο · φαίνεται στην Ιστοσελίδα"
          isChecked={isPublic}
          isDisabled={item.isRetired}
          onChange={setIsPublic}
        />
        {item.isRetired && (
          <MutedNote>Ένα αρχειοθετημένο Πακέτο δεν είναι δημόσιο.</MutedNote>
        )}
        <Checkbox
          name="showsPrice"
          label="Ένδειξη τιμής"
          text="Δείχνει «από Χ € + ΦΠΑ»"
          isChecked={showsPrice}
          onChange={setShowsPrice}
        />
        <MutedNote>{visitorLine(item, { isPublic, showsPrice })}</MutedNote>
      </div>
      <FormRow id="item-name-en" label="Όνομα (EN)">
        <Input id="item-name-en" name="nameEn" defaultValue={item.nameEn} />
      </FormRow>
      <FormRow id="item-description-public" label="Σύντομη περιγραφή">
        <Textarea
          id="item-description-public"
          name="descriptionPublic"
          defaultValue={item.descriptionPublic}
          rows={3}
        />
      </FormRow>
      <FormRow
        id="item-description-public-en"
        label="Σύντομη περιγραφή (EN)"
        hint={EN_HINT}
      >
        <Textarea
          id="item-description-public-en"
          name="descriptionPublicEn"
          defaultValue={item.descriptionPublicEn}
          rows={3}
        />
      </FormRow>
      <MutedNote>{SECTORS_NOTE}</MutedNote>
    </ActionForm>
  );
}

// «Δημόσιο» (μόνο Πακέτα): ό,τι φαίνεται στην Ιστοσελίδα και στον Βοηθό. Όποιος δεν Διαχειρίζεται Κατάλογο βλέπει τα ίδια ως κείμενο.
export function ItemPublicForm({ item, canEdit }: ItemPublicFormProps) {
  if (item.kind !== "package") return null;
  // Το key αλλάζει μόνο με την αρχειοθέτηση/επαναφορά: τότε τα κουτάκια ξαναγεμίζουν από το item και δεν ξαναστέλνεται παλιό «Δημόσιο» = true.
  // Δεν εξαρτάται από ό,τι αλλάζει η ίδια η φόρμα, αλλιώς θα ξαναστηνόταν μετά την αποθήκευση και θα χανόταν το «Αποθηκεύτηκε».
  const formKey = `${item.id}:${item.isRetired}`;
  return canEdit ? (
    <EditablePublic key={formKey} item={item} />
  ) : (
    <ReadOnlyPublic item={item} />
  );
}
