"use client";

import { useState } from "react";

import { updateOpportunity } from "../actions-opportunities";
import { SpacesActionForm } from "./spaces-form";

interface TitleEditorProps {
  opportunityId: string;
  title: string;
  stageId: string;
  nextStep: string;
  nextStepDue: string | null;
}

// Μετονομασία της Ευκαιρίας: η ίδια ενέργεια με το Επόμενο βήμα, που κρατά Στάδιο και Επόμενο βήμα όπως είναι.
export function TitleEditor({
  opportunityId,
  title,
  stageId,
  nextStep,
  nextStepDue,
}: TitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  if (!isEditing)
    return (
      <>
        {title}{" "}
        <button
          type="button"
          className="button"
          onClick={() => setIsEditing(true)}
        >
          Μετονομασία
        </button>
      </>
    );
  return (
    <SpacesActionForm
      action={updateOpportunity}
      submitLabel="Αποθήκευση"
      className="toolbar"
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="stageId" value={stageId} />
      <input type="hidden" name="nextStep" value={nextStep} />
      <input type="hidden" name="nextStepDue" value={nextStepDue ?? ""} />
      <input type="hidden" name="previousDue" value={nextStepDue ?? ""} />
      <input
        className="input grow"
        name="title"
        aria-label="Τίτλος Ευκαιρίας"
        defaultValue={title}
        autoComplete="off"
      />
    </SpacesActionForm>
  );
}
