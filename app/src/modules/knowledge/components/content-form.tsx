"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

import { saveItem } from "../actions-items";
import { articleImageSrc, imageMarkdown } from "../markdown-urls";
import { uploadToKnowledge } from "../upload-client";
import { acceptOf } from "../upload-rules";
import type { EditableItem } from "../view-schema";
import { ActionForm } from "./action-form";
import { MarkdownBody } from "./markdown";

// Τα πεδία ενός στοιχείου (L1): Ενότητα, τίτλος, Περίληψη και, για Άρθρο, κείμενο Markdown με προεπισκόπηση και ανέβασμα
// εικόνας που εισάγει Markdown link. Το κουμπί φαίνεται μόνο όταν κάτι άλλαξε (onlyWhenChanged).

const TEXTAREA =
  "w-full min-w-0 rounded-sm border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground hover:border-border-strong focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

interface ContentFormProps {
  item: EditableItem;
  sections: readonly { id: string; name: string }[];
}

// Ειδοποιεί τη φόρμα ότι το κείμενο άλλαξε χωρίς πληκτρολόγηση (εισαγωγή εικόνας), ώστε να φανεί η Αποθήκευση.
const notifyForm = (element: HTMLTextAreaElement | null) =>
  setTimeout(
    () => element?.form?.dispatchEvent(new Event("input", { bubbles: true })),
    50,
  );

interface BodyToolbarProps {
  isPreview: boolean;
  onTogglePreview: () => void;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
}

function BodyToolbar({ isPreview, onTogglePreview, onImage }: BodyToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="kit-label">Κείμενο (Markdown)</span>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          Εικόνα
        </Button>
        <Button size="sm" aria-pressed={isPreview} onClick={onTogglePreview}>
          {isPreview ? "Επεξεργασία" : "Προεπισκόπηση"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptOf("image")}
        aria-label="Ανέβασμα εικόνας"
        className="sr-only"
        tabIndex={-1}
        onChange={onImage}
      />
    </div>
  );
}

function BodyField({ item }: { item: EditableItem }) {
  const [body, setBody] = useState(item.body ?? "");
  const [isPreview, setIsPreview] = useState(false);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadState("Η εικόνα ανεβαίνει…");
    const outcome = await uploadToKnowledge(item.id, "image", file);
    if (!outcome.ok) return setUploadState(outcome.error);
    const at = textareaRef.current?.selectionStart ?? body.length;
    const markdown = imageMarkdown(
      file.name,
      articleImageSrc(item.id, outcome.path),
    );
    setBody(
      (current) => `${current.slice(0, at)}\n${markdown}\n${current.slice(at)}`,
    );
    setUploadState(null);
    notifyForm(textareaRef.current);
  };

  return (
    <div className="grid gap-2">
      <BodyToolbar
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview((value) => !value)}
        onImage={handleImage}
      />
      {uploadState && (
        <p className="m-0 text-sm text-muted-foreground">{uploadState}</p>
      )}
      <textarea
        ref={textareaRef}
        name="body"
        aria-label="Κείμενο"
        rows={14}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className={isPreview ? "sr-only" : TEXTAREA}
      />
      {isPreview && (
        <div className="rounded-md border bg-background px-4 py-2">
          <MarkdownBody source={body} />
        </div>
      )}
      <p className="m-0 text-xs text-muted-foreground">
        **έντονα**, - λίστα, [σύνδεσμος](https://…). Σύνδεσμοι μόνο https:// ή
        /app/….
      </p>
    </div>
  );
}

export function ContentForm({ item, sections }: ContentFormProps) {
  return (
    <ActionForm
      action={saveItem}
      submitLabel={
        item.status === "published"
          ? "Αποθήκευση (ισχύει αμέσως)"
          : "Αποθήκευση"
      }
      onlyWhenChanged
    >
      <input type="hidden" name="id" value={item.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ενότητα">
          <Select name="sectionId" defaultValue={item.sectionId}>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Τίτλος">
          <Input
            name="title"
            defaultValue={item.title}
            maxLength={160}
            required
          />
        </Field>
      </div>
      <label className="grid gap-1.5">
        <span className="kit-label">
          Περίληψη (1–2 γραμμές, απαραίτητη για δημοσίευση)
        </span>
        <textarea
          name="summary"
          rows={2}
          maxLength={400}
          defaultValue={item.summary}
          className={TEXTAREA}
        />
      </label>
      {item.kind === "article" ? (
        <BodyField item={item} />
      ) : (
        <input type="hidden" name="body" value="" />
      )}
    </ActionForm>
  );
}
