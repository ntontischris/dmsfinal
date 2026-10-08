import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import {
  athensMonthStart,
  catalogueCaps,
  formatDate,
  formatDateTime,
  formatHours,
  formatMoney,
  formatMonth,
  formatMultiplier,
  formatPercent,
  itemKindLabel,
  monthOptions,
  monthStatus,
  withVat,
} from "./helpers";

const NBSP = " ";
const UUID_A = "11111111-1111-4111-8111-111111111111";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: UUID_A,
  email: "a@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

const ALL_CODES = [
  "catalogue.view",
  "catalogue.manage",
  "finance.amounts",
  "finance.cost",
  "finance.costManage",
  "settings.manage",
  "finance.invoices",
];
const grantAll = (except: readonly string[] = []): Viewer =>
  viewerWith(
    Object.fromEntries(
      ALL_CODES.filter((code) => !except.includes(code)).map((code) => [
        code,
        "all" as const,
      ]),
    ),
  );

describe("catalogueCaps", () => {
  it("ανώνυμος, χωρίς βάση ή χωρίς ομάδα δεν έχει τίποτα", () => {
    const none = catalogueCaps({ status: "anonymous" });
    expect(Object.values(none).every((value) => value === false)).toBe(true);
    expect(catalogueCaps({ status: "unconfigured" })).toEqual(none);
    expect(
      catalogueCaps({
        status: "signed-in",
        userId: UUID_A,
        email: "a@example.com",
        team: null,
      }),
    ).toEqual(none);
  });
  it("οι Πωλήσεις βλέπουν Κατάλογο και τιμές, τίποτε άλλο", () => {
    const caps = catalogueCaps(
      viewerWith({ "catalogue.view": "all", "finance.amounts": "mine" }),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canSeePrice).toBe(true);
    expect(caps.canManage).toBe(false);
    expect(caps.canEditPrice).toBe(false);
    expect(caps.canSeeCost).toBe(false);
    expect(caps.canEditDirectCost).toBe(false);
    expect(caps.canManageCost).toBe(false);
    expect(caps.canManageSettings).toBe(false);
  });
  it("η Διαχείριση γράφει τιμή και Άμεσο κόστος αλλά όχι ώρες", () => {
    const caps = catalogueCaps(
      grantAll(["finance.costManage", "finance.invoices"]),
    );
    expect(caps).toEqual({
      canView: true,
      canManage: true,
      canSeePrice: true,
      canEditPrice: true,
      canSeeCost: true,
      canEditDirectCost: true,
      canManageCost: false,
      canManageSettings: true,
    });
  });
  it("ο Ιδιοκτήτης έχει τα πάντα", () => {
    const caps = catalogueCaps(grantAll());
    expect(Object.values(caps).every((value) => value === true)).toBe(true);
  });
  it("μόνο catalogue.manage βλέπει και διαχειρίζεται αλλά δεν βλέπει χρήματα", () => {
    const caps = catalogueCaps(viewerWith({ "catalogue.manage": "all" }));
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(true);
    expect(caps.canSeePrice).toBe(false);
    expect(caps.canEditPrice).toBe(false);
    expect(caps.canSeeCost).toBe(false);
    expect(caps.canEditDirectCost).toBe(false);
  });
  it("το finance.costManage χωρίς finance.cost δεν δίνει canManageCost", () => {
    const caps = catalogueCaps(viewerWith({ "finance.costManage": "all" }));
    expect(caps.canManageCost).toBe(false);
  });
  it("catalogue.view με finance.cost και costManage γράφει ώρες χωρίς να διαχειρίζεται", () => {
    const caps = catalogueCaps(
      viewerWith({
        "catalogue.view": "all",
        "finance.cost": "all",
        "finance.costManage": "all",
      }),
    );
    expect(caps.canManageCost).toBe(true);
    expect(caps.canManage).toBe(false);
  });
});

describe("itemKindLabel", () => {
  it("δίνει τις τρεις ετικέτες", () => {
    expect(itemKindLabel({ kind: "package", billing: "monthly" })).toBe(
      "Πακέτο μηνιαίο",
    );
    expect(itemKindLabel({ kind: "package", billing: "one_off" })).toBe(
      "Πακέτο εφάπαξ",
    );
    expect(itemKindLabel({ kind: "service", billing: null })).toBe("Υπηρεσία");
  });
});

describe("formatMoney", () => {
  it("γράφει ελληνικά με κόμμα και κενό χωρίς διάσπαση πριν το €", () => {
    expect(formatMoney(1300)).toBe(`1.300,00${NBSP}€`);
    expect(formatMoney(88.5)).toBe(`88,50${NBSP}€`);
    expect(formatMoney(0)).toBe(`0,00${NBSP}€`);
    expect(formatMoney(1234567.8)).toBe(`1.234.567,80${NBSP}€`);
  });
});

describe("formatHours", () => {
  it("ενικός και πληθυντικός", () => {
    expect(formatHours(6)).toBe("6 ώρες");
    expect(formatHours(1)).toBe("1 ώρα");
    expect(formatHours(6.5)).toBe("6,5 ώρες");
    expect(formatHours(0)).toBe("0 ώρες");
  });
});

describe("formatPercent και formatMultiplier", () => {
  it("το ποσοστό έχει ένα δεκαδικό", () => {
    expect(formatPercent(0.3846)).toBe("38,5%");
    expect(formatPercent(1 - 1 / 1.3)).toBe("23,1%");
  });
  it("ο πολλαπλασιαστής δεν έχει περιττά μηδενικά", () => {
    expect(formatMultiplier(1.3)).toBe("1,3");
    expect(formatMultiplier(2)).toBe("2");
    expect(formatMultiplier(1.25)).toBe("1,25");
  });
});

describe("withVat", () => {
  it("προσθέτει ΦΠΑ και στρογγυλοποιεί στο λεπτό", () => {
    expect(withVat(1300, 24)).toBe(1612);
    expect(withVat(99.99, 24)).toBe(123.99);
  });
});

describe("formatDate και formatDateTime", () => {
  it("η ημερομηνία χωρίς ώρα δεν μετακινείται", () => {
    expect(formatDate("2026-09-20")).toBe("20/09/2026");
  });
  it("το timestamp διαβάζεται στην Αθήνα", () => {
    expect(formatDate("2026-09-20T21:30:00Z")).toBe("21/09/2026");
    expect(formatDateTime("2026-09-20T11:05:00Z")).toBe("20/09/2026, 14:05");
  });
});

describe("athensMonthStart", () => {
  it("δίνει τον τρέχοντα μήνα Αθήνας", () => {
    expect(athensMonthStart(new Date("2026-10-08T10:00:00Z"))).toBe(
      "2026-10-01",
    );
  });
  it("με θερινή ώρα (UTC+3) περνά στον επόμενο μήνα το βράδυ", () => {
    expect(athensMonthStart(new Date("2026-09-30T22:30:00Z"))).toBe(
      "2026-10-01",
    );
  });
  it("με χειμερινή ώρα (UTC+2) περνά στον επόμενο μήνα το βράδυ", () => {
    expect(athensMonthStart(new Date("2026-01-31T22:30:00Z"))).toBe(
      "2026-02-01",
    );
  });
});

describe("μήνες", () => {
  it("formatMonth γράφει όνομα και έτος", () => {
    expect(formatMonth("2026-09-01")).toBe("Σεπτέμβριος 2026");
  });
  it("monthOptions ξεκινά από τον τρέχοντα μήνα", () => {
    expect(monthOptions("2026-10-01", 3)).toEqual([
      { value: "2026-10-01", label: "Οκτώβριος 2026" },
      { value: "2026-11-01", label: "Νοέμβριος 2026" },
      { value: "2026-12-01", label: "Δεκέμβριος 2026" },
    ]);
  });
  it("monthOptions περνά το τέλος του έτους", () => {
    expect(monthOptions("2026-12-01", 2).map((option) => option.value)).toEqual(
      ["2026-12-01", "2027-01-01"],
    );
  });
  it("monthStatus ξεχωρίζει κλεισμένο, τρέχοντα και επόμενο", () => {
    expect(monthStatus("2026-09-01", "2026-10-01")).toBe("closed");
    expect(monthStatus("2026-10-01", "2026-10-01")).toBe("current");
    expect(monthStatus("2026-11-01", "2026-10-01")).toBe("future");
  });
});
