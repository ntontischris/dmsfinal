import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtMoney } from "@/spaces/screens/shared";

import type { InvoiceItem } from "../invoices-view-schema";
import { clientOwedOf } from "./i2-client-model";
import { MoneyHero } from "./i5-cards";

// Η κεφαλίδα των Τιμολογίων του Χρήστη πελάτη: τι μένει να πληρώσει (σε όλα του τα Τιμολόγια) και πού βρίσκει
// τις οδηγίες πληρωμής (στην Καρτέλα του, «Πώς πληρώνω»).

const unpaidText = (count: number): string =>
  count === 0
    ? "κανένα ανεξόφλητο"
    : count === 1
      ? "1 ανεξόφλητο"
      : `${count} ανεξόφλητα`;

export function ClientInvoicesHero({ rows }: { rows: readonly InvoiceItem[] }) {
  const { owed, overdue, unpaidCount } = clientOwedOf(rows);
  return (
    <MoneyHero
      mono="€"
      title="Τα Τιμολόγιά σου"
      label="Μένουν να πληρωθούν (με ΦΠΑ)"
      amount={owed}
      isOpen={owed > 0}
      facts={`${unpaidText(unpaidCount)} · ληξιπρόθεσμο ${fmtMoney(overdue)}`}
      hasWarning={overdue > 0}
      actions={
        <>
          <a
            href={`${hrefOf("I5")}#pay`}
            data-primary={owed > 0 ? "true" : undefined}
          >
            Πώς πληρώνω
          </a>
          <Link href={hrefOf("I5")}>Καρτέλα</Link>
        </>
      }
    />
  );
}
