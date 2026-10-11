"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

import { deleteMessage, editMessage, setMessageTag } from "../actions";
import { markRequest } from "../actions-requests";
import {
  ACTION_CANCEL,
  ACTION_DELETE,
  ACTION_EDIT,
  ACTION_SAVE,
  ACTION_TAG,
  DELETE_WARNING,
  NO_TAG,
} from "../labels";
import { MARK_KIND_LABEL, MARK_REQUEST, MARK_SAVE, REQUEST_KIND_LABELS } from "../request-labels";
import { REQUEST_KINDS } from "../view-schema";
import type { ThreadMessage, ThreadProduction } from "../view-schema";
import { ActionForm } from "./action-form";

type Mode = "tag" | "edit" | "delete" | "request" | null;

interface MessageActionsProps {
  message: ThreadMessage;
  productions: readonly ThreadProduction[];
  canClearTag: boolean;
  canTag: boolean;
  // Μήνυμα πελάτη που δεν είναι ακόμα Αίτημα: η ομάδα μπορεί να το σημειώσει (Μ9).
  canMark: boolean;
}

// Οι ενέργειες ενός Μηνύματος: Αλλαγή ετικέτας (ομάδα), Διόρθωση και Διαγραφή (ο αποστολέας). Η βάση ξαναελέγχει.
export function MessageActions({
  message,
  productions,
  canClearTag,
  canTag,
  canMark,
}: MessageActionsProps) {
  const [mode, setMode] = useState<Mode>(null);
  const close = useCallback(() => setMode(null), []);
  const toggle = (next: Exclude<Mode, null>) =>
    setMode(mode === next ? null : next);
  const showTag = canTag && (canClearTag || productions.length > 0);
  if (message.deleted || (!showTag && !canMark && !message.canEdit && !message.canDelete))
    return null;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canMark && (
          <Button size="sm" onClick={() => toggle("request")}>
            {MARK_REQUEST}
          </Button>
        )}
        {showTag && (
          <Button size="sm" onClick={() => toggle("tag")}>
            {ACTION_TAG}
          </Button>
        )}
        {message.canEdit && (
          <Button size="sm" onClick={() => toggle("edit")}>
            {ACTION_EDIT}
          </Button>
        )}
        {message.canDelete && (
          <Button size="sm" variant="danger" onClick={() => toggle("delete")}>
            {ACTION_DELETE}
          </Button>
        )}
      </div>
      {mode === "request" && (
        <ActionForm action={markRequest} submitLabel={MARK_SAVE} onSuccess={close}>
          <input type="hidden" name="id" value={message.id} />
          <Select name="kind" aria-label={MARK_KIND_LABEL} defaultValue="">
            <option value="" disabled>
              {MARK_KIND_LABEL}…
            </option>
            {REQUEST_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {REQUEST_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        </ActionForm>
      )}
      {mode === "tag" && (
        <ActionForm
          action={setMessageTag}
          submitLabel={ACTION_SAVE}
          onlyWhenChanged
          onSuccess={close}
        >
          <input type="hidden" name="id" value={message.id} />
          <Select
            name="productionId"
            aria-label={ACTION_TAG}
            defaultValue={message.productionId ?? ""}
          >
            {canClearTag && <option value="">{NO_TAG}</option>}
            {productions.map((production) => (
              <option key={production.id} value={production.id}>
                {production.title}
              </option>
            ))}
          </Select>
        </ActionForm>
      )}
      {mode === "edit" && (
        <ActionForm
          action={editMessage}
          submitLabel={ACTION_SAVE}
          onlyWhenChanged
          onSuccess={close}
        >
          <input type="hidden" name="id" value={message.id} />
          <textarea
            name="body"
            aria-label={ACTION_EDIT}
            defaultValue={message.body ?? ""}
            maxLength={4000}
            required
            rows={3}
            className="w-full rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div>
            <Button size="sm" variant="ghost" onClick={close}>
              {ACTION_CANCEL}
            </Button>
          </div>
        </ActionForm>
      )}
      {mode === "delete" && (
        <ActionForm
          action={deleteMessage}
          submitLabel={ACTION_DELETE}
          submitVariant="danger"
          onSuccess={close}
        >
          <input type="hidden" name="id" value={message.id} />
          <p className="m-0 text-sm text-muted-foreground">{DELETE_WARNING}</p>
        </ActionForm>
      )}
    </div>
  );
}
