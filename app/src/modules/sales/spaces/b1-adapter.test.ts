import { describe, expect, it } from "vitest";

import type { ClientOverview, ClientRow, SalesCaps } from "../types";
import { b1ColumnsOf, b1RowsOf } from "./b1-adapter";

const caps = (overrides: Partial<SalesCaps> = {}): SalesCaps => ({
  userId: "me",
  canViewClients: true,
  canManage: true,
  manageScope: "all",
  canTransfer: false,
  canMerge: true,
  canDelete: false,
  canManageSettings: false,
  ...overrides,
});

const client = (overrides: Partial<ClientRow> = {}): ClientRow => ({
  id: "c-1",
  name: "Κυψέλη Καφέ",
  city: "Αθήνα",
  managerId: "me",
  managerName: "Άννα Δημητρίου",
  canOpen: true,
  openOpportunities: 1,
  isPossibleDuplicate: false,
  ...overrides,
});

const overview = (overrides: Partial<ClientOverview> = {}): ClientOverview => ({
  clientId: "c-1",
  status: "active",
  activeAgreements: 2,
  packageName: "Social B",
  provisions: [
    {
      kindId: "k",
      unit: "Γυρίσματα",
      isShoot: true,
      given: 2,
      carried: 0,
      used: 1,
      reserved: 0,
    },
  ],
  nextFilming: "2026-11-10T08:00:00Z",
  balanceCents: 12_400,
  lastContact: "2026-10-30T10:00:00Z",
  ...overrides,
});

describe("b1RowsOf", () => {
  it("ενώνει τον Πελάτη με την εικόνα του από μία ανάγνωση, με το id", () => {
    const [row] = b1RowsOf([client()], [overview()], caps());
    expect(row).toMatchObject({
      href: "/app/clients/c-1",
      status: "Ενεργός",
      owner: "Άννα Δημητρίου",
      packageName: "Social B",
      activeAgreements: 2,
      lastContact: "2026-10-30T10:00:00Z",
      ownership: null,
      isTaken: false,
      mergeHref: "/app/clients/duplicates",
    });
    expect(row.balance).toMatch(/^124/);
    expect(row.month?.meters).toEqual([
      { label: "γυρίσματα", used: 1, total: 2 },
    ]);
    expect(row.month?.next).toBe("10/11");
  });

  it("οι τρεις καταστάσεις του Πελάτη, και κενό όταν δεν φορτώθηκε η εικόνα", () => {
    const rows = b1RowsOf(
      [
        client({ id: "a" }),
        client({ id: "b" }),
        client({ id: "c" }),
        client({ id: "d" }),
      ],
      [
        overview({ clientId: "a", status: "candidate" }),
        overview({ clientId: "b", status: "inactive" }),
        overview({ clientId: "c", status: "active" }),
      ],
      caps(),
    );
    expect(rows.map((row) => row.status)).toEqual([
      "Υποψήφιος",
      "Ανενεργός",
      "Ενεργός",
      null,
    ]);
  });

  it("ό,τι δεν βλέπει ο Χρήστης μένει κενό", () => {
    const [row] = b1RowsOf(
      [client({ openOpportunities: null })],
      [
        overview({
          balanceCents: null,
          activeAgreements: null,
          lastContact: null,
          provisions: [],
        }),
      ],
      caps(),
    );
    expect(row).toMatchObject({
      balance: null,
      activeAgreements: null,
      lastContact: null,
      month: null,
    });
  });

  it("Πωλήσεις «όσα με αφορούν»: δικός μου, μέσω Ευκαιρίας, ή κατειλημμένος", () => {
    const rows = b1RowsOf(
      [
        client({ id: "mine" }),
        client({ id: "granted", managerId: "other", managerName: "Νίκος" }),
        client({
          id: "taken",
          managerId: "other",
          managerName: "Νίκος",
          canOpen: false,
        }),
      ],
      [],
      caps({ manageScope: "mine" }),
    );
    expect(rows.map((row) => row.ownership?.badge ?? null)).toEqual([
      null,
      "Μέσω της Ευκαιρίας σου",
      "Ανήκει σε άλλον πωλητή",
    ]);
    expect(rows.map((row) => row.isTaken)).toEqual([false, false, true]);
  });

  it("το «Πιθανό διπλό» φαίνεται μόνο σε όποιον συγχωνεύει", () => {
    const duplicate = client({ isPossibleDuplicate: true });
    expect(b1RowsOf([duplicate], [], caps())[0].isPossibleDuplicate).toBe(true);
    expect(
      b1RowsOf([duplicate], [], caps({ canMerge: false }))[0]
        .isPossibleDuplicate,
    ).toBe(false);
  });
});

describe("b1ColumnsOf", () => {
  it("μόνο ανάγνωση: χωρίς Υπεύθυνο, και χωρίς Ευκαιρίες και Υπόλοιπο όταν η βάση δεν τα δίνει", () => {
    const readOnly = caps({ canManage: false, manageScope: null });
    const rows = b1RowsOf(
      [client({ openOpportunities: null })],
      [overview({ balanceCents: null })],
      readOnly,
    );
    expect(b1ColumnsOf(rows, readOnly)).toEqual({
      showOwner: false,
      showOpportunities: false,
      showAgreements: true,
      showBalance: false,
    });
  });
});
