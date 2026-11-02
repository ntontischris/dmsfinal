import "server-only";

import { cookies } from "next/headers";

import { LOOK_COOKIE, parseLook, type Look } from "@/components/shell/look";

// Διαβάζεται μόνο στο layout του συστήματος (/app), ποτέ στο root: η δημόσια σελίδα μένει στατική.
export const readLook = async (): Promise<Look> =>
  parseLook((await cookies()).get(LOOK_COOKIE)?.value);
