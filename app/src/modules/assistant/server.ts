import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { aiState } from "@/lib/ai/budget";
import { AI_MODELS, type AiAudience } from "@/lib/ai/config";
import { embedQuery } from "@/lib/ai/embed";
import { languageModel } from "@/lib/ai/providers";
import { recordUsage } from "@/lib/ai/usage";
import { rpcMessage } from "@/lib/rpc-error";
import { createSupabase } from "@/lib/supabase/server";
import { getViewer } from "@/modules/access";

import { encodeEvent, type AssistantEvent } from "./events";
import { ERROR_TEXT } from "./labels";
import { runAssistant, type AssistantDeps } from "./pipeline";
import { contextSchema, requestSchema } from "./schemas";
import { writeReply, writeUnanswered } from "./writes";

// Ο server του Βοηθού (POST /api/assistant): επαληθεύει τον Χρήστη (getUser μέσω getViewer), ελέγχει την ερώτηση (Zod) και
// στέλνει την απάντηση ως ροή NDJSON. Ποτέ uid από το αίτημα.

const idSchema = z.object({ id: z.string() });

class AssistantError extends Error {}

async function rpcId(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new AssistantError(rpcMessage(error, ERROR_TEXT));
  const parsed = idSchema.safeParse(data);
  if (!parsed.success) throw new AssistantError(ERROR_TEXT);
  return parsed.data.id;
}

function realDeps(
  supabase: SupabaseClient,
  userId: string,
  audience: AiAudience,
): AssistantDeps {
  return {
    state: () => aiState(audience, ["embedding", "chat"]),
    startConversation: (language) =>
      rpcId(supabase, "assistant_conversation_start", { p_language: language }),
    appendQuestion: (conversationId, question) =>
      rpcId(supabase, "assistant_message_append", {
        p_conversation: conversationId,
        p_role: "user",
        p_content: question,
      }),
    embed: (question) => embedQuery(question, { purpose: "chat", audience }),
    context: async (question, embedding) => {
      const { data, error } = await supabase.rpc("assistant_context", {
        p_q: question,
        p_embedding: JSON.stringify(embedding),
      });
      if (error) throw new AssistantError(rpcMessage(error, ERROR_TEXT));
      return contextSchema.parse(data);
    },
    chatModel: () => languageModel(),
    reply: (write) => writeReply(userId, write),
    unanswered: (write) => writeUnanswered(userId, write),
    recordChatUsage: (usage) =>
      recordUsage({
        purpose: "chat",
        model: AI_MODELS.chat,
        audience,
        ...usage,
      }),
  };
}

// Η ροή προς το παράθυρο. Σφάλμα στη μέση: ένα γεγονός «error» αντί για κομμένη σύνδεση. Αν ο Χρήστης φύγει (cancel), η κλήση
// του μοντέλου κόβεται (abort) και το κόστος της γράφεται όπως σε κάθε διακοπή.
function toStream(
  events: AsyncGenerator<AssistantEvent>,
  abort: AbortController,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: AssistantEvent,
  ): boolean => {
    if (abort.signal.aborted) return false;
    controller.enqueue(encoder.encode(encodeEvent(event)));
    return true;
  };
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) if (!send(controller, event)) break;
      } catch (error) {
        if (!(error instanceof AssistantError))
          console.error("assistant", error instanceof Error ? error.message : "Άγνωστο σφάλμα");
        send(controller, {
          type: "error",
          message: error instanceof AssistantError ? error.message : ERROR_TEXT,
        });
      }
      if (!abort.signal.aborted) controller.close();
    },
    cancel() {
      abort.abort();
    },
  });
}

// Μέγιστο μέγεθος αιτήματος: η ερώτηση (1.000 χαρακτήρες, έως 4 bytes ο καθένας) και το id της Συζήτησης, με περιθώριο.
const MAX_BODY_BYTES = 8 * 1024;

const fail = (status: number, message: string): Response =>
  Response.json({ error: message }, { status });

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return undefined;
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function handleAssistantRequest(
  request: Request,
): Promise<Response> {
  const [viewer, supabase] = await Promise.all([getViewer(), createSupabase()]);
  if (viewer.status !== "signed-in" || !supabase)
    return fail(401, "Χρειάζεται είσοδος.");
  const body = await readBody(request);
  if (body === undefined) return fail(413, "Η ερώτηση ξεπερνά τους 1.000 χαρακτήρες.");
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return fail(400, parsed.error.issues[0]?.message ?? ERROR_TEXT);
  const audience: AiAudience = viewer.team ? "team" : "client";
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const events = runAssistant(
    { ...parsed.data, abortSignal: abort.signal },
    realDeps(supabase, viewer.userId, audience),
  );
  return new Response(toStream(events, abort), {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
