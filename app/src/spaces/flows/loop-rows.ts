// Οι γραμμές ενός οδηγού που γυρνά, για τον browser: «Απαντώ σε Πελάτες» διαβάζει όλη τη λίστα «Χρειάζονται εμένα»,
// οι άλλοι τον κανόνα ουράς τους (πόσα μένουν + το πιο παλιό). null = δεν διαβάστηκαν.

import { loadEgkrinoLoop } from "./flow-egkrino-rows";
import { loadJobDigests } from "./flow-digests";
import { pathOf } from "./flows";
import { loadNeedsMe } from "./flow-needs";
import type { LoopRow } from "./loop-run";

export interface LoopData {
  rows: readonly LoopRow[];
  // Πόσες περιμένουν (στον κανόνα ουράς μπορεί να είναι περισσότερες από τις γραμμές).
  count: number;
}

const fromNeeds = async (): Promise<LoopData | null> => {
  const rows = await loadNeedsMe();
  if (!rows) return null;
  return {
    rows: rows.map(({ key, href, kind }) => ({ key, href, kind })),
    count: rows.length,
  };
};

const fromDigest = async (job: string): Promise<LoopData | null> => {
  const result = await loadJobDigests();
  const digest = result.jobs.find((item) => item.job === job);
  if (!digest) return null;
  const { oldest } = digest;
  return {
    rows: oldest ? [{ key: pathOf(oldest.href), href: oldest.href }] : [],
    count: digest.count,
  };
};

const LOADERS: Readonly<Record<string, () => Promise<LoopData | null>>> = {
  "apanto-se-pelates": fromNeeds,
  // Όλες οι γραμμές ζουν στο /app/filming/queue: το κλειδί είναι το ?req= (rowKeyOf).
  "egkrino-gyrismata": loadEgkrinoLoop,
};

export const loadLoopRows = async (job: string): Promise<LoopData | null> => {
  try {
    return await (LOADERS[job] ?? (() => fromDigest(job)))();
  } catch (error) {
    console.error("flows.loop", error);
    return null;
  }
};
