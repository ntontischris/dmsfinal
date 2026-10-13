import { streamText, type LanguageModel } from "ai";

import type { AiState } from "@/lib/ai/budget";

import type { AssistantEvent } from "./events";
import { UNKNOWN_TEXT } from "./labels";
import { MAX_OUTPUT_TOKENS } from "./limits";
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

// Η μία κλήση του μοντέλου chat, με streaming. Κρατά πίσω την αρχή ώσπου να φανεί αν είναι το σήμα «δεν ξέρω».
async function* streamAnswer(
  turn: Turn,
  sources: readonly SourceRef[],
  deps: AssistantDeps,
): AsyncGenerator<AssistantEvent, Streamed> {
  const result = streamText({
    model: deps.chatModel(),
    system: buildSystemPrompt(sources, turn.language),
    prompt: turn.question,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: 1,
  });
  let text = "";
  let verdict: "pending" | "marker" | "answer" = "pending";
  for await (const delta of result.textStream) {
    text += delta;
    if (verdict === "answer") {
      yield { type: "text", delta };
      continue;
    }
    if (verdict === "pending") {
      verdict = markerVerdict(text, false);
      if (verdict === "answer") yield { type: "text", delta: text };
    }
  }
  if (verdict === "pending") {
    verdict = markerVerdict(text, true);
    if (verdict === "answer") yield { type: "text", delta: text };
  }
  const usage = await result.totalUsage;
  await deps.recordChatUsage({
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  });
  return { text: text.trim(), isNoAnswer: verdict === "marker" };
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
  const answer = yield* streamAnswer(turn, sources, deps);
  if (answer.isNoAnswer) {
    yield* unknown(turn, deps);
    return;
  }
  const cited = citedSources(answer.text, sources);
  await deps.reply({
    conversationId,
    content: answer.text,
    sources: cited.map(({ kind, id, title }) => ({ kind, id, title })),
    noSource: false,
  });
  yield { type: "done", sources: cited.map(toSourceView) };
}
