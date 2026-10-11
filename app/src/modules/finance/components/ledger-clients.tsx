import Link from "next/link";

import { Rows } from "@/components/ui/rows";

import { balanceLabel, balanceText, ledgerHref } from "../ledger-helpers";
import type { LedgerClient } from "../ledger-view-schema";

// Οι Πελάτες με κινήσεις: ο καθένας ανοίγει την Καρτέλα του (?client=).
export function LedgerClients({
  clients,
}: {
  clients: readonly LedgerClient[];
}) {
  return (
    <Rows
      items={clients.map((client) => ({
        id: client.id,
        title: client.name,
        href: ledgerHref(client.id),
        aside: (
          <span className="text-sm tabular-nums">
            {balanceLabel(client.balance, false)}: {balanceText(client.balance)}
          </span>
        ),
      }))}
    />
  );
}

export function LedgerBackLink({ label }: { label: string }) {
  return (
    <Link href={ledgerHref()} className="text-sm text-primary underline">
      {label}
    </Link>
  );
}
