import { saveCompanyDetails, saveTaxDetails } from "../actions";
import type { CompanySettings } from "../queries";
import type { RequiredField } from "./o1-adapter";
import { SaveRow, SettingsForm } from "./o-form";
import { LockedField, Pending, SettingsCard, TextField } from "./o-shared";

// O1 κουτιά «Στοιχεία» (με τον Υπογράφοντα) και «Φορολογικά» (με τον ΦΠΑ). Κάθε κουτί είναι μία φόρμα με μία
// αποθήκευση, γιατί το action αποθηκεύει όλα τα πεδία του μαζί.

export interface O1CardProps {
  company: CompanySettings;
  pending: ReadonlySet<RequiredField>;
}

const pendingHint = (count: number, ready: string): string =>
  count > 0 ? `εκκρεμούν ${count}` : ready;

const COMPANY_FIELDS: readonly RequiredField[] = [
  "legal_name",
  "address",
  "phone",
  "email",
  "signatory_name",
  "signatory_title",
];

const TAX_FIELDS: readonly RequiredField[] = ["tax_id", "tax_office", "gemi"];

const countPending = (
  pending: ReadonlySet<RequiredField>,
  fields: readonly RequiredField[],
): number => fields.filter((field) => pending.has(field)).length;

function CompanyFields({ company, pending }: O1CardProps) {
  return (
    <>
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
      <h3>Υπογράφων εταιρείας</h3>
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
    </>
  );
}

// Στοιχεία και Υπογράφων: ένα κουτί, μία φόρμα, μία αποθήκευση (το action αποθηκεύει όλα τα πεδία μαζί).
export function CompanyAndSigner(props: O1CardProps) {
  const hint = pendingHint(
    countPending(props.pending, COMPANY_FIELDS),
    props.company.legal_name || "επωνυμία, επικοινωνία, υπογράφων",
  );
  return (
    <SettingsCard title="Στοιχεία" hint={hint} isOpen={false}>
      <SettingsForm
        action={saveCompanyDetails}
        version={props.company.updated_at}
      >
        <CompanyFields {...props} />
        <SaveRow card="company" />
      </SettingsForm>
    </SettingsCard>
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
const taxHint = ({ company, pending }: O1CardProps): string =>
  pendingHint(
    countPending(pending, TAX_FIELDS),
    `ΑΦΜ ${company.tax_id} · ΦΠΑ ${fmtVat(company.vat_rate)}`,
  );

function OwnerTaxAndVat(props: O1CardProps) {
  const { company, pending } = props;
  return (
    <SettingsCard title="Φορολογικά" hint={taxHint(props)} isOpen={false}>
      <SettingsForm action={saveTaxDetails} version={company.updated_at}>
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
        <h3>ΦΠΑ</h3>
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
        <SaveRow card="tax" />
      </SettingsForm>
    </SettingsCard>
  );
}

function LockedTaxAndVat(props: O1CardProps) {
  const { company, pending } = props;
  return (
    <SettingsCard title="Φορολογικά" hint={taxHint(props)} isOpen={false}>
      {TAX_ROWS.map((r) => (
        <LockedField
          key={r.id}
          label={r.label}
          value={pending.has(r.name) ? <Pending /> : company[r.name]}
        />
      ))}
      <h3>ΦΠΑ</h3>
      <LockedField
        label="Γενικός συντελεστής"
        value={fmtVat(company.vat_rate)}
      />
    </SettingsCard>
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
