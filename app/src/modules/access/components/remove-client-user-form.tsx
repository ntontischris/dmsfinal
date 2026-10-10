"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

import { removeClientUser } from "../client-user-actions";
import { INITIAL_FORM_STATE } from "../schemas";

// Αφαίρεση σε δύο βήματα: πρώτα ερώτηση, μετά η ενέργεια. Η συμμετοχή σβήνεται, ο λογαριασμός μένει.
export function RemoveClientUserForm({ clientId, userId, name }: { clientId: string; userId: string; name: string }) {
  const [state, action, isSaving] = useActionState(removeClientUser, INITIAL_FORM_STATE);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming)
    return (
      <div className="grid justify-items-end gap-2">
        <FormMessage state={state} />
        <Button size="sm" variant="danger" onClick={() => setIsConfirming(true)}>
          Αφαίρεση
        </Button>
      </div>
    );

  return (
    <form action={action} className="grid justify-items-end gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="userId" value={userId} />
      <p className="m-0 max-w-xs text-right text-sm">
        Ο/Η {name} χάνει την πρόσβαση σε αυτόν τον Πελάτη.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="danger" type="submit" disabled={isSaving}>
          {isSaving ? "Αφαίρεση…" : "Ναι, αφαίρεση"}
        </Button>
        <Button size="sm" onClick={() => setIsConfirming(false)}>
          Άκυρο
        </Button>
      </div>
    </form>
  );
}
