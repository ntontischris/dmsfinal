"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { saveSheet } from "../actions-sheet";
import { addShot, moveShot, removeShot, renameShot } from "../sheet-model";
import type { SheetShot } from "../sheet-types";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";
import { SheetShotList } from "./sheet-shot-list";

interface SheetEditorProps {
  filmingId: string;
  shots: readonly SheetShot[];
  crewNote: string | null;
}

// Η επεξεργασία του Δελτίου (ομάδα με Δικαίωμα): λήψεις και σημείωση για το Συνεργείο, αποθήκευση με φόρμα.
// Η λίστα ζει στη μνήμη ως JSON σε κρυφό πεδίο· η βάση ξαναελέγχει ό,τι αποθηκεύεται.
export function SheetEditor({ filmingId, shots, crewNote }: SheetEditorProps) {
  const [items, setItems] = useState<SheetShot[]>([...shots]);
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    setItems((current) => addShot(current, draft, crypto.randomUUID()));
    setDraft("");
  };

  return (
    <ActionForm
      action={saveSheet}
      onlyWhenChanged
      submitLabel="Αποθήκευση Δελτίου"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="filmingId" value={filmingId} />
      <input type="hidden" name="shots" value={JSON.stringify(items)} />
      <SheetShotList
        items={items}
        onMove={(id, direction) => setItems((current) => moveShot(current, id, direction))}
        onRename={(id, text) => setItems((current) => renameShot(current, id, text))}
        onRemove={(id) => setItems((current) => removeShot(current, id))}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Νέα λήψη"
          placeholder="Νέα λήψη…"
          maxLength={300}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            handleAdd();
          }}
          className="min-w-48 flex-1"
        />
        <Button type="button" variant="default" size="sm" onClick={handleAdd} disabled={draft.trim() === ""}>
          Προσθήκη λήψης
        </Button>
      </div>
      <Field label="Σημείωση για το Συνεργείο">
        <TextArea name="crewNote" maxLength={2000} defaultValue={crewNote ?? ""} />
      </Field>
    </ActionForm>
  );
}
