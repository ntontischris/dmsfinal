"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";

import { attachFile } from "../actions-upload";
import { fileHref } from "../helpers";
import { TEXT_STATUS_LABEL } from "../labels";
import { uploadToKnowledge } from "../upload-client";
import { acceptOf, formatSize } from "../upload-rules";
import type { EditableItem } from "../view-schema";

// Το Αρχείο ενός στοιχείου «Αρχείο» (L1): ανέβασμα κατευθείαν στο Storage (έως 25 MB), λήψη, και τι διαβάζει ο Βοηθός.

export function FilePanel({ item }: { item: EditableItem }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsBusy(true);
    setMessage({ text: "Το αρχείο ανεβαίνει…", isError: false });
    const uploaded = await uploadToKnowledge(item.id, "file", file);
    const attached = uploaded.ok
      ? await attachFile({
          itemId: item.id,
          path: uploaded.path,
          name: file.name,
        })
      : uploaded;
    setIsBusy(false);
    setMessage(
      attached.ok
        ? { text: "Το Αρχείο ανέβηκε.", isError: false }
        : { text: attached.error, isError: true },
    );
    if (attached.ok) router.refresh();
  };

  return (
    <div className="grid justify-items-start gap-3">
      {item.file ? (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Αρχείο</dt>
          <dd className="m-0 break-all">
            <a href={fileHref(item.id)}>{item.file.name}</a>
          </dd>
          <dt className="text-muted-foreground">Μέγεθος</dt>
          <dd className="m-0">{formatSize(item.file.size)}</dd>
        </dl>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">
          Δεν έχει ανέβει ακόμα Αρχείο.
        </p>
      )}
      {item.textStatus && (
        <p className="m-0 text-sm">{TEXT_STATUS_LABEL[item.textStatus]}</p>
      )}
      <Button disabled={isBusy} onClick={() => inputRef.current?.click()}>
        {item.file ? "Αντικατάσταση Αρχείου" : "Ανέβασμα Αρχείου"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={acceptOf("file")}
        aria-label="Επιλογή Αρχείου"
        className="sr-only"
        tabIndex={-1}
        onChange={handleChange}
      />
      <p className="m-0 text-xs text-muted-foreground">
        PDF, DOCX, PPTX ή εικόνα, έως 25 MB.
      </p>
      {message && (
        <p
          role={message.isError ? "alert" : "status"}
          className={
            message.isError ? "m-0 text-sm text-destructive" : "m-0 text-sm"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
