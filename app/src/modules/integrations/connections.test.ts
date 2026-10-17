import { describe, expect, it } from "vitest";

import { AI_MODELS } from "@/lib/ai/config";

import {
  CONNECTION_IDS,
  connectionStatuses,
  latest,
  type ConnectionStatus,
} from "./connections";
import type { IntegrationsFacts } from "./schemas";

const NOW = "2026-10-20T10:00:00.000Z";
const minutesAgo = (minutes: number): string =>
  new Date(Date.parse(NOW) - minutes * 60_000).toISOString();

function facts(overrides: Partial<IntegrationsFacts> = {}): IntegrationsFacts {
  return {
    now: NOW,
    email: {
      jobOkAt: minutesAgo(1),
      lastSentAt: minutesAgo(5),
      sentToday: 3,
      failedToday: 0,
    },
    google: {
      calendarConnected: true,
      lastSyncAt: minutesAgo(5),
      lastError: null,
      errorSince: null,
      pendingWrites: 0,
    },
    ai: {
      month: "2026-10",
      spentMicros: 1_000_000,
      capMicros: 30_000_000,
      lastUsedAt: minutesAgo(60),
    },
    checks: {},
    analytics: { ga4: "", pixel: "" },
    ...overrides,
  };
}

const ALL = { google: true, email: true, ai: true } as const;
const NONE = { google: false, email: false, ai: false } as const;

const card = (
  items: ConnectionStatus[],
  id: ConnectionStatus["id"],
): ConnectionStatus => {
  const item = items.find((x) => x.id === id);
  if (!item) throw new Error(id);
  return item;
};
const stateOf = (
  f: IntegrationsFacts,
  id: ConnectionStatus["id"],
  configured = ALL,
) => card(connectionStatuses(f, configured), id).state;

describe("connectionStatuses: όλες οι κάρτες", () => {
  it("έξι κάρτες, με τη σειρά της οθόνης", () => {
    expect(connectionStatuses(facts(), ALL).map((x) => x.id)).toEqual([
      ...CONNECTION_IDS,
    ]);
  });

  it("χωρίς μεταβλητές περιβάλλοντος: όλες «δεν έχει στηθεί», χωρίς τελευταία επιτυχία", () => {
    const items = connectionStatuses(facts(), NONE);
    expect(items.map((x) => x.state)).toEqual(Array(6).fill("not_set_up"));
    expect(items.every((x) => x.lastSuccessAt === null)).toBe(true);
  });

  it("Turnstile, στατιστικά και σφάλματα: πάντα «δεν έχει στηθεί» και χωρίς «Έλεγχος τώρα»", () => {
    const items = connectionStatuses(facts(), ALL);
    for (const id of ["turnstile", "analytics", "errors"] as const) {
      expect(card(items, id).state).toBe("not_set_up");
      expect(card(items, id).isCheckable).toBe(false);
    }
    expect(
      ["google", "email", "ai"].every(
        (id) => card(items, id as "google").isCheckable,
      ),
    ).toBe(true);
  });
});

describe("email", () => {
  it("λειτουργεί: η ουρά τρέχει, χωρίς αποτυχίες", () => {
    expect(stateOf(facts(), "email")).toBe("ok");
  });

  it("προσοχή: αποτυχίες σήμερα ή πάνω από 70 emails", () => {
    expect(
      stateOf(facts({ email: { ...facts().email, failedToday: 2 } }), "email"),
    ).toBe("warning");
    expect(
      stateOf(facts({ email: { ...facts().email, sentToday: 70 } }), "email"),
    ).toBe("warning");
  });

  it("δεν λειτουργεί: η ουρά δεν πέτυχε για πάνω από 10 λεπτά", () => {
    expect(
      stateOf(
        facts({ email: { ...facts().email, jobOkAt: minutesAgo(11) } }),
        "email",
      ),
    ).toBe("down");
  });

  it("χρήση: τα emails της ημέρας απέναντι στο όριο του πλάνου", () => {
    expect(card(connectionStatuses(facts(), ALL), "email").usage).toEqual({
      label: "Σήμερα",
      used: 3,
      limit: 100,
      unit: "emails",
    });
  });

  it("δεν λειτουργεί όταν ο τελευταίος έλεγχος απέτυχε μετά την τελευταία επιτυχία· μια νεότερη αποστολή το καθαρίζει", () => {
    const failed = {
      lastStartedAt: minutesAgo(2),
      lastOkAt: null,
      lastFailedAt: minutesAgo(2),
      lastError: "Resend 401",
    };
    const after = facts({ checks: { email: failed } });
    expect(stateOf(after, "email")).toBe("down");
    expect(card(connectionStatuses(after, ALL), "email").lastCheck).toEqual({
      at: minutesAgo(2),
      isOk: false,
      error: "Resend 401",
    });
    expect(
      stateOf(
        facts({
          checks: { email: failed },
          email: { ...facts().email, lastSentAt: minutesAgo(1) },
        }),
        "email",
      ),
    ).toBe("ok");
  });

  it("τελευταία επιτυχία: η νεότερη από αποστολή και έλεγχο", () => {
    const checked = facts({
      checks: {
        email: {
          lastStartedAt: minutesAgo(1),
          lastOkAt: minutesAgo(1),
          lastFailedAt: null,
          lastError: null,
        },
      },
    });
    expect(card(connectionStatuses(checked, ALL), "email").lastSuccessAt).toBe(
      minutesAgo(1),
    );
  });
});

describe("Google", () => {
  it("λειτουργεί με πρόσφατο συγχρονισμό", () => {
    expect(stateOf(facts(), "google")).toBe("ok");
  });

  it("προσοχή: χωρίς ημερολόγιο, με σφάλμα ή χωρίς συγχρονισμό για 30 λεπτά", () => {
    expect(
      stateOf(
        facts({ google: { ...facts().google, calendarConnected: false } }),
        "google",
      ),
    ).toBe("warning");
    expect(
      stateOf(
        facts({
          google: {
            ...facts().google,
            lastError: "Google 500",
            errorSince: minutesAgo(5),
          },
        }),
        "google",
      ),
    ).toBe("warning");
    expect(
      stateOf(
        facts({ google: { ...facts().google, lastSyncAt: minutesAgo(31) } }),
        "google",
      ),
    ).toBe("warning");
  });

  it("δεν λειτουργεί: το σφάλμα κρατά πάνω από 30 λεπτά", () => {
    expect(
      stateOf(
        facts({
          google: {
            ...facts().google,
            lastError: "Google 500",
            errorSince: minutesAgo(31),
          },
        }),
        "google",
      ),
    ).toBe("down");
  });
});

describe("AI", () => {
  it("λειτουργεί κάτω από το 80% του πλαφόν, προσοχή από 80%, δεν λειτουργεί στο 100% ή με πλαφόν 0", () => {
    const ai = facts().ai;
    expect(stateOf(facts(), "ai")).toBe("ok");
    expect(
      stateOf(facts({ ai: { ...ai, spentMicros: 24_000_000 } }), "ai"),
    ).toBe("warning");
    expect(
      stateOf(facts({ ai: { ...ai, spentMicros: 30_000_000 } }), "ai"),
    ).toBe("down");
    expect(stateOf(facts({ ai: { ...ai, capMicros: 0 } }), "ai")).toBe("down");
  });

  it("χρήση σε δολάρια και τα μοντέλα του κώδικα, και χωρίς κλειδί", () => {
    const set = card(connectionStatuses(facts(), ALL), "ai");
    expect(set.usage).toEqual({
      label: "Αυτόν τον μήνα",
      used: 1,
      limit: 30,
      unit: "USD",
    });
    const unset = card(connectionStatuses(facts(), NONE), "ai");
    for (const item of [set, unset])
      expect(item.models.map((m) => m.id)).toEqual([
        AI_MODELS.chat,
        AI_MODELS.embedding,
      ]);
  });
});

describe("latest", () => {
  it("η νεότερη ώρα, αγνοώντας τα κενά", () => {
    expect(latest(null, minutesAgo(5), undefined, minutesAgo(1))).toBe(
      minutesAgo(1),
    );
    expect(latest(null, undefined)).toBeNull();
  });
});
