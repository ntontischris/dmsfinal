import { cache } from "react";

import { listAllClients } from "../queries-clients";
import { listAllClientOverviews } from "../queries-overview";

// Οι ίδιες αναγνώσεις της B1 μία φορά ανά αίτημα: οι κάρτες του Χώρου και η λίστα μοιράζονται το αποτέλεσμα
// (χωρίς αναζήτηση, ίδια ids), ώστε οι αριθμοί των καρτών να μη διπλασιάζουν τη δουλειά της βάσης.
export const listClientsOnce = cache((query: string) => listAllClients(query));

const overviewsByKey = cache((key: string) =>
  listAllClientOverviews(key === "" ? [] : key.split(",")),
);

export const listOverviewsOnce = (ids: readonly string[]) =>
  overviewsByKey(ids.join(","));
