// Οι ρυθμίσεις AI του DMS (ADR 0016): ένα αρχείο, στον κώδικα, όχι Ρύθμιση του admin. Κάθε κλήση περνά από το Vercel AI
// Gateway με OIDC (string ids «πάροχος/μοντέλο»), χωρίς κλειδιά παρόχων. Αλλαγή μοντέλου embedding = «Ξαναφτιάξε τη μνήμη».

export const AI_MODELS = {
  chat: "openai/gpt-4.1-mini",
  embedding: "openai/text-embedding-3-small",
  // Το Gateway δίνει rerank (rerankingModel / rerank() του AI SDK)· το χρησιμοποιεί ο Βοηθός (Lγ), όχι η αναζήτηση A8.
  rerank: "voyage/rerank-2.5",
} as const;

// Πρέπει να ταιριάζει με το vector(1536) του knowledge_chunks.
export const EMBEDDING_DIMENSIONS = 1536;

export type AiPurpose = "embed" | "search" | "chat" | "invoice";
export type AiAudience = "team" | "client" | "public";

interface ModelPrice {
  input: number; // δολάρια ανά 1M tokens εισόδου
  output: number; // δολάρια ανά 1M tokens εξόδου
}

// Τιμές του Gateway (τιμή παρόχου, χωρίς προμήθεια). $X ανά 1M tokens = X μικρο-δολάρια ανά token.
export const AI_PRICES: Readonly<Record<string, ModelPrice>> = {
  [AI_MODELS.chat]: { input: 0.4, output: 1.6 },
  [AI_MODELS.embedding]: { input: 0.02, output: 0 },
  [AI_MODELS.rerank]: { input: 0.05, output: 0 },
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
