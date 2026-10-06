import { financeCapsOf } from "@/data/finance-access";
import { ClientGroup } from "@/screens/i1-group";
import { billingGroups, groupsCount, groupsTotal } from "@/screens/i1-model";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtMoney,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./i13.css";

const NOTE = "Τα Τιμολογητέα δεν είναι οφειλή· ο πελάτης δεν τα βλέπει.";

export function I1({ role, query }: ScreenProps) {
  const caps = financeCapsOf(role);
  const state = parseState(query.state);
  const header = <StateSwitcher role={role} code="I1" state={state} />;
  if (!caps.canSee || caps.isClient) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το «Προς τιμολόγηση» είναι για την ομάδα.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="το «Προς τιμολόγηση»" />
      </>
    );
  }
  const groups = state === "empty" ? [] : billingGroups();
  return (
    <>
      {header}
      <p className="note">{NOTE}</p>
      {groups.length === 0 ? (
        <StateNotice kind="empty" title="Δεν περιμένει τίποτα για τιμολόγηση">
          Όλα τα Τιμολογητέα έχουν καλυφθεί από Τιμολόγια.
        </StateNotice>
      ) : (
        <>
          <p>
            <strong>
              Σύνολο προς τιμολόγηση: {fmtMoney(groupsTotal(groups))}
            </strong>
            <span className="muted">
              {" "}
              · {groupsCount(groups)} Τιμολογητέα · {groups.length} Πελάτες
            </span>
          </p>
          {groups.map((g) => (
            <ClientGroup
              key={g.client.id}
              role={role}
              group={g}
              canRegister={caps.canRegisterInvoices}
            />
          ))}
        </>
      )}
    </>
  );
}
