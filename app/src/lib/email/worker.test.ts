import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AgreementRow } from "./deliver-agreement";
import type { OutboxRow } from "./deliver-outbox";
import { handleAgreementRow, handleOutboxRow } from "./worker";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const UUID = "7d1f2a3e-4b5c-4d6e-8f70-123456789abc";

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

// Ψεύτικος service role: καταγράφει τις κλήσεις και δίνει τις απαντήσεις που ζητά κάθε τεστ.
// Ο τύπος είναι ο ελάχιστος που χρειάζεται ο worker· το cast γίνεται μόνο εδώ, στα τεστ.
function fakeAdmin(replies: Record<string, unknown> = {}) {
  const calls: RpcCall[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    return { data: replies[name] ?? null, error: null };
  });
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: replies.invitation ?? null, error: null }),
      }),
    }),
  }));
  const generateLink = vi.fn(async () => ({
    data: { properties: { hashed_token: "hash-1" }, user: { id: UUID } },
    error: null,
  }));
  const admin = { rpc, from, auth: { admin: { generateLink } } };
  return { admin: admin as unknown as SupabaseClient, calls };
}

const doneCall = (calls: RpcCall[]) => calls.find((call) => call.name.endsWith("_done"));

const outboxRow = (overrides: Partial<OutboxRow>): OutboxRow => ({
  id: UUID,
  kind: "test",
  to_name: "Γιώργος",
  to_email: "owner@example.com",
  locale: "el",
  payload: {},
  attempts: 1,
  ...overrides,
});

const decisionRow = (overrides: Partial<OutboxRow> = {}): OutboxRow =>
  outboxRow({
    kind: "filming_decision",
    to_email: "client@example.com",
    payload: {
      filmingId: "f-42",
      decision: "approved",
      startsAt: "2026-10-12T11:30:00Z",
      hours: 2,
      reason: null,
    },
    ...overrides,
  });

const acceptingFetch = () =>
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response("{}", { status: 200 }));

const agreementRow = (overrides: Partial<AgreementRow>): AgreementRow => ({
  id: UUID,
  kind: "proposal_link",
  to_name: "Νίκος",
  to_email: "nikos@example.com",
  locale: "el",
  payload: { token: "tok" },
  agreement_id: UUID,
  agreement_title: "Σποτ",
  manager_name: "Άννα",
  ...overrides,
});

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("VERCEL", "");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleOutboxRow", () => {
  it("στέλνει τη δοκιμή και κλείνει τη γραμμή ως επιτυχημένη", async () => {
    const { admin, calls } = fakeAdmin();
    await handleOutboxRow(admin, outboxRow({ kind: "test" }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: true, p_provider_id: "local", p_suppressed: false });
  });

  it("φτιάχνει σύνδεσμο για πρόσκληση που ξαναστέλνεται", async () => {
    const { admin, calls } = fakeAdmin({ invitation: { kind: "team", client: null } });
    await handleOutboxRow(admin, outboxRow({ kind: "invite_resend", payload: { invitationId: UUID } }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({
      p_ok: true,
      p_subject: "Πρόσκληση στο DMS: Devre Media",
    });
  });

  it("κλείνει ως αποτυχημένη όταν η πρόσκληση δεν βρίσκεται", async () => {
    const { admin, calls } = fakeAdmin({ invitation: null });
    await handleOutboxRow(admin, outboxRow({ kind: "invite_resend", payload: { invitationId: UUID } }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: false, p_error: "Η πρόσκληση δεν βρέθηκε" });
  });

  it("φτιάχνει σύνδεσμο για προσθήκη σε Πελάτη με το όνομά του", async () => {
    const { admin, calls } = fakeAdmin();
    await handleOutboxRow(admin, outboxRow({ kind: "client_added", payload: { clientName: "Acme" } }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: true, p_subject: "Devre Media · Πρόσβαση στον Πελάτη Acme" });
  });

  it("κλείνει ως αποτυχημένη όταν ο πάροχος απορρίπτει το email", async () => {
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    const { admin, calls } = fakeAdmin();
    await handleOutboxRow(admin, outboxRow({ kind: "test" }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: false, p_error: "Resend 500" });
  });
});

describe("handleOutboxRow για αποφάσεις γυρίσματος", () => {
  it("στέλνει την έγκριση γυρίσματος στον Πελάτη και κλείνει ως επιτυχημένη", async () => {
    vi.stubEnv("RESEND_API_KEY", "k");
    const fetchMock = acceptingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { admin, calls } = fakeAdmin();
    await handleOutboxRow(admin, decisionRow(), ORIGIN);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("client@example.com");
    expect(doneCall(calls)?.args).toMatchObject({
      p_ok: true,
      p_subject: "Devre Media · Το Γύρισμά σου εγκρίθηκε",
    });
  });

  it("κλείνει ως επιτυχημένη τη μετάθεση που απορρίφθηκε με το σωστό θέμα", async () => {
    const { admin, calls } = fakeAdmin();
    const row = decisionRow({
      kind: "reschedule_decision",
      payload: { filmingId: "f-42", decision: "rejected", startsAt: "2026-10-12T11:30:00Z", hours: 2, reason: "Κλειστό" },
    });
    await handleOutboxRow(admin, row, ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({
      p_ok: true,
      p_subject: "Devre Media · Η μετάθεση δεν εγκρίθηκε",
    });
  });

  it("δεν στέλνει και κλείνει ως αποτυχημένη όταν το payload δεν έχει σωστό σχήμα", async () => {
    vi.stubEnv("RESEND_API_KEY", "k");
    const fetchMock = acceptingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const { admin, calls } = fakeAdmin();
    await handleOutboxRow(admin, decisionRow({ payload: { filmingId: 42, decision: "maybe" } }), ORIGIN);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: false, p_error: "Μη έγκυρο περιεχόμενο ειδοποίησης" });
  });
});

describe("handleAgreementRow", () => {
  it("στέλνει τον σύνδεσμο πρότασης και κλείνει ως επιτυχημένη", async () => {
    const { admin, calls } = fakeAdmin();
    await handleAgreementRow(admin, agreementRow({ kind: "proposal_link" }), ORIGIN);
    expect(doneCall(calls)).toMatchObject({ name: "agreement_outbox_done", args: { p_ok: true, p_error: "" } });
  });

  it("στέλνει τον κωδικό υπογραφής", async () => {
    const { admin, calls } = fakeAdmin();
    await handleAgreementRow(admin, agreementRow({ kind: "signing_code", payload: { code: "123456" } }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: true });
  });

  it("δεν στέλνει τίποτα για Υπογράφοντα που είναι ήδη Χρήστης του Πελάτη", async () => {
    const { admin, calls } = fakeAdmin({ client_invite_target: { clientId: UUID, name: "Νίκος", email: "nikos@example.com", alreadyMember: true } });
    await handleAgreementRow(admin, agreementRow({ kind: "client_invite", payload: {} }), ORIGIN);
    expect(calls.map((call) => call.name)).toEqual(["client_invite_target", "agreement_outbox_done"]);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: true });
  });

  it("κλείνει ως αποτυχημένη όταν η αποστολή αποτυγχάνει", async () => {
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 422 })));
    const { admin, calls } = fakeAdmin();
    await handleAgreementRow(admin, agreementRow({ kind: "signed_copy" }), ORIGIN);
    expect(doneCall(calls)?.args).toMatchObject({ p_ok: false, p_error: "Resend 422" });
  });
});
