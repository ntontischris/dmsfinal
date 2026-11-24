import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice } from "@/spaces/screens/shared";

import { Line, Lines } from "./b2-box";
import type { ClientPageCtx } from "./b2-context";

// Ό,τι μένει ορατό κάτω από την κεφαλίδα της Σελίδας Πελάτη: σημειώματα πρόσβασης/διπλού και «Χρειάζεται προσοχή».

// Το ?tab= ανοίγει το κουτί που έχει την ενότητα (βλ. openBoxOf).
export const clientTabHref = (clientId: string, tab: string): string =>
  hrefOf("B2", { id: clientId, tab });

// Πρόσβαση μέσω Ευκαιρίας, σήμα «Πιθανό διπλό» και ό,τι δεν φόρτωσε.
export function ClientNotices({ ctx }: { ctx: ClientPageCtx }) {
  const isDuplicate =
    (ctx.card?.isPossibleDuplicate ?? false) && ctx.caps.canMerge;
  return (
    <>
      {ctx.grantedVia && (
        <p className="note">
          Πρόσβαση μέσω της Ευκαιρίας σου «{ctx.grantedVia.title}» · Υπεύθυνος
          Πελάτη: {ctx.client.managerName ?? "—"}
        </p>
      )}
      {isDuplicate && (
        <p className="note">
          Σήμα «Πιθανό διπλό».{" "}
          <Link href={hrefOf("B6")}>Άνοιγμα στη Συγχώνευση</Link>
        </p>
      )}
      {ctx.data.failed.length > 0 && (
        <ErrorNotice what={ctx.data.failed.join(", ")} />
      )}
    </>
  );
}

// Μόνο όταν υπάρχει κίνδυνος: μία ορατή γραμμή με την κόκκινη τελεία, όχι σε κουτί.
export function AttentionPanel({ ctx }: { ctx: ClientPageCtx }) {
  const line = ctx.d.attention;
  if (!line) return null;
  return (
    <section className="b2-attention" aria-labelledby="b2-attention-title">
      <h2 id="b2-attention-title" className="ml-box-title">
        Χρειάζεται προσοχή
      </h2>
      <Lines label="Χρειάζεται προσοχή">
        <Line
          mark="!"
          isUrgent
          title={line.text}
          quick={
            <Link href={clientTabHref(ctx.client.id, line.tab)}>
              Λεπτομέρειες →
            </Link>
          }
        />
      </Lines>
    </section>
  );
}
