import { beforeEach, describe, expect, it, vi } from "vitest";

const callRpc = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabase: vi.fn() }));
vi.mock("./action-support", async (importActual) => ({
  ...(await importActual<typeof import("./action-support")>()),
  callRpc: (name: string, args: Record<string, unknown>) => callRpc(name, args),
}));

const { bookFilming } = await import("./actions-book");

const FILMING = "11111111-1111-4111-8111-111111111111";
const TEMPLATE = "22222222-2222-4222-8222-222222222222";
const MESSAGE = "33333333-3333-4333-8333-333333333333";

const answers: Record<string, unknown> = {
  filming_create: FILMING,
  message_request_create_filming: { id: FILMING },
  crew_templates_view: [
    { id: TEMPLATE, name: "Βασικό", note: null, members: [] },
  ],
  equipment_templates_view: [{ id: TEMPLATE, name: "Βασικό" }],
};

const formOf = (extra: Record<string, string>): FormData => {
  const form = new FormData();
  const fields = {
    agreementId: "44444444-4444-4444-8444-444444444444",
    date: "2026-11-23",
    time: "10:00",
    hours: "2",
    kindLabel: "Βίντεο",
    ...extra,
  };
  Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  return form;
};

const appliedTemplates = () =>
  callRpc.mock.calls
    .map(([name]) => name)
    .filter((name) => String(name).endsWith("_apply_template"));

describe("bookFilming", () => {
  beforeEach(() => {
    callRpc.mockReset();
    callRpc.mockImplementation(async (name: string) => ({
      ok: true,
      data: answers[name] ?? null,
    }));
  });

  it("should apply the default templates when a filming is booked with templates", async () => {
    await expect(
      bookFilming({}, formOf({ withTemplates: "1" })),
    ).rejects.toThrow(`redirect:/app/filming/${FILMING}`);
    expect(appliedTemplates()).toEqual([
      "filming_crew_apply_template",
      "filming_equipment_apply_template",
    ]);
  });

  it("should apply the default templates when a filming is booked from a request", async () => {
    await expect(
      bookFilming(
        {},
        formOf({ withTemplates: "1", requestMessageId: MESSAGE }),
      ),
    ).rejects.toThrow(`redirect:/app/filming/${FILMING}`);
    expect(appliedTemplates()).toEqual([
      "filming_crew_apply_template",
      "filming_equipment_apply_template",
    ]);
  });
});
