import { describe, expect, it } from "vitest";

import {
  agreementRowsSchema,
  approvalRowsSchema,
  kindRowsSchema,
  optionRowsSchema,
  outboxRowsSchema,
  summaryRowsSchema,
} from "./view-schema-parts";

const ID = "11111111-1111-4111-8111-111111111111";
const KIND = "22222222-2222-4222-8222-222222222222";


describe("γραμμές πινάκων", () => {
  it("agreements_list: τα ποσά που λείπουν μένουν null, αριθμοί-κείμενο γίνονται αριθμοί", () => {
    const row = {
      id: ID,
      opportunity_id: ID,
      client_id: ID,
      client_name: "Κυψέλη",
      title: "Π",
      kind: "monthly",
      state: "proposal",
      path: "sent",
      revision: 1,
      manager_id: null,
      manager_name: null,
      valid_until: "2026-10-29",
      start_on: null,
      end_on: null,
      signed_at: null,
      signatory_name: null,
      total: null,
      discount_percent: null,
      discount_months: null,
      change_requests_open: "2",
      links_opened: 0,
      expires_in_days: null,
      is_low_margin: null,
      updated_at: "2026-10-08T10:00:00Z",
    };
    const [parsed] = agreementRowsSchema.parse([row]);
    expect(parsed?.total).toBeNull();
    expect(parsed?.discountPercent).toBeNull();
    expect(parsed?.changeRequestsOpen).toBe(2);
    expect(
      agreementRowsSchema.parse([{ ...row, total: "1300.50" }])[0]?.total,
    ).toBe(1300.5);
  });
  it("agreement_for_opportunity: booleans αυστηρά", () => {
    const row = {
      agreement_id: ID,
      kind: "one_off",
      title: "Π",
      state: "proposal",
      path: "draft",
      revision: 1,
      valid_until: "2026-10-29",
      signed_at: null,
      signatory_name: null,
      total: 400,
      links_total: 0,
      links_opened: 0,
      change_requests_open: 0,
      approval_pending_days: null,
      needs_approval: false,
      deviation_count: 0,
      has_lines: true,
      outbox_pending: 0,
      can_draft: true,
      can_deviate: false,
    };
    expect(summaryRowsSchema.parse([row])[0]?.canDraft).toBe(true);
    expect(
      summaryRowsSchema.safeParse([{ ...row, can_draft: null }]).success,
    ).toBe(false);
  });
  it("agreement_approvals_view: Παρεκκλίσεις, γραμμές και προηγούμενη Έγκριση", () => {
    const parsed = approvalRowsSchema.parse([
      {
        agreement_id: ID,
        opportunity_id: ID,
        client_name: "Κ",
        title: "Π",
        kind: "one_off",
        revision: 1,
        manager_name: "Άννα",
        requested_at: "2026-10-08T10:00:00Z",
        requested_by_name: "Άννα",
        pending_days: 1,
        working_days: 1,
        is_reminder_due: false,
        total: null,
        is_low_margin: null,
        deviations: [
          {
            key: "free:1",
            kind: "free_line",
            subject: "Βίντεο",
            depth: 1,
            base_value: null,
            value: null,
            status: "new",
          },
        ],
        lines: [
          {
            description: "Βίντεο",
            quantity: 1,
            catalog_price: null,
            unit_price: null,
            is_free: true,
            is_below: false,
          },
        ],
        previous: null,
      },
    ]);
    expect(parsed[0]?.deviations[0]?.kind).toBe("free_line");
    expect(parsed[0]?.lines[0]?.isFree).toBe(true);
    expect(parsed[0]?.total).toBeNull();
    expect(parsed[0]?.previous).toBeNull();
  });
  it("εξερχόμενα, επιλογές Καταλόγου και είδη Παροχής", () => {
    const outbox = outboxRowsSchema.parse([
      {
        id: ID,
        kind: "proposal_link",
        to_name: "Μ",
        to_email: "m@x.gr",
        status: "pending",
        created_at: "2026-10-08T10:00:00Z",
        handled_at: null,
        link_path: "/p/abc",
        code: null,
        code_expires_at: null,
      },
    ]);
    expect(outbox[0]?.linkPath).toBe("/p/abc");
    const options = optionRowsSchema.parse([
      {
        item_id: ID,
        kind: "service",
        billing: null,
        name: "Reel",
        unit: "ανά reel",
        price: null,
        provisions: null,
      },
    ]);
    expect(options[0]?.price).toBeNull();
    expect(options[0]?.provisions).toEqual([]);
    const kinds = kindRowsSchema.parse([
      {
        id: ID,
        label: "Γύρισμα",
        label_en: "Shoot",
        unit: "Γυρίσματα",
        unit_en: "Shoots",
        sort: 10,
        revision_limit: null,
        retired_at: null,
      },
      {
        id: KIND,
        label: "Παλιό",
        label_en: "",
        unit: "",
        unit_en: "",
        sort: 20,
        revision_limit: 2,
        retired_at: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(kinds.map((k) => k.isRetired)).toEqual([false, true]);
    expect(kinds.map((k) => k.revisionLimit)).toEqual([null, 2]);
  });
});

