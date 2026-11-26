// PROTOTYPE — throwaway, branch prototype/clients-three-levels. Διαλέγει την παραλλαγή της λίστας Πελατών.
import { ListA } from "./list-a";
import { ListB } from "./list-b";
import { ListC } from "./list-c";
import { ListD } from "./list-d";
import { ListE } from "./list-e";
import type { ProtoListProps } from "./list-parts";

import "../b2.css";
import "./prototype.css";

const VIEWS = {
  A: ListA,
  B: ListB,
  C: ListC,
  D: ListD,
  E: ListE,
} as const;

export function ProtoList(props: ProtoListProps) {
  const View = VIEWS[props.variant];
  return <View {...props} />;
}
