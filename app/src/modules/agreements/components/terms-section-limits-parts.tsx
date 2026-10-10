"use client";

import { useState } from "react";

import { Input } from "@/components/ui/field";

import { setRevisionLimits } from "../actions-draft";
import type { RevisionLimit } from "../types";

import { ActionForm } from "./action-form";
import { FieldWithHint, MutedNote } from "./terms-section-parts";

const roundsText = (rounds: number): string =>
  `${rounds} ${rounds === 1 ? "γύρος" : "γύροι"}`;

const baseHint = (limit: RevisionLimit): string | undefined =>
  limit.baseRounds === null
    ? undefined
    : `προεπιλογή: ${roundsText(limit.baseRounds)}`;

// Μια κενή τιμή δεν στέλνεται· ό,τι δεν διαβάζεται γίνεται 0 ώστε να το ρίξει ο έλεγχος με καθαρό μήνυμα.
const serialize = (values: Readonly<Record<string, string>>): string =>
  JSON.stringify(
    Object.entries(values)
      .filter(([, value]) => value.trim() !== "")
      .map(([kindId, value]) => ({ kindId, rounds: Number(value) || 0 })),
  );

function LimitsFields({ limits }: { limits: readonly RevisionLimit[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(limits.map((l) => [l.kindId, String(l.rounds)])),
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="limits" value={serialize(values)} />
      {limits.map((limit) => (
        <FieldWithHint
          key={limit.kindId}
          label={`Όριο αλλαγών: ${limit.label}`}
          hint={baseHint(limit)}
        >
          <Input
            type="number"
            min={1}
            max={20}
            step={1}
            inputMode="numeric"
            value={values[limit.kindId] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [limit.kindId]: event.target.value,
              }))
            }
          />
        </FieldWithHint>
      ))}
    </div>
  );
}

interface RevisionLimitsFormProps {
  agreementId: string;
  limits: readonly RevisionLimit[];
  canEdit: boolean;
}

// Όριο αλλαγών ανά είδος Παροχής: οι γύροι διορθώσεων που περιλαμβάνει η πρόταση (αντίγραφο των προεπιλογών της στιγμής της δημιουργίας).
export function RevisionLimitsForm({
  agreementId,
  limits,
  canEdit,
}: RevisionLimitsFormProps) {
  if (limits.length === 0) return null;
  if (!canEdit)
    return (
      <ul className="m-0 grid list-none gap-1 p-0 text-sm">
        {limits.map((limit) => (
          <li key={limit.kindId}>
            Όριο αλλαγών {limit.label}: {roundsText(limit.rounds)}
          </li>
        ))}
      </ul>
    );
  return (
    <ActionForm action={setRevisionLimits} onlyWhenChanged submitLabel="Αποθήκευση ορίων">
      <input type="hidden" name="agreementId" value={agreementId} />
      <LimitsFields limits={limits} />
      <MutedNote>
        Περισσότεροι γύροι από την προεπιλογή είναι Παρέκκλιση.
      </MutedNote>
    </ActionForm>
  );
}
