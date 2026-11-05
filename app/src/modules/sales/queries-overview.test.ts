import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabase: async () => ({ rpc: mocks.rpc }),
}));

import {
  listClientOverviews,
  parseClientOverviews,
  parseLastContacts,
} from "./queries-overview";

const CLIENT = "11111111-1111-4111-8111-111111111111";
const KIND = "22222222-2222-4222-8222-222222222222";

const dbRow = {
  client_id: CLIENT,
  status: "active",
  active_agreements: 1,
  package_name: "Πακέτο Social",
  provisions: [
    {
      kind_id: KIND,
      code: "shoot",
      unit: "Γυρίσματα",
      is_shoot: true,
      given: 2,
      carried: 1,
      used: 1,
      reserved: 1,
    },
  ],
  next_filming: "2026-03-15T08:00:00+00:00",
  balance_cents: 98800,
  last_contact: "2026-02-01T10:00:00+00:00",
};

describe("parseClientOverviews", () => {
  it("μετατρέπει τη γραμμή της βάσης σε ClientOverview", () => {
    expect(parseClientOverviews([dbRow])).toEqual([
      {
        clientId: CLIENT,
        status: "active",
        activeAgreements: 1,
        packageName: "Πακέτο Social",
        provisions: [
          {
            kindId: KIND,
            unit: "Γυρίσματα",
            isShoot: true,
            given: 2,
            carried: 1,
            used: 1,
            reserved: 1,
          },
        ],
        nextFilming: "2026-03-15T08:00:00+00:00",
        balanceCents: 98800,
        lastContact: "2026-02-01T10:00:00+00:00",
      },
    ]);
  });

  it("κρατά τα null όσων δεν δικαιούται ο Χρήστης", () => {
    const [row] = parseClientOverviews([
      {
        ...dbRow,
        active_agreements: null,
        package_name: null,
        provisions: [],
        next_filming: null,
        balance_cents: null,
        last_contact: null,
      },
    ]);
    expect(row).toMatchObject({
      activeAgreements: null,
      packageName: null,
      provisions: [],
      nextFilming: null,
      balanceCents: null,
      lastContact: null,
    });
  });

  it("απορρίπτει άγνωστη Κατάσταση", () => {
    expect(() =>
      parseClientOverviews([{ ...dbRow, status: "archived" }]),
    ).toThrow();
  });
});

describe("listClientOverviews", () => {
  beforeEach(() => mocks.rpc.mockReset());

  it("χωρίς Πελάτες επιστρέφει κενό χωρίς κλήση στη βάση", async () => {
    await expect(listClientOverviews([])).resolves.toEqual({
      ok: true,
      data: [],
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("καλεί μία φορά το RPC με όλα τα ids", async () => {
    mocks.rpc.mockResolvedValue({ data: [dbRow], error: null });
    const result = await listClientOverviews([CLIENT]);
    expect(mocks.rpc).toHaveBeenCalledWith("sales_client_overview", {
      p_ids: [CLIENT],
    });
    expect(result.ok && result.data[0]?.balanceCents).toBe(98800);
  });

  it("σφάλμα της βάσης γίνεται «δεν φόρτωσε»", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(listClientOverviews([CLIENT])).resolves.toEqual({
      ok: false,
    });
  });
});

describe("parseLastContacts", () => {
  it("should map each Client to its last contact, null when none", () => {
    expect(
      parseLastContacts([
        { client_id: "c1", last_contact: "2026-02-01T10:00:00+00:00" },
        { client_id: "c2", last_contact: null },
      ]),
    ).toEqual({ c1: "2026-02-01T10:00:00+00:00", c2: null });
  });
});
