"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { retireBankAccount, setDefaultBankAccount } from "../actions";

// Ενέργειες σε έναν λογαριασμό τραπέζης (μόνο Ιδιοκτήτης): γίνεται προεπιλεγμένος, ή αποσύρεται.
export function BankAccountActions({ id }: { id: string }) {
  const [defaultState, makeDefault, isSettingDefault] = useActionState(
    setDefaultBankAccount,
    INITIAL_FORM_STATE,
  );
  const [retireState, retire, isRetiring] = useActionState(
    retireBankAccount,
    INITIAL_FORM_STATE,
  );
  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <form action={makeDefault}>
          <input type="hidden" name="id" value={id} />
          <Button size="sm" type="submit" disabled={isSettingDefault}>
            Προεπιλεγμένος
          </Button>
        </form>
        <form action={retire}>
          <input type="hidden" name="id" value={id} />
          <Button size="sm" variant="ghost" type="submit" disabled={isRetiring}>
            Απόσυρση
          </Button>
        </form>
      </div>
      <FormMessage state={defaultState.error ? defaultState : retireState} />
    </div>
  );
}
