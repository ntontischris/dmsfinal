"use client";

import { useRef, useState, type FocusEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { INSERT_VARIABLE, SUBJECT_NO_LINK } from "../automation-labels";

// Θέμα και κείμενο el/en με κουμπιά εισαγωγής μεταβλητών (K1, K2 #173). Το κουμπί γράφει «{μεταβλητή}» στη θέση του
// δρομέα του πεδίου που είχε τελευταίο την εστίαση (αρχικά το ελληνικό κείμενο). Όσο η εστίαση είναι σε θέμα, οι
// μεταβλητές συνδέσμου ή κωδικού (subjectExcluded) δεν προσφέρονται.

const TEXTAREA =
  "min-h-28 w-full min-w-0 rounded-sm border border-input bg-background px-3 py-1.5 text-sm leading-snug text-foreground hover:border-border-strong focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

export interface TextValues {
  subjectEl: string;
  subjectEn: string;
  bodyEl: string;
  bodyEn: string;
}

interface VariableTextFieldsProps {
  idPrefix: string;
  values: TextValues;
  variables: readonly string[];
  required?: readonly string[];
  subjectExcluded?: readonly string[];
  hasSubject: boolean;
  onChange?: (values: TextValues) => void;
}

type TextElement = HTMLInputElement | HTMLTextAreaElement;

function insertAt(element: TextElement, value: string) {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  element.setRangeText(value, start, end, "end");
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.focus();
}

export function VariableTextFields({
  idPrefix,
  values,
  variables,
  required = [],
  subjectExcluded = [],
  hasSubject,
  onChange,
}: VariableTextFieldsProps) {
  const lastRef = useRef<TextElement | null>(null);
  const bodyElRef = useRef<HTMLTextAreaElement | null>(null);
  const [isSubject, setIsSubject] = useState(false);
  const remember = (event: FocusEvent<TextElement>) => {
    lastRef.current = event.currentTarget;
    setIsSubject(event.currentTarget.name.startsWith("subject"));
  };
  const read =
    (name: keyof TextValues) => (event: { currentTarget: TextElement }) =>
      onChange?.({ ...values, [name]: event.currentTarget.value });
  return (
    <div className="grid gap-3">
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={INSERT_VARIABLE}
      >
        {variables.map((name) => (
          <Button
            key={name}
            size="sm"
            disabled={isSubject && subjectExcluded.includes(name)}
            onClick={() => {
              const target = lastRef.current ?? bodyElRef.current;
              if (target) insertAt(target, `{${name}}`);
            }}
          >
            {`{${name}}`}
            {required.includes(name) && " (απαραίτητη)"}
          </Button>
        ))}
      </div>
      {hasSubject && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Θέμα, ελληνικά">
              <Input
                name="subjectEl"
                defaultValue={values.subjectEl}
                onFocus={remember}
                onInput={read("subjectEl")}
              />
            </Field>
            <Field label="Θέμα, αγγλικά">
              <Input
                name="subjectEn"
                defaultValue={values.subjectEn}
                onFocus={remember}
                onInput={read("subjectEn")}
              />
            </Field>
          </div>
          {subjectExcluded.some((name) => variables.includes(name)) && (
            <p className="m-0 text-sm text-muted-foreground">
              {SUBJECT_NO_LINK}
            </p>
          )}
        </>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label
          className="grid content-start gap-1.5"
          htmlFor={`${idPrefix}-body-el`}
        >
          <span className="kit-label">Κείμενο, ελληνικά</span>
          <textarea
            id={`${idPrefix}-body-el`}
            ref={bodyElRef}
            name="bodyEl"
            className={TEXTAREA}
            defaultValue={values.bodyEl}
            onFocus={remember}
            onInput={read("bodyEl")}
          />
        </label>
        <label
          className="grid content-start gap-1.5"
          htmlFor={`${idPrefix}-body-en`}
        >
          <span className="kit-label">Κείμενο, αγγλικά</span>
          <textarea
            id={`${idPrefix}-body-en`}
            name="bodyEn"
            className={TEXTAREA}
            defaultValue={values.bodyEn}
            onFocus={remember}
            onInput={read("bodyEn")}
          />
        </label>
      </div>
    </div>
  );
}
