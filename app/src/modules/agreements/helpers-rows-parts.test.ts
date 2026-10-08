import { describe, expect, it } from "vitest";

import {
  filterRows,
  proposalUrl,
  toAgreementRowView,
} from "./helpers";
import type { AgreementRow } from "./types";

const NBSP = String.fromCharCode(0xa0);

const row = (over: Partial<AgreementRow> = {}): AgreementRow => ({
  id: "a1",
  opportunityId: "o1",
  clientId: "c1",
  clientName: "Κυψέλη Καφέ",
  title: "Μηνιαία Παρουσία",
  kind: "monthly",
  state: "proposal",
  path: "sent",
  revision: 1,
  managerId: "u1",
  managerName: "Άννα",
  validUntil: "2026-10-29",
  startOn: null,
  endOn: null,
  signedAt: null,
  signatoryName: "Μαρία",
  total: 1300,
  discountPercent: 0,
  discountMonths: 0,
  changeRequestsOpen: 0,
  linksOpened: 0,
  expiresInDays: null,
  isLowMargin: null,
  updatedAt: "2026-10-01T10:00:00Z",
  ...over,
});

describe("toAgreementRowView", () => {
  it("ποσό μηνιαίας και εφάπαξ", () => {
    expect(toAgreementRowView(row()).amount).toBe(`1.300,00${NBSP}€ / μήνα`);
    expect(toAgreementRowView(row({ kind: "one_off" })).amount).toBe(
      `1.300,00${NBSP}€ εφάπαξ`,
    );
  });
  it("ποσό null όταν ο θεατής δεν βλέπει ποσά (ποτέ 0)", () => {
    const view = toAgreementRowView(
      row({ total: null, discountPercent: null, discountMonths: null }),
    );
    expect(view.amount).toBeNull();
    expect(view.discountNote).toBeNull();
  });
  it("σημείωση έκπτωσης με ενικό και πληθυντικό", () => {
    expect(
      toAgreementRowView(row({ discountPercent: 10, discountMonths: 2 }))
        .discountNote,
    ).toBe("−10% 2 μήνες");
    expect(
      toAgreementRowView(row({ discountPercent: 25, discountMonths: 1 }))
        .discountNote,
    ).toBe("−25% 1 μήνα");
  });
  it("χωρίς έκπτωση δεν υπάρχει σημείωση", () => {
    expect(toAgreementRowView(row()).discountNote).toBeNull();
  });
  it("προσοχή: Αναμένει Έγκριση, Έληξε, Ζήτησε αλλαγές", () => {
    const awaiting = toAgreementRowView(row({ path: "awaiting_approval" }));
    expect([awaiting.isAttention, awaiting.attentionLabel]).toEqual([
      true,
      "Αναμένει Έγκριση",
    ]);
    const expired = toAgreementRowView(row({ path: "expired" }));
    expect([expired.isAttention, expired.attentionLabel]).toEqual([
      true,
      "Έληξε",
    ]);
    const changes = toAgreementRowView(row({ changeRequestsOpen: 2 }));
    expect([changes.isAttention, changes.attentionLabel]).toEqual([
      true,
      "Ζήτησε αλλαγές",
    ]);
    expect(changes.hasChangeRequests).toBe(true);
  });
  it("χωρίς λόγο προσοχής", () => {
    const view = toAgreementRowView(row());
    expect([view.isAttention, view.attentionLabel]).toEqual([false, null]);
  });
  it("χαμηλό περιθώριο μόνο όταν είναι αληθές (null → false)", () => {
    expect(toAgreementRowView(row({ isLowMargin: null })).isLowMargin).toBe(
      false,
    );
    expect(toAgreementRowView(row({ isLowMargin: true })).isLowMargin).toBe(
      true,
    );
  });
  it("συνδέσμους, ετικέτες και κουβά", () => {
    const view = toAgreementRowView(row());
    expect(view).toMatchObject({
      href: "/app/agreements/a1",
      clientHref: "/app/clients/c1",
      kindLabel: "μηνιαία",
      statusLabel: "πρόταση · Εστάλη",
      bucket: "proposal",
      timeText: "ισχύει ως 29/10/2026",
      managerName: "Άννα",
    });
  });
});

describe("filterRows", () => {
  const views = [
    toAgreementRowView(row()),
    toAgreementRowView(
      row({
        id: "a2",
        clientName: "Εστιατόριο Ήλιος",
        title: "Εκδήλωση",
        kind: "one_off",
        state: "active",
        path: "signed",
      }),
    ),
    toAgreementRowView(row({ id: "a3", path: "lost", title: "Παλιά" })),
  ];
  it("αναζήτηση στον Πελάτη και στον τίτλο, χωρίς τόνους και πεζά-κεφαλαία", () => {
    const ids = (query: string) =>
      filterRows(views, { query, kind: "all", bucket: "all" }).map((r) => r.id);
    expect(ids("κυψελη")).toEqual(["a1", "a3"]);
    expect(ids("εκδηλωση")).toEqual(["a2"]);
    expect(ids("ΗΛΙΟΣ")).toEqual(["a2"]);
  });
  it("φίλτρα κουβά και είδους συνδυάζονται", () => {
    const ids = (
      kind: "all" | "monthly" | "one_off",
      bucket: "open" | "closed" | "all",
    ) => filterRows(views, { query: "", kind, bucket }).map((r) => r.id);
    expect(ids("all", "open")).toEqual(["a1", "a2"]);
    expect(ids("one_off", "open")).toEqual(["a2"]);
    expect(ids("monthly", "closed")).toEqual(["a3"]);
  });
});

describe("proposalUrl", () => {
  it("ενώνει χωρίς διπλή κάθετο", () => {
    expect(proposalUrl("https://x.gr", "/p/abc")).toBe("https://x.gr/p/abc");
    expect(proposalUrl("https://x.gr/", "/p/abc")).toBe("https://x.gr/p/abc");
  });
});

