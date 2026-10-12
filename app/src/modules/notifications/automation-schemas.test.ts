import { describe, expect, it } from "vitest";

import { SYSTEM_SPECS } from "@/lib/email/system-texts";

import {
  filterEvents,
  splitWait,
  timingText,
  toWaitMinutes,
} from "./automation-helpers";
import {
  automationFormSchema,
  holidayAddSchema,
  systemMessageFormSchema,
  timingOf,
} from "./automation-schemas";
import type { Automation, CatalogEvent } from "./automation-view-schema";

const VARIABLES = [
  "recipientName",
  "clientName",
  "companyName",
  "link",
  "sender",
  "excerpt",
];
const USER = "00000000-0000-4000-8000-0000000000a3";

const form = (over: Record<string, unknown> = {}) => ({
  id: "",
  eventType: "message.created",
  channel: "notification",
  recipientKind: "users",
  recipientRelative: "",
  recipientPermission: "",
  recipientUserIds: [USER],
  offsetDays: "",
  offsetDirection: "before",
  sendTime: "",
  waitAmount: "",
  waitUnit: "days",
  subjectEl: "",
  subjectEn: "",
  bodyEl: "Νέο Μήνυμα από {sender}",
  bodyEn: "",
  isEssential: "",
  ...over,
});

const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("automationFormSchema", () => {
  const instant = automationFormSchema({
    kind: "instant",
    variables: VARIABLES,
  });

  it("should build a new instant notification to named users", () => {
    const result = instant.safeParse(form());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      eventType: "message.created",
      timing: "immediate",
      recipientUserIds: [USER],
      isEssential: false,
    });
  });

  it("should reject an unknown variable", () => {
    expect(
      firstMessage(instant.safeParse(form({ bodyEl: "Γεια {location}" }))),
    ).toBe("Άγνωστη μεταβλητή {location}: διάλεξε από τη λίστα του Γεγονότος");
  });

  it("should want a subject for email and users for named recipients", () => {
    expect(firstMessage(instant.safeParse(form({ channel: "email" })))).toBe(
      "Το email θέλει θέμα στα ελληνικά",
    );
    expect(
      firstMessage(instant.safeParse(form({ recipientUserIds: [] }))),
    ).toBe("Διάλεξε τουλάχιστον έναν Χρήστη");
  });

  it("should send only the id when editing", () => {
    const result = instant.safeParse(
      form({ id: "00000000-0000-4000-8000-000000000001" }),
    );
    expect(result.data).not.toHaveProperty("eventType");
  });
});

describe("timing by event kind", () => {
  it("should turn days before and a time into a negative offset", () => {
    expect(
      timingOf("dated", {
        offsetDays: "2",
        offsetDirection: "before",
        sendTime: "08:30",
        waitAmount: "",
        waitUnit: "days",
      }),
    ).toEqual({
      timing: "offset",
      offsetDays: -2,
      sendTime: "08:30",
      waitMinutes: null,
    });
  });

  it("should reject a dated automation without a time", () => {
    expect(
      timingOf("dated", {
        offsetDays: "1",
        offsetDirection: "after",
        sendTime: "",
        waitAmount: "",
        waitUnit: "days",
      }),
    ).toBe("Γράψε ώρα αποστολής (ΩΩ:ΛΛ)");
  });

  it("should turn a wait into minutes and reject zero", () => {
    expect(
      timingOf("waiting", {
        offsetDays: "",
        offsetDirection: "before",
        sendTime: "",
        waitAmount: "3",
        waitUnit: "hours",
      }),
    ).toMatchObject({
      timing: "wait",
      waitMinutes: 180,
    });
    expect(
      timingOf("waiting", {
        offsetDays: "",
        offsetDirection: "before",
        sendTime: "",
        waitAmount: "0",
        waitUnit: "days",
      }),
    ).toBe("Η αναμονή είναι από 1 λεπτό έως 365 μέρες");
  });

  it("should split minutes into the largest exact unit", () => {
    expect(splitWait(2880)).toEqual({ amount: 2, unit: "days" });
    expect(splitWait(90)).toEqual({ amount: 90, unit: "minutes" });
    expect(toWaitMinutes(2, "hours")).toBe(120);
  });

  it("should describe the timing in Greek", () => {
    const base = {
      timing: "offset",
      offsetDays: -1,
      sendTime: "17:00",
      waitMinutes: null,
    } as const;
    expect(timingText({ ...(base as unknown as Automation) })).toBe(
      "1 μέρα πριν, στις 17:00",
    );
  });
});

describe("systemMessageFormSchema", () => {
  const schema = systemMessageFormSchema(SYSTEM_SPECS.signing_code);
  const message = (over: Record<string, string>) => ({
    code: "signing_code",
    subjectEl: "",
    subjectEn: "",
    bodyEl: "",
    bodyEn: "",
    ...over,
  });

  it("should want the code in a changed body", () => {
    expect(
      firstMessage(schema.safeParse(message({ bodyEl: "Ο κωδικός σας." }))),
    ).toBe("Λείπει το {code}: πρόσθεσέ το για να αποθηκευτεί");
    expect(
      schema.safeParse(message({ bodyEl: "Ο κωδικός σας: {code}." })).success,
    ).toBe(true);
  });

  it("should reject a variable of another message", () => {
    expect(
      firstMessage(schema.safeParse(message({ subjectEl: "Για {place}" }))),
    ).toBe("Άγνωστη μεταβλητή {place}: διάλεξε από τη λίστα του Μηνύματος");
  });

  it("should keep the code and links out of the subject", () => {
    expect(
      firstMessage(
        schema.safeParse(
          message({ subjectEl: "Κωδικός {code}", bodyEl: "{code}" }),
        ),
      ),
    ).toBe("Το {code} δεν μπαίνει στο θέμα: βάλ' το στο κείμενο");
    const automation = automationFormSchema({
      kind: "instant",
      variables: VARIABLES,
    });
    expect(
      firstMessage(
        automation.safeParse(
          form({ channel: "email", subjectEl: "Δες {link}" }),
        ),
      ),
    ).toBe("Το {link} δεν μπαίνει στο θέμα: βάλ' το στο κείμενο");
  });
});

describe("holidays and catalogue filters", () => {
  it("should add a yearly holiday as month and day", () => {
    expect(
      holidayAddSchema.parse({
        name: "Γιορτή",
        date: "2026-12-27",
        yearly: "on",
      }),
    ).toEqual({ name: "Γιορτή", month: 12, day: 27 });
    expect(
      holidayAddSchema.parse({
        name: "Μία φορά",
        date: "2026-05-04",
        yearly: "",
      }),
    ).toEqual({ name: "Μία φορά", onDate: "2026-05-04" });
  });

  it("should keep only events with active automations or wired events", () => {
    const event = (code: string, activeCount: number, isWired: boolean) =>
      ({ code, group: "Ε", activeCount, isWired }) as CatalogEvent;
    const events = [
      event("a.on", 1, true),
      event("b.off", 0, true),
      event("c.later", 2, false),
    ];
    expect(
      filterEvents(events, {
        group: null,
        onlyActive: true,
        onlyWired: false,
      }).map((e) => e.code),
    ).toEqual(["a.on", "c.later"]);
    expect(
      filterEvents(events, { group: "Α", onlyActive: false, onlyWired: false }),
    ).toEqual([]);
    expect(
      filterEvents(events, {
        group: null,
        onlyActive: false,
        onlyWired: true,
      }).map((e) => e.code),
    ).toEqual(["a.on", "b.off"]);
  });
});
