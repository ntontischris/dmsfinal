import Link from "next/link";

import { settingsCapsOf } from "@/data/settings-access";
import { ASSISTANT } from "@/data/settings-company";
import type { O1CardProps } from "@/screens/o1-company";
import {
  LockedField,
  SaveRow,
  SettingsCard,
  TextField,
} from "@/screens/o-shared";
import { fmtPercent, screenHref } from "@/screens/shared";

// Βοηθός: όρια widget (Διαχείριση) και πλαφόν/μερίδιο (μόνο Ιδιοκτήτης).
export function AssistantCard({ role, query }: O1CardProps) {
  const isOwner = settingsCapsOf(role).isOwner;
  return (
    <SettingsCard title="Βοηθός">
      <div className="o-fields">
        <TextField
          id="o1-conv"
          label="Μηνύματα ανά Συζήτηση"
          value={String(ASSISTANT.conversationLimit)}
        />
        <TextField
          id="o1-daily"
          label="Μηνύματα ανά διεύθυνση τη μέρα"
          value={String(ASSISTANT.dailyAddressLimit)}
        />
      </div>
      {isOwner ? (
        <div className="o-fields">
          <TextField
            id="o1-cap"
            label="Πλαφόν μήνα ($)"
            value={String(ASSISTANT.monthlyCap)}
          />
          <TextField
            id="o1-share"
            label="Μερίδιο widget (%)"
            value={String(ASSISTANT.widgetShare * 100)}
          />
        </div>
      ) : (
        <>
          <LockedField label="Πλαφόν μήνα" value={`$${ASSISTANT.monthlyCap}`} />
          <LockedField
            label="Μερίδιο widget"
            value={fmtPercent(ASSISTANT.widgetShare)}
          />
        </>
      )}
      <p className="muted o-hint">
        Τρέχουσα χρήση: ${ASSISTANT.monthlyUsed.toFixed(2)} από $
        {ASSISTANT.monthlyCap}.{" "}
        <Link href={screenHref(role, "N5", {})}>Συνδρομές (N5)</Link> ·{" "}
        <Link href={screenHref(role, "P2", {})}>Υγεία συστήματος (P2)</Link>
      </p>
      <SaveRow role={role} query={query} code="O1" card="assistant" />
    </SettingsCard>
  );
}
