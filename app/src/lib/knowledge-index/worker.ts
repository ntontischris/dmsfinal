import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmbeddingModel } from "ai";
import { z } from "zod";

import { aiAvailable } from "@/lib/ai/available";
import { AI_MODELS } from "@/lib/ai/config";
import { embedTexts } from "@/lib/ai/embed";

import { buildChunks } from "./chunk";
import { extractFileText, type ExtractStatus } from "./extract";

// Ο εργάτης της μνήμης του Βοηθού: παίρνει στοιχεία από την ουρά (knowledge_index_claim), διαβάζει το κείμενο (Άρθρο ή Αρχείο),
// το κόβει σε κομμάτια με κεφαλίδα, φτιάχνει embeddings μέσω του Gateway και τα γράφει (knowledge_index_store). Αποτυχία
// (Gateway, Storage) → knowledge_index_fail με backoff. Χωρίς AI: δεν παίρνει τίποτα, τα στοιχεία μένουν στην ουρά.

const KNOWLEDGE_BUCKET = "knowledge";

const claimedSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      version: z.number().int(),
      kind: z.enum(["article", "file"]),
      title: z.string(),
      summary: z.string(),
      sectionName: z.string(),
      body: z.string().nullable(),
      storagePath: z.string().nullable(),
      mime: z.string().nullable(),
    }),
  ),
});
const storedSchema = z.object({ stored: z.boolean() });
type Claimed = z.infer<typeof claimedSchema>["items"][number];

export interface IndexOptions {
  itemId?: string; // άμεση προσπάθεια για ένα στοιχείο
  limit?: number;
  budgetMs?: number;
  model?: EmbeddingModel; // μόνο στα τεστ
}

export interface IndexSummary {
  skipped?: "ai-unavailable";
  indexed: number;
  stale: number;
  failed: number;
}

interface ItemText {
  text: string;
  status: ExtractStatus | null;
}

async function readItemText(
  admin: SupabaseClient,
  item: Claimed,
): Promise<ItemText> {
  if (item.kind === "article") return { text: item.body ?? "", status: null };
  if (!item.storagePath || !item.mime) return { text: "", status: "failed" };
  const { data, error } = await admin.storage
    .from(KNOWLEDGE_BUCKET)
    .download(item.storagePath);
  if (error || !data)
    throw new Error(`Το Αρχείο δεν κατέβηκε: ${error?.message ?? "άγνωστο"}`);
  const extracted = await extractFileText(
    new Uint8Array(await data.arrayBuffer()),
    item.mime,
  );
  return { text: extracted.text, status: extracted.status };
}

async function indexItem(
  admin: SupabaseClient,
  item: Claimed,
  model: EmbeddingModel | undefined,
): Promise<"indexed" | "stale"> {
  const { text, status } = await readItemText(admin, item);
  const chunks = buildChunks(item, text);
  const embeddings = await embedTexts(chunks, {
    purpose: "embed",
    audience: "team",
    model,
  });
  const { data, error } = await admin.rpc("knowledge_index_store", {
    p_item: item.itemId,
    p_version: item.version,
    p_text_status: status,
    p_model: AI_MODELS.embedding,
    p_chunks: chunks.map((content, index) => ({
      content,
      embedding: embeddings[index],
    })),
  });
  if (error) throw new Error(error.message);
  return storedSchema.safeParse(data).data?.stored ? "indexed" : "stale";
}

async function markFailed(
  admin: SupabaseClient,
  item: Claimed,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Άγνωστο σφάλμα";
  console.error("knowledge index", item.itemId, message);
  const { error: rpcError } = await admin.rpc("knowledge_index_fail", {
    p_item: item.itemId,
    p_version: item.version,
    p_error: message,
  });
  if (rpcError) console.error("knowledge_index_fail", rpcError.message);
}

async function claim(
  admin: SupabaseClient,
  options: IndexOptions,
): Promise<Claimed[]> {
  const { data, error } = await admin.rpc("knowledge_index_claim", {
    p_limit: options.limit ?? 10,
    p_item: options.itemId ?? null,
  });
  if (error) throw new Error(error.message);
  return claimedSchema.parse(data).items;
}

export async function runKnowledgeIndex(
  admin: SupabaseClient,
  options: IndexOptions = {},
): Promise<IndexSummary> {
  const summary: IndexSummary = { indexed: 0, stale: 0, failed: 0 };
  if (!options.model && !aiAvailable())
    return { ...summary, skipped: "ai-unavailable" };
  const deadline = Date.now() + (options.budgetMs ?? 45_000);
  for (const item of await claim(admin, options)) {
    // Ό,τι δεν προλαβαίνει μένει κλειδωμένο 5′ και το ξαναπαίρνει το επόμενο cron.
    if (Date.now() > deadline) break;
    try {
      summary[await indexItem(admin, item, options.model)] += 1;
    } catch (error) {
      await markFailed(admin, item, error);
      summary.failed += 1;
    }
  }
  return summary;
}
