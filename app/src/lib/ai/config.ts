// Οι ρυθμίσεις AI του DMS (ADR 0016, τροποποίηση 2026-10-13): ένα αρχείο, στον κώδικα, όχι Ρύθμιση του admin. Κάθε κλήση
// πηγαίνει κατευθείαν στον πάροχο με το κλειδί της εταιρείας από το περιβάλλον (OPENAI_API_KEY, ANTHROPIC_API_KEY,
// GOOGLE_GENERATIVE_AI_API_KEY), ποτέ στο repo. Τα ids είναι «πάροχος/μοντέλο» και τα λύνει το providers.ts.
// Αλλαγή chat = μία γραμμή εδώ (με τιμή στο AI_PRICES). Αλλαγή embedding = «Ξαναφτιάξε τη μνήμη» (και ίδιες 1536 διαστάσεις).

export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
export type AiModelId = `${AiProvider}/${string}`;

export const AI_MODELS: { readonly chat: AiModelId; readonly embedding: AiModelId } = {
  chat: "openai/gpt-4.1-mini",
  embedding: "openai/text-embedding-3-small",
};

// Πρέπει να ταιριάζει με το vector(1536) του knowledge_chunks.
export const EMBEDDING_DIMENSIONS = 1536;

export type AiPurpose = "embed" | "search" | "chat" | "invoice";
export type AiAudience = "team" | "client" | "public";

interface ModelPrice {
  input: number; // δολάρια ανά 1M tokens εισόδου
  output: number; // δολάρια ανά 1M tokens εξόδου
}

// Τιμές καταλόγου των παρόχων. $X ανά 1M tokens = X μικρο-δολάρια ανά token. Υπάρχουν και μοντέλα που δεν χρησιμοποιούνται
// τώρα, ώστε η αλλαγή του chat να είναι μία γραμμή στο AI_MODELS. Μοντέλο χωρίς τιμή: σφάλμα στο costMicros.
export const AI_PRICES: Readonly<Record<string, ModelPrice>> = {
  "openai/gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "openai/gpt-4.1": { input: 2, output: 8 },
  "anthropic/claude-haiku-4-5": { input: 1, output: 5 },
  "anthropic/claude-sonnet-4-5": { input: 3, output: 15 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "openai/text-embedding-3-small": { input: 0.02, output: 0 },
};

// Κόστος μιας κλήσης σε μικρο-δολάρια (ακέραιο, στρογγυλεμένο προς τα πάνω). Άγνωστο μοντέλο: σφάλμα, ώστε να μη μετρά μηδέν.
export function costMicros(
  model: string,
  inputTokens: number,
  outputTokens = 0,
): number {
  const price = AI_PRICES[model];
  if (!price) throw new Error(`Δεν υπάρχει τιμή για το μοντέλο ${model}`);
  const input = Math.max(0, inputTokens);
  const output = Math.max(0, outputTokens);
  return Math.ceil(input * price.input + output * price.output);
}
