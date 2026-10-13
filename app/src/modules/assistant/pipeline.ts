import { streamText, type LanguageModel } from "ai";

import type { AiState } from "@/lib/ai/budget";

import type { AssistantEvent } from "./events";
import { UNKNOWN_TEXT } from "./labels";
import { MAX_OUTPUT_TOKENS, NO_ANSWER_MARKER } from "./limits";
import {
  buildSources,
  buildSystemPrompt,
  citedSources,
  detectLanguage,
  hasRelevantSource,
  markerVerdict,
  toSourceView,
  type Language,
  type SourceRef,
} from "./prompt";
import type { AssistantContext } from "./schemas";

// Μία ερώτηση στον Βοηθό, από την αρχή ως το τέλος (κεφ. 8 Β, Γ3, Γ7). Οι κλήσεις προς βάση και AI έρχονται ως εξαρτήσεις,
// ώστε τα τεστ να τρέχουν με mock μοντέλα.

export interface ReplyWrite {
  conversationId: string;
  content: string;
  sources: readonly { kind: "item" | "package"; id: string; title: string }[];
  noSource: boolean;
}

export interface UnansweredWrite {
  conversationId: string;
  messageId: string;
  question: string;
  embedding: readonly number[];
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AssistantDeps {
  state: () => Promise<AiState>;
  startConversation: (language: Language) => Promise<string>;
  appendQuestion: (conversationId: string, question: string) => Promise<string>;
  embed: (question: string) => Promise<number[]>;
  context: (
    question: string,
    embedding: readonly number[],
  ) => Promise<AssistantContext>;
  chatModel: () => LanguageModel;
  reply: (write: ReplyWrite) => Promise<void>;
  unanswered: (write: UnansweredWrite) => Promise<void>;
  recordChatUsage: (usage: ChatUsage) => Promise<void>;
}

export interface AssistantInput {
  conversationId: string | null;
  question: string;
  abortSignal?: AbortSignal;
}

interface Turn {
  conversationId: string;
  messageId: string;
  question: string;
  language: Language;
  embedding: number[];
}

// «Δεν ξέρω»: απάντηση χωρίς πηγή στη Συζήτηση και Αναπάντητη με το embedding της ερώτησης.
async function* unknown(
  turn: Turn,
  deps: AssistantDeps,
): AsyncGenerator<AssistantEvent> {
  const text = UNKNOWN_TEXT[turn.language];
  await deps.reply({
    conversationId: turn.conversationId,
    content: text,
    sources: [],
    noSource: true,
  });
  await deps.unanswered({
    conversationId: turn.conversationId,
    messageId: turn.messageId,
    question: turn.question,
    embedding: turn.embedding,
  });
  yield { type: "unknown", text };
}

interface Streamed {
  text: string;
  isNoAnswer: boolean;
}

// Συντηρητική εκτίμηση όταν δεν υπάρχει πραγματικό usage (σφάλμα, διακοπή): ~1 token ανά 3 χαρακτήρες.
export const estimateTokens = (text: string): number => Math.ceil(text.length / 3);

interface CallState {
  usage: ChatUsage | null;
  failed: boolean;
}

// Μόνο το μήνυμα του σφάλματος: ποτέ το σώμα του αιτήματος, το prompt ή η ερώτηση.
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Άγνωστο σφάλμα";

interface Relay {
  text: string;
  verdict: "pending" | "marker" | "answer";
}

// Προωθεί το κείμενο στο παράθυρο, κρατώντας πίσω την αρχή ώσπου να φανεί αν είναι το σήμα «δεν ξέρω».
async function* relayText(
  stream: AsyncIterable<string>,
  relay: Relay,
): AsyncGenerator<AssistantEvent> {
  for await (const delta of stream) {
    relay.text += delta;
    if (relay.verdict === "answer") {
      yield { type: "text", delta };
      continue;
    }
    relay.verdict = markerVerdict(relay.text, false);
    if (relay.verdict === "answer") yield { type: "text", delta: relay.text };
  }
}

// Το usage του παρόχου, ή null όταν δεν το έδωσε (π.χ. η ροή κόπηκε): τότε μετρά η εκτίμηση, ποτέ μηδέν.
const toChatUsage = (usage: {
  inputTokens?: number;
  outputTokens?: number;
}): ChatUsage | null =>
  usage.inputTokens === undefined && usage.outputTokens === undefined
    ? null
    : { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };

// Η μία κλήση του μοντέλου chat, με streaming. Το κόστος γράφεται ΠΑΝΤΑ (και σε σφάλμα ή διακοπή): με το πραγματικό usage
// αν υπάρχει, αλλιώς με συντηρητική εκτίμηση.
async function* streamAnswer(
  turn: Turn,
  sources: readonly SourceRef[],
  deps: AssistantDeps,
  abortSignal: AbortSignal | undefined,
): AsyncGenerator<AssistantEvent, Streamed> {
  const system = buildSystemPrompt(sources, turn.language);
  const call: CallState = { usage: null, failed: false };
  const result = streamText({
    model: deps.chatModel(),
    system,
    prompt: turn.question,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: 1,
    abortSignal,
    onError: ({ error }) => {
      call.failed = true;
      console.error("assistant chat", errorMessage(error));
    },
    onFinish: ({ totalUsage }) => {
      call.usage = toChatUsage(totalUsage);
    },
  });
  const relay: Relay = { text: "", verdict: "pending" };
  try {
    yield* relayText(result.textStream, relay);
    if (!call.failed && !call.usage && !abortSignal?.aborted)
      call.usage = toChatUsage(await result.totalUsage);
  } catch (error) {
    call.failed = true;
    console.error("assistant chat", errorMessage(error));
  } finally {
    await deps.recordChatUsage(
      call.usage ?? {
        inputTokens: estimateTokens(system) + estimateTokens(turn.question),
        outputTokens: estimateTokens(relay.text),
      },
    );
  }
  if (call.failed || abortSignal?.aborted)
    throw new Error("Η κλήση του μοντέλου δεν ολοκληρώθηκε");
  if (relay.verdict === "pending") {
    relay.verdict = markerVerdict(relay.text, true);
    if (relay.verdict === "answer") yield { type: "text", delta: relay.text };
  }
  return {
    text: relay.text.trim(),
    isNoAnswer: relay.verdict === "marker" || relay.text.includes(NO_ANSWER_MARKER),
  };
}

export async function* runAssistant(
  input: AssistantInput,
  deps: AssistantDeps,
): AsyncGenerator<AssistantEvent> {
  const state = await deps.state();
  if (state !== "ok") {
    yield { type: "unavailable", reason: state };
    return;
  }
  const language = detectLanguage(input.question);
  const conversationId =
    input.conversationId ?? (await deps.startConversation(language));
  yield { type: "conversation", id: conversationId };
  const messageId = await deps.appendQuestion(conversationId, input.question);
  const embedding = await deps.embed(input.question);
  const turn: Turn = {
    conversationId,
    messageId,
    question: input.question,
    language,
    embedding,
  };
  const context = await deps.context(input.question, embedding);
  if (!hasRelevantSource(context)) {
    yield* unknown(turn, deps);
    return;
  }
  const sources = buildSources(context);
  const answer = yield* streamAnswer(turn, sources, deps, input.abortSignal);
  if (answer.isNoAnswer) {
    yield* unknown(turn, deps);
    return;
  }
  const cited = citedSources(answer.text, sources);
  await deps.reply({
    conversationId,
    content: answer.text,
    sources: cited.map(({ kind, id, title }) => ({ kind, id, title })),
    // Απάντηση χωρίς καμία παραπομπή: γράφεται ως «χωρίς πηγή».
    noSource: cited.length === 0,
  });
  yield { type: "done", sources: cited.map(toSourceView) };
}
