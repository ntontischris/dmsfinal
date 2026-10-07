import { describe, expect, it } from "vitest";

import { covers, diffGrants, lockReason, missingFor } from "./permissions";

describe("covers", () => {
  it("«Όλα» καλύπτει και τα δύο Εύρη", () => {
    expect(covers("all", "all")).toBe(true);
    expect(covers("all", "mine")).toBe(true);
  });

  it("«Με αφορά» καλύπτει μόνο «με αφορά»", () => {
    expect(covers("mine", "mine")).toBe(true);
    expect(covers("mine", "all")).toBe(false);
  });

  it("χωρίς Δικαίωμα δεν καλύπτει τίποτα", () => {
    expect(covers(undefined, "mine")).toBe(false);
  });
});

describe("missingFor (χωρίς κλιμάκωση)", () => {
  const admin = { "clients.view": "all", "filming.view": "all" } as const;

  it("η Διαχείριση δίνει Ρόλο που δεν ξεπερνά τα δικά της", () => {
    expect(missingFor({ "filming.view": "mine" }, admin)).toEqual([]);
  });

  it("δεν δίνει Ρόλο με Δικαίωμα που δεν έχει", () => {
    expect(missingFor({ "finance.invoices": "all", "filming.view": "all" }, admin)).toEqual(["finance.invoices"]);
  });

  it("οι Πωλήσεις δεν δίνουν «Όλα» όταν έχουν «με αφορά»", () => {
    expect(missingFor({ "clients.view": "all" }, { "clients.view": "mine" })).toEqual(["clients.view"]);
  });
});

describe("diffGrants", () => {
  it("δείχνει ό,τι προστέθηκε, άλλαξε ή αφαιρέθηκε", () => {
    expect(diffGrants({ a: "all", b: "mine" }, { b: "all", c: "mine" })).toEqual([
      { permission: "a", before: "all", after: null },
      { permission: "b", before: "mine", after: "all" },
      { permission: "c", before: null, after: "mine" },
    ]);
  });
});

describe("lockReason", () => {
  const admin = { isOwner: false, grants: { "filming.view": "all" } } as const;
  const labelOf = (permission: string) => (permission === "finance.invoices" ? "Καταχωρεί Τιμολόγια" : permission);

  it("ο Ιδιοκτήτης δεν βλέπει τίποτα κλειδωμένο", () => {
    expect(lockReason({ role: { isOwner: true, grants: {} }, viewer: { isOwner: true, grants: {} }, isTargetOwner: true, labelOf })).toBeNull();
  });

  it("τον Ρόλο Ιδιοκτήτης δεν τον δίνει η Διαχείριση", () => {
    expect(lockReason({ role: { isOwner: true, grants: {} }, viewer: admin, isTargetOwner: false, labelOf })).toMatch(/μόνο Ιδιοκτήτης/);
  });

  it("τους Ρόλους ενός Ιδιοκτήτη δεν τους αλλάζει η Διαχείριση", () => {
    expect(lockReason({ role: { isOwner: false, grants: {} }, viewer: admin, isTargetOwner: true, labelOf })).toMatch(/Ιδιοκτήτη/);
  });

  it("λέει ποιο Δικαίωμα λείπει", () => {
    const role = { isOwner: false, grants: { "finance.invoices": "all" } } as const;
    expect(lockReason({ role, viewer: admin, isTargetOwner: false, labelOf })).toBe("σου λείπει «Καταχωρεί Τιμολόγια»");
  });

  it("αφήνει ελεύθερο όποιον Ρόλο καλύπτεις", () => {
    const role = { isOwner: false, grants: { "filming.view": "mine" } } as const;
    expect(lockReason({ role, viewer: admin, isTargetOwner: false, labelOf })).toBeNull();
  });
});
