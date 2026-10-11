"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Select } from "@/components/ui/field";

import { sendMessage } from "../actions";
import { BOOK_PATH, DELIVERABLES_PATH } from "../request-helpers";
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
import {
  CLIENT_HINT_CHANGE,
  CLIENT_HINT_CHANGE_LINK,
  CLIENT_HINT_FILMING,
  CLIENT_HINT_FILMING_LINK,
  CLIENT_REQUEST_CHECKBOX,
  CLIENT_REQUEST_KIND,
  REQUEST_KIND_LABELS,
} from "../request-labels";
import { REQUEST_KINDS, type RequestKind, type ThreadProduction } from "../view-schema";
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
  const [isRequest, setRequest] = useState(false);
  const [kind, setKind] = useState<RequestKind>("other");
  const handleSent = useCallback(() => {
    setRequest(false);
    setKind("other");
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
        <RequestPicker
          isRequest={isRequest}
          kind={kind}
          onToggle={setRequest}
          onKind={setKind}
        />
      </ActionForm>
    </section>
  );
}

interface RequestPickerProps {
  isRequest: boolean;
  kind: RequestKind;
  onToggle: (value: boolean) => void;
  onKind: (value: RequestKind) => void;
}

// «Ζητώ κάτι να γίνει (Αίτημα)»: με το κουτί τσεκαρισμένο, το είδος (νέο Παραδοτέο, Γύρισμα, άλλο) και οι δύο υποδείξεις (J3).
function RequestPicker({ isRequest, kind, onToggle, onKind }: RequestPickerProps) {
  return (
    <div className="grid max-w-md gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isRequest}
          onChange={(event) => onToggle(event.target.checked)}
        />
        {CLIENT_REQUEST_CHECKBOX}
      </label>
      {isRequest && (
        <>
          <label className="grid gap-1.5">
            <span className="kit-label">{CLIENT_REQUEST_KIND}</span>
            <Select
              name="requestKind"
              value={kind}
              onChange={(event) => onKind(event.target.value as RequestKind)}
            >
              {REQUEST_KINDS.map((item) => (
                <option key={item} value={item}>
                  {REQUEST_KIND_LABELS[item]}
                </option>
              ))}
            </Select>
          </label>
          {kind === "filming" && (
            <p className="m-0 text-sm text-muted-foreground">
              {CLIENT_HINT_FILMING} <Link href={BOOK_PATH}>{CLIENT_HINT_FILMING_LINK}</Link>
            </p>
          )}
          <p className="m-0 text-sm text-muted-foreground">
            {CLIENT_HINT_CHANGE} <Link href={DELIVERABLES_PATH}>{CLIENT_HINT_CHANGE_LINK}</Link>
          </p>
        </>
      )}
    </div>
  );
}
