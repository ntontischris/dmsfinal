import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { Inspector, type InspectorField } from "@/components/ui/inspector";
import { Panel } from "@/components/ui/panel";

import { updateOpportunity } from "../actions-opportunities";
import { formatDate, isForgotten } from "../helpers";
import { NO_MANAGER_LABEL, OUTCOME_LABELS } from "../labels";
import type { ListItem, Opportunity, SalesLists } from "../types";

import { ActionForm } from "./action-form";
import { OpportunityStatus } from "./opportunity-status";

interface OpportunityPanelProps {
  opportunity: Opportunity;
  lists: SalesLists;
  canWork: boolean;
  today: string;
}

const labelOf = (items: readonly ListItem[], id: string | null): string =>
  items.find((item) => item.id === id)?.label ?? "—";

function NextStep({
  opportunity,
  today,
}: {
  opportunity: Opportunity;
  today: string;
}) {
  if (!opportunity.nextStep || !opportunity.nextStepDue)
    return <>Δεν έχει οριστεί</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>
        {opportunity.nextStep} ({formatDate(opportunity.nextStepDue)})
      </span>
      {isForgotten(opportunity, today) && (
        <Badge tone="attention">Ξεχασμένη</Badge>
      )}
    </span>
  );
}

// Η Έκβαση ξεχωριστά από το Στάδιο: ανοιχτή δείχνει «Ανοιχτή» (το Στάδιο έχει δικό του πεδίο), κλειστή δείχνει το αποτέλεσμα.
function Outcome({
  opportunity,
  lists,
  today,
}: {
  opportunity: Opportunity;
  lists: SalesLists;
  today: string;
}) {
  if (opportunity.outcome === "open")
    return <Badge tone="strong">{OUTCOME_LABELS.open}</Badge>;
  return (
    <OpportunityStatus
      opportunity={opportunity}
      stageLabel={labelOf(lists.stages, opportunity.stageId)}
      lossReasonLabel={
        opportunity.lossReasonId
          ? labelOf(lists.lossReasons, opportunity.lossReasonId)
          : null
      }
      today={today}
    />
  );
}

const identityFields = ({
  opportunity,
  lists,
  today,
}: Omit<OpportunityPanelProps, "canWork">): InspectorField[] => {
  const fields: InspectorField[] = [
    {
      label: "Πελάτης",
      value: (
        <Link href={`/app/clients/${opportunity.clientId}`}>
          {opportunity.clientName ?? "—"}
        </Link>
      ),
    },
    {
      label: "Πηγή",
      value: `${labelOf(lists.sources, opportunity.sourceId)}${
        opportunity.referredBy ? ` · σύσταση: ${opportunity.referredBy}` : ""
      }`,
    },
    { label: "Υπεύθυνος", value: opportunity.managerName ?? NO_MANAGER_LABEL },
    { label: "Στάδιο", value: labelOf(lists.stages, opportunity.stageId) },
    {
      label: "Έκβαση",
      value: <Outcome opportunity={opportunity} lists={lists} today={today} />,
    },
    {
      label: "Επόμενο βήμα",
      value: <NextStep opportunity={opportunity} today={today} />,
    },
  ];
  if (opportunity.followsId)
    fields.push({
      label: "Συνεχίζει",
      value: (
        <Link href={`/app/pipeline/${opportunity.followsId}`}>
          {opportunity.followsTitle ?? "—"}
        </Link>
      ),
    });
  return fields;
};

function WorkForm({
  opportunity,
  stages,
}: {
  opportunity: Opportunity;
  stages: readonly ListItem[];
}) {
  // Μια αποσυρμένη τιμή μένει επιλέξιμη μόνο αν την έχει ήδη η Ευκαιρία· αλλιώς το Στάδιο θα άλλαζε χωρίς να το θέλει ο Χρήστης.
  const selectable = stages.filter(
    (stage) => !stage.isRetired || stage.id === opportunity.stageId,
  );
  return (
    <ActionForm action={updateOpportunity} submitLabel="Αποθήκευση">
      <input type="hidden" name="opportunityId" value={opportunity.id} />
      <Field label="Τίτλος">
        <Input name="title" required defaultValue={opportunity.title} />
      </Field>
      <Field label="Στάδιο">
        <Select name="stageId" required defaultValue={opportunity.stageId}>
          {selectable.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Επόμενο βήμα">
        <Input
          name="nextStep"
          required
          autoComplete="off"
          defaultValue={opportunity.nextStep}
        />
      </Field>
      <Field label="Ημερομηνία επόμενου βήματος">
        <Input
          name="nextStepDue"
          type="date"
          required
          defaultValue={opportunity.nextStepDue ?? ""}
        />
      </Field>
    </ActionForm>
  );
}

// Η ταυτότητα της Ευκαιρίας (B4) και, για όποιον τη δουλεύει, η φόρμα αλλαγής. Μπαίνει απευθείας μέσα σε <Split>:
// ο Inspector πάει στην πλαϊνή στήλη και η φόρμα στην κύρια.
// Δεν υπάρχει χειριστήριο «κερδισμένη»: η Ευκαιρία κερδίζεται μόνο με την υπογραφή της Συμφωνίας (ADR 0009).
export function OpportunityPanel({
  opportunity,
  lists,
  canWork,
  today,
}: OpportunityPanelProps) {
  return (
    <>
      <Inspector
        code="B4"
        title="Στοιχεία Ευκαιρίας"
        fields={identityFields({ opportunity, lists, today })}
      />
      {canWork && (
        <Panel label="Δουλειά στην Ευκαιρία">
          <WorkForm opportunity={opportunity} stages={lists.stages} />
        </Panel>
      )}
    </>
  );
}
