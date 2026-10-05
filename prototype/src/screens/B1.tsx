import { OPPORTUNITIES } from "@/data/opportunities";
import { capsOf, visibleClients } from "@/data/sales-access";
import { memberName } from "@/data/sales";
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

// Λίστα Πελατών. Πωλήσεις: μόνο «με αφορά». Λογιστής: ανάγνωση, χωρίς Υπεύθυνο και Ευκαιρίες.
export function B1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = capsOf(role);

  const rows: readonly ClientRow[] = visibleClients(role).map((client) => ({
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
  }));

  return (
    <>
      <StateSwitcher role={role} code="B1" state={state} />
      <div className="toolbar">
        <span className="muted grow">
          {caps.isScoped &&
            "Βλέπεις μόνο τους Πελάτες που σε αφορούν (Υπεύθυνος του Πελάτη ή μιας Ευκαιρίας του). "}
          {caps.isReadOnly && "Μόνο ανάγνωση. "}
        </span>
        {caps.canManage && (
          <button type="button" className="button" data-primary="true">
            Νέος Πελάτης
          </button>
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
