import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import {
  agreementCaps,
  athensToday,
  bucketOf,
  describeDeviation,
  endOfTerm,
  expiryText,
  formatDate,
  formatDateTime,
  formatDocNumber,
  formatMoney,
  formatMonth,
  formatPercent,
  localizeNumberIn,
  matchesBucket,
  parseDecimal,
  periodLabel,
  statusLabel,
  timeText,
} from "./helpers";

const NBSP = String.fromCharCode(0xa0);
const UUID_A = "11111111-1111-4111-8111-111111111111";

const viewerWith = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: UUID_A,
  email: "a@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

const ALL_CODES = [
  "agreements.view",
  "agreements.draft",
  "agreements.deviate",
  "agreements.terminate",
  "finance.amounts",
  "finance.cost",
  "finance.costManage",
  "settings.manage",
  "finance.invoices",
  "productions.manage",
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

describe("agreementCaps", () => {
  const NONE = {
    canView: false,
    canDraft: false,
    canDeviate: false,
    canSeeAmounts: false,
    canSeeCost: false,
    canManageCost: false,
    canManageSettings: false,
    canSeeProductions: false,
  };
  it("ανώνυμος: όλα false", () => {
    expect(agreementCaps({ status: "anonymous" })).toEqual(NONE);
  });
  it("χωρίς ρύθμιση βάσης: όλα false", () => {
    expect(agreementCaps({ status: "unconfigured" })).toEqual(NONE);
  });
  it("χωρίς ομάδα: όλα false", () => {
    expect(agreementCaps({ ...viewerWith({}), team: null } as Viewer)).toEqual(
      NONE,
    );
  });
  it("Πωλήσεις βλέπει, συντάσσει και βλέπει ποσά, τίποτε άλλο", () => {
    expect(
      agreementCaps(
        viewerWith({
          "agreements.view": "mine",
          "agreements.draft": "mine",
          "finance.amounts": "mine",
        }),
      ),
    ).toEqual({ ...NONE, canView: true, canDraft: true, canSeeAmounts: true });
  });
  it("Διαχείριση: όλα εκτός από τη διαχείριση κόστους", () => {
    expect(
      agreementCaps(grantAll(["finance.costManage", "finance.invoices"])),
    ).toEqual({
      canView: true,
      canDraft: true,
      canDeviate: true,
      canSeeAmounts: true,
      canSeeCost: true,
      canManageCost: false,
      canManageSettings: true,
      canSeeProductions: true,
    });
  });
  it("Ιδιοκτήτης: όλα true", () => {
    expect(Object.values(agreementCaps(grantAll())).every(Boolean)).toBe(true);
  });
  it("ο σύνδεσμος της Παραγωγής θέλει «Παραγωγές» και τίποτε άλλο", () => {
    expect(agreementCaps(viewerWith({ "agreements.view": "all" })).canSeeProductions).toBe(false);
    expect(agreementCaps(viewerWith({ "productions.manage": "mine" })).canSeeProductions).toBe(true);
  });
  it("μόνο «Παρεκκλίνει»: βλέπει και παρεκκλίνει αλλά δεν συντάσσει", () => {
    expect(agreementCaps(viewerWith({ "agreements.deviate": "all" }))).toEqual({
      ...NONE,
      canView: true,
      canDeviate: true,
    });
  });
  it("μόνο «Συντάσσει»: βλέπει", () => {
    expect(agreementCaps(viewerWith({ "agreements.draft": "mine" }))).toEqual({
      ...NONE,
      canView: true,
      canDraft: true,
    });
  });
  it("η διαχείριση κόστους θέλει και «Βλέπει κόστος»", () => {
    expect(
      agreementCaps(viewerWith({ "finance.costManage": "all" })).canManageCost,
    ).toBe(false);
  });
});

describe("μορφοποίηση", () => {
  it("formatMoney: κόμμα, τελεία χιλιάδων, κενό πριν το €", () => {
    expect(formatMoney(1300)).toBe(`1.300,00${NBSP}€`);
    expect(formatMoney(0.5)).toBe(`0,50${NBSP}€`);
  });
  it("formatPercent: κλάσμα σε ποσοστό με ένα δεκαδικό", () => {
    expect(formatPercent(0.3846)).toBe("38,5%");
    expect(formatPercent(0.5)).toBe("50%");
  });
  it("formatDate: ημερομηνία χωρίς μετακίνηση ζώνης", () => {
    expect(formatDate("2026-09-20")).toBe("20/09/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });
  it("formatDate και formatDateTime: timestamp στην Αθήνα", () => {
    expect(formatDate("2026-09-20T23:30:00Z")).toBe("21/09/2026");
    expect(formatDateTime("2026-09-20T11:05:00Z")).toBe("20/09/2026, 14:05");
  });
  it("formatMonth: όνομα μήνα και έτος", () => {
    expect(formatMonth("2026-09-01")).toBe("Σεπτέμβριος 2026");
    expect(periodLabel({ starts: "2026-12-05" })).toBe("Δεκέμβριος 2026");
  });
  it("athensToday: ημερομηνία Αθήνας, όχι UTC", () => {
    expect(athensToday(new Date("2026-06-30T21:30:00Z"))).toBe("2026-07-01");
    expect(athensToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("parseDecimal: κόμμα ή τελεία, αμφίσημο και σκουπίδια → null", () => {
    expect(parseDecimal("1300,5")).toBe(1300.5);
    expect(parseDecimal("1300.5")).toBe(1300.5);
    expect(parseDecimal("1.300")).toBeNull();
    expect(parseDecimal("1,300")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });
});

describe("endOfTerm", () => {
  it("Έναρξη + Διάρκεια − 1 μέρα", () => {
    expect(endOfTerm("2026-10-05", 6)).toBe("2027-04-04");
    expect(endOfTerm("2026-10-01", 6)).toBe("2027-03-31");
  });
  it("η μέρα που δεν υπάρχει κόβεται στον μήνα, όπως στη βάση", () => {
    expect(endOfTerm("2026-08-31", 6)).toBe("2027-02-27");
  });
  it("περνά τον χρόνο και τα δωδεκάμηνα", () => {
    expect(endOfTerm("2026-12-15", 1)).toBe("2027-01-14");
    expect(endOfTerm("2026-01-01", 12)).toBe("2026-12-31");
  });
});

describe("statusLabel", () => {
  it("πρόταση: με το βήμα της", () => {
    expect(statusLabel({ state: "proposal", path: "draft" })).toBe(
      "πρόταση · Σύνταξη",
    );
    expect(statusLabel({ state: "proposal", path: "lost" })).toBe(
      "πρόταση · Χάθηκε",
    );
  });
  it("μετά την υπογραφή: μόνο η κατάσταση", () => {
    expect(statusLabel({ state: "active", path: "signed" })).toBe("ενεργή");
  });
});

describe("bucketOf και matchesBucket", () => {
  it("πρόταση σε οποιοδήποτε βήμα εκτός από Χάθηκε → proposal", () => {
    for (const path of [
      "draft",
      "awaiting_approval",
      "sent",
      "expired",
    ] as const)
      expect(bucketOf({ state: "proposal", path })).toBe("proposal");
  });
  it("χαμένη πρόταση → closed", () => {
    expect(bucketOf({ state: "proposal", path: "lost" })).toBe("closed");
  });
  it("υπογεγραμμένη και ενεργή → active", () => {
    expect(bucketOf({ state: "signed", path: "signed" })).toBe("active");
    expect(bucketOf({ state: "active", path: "signed" })).toBe("active");
  });
  it("έληξε και λύθηκε → closed", () => {
    expect(bucketOf({ state: "expired", path: "signed" })).toBe("closed");
    expect(bucketOf({ state: "dissolved", path: "signed" })).toBe("closed");
  });
  it("«Ανοιχτές» = προτάσεις και ενεργές", () => {
    expect(matchesBucket("active", "open")).toBe(true);
    expect(matchesBucket("proposal", "open")).toBe(true);
    expect(matchesBucket("closed", "open")).toBe(false);
  });
  it("«Όλες» δείχνει τα πάντα και ο συγκεκριμένος κουβάς μόνο τον εαυτό του", () => {
    expect(matchesBucket("closed", "all")).toBe(true);
    expect(matchesBucket("closed", "closed")).toBe(true);
    expect(matchesBucket("closed", "active")).toBe(false);
  });
});

describe("timeText", () => {
  const base = {
    kind: "monthly" as const,
    validUntil: "2026-10-29",
    path: "signed" as const,
  };
  it("μηνιαία ενεργή: Έναρξη – Λήξη", () => {
    expect(
      timeText({
        ...base,
        state: "active",
        startOn: "2026-10-05",
        endOn: "2027-04-04",
      }),
    ).toBe("05/10/2026 – 04/04/2027");
  });
  it("μόνο Έναρξη", () => {
    expect(
      timeText({
        ...base,
        state: "signed",
        startOn: "2026-10-05",
        endOn: null,
      }),
    ).toBe("από 05/10/2026");
  });
  it("πρόταση: ισχύει ως", () => {
    expect(
      timeText({
        ...base,
        state: "proposal",
        path: "sent",
        startOn: null,
        endOn: null,
      }),
    ).toBe("ισχύει ως 29/10/2026");
  });
  it("εφάπαξ υπογεγραμμένη: από", () => {
    expect(
      timeText({
        ...base,
        kind: "one_off",
        state: "signed",
        startOn: "2026-11-12",
        endOn: null,
      }),
    ).toBe("από 12/11/2026");
  });
});

describe("expiryText", () => {
  it("πληθυντικός, ενικός, σήμερα, τίποτα", () => {
    expect(expiryText(12)).toBe("λήγει σε 12 μέρες");
    expect(expiryText(1)).toBe("λήγει σε 1 μέρα");
    expect(expiryText(0)).toBe("λήγει σήμερα");
    expect(expiryText(null)).toBeNull();
  });
});

describe("describeDeviation: έκπτωση χωρίς ποσά", () => {
  const discount = (kind: "discount_percent" | "discount_months") => ({
    key: "k",
    kind,
    subject: "",
    depth: null,
    baseValue: null,
    value: null,
    status: "new" as const,
  });
  it("με null τιμές δεν γράφει αριθμούς", () => {
    for (const kind of ["discount_percent", "discount_months"] as const) {
      const text = describeDeviation(discount(kind), false);
      expect(text).toBe("Έκπτωση πρώτων μηνών πάνω από την τυπική");
      expect(text).not.toMatch(/\d|—/);
    }
  });
});

describe("formatDocNumber και localizeNumberIn", () => {
  it("ελληνικό κόμμα στο ελληνικό έγγραφο, τελεία στο αγγλικό", () => {
    expect(formatDocNumber("el", 33.33)).toBe("33,33");
    expect(formatDocNumber("en", 33.33)).toBe("33.33");
    expect(formatDocNumber("el", 24)).toBe("24");
  });
  it("αντικαθιστά τον αριθμό μέσα στην ετικέτα", () => {
    expect(localizeNumberIn("el", "ΦΠΑ 24.5%", 24.5)).toBe("ΦΠΑ 24,5%");
    expect(localizeNumberIn("el", "−12.5% τους 3 πρώτους μήνες", 12.5)).toBe(
      "−12,5% τους 3 πρώτους μήνες",
    );
    expect(localizeNumberIn("en", "VAT 24%", 24)).toBe("VAT 24%");
  });
});
