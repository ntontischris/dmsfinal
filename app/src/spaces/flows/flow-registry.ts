// Το μητρώο των οδηγών (flow-studio, prototype στο proto/flows): τα βήματα κάθε δουλειάς, ένα ανά γραμμή του Steps
// στο docs/flows/<job>/flow.md. Καθαρό αρχείο: το διαβάζει και ο browser. Οι βοηθοί πλοήγησης είναι στο flows.ts.
// Κάθε δουλειά ζει στο δικό της αρχείο (flow-<job>.ts)· οι τύποι στο flow-types.ts.

import { APANTO } from "./flow-apanto";
import { EGKRINO } from "./flow-egkrino";
import { STINO } from "./flow-stino";
import type { Flow } from "./flow-types";

export * from "./flow-types";

export const FLOWS: readonly Flow[] = [STINO, APANTO, EGKRINO];
