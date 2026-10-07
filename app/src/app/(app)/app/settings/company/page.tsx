import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer, isOwner } from "@/modules/access";
import {
  AssistantCard,
  BankAccountsCard,
  DetailsCard,
  RecentChanges,
  SettingsTabs,
  TaxCard,
  getCompany,
  listBankAccounts,
  recentChanges,
} from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Εταιρεία" };

const FIELD_LABELS: Readonly<Record<string, string>> = {
  legal_name: "Επωνυμία",
  trade_name: "Διακριτικός τίτλος",
  address: "Διεύθυνση",
  phone: "Τηλέφωνο",
  email: "Email",
  reply_to_email: "Email απαντήσεων",
  signatory_name: "Υπογράφων",
  signatory_title: "Ιδιότητα Υπογράφοντος",
  tax_id: "ΑΦΜ",
  tax_office: "ΔΟΥ",
  gemi: "ΓΕΜΗ",
  vat_rate: "ΦΠΑ",
  ai_monthly_cap_usd: "Πλαφόν AI",
  ai_widget_share: "Μερίδιο widget",
  widget_messages_per_conversation: "Όριο ανά Συζήτηση",
  widget_messages_per_ip_day: "Όριο ανά μέρα",
  iban: "IBAN",
  is_default: "Προεπιλεγμένος λογαριασμός",
  retired_at: "Απόσυρση λογαριασμού",
  bank_name: "Τράπεζα",
  holder: "Δικαιούχος",
};

// O1 Ρυθμίσεις › Εταιρεία. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function CompanySettingsPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="O1 · Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!can(viewer, "settings.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις». Τις τιμές
            τις βλέπεις εκεί όπου χρησιμοποιούνται.
          </p>
        </AccessNotice>
      </>
    );

  const [company, accounts, changes] = await Promise.all([
    getCompany(),
    listBankAccounts(),
    recentChanges(["company_settings", "bank_accounts"]),
  ]);
  const owner = isOwner(viewer);
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="company" />
        {!company.ok || !accounts.ok ? (
          <Notice kind="error" title="Δεν φόρτωσαν οι Ρυθμίσεις">
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        ) : (
          <>
            <DetailsCard company={company.data} />
            <TaxCard company={company.data} isOwner={owner} />
            <BankAccountsCard accounts={accounts.data} isOwner={owner} />
            <AssistantCard company={company.data} isOwner={owner} />
            {changes.ok && (
              <RecentChanges
                changes={changes.data}
                labelOf={(field) => FIELD_LABELS[field] ?? field}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
