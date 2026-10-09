import { describe, expect, it } from "vitest";

import { agreementViewSchema } from "./view-schema";
import { camelize } from "./view-schema-parts";

const ID = "11111111-1111-4111-8111-111111111111";
const KIND = "22222222-2222-4222-8222-222222222222";

// Ό,τι επιστρέφει η βάση: snake_case, όπως στο §2.7.
const NULL_CAN = {
  see_amounts: false,
  see_cost: false,
  manage_cost: false,
  edit: false,
  edit_prices: false,
  edit_cost: false,
  send: false,
  request_approval: false,
  withdraw_approval: false,
  decide: false,
  new_revision: false,
  extend: false,
  close_lost: false,
  manage_links: false,
  sign_outside: false,
};

const viewJson = {
  id: ID,
  kind: "monthly",
  title: "Μηνιαία Παρουσία",
  language: "el",
  state: "proposal",
  path: "draft",
  revision: 1,
  valid_until: "2026-10-29",
  start_on: null,
  end_on: null,
  duration_months: 6,
  signed_at: null,
  updated_at: "2026-10-08T10:00:00Z",
  opportunity: {
    id: ID,
    title: "Πρόταση",
    outcome: "open",
    manager_id: ID,
    manager_name: "Άννα",
  },
  client: {
    id: ID,
    name: "Κυψέλη",
    contact_name: "Μαρία",
    contact_email: "m@x.gr",
  },
  terms: {
    payment_days: 15,
    unused_provisions: "next_period",
    grace_days: 10,
    renewal: "new_opportunity",
    dissolution_notice_days: 30,
    filming_notice_hours: 48,
    filming_cancel_hours: 24,
    late_cancel_burns: true,
    no_show_burns: true,
  },
  money_terms: {
    discount_percent: 10,
    discount_months: 2,
    dissolution_fee: 0,
    vat_rate: 24,
  },
  baseline: {
    payment_days: 15,
    unused_provisions: "next_period",
    grace_days: 10,
    dissolution_notice_days: 30,
    dissolution_fee: 0,
    filming_notice_hours: 48,
    filming_cancel_hours: 24,
    late_cancel_burns: true,
    no_show_burns: true,
    standard_discount_percent: 10,
    standard_discount_months: 2,
    advance_percent: 50,
  },
  lines: [
    {
      id: ID,
      position: 1,
      kind: "package",
      item_id: KIND,
      description: "Μηνιαία Παρουσία",
      description_en: "",
      unit: "",
      quantity: 1,
      unit_price: 1300,
      catalog_price: 1300,
      line_total: 1300,
      hours_shoot: 6,
      hours_edit: 10,
      direct_cost: 0,
      provisions: [{ kind_id: KIND, quantity: 2, catalog_quantity: 2 }],
    },
  ],
  milestones: [],
  milestones_total: 0,
  revision_limits: [
    {
      kind_id: KIND,
      label: "reel",
      label_en: "reel",
      rounds: 2,
      base_rounds: 2,
    },
  ],
  recipients: [
    {
      id: ID,
      name: "Μαρία",
      email: "m@x.gr",
      is_signatory: true,
      link: {
        id: ID,
        status: "active",
        is_opened: false,
        open_count: 0,
        first_opened_at: null,
      },
    },
  ],
  revisions: [
    {
      number: 1,
      created_at: "2026-10-08T10:00:00Z",
      created_by_name: "Άννα",
      summary: null,
      sent_at: null,
      approval: null,
    },
  ],
  deviations: [],
  needs_approval: false,
  totals: {
    price: 1300,
    discounted_price: 1170,
    vat_rate: 24,
    vat: 312,
    gross: 1612,
  },
  cost: {
    hour_cost: 50,
    hour_cost_month: "2026-10-01",
    estimated_cost: 800,
    multiplier_min: 1.3,
    multiplier_target: 1.6,
    multiplier_max: 2,
    is_low_margin: false,
    is_frozen: false,
  },
  periods: [
    {
      n: 1,
      starts: "2026-10-05",
      ends: "2026-10-31",
      is_partial: true,
      gives_provisions: true,
      is_discounted: true,
      state: "next",
      amount: 940,
      production_id: null,
    },
  ],
  change_requests: [],
  signature: null,
  document: null,
  outbox_pending: 0,
  email_sender_connected: false,
  proposal_validity_days: 21,
  can: { ...NULL_CAN, see_amounts: true, edit: true },
};

// Ο Χρήστης χωρίς ποσά, κόστος ή εσωτερικά: όλα τα gated πεδία null.
const viewWithoutMoney = {
  ...viewJson,
  money_terms: null,
  baseline: null,
  totals: null,
  cost: null,
  lines: [
    {
      ...viewJson.lines[0],
      unit_price: null,
      catalog_price: null,
      line_total: null,
      hours_shoot: null,
      hours_edit: null,
      direct_cost: null,
    },
  ],
  periods: [{ ...viewJson.periods[0], amount: null }],
  milestones: [
    { id: ID, trigger: "signature", percent: 50, due_on: null, amount: null },
  ],
  can: NULL_CAN,
};

describe("camelize", () => {
  it("αλλάζει μόνο τα κλειδιά, σε βάθος", () => {
    expect(camelize({ a_b: [{ c_d_e: "x_y" }], f: null })).toEqual({
      aB: [{ cDE: "x_y" }],
      f: null,
    });
  });
});

describe("agreementViewSchema", () => {
  it("διαβάζει πλήρη όψη και τη μετατρέπει σε camelCase", () => {
    const view = agreementViewSchema.parse(viewJson);
    expect(view.validUntil).toBe("2026-10-29");
    expect(view.lines[0]?.unitPrice).toBe(1300);
    expect(view.lines[0]?.provisions[0]).toEqual({
      kindId: KIND,
      quantity: 2,
      catalogQuantity: 2,
    });
    expect(view.totals?.gross).toBe(1612);
    expect(view.cost?.estimatedCost).toBe(800);
    expect(view.can.seeAmounts).toBe(true);
    expect(view.revisions[0]?.summary).toBe("");
  });
  it("τα ποσά, οι ώρες και το κόστος που είναι null μένουν null, ποτέ 0", () => {
    const view = agreementViewSchema.parse(viewWithoutMoney);
    expect(view.moneyTerms).toBeNull();
    expect(view.baseline).toBeNull();
    expect(view.totals).toBeNull();
    expect(view.cost).toBeNull();
    const line = view.lines[0];
    expect([line?.unitPrice, line?.catalogPrice, line?.lineTotal]).toEqual([
      null,
      null,
      null,
    ]);
    expect([line?.hoursShoot, line?.hoursEdit, line?.directCost]).toEqual([
      null,
      null,
      null,
    ]);
    expect(view.periods[0]?.amount).toBeNull();
    expect(view.milestones[0]?.amount).toBeNull();
  });
  it("τα booleans δεν γίνονται δεκτά ως null", () => {
    const broken = { ...viewJson, can: { ...NULL_CAN, edit: null } };
    expect(agreementViewSchema.safeParse(broken).success).toBe(false);
    expect(
      agreementViewSchema.safeParse({ ...viewJson, needs_approval: null })
        .success,
    ).toBe(false);
  });
  it("απορρίπτει άγνωστη κατάσταση", () => {
    expect(
      agreementViewSchema.safeParse({ ...viewJson, path: "weird" }).success,
    ).toBe(false);
  });
});

