import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";

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
      <div className="ml-quick o-left">
        <Link data-primary="true" href={`${O1_HREF}?bank=new`}>
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
      <div className="ml-quick">
        <Link href={O1_HREF}>Άκυρο</Link>
      </div>
    </SettingsForm>
  );
}

const bankHint = (banks: O1Banks): string => {
  const preferred = banks.rows.find((row) => row.isDefault);
  if (banks.rows.length === 0) return "εκκρεμεί";
  const count =
    banks.rows.length === 1
      ? "1 λογαριασμός"
      : `${banks.rows.length} λογαριασμοί`;
  return preferred ? `${count} · προεπιλογή ${preferred.bank}` : count;
};

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
    <SettingsCard
      title="Λογαριασμοί τραπέζης"
      hint={bankHint(banks)}
      isOpen={isAdding}
    >
      {banks.rows.length === 0 ? (
        <p className="ml-empty">
          Κανένας λογαριασμός ακόμα <Pending />
        </p>
      ) : (
        <ul className="ml-list">
          {banks.rows.map((a) => (
            <li key={a.id} className="ml-line">
              <span className="ml-thumb" aria-hidden="true">
                {initialsOf(a.bank)}
              </span>
              <span className="ml-main">
                {a.isDefault && <span className="ml-tag">προεπιλεγμένος</span>}
                <strong>{a.bank}</strong>
                <small>{`${a.iban} · ${a.holder}`}</small>
              </span>
              <span />
              {!a.isDefault && isOwner && (
                <span className="ml-quick">
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
                </span>
              )}
            </li>
          ))}
        </ul>
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
    <SettingsCard
      title="Βοηθός"
      hint="όρια widget και πλαφόν AI"
      isOpen={false}
    >
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
