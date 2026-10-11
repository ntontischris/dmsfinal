import { can, type Viewer } from "@/modules/access";

import type { CostsCaps } from "./types";

// Τι δικαιούται ο θεατής στο κόστος: «Βλέπει κόστος και κερδοφορία». Η βάση ξαναελέγχει σε κάθε RPC.
export const costsCaps = (viewer: Viewer): CostsCaps => ({
  canView: can(viewer, "finance.cost"),
});
