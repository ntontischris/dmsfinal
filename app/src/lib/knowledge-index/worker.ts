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
// (Gateway, Storage, χρονικό όριο) → knowledge_index_fail· το backoff το έχει ορίσει ήδη το claim. Χωρίς AI: δεν παίρνει
// τίποτα, τα στοιχεία μένουν στην ουρά. Παίρνει ένα στοιχείο τη φορά, ώστε ό,τι δεν προλαβαίνει να μη μετρά ως προσπάθεια.

const KNOWLEDGE_BUCKET = "knowledge";
// Ένας γύρος μέσα στα 60s του cron: νέο στοιχείο ξεκινά μόνο στα πρώτα 30s, και κάθε στοιχείο έχει έως 20s.
export const ROUND_BUDGET_MS = 30_000;
export const ITEM_TIMEOUT_MS = 20_000;

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
  limit?: number; // έως τόσα στοιχεία στον γύρο
  budgetMs?: number;
  itemTimeoutMs?: number;
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
  abortSignal: AbortSignal,
): Promise<"indexed" | "stale"> {
  const { text, status } = await readItemText(admin, item);
  const chunks = buildChunks(item, text);
  const embeddings = await embedTexts(chunks, {
    purpose: "embed",
    audience: "team",
    model,
    abortSignal,
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

async function claimOne(
  admin: SupabaseClient,
  itemId: string | undefined,
): Promise<Claimed | undefined> {
  const { data, error } = await admin.rpc("knowledge_index_claim", {
    p_limit: 1,
    p_item: itemId ?? null,
  });
  if (error) throw new Error(error.message);
  return claimedSchema.parse(data).items[0];
}

// Ένα στοιχείο με χρονικό όριο: στο όριο κόβεται και η κλήση στο Gateway.
async function indexWithTimeout(
  admin: SupabaseClient,
  item: Claimed,
  options: IndexOptions,
): Promise<"indexed" | "stale"> {
  const ms = options.itemTimeoutMs ?? ITEM_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Χρονικό όριο ${Math.round(ms / 1000)}s`));
    }, ms);
  });
  try {
    return await Promise.race([
      indexItem(admin, item, options.model, controller.signal),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runKnowledgeIndex(
  admin: SupabaseClient,
  options: IndexOptions = {},
): Promise<IndexSummary> {
  const summary: IndexSummary = { indexed: 0, stale: 0, failed: 0 };
  if (!options.model && !aiAvailable())
    return { ...summary, skipped: "ai-unavailable" };
  const deadline = Date.now() + (options.budgetMs ?? ROUND_BUDGET_MS);
  const limit = options.itemId ? 1 : (options.limit ?? 10);
  for (let done = 0; done < limit && Date.now() < deadline; done += 1) {
    const item = await claimOne(admin, options.itemId);
    if (!item) break;
    try {
      summary[await indexWithTimeout(admin, item, options)] += 1;
    } catch (error) {
      await markFailed(admin, item, error);
      summary.failed += 1;
    }
  }
  return summary;
}
