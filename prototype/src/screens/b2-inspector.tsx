import { agreementTotal, type AgreementRecord } from "@/data/agreements";
import type { Opportunity } from "@/data/opportunities";
import type { SalesCaps } from "@/data/sales-access";
import { memberName, type SalesClient } from "@/data/sales";
import { Inspector, type InspectorField } from "@/kit/inspector";
import { Steps, type Step } from "@/kit/steps";
import { Badge, fmtMoney } from "@/screens/shared";

// Ενεργή Συμφωνία με ποσό (μόνο όπου επιτρέπεται) για την πλαϊνή στήλη.
const activeAgreementField = (
  agreements: readonly AgreementRecord[],
  showAmounts: boolean,
): InspectorField[] => {
  const active = agreements.find((agreement) => agreement.state === "ενεργή");
  if (!active) return [];
  const price = showAmounts
    ? ` · ${fmtMoney(agreementTotal(active))}${active.kind === "μηνιαία" ? " / μήνα" : ""}`
    : "";
  return [{ label: "Συμφωνία", value: `${active.title}${price}` }];
};

interface ClientInspectorProps {
  client: SalesClient;
  caps: SalesCaps;
  canReassign: boolean;
  agreements: readonly AgreementRecord[];
  showAmounts: boolean;
}

export function ClientInspector({
  client,
  caps,
  canReassign,
  agreements,
  showAmounts,
}: ClientInspectorProps) {
  const fields: InspectorField[] = [
    {
      label: "Κατάσταση",
      value: (
        <>
          <Badge tone="strong">{client.status}</Badge>
          {caps.isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
        </>
      ),
    },
    { label: "Επωνυμία", value: client.legalName },
    { label: "Πόλη", value: client.city },
    { label: "ΑΦΜ", value: <span className="num">{client.vat}</span> },
    {
      label: "Κύριο πρόσωπο",
      value: (
        <>
          {client.contact.name}
          <br />
          <span className="muted">{client.contact.email}</span>
          <br />
          <span className="muted">{client.contact.phone}</span>
        </>
      ),
    },
    ...(caps.isReadOnly
      ? []
      : [{ label: "Υπεύθυνος", value: memberName(client.ownerId) }]),
    ...activeAgreementField(agreements, showAmounts),
  ];
  return (
    <Inspector title={client.name} fields={fields}>
      {canReassign && (
        <button type="button" className="button">
          Μεταβίβαση Πελάτη
        </button>
      )}
      {caps.canManage && (
        <button type="button" className="button" data-primary="true">
          Επεξεργασία
        </button>
      )}
    </Inspector>
  );
}

// Σχέση με τον Πελάτη: προκύπτει από τις Ευκαιρίες και τις Συμφωνίες του.
export const relationshipSteps = (
  opportunities: readonly Opportunity[],
  agreements: readonly AgreementRecord[],
): Step[] => {
  const isOpen = (opportunity: Opportunity) => opportunity.outcome === "Ανοιχτή";
  const hasAgreement = agreements.some((a) => a.state === "ενεργή" || a.state === "υπογεγραμμένη");
  const isRenewing = opportunities.some((o) => isOpen(o) && o.renewsAgreementId);
  const hasProposal =
    agreements.some((a) => a.state === "πρόταση") || opportunities.some(isOpen);
  const index = isRenewing ? 3 : hasAgreement ? 2 : hasProposal ? 1 : 0;
  const labels = ["Υποψήφιος", "Πρόταση", "Συμφωνία", "Ανανέωση"];
  return labels.map((label, i) => ({
    label,
    state: i < index ? "done" : i === index ? "current" : "todo",
  }));
};

export function RelationshipSteps({ steps }: { steps: readonly Step[] }) {
  return <Steps label="Σχέση με τον Πελάτη" steps={steps} />;
}
