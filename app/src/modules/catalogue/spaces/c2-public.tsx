"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import { setPublic } from "../actions-items";
import type { CatalogueItem } from "../types";

import { visitorLine } from "./c2-adapter";
import { C2Form, C2Submit, Dash, Field } from "./c2-form";

const INTRO =
  "Πώς φαίνεται το Πακέτο στην Ιστοσελίδα και στον Βοηθό. Οι τιμές έχουν μία πηγή: εδώ.";
const EL_HINT =
  "Ελληνικά υποχρεωτικά για δημόσιο Πακέτο, αγγλικά προαιρετικά· χωρίς αγγλικά δεν φαίνεται στο /en.";
const SECTORS_NOTE =
  "Ποιοι Τομείς το δείχνουν ορίζεται από τον Τομέα, στην Ιστοσελίδα.";

const yesNo = (value: boolean): string => (value ? "Ναι" : "Όχι");

interface PublicFieldsProps {
  item: CatalogueItem;
  editable: boolean;
  isPublic: boolean;
  showsPrice: boolean;
  onPublic?: (value: boolean) => void;
  onShowsPrice?: (value: boolean) => void;
}

function TextFields({
  item,
  editable,
}: {
  item: CatalogueItem;
  editable: boolean;
}) {
  return (
    <>
      <Field
        id="c2-name-en"
        label="Όνομα (EN)"
        editable={editable}
        value={item.nameEn || <Dash />}
        input={
          <input
            id="c2-name-en"
            name="nameEn"
            className="input"
            defaultValue={item.nameEn}
          />
        }
      />
      <Field
        id="c2-public-el"
        label="Σύντομη περιγραφή"
        editable={editable}
        value={item.descriptionPublic || <Dash />}
        hint={EL_HINT}
        input={
          <textarea
            id="c2-public-el"
            name="descriptionPublic"
            className="input"
            rows={2}
            defaultValue={item.descriptionPublic}
          />
        }
      />
      <Field
        id="c2-public-en"
        label="Σύντομη περιγραφή (EN)"
        editable={editable}
        value={item.descriptionPublicEn || <Dash />}
        input={
          <textarea
            id="c2-public-en"
            name="descriptionPublicEn"
            className="input"
            rows={2}
            defaultValue={item.descriptionPublicEn}
          />
        }
      />
    </>
  );
}

function PublicFields(props: PublicFieldsProps) {
  const { item, editable, isPublic, showsPrice, onPublic, onShowsPrice } =
    props;
  return (
    <dl className="dl">
      <Field
        id="c2-is-public"
        label="Δημόσιο"
        editable={editable}
        value={yesNo(item.isPublic)}
        hint={
          editable && item.isRetired
            ? "Ένα αρχειοθετημένο Πακέτο δεν είναι δημόσιο."
            : undefined
        }
        input={
          <label>
            <input
              id="c2-is-public"
              name="isPublic"
              type="checkbox"
              checked={isPublic}
              disabled={item.isRetired}
              onChange={(event) => onPublic?.(event.target.checked)}
            />{" "}
            Φαίνεται στην Ιστοσελίδα
          </label>
        }
      />
      <Field
        id="c2-shows-price"
        label="Ένδειξη τιμής"
        editable={editable}
        value={yesNo(item.showsPrice)}
        hint={visitorLine(item, { isPublic, showsPrice })}
        input={
          <label>
            <input
              id="c2-shows-price"
              name="showsPrice"
              type="checkbox"
              checked={showsPrice}
              onChange={(event) => onShowsPrice?.(event.target.checked)}
            />{" "}
            Δείχνει «από Χ € + ΦΠΑ»
          </label>
        }
      />
      <TextFields item={item} editable={editable} />
      <dt>Τομείς</dt>
      <dd>
        <span className="muted">{SECTORS_NOTE}</span>
      </dd>
    </dl>
  );
}

function EditablePublic({ item }: { item: CatalogueItem }) {
  const [isPublic, setIsPublic] = useState(item.isPublic && !item.isRetired);
  const [showsPrice, setShowsPrice] = useState(item.showsPrice);
  return (
    <C2Form action={setPublic} itemId={item.id}>
      <Panel label="Δημόσιο">
        <p className="muted">{INTRO}</p>
        <PublicFields
          item={item}
          editable
          isPublic={isPublic}
          showsPrice={showsPrice}
          onPublic={setIsPublic}
          onShowsPrice={setShowsPrice}
        />
        <C2Submit label="Αποθήκευση" onlyWhenChanged />
      </Panel>
    </C2Form>
  );
}

// «Δημόσιο» (μόνο Πακέτα): ό,τι φαίνεται στην Ιστοσελίδα και στον Βοηθό.
export function C2Public({
  item,
  canEdit,
}: {
  item: CatalogueItem;
  canEdit: boolean;
}) {
  if (item.kind !== "package") return null;
  if (!canEdit)
    return (
      <Panel label="Δημόσιο">
        <p className="muted">{INTRO}</p>
        <PublicFields
          item={item}
          editable={false}
          isPublic={item.isPublic}
          showsPrice={item.showsPrice}
        />
      </Panel>
    );
  // Το key αλλάζει μόνο με αρχειοθέτηση/επαναφορά: τα κουτάκια ξαναγεμίζουν από το item, χωρίς να χαθεί το «Αποθηκεύτηκε».
  return <EditablePublic key={`${item.id}:${item.isRetired}`} item={item} />;
}
