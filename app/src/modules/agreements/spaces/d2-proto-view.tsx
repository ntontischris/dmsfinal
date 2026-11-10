// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Η είσοδος των παραλλαγών: ίδια δεδομένα και ίδιες ενέργειες με τη σημερινή D2· αλλάζει μόνο το δέντρο που ζωγραφίζεται.

import { VariantA } from "./d2-proto-a";
import { VariantB } from "./d2-proto-b";
import type { ProtoCtx } from "./d2-proto-blocks";
import { VariantC } from "./d2-proto-c";
import type { ProtoVariant } from "./d2-proto-model";
import { ProtoSwitcher } from "./d2-proto-switcher";

export function D2ProtoView({
  variant,
  ctx,
}: {
  variant: ProtoVariant;
  ctx: ProtoCtx;
}) {
  return (
    <>
      {variant === "a" && <VariantA ctx={ctx} />}
      {variant === "b" && <VariantB ctx={ctx} />}
      {variant === "c" && <VariantC ctx={ctx} />}
      <ProtoSwitcher current={variant} />
    </>
  );
}
