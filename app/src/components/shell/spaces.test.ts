import { describe, expect, it } from "vitest";

import { visibleNav } from "./nav";
import { currentPlace, landingOf, mobileBar, spacesShell, type SpacesShell } from "./spaces";

// Φανταστικοί θεατές: ο κώδικας ελέγχει μόνο Δικαιώματα, ποτέ ονόματα Ρόλων (ADR 0001).
const everything = () => true;
const fullTeam = (requirement: string) => requirement !== "client" && !requirement.startsWith("c.");
const fullClient = (requirement: string) => requirement === "client" || requirement.startsWith("c.");
const teamWith =
  (...permissions: string[]) =>
  (requirement: string) =>
    requirement === "team" || permissions.includes(requirement);

const placedHrefs = (shell: SpacesShell): string[] => [
  ...shell.spaces.flatMap((space) => [...space.tabs, ...space.more].map((link) => link.href)),
  ...shell.tools.map((link) => link.href),
];

const navHrefs = (allows: (requirement: string) => boolean): string[] => [
  ...new Set(visibleNav(allows).flatMap((section) => section.items.map((item) => item.href))),
];

const labelsOf = (shell: SpacesShell) => shell.spaces.map((space) => space.label);
const space = (shell: SpacesShell, id: string) => shell.spaces.find((view) => view.id === id);

describe("spacesShell: τίποτα δεν χάνεται", () => {
  it.each([
    ["χωρίς βάση (όλα ορατά)", everything],
    ["ομάδα με όλα τα Δικαιώματα", fullTeam],
    ["πελάτης με όλα τα Δικαιώματα", fullClient],
  ])("%s: κάθε ορατή οθόνη του μενού υπάρχει ακριβώς μία φορά", (_, allows) => {
    const placed = placedHrefs(spacesShell(allows));
    for (const href of navHrefs(allows)) expect(placed.filter((h) => h === href), href).toHaveLength(1);
    expect(placed.length).toBe(navHrefs(allows).length);
  });
});

describe("spacesShell: Χώροι από τα Δικαιώματα", () => {
  it("η ομάδα βλέπει τους 6 Χώρους με τη σειρά τους", () => {
    expect(labelsOf(spacesShell(fullTeam))).toEqual(["Σήμερα", "Πελάτες", "Παραγωγή", "Χρήματα", "Επικοινωνία", "Εταιρεία"]);
  });

  it("ο πελάτης βλέπει τους Χώρους πελάτη, χωρίς όσους δεν του ανοίγουν", () => {
    expect(labelsOf(spacesShell(fullClient))).toEqual(["Σήμερα", "Η δουλειά μου", "Γυρίσματα", "Λογαριασμός", "Μηνύματα"]);
    expect(labelsOf(spacesShell((requirement) => requirement === "client"))).toEqual(["Σήμερα", "Γυρίσματα"]);
  });

  it("κρύβει Χώρους και καρτέλες που δεν επιτρέπονται", () => {
    const shell = spacesShell(teamWith("clients.view"));
    // Το Kit το βλέπει όλη η ομάδα· χωρίς άλλη καρτέλα στην Εταιρεία, γίνεται η καρτέλα της.
    expect(labelsOf(shell)).toEqual(["Σήμερα", "Πελάτες", "Εταιρεία"]);
    expect(space(shell, "company")?.tabs.map((tab) => tab.code)).toEqual(["KIT"]);
    expect(space(shell, "clients")?.tabs.map((tab) => tab.code)).toEqual(["B1"]);
    expect(space(shell, "clients")?.more).toEqual([]);
    expect(shell.tools.map((tool) => tool.code)).toEqual(["A2", "A8"]);
  });

  it("κρύβει μία καρτέλα χωρίς Δικαίωμα και κρατά τις υπόλοιπες", () => {
    const money = space(spacesShell(teamWith("finance.view")), "money");
    expect(money?.tabs.map((tab) => tab.code)).toEqual(["I2", "I1", "I4"]);
    expect(money?.more.map((link) => link.code)).toEqual(["I5"]);
  });

  it("όταν δεν φαίνεται καμία καρτέλα, τα «Περισσότερα» γίνονται καρτέλες για να μη χαθούν", () => {
    const production = space(spacesShell(teamWith("filming.approve")), "production");
    expect(production?.tabs.map((tab) => tab.code)).toEqual(["E2"]);
    expect(production?.more).toEqual([]);
  });

  it("ο Χώρος ανοίγει την πρώτη ορατή καρτέλα του", () => {
    const shell = spacesShell(teamWith("finance.cost"));
    expect(space(shell, "money") && landingOf(space(shell, "money")!)).toBe("/app/productions/costs");
    expect(landingOf(space(spacesShell(fullTeam), "today")!)).toBe("/app");
  });

  it("δίνει σύντομες ετικέτες στις καρτέλες", () => {
    expect(space(spacesShell(fullTeam), "clients")?.tabs.map((tab) => tab.label)).toEqual([
      "Πελάτες",
      "Pipeline",
      "Συμφωνίες",
      "Κατάλογος",
    ]);
  });
});

describe("currentPlace", () => {
  const shell = spacesShell(fullTeam);

  it.each([
    ["/app", "today", "/app"],
    ["/app/clients/123", "clients", "/app/clients"],
    ["/app/clients/duplicates", "clients", "/app/clients/duplicates"],
    ["/app/team/roles/abc", "company", "/app/team/roles"],
    ["/app/filming/mine", "today", "/app/filming/mine"],
    ["/app/messages/42", "talk", "/app/messages"],
  ])("%s → Χώρος %s, οθόνη %s", (pathname, spaceId, href) => {
    expect(currentPlace(pathname, shell)).toEqual({ spaceId, href });
  });

  it("τα εργαλεία πάνω δεξιά δεν ανάβουν Χώρο", () => {
    expect(currentPlace("/app/knowledge/abc", shell)).toEqual({ spaceId: undefined, href: "/app/knowledge" });
  });
});

describe("mobileBar", () => {
  it("με 6 Χώρους κρατά 4 στη μπάρα και η Εταιρεία πάει στο «Περισσότερα»", () => {
    const { bar, more } = mobileBar(spacesShell(fullTeam).spaces);
    expect(bar.map((view) => view.id)).toEqual(["today", "clients", "production", "money"]);
    expect(more.map((view) => view.id)).toEqual(["talk", "company"]);
  });

  it("έως 5 Χώροι χωράνε όλοι", () => {
    expect(mobileBar(spacesShell(fullClient).spaces).more).toEqual([]);
  });
});
