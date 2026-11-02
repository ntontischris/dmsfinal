import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice, fmtMoney } from "@/spaces/screens/shared";

import { sortClientsByOldest } from "../billables-helpers";
import { getBillables } from "../billables-queries";
import { financeCaps } from "../caps";
import { ClientGroup } from "./i1-group";

import "./i13.css";

const NOTE = "Τα Τιμολογητέα δεν είναι οφειλή· ο πελάτης δεν τα βλέπει.";

// I1 Προς τιμολόγηση στη νέα εμφάνιση (prototype `screens/I1.tsx`): τι περιμένει τιμολόγηση ανά Πελάτη, από το
// billables_view. Οι κρίσεις (ανοιχτό, μέρες, υπενθυμίσεις) τις κάνει η βάση.
export async function SpacesToInvoice() {
  const caps = financeCaps(await getViewer());
  if (!caps.canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το «Προς τιμολόγηση» είναι για την ομάδα.
        </StateNotice>
      </div>
    );
  const billables = await getBillables();
  if (!billables.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το «Προς τιμολόγηση»" />
      </div>
    );
  const { total, count, clients } = billables.data;
  const groups = sortClientsByOldest(clients);
  return (
    <div data-spaces>
      <p className="note">{NOTE}</p>
      {groups.length === 0 ? (
        <StateNotice kind="empty" title="Δεν περιμένει τίποτα για τιμολόγηση">
          Όλα τα Τιμολογητέα έχουν καλυφθεί από Τιμολόγια.
        </StateNotice>
      ) : (
        <>
          <p>
            <strong>Σύνολο προς τιμολόγηση: {fmtMoney(total)}</strong>
            <span className="muted">
              {" "}
              · {count} {count === 1 ? "Τιμολογητέο" : "Τιμολογητέα"} ·{" "}
              {groups.length} {groups.length === 1 ? "Πελάτης" : "Πελάτες"}
            </span>
          </p>
          {groups.map((g) => (
            <ClientGroup key={g.clientId} group={g} canRegister={caps.canRegisterInvoices} />
          ))}
        </>
      )}
    </div>
  );
}
