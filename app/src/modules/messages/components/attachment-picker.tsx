"use client";

import { useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";

import { ATTACHMENT_ACCEPT, formatSize } from "../attachment-rules";
import {
  ATTACH_BUTTON,
  ATTACH_FAILED,
  ATTACH_HINT,
  ATTACH_INPUT_LABEL,
  ATTACH_LIST_LABEL,
  ATTACH_REMOVE,
  ATTACH_UPLOADING,
} from "../labels";
import type { AttachmentUploads, UploadItem } from "../use-attachment-uploads";

interface AttachmentPickerProps {
  uploads: AttachmentUploads;
  clientId: string;
  // Η ετικέτα Παραγωγής του Μηνύματος· μέλος με Εύρος «mine» ζητά θέσεις μόνο με ετικέτα.
  productionId: string | null;
}

const statusOf = (item: UploadItem): string | null => {
  if (item.status === "uploading") return ATTACH_UPLOADING;
  return item.status === "failed" ? ATTACH_FAILED : null;
};

// Επιλογή συνημμένων μέσα σε φόρμα Μηνύματος: κουμπί «Επισύναψη», λίστα με πρόοδο και «Αφαίρεση», και κρυφά πεδία
// `attachments` με τις διαδρομές όσων ανέβηκαν. Το ίδιο κομμάτι μπαίνει στον συντάκτη της ομάδας και του πελάτη.
export function AttachmentPicker({
  uploads,
  clientId,
  productionId,
}: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) void uploads.add(files, { clientId, productionId });
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          {ATTACH_BUTTON}
        </Button>
        <span className="text-sm text-muted-foreground">{ATTACH_HINT}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          aria-label={ATTACH_INPUT_LABEL}
          className="sr-only"
          tabIndex={-1}
          onChange={handleChange}
        />
      </div>
      {uploads.error && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {uploads.error}
        </p>
      )}
      {uploads.items.length > 0 && (
        <ul
          aria-label={ATTACH_LIST_LABEL}
          className="m-0 flex list-none flex-wrap gap-2 p-0"
        >
          {uploads.items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2 rounded-sm border px-2 py-1 text-sm"
            >
              <span className="break-all">{item.name}</span>
              <span className="text-muted-foreground">
                {formatSize(item.size)}
              </span>
              {statusOf(item) && (
                <span className="text-muted-foreground">{statusOf(item)}</span>
              )}
              {item.path !== null && (
                <input type="hidden" name="attachments" value={item.path} />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => uploads.remove(item.key)}
              >
                {ATTACH_REMOVE}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
