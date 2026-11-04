import Link from "next/link";
import type { ReactNode } from "react";

import { Inspector, type InspectorField } from "@/spaces/kit/inspector";
import { Steps, type Step } from "@/spaces/kit/steps";
import { Badge } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import type { AssignableUser, ClientDetail } from "../types";
import { ClientContact } from "./b2-contact";
import { ClientTransfer } from "./b2-transfer";

interface ClientInspectorProps {
  client: ClientDetail;
  // Η κατάσταση του Πελάτη (από τις Συμφωνίες του)· null όταν δεν φόρτωσε.
  status: string | null;
  isReadOnly: boolean;
  canEdit: boolean;
  // Η καρτέλα Δραστηριότητες, για «Πρόσθεσε σημείωση»· null όταν ο Χρήστης δεν τη βλέπει.
  activitiesHref: string | null;
  // null = ο Χρήστης δεν μεταβιβάζει.
  assignable: readonly AssignableUser[] | null;
  activeAgreement: string | null;
  // Ενέργειες της εφαρμογής που μπαίνουν όπως είναι (π.χ. «Ιστορικό»).
  extra?: ReactNode;
}

const dash = (value: string): string => (value === "" ? "—" : value);

// Η πλαϊνή στήλη της Σελίδας Πελάτη (prototype `screens/b2-inspector.tsx`): ταυτότητα, κύριο πρόσωπο, Υπεύθυνος,
// ενεργή Συμφωνία, και οι ενέργειες πάνω στον Πελάτη. Ο «Χώρος γυρίσματος» λείπει: η βάση δεν κρατά ακόμα διεύθυνση.
export function ClientInspector({
  client,
  status,
  isReadOnly,
  canEdit,
  activitiesHref,
  assignable,
  activeAgreement,
  extra,
}: ClientInspectorProps) {
  const fields: InspectorField[] = [
    {
      label: "Κατάσταση",
      value: (
        <>
          {status && <Badge tone="strong">{status}</Badge>}
          {isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
          <br />
          <span className="muted">
            Αλλάζει μόνη της, από τις Συμφωνίες και τις Παραγωγές.
          </span>
        </>
      ),
    },
    { label: "Επωνυμία", value: dash(client.legalName) },
    { label: "Πόλη", value: dash(client.city) },
    { label: "ΑΦΜ", value: <span className="num">{client.afm ?? "—"}</span> },
    {
      label: "Κύριο πρόσωπο",
      value: (
        <ClientContact key={client.id} client={client} canEdit={canEdit} />
      ),
    },
    ...(isReadOnly
      ? []
      : [
          {
            label: "Υπεύθυνος",
            value: client.managerName ?? NO_MANAGER_LABEL,
          },
        ]),
    ...(activeAgreement ? [{ label: "Συμφωνία", value: activeAgreement }] : []),
  ];
  const hasFoot =
    (canEdit && activitiesHref !== null) || assignable !== null || extra;
  return (
    <Inspector title={client.name} fields={fields}>
      {hasFoot && (
        <>
          {canEdit && activitiesHref !== null && (
            <Link className="button" href={activitiesHref}>
              Πρόσθεσε σημείωση
            </Link>
          )}
          {assignable !== null && (
            <ClientTransfer
              clientId={client.id}
              currentManagerId={client.managerId}
              assignable={assignable}
            />
          )}
          {extra}
        </>
      )}
    </Inspector>
  );
}

// Ο τίτλος φαίνεται (όχι μόνο aria-label), για να βρίσκεται η γραμμή στη σελίδα.
export function RelationshipSteps({ steps }: { steps: readonly Step[] }) {
  return (
    <section className="b2-relationship">
      <h2>Σχέση με τον Πελάτη</h2>
      <Steps label="Σχέση με τον Πελάτη" steps={steps} />
    </section>
  );
}
