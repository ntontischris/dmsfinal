// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Η είσοδος των παραλλαγών: ίδια δεδομένα με τη σημερινή σελίδα (+ Δραστηριότητες, κινήσεις Καρτέλας, ληξιπρόθεσμα),
// και μόνο το δέντρο που ζωγραφίζεται αλλάζει.

import { isOwner } from "@/modules/access";

import { VariantA } from "./b2-proto-a";
import { VariantB } from "./b2-proto-b";
import { VariantC } from "./b2-proto-c";
import { loadProto } from "./b2-proto-load";
import { deriveProto, type ProtoCtx, type ProtoProps } from "./b2-proto-parts";
import { KeepVariant } from "./b2-proto-switcher";

export async function B2ProtoView(props: ProtoProps) {
  const proto = await loadProto({
    clientId: props.client.id,
    canSeeLedger:
      props.allowed.includes("ledger") && props.data.ledger !== null,
    hasOverdue: (props.data.ledger?.overdue ?? 0) > 0,
    who: {
      userId: props.caps.userId,
      isOwner: isOwner(props.viewer),
      canManage: props.caps.canManage,
    },
  });
  const ctx: ProtoCtx = { ...props, proto, d: deriveProto(props) };
  return (
    <KeepVariant variant={props.variant}>
      {props.variant === "a" && <VariantA ctx={ctx} />}
      {props.variant === "b" && <VariantB ctx={ctx} />}
      {props.variant === "c" && <VariantC ctx={ctx} />}
    </KeepVariant>
  );
}
