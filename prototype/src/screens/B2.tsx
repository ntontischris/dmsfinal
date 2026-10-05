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
import type { Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import { AccessRequest, takenMessage } from "@/screens/access-request";
import {
  ActivitiesSection,
  AgreementsSection,
  DetailsSection,
  FinanceSection,
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
  | "agreements"
  | "opportunities"
  | "finance"
  | "activities";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "details", label: "Στοιχεία" },
  { id: "users", label: "Χρήστες πελάτη" },
  { id: "agreements", label: "Συμφωνίες και Περίοδοι" },
  { id: "opportunities", label: "Ευκαιρίες" },
  { id: "finance", label: "Οικονομικά" },
  { id: "activities", label: "Δραστηριότητες" },
];

// Λογιστής: μόνο Στοιχεία, Συμφωνίες, Οικονομικά. Πωλήσεις: χωρίς Οικονομικά και Χρήστες πελάτη (N2 είναι Ιδ · Δι).
const tabAllowed = (tab: TabId, caps: SalesCaps): boolean => {
  if (tab === "users") return caps.canSeeClientUsers;
  if (tab === "finance") return caps.canSeeFinance;
  if (tab === "opportunities" || tab === "activities")
    return caps.canSeeOpportunities;
  return true;
};

// Κενή κατάσταση: ένας Πελάτης που μόλις δημιουργήθηκε, χωρίς τίποτα πάνω του.
const asNewClient = (client: SalesClient): SalesClient => ({
  ...client,
  status: "Υποψήφιος",
  users: [],
  agreements: [],
  activities: [],
  finance: { invoiced: 0, collected: 0, overdue: 0, toInvoice: 0 },
});

const renderTab = (
  tab: TabId,
  role: RoleId,
  client: SalesClient,
  caps: SalesCaps,
  opportunities: readonly Opportunity[],
) => {
  if (tab === "users") return <UsersSection role={role} client={client} caps={caps} />;
  if (tab === "agreements")
    return <AgreementsSection role={role} client={client} caps={caps} />;
  if (tab === "opportunities")
    return (
      <OpportunitiesSection
        role={role}
        client={client}
        caps={caps}
        opportunities={opportunities}
      />
    );
  if (tab === "finance") return <FinanceSection role={role} client={client} caps={caps} />;
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
  const ownerName = memberName(client.ownerId);
  const allowed = TABS.filter(
    (tab) => tabAllowed(tab.id, visibleCaps) && !(isGranted && tab.id === "activities"),
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
          <div className="card-title">
            <h2>{client.name}</h2>
            <span className="btn-row">
              <Badge tone="strong">{client.status}</Badge>
              {caps.isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
            </span>
          </div>
          {!caps.isReadOnly && (
            <div className="toolbar">
              <Badge tone="strong">Υπεύθυνος Πελάτη: {ownerName}</Badge>
              {caps.canReassign && (
                <button type="button" className="button">
                  Μεταβίβαση Πελάτη
                </button>
              )}
            </div>
          )}
          {isGranted && clientOpportunities[0] && (
            <p className="note">
              Πρόσβαση μέσω της Ευκαιρίας σου «{clientOpportunities[0].title}» ·
              Υπεύθυνος Πελάτη: {firstName(ownerName)}
            </p>
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
          {renderTab(active.id, role, client, visibleCaps, clientOpportunities)}
        </>
      )}
    </>
  );
}
