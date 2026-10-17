import { describe, expect, it } from "vitest";

import { deadlineBadge } from "./labels";
import {
  anonymizeInputSchema,
  completeInputSchema,
  exportSchema,
  registerSchema,
  requestInputSchema,
  subjectRef,
} from "./schemas";

const ID = "6f1c0a52-9b8e-4d3a-a0f1-2b3c4d5e6f70";

describe("requestInputSchema", () => {
  it("should read the subject from «kind:id» and treat an empty date as today", () => {
    const parsed = requestInputSchema.parse({
      kind: "export",
      subject: subjectRef("client", ID),
      receivedOn: "",
      note: "  Με email ",
    });
    expect(parsed).toEqual({
      kind: "export",
      subject: { kind: "client", id: ID },
      receivedOn: null,
      note: "Με email",
    });
  });

  it("should reject an unknown kind, a subject without id and a malformed date", () => {
    const base = {
      kind: "export",
      subject: subjectRef("contact", ID),
      receivedOn: "",
      note: "",
    };
    expect(
      requestInputSchema.safeParse({ ...base, kind: "delete" }).success,
    ).toBe(false);
    expect(
      requestInputSchema.safeParse({ ...base, subject: "client:" }).success,
    ).toBe(false);
    expect(
      requestInputSchema.safeParse({ ...base, subject: `company:${ID}` })
        .success,
    ).toBe(false);
    expect(
      requestInputSchema.safeParse({ ...base, receivedOn: "17/10/2026" })
        .success,
    ).toBe(false);
    expect(
      requestInputSchema.safeParse({ ...base, note: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});

describe("completeInputSchema and anonymizeInputSchema", () => {
  it("should accept a completion without date and refuse a missing id", () => {
    expect(
      completeInputSchema.parse({ id: ID, completedOn: "", note: "" }),
    ).toEqual({
      id: ID,
      completedOn: null,
      note: "",
    });
    expect(
      completeInputSchema.safeParse({ id: "x", completedOn: "", note: "" })
        .success,
    ).toBe(false);
  });

  it("should need a typed name and never anonymize a whole Client", () => {
    expect(
      anonymizeInputSchema.safeParse({
        subjectKind: "contact",
        subjectId: ID,
        typedName: "  ",
      }).success,
    ).toBe(false);
    expect(
      anonymizeInputSchema.safeParse({
        subjectKind: "client",
        subjectId: ID,
        typedName: "Κυψέλη",
      }).success,
    ).toBe(false);
    expect(
      anonymizeInputSchema.parse({
        subjectKind: "team_user",
        subjectId: ID,
        typedName: " Λένα ",
      }).typedName,
    ).toBe("Λένα");
  });
});

describe("registerSchema and exportSchema", () => {
  it("should read the register as the database returns it", () => {
    const register = registerSchema.parse({
      today: "2026-03-31",
      requests: [
        {
          id: "r1",
          kind: "anonymize",
          subjectKind: "client_user",
          subjectId: ID,
          subjectLabel: "Ελένη",
          receivedOn: "2026-03-01",
          deadline: "2026-04-01",
          completedOn: null,
          note: "",
          daysLeft: 1,
        },
      ],
    });
    expect(register.requests[0]?.deadline).toBe("2026-04-01");
  });

  it("should accept sections of scalar rows and refuse nested data", () => {
    const subject = { kind: "client", id: ID, label: "Κυψέλη" };
    expect(
      exportSchema.safeParse({
        subject,
        sections: { details: { a: 1 }, messages: [{ body: "x", n: null }] },
      }).success,
    ).toBe(true);
    expect(
      exportSchema.safeParse({
        subject,
        sections: { messages: [{ body: { nested: true } }] },
      }).success,
    ).toBe(false);
  });
});

describe("deadlineBadge", () => {
  it("should show days left, today, tomorrow, overdue and done", () => {
    expect(deadlineBadge({ completedOn: null, daysLeft: 20 })).toEqual({
      text: "λήγει σε 20 μέρες",
      tone: undefined,
    });
    expect(deadlineBadge({ completedOn: null, daysLeft: 7 })).toEqual({
      text: "λήγει σε 7 μέρες",
      tone: "attention",
    });
    expect(deadlineBadge({ completedOn: null, daysLeft: 1 }).text).toBe(
      "λήγει αύριο",
    );
    expect(deadlineBadge({ completedOn: null, daysLeft: 0 }).text).toBe(
      "λήγει σήμερα",
    );
    expect(deadlineBadge({ completedOn: null, daysLeft: -3 })).toEqual({
      text: "έληξε",
      tone: "attention",
    });
    expect(deadlineBadge({ completedOn: "2026-02-10", daysLeft: -30 })).toEqual(
      {
        text: "ολοκληρώθηκε 10/02/2026",
        tone: "ok",
      },
    );
  });
});
