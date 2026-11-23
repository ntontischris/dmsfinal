import type { ReactNode } from "react";

import type { ListItem, Opportunity } from "../types";
import { ActivityLog, type B2ActivityRow } from "./b2-activity-log";
import { CloseLost } from "./b4-controls";
import { TitleEditor } from "./b4-title";

// Ένα κλειστό κουτί της Σελίδας Ευκαιρίας: τίτλος και υπόδειξη στο summary, το σώμα μόνο όταν το ανοίξεις.
// Το `id` μπαίνει στο σώμα· ο σύνδεσμος #id από την κεφαλίδα ανοίγει έτσι το κουτί.
function Box({
  title,
  hint,
  id,
  children,
}: {
  title: string;
  hint: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          <small>{hint}</small>
        </summary>
        <div id={id} className="stack">
          {children}
        </div>
      </details>
    </section>
  );
}

// Έλεγχος: οι διορθώσεις που δεν γίνονται κάθε μέρα. Μετονομασία (κρατά Στάδιο και Επόμενο βήμα) και κλείσιμο ως χαμένη.
export function ControlBox({
  opportunity,
  lossReasons,
}: {
  opportunity: Opportunity;
  lossReasons: readonly ListItem[];
}) {
  return (
    <Box title="Έλεγχος" hint="Μετονομασία · Κλείσιμο ως χαμένη">
      <dl className="dl">
        <dt>Τίτλος</dt>
        <dd>
          <TitleEditor
            opportunityId={opportunity.id}
            title={opportunity.title}
            stageId={opportunity.stageId}
            nextStep={opportunity.nextStep}
            nextStepDue={opportunity.nextStepDue}
          />
        </dd>
      </dl>
      <p className="muted">
        Η χαμένη Ευκαιρία κλείνει με λόγο απώλειας και δεν αναιρείται.
      </p>
      <p className="btn-row">
        <CloseLost opportunityId={opportunity.id} reasons={lossReasons} />
      </p>
    </Box>
  );
}

const countText = (count: number): string =>
  count === 0
    ? "Καμία Δραστηριότητα ακόμα"
    : `${count} ${count === 1 ? "Δραστηριότητα" : "Δραστηριότητες"}`;

// Δραστηριότητες: η καταγραφή (σημείωση, κλήση) και το ιστορικό της Ευκαιρίας.
export function ActivitiesBox({
  opportunity,
  rows,
  canLog,
  kinds,
}: {
  opportunity: Opportunity;
  rows: readonly B2ActivityRow[];
  canLog: boolean;
  kinds: readonly ListItem[];
}) {
  const hint = canLog
    ? `${countText(rows.length)} · Σημείωση ή κλήση`
    : countText(rows.length);
  return (
    <Box title="Δραστηριότητες" hint={hint} id="b4-activities">
      <ActivityLog
        rows={rows}
        canLog={canLog}
        kinds={kinds}
        openOpportunities={[{ id: opportunity.id, title: opportunity.title }]}
        isLines
      />
    </Box>
  );
}
