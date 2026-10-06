import { OPPORTUNITIES } from "@/data/opportunities";
import { capsOf, clientAccessFor } from "@/data/sales-access";
import { SALES_CLIENTS, memberName } from "@/data/sales";
import { NewOpportunity } from "@/screens/b1-new-opportunity";
import { ClientsTable, type ClientRow } from "@/screens/b1-clients-table";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtMoney,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

// Λίστα Πελατών. Πωλήσεις: βλέπει όλους, αλλά ανοίγει μόνο τους δικούς του· οι υπόλοιποι είναι «Κατειλημμένοι». Λογιστής: ανάγνωση, χωρίς Υπεύθυνο και Ευκαιρίες.
export function B1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = capsOf(role);

  const rows: readonly ClientRow[] = SALES_CLIENTS.map((client) => ({
    id: client.id,
    href: screenHref(role, "B2", { id: client.id }),
    name: client.name,
    city: client.city,
    status: client.status,
    owner: memberName(client.ownerId),
    openOpportunities: OPPORTUNITIES.filter(
      (opportunity) =>
        opportunity.clientId === client.id && opportunity.outcome === "Ανοιχτή",
    ).length,
    activeAgreements: client.agreements.filter(
      (agreement) => agreement.state === "ενεργή",
    ).length,
    balance: caps.canSeeFinance
      ? fmtMoney(client.finance.invoiced - client.finance.collected)
      : null,
    isPossibleDuplicate: !!client.possibleDuplicateOf && caps.canMerge,
    takenBy:
      caps.isScoped && clientAccessFor(client) === "taken"
        ? client.ownerId
          ? `Πελάτης του/της ${memberName(client.ownerId)}`
          : "Δεν έχει ακόμα Υπεύθυνο"
        : null,
  }));

  return (
    <>
      <StateSwitcher role={role} code="B1" state={state} />
      <div className="toolbar">
        <span className="muted grow">
          {caps.isScoped &&
            "Ένας Πελάτης, ένας πωλητής: βλέπεις το όνομα των Πελατών των άλλων, αλλά ανοίγεις μόνο όσους σε αφορούν. "}
          {caps.isReadOnly && "Μόνο ανάγνωση. "}
        </span>
        {caps.canManage && (
          <button type="button" className="button" data-primary="true">
            Νέος Πελάτης
          </button>
        )}
        {caps.isScoped && (
          <NewOpportunity
            clients={SALES_CLIENTS.filter((client) => client.ownerId !== null).map(
              (client) => ({
                id: client.id,
                name: client.name,
                isMine: clientAccessFor(client) === "owner",
                ownerName: memberName(client.ownerId),
              }),
            )}
          />
        )}
      </div>
      {state === "error" && <ErrorNotice what="η λίστα Πελατών" />}
      {state === "empty" && (
        <StateNotice kind="empty" title="Δεν υπάρχουν Πελάτες ακόμα">
          <p>
            {caps.canManage
              ? "Οι Πελάτες γεννιούνται από τη φόρμα της Ιστοσελίδας ή όταν τους καταχωρείς εσύ."
              : "Όταν καταχωρηθεί ο πρώτος Πελάτης, θα εμφανιστεί εδώ."}
          </p>
        </StateNotice>
      )}
      {state === "normal" && (
        <ClientsTable
          rows={rows}
          showOwner={!caps.isReadOnly}
          showOpportunities={caps.canSeeOpportunities}
          showBalance={caps.canSeeFinance}
        />
      )}
    </>
  );
}
