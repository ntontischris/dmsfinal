import { aiAvailable } from "@/lib/ai/available";
import type { AiAudience } from "@/lib/ai/config";
import { embedQuery } from "@/lib/ai/embed";
import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import { parseSearch, type SearchResult } from "./view-schema";

// Αναζήτηση A8 (Γ8): το hybrid search της μνήμης (λέξεις + νόημα, μόνο το Κοινό του Χρήστη). Το embedding της ερώτησης
// καταγράφει το κόστος του (σκοπός «search»). Χωρίς AI ή αν κάτι αποτύχει: μόνο λέξεις (knowledge_search), χωρίς σφάλμα.

async function questionEmbedding(
  q: string,
  audience: AiAudience,
): Promise<number[] | null> {
  if (!aiAvailable() || q.trim() === "") return null;
  try {
    return await embedQuery(q, { purpose: "search", audience });
  } catch (error) {
    console.error(
      "searchKnowledge embedding:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function searchKnowledge(
  q: string,
  audience: AiAudience,
): Promise<ReadResult<SearchResult>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const embedding = await questionEmbedding(q, audience);
  if (embedding) {
    const hybrid = await read(
      "searchKnowledgeHybrid",
      supabase.rpc("knowledge_search_hybrid", {
        p_q: q,
        p_embedding: JSON.stringify(embedding),
      }),
      parseSearch,
    );
    if (hybrid.ok) return hybrid;
  }
  return read(
    "searchKnowledge",
    supabase.rpc("knowledge_search", { p_q: q }),
    parseSearch,
  );
}
