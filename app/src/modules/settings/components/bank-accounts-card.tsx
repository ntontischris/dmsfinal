import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Rows } from "@/components/ui/rows";

import { addBankAccount } from "../actions";
import type { BankAccount } from "../queries";
import { formatIban } from "../validation";
import { BankAccountActions } from "./bank-account-actions";
import { CardForm } from "./card-form";

// Λογαριασμοί τραπέζης: τυπώνονται στις εντολές πληρωμής. Μόνο ο Ιδιοκτήτης προσθέτει, αλλάζει ή αποσύρει.
export function BankAccountsCard({
  accounts,
  isOwner,
}: {
  accounts: readonly BankAccount[];
  isOwner: boolean;
}) {
  const active = accounts.filter((account) => !account.retired_at);
  const retired = accounts.length - active.length;
  return (
    <Panel
      label="Λογαριασμοί τραπέζης"
      aside={<Badge tone="attention">Μόνο Ιδιοκτήτης</Badge>}
    >
      <div className="grid gap-4">
        {active.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">
            Κανένας λογαριασμός ακόμα. Χρειάζεται ένας προεπιλεγμένος πριν το
            άνοιγμα σε πελάτες.
          </p>
        ) : (
          <Rows
            isNumbered={false}
            items={active.map((account) => ({
              id: account.id,
              title: account.bank_name,
              meta: (
                <>
                  <span className="font-mono">{formatIban(account.iban)}</span>{" "}
                  · {account.holder}
                </>
              ),
              aside: account.is_default ? (
                <Badge tone="ok">προεπιλεγμένος</Badge>
              ) : isOwner ? (
                <BankAccountActions id={account.id} />
              ) : null,
            }))}
          />
        )}
        {retired > 0 && (
          <p className="m-0 text-sm text-muted-foreground">
            {retired === 1
              ? "1 αποσυρμένος λογαριασμός μένει"
              : `${retired} αποσυρμένοι λογαριασμοί μένουν`}{" "}
            στα παλιά στοιχεία.
          </p>
        )}
        {isOwner && (
          <div className="grid gap-3 border-t pt-4">
            <p className="kit-label m-0">Νέος λογαριασμός</p>
            <CardForm
              action={addBankAccount}
              submitLabel="Προσθήκη λογαριασμού" resetOnSuccess
            >
              <Field label="Τράπεζα">
                <Input name="bank_name" required />
              </Field>
              <Field label="Δικαιούχος">
                <Input name="holder" required />
              </Field>
              <Field label="IBAN" hint="Με ή χωρίς κενά. Ελέγχονται τα ψηφία.">
                <Input name="iban" required className="font-mono uppercase" />
              </Field>
            </CardForm>
          </div>
        )}
      </div>
    </Panel>
  );
}
