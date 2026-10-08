import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import {
  athensToday,
  clientAccess,
  daysOverdue,
  formatDate,
  formatDateTime,
  isForgotten,
  salesCaps,
  takenMessage,
  toPickerClient,
} from "./helpers";
import type {
  ClientRow,
  SalesCaps,
} from "./types";

const UUID_A = "11111111-1111-4111-8111-111111111111";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: UUID_A,
  email: "a@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

const SELLER = viewerWith({ "clients.view": "mine", "clients.manage": "mine" });
const ADMIN = viewerWith({
  "clients.view": "all",
  "clients.manage": "all",
  "clients.transfer": "all",
  "clients.merge": "all",
  "settings.manage": "all",
});
const ACCOUNTANT = viewerWith({ "clients.view": "all" });

describe("athensToday", () => {
  it("δίνει την ημερομηνία της Αθήνας το μεσημέρι", () => {
    expect(athensToday(new Date("2026-10-08T10:00:00Z"))).toBe("2026-10-08");
  });
  it("περνά στην επόμενη μέρα το βράδυ με θερινή ώρα (UTC+3)", () => {
    expect(athensToday(new Date("2026-10-08T21:30:00Z"))).toBe("2026-10-09");
  });
  it("περνά στην επόμενη μέρα το βράδυ με χειμερινή ώρα (UTC+2)", () => {
    expect(athensToday(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-16");
  });
});

describe("isForgotten", () => {
  it("ανοιχτή με προθεσμία πριν από σήμερα είναι ξεχασμένη", () => {
    expect(
      isForgotten({ outcome: "open", nextStepDue: "2026-10-07" }, "2026-10-08"),
    ).toBe(true);
  });
  it("προθεσμία σήμερα δεν είναι ξεχασμένη", () => {
    expect(
      isForgotten({ outcome: "open", nextStepDue: "2026-10-08" }, "2026-10-08"),
    ).toBe(false);
  });
  it("ανοιχτή χωρίς προθεσμία δεν είναι ξεχασμένη", () => {
    expect(
      isForgotten({ outcome: "open", nextStepDue: null }, "2026-10-08"),
    ).toBe(false);
  });
  it("χαμένη ή κερδισμένη με παλιά προθεσμία δεν είναι ξεχασμένη", () => {
    expect(
      isForgotten({ outcome: "lost", nextStepDue: "2026-01-01" }, "2026-10-08"),
    ).toBe(false);
    expect(
      isForgotten({ outcome: "won", nextStepDue: "2026-01-01" }, "2026-10-08"),
    ).toBe(false);
  });
});

describe("daysOverdue", () => {
  it("μετράει τις μέρες που πέρασαν", () => {
    expect(daysOverdue("2026-09-12", "2026-09-20")).toBe(8);
  });
  it("δίνει 0 την ίδια μέρα ή αν η προθεσμία είναι μπροστά", () => {
    expect(daysOverdue("2026-09-20", "2026-09-20")).toBe(0);
    expect(daysOverdue("2026-09-25", "2026-09-20")).toBe(0);
  });
});

describe("formatDate και formatDateTime", () => {
  it("η ημερομηνία χωρίς ώρα δεν μετακινείται", () => {
    expect(formatDate("2026-09-20")).toBe("20/09/2026");
  });
  it("το timestamp διαβάζεται στην Αθήνα", () => {
    expect(formatDate("2026-09-20T21:30:00Z")).toBe("21/09/2026");
  });
  it("δίνει ημερομηνία και ώρα Αθήνας", () => {
    expect(formatDateTime("2026-09-20T11:05:00Z")).toBe("20/09/2026, 14:05");
  });
});

describe("takenMessage", () => {
  it("λέει σε ποιον ανήκει ο Πελάτης", () => {
    expect(takenMessage("Νίκος")).toBe(
      "Ο Πελάτης ανήκει στον/στην Νίκος. Για νέα Ευκαιρία ζήτα πρόσβαση από τη Διαχείριση.",
    );
  });
  it("λέει ότι δεν έχει Υπεύθυνο", () => {
    expect(takenMessage(null)).toBe(
      "Ο Πελάτης δεν έχει ακόμα Υπεύθυνο. Για νέα Ευκαιρία ζήτα πρόσβαση από τη Διαχείριση.",
    );
  });
});

describe("salesCaps", () => {
  it("ανώνυμος, χωρίς βάση ή χωρίς ομάδα δεν έχει τίποτα", () => {
    const none: SalesCaps = {
      userId: null,
      canViewClients: false,
      canManage: false,
      manageScope: null,
      canTransfer: false,
      canMerge: false,
      canManageSettings: false,
    };
    expect(salesCaps({ status: "anonymous" })).toEqual(none);
    expect(salesCaps({ status: "unconfigured" })).toEqual(none);
    expect(
      salesCaps({
        status: "signed-in",
        userId: UUID_A,
        email: "a@example.com",
        team: null,
      }),
    ).toEqual(none);
  });
  it("ο πωλητής διαχειρίζεται τα δικά του και τίποτα παραπάνω", () => {
    expect(salesCaps(SELLER)).toEqual({
      userId: UUID_A,
      canViewClients: true,
      canManage: true,
      manageScope: "mine",
      canTransfer: false,
      canMerge: false,
      canManageSettings: false,
    });
  });
  it("η Διαχείριση τα έχει όλα με εύρος «όλα»", () => {
    expect(salesCaps(ADMIN)).toEqual({
      userId: UUID_A,
      canViewClients: true,
      canManage: true,
      manageScope: "all",
      canTransfer: true,
      canMerge: true,
      canManageSettings: true,
    });
  });
  it("ο Λογιστής βλέπει Πελάτες αλλά δεν διαχειρίζεται", () => {
    const caps = salesCaps(ACCOUNTANT);
    expect(caps.canViewClients).toBe(true);
    expect(caps.canManage).toBe(false);
    expect(caps.manageScope).toBeNull();
  });
});

describe("clientAccess", () => {
  it("ο Υπεύθυνος του Πελάτη είναι «owner»", () => {
    expect(clientAccess(salesCaps(SELLER), { managerId: UUID_A })).toBe(
      "owner",
    );
  });
  it("εύρος «όλα» δίνει «all» ακόμα κι αν δεν είναι Υπεύθυνος", () => {
    expect(clientAccess(salesCaps(ADMIN), { managerId: "other" })).toBe("all");
  });
  it("όποιος δεν είναι ούτε ο ένας ούτε ο άλλος έχει «granted»", () => {
    expect(clientAccess(salesCaps(SELLER), { managerId: "other" })).toBe(
      "granted",
    );
    expect(clientAccess(salesCaps(SELLER), { managerId: null })).toBe(
      "granted",
    );
  });
});

describe("toPickerClient", () => {
  const row = (managerId: string | null): ClientRow => ({
    id: "c1",
    name: "Κυψέλη",
    city: "",
    managerId,
    managerName: "Νίκος",
    canOpen: true,
    openOpportunities: 1,
    isPossibleDuplicate: false,
  });
  it("ο δικός μου Πελάτης είναι «isMine»", () => {
    expect(toPickerClient(row(UUID_A), salesCaps(SELLER)).isMine).toBe(true);
  });
  it("με εύρος «όλα» κάθε Πελάτης είναι «isMine»", () => {
    expect(toPickerClient(row("other"), salesCaps(ADMIN)).isMine).toBe(true);
  });
  it("κατειλημμένος Πελάτης δεν είναι «isMine» και κρατά το όνομα του Υπεύθυνου", () => {
    const picked = toPickerClient(row("other"), salesCaps(SELLER));
    expect(picked.isMine).toBe(false);
    expect(picked.managerName).toBe("Νίκος");
  });
});
