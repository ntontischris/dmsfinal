// PROTOTYPE — throwaway, branch prototype/clients-three-levels. Διαλέγει την παραλλαγή της Σελίδας Πελάτη.
import { ClientNotices } from "../b2-briefing";
import { ClientA } from "./client-a";
import { ClientB } from "./client-b";
import { ClientC } from "./client-c";
import { ClientD } from "./client-d";
import { ClientE } from "./client-e";
import type { ProtoClientProps } from "./client-parts";

import "./prototype.css";

const VIEWS = {
  A: ClientA,
  B: ClientB,
  C: ClientC,
  D: ClientD,
  E: ClientE,
} as const;

export function ProtoClient(props: ProtoClientProps) {
  const View = VIEWS[props.variant];
  return (
    <div className="b2 pc-client">
      <ClientNotices ctx={props.ctx} />
      <View {...props} />
    </div>
  );
}
