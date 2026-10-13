import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";

import type { AssistantEvent } from "./events";
import { NO_ANSWER_MARKER } from "./limits";
import { runAssistant, type AssistantDeps } from "./pipeline";
import type { AssistantContext } from "./schemas";

const ITEM_A = "11111111-1111-4111-8111-111111111111";
const ITEM_B = "22222222-2222-4222-8222-222222222222";
const PACKAGE = "33333333-3333-4333-8333-333333333333";
const EMBEDDING = [0.1, 0.2];

const chunk = (itemId: string, title: string, similarity: number | null) => ({
  itemId,
  chunkId: null,
  kind: "article" as const,
  title,
  sectionName: "Οδηγοί",
  content: `${title}: κείμενο.`,
  similarity,
});

const CONTEXT: AssistantContext = {
  chunks: [
    chunk(ITEM_A, "Πώς κλείνω Γύρισμα", 0.62),
    chunk(ITEM_B, "Κανόνες στο σετ", 0.45),
  ],
  packages: [
    {
      id: PACKAGE,
      name: "Podcast Start",
      nameEn: "Podcast Start",
      billing: "monthly",
      description: "Ένα επεισόδιο τον μήνα.",
      descriptionEn: "",
      price: 250,
      provisions: [],
      matched: false,
      canOpen: false,
    },
  ],
};

function chatModel(text: string) {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t" },
          ...text
            .match(/.{1,6}/gsu)!
            .map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
          { type: "text-end" as const, id: "t" },
          {
            type: "finish" as const,
            finishReason: { unified: "stop" as const, raw: "stop" },
            usage: {
              inputTokens: {
                total: 900,
                noCache: 900,
                cacheRead: undefined,
                cacheWrite: undefined,
              },
              outputTokens: { total: 40, text: 40, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

function deps(
  overrides: Partial<AssistantDeps> = {},
  model = chatModel("Ανοίγεις την Κράτηση [1]."),
) {
  const value = {
    state: vi.fn(async () => "ok" as const),
    startConversation: vi.fn(async () => "conv-1"),
    appendQuestion: vi.fn(async () => "msg-1"),
    embed: vi.fn(async () => EMBEDDING),
    context: vi.fn(async () => CONTEXT),
    chatModel: vi.fn(() => model),
    reply: vi.fn(async () => undefined),
    unanswered: vi.fn(async () => undefined),
    recordChatUsage: vi.fn(async () => undefined),
    ...overrides,
  };
  return { value, model };
}

async function collect(
  deps: AssistantDeps,
  question = "Πώς κλείνω Γύρισμα;",
): Promise<AssistantEvent[]> {
  const events: AssistantEvent[] = [];
  for await (const event of runAssistant(
    { conversationId: null, question },
    deps,
  ))
    events.push(event);
  return events;
}

const textOf = (events: AssistantEvent[]) =>
  events
    .flatMap((event) => (event.type === "text" ? [event.delta] : []))
    .join("");

describe("runAssistant", () => {
  it("πλαφόν 100%: μήνυμα μη διαθεσιμότητας, χωρίς κλήση AI και χωρίς εγγραφή", async () => {
    const { value, model } = deps({
      state: vi.fn(async () => "capped" as const),
    });
    expect(await collect(value)).toEqual([
      { type: "unavailable", reason: "capped" },
    ]);
    expect(value.startConversation).not.toHaveBeenCalled();
    expect(value.embed).not.toHaveBeenCalled();
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("τίποτα πάνω από το κατώφλι: «δεν ξέρω» χωρίς κλήση chat, και Αναπάντητη με το embedding", async () => {
    const weak: AssistantContext = {
      chunks: [chunk(ITEM_A, "Άσχετο", 0.2), chunk(ITEM_B, "Λέξεις", null)],
      packages: [],
    };
    const { value, model } = deps({ context: vi.fn(async () => weak) });
    const events = await collect(value);
    expect(events.at(-1)).toEqual({
      type: "unknown",
      text: "Δεν το βρίσκω στη Γνώση, οπότε δεν ξέρω.",
    });
    expect(model.doStreamCalls).toHaveLength(0);
    expect(value.recordChatUsage).not.toHaveBeenCalled();
    expect(value.reply).toHaveBeenCalledWith(
      expect.objectContaining({ noSource: true, sources: [] }),
    );
    expect(value.unanswered).toHaveBeenCalledWith({
      conversationId: "conv-1",
      messageId: "msg-1",
      question: "Πώς κλείνω Γύρισμα;",
      embedding: EMBEDDING,
    });
  });

  it("το μοντέλο λέει ότι οι πηγές δεν απαντούν (marker): «δεν ξέρω» στα αγγλικά, Αναπάντητη, και καταγραφή κόστους", async () => {
    const { value } = deps({}, chatModel(NO_ANSWER_MARKER));
    const events = await collect(value, "Do you work on Sundays?");
    expect(textOf(events)).toBe("");
    expect(events.at(-1)).toEqual({
      type: "unknown",
      text: "I can't find this in our knowledge base, so I don't know.",
    });
    expect(value.unanswered).toHaveBeenCalledTimes(1);
    expect(value.recordChatUsage).toHaveBeenCalledWith({
      inputTokens: 900,
      outputTokens: 40,
    });
  });

  it("απάντηση με ροή: πηγές μόνο όσες παρατέθηκαν, καταγραφή usage, χωρίς Αναπάντητη", async () => {
    const { value, model } = deps();
    const events = await collect(value);
    expect(events[0]).toEqual({ type: "conversation", id: "conv-1" });
    expect(textOf(events)).toBe("Ανοίγεις την Κράτηση [1].");
    expect(events.at(-1)).toEqual({
      type: "done",
      sources: [
        {
          kind: "item",
          id: ITEM_A,
          title: "Πώς κλείνω Γύρισμα",
          href: `/app/knowledge/${ITEM_A}`,
        },
      ],
    });
    expect(value.reply).toHaveBeenCalledWith({
      conversationId: "conv-1",
      content: "Ανοίγεις την Κράτηση [1].",
      sources: [{ kind: "item", id: ITEM_A, title: "Πώς κλείνω Γύρισμα" }],
      noSource: false,
    });
    expect(value.unanswered).not.toHaveBeenCalled();
    expect(value.recordChatUsage).toHaveBeenCalledWith({
      inputTokens: 900,
      outputTokens: 40,
    });
    expect(model.doStreamCalls[0]?.maxOutputTokens).toBe(800);
  });

  it("συνεχίζει την ίδια Συζήτηση χωρίς νέα", async () => {
    const { value } = deps();
    for await (const event of runAssistant(
      { conversationId: "conv-9", question: "Και μετά;" },
      value,
    ))
      void event;
    expect(value.startConversation).not.toHaveBeenCalled();
    expect(value.appendQuestion).toHaveBeenCalledWith("conv-9", "Και μετά;");
  });

  it("Πακέτο που ταιριάζει περνά το κατώφλι και παρατίθεται ως Πακέτο", async () => {
    const priced: AssistantContext = {
      chunks: [],
      packages: [{ ...CONTEXT.packages[0]!, matched: true }],
    };
    const { value } = deps(
      { context: vi.fn(async () => priced) },
      chatModel("Το Podcast Start κοστίζει 250,00 € + ΦΠΑ [1]."),
    );
    const events = await collect(value, "Πόσο κοστίζει το podcast;");
    expect(events.at(-1)).toEqual({
      type: "done",
      sources: [
        { kind: "package", id: PACKAGE, title: "Podcast Start", href: null },
      ],
    });
  });

  it("σφάλμα του μοντέλου στη μέση: γεγονός σφάλματος, και το κόστος γράφεται με εκτίμηση (χαρακτήρες/3)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start" as const, id: "t" },
            { type: "text-delta" as const, id: "t", delta: "Ανοίγεις την" },
            { type: "error" as const, error: new Error("provider down") },
          ],
        }),
      }),
    });
    const { value } = deps({}, broken);
    await expect(collect(value)).rejects.toThrow("Η κλήση του μοντέλου δεν ολοκληρώθηκε");
    expect(value.recordChatUsage).toHaveBeenCalledTimes(1);
    const usage = vi.mocked(value.recordChatUsage).mock.calls[0]![0];
    expect(usage.outputTokens).toBe(Math.ceil("Ανοίγεις την".length / 3));
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(value.reply).not.toHaveBeenCalled();
  });

  it("σήμα «δεν ξέρω» μετά από κείμενο: πάλι «δεν ξέρω» και Αναπάντητη", async () => {
    const { value } = deps({}, chatModel(`Δεν είμαι σίγουρος. ${NO_ANSWER_MARKER}`));
    const events = await collect(value);
    expect(events.at(-1)?.type).toBe("unknown");
    expect(value.unanswered).toHaveBeenCalledTimes(1);
  });

  it("απάντηση χωρίς καμία παραπομπή: γράφεται ως «χωρίς πηγή»", async () => {
    const { value } = deps({}, chatModel("Ανοίγεις την Κράτηση."));
    const events = await collect(value);
    expect(events.at(-1)).toEqual({ type: "done", sources: [] });
    expect(value.reply).toHaveBeenCalledWith(expect.objectContaining({ noSource: true, sources: [] }));
  });
});
