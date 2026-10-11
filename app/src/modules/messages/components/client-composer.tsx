"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { Select } from "@/components/ui/field";

import { sendMessage } from "../actions";
import { useAttachmentUploads } from "../use-attachment-uploads";
import {
  CLIENT_COMPOSER_TAG,
  CLIENT_COMPOSER_TEXT,
  CLIENT_NO_TAG,
  COMPOSER_LABEL,
  COMPOSER_PLACEHOLDER,
  COMPOSER_SEND,
  COMPOSER_SENDING,
} from "../labels";
import type { ThreadProduction } from "../view-schema";
import { ActionForm } from "./action-form";
import { AttachmentPicker } from "./attachment-picker";

interface ClientComposerProps {
  clientId: string;
  productions: readonly ThreadProduction[];
}

// Ο συντάκτης του πελάτη: μόνο προς την ομάδα, με προαιρετική ετικέτα από τις Παραγωγές του. Χωρίς Εσωτερικά και αναφορές.
export function ClientComposer({ clientId, productions }: ClientComposerProps) {
  const router = useRouter();
  const uploads = useAttachmentUploads();
  const resetUploads = uploads.reset;
  const handleSent = useCallback(() => {
    resetUploads();
    router.refresh();
  }, [router, resetUploads]);
  return (
    <section
      aria-label={COMPOSER_LABEL}
      className="rounded-md border bg-card p-4"
    >
      <h2 className="mb-3 mt-0 text-base font-semibold">{COMPOSER_LABEL}</h2>
      <ActionForm
        action={sendMessage}
        submitLabel={COMPOSER_SEND}
        pendingLabel={COMPOSER_SENDING}
        resetOnSuccess
        isDisabled={uploads.isUploading}
        onSuccess={handleSent}
      >
        <input type="hidden" name="clientId" value={clientId} />
        <textarea
          name="body"
          aria-label={CLIENT_COMPOSER_TEXT}
          placeholder={COMPOSER_PLACEHOLDER}
          maxLength={4000}
          required={uploads.paths.length === 0}
          rows={4}
          className="w-full rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground hover:border-border-strong focus:border-primary focus:outline-none"
        />
        <AttachmentPicker
          uploads={uploads}
          clientId={clientId}
          productionId={null}
        />
        <label className="grid max-w-md gap-1.5">
          <span className="kit-label">{CLIENT_COMPOSER_TAG}</span>
          <Select name="productionId" defaultValue="">
            <option value="">{CLIENT_NO_TAG}</option>
            {productions.map((production) => (
              <option key={production.id} value={production.id}>
                {production.title}
              </option>
            ))}
          </Select>
        </label>
      </ActionForm>
    </section>
  );
}
