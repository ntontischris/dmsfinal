"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

import { followUpOpportunity } from "../actions-opportunities";
import type { ListItem } from "../types";

import { ActionForm } from "./action-form";

interface FollowUpFormProps {
  lostId: string;
  defaultTitle: string;
  defaultSourceId: string;
  defaultDue?: string; // YYYY-MM-DD· το δίνει η σελίδα (ώρα Αθήνας), ώστε server και browser να δείχνουν το ίδιο
  sources: readonly ListItem[];
}

function FollowUpFields({
  defaultTitle,
  defaultDue,
  sources,
  initialSource,
}: {
  defaultTitle: string;
  defaultDue?: string;
  sources: readonly ListItem[];
  initialSource: string;
}) {
  return (
    <>
      <Field label="Τίτλος νέας Ευκαιρίας">
        <Input name="title" required defaultValue={defaultTitle} />
      </Field>
      <Field label="Πηγή">
        <Select name="sourceId" required defaultValue={initialSource}>
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Επόμενο βήμα">
        <Input name="nextStep" required autoComplete="off" />
      </Field>
      <Field label="Ημερομηνία επόμενου βήματος">
        <Input
          name="nextStepDue"
          type="date"
          required
          defaultValue={defaultDue}
        />
      </Field>
    </>
  );
}

// Μια χαμένη Ευκαιρία δεν ξανανοίγει: ανοίγει νέα, με σύνδεσμο σε αυτήν. Η φόρμα κρύβεται μέχρι να τη ζητήσει ο Χρήστης.
export function FollowUpForm({
  lostId,
  defaultTitle,
  defaultSourceId,
  defaultDue,
  sources,
}: FollowUpFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeSources = sources.filter((source) => !source.isRetired);
  const initialSource = activeSources.some((s) => s.id === defaultSourceId)
    ? defaultSourceId
    : (activeSources[0]?.id ?? "");
  return (
    <div className="grid gap-3">
      <div>
        <Button
          variant="primary"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          Νέα Ευκαιρία από αυτήν
        </Button>
      </div>
      {isOpen && (
        <ActionForm
          action={followUpOpportunity}
          submitLabel="Άνοιγμα Ευκαιρίας"
          pendingLabel="Άνοιγμα…"
        >
          <input type="hidden" name="lostId" value={lostId} />
          <FollowUpFields
            defaultTitle={defaultTitle}
            defaultDue={defaultDue}
            sources={activeSources}
            initialSource={initialSource}
          />
        </ActionForm>
      )}
    </div>
  );
}
