import Link from "next/link";

import {
  capsOf,
  clientAccessFor,
  firstName,
  isMyOpportunity,
  opportunitiesOfClient,
  type SalesCaps,
} from "@/data/sales-access";
import {
  KYPSELI_ID,
  findClient,
  memberName,
  type SalesClient,
} from "@/data/sales";
import { agreementsOfClient, type AgreementRecord } from "@/data/agreements";
import type { Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import { takenMessage } from "@/data/access-requests";
import {
  ClientInspector,
  RelationshipSteps,
  relationshipSteps,
} from "@/screens/b2-inspector";
import "./b2.css";
import { AccessRequest } from "@/screens/access-request";
import {
  ActivitiesSection,
  AgreementsSection,
  DetailsSection,
  CrossModuleSection,
  OpportunitiesSection,
  UsersSection,
} from "@/screens/b2-sections";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

type TabId =
  | "details"
  | "users"
  | "opportunities"
  | "agreements"
  | "productions"
  | "chat"
  | "activities"
  | "dispatches"
  | "ledger";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "details", label: "Στοιχεία" },
  { id: "users", label: "Χρήστες πελάτη" },
  { id: "opportunities", label: "Ευκαιρίες" },
  { id: "agreements", label: "Συμφωνίες" },
  { id: "productions", label: "Παραγωγές" },
  { id: "chat", label: "Συνομιλία" },
  { id: "activities", label: "Δραστηριότητες" },
  { id: "dispatches", label: "Ιστορικό αποστολών" },
  { id: "ledger", label: "Καρτέλα Πελάτη" },
];

const ACCOUNTANT_TABS: readonly TabId[] = ["details", "agreements", "ledger"];

// Λογιστής: μόνο Στοιχεία, Συμφωνίες, Καρτέλα Πελάτη. Πωλήσεις: όλα εκτός από Χρήστες πελάτη και Καρτέλα Πελάτη.
const tabAllowed = (tab: TabId, caps: SalesCaps): boolean => {
  if (caps.isReadOnly) return ACCOUNTANT_TABS.includes(tab);
  if (tab === "users") return caps.canSeeClientUsers;
  if (tab === "ledger") return caps.canSeeFinance;
  return true;
};


// Κενή κατάσταση: ένας Πελάτης που μόλις δημιουργήθηκε, χωρίς τίποτα πάνω του.
const asNewClient = (client: SalesClient): SalesClient => ({
  ...client,
  status: "Υποψήφιος",
  users: [],
  activities: [],
});

const renderTab = (
  tab: TabId,
  role: RoleId,
  client: SalesClient,
  caps: SalesCaps,
  opportunities: readonly Opportunity[],
  agreements: readonly AgreementRecord[],
  showAmounts: boolean,
  isNew: boolean,
) => {
  if (tab === "users") return <UsersSection role={role} client={client} caps={caps} />;
  if (tab === "agreements")
    return (
      <AgreementsSection
        role={role}
        client={client}
        caps={caps}
        agreements={agreements}
        showAmounts={showAmounts}
      />
    );
  if (tab === "opportunities")
    return (
      <OpportunitiesSection
        role={role}
        client={client}
        caps={caps}
        opportunities={opportunities}
      />
    );
  if (tab === "productions" || tab === "chat" || tab === "dispatches" || tab === "ledger")
    return <CrossModuleSection tab={tab} role={role} client={client} caps={caps} isNew={isNew} />;
  if (tab === "activities")
    return <ActivitiesSection role={role} client={client} caps={caps} />;
  return <DetailsSection role={role} client={client} caps={caps} />;
};

export function B2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = capsOf(role);
  const found = findClient(query.id ?? KYPSELI_ID);
  const keep = { id: query.id };

  if (!found) return <StateNotice kind="empty" title="Δεν βρέθηκε ο Πελάτης" />;
  const access = caps.isScoped ? clientAccessFor(found) : "owner";
  if (access === "taken") {
    return (
      <>
        <div className="card-title">
          <h2>{found.name}</h2>
          <Badge>Κατειλημμένος</Badge>
        </div>
        <StateNotice kind="denied" title="Ο Πελάτης ανήκει σε άλλον πωλητή">
          <p>{takenMessage(found.ownerId ? memberName(found.ownerId) : null)}</p>
          <AccessRequest ownerName={found.ownerId ? memberName(found.ownerId) : null} />
          <p>
            <Link href={screenHref(role, "B1", {})}>Πίσω στη λίστα Πελατών</Link>
          </p>
        </StateNotice>
      </>
    );
  }

  const isGranted = access === "granted";
  const client = state === "empty" ? asNewClient(found) : found;
  const visibleCaps = isGranted ? { ...caps, canManage: false } : caps;
  const clientOpportunities =
    state === "empty"
      ? []
      : opportunitiesOfClient(client.id).filter(
          (opportunity) => !isGranted || isMyOpportunity(opportunity),
        );
  const clientAgreements = state === "empty" ? [] : agreementsOfClient(client.id);
  const ownerName = memberName(client.ownerId);
  // Πωλήσεις: ποσά μόνο στις δικές του Συμφωνίες, δηλαδή των Πελατών του ή όσων προέρχονται από δική του πρόταση.
  const showAmounts = !caps.isScoped || access === "owner";
  const grantedTabs: readonly TabId[] = ["details", "agreements", "opportunities"];
  const allowed = TABS.filter((tab) =>
    isGranted
      ? grantedTabs.includes(tab.id)
      : tabAllowed(tab.id, visibleCaps),
  );
  const active = allowed.find((tab) => tab.id === query.tab) ?? allowed[0];

  return (
    <>
      <StateSwitcher
        role={role}
        code="B2"
        state={state}
        keep={{ ...keep, tab: query.tab }}
      />
      {state === "error" ? (
        <ErrorNotice what="η Σελίδα Πελάτη" />
      ) : (
        <>
          <div className="kit-split b2-split">
            <ClientInspector
              client={client}
              caps={visibleCaps}
              canReassign={!caps.isReadOnly && caps.canReassign}
              agreements={clientAgreements}
              showAmounts={showAmounts}
            />
            <div className="b2-main">
              {isGranted && clientOpportunities[0] && (
                <p className="note">
                  Πρόσβαση μέσω της Ευκαιρίας σου «{clientOpportunities[0].title}» ·
                  Υπεύθυνος Πελάτη: {firstName(ownerName)}
                </p>
              )}
              {!caps.isReadOnly && (
                <RelationshipSteps
                  steps={relationshipSteps(clientOpportunities, clientAgreements)}
                />
              )}
              <nav className="tabs" aria-label="Ενότητες Πελάτη">
                {allowed.map((tab) => (
                  <Link
                    key={tab.id}
                    className="tab"
                    href={screenHref(role, "B2", {
                      ...keep,
                      tab: tab.id,
                      state: state === "normal" ? undefined : state,
                    })}
                    aria-current={tab.id === active.id ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
              {renderTab(
                active.id,
                role,
                client,
                visibleCaps,
                clientOpportunities,
                clientAgreements,
                showAmounts,
                state === "empty",
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
