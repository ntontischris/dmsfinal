import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getViewer: vi.fn(),
  runAssistant: vi.fn(),
  writeReply: vi.fn(async () => undefined),
}));
vi.mock("@/modules/access", () => ({ getViewer: mocks.getViewer }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabase: async () => ({ rpc: vi.fn() }),
}));
vi.mock("@/lib/ai/budget", () => ({ aiState: vi.fn() }));
vi.mock("@/lib/ai/embed", () => ({ embedQuery: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ languageModel: vi.fn() }));
vi.mock("@/lib/ai/usage", () => ({ recordUsage: vi.fn() }));
vi.mock("./writes", () => ({
  writeReply: mocks.writeReply,
  writeUnanswered: vi.fn(),
}));
vi.mock("./pipeline", () => ({ runAssistant: mocks.runAssistant }));

import { handleAssistantRequest } from "./server";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";

const post = (body: unknown) =>
  new Request("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

afterEach(() => vi.clearAllMocks());

describe("handleAssistantRequest", () => {
  it("χωρίς συνδεδεμένο Χρήστη: 401, χωρίς να φτάσει στον Βοηθό", async () => {
    mocks.getViewer.mockResolvedValue({ status: "anonymous" });
    const response = await handleAssistantRequest(post({ question: "Γεια" }));
    expect(response.status).toBe(401);
    expect(mocks.runAssistant).not.toHaveBeenCalled();
  });

  it("ερώτηση πάνω από 1.000 χαρακτήρες ή πολύ μεγάλο αίτημα: σφάλμα χωρίς κλήση", async () => {
    mocks.getViewer.mockResolvedValue({
      status: "signed-in",
      userId: USER,
      email: "",
      team: null,
    });
    expect(
      (await handleAssistantRequest(post({ question: "α".repeat(1001) })))
        .status,
    ).toBe(400);
    expect(
      (await handleAssistantRequest(post({ question: "α".repeat(5000) })))
        .status,
    ).toBe(413);
    expect(mocks.runAssistant).not.toHaveBeenCalled();
  });

  it("ο Χρήστης είναι πάντα αυτός της συνεδρίας, ποτέ uid από το σώμα του αιτήματος", async () => {
    mocks.getViewer.mockResolvedValue({
      status: "signed-in",
      userId: USER,
      email: "",
      team: null,
    });
    mocks.runAssistant.mockImplementation(async function* () {
      yield { type: "unknown", text: "x" };
    });
    const response = await handleAssistantRequest(
      post({ question: "Πώς κλείνω Γύρισμα;", userId: OTHER, p_user: OTHER }),
    );
    expect(response.status).toBe(200);
    const [input, deps] = mocks.runAssistant.mock.calls[0]!;
    expect(input).toEqual({
      conversationId: null,
      question: "Πώς κλείνω Γύρισμα;",
      abortSignal: expect.any(AbortSignal),
    });
    await deps.reply({
      conversationId: "c",
      content: "x",
      sources: [],
      noSource: true,
    });
    expect(mocks.writeReply).toHaveBeenCalledWith(USER, expect.anything());
    expect(await response.text()).toBe('{"type":"unknown","text":"x"}\n');
  });
});
