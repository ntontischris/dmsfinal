"use server";

import { after } from "next/server";

import type { FormState } from "@/lib/form-state";
import { kickKnowledgeIndex } from "@/lib/knowledge-index/kick";

import { callRpc, finishWith } from "./action-support";
import { queuedSchema } from "./schemas";

// «Ξαναφτιάξε τη μνήμη του Βοηθού» (L1, knowledge.manage): όλα τα δημοσιευμένα ξαναμπαίνουν στην ουρά (π.χ. μετά από αλλαγή
// μοντέλου embedding). Η βάση ελέγχει το Δικαίωμα· ένας γύρος ξεκινά αμέσως, τα υπόλοιπα τα παίρνει το cron.
export async function rebuildMemory(): Promise<FormState> {
  const outcome = await callRpc("knowledge_index_rebuild", {});
  if (!outcome.ok) return outcome.state;
  after(() => kickKnowledgeIndex());
  const queued = queuedSchema.safeParse(outcome.data);
  const count = queued.success ? queued.data.queued : 0;
  return finishWith(outcome, `Ο Βοηθός ξαναμαθαίνει ${count} ${count === 1 ? "στοιχείο" : "στοιχεία"} μέσα στα επόμενα λεπτά.`);
}
