import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import {
  saveAssistantCap,
  saveAssistantLimits,
  saveCompanyDetails,
  saveTaxDetails,
} from "../actions";
import type { CompanySettings } from "../queries";
import { CardForm } from "./card-form";

// Ρυθμίσεις › Εταιρεία (O1): οι κάρτες με τα στοιχεία της εταιρείας. Κάθε μία αποθηκεύεται χωριστά.

const OwnerOnly = () => <Badge tone="attention">Μόνο Ιδιοκτήτης</Badge>;

export function DetailsCard({ company }: { company: CompanySettings }) {
  return (
    <Panel label="Στοιχεία εταιρείας">
      <CardForm action={saveCompanyDetails} version={company.updated_at}>
        <Field label="Επωνυμία">
          <Input name="legal_name" defaultValue={company.legal_name} />
        </Field>
        <Field label="Διακριτικός τίτλος">
          <Input name="trade_name" defaultValue={company.trade_name} />
        </Field>
        <Field label="Διεύθυνση">
          <Input name="address" defaultValue={company.address} />
        </Field>
        <Field label="Τηλέφωνο">
          <Input name="phone" type="tel" defaultValue={company.phone} />
        </Field>
        <Field label="Email εταιρείας">
          <Input name="email" type="email" defaultValue={company.email} />
        </Field>
        <Field
          label="Email απαντήσεων"
          hint="Εκεί πάνε οι απαντήσεις των πελατών σε όλα τα emails. Κενό: το email της εταιρείας."
        >
          <Input
            name="reply_to_email"
            type="email"
            defaultValue={company.reply_to_email}
          />
        </Field>
        <Field label="Υπογράφων εταιρείας">
          <Input name="signatory_name" defaultValue={company.signatory_name} />
        </Field>
        <Field label="Ιδιότητα Υπογράφοντος">
          <Input
            name="signatory_title"
            defaultValue={company.signatory_title}
            placeholder="π.χ. Διαχειριστής"
          />
        </Field>
      </CardForm>
    </Panel>
  );
}

export function TaxCard({
  company,
  isOwner,
}: {
  company: CompanySettings;
  isOwner: boolean;
}) {
  return (
    <Panel label="Φορολογικά στοιχεία και ΦΠΑ" aside={<OwnerOnly />}>
      {!isOwner && (
        <p className="mt-0 text-sm text-muted-foreground">
          Τυπώνονται στις Συμφωνίες και στην Καρτέλα Πελάτη. Τα αλλάζει μόνο ο
          Ιδιοκτήτης.
        </p>
      )}
      <CardForm
        action={saveTaxDetails}
        version={company.updated_at}
        isLocked={!isOwner}
      >
        <Field label="ΑΦΜ">
          <Input
            name="tax_id"
            inputMode="numeric"
            maxLength={9}
            defaultValue={company.tax_id}
            className="font-mono"
          />
        </Field>
        <Field label="ΔΟΥ">
          <Input name="tax_office" defaultValue={company.tax_office} />
        </Field>
        <Field label="ΓΕΜΗ">
          <Input
            name="gemi"
            inputMode="numeric"
            maxLength={12}
            defaultValue={company.gemi}
            className="font-mono"
          />
        </Field>
        <Field
          label="Συντελεστής ΦΠΑ (%)"
          hint="Γενικός· αλλάζει και ανά γραμμή Συμφωνίας."
        >
          <Input
            name="vat_rate"
            type="number"
            min={0}
            max={99}
            step="0.01"
            defaultValue={company.vat_rate}
            className="tabular-nums"
          />
        </Field>
      </CardForm>
    </Panel>
  );
}

export function AssistantCard({
  company,
  isOwner,
}: {
  company: CompanySettings;
  isOwner: boolean;
}) {
  return (
    <Panel label="Βοηθός">
      <div className="grid gap-6">
        <CardForm action={saveAssistantLimits} version={company.updated_at}>
          <Field label="Μηνύματα ανά Συζήτηση" hint="Όριο του δημόσιου widget.">
            <Input
              name="widget_messages_per_conversation"
              type="number"
              min={1}
              defaultValue={company.widget_messages_per_conversation}
              className="tabular-nums"
            />
          </Field>
          <Field label="Μηνύματα ανά διεύθυνση τη μέρα">
            <Input
              name="widget_messages_per_ip_day"
              type="number"
              min={1}
              defaultValue={company.widget_messages_per_ip_day}
              className="tabular-nums"
            />
          </Field>
        </CardForm>
        <div className="grid gap-3 border-t pt-4">
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold">
            Πλαφόν δαπάνης AI <OwnerOnly />
          </p>
          <CardForm
            action={saveAssistantCap}
            version={company.updated_at}
            isLocked={!isOwner}
          >
            <Field label="Μηνιαίο πλαφόν (USD)">
              <Input
                name="ai_monthly_cap_usd"
                type="number"
                min={0}
                step="0.01"
                defaultValue={company.ai_monthly_cap_usd}
                className="tabular-nums"
              />
            </Field>
            <Field
              label="Μερίδιο δημόσιου widget (%)"
              hint="Πάνω από αυτό σταματά το widget· στο 100% και ο εσωτερικός Βοηθός."
            >
              <Input
                name="ai_widget_share"
                type="number"
                min={0}
                max={100}
                defaultValue={company.ai_widget_share}
                className="tabular-nums"
              />
            </Field>
          </CardForm>
        </div>
      </div>
    </Panel>
  );
}
