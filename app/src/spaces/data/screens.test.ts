import { describe, expect, it } from "vitest";

import { codeOfPath, hrefOf, isCodeVisible } from "@/spaces/data/screens";
import {
  newActionHref,
  newActionsFor,
  newEntryFor,
} from "@/spaces/data/new-actions";

describe("hrefOf: κωδικός → πραγματική διαδρομή", () => {
  it.each([
    ["A1", {}, "/app"],
    ["B1", {}, "/app/clients"],
    [
      "B1",
      { q: "καφέ", empty: undefined },
      "/app/clients?q=%CE%BA%CE%B1%CF%86%CE%AD",
    ],
    ["B2", { id: "c-1" }, "/app/clients/c-1"],
    ["B3", {}, "/app/pipeline"],
    ["B4", { id: "o-1" }, "/app/pipeline/o-1"],
    ["B6", {}, "/app/clients/duplicates"],
    ["D2", { id: "a-1" }, "/app/agreements/a-1"],
    ["E4", {}, "/app/filming/new"],
    ["G2", { id: "p-1" }, "/app/productions/p-1"],
    ["H1", { team: "1" }, "/app/deliverables?team=1"],
    ["I3", {}, "/app/finance/invoices/new"],
    ["A2", {}, "/app/notifications"],
  ])("%s %j → %s", (code, params, href) => {
    expect(hrefOf(code, params)).toBe(href);
  });
});

describe("codeOfPath: διαδρομή → κωδικός", () => {
  it.each([
    ["/app", "A1"],
    ["/app/clients", "B1"],
    ["/app/clients/123", "B2"],
    ["/app/clients/duplicates", "B6"],
    ["/app/pipeline/9", "B4"],
    ["/app/filming/new", "E4"],
    ["/app/filming/42", "E3"],
    ["/app/team/roles/abc", "N4"],
    ["/app/settings/automations/x", "K1"],
  ])("%s → %s", (pathname, code) => {
    expect(codeOfPath(pathname)).toBe(code);
  });
});

describe("isCodeVisible: από τα Δικαιώματα του NAV", () => {
  const onlyClients = (requirement: string) =>
    requirement === "team" || requirement === "clients.view";

  it("οθόνη του μενού και η σελίδα λεπτομέρειάς της ακολουθούν το ίδιο Δικαίωμα", () => {
    expect(isCodeVisible("B1", onlyClients)).toBe(true);
    expect(isCodeVisible("B2", onlyClients)).toBe(true);
    expect(isCodeVisible("B3", onlyClients)).toBe(false);
    expect(isCodeVisible("B4", onlyClients)).toBe(false);
  });

  it("κωδικός του prototype χωρίς σελίδα δεν φαίνεται ποτέ", () => {
    expect(isCodeVisible("I6", () => true)).toBe(false);
    expect(isCodeVisible("Q1", () => true)).toBe(false);
  });
});

describe("+ Νέο", () => {
  it("δείχνει μόνο ό,τι ανοίγει ο Χρήστης, με όλα τα Δικαιώματα της φόρμας", () => {
    const allows = (requirement: string) =>
      ["team", "clients.manage", "finance.view"].includes(requirement);
    expect(newActionsFor(allows).map((action) => action.label)).toEqual([
      "Νέα Ευκαιρία",
      "Ρεπό / Άδεια / ραντεβού",
    ]);
  });

  it("με μία μόνο δημιουργία γίνεται κουμπί με το όνομά της", () => {
    expect(
      newEntryFor((requirement) => requirement === "c.book"),
    ).toMatchObject({ kind: "single", label: "Κράτηση" });
    expect(newEntryFor(() => false)).toBeNull();
  });

  it("η Νέα Ευκαιρία ανοίγει τη φόρμα στη λίστα Πελατών, με νέα τιμή κάθε φορά", () => {
    const [action] = newActionsFor(
      (requirement) => requirement === "clients.manage",
    );
    expect(newActionHref(action, "42")).toBe("/app/clients?new=42");
  });
});
