"use client";

import { useState, type ReactNode } from "react";

import {
  PREVIEW_VALUES,
  type SystemDefault,
} from "@/lib/email/system-defaults";
import {
  SUBJECT_FORBIDDEN,
  fillTemplate,
  textParagraphs,
} from "@/lib/email/system-texts";
import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";

import {
  resetSystemMessage,
  saveSystemMessage,
} from "../actions-system-messages";
import type { SystemMessage } from "../automation-view-schema";
import { KForm, KMessage } from "./k-form";
import { KTextFields } from "./k-text-fields";
import { orDefault, valuesOf, type TextValues } from "./k2-model";

// Τα πεδία, η «Επαναφορά» και η προεπισκόπηση του Μηνύματος συστήματος (prototype `k2-editor.tsx`) πάνω στις πραγματικές
// ενέργειες. Η «Δοκιμαστική αποστολή σε μένα» του prototype δεν έχει ενέργεια στην εφαρμογή και λείπει.

function PreviewSide({
  title,
  subject,
  body,
}: {
  title: string;
  subject: string;
  body: string;
}) {
  return (
    <div>
      <h3>{title}</h3>
      <p>
        <strong>{fillTemplate(subject, PREVIEW_VALUES)}</strong>
      </p>
      <pre className="k2-preview">
        {textParagraphs(fillTemplate(body, PREVIEW_VALUES)).join("\n\n")}
      </pre>
    </div>
  );
}

function Preview({
  values,
  defaults,
}: {
  values: TextValues;
  defaults: SystemDefault;
}) {
  return (
    <Panel label="Προεπισκόπηση" aside="με φανταστικές τιμές">
      <div className="compare">
        <PreviewSide
          title="Ελληνικά"
          subject={orDefault(values.subjectEl, defaults.subject.el)}
          body={orDefault(values.bodyEl, defaults.body.el)}
        />
        <PreviewSide
          title="English"
          subject={orDefault(values.subjectEn, defaults.subject.en)}
          body={orDefault(values.bodyEn, defaults.body.en)}
        />
      </div>
    </Panel>
  );
}

// Η «Επαναφορά» είναι δική της φόρμα· το κουμπί της κάθεται στη σειρά κουμπιών της φόρμας κειμένου (attribute form).
function ResetForm({ id, code }: { id: string; code: string }) {
  const { state, onSubmit, formRef } = useKeptForm(resetSystemMessage);
  return (
    <form id={id} ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="code" value={code} />
      <KMessage state={state} />
    </form>
  );
}

interface EditorProps {
  message: SystemMessage;
  defaults: SystemDefault;
  aside: ReactNode;
  // Τα στοιχεία του Μηνύματος (πότε φεύγει, μεταβλητές) πάνω από τα πεδία, από τον server.
  children: ReactNode;
}

// Ο editor ζει σε ένα client component ώστε η προεπισκόπηση (έξω από το Panel, όπως στο prototype) να ακολουθεί τα πεδία.
export function SystemMessageEditor({
  message,
  defaults,
  aside,
  children,
}: EditorProps) {
  const [values, setValues] = useState<TextValues>(() =>
    valuesOf(message, defaults),
  );
  const resetId = `k2-reset-${message.code}`;
  return (
    <>
      <Panel label={defaults.title} aside={aside}>
        {children}
        <KForm
        action={saveSystemMessage}
        submitLabel="Αποθήκευση"
        className="k2-form"
        onlyWhenChanged
        extraButtons={
          message.isEdited && (
            <button
              type="submit"
              form={resetId}
              className="button"
              data-danger="true"
            >
              Επαναφορά αρχικού κειμένου
            </button>
          )
        }
      >
        <input type="hidden" name="code" value={message.code} />
        <KTextFields
          idPrefix={message.code}
          layout="k2"
          hasSubject
          values={values}
          variables={message.variables}
          required={message.required}
          subjectExcluded={SUBJECT_FORBIDDEN}
          onChange={setValues}
        />
      </KForm>
        {message.isEdited && (
          <ResetForm key={message.updatedAt} id={resetId} code={message.code} />
        )}
        <p className="note">
          Τα email εισόδου (πρόσκληση, σύνδεσμος εισόδου, επαναφορά κωδικού)
          παίρνουν το νέο κείμενο σε έως 5′. Ένα κενό πεδίο κρατά το αρχικό
          κείμενο.
        </p>
      </Panel>
      <Preview values={values} defaults={defaults} />
    </>
  );
}
