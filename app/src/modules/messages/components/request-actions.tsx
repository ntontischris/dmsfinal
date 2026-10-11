"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

import { assignRequest, completeRequest, rejectRequest } from "../actions-requests";
import { ACTION_CANCEL } from "../labels";
import {
  COMMENT_PLACEHOLDER,
  COMPLETE,
  COMPLETE_NOTE,
  COMPLETE_SUBMIT,
  CLOSE_FILMING,
  CREATE_DELIVERABLE,
  LINK_PLACEHOLDER,
  NO_ASSIGNEE,
  REASSIGN,
  REASSIGN_SAVE,
  REJECT,
  REJECT_SUBMIT,
  REPLY_NOTE,
  REPLY_PLACEHOLDER,
} from "../request-labels";
import type { MessageRequest } from "../view-schema";
import { ActionForm } from "./action-form";

type Mode = "deliverable" | "complete" | "reject" | "reassign" | null;

interface RequestActionsProps {
  messageId: string;
  clientId: string;
  request: MessageRequest;
  assignable: readonly { id: string; name: string }[];
  // Η φόρμα δημιουργίας Παραδοτέου (φτιάχνεται στον server, με τα υποψήφια της Παραγωγής) ή ένα κείμενο γιατί δεν υπάρχει.
  deliverableForm: ReactNode;
}

const TEXTAREA =
  "w-full rounded-sm border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none";

function CompleteForm({ messageId, onDone }: { messageId: string; onDone: () => void }) {
  return (
    <ActionForm action={completeRequest} submitLabel={COMPLETE_SUBMIT} onSuccess={onDone}>
      <input type="hidden" name="id" value={messageId} />
      <input
        name="link"
        type="url"
        aria-label={LINK_PLACEHOLDER}
        placeholder={LINK_PLACEHOLDER}
        maxLength={2000}
        autoComplete="off"
        className={TEXTAREA}
      />
      <textarea
        name="comment"
        aria-label={COMMENT_PLACEHOLDER}
        placeholder={COMMENT_PLACEHOLDER}
        maxLength={2000}
        rows={3}
        className={TEXTAREA}
      />
      <p className="m-0 text-sm text-muted-foreground">{COMPLETE_NOTE}</p>
    </ActionForm>
  );
}

function RejectForm({ messageId, onDone }: { messageId: string; onDone: () => void }) {
  return (
    <ActionForm action={rejectRequest} submitLabel={REJECT_SUBMIT} submitVariant="danger" onSuccess={onDone}>
      <input type="hidden" name="id" value={messageId} />
      <textarea
        name="reply"
        aria-label={REPLY_PLACEHOLDER}
        placeholder={REPLY_PLACEHOLDER}
        maxLength={2000}
        required
        rows={3}
        className={TEXTAREA}
      />
      <p className="m-0 text-sm text-muted-foreground">{REPLY_NOTE}</p>
    </ActionForm>
  );
}

function ReassignForm({
  messageId,
  current,
  assignable,
  onDone,
}: {
  messageId: string;
  current: string | null;
  assignable: readonly { id: string; name: string }[];
  onDone: () => void;
}) {
  return (
    <ActionForm action={assignRequest} submitLabel={REASSIGN_SAVE} onlyWhenChanged onSuccess={onDone}>
      <input type="hidden" name="id" value={messageId} />
      <Select name="userId" aria-label={REASSIGN} defaultValue={current ?? ""}>
        <option value="">{NO_ASSIGNEE}</option>
        {assignable.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </Select>
    </ActionForm>
  );
}

// Οι ενέργειες ενός ανοιχτού Αιτήματος: δημιουργία Παραδοτέου / κλείσιμο Γυρίσματος, ολοκλήρωση, απόρριψη, αλλαγή υπευθύνου.
export function RequestActions({ messageId, clientId, request, assignable, deliverableForm }: RequestActionsProps) {
  const [mode, setMode] = useState<Mode>(null);
  const close = useCallback(() => setMode(null), []);
  const toggle = (next: Exclude<Mode, null>) => setMode(mode === next ? null : next);
  const canHandle = request.canHandle === true;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canHandle && request.kind === "deliverable" && (
          <Button size="sm" variant="primary" onClick={() => toggle("deliverable")}>
            {CREATE_DELIVERABLE}
          </Button>
        )}
        {canHandle && request.kind === "filming" && (
          <Link
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "no-underline")}
            href={`/app/filming/new?fromRequest=${messageId}&client=${clientId}`}
          >
            {CLOSE_FILMING}
          </Link>
        )}
        {canHandle && (
          <>
            <Button size="sm" onClick={() => toggle("complete")}>
              {COMPLETE}
            </Button>
            <Button size="sm" variant="danger" onClick={() => toggle("reject")}>
              {REJECT}
            </Button>
          </>
        )}
        {request.canReassign === true && (
          <Button size="sm" onClick={() => toggle("reassign")}>
            {REASSIGN}
          </Button>
        )}
      </div>
      {mode === "deliverable" && deliverableForm}
      {mode === "complete" && <CompleteForm messageId={messageId} onDone={close} />}
      {mode === "reject" && <RejectForm messageId={messageId} onDone={close} />}
      {mode === "reassign" && (
        <ReassignForm
          messageId={messageId}
          current={request.assigneeId ?? null}
          assignable={assignable}
          onDone={close}
        />
      )}
      {mode !== null && (
        <div>
          <Button size="sm" variant="ghost" onClick={close}>
            {ACTION_CANCEL}
          </Button>
        </div>
      )}
    </div>
  );
}
