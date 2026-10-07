import type { RoleId } from "@/data/roles";
import { COMPANY, OPEN_PROPOSALS_FOR_SIGNER } from "@/data/settings-company";
import { SaveRow, SettingsCard, TextField } from "@/screens/o-shared";
import type { ScreenQuery } from "@/screens/shared";

export interface O1CardProps {
  role: RoleId;
  query: ScreenQuery;
  isEmpty: boolean;
}

// Στοιχεία εταιρείας: στο πρώτο στήσιμο τίποτα δεν έχει προεπιλογή, άρα «εκκρεμεί».
export function CompanyCard({ role, query, isEmpty }: O1CardProps) {
  return (
    <SettingsCard title="Στοιχεία">
      <div className="o-fields">
        <TextField
          id="o1-name"
          label="Επωνυμία"
          value={COMPANY.name}
          pending={isEmpty}
        />
        <TextField
          id="o1-trade"
          label="Διακριτικός τίτλος"
          value={COMPANY.tradeName}
        />
        <TextField
          id="o1-address"
          label="Διεύθυνση"
          value={COMPANY.address}
          pending={isEmpty}
        />
        <TextField
          id="o1-phone"
          label="Τηλέφωνο"
          value={COMPANY.phone}
          pending={isEmpty}
        />
        <TextField
          id="o1-email"
          label="Email"
          value={COMPANY.email}
          pending={isEmpty}
        />
        <TextField
          id="o1-reply"
          label="Email απαντήσεων"
          value={isEmpty ? "" : COMPANY.replyEmail}
          hint="Προεπιλογή: το email της εταιρείας. Ισχύει για όλα τα emails (Αυτοματισμούς και απαραίτητα)."
        />
        <TextField
          id="o1-logo"
          label="Λογότυπο"
          value={COMPANY.logo}
          pending={isEmpty}
        />
      </div>
      <SaveRow role={role} query={query} code="O1" card="company" />
    </SettingsCard>
  );
}

export function SignerCard({ role, query, isEmpty }: O1CardProps) {
  return (
    <SettingsCard title="Υπογράφων εταιρείας">
      <div className="o-fields">
        <TextField
          id="o1-signer"
          label="Όνομα"
          value={COMPANY.signerName}
          pending={isEmpty}
        />
        <TextField
          id="o1-signer-title"
          label="Ιδιότητα"
          value={COMPANY.signerTitle}
          pending={isEmpty}
        />
      </div>
      <SaveRow
        role={role}
        query={query}
        code="O1"
        card="signer"
        forward={
          isEmpty
            ? undefined
            : {
                affected: OPEN_PROPOSALS_FOR_SIGNER,
                what: "ανοιχτές προτάσεις",
              }
        }
      />
    </SettingsCard>
  );
}
