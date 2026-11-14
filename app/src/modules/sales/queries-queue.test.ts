import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabase: async () => ({ rpc: mocks.rpc }),
}));

import { listDuplicatePairs } from "./queries-queue";

const side = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Πελάτης ${id}`,
  legal_name: "",
  afm: null,
  city: "",
  contact_name: "Επαφή",
  contact_email: "e@example.com",
  contact_phone: "",
  manager_name: null,
  opportunities: 1,
  agreements: [],
  productions: 0,
  invoices: 0,
  client_users: 0,
  ...extra,
});

describe("listDuplicatePairs", () => {
  beforeEach(() => mocks.rpc.mockReset());

  it("should show each side's Agreements with kind and state, and its key records", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          flag_id: "f1",
          reason: "phone",
          created_at: "2026-11-01T10:00:00+00:00",
          candidate: side("c2"),
          existing: side("c1", {
            agreements: [
              { title: "Μηνιαίο Social", state: "active", kind: "monthly" },
              { title: "Σποτ Πάσχα", state: "proposal", kind: "one_off" },
            ],
            productions: 3,
            invoices: 5,
            client_users: 2,
          }),
        },
      ],
      error: null,
    });
    const result = await listDuplicatePairs();
    if (!result.ok) throw new Error("η ανάγνωση απέτυχε");
    const [pair] = result.data;
    expect(pair?.existing).toMatchObject({
      agreements: [
        { title: "Μηνιαίο Social", label: "μηνιαία, ενεργή" },
        { title: "Σποτ Πάσχα", label: "εφάπαξ, πρόταση" },
      ],
      productions: 3,
      invoices: 5,
      clientUsers: 2,
    });
    expect(pair?.candidate.agreements).toEqual([]);
  });

  it("should reject a side with an unknown Agreement state", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          flag_id: "f1",
          reason: "phone",
          created_at: "2026-11-01T10:00:00+00:00",
          candidate: side("c2"),
          existing: side("c1", {
            agreements: [{ title: "Χ", state: "unknown", kind: "monthly" }],
          }),
        },
      ],
      error: null,
    });
    await expect(listDuplicatePairs()).rejects.toThrow();
  });
});
