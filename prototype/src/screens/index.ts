import type { ComponentType } from "react";

import { A5 } from "@/screens/A5";
import { A6 } from "@/screens/A6";
import { A7 } from "@/screens/A7";
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
import type { ScreenProps } from "@/screens/shared";

// Οι οθόνες που έχουν πραγματικό περιεχόμενο. Όλες οι άλλες δείχνουν ακόμα το placeholder.
export const SCREEN_CONTENT: Readonly<
  Record<string, ComponentType<ScreenProps>>
> = {
  A5,
  A6,
  A7,
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
};
