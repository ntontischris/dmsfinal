"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Panel } from "@/components/ui/panel";
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

import {
  resetSystemMessage,
  saveSystemMessage,
} from "../actions-system-messages";
import {
  PREVIEW_NOTE,
  PREVIEW_TITLE,
  SAVE_AUTOMATION,
  SYSTEM_DELAY_NOTE,
  SYSTEM_RESET,
} from "../automation-labels";
import type { SystemMessage } from "../automation-view-schema";
import { ActionForm } from "./action-form";
import { VariableTextFields, type TextValues } from "./variable-text-fields";

// Ο editor ενός Μηνύματος συστήματος (K2, #173): θέμα και κείμενο el/en με τις μεταβλητές του, ζωντανή προεπισκόπηση
// με φανταστικές τιμές και «Επαναφορά» του αρχικού κειμένου. Κάθε πεδίο χωρίς κείμενο του admin (null) δείχνει το αρχικό.

const valuesOf = (
  message: SystemMessage,
  defaults: SystemDefault,
): TextValues => ({
  subjectEl: message.subjectEl ?? defaults.subject.el,
  subjectEn: message.subjectEn ?? defaults.subject.en,
  bodyEl: message.bodyEl ?? defaults.body.el,
  bodyEn: message.bodyEn ?? defaults.body.en,
});

// Κενό πεδίο = το αρχικό του κώδικα, όπως θα φύγει.
const orDefault = (value: string, fallback: string): string =>
  value.trim() ? value : fallback;

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
    <div className="grid content-start gap-2">
      <h3 className="kit-label m-0">{title}</h3>
      <p className="m-0 font-semibold">
        {fillTemplate(subject, PREVIEW_VALUES)}
      </p>
      {textParagraphs(fillTemplate(body, PREVIEW_VALUES)).map(
        (paragraph, index) => (
          <p key={index} className="m-0 text-sm">
            {paragraph}
          </p>
        ),
      )}
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
    <Panel label={PREVIEW_TITLE} aside={PREVIEW_NOTE}>
      <div className="grid gap-4 md:grid-cols-2">
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

function ResetButton({ code }: { code: string }) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(resetSystemMessage);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-2">
      <input type="hidden" name="code" value={code} />
      <div>
        <Button type="submit" variant="danger" disabled={isPending}>
          {SYSTEM_RESET}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

interface SystemMessageEditorProps {
  message: SystemMessage;
  defaults: SystemDefault;
}

export function SystemMessageEditor({
  message,
  defaults,
}: SystemMessageEditorProps) {
  const [values, setValues] = useState<TextValues>(() =>
    valuesOf(message, defaults),
  );
  return (
    <div className="grid gap-4">
      <ActionForm
        action={saveSystemMessage}
        submitLabel={SAVE_AUTOMATION}
        onlyWhenChanged
      >
        <input type="hidden" name="code" value={message.code} />
        <VariableTextFields
          idPrefix={message.code}
          hasSubject
          values={values}
          variables={message.variables}
          required={message.required}
          subjectExcluded={SUBJECT_FORBIDDEN}
          onChange={setValues}
        />
      </ActionForm>
      <p className="m-0 text-sm text-muted-foreground">{SYSTEM_DELAY_NOTE}</p>
      {message.isEdited && (
        <ResetButton key={message.updatedAt} code={message.code} />
      )}
      <Preview values={values} defaults={defaults} />
    </div>
  );
}
