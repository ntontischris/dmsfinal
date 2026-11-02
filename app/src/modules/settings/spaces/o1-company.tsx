import { saveCompanyDetails, saveTaxDetails } from "../actions";
import type { CompanySettings } from "../queries";
import type { RequiredField } from "./o1-adapter";
import { SaveRow, SettingsForm } from "./o-form";
import { LockedField, Pending, SettingsCard, TextField } from "./o-shared";

// O1 κάρτες Στοιχεία, Υπογράφων, Φορολογικά, ΦΠΑ (prototype `screens/o1-company.tsx` + `o1-money.tsx`).
// Τα Στοιχεία και ο Υπογράφων αποθηκεύονται με ένα action (όλα τα πεδία μαζί), το ίδιο τα Φορολογικά και ο ΦΠΑ:
// γι' αυτό κάθε ζεύγος καρτών είναι μία φόρμα, με κουμπί σε κάθε κάρτα.

export interface O1CardProps {
  company: CompanySettings;
  pending: ReadonlySet<RequiredField>;
}

function CompanyCard({ company, pending }: O1CardProps) {
  return (
    <SettingsCard title="Στοιχεία">
      <div className="o-fields">
        <TextField
          id="o1-name"
          name="legal_name"
          label="Επωνυμία"
          value={company.legal_name}
          isPending={pending.has("legal_name")}
        />
        <TextField
          id="o1-trade"
          name="trade_name"
          label="Διακριτικός τίτλος"
          value={company.trade_name}
        />
        <TextField
          id="o1-address"
          name="address"
          label="Διεύθυνση"
          value={company.address}
          isPending={pending.has("address")}
        />
        <TextField
          id="o1-phone"
          name="phone"
          type="tel"
          label="Τηλέφωνο"
          value={company.phone}
          isPending={pending.has("phone")}
        />
        <TextField
          id="o1-email"
          name="email"
          type="email"
          label="Email"
          value={company.email}
          isPending={pending.has("email")}
        />
        <TextField
          id="o1-reply"
          name="reply_to_email"
          type="email"
          label="Email απαντήσεων"
          value={company.reply_to_email}
          hint="Προεπιλογή: το email της εταιρείας. Ισχύει για όλα τα emails (Αυτοματισμούς και απαραίτητα)."
        />
      </div>
      <SaveRow card="company" />
    </SettingsCard>
  );
}

function SignerCard({ company, pending }: O1CardProps) {
  return (
    <SettingsCard title="Υπογράφων εταιρείας">
      <div className="o-fields">
        <TextField
          id="o1-signer"
          name="signatory_name"
          label="Όνομα"
          value={company.signatory_name}
          isPending={pending.has("signatory_name")}
        />
        <TextField
          id="o1-signer-title"
          name="signatory_title"
          label="Ιδιότητα"
          value={company.signatory_title}
          isPending={pending.has("signatory_title")}
        />
      </div>
      <SaveRow card="signer" />
    </SettingsCard>
  );
}

export function CompanyAndSigner(props: O1CardProps) {
  return (
    <SettingsForm
      action={saveCompanyDetails}
      version={props.company.updated_at}
    >
      <CompanyCard {...props} />
      <SignerCard {...props} />
    </SettingsForm>
  );
}

const TAX_ROWS = [
  { id: "afm", name: "tax_id", label: "ΑΦΜ", maxLength: 9 },
  { id: "doy", name: "tax_office", label: "ΔΟΥ", maxLength: undefined },
  { id: "gemi", name: "gemi", label: "ΓΕΜΗ", maxLength: 12 },
] as const;

const fmtVat = (rate: number): string =>
  `${rate.toLocaleString("el-GR", { maximumFractionDigits: 2 })}%`;

// Φορολογικά και ΦΠΑ για τον Ιδιοκτήτη: δύο κάρτες, μία φόρμα (το action αποθηκεύει και τα τέσσερα πεδία).
function OwnerTaxAndVat({ company, pending }: O1CardProps) {
  return (
    <SettingsForm action={saveTaxDetails} version={company.updated_at}>
      <SettingsCard title="Φορολογικά">
        <div className="o-fields">
          {TAX_ROWS.map((r) => (
            <TextField
              key={r.id}
              id={`o1-${r.id}`}
              name={r.name}
              label={r.label}
              value={company[r.name]}
              maxLength={r.maxLength}
              inputMode={r.name === "tax_office" ? undefined : "numeric"}
              isPending={pending.has(r.name)}
            />
          ))}
        </div>
        <SaveRow card="tax" />
      </SettingsCard>
      <SettingsCard title="ΦΠΑ">
        <div className="o-fields">
          <TextField
            id="o1-vat"
            name="vat_rate"
            type="number"
            min={0}
            max={99}
            step="0.01"
            label="Γενικός συντελεστής (%)"
            value={String(company.vat_rate)}
            hint="Αλλάζει ανά γραμμή Συμφωνίας."
          />
        </div>
        <SaveRow card="vat" />
      </SettingsCard>
    </SettingsForm>
  );
}

function LockedTaxAndVat({ company, pending }: O1CardProps) {
  return (
    <>
      <SettingsCard title="Φορολογικά">
        {TAX_ROWS.map((r) => (
          <LockedField
            key={r.id}
            label={r.label}
            value={pending.has(r.name) ? <Pending /> : company[r.name]}
          />
        ))}
      </SettingsCard>
      <SettingsCard title="ΦΠΑ">
        <LockedField
          label="Γενικός συντελεστής"
          value={fmtVat(company.vat_rate)}
        />
      </SettingsCard>
    </>
  );
}

// Φορολογικά: ΑΦΜ, ΔΟΥ, ΓΕΜΗ και ΦΠΑ. Τα αλλάζει μόνο ο Ιδιοκτήτης (το ξανακρίνει και η βάση).
export function TaxAndVat({
  isOwner,
  ...props
}: O1CardProps & { isOwner: boolean }) {
  return isOwner ? (
    <OwnerTaxAndVat {...props} />
  ) : (
    <LockedTaxAndVat {...props} />
  );
}
