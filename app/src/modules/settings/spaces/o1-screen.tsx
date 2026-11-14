import Link from "next/link";

import { can, getViewer, isOwner } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  getAiSpend,
  getCompany,
  getLogoVersion,
  listBankAccounts,
  recentChanges,
} from "../queries";
import {
  banksOf,
  isFirstSetup,
  o1ChangesOf,
  pendingFieldsOf,
  spendLineOf,
} from "./o1-adapter";
import { CompanyAndSigner, TaxAndVat } from "./o1-company";
import { LogoCard } from "./o1-logo";
import { AssistantCard, BankCard } from "./o1-money";
import { READINESS_HREF, RecentChanges, SettingsTabs } from "./o-shared";

const AUDIT_HREF = "/app/audit?area=settings";

// O1 Ρυθμίσεις › Εταιρεία στη νέα εμφάνιση (prototype `screens/O1.tsx`): όποιος «Διαχειρίζεται Ρυθμίσεις»·
// τα 🔒 (Φορολογικά, ΦΠΑ, λογαριασμοί, πλαφόν AI) αλλάζει μόνο ο Ιδιοκτήτης.
export async function SpacesCompanySettings({
  isAddingBank,
}: {
  isAddingBank: boolean;
}) {
  const viewer = await getViewer();
  if (!can(viewer, "settings.manage"))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις». Τις τιμές
          τις βλέπεις εκεί όπου χρησιμοποιούνται.
        </StateNotice>
      </div>
    );
  const [company, accounts, changes, spend, logoVersion] = await Promise.all([
    getCompany(),
    listBankAccounts(),
    recentChanges(["company_settings", "bank_accounts"]),
    getAiSpend(),
    getLogoVersion(),
  ]);
  const owner = isOwner(viewer);
  return (
    <div data-spaces>
      <SettingsTabs code="O1" />
      {!company.ok || !accounts.ok ? (
        <ErrorNotice what="τις Ρυθμίσεις της Εταιρείας" />
      ) : (
        <>
          {isFirstSetup(company.data) && (
            <p className="note o-first" role="status">
              Πρώτο στήσιμο: οι προτεινόμενες τιμές είναι ήδη συμπληρωμένες.
              Ό,τι δεν έχει προεπιλογή γράφει «εκκρεμεί» και φαίνεται στον{" "}
              <Link href={READINESS_HREF}>Έλεγχο ετοιμότητας</Link>.
            </p>
          )}
          <CompanyAndSigner
            company={company.data}
            pending={pendingFieldsOf(company.data)}
          />
          <TaxAndVat
            company={company.data}
            pending={pendingFieldsOf(company.data)}
            isOwner={owner}
          />
          <LogoCard version={logoVersion} />
          <BankCard
            banks={banksOf(accounts.data)}
            isOwner={owner}
            isAdding={isAddingBank}
          />
          <AssistantCard
            company={company.data}
            isOwner={owner}
            spendLine={spendLineOf(spend.ok ? spend.data : null)}
          />
          {changes.ok && (
            <RecentChanges
              changes={o1ChangesOf(changes.data)}
              auditHref={can(viewer, "audit.view") ? AUDIT_HREF : null}
              areaLabel="Ρυθμίσεις"
            />
          )}
        </>
      )}
    </div>
  );
}
