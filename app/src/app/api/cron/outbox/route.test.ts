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
const NO_EVENTS = { processed: 0, failed: 0, sent: 0, cleaned: 0 };
const NO_TIMED = { sent: 0, failed: 0 };

const request = (authorization?: string, path = "/api/cron/outbox") =>
  new NextRequest(`http://localhost:3000${path}`, {
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

  it("τρέχει τις εργασίες της ουράς πριν από τον εργάτη", async () => {
    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.runOutboxWorker.mock.invocationCallOrder[0] ??
        Number.POSITIVE_INFINITY,
    );
    expect(await response.json()).toEqual({
      sent: 3,
      billables: { generated: 1 },
      attachments: { removed: 0 },
      events: NO_EVENTS,
      timed: NO_TIMED,
    });
  });

  it("δεν καλεί πια τα παλιά enqueue (υπενθυμίσεις, ληξιπρόθεσμα, σύνοψη): τα κάνει ο έλεγχος χρονισμών", async () => {
    await GET(request(`Bearer ${SECRET}`));

    const names = mocks.rpc.mock.calls.map(([name]) => name);
    expect(names).not.toContain("deliverable_reminders_enqueue");
    expect(names).not.toContain("invoice_overdue_enqueue");
    expect(names).not.toContain("message_digest_enqueue");
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
      billables: { error: "Τα Τιμολογητέα δεν γεννήθηκαν." },
      attachments: { removed: 0 },
      events: NO_EVENTS,
      timed: NO_TIMED,
    });
  });

  it("τρέχει τον εργάτη και δίνει σύντομο λάθος όταν αποτύχει το καθάρισμα συνημμένων", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "message_attachment_slots_expired"
        ? { data: null, error: { message: "boom" } }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.runOutboxWorker).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({
      sent: 3,
      billables: { generated: 0 },
      attachments: { error: "Τα ανεκμετάλλευτα συνημμένα δεν καθαρίστηκαν." },
      events: NO_EVENTS,
      timed: NO_TIMED,
    });
  });

  it("επεξεργάζεται τα Γεγονότα πριν από τον εργάτη, ώστε τα email «automation» να φύγουν στον ίδιο κύκλο", async () => {
    const summary = { processed: 2, failed: 0, sent: 1, cleaned: 0 };
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "events_process"
        ? { data: summary, error: null }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    const order = mocks.rpc.mock.calls.findIndex(
      ([name]) => name === "events_process",
    );
    expect(mocks.rpc.mock.invocationCallOrder[order]).toBeLessThan(
      mocks.runOutboxWorker.mock.invocationCallOrder[0] ??
        Number.POSITIVE_INFINITY,
    );
    expect((await response.json()).events).toEqual(summary);
  });

  it("τρέχει τον εργάτη και δίνει σύντομο λάθος όταν αποτύχει ο επεξεργαστής Γεγονότων", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "events_process"
        ? { data: null, error: { message: "boom" } }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.runOutboxWorker).toHaveBeenCalledTimes(1);
    expect((await response.json()).events).toEqual({
      error: "Τα Γεγονότα δεν επεξεργάστηκαν.",
    });
    expect(console.error).toHaveBeenCalledWith("events_process", "boom");
  });

  it("τρέχει τον έλεγχο χρονισμών πριν από τον εργάτη", async () => {
    const summary = { sent: 5, failed: 0 };
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "automations_scan"
        ? { data: summary, error: null }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    const order = mocks.rpc.mock.calls.findIndex(
      ([name]) => name === "automations_scan",
    );
    expect(order).toBeGreaterThanOrEqual(0);
    expect(mocks.rpc.mock.invocationCallOrder[order]).toBeLessThan(
      mocks.runOutboxWorker.mock.invocationCallOrder[0] ??
        Number.POSITIVE_INFINITY,
    );
    expect((await response.json()).timed).toEqual(summary);
  });

  it("δεν τρέχει τον έλεγχο χρονισμών στο σκούντημα (kick), μόνο στο cron του λεπτού", async () => {
    const response = await GET(
      request(`Bearer ${SECRET}`, "/api/cron/outbox?kick=1"),
    );

    const names = mocks.rpc.mock.calls.map(([name]) => name);
    expect(names).not.toContain("automations_scan");
    expect(names).toContain("events_process");
    expect(mocks.runOutboxWorker).toHaveBeenCalledTimes(1);
    expect((await response.json()).timed).toEqual({ skipped: true });
  });

  it("τρέχει τον εργάτη και δίνει σύντομο λάθος όταν αποτύχει ο έλεγχος χρονισμών", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "automations_scan"
        ? { data: null, error: { message: "boom" } }
        : { data: 0, error: null },
    );

    const response = await GET(request(`Bearer ${SECRET}`));

    expect(mocks.runOutboxWorker).toHaveBeenCalledTimes(1);
    expect((await response.json()).timed).toEqual({
      error: "Ο έλεγχος χρονισμών δεν έτρεξε.",
    });
    expect(console.error).toHaveBeenCalledWith("automations_scan", "boom");
  });
});
