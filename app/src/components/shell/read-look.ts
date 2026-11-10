import "server-only";

import { cookies } from "next/headers";

import {
  LOOK_COOKIE,
  defaultLookOf,
  parseLook,
  type Look,
} from "@/components/shell/look";
import { isClientViewer, type Viewer } from "@/modules/access";

// Διαβάζεται μόνο στο σύστημα (/app), ποτέ στο root: η δημόσια σελίδα μένει στατική.
export const readLook = async (): Promise<Look> =>
  parseLook(
    (await cookies()).get(LOOK_COOKIE)?.value,
    defaultLookOf(process.env.DMS_DEFAULT_LOOK),
  );

// Η νέα εμφάνιση: για την ομάδα, για τον Χρήστη πελάτη (με τους 5 Χώρους του) και για την περιήγηση χωρίς βάση.
export const canChooseLook = (viewer: Viewer): boolean =>
  viewer.status === "unconfigured" ||
  (viewer.status === "signed-in" && viewer.team !== null) ||
  isClientViewer(viewer);

// Η εμφάνιση του θεατή: ίδια απόφαση στο layout και στις σελίδες που έχουν και νέα εκδοχή (A1, B1).
export const lookOf = async (viewer: Viewer): Promise<Look> =>
  canChooseLook(viewer) ? readLook() : "classic";
