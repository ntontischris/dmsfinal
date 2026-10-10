"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

import { cancelInvitation, resendInvitation } from "../invitation-actions";
import { INITIAL_FORM_STATE } from "../schemas";

// Επαναποστολή (και για λήξη) και ακύρωση μιας εκκρεμούς πρόσκλησης.
export function InvitationActions({ id, canCancel }: { id: string; canCancel: boolean }) {
  const [resend, resendAction, isResending] = useActionState(resendInvitation, INITIAL_FORM_STATE);
  const [cancel, cancelAction, isCancelling] = useActionState(cancelInvitation, INITIAL_FORM_STATE);
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <form action={resendAction}>
          <input type="hidden" name="id" value={id} />
          <Button size="sm" type="submit" disabled={isResending}>
            Επαναποστολή
          </Button>
        </form>
        {canCancel && (
          <form action={cancelAction}>
            <input type="hidden" name="id" value={id} />
            <Button size="sm" variant="danger" type="submit" disabled={isCancelling}>
              Ακύρωση
            </Button>
          </form>
        )}
      </div>
      <FormMessage state={resend.error || resend.notice ? resend : cancel} />
    </div>
  );
}
