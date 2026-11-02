import { describe, expect, it } from "vitest";

import { visibleNav } from "@/components/shell/nav";
import { codeOfPath, hrefOf } from "@/spaces/data/screens";
import {
  landingOf,
  mobileBar,
  spaceOf,
  spacesModel,
  tabOf,
  type SpacesModel,
} from "@/spaces/data/spaces";

// Φανταστικοί θεατές: ο κώδικας ελέγχει μόνο Δικαιώματα, ποτέ ονόματα Ρόλων (ADR 0001).
const everything = () => true;
const fullTeam = (requirement: string) =>
  requirement !== "client" && !requirement.startsWith("c.");
const fullClient = (requirement: string) =>
  requirement === "client" || requirement.startsWith("c.");
const teamWith =
  (...permissions: string[]) =>
  (requirement: string) =>
    requirement === "team" || permissions.includes(requirement);

// Οι Ρυθμίσεις έχουν δικές τους καρτέλες μέσα στη σελίδα (SettingsTabs): οι υποσελίδες τους φτάνονται από εκεί.
const SUBPAGES_OF_O1 = ["O2", "O3", "O6", "O7", "K3"];

// Πού φαίνεται κάθε διαδρομή: καρτέλα, ουρά, «Περισσότερα», εργαλείο, προφίλ, ή υποσελίδα ορατής καρτέλας.
// Μετριέται η διαδρομή (όπως στο #220): το J3 του πελάτη και το J1 της ομάδας είναι η ίδια σελίδα.
const placedHrefs = (model: SpacesModel): string[] => {
  const tabs = model.spaces.flatMap((space) => space.tabs);
  return [
    ...tabs,
    ...model.spaces.flatMap((space) => Object.values(space.queues).flat()),
    ...model.spaces.flatMap((space) => space.more),
    ...model.tools,
    ...model.profile,
  ]
    .map((link) => link.href)
    .concat(tabs.some((tab) => tab.code === "O1") ? SUBPAGES_OF_O1.map((code) => hrefOf(code)) : []);
};

const navItems = (allows: (requirement: string) => boolean) => visibleNav(allows).flatMap((section) => section.items);

const labelsOf = (model: SpacesModel) =>
  model.spaces.map((space) => space.label);
const space = (model: SpacesModel, id: string) =>
  model.spaces.find((view) => view.id === id);

describe("spacesModel: τίποτα δεν χάνεται", () => {
  it.each([
    ["χωρίς βάση (όλα ορατά)", everything],
    ["ομάδα με όλα τα Δικαιώματα", fullTeam],
    ["ομάδα μόνο με Πελάτες", teamWith("clients.view")],
    ["ομάδα μόνο με Οικονομικά κόστους", teamWith("finance.cost")],
    ["ομάδα μόνο με έγκριση Γυρισμάτων", teamWith("filming.approve")],
    ["πελάτης με όλα τα Δικαιώματα", fullClient],
  ])("%s: κάθε ορατή οθόνη του μενού φαίνεται κάπου, μία φορά", (_, allows) => {
    const placed = placedHrefs(spacesModel(allows));
    for (const href of new Set(navItems(allows).map((item) => item.href)))
      expect(placed.filter((other) => other === href), href).toHaveLength(1);
  });
});

describe("spacesModel: Χώροι από τα Δικαιώματα", () => {
  it("η ομάδα βλέπει τους 6 Χώρους με τη σειρά τους", () => {
    expect(labelsOf(spacesModel(fullTeam))).toEqual([
      "Σήμερα",
      "Πελάτες",
      "Παραγωγή",
      "Χρήματα",
      "Επικοινωνία",
      "Εταιρεία",
    ]);
  });

  it("ο πελάτης βλέπει τους Χώρους πελάτη, χωρίς όσους δεν του ανοίγουν", () => {
    expect(labelsOf(spacesModel(fullClient))).toEqual([
      "Σήμερα",
      "Η δουλειά μου",
      "Γυρίσματα",
      "Λογαριασμός",
      "Μηνύματα",
    ]);
  });

  it("κρύβει Χώρους, καρτέλες και ουρές που δεν επιτρέπονται", () => {
    const model = spacesModel(teamWith("clients.view"));
    expect(labelsOf(model)).toEqual(["Σήμερα", "Πελάτες", "Εταιρεία"]);
    expect(space(model, "clients")?.tabs.map((tab) => tab.code)).toEqual([
      "B1",
    ]);
    expect(space(model, "clients")?.queues.B1).toEqual([]);
    expect(model.tools.map((tool) => tool.code)).toEqual(["A2", "A8"]);
  });

  it("οι ουρές φαίνονται ως φίλτρα κάτω από τη λίστα-γονιό τους", () => {
    const clients = space(spacesModel(fullTeam), "clients");
    expect(clients?.queues.B1?.map((link) => link.code)).toEqual(["B5", "B6"]);
    expect(clients?.queues.D1?.map((link) => link.code)).toEqual(["D4"]);
    expect(clients?.more).toEqual([]);
  });

  it("όταν δεν φαίνεται καμία καρτέλα, οι οθόνες του Χώρου γίνονται καρτέλες για να μη χαθούν", () => {
    const production = space(
      spacesModel(teamWith("filming.approve")),
      "production",
    );
    expect(production?.tabs.map((tab) => tab.code)).toEqual(["E2"]);
  });

  it("ο Χώρος ανοίγει την πρώτη ορατή καρτέλα του", () => {
    const model = spacesModel(teamWith("finance.cost"));
    expect(landingOf(space(model, "money")!)).toBe("/app/finance/expenses");
    expect(landingOf(space(spacesModel(fullTeam), "today")!)).toBe("/app");
  });

  it("δίνει σύντομες ετικέτες και τον σύνδεσμο «Τιμές» προς τον Κατάλογο", () => {
    const model = spacesModel(fullTeam);
    expect(space(model, "clients")?.tabs.map((tab) => tab.label)).toEqual([
      "Πελάτες",
      "Pipeline",
      "Συμφωνίες",
      "Κατάλογος",
    ]);
    expect(space(model, "money")?.links).toEqual([
      { code: "C1", label: "Τιμές", href: "/app/catalogue", space: "Πελάτες" },
    ]);
  });
});

describe("ποιος Χώρος ανάβει", () => {
  const model = spacesModel(fullTeam);

  it.each([
    ["/app", "today"],
    ["/app/clients/123", "clients"],
    ["/app/clients/duplicates", "clients"],
    ["/app/pipeline/abc", "clients"],
    ["/app/team/roles/abc", "company"],
    ["/app/filming/mine", "today"],
    ["/app/messages/42", "talk"],
    ["/app/notifications", "today"],
  ])("%s → Χώρος %s", (pathname, spaceId) => {
    expect(spaceOf(codeOfPath(pathname), model)?.id).toBe(spaceId);
  });

  it("η Γνώση είναι εργαλείο, δεν ανάβει Χώρο", () => {
    expect(spaceOf(codeOfPath("/app/knowledge"), model)).toBeUndefined();
  });

  it("ουρά και υποσελίδα ανάβουν την καρτέλα-γονιό τους", () => {
    expect(tabOf("B6")).toBe("B1");
    expect(tabOf("O2")).toBe("O1");
    expect(tabOf("B1")).toBe("B1");
  });
});

describe("mobileBar", () => {
  it("με 6 Χώρους κρατά 4 στη μπάρα και οι υπόλοιποι πάνε στο «Περισσότερα»", () => {
    const { bar, more } = mobileBar(spacesModel(fullTeam).spaces);
    expect(bar.map((view) => view.id)).toEqual([
      "today",
      "clients",
      "production",
      "money",
    ]);
    expect(more.map((view) => view.id)).toEqual(["talk", "company"]);
  });

  it("έως 5 Χώροι χωράνε όλοι", () => {
    expect(mobileBar(spacesModel(fullClient).spaces).more).toEqual([]);
  });
});
