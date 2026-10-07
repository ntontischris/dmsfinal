import Link from "next/link";

import { settingsCapsOf } from "@/data/settings-access";
import {
  BANK_ACCOUNTS,
  IBAN_CHANGE_PREVIEW,
  TAX,
  VAT_RATE,
} from "@/data/settings-company";
import type { O1CardProps } from "@/screens/o1-company";
import {
  LockedField,
  Pending,
  SaveRow,
  SettingsCard,
  TextField,
} from "@/screens/o-shared";
import { Badge, fmtPercent, screenHref } from "@/screens/shared";

// Φορολογικά: ΑΦΜ, ΔΟΥ, ΓΕΜΗ. Τα αλλάζει μόνο ο Ιδιοκτήτης.
export function TaxCard({ role, query, isEmpty }: O1CardProps) {
  const isOwner = settingsCapsOf(role).isOwner;
  const rows = [
    { id: "afm", label: "ΑΦΜ", value: TAX.afm },
    { id: "doy", label: "ΔΟΥ", value: TAX.doy },
    { id: "gemi", label: "ΓΕΜΗ", value: TAX.gemi },
  ];
  return (
    <SettingsCard title="Φορολογικά">
      {isOwner ? (
        <>
          <div className="o-fields">
            {rows.map((r) => (
              <TextField
                key={r.id}
                id={`o1-${r.id}`}
                label={r.label}
                value={r.value}
                pending={isEmpty}
              />
            ))}
          </div>
          <SaveRow role={role} query={query} code="O1" card="tax" />
        </>
      ) : (
        rows.map((r) => (
          <LockedField
            key={r.id}
            label={r.label}
            value={isEmpty ? <Pending /> : r.value}
          />
        ))
      )}
    </SettingsCard>
  );
}

// Λογαριασμοί τραπέζης: ένας προεπιλεγμένος· η αλλαγή IBAN θέλει επιβεβαίωση.
export function BankCard({ role, query, isEmpty }: O1CardProps) {
  const isOwner = settingsCapsOf(role).isOwner;
  const isChangingIban = query.save === "bank";
  const href = (params: Record<string, string | undefined>) =>
    screenHref(role, "O1", { state: query.state, ...params });
  const newDefault = BANK_ACCOUNTS.find((a) => a.id === query.default);
  return (
    <SettingsCard title="Λογαριασμοί τραπέζης">
      {isEmpty ? (
        <p>
          Κανένας λογαριασμός ακόμα <Pending />
        </p>
      ) : (
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Τράπεζα</th>
                <th>IBAN</th>
                <th>Κατάσταση</th>
                {isOwner && <th>Ενέργεια</th>}
              </tr>
            </thead>
            <tbody>
              {BANK_ACCOUNTS.map((a) => (
                <tr key={a.id}>
                  <td data-label="Τράπεζα">{a.bank}</td>
                  <td data-label="IBAN">{a.iban}</td>
                  <td data-label="Κατάσταση">
                    {a.isDefault ? (
                      <Badge tone="strong">προεπιλεγμένος</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  {isOwner && (
                    <td data-label="Ενέργεια">
                      {!a.isDefault && (
                        <Link href={href({ default: a.id })}>
                          Ορισμός προεπιλογής
                        </Link>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isOwner && (
        <LockedField
          label="Αλλαγές λογαριασμών"
          value="Τους αλλάζει ο Ιδιοκτήτης"
        />
      )}
      {isOwner && (
        <>
          {newDefault && (
            <p className="note" role="status">
              Ο λογαριασμός «{newDefault.bank}» θα γίνει προεπιλεγμένος για τα
              νέα έγγραφα. Τα υπάρχοντα δεν αλλάζουν.
            </p>
          )}
          {isChangingIban && (
            <p className="note" role="status">
              Αλλαγή IBAN: από <strong>{IBAN_CHANGE_PREVIEW.from}</strong> σε{" "}
              <strong>{IBAN_CHANGE_PREVIEW.to}</strong>. Το Ίχνος θα γράψει και
              τις δύο τιμές και ποιος έκανε την αλλαγή.
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="button">
              + Λογαριασμός
            </button>
            <Link
              className="button"
              href={href({ save: isChangingIban ? undefined : "bank" })}
            >
              {isChangingIban ? "Επιβεβαίωση αλλαγής IBAN" : "Αλλαγή IBAN"}
            </Link>
          </div>
        </>
      )}
    </SettingsCard>
  );
}

// ΦΠΑ: έχει προεπιλογή, άρα δεν είναι ποτέ «εκκρεμεί».
export function VatCard({ role, query }: O1CardProps) {
  const isOwner = settingsCapsOf(role).isOwner;
  return (
    <SettingsCard title="ΦΠΑ">
      {isOwner ? (
        <>
          <div className="o-fields">
            <TextField
              id="o1-vat"
              label="Γενικός συντελεστής (%)"
              value={String(VAT_RATE * 100)}
              hint="Αλλάζει ανά γραμμή Συμφωνίας."
            />
          </div>
          <SaveRow role={role} query={query} code="O1" card="vat" />
        </>
      ) : (
        <LockedField label="Γενικός συντελεστής" value={fmtPercent(VAT_RATE)} />
      )}
    </SettingsCard>
  );
}
