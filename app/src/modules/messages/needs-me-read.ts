import { needsMeOf, type NeedRow } from "./needs-me";
import { getInbox, getRequestsView } from "./queries";

// Η λίστα «Χρειάζονται εμένα» (J1 και οδηγός «Απαντώ σε Πελάτες»): τα Εισερχόμενα και όλα τα ανοιχτά Αιτήματα που βλέπω.
// null = δεν φόρτωσε· τότε κανείς δεν λέει ούτε «τελείωσες» ούτε αριθμό.
export async function readNeedsMe(): Promise<NeedRow[] | null> {
  const [inbox, requests] = await Promise.all([
    getInbox(),
    getRequestsView("open"),
  ]);
  if (!inbox.ok) return null;
  return needsMeOf(inbox.data.items, requests.ok ? requests.data.items : []);
}
