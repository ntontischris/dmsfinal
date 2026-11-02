import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { saveAssistantCap } from "../actions-assistant";
import {
  addBankAccount,
  retireBankAccount,
  saveAssistantLimits,
  setDefaultBankAccount,
} from "../actions";
import type { CompanySettings } from "../queries";
import type { O1Banks } from "./o1-adapter";
import { ActionButton, SaveRow, SettingsForm } from "./o-form";
import { LockedField, Pending, SettingsCard, TextField } from "./o-shared";

// O1 κάρτες Λογαριασμοί τραπέζης και Βοηθός (prototype `screens/o1-money.tsx` + `o1-assistant.tsx`), με τα πραγματικά actions.

const O1_HREF = "/app/settings/company";

// «+ Λογαριασμός» ανοίγει τη φόρμα με ?bank=new (όπως οι σύνδεσμοι του prototype)· η προσθήκη είναι το πραγματικό action.
function NewAccount({ isAdding }: { isAdding: boolean }) {
  if (!isAdding)
    return (
      <div className="btn-row">
        <Link className="button" href={`${O1_HREF}?bank=new`}>
          + Λογαριασμός
        </Link>
      </div>
    );
  return (
    <SettingsForm action={addBankAccount} resetOnSuccess>
      <div className="o-fields">
        <TextField id="o1-bank-name" name="bank_name" label="Τράπεζα" />
        <TextField id="o1-bank-holder" name="holder" label="Δικαιούχος" />
        <TextField
          id="o1-bank-iban"
          name="iban"
          label="IBAN"
          hint="Με ή χωρίς κενά. Ελέγχονται τα ψηφία."
        />
      </div>
      <SaveRow card="bank" label="Προσθήκη λογαριασμού" isAlwaysEnabled />
      <div className="btn-row">
        <Link className="button" href={O1_HREF}>
          Άκυρο
        </Link>
      </div>
    </SettingsForm>
  );
}

// Λογαριασμοί τραπέζης: ένας προεπιλεγμένος. Μόνο ο Ιδιοκτήτης προσθέτει, ορίζει προεπιλογή ή αποσύρει.
export function BankCard({
  banks,
  isOwner,
  isAdding,
}: {
  banks: O1Banks;
  isOwner: boolean;
  isAdding: boolean;
}) {
  return (
    <SettingsCard title="Λογαριασμοί τραπέζης">
      {banks.rows.length === 0 ? (
        <p>
          Κανένας λογαριασμός ακόμα <Pending />
        </p>
      ) : (
        <RowList>
          {banks.rows.map((a) => (
            <ListRow
              key={a.id}
              lead={
                <span className="part-tile" aria-hidden="true">
                  {initialsOf(a.bank)}
                </span>
              }
              title={a.bank}
              sub={`${a.iban} · ${a.holder}`}
              aside={
                a.isDefault ? (
                  <Badge tone="strong">προεπιλεγμένος</Badge>
                ) : (
                  isOwner && (
                    <>
                      <ActionButton
                        action={setDefaultBankAccount}
                        fields={{ id: a.id }}
                        label="Ορισμός προεπιλογής"
                      />
                      <ActionButton
                        action={retireBankAccount}
                        fields={{ id: a.id }}
                        label="Απόσυρση"
                      />
                    </>
                  )
                )
              }
            />
          ))}
        </RowList>
      )}
      {banks.retired > 0 && (
        <p className="muted o-hint">
          {banks.retired === 1
            ? "1 αποσυρμένος λογαριασμός μένει"
            : `${banks.retired} αποσυρμένοι λογαριασμοί μένουν`}{" "}
          στα παλιά στοιχεία.
        </p>
      )}
      {isOwner ? (
        <NewAccount isAdding={isAdding} />
      ) : (
        <LockedField
          label="Αλλαγές λογαριασμών"
          value="Τους αλλάζει ο Ιδιοκτήτης"
        />
      )}
    </SettingsCard>
  );
}

interface AssistantCardProps {
  company: CompanySettings;
  isOwner: boolean;
  spendLine: string | null;
}

// Βοηθός: όρια widget (Διαχείριση) και πλαφόν/μερίδιο (μόνο Ιδιοκτήτης). Δύο actions, δύο αποθηκεύσεις.
export function AssistantCard({
  company,
  isOwner,
  spendLine,
}: AssistantCardProps) {
  return (
    <SettingsCard title="Βοηθός">
      <SettingsForm action={saveAssistantLimits} version={company.updated_at}>
        <div className="o-fields">
          <TextField
            id="o1-conv"
            name="widget_messages_per_conversation"
            type="number"
            min={1}
            label="Μηνύματα ανά Συζήτηση"
            value={String(company.widget_messages_per_conversation)}
          />
          <TextField
            id="o1-daily"
            name="widget_messages_per_ip_day"
            type="number"
            min={1}
            label="Μηνύματα ανά διεύθυνση τη μέρα"
            value={String(company.widget_messages_per_ip_day)}
          />
        </div>
        <SaveRow card="assistant" />
      </SettingsForm>
      {isOwner ? (
        <SettingsForm action={saveAssistantCap} version={company.updated_at}>
          <div className="o-fields">
            <TextField
              id="o1-cap"
              name="ai_monthly_cap_usd"
              type="number"
              min={0}
              step="0.01"
              label="Πλαφόν μήνα ($)"
              value={String(company.ai_monthly_cap_usd)}
            />
            <TextField
              id="o1-share"
              name="ai_widget_share"
              type="number"
              min={0}
              max={100}
              label="Μερίδιο widget (%)"
              value={String(company.ai_widget_share)}
              hint="Πάνω από αυτό σταματά το widget· στο 100% και ο εσωτερικός Βοηθός."
            />
          </div>
          <SaveRow card="assistant-cap" />
        </SettingsForm>
      ) : (
        <>
          <LockedField
            label="Πλαφόν μήνα"
            value={`$${company.ai_monthly_cap_usd}`}
          />
          <LockedField
            label="Μερίδιο widget"
            value={`${company.ai_widget_share}%`}
          />
        </>
      )}
      <p className="muted o-hint">
        {spendLine ?? "Η δαπάνη του μήνα δεν φόρτωσε."}{" "}
        {isOwner && (
          <>
            <Link href="/app/settings/integrations">Συνδρομές</Link> ·{" "}
          </>
        )}
        <Link href="/app/health">Υγεία συστήματος</Link>
      </p>
    </SettingsCard>
  );
}
