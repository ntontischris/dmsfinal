import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  runOutboxWorker: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/email/worker", () => ({
  runOutboxWorker: mocks.runOutboxWorker,
}));

import { GET } from "./route";

const SECRET = "test-cron-secret";

const request = (authorization?: string) =>
  new NextRequest("http://localhost:3000/api/cron/outbox", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.rpc.mockResolvedValue({ data: 1, error: null });
  mocks.runOutboxWorker.mockResolvedValue({ sent: 3 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/cron/outbox", () => {
  it("απαντά 500 όταν δεν έχει οριστεί CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(500);
  });

  it("απαντά 401 χωρίς Authorization", async () => {
    expect((await GET(request())).status).toBe(401);
  });

  it("απαντά 401 με λάθος μυστικό", async () => {
    expect((await GET(request("Bearer wrong-secret"))).status).toBe(401);
  });

  it("δεν αγγίζει την ουρά χωρίς σωστό Bearer", async () => {
    await GET(request("Bearer wrong-secret"));

    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.runOutboxWorker).not.toHaveBeenCalled();
  });

  it("μπαίνει στην ουρά τις υπενθυμίσεις πελατών πριν τρέξει ο εργάτης", async () => {
    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.runOutboxWorker.mock.invocationCallOrder[0] ??
        Number.POSITIVE_INFINITY,
    );
    expect(await response.json()).toEqual({
      sent: 3,
      reminders: { queued: 1 },
      billables: { generated: 1 },
    });
  });

  it("τρέχει τον εργάτη και δίνει σύντομο λάθος όταν αποτύχει η ουρά υπενθυμίσεων", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "deliverable_reminders_enqueue"
        ? { data: null, error: { message: "boom" } }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.runOutboxWorker).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      sent: 3,
      reminders: { error: "Οι υπενθυμίσεις δεν μπήκαν στην ουρά." },
      billables: { generated: 0 },
    });
  });

  it("τρέχει τον εργάτη και δίνει σύντομο λάθος όταν αποτύχει η γεννήτρια Τιμολογητέων", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "billables_generate"
        ? { data: null, error: { message: "boom" } }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.runOutboxWorker).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      sent: 3,
      reminders: { queued: 0 },
      billables: { error: "Τα Τιμολογητέα δεν γεννήθηκαν." },
    });
  });
});
