"use client";

import { useRef, useState, type FocusEvent } from "react";

import { SUBJECT_NO_LINK } from "../automation-labels";
import type { TextValues } from "./k2-model";

// Θέμα και κείμενο el/en των K1/K2 στο ύφος του prototype, με τα κουμπιά εισαγωγής μεταβλητής της εφαρμογής: το κουμπί
// γράφει «{μεταβλητή}» στη θέση του δρομέα του πεδίου που είχε τελευταίο την εστίαση (αρχικά το ελληνικό κείμενο).
// Όσο η εστίαση είναι σε θέμα, οι μεταβλητές συνδέσμου ή κωδικού δεν προσφέρονται.


type TextElement = HTMLInputElement | HTMLTextAreaElement;

interface KTextFieldsProps {
  idPrefix: string;
  layout: "k1" | "k2";
  values: TextValues;
  variables: readonly string[];
  required?: readonly string[];
  subjectExcluded?: readonly string[];
  hasSubject: boolean;
  onChange?: (values: TextValues) => void;
}

function insertAt(element: TextElement, value: string) {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  element.setRangeText(value, start, end, "end");
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.focus();
}

interface FieldDef {
  name: keyof TextValues;
  label: string;
  isArea: boolean;
}

const fieldsOf = (layout: "k1" | "k2"): readonly FieldDef[] =>
  layout === "k1"
    ? [
        { name: "subjectEl", label: "Θέμα (email), ελληνικά", isArea: false },
        { name: "subjectEn", label: "Θέμα (email), αγγλικά", isArea: false },
        { name: "bodyEl", label: "Κείμενο, ελληνικά", isArea: true },
        { name: "bodyEn", label: "Κείμενο, αγγλικά", isArea: true },
      ]
    : [
        { name: "subjectEl", label: "Θέμα (ελληνικά)", isArea: false },
        { name: "bodyEl", label: "Κείμενο (ελληνικά)", isArea: true },
        { name: "subjectEn", label: "Θέμα (English)", isArea: false },
        { name: "bodyEn", label: "Κείμενο (English)", isArea: true },
      ];

export function KTextFields({
  idPrefix,
  layout,
  values,
  variables,
  required = [],
  subjectExcluded = [],
  hasSubject,
  onChange,
}: KTextFieldsProps) {
  const lastRef = useRef<TextElement | null>(null);
  const bodyElRef = useRef<HTMLTextAreaElement | null>(null);
  const [isSubject, setIsSubject] = useState(false);
  const remember = (event: FocusEvent<TextElement>) => {
    lastRef.current = event.currentTarget;
    setIsSubject(event.currentTarget.name.startsWith("subject"));
  };
  const fields = fieldsOf(layout).filter(
    (field) => hasSubject || !field.name.startsWith("subject"),
  );
  const render = (field: FieldDef) => {
    const id = `${idPrefix}-${field.name}`;
    const common = {
      id,
      name: field.name,
      className: "input",
      defaultValue: values[field.name],
      onFocus: remember,
      onInput: (event: { currentTarget: TextElement }) =>
        onChange?.({ ...values, [field.name]: event.currentTarget.value }),
    };
    return (
      <>
        <label htmlFor={id}>{field.label}</label>
        {field.isArea ? (
          <textarea
            {...common}
            ref={field.name === "bodyEl" ? bodyElRef : undefined}
          />
        ) : (
          <input {...common} style={{ width: "100%" }} />
        )}
        {layout === "k2" &&
          field.name === "bodyEn" &&
          !values.bodyEn.trim() && (
            <span className="badge" data-tone="attention">
              χωρίς αγγλικό
            </span>
          )}
      </>
    );
  };
  const subjects = fields.filter((field) => !field.isArea);
  const bodies = fields.filter((field) => field.isArea);
  return (
    <>
      <div className="k1-vars" role="group" aria-label="Εισαγωγή μεταβλητής">
        {variables.map((name) => (
          <button
            key={name}
            type="button"
            className="button"
            disabled={isSubject && subjectExcluded.includes(name)}
            onClick={() => {
              const target = lastRef.current ?? bodyElRef.current;
              if (target) insertAt(target, `{${name}}`);
            }}
          >
            {`{${name}}`}
            {required.includes(name) && " (απαραίτητη)"}
          </button>
        ))}
      </div>
      {layout === "k2" ? (
        fields.map((field) => (
          <div key={field.name} className="k2-field">
            {render(field)}
          </div>
        ))
      ) : (
        <>
          {subjects.map((field) => (
            <div key={field.name}>{render(field)}</div>
          ))}
          <div className="compare">
            {bodies.map((field) => (
              <div key={field.name}>{render(field)}</div>
            ))}
          </div>
        </>
      )}
      {hasSubject &&
        subjectExcluded.some((name) => variables.includes(name)) && (
          <p className="note">{SUBJECT_NO_LINK}</p>
        )}
    </>
  );
}
