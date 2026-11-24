import { describe, expect, it } from "vitest";

import { visibleNav } from "@/components/shell/nav";
import { codeOfPath, hrefOf } from "@/spaces/data/screens";
import {
  landingOf,
  mobileBar,
  screenCodeOf,
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

describe("spacesModel: το μενού από τα Δικαιώματα", () => {
  it("η ομάδα βλέπει τα 14 θέματα του μενού με τη σειρά τους", () => {
    expect(labelsOf(spacesModel(fullTeam))).toEqual([
      "Αρχική",
      "Πελάτες",
      "Πωλήσεις",
      "Συμφωνίες",
      "Παραγωγές",
      "Γυρίσματα",
      "Ημερολόγιο",
      "Μηνύματα",
      "Τιμολόγια",
      "Αναφορές",
      "Ομάδα",
      "Εξοπλισμός",
      "Γνώση",
      "Ρυθμίσεις",
    ]);
  });

  it("τα θέματα της ομάδας είναι σε 5 ομάδες, με την Αρχική μόνη της", () => {
    const groups = spacesModel(fullTeam).spaces.map((view) => view.group);
    expect(new Set(groups).size).toBe(5);
    expect(groups[0]).not.toBe(groups[1]);
  });

  it("οι Ειδοποιήσεις μένουν εργαλείο και για τον πελάτη", () => {
    expect(spacesModel(fullClient).tools.map((tool) => tool.code)).toContain("A2");
  });

  it("ο πελάτης βλέπει τα θέματα πελάτη, χωρίς όσα δεν του ανοίγουν", () => {
    expect(labelsOf(spacesModel(fullClient))).toEqual([
      "Σήμερα",
      "Η δουλειά μου",
      "Γυρίσματα",
      "Λογαριασμός",
      "Μηνύματα",
    ]);
  });

  it("κρύβει θέματα, λίστες και ουρές που δεν επιτρέπονται", () => {
    const model = spacesModel(teamWith("clients.view"));
    expect(labelsOf(model)).not.toContain("Τιμολόγια");
    expect(labelsOf(model)).not.toContain("Πωλήσεις");
    expect(space(model, "clients")?.tabs.map((tab) => tab.code)).toEqual(["B1"]);
    expect(space(model, "clients")?.queues.B1).toEqual([]);
  });

  it("η Γνώση μπαίνει στο μενού όταν φαίνεται, και τότε φεύγει από τα εργαλεία", () => {
    const model = spacesModel(fullTeam);
    expect(space(model, "knowledge")?.tabs.map((tab) => tab.code)).toContain("A8");
    expect(model.tools.map((tool) => tool.code)).toEqual(["A2"]);
  });

  it("οι ουρές φαίνονται ως φίλτρα κάτω από τη λίστα-γονιό τους", () => {
    const model = spacesModel(fullTeam);
    expect(space(model, "clients")?.queues.B1?.map((link) => link.code)).toEqual(["B6"]);
    expect(space(model, "sales")?.queues.B3?.map((link) => link.code)).toEqual(["B5"]);
    expect(space(model, "agreements")?.queues.D1?.map((link) => link.code)).toEqual(["D4"]);
  });

  it("όταν δεν φαίνεται καμία λίστα, οι οθόνες του θέματος γίνονται λίστες για να μη χαθούν", () => {
    const filming = space(spacesModel(teamWith("filming.approve")), "filming");
    expect(filming?.tabs.map((tab) => tab.code)).toEqual(["E2"]);
  });

  it("το θέμα ανοίγει την πρώτη ορατή λίστα του", () => {
    expect(landingOf(space(spacesModel(teamWith("finance.cost")), "invoices")!)).toBe("/app/finance/expenses");
    expect(landingOf(space(spacesModel(fullTeam), "home")!)).toBe("/app");
  });
});

describe("Τιμολόγια: το πρώτο δείγμα", () => {
  it("ανοίγει στη λίστα Τιμολογίων, με τις άλλες λίστες από κάτω", () => {
    const invoices = space(spacesModel(fullTeam), "invoices");
    expect(invoices?.tabs.map((tab) => tab.code)).toEqual(["I2", "I1", "I4", "I6"]);
    expect(landingOf(invoices!)).toBe("/app/finance/invoices");
  });

  it("η Κερδοφορία και οι Αναφορές ζουν στις «Αναφορές»", () => {
    const reports = space(spacesModel(fullTeam), "reports");
    expect(reports?.tabs.map((tab) => tab.code)).toEqual(["M1"]);
    expect([...(reports?.more ?? [])].map((link) => link.code)).toEqual(expect.arrayContaining(["M2", "I7"]));
  });
});

describe("ποιο θέμα ανάβει", () => {
  const model = spacesModel(fullTeam);

  it.each([
    ["/app", "home"],
    ["/app/clients/123", "clients"],
    ["/app/clients/duplicates", "clients"],
    ["/app/pipeline/abc", "sales"],
    ["/app/team/roles/abc", "team"],
    ["/app/filming/mine", "filming"],
    ["/app/messages/42", "messages"],
    ["/app/knowledge", "knowledge"],
  ])("%s → %s", (pathname, spaceId) => {
    expect(spaceOf(codeOfPath(pathname), model)?.id).toBe(spaceId);
  });

  it("η ίδια διαδρομή είναι J1 για την ομάδα και J3 για τον πελάτη", () => {
    expect(screenCodeOf("/app/messages", model)).toBe("J1");
    const client = spacesModel(fullClient);
    expect(screenCodeOf("/app/messages", client)).toBe("J3");
    expect(spaceOf(screenCodeOf("/app/messages", client), client)?.id).toBe("c-messages");
  });

  it("ουρά και υποσελίδα ανάβουν τη λίστα-γονιό τους", () => {
    expect(tabOf("B6")).toBe("B1");
    expect(tabOf("O2")).toBe("O1");
    expect(tabOf("B1")).toBe("B1");
  });
});

describe("θέμα χωρίς τίποτα χρήσιμο", () => {
  it("οι «Ρυθμίσεις» δεν φαίνονται σε Χρήστη ομάδας χωρίς Δικαίωμα σε αυτές", () => {
    expect(space(spacesModel(teamWith("filming.view")), "settings")).toBeUndefined();
  });

  it("ο Ιδιοκτήτης τις βλέπει, με το Kit μέσα", () => {
    const owner = (requirement: string) => requirement === "team" || requirement === "owner";
    expect(space(spacesModel(owner), "settings")?.codes).toContain("KIT");
  });
});

describe("mobileBar", () => {
  it("με 14 θέματα κρατά 4 στη μπάρα και τα υπόλοιπα πάνε στο «Περισσότερα»", () => {
    const { bar, more } = mobileBar(spacesModel(fullTeam).spaces);
    expect(bar.map((view) => view.id)).toEqual(["home", "clients", "sales", "agreements"]);
    expect(more).toHaveLength(10);
  });

  it("έως 5 θέματα χωράνε όλα", () => {
    expect(mobileBar(spacesModel(fullClient).spaces).more).toEqual([]);
  });
});
