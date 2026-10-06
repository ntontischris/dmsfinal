import type { ComponentType } from "react";

import { A2 } from "@/screens/A2";
import { A5 } from "@/screens/A5";
import { A6 } from "@/screens/A6";
import { A7 } from "@/screens/A7";
import { A8 } from "@/screens/A8";
import { A9 } from "@/screens/A9";
import { B1 } from "@/screens/B1";
import { B2 } from "@/screens/B2";
import { B3 } from "@/screens/B3";
import { B4 } from "@/screens/B4";
import { B5 } from "@/screens/B5";
import { B6 } from "@/screens/B6";
import { C1 } from "@/screens/C1";
import { C2 } from "@/screens/C2";
import { D1 } from "@/screens/D1";
import { D2 } from "@/screens/D2";
import { D4 } from "@/screens/D4";
import { D5 } from "@/screens/D5";
import { E1 } from "@/screens/E1";
import { E2 } from "@/screens/E2";
import { E3 } from "@/screens/E3";
import { E4 } from "@/screens/E4";
import { E5 } from "@/screens/E5";
import { E6 } from "@/screens/E6";
import { E7 } from "@/screens/E7";
import { F1 } from "@/screens/F1";
import { F2 } from "@/screens/F2";
import { F3 } from "@/screens/F3";
import { G1 } from "@/screens/G1";
import { G2 } from "@/screens/G2";
import { G3 } from "@/screens/G3";
import { H1 } from "@/screens/H1";
import { H2 } from "@/screens/H2";
import { H3 } from "@/screens/H3";
import { H4 } from "@/screens/H4";
import { I1 } from "@/screens/I1";
import { I2 } from "@/screens/I2";
import { I3 } from "@/screens/I3";
import { I4 } from "@/screens/I4";
import { I5 } from "@/screens/I5";
import { I6 } from "@/screens/I6";
import { I7 } from "@/screens/I7";
import { J1 } from "@/screens/J1";
import { J2 } from "@/screens/J2";
import { J3 } from "@/screens/J3";
import { K1 } from "@/screens/K1";
import { K2 } from "@/screens/K2";
import { K3 } from "@/screens/K3";
import { L1 } from "@/screens/L1";
import { L2 } from "@/screens/L2";
import { L3 } from "@/screens/L3";
import { M1 } from "@/screens/M1";
import { M2 } from "@/screens/M2";
import { N1 } from "@/screens/N1";
import { N2 } from "@/screens/N2";
import { N3 } from "@/screens/N3";
import { N4 } from "@/screens/N4";
import { N5 } from "@/screens/N5";
import type { ScreenProps } from "@/screens/shared";

// Οι οθόνες που έχουν πραγματικό περιεχόμενο. Όλες οι άλλες δείχνουν ακόμα το placeholder.
export const SCREEN_CONTENT: Readonly<
  Record<string, ComponentType<ScreenProps>>
> = {
  A2,
  A5,
  A6,
  A7,
  A8,
  A9,
  B1,
  B2,
  B3,
  B4,
  B5,
  B6,
  C1,
  C2,
  D1,
  D2,
  D4,
  D5,
  E1,
  E2,
  E3,
  E4,
  E5,
  E6,
  E7,
  F1,
  F2,
  F3,
  G1,
  G2,
  G3,
  H1,
  H2,
  H3,
  H4,
  I1,
  I2,
  I3,
  I4,
  I5,
  I6,
  I7,
  J1,
  J2,
  J3,
  K1,
  K2,
  K3,
  L1,
  L2,
  L3,
  M1,
  M2,
  N1,
  N2,
  N3,
  N4,
  N5,
};
