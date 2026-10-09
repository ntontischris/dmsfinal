import { describe, expect, it } from "vitest";

import { documentSchema, publicResultSchema, publicViewSchema } from "./view-schema";


// Ό,τι επιστρέφει η βάση: snake_case, όπως στο §2.7.
const company = { name: "Devre", email: "info@devre.gr", phone: "210" };

const documentJson = {
  revision: 1,
  language: "el",
  title: "Μηνιαία Παρουσία",
  kind: "monthly",
  valid_until: "2026-10-29",
  start_on: null,
  duration_months: 6,
  company: {
    legal_name: "Devre Media ΙΚΕ",
    trade_name: "Devre",
    tax_id: "123456789",
    tax_office: "Α΄ Αθηνών",
    gemi: "",
    address: "Αθήνα",
    phone: "210",
    email: "info@devre.gr",
    signatory_name: "Γιώργος",
    signatory_title: "Διευθυντής",
  },
  client: { name: "Κυψέλη", legal_name: "", afm: null, city: "Αθήνα" },
  lines: [
    {
      description: "Μηνιαία Παρουσία",
      description_en: "",
      unit: "",
      quantity: 1,
      unit_price: 1300,
      line_total: 1300,
      provisions: [
        {
          label: "Γύρισμα",
          label_en: "Shoot",
          unit: "Γυρίσματα",
          unit_en: "Shoots",
          quantity: 2,
        },
      ],
    },
  ],
  provision_totals: [
    {
      label: "Γύρισμα",
      label_en: "Shoot",
      unit: "Γυρίσματα",
      unit_en: "Shoots",
      quantity: 2,
    },
  ],
  totals: {
    net: 1300,
    discount_percent: 10,
    discount_months: 2,
    discounted_net: 1170,
    vat_rate: 24,
    vat: 312,
    gross: 1612,
    discounted_vat: 280.8,
    discounted_gross: 1450.8,
  },
  terms: {
    payment_days: 15,
    unused_provisions: "next_period",
    grace_days: 10,
    renewal: "new_opportunity",
    dissolution_notice_days: 30,
    dissolution_fee: 0,
    filming_notice_hours: 48,
    filming_cancel_hours: 24,
    late_cancel_burns: true,
    no_show_burns: true,
    revision_limits: [{ label: "reel", label_en: "reel", rounds: 2 }],
  },
  milestones: [],
};


describe("documentSchema", () => {
  it("διαβάζει το έγγραφο του πελάτη", () => {
    const doc = documentSchema.parse(documentJson);
    expect(doc.lines[0]?.lineTotal).toBe(1300);
    expect(doc.totals.discountedGross).toBe(1450.8);
    expect(doc.terms.revisionLimits[0]?.rounds).toBe(2);
    expect(doc.client.afm).toBeNull();
  });
  it("δεν κρατά πεδία που δεν ανήκουν στο έγγραφο", () => {
    const doc = documentSchema.parse({
      ...documentJson,
      hours_shoot: 5,
      deviations: [1],
    });
    expect(Object.keys(doc)).not.toContain("hoursShoot");
    expect(Object.keys(doc)).not.toContain("deviations");
  });
});

describe("publicViewSchema", () => {
  const base = { language: "el", manager_name: "Άννα", company };
  it("active με έγγραφο", () => {
    const view = publicViewSchema.parse({
      ...base,
      status: "active",
      document: documentJson,
      valid_until: "2026-10-29",
      can_sign: true,
      signatory_name: "Μαρία",
      viewer_name: "Μαρία",
      masked_email: "m•••@x.gr",
      code_channel: "manual",
    });
    expect(view.status).toBe("active");
    if (view.status === "active") {
      expect(view.canSign).toBe(true);
      expect(view.codeChannel).toBe("manual");
      expect(view.document.title).toBe("Μηνιαία Παρουσία");
    }
  });
  it("unknown, expired, signed και οι νεκροί σύνδεσμοι", () => {
    expect(publicViewSchema.parse({ status: "unknown" })).toEqual({
      status: "unknown",
    });
    expect(
      publicViewSchema.parse({
        ...base,
        status: "expired",
        valid_until: "2026-10-01",
      }).status,
    ).toBe("expired");
    expect(
      publicViewSchema.parse({
        ...base,
        status: "signed",
        signed_at: "2026-10-02T10:00:00Z",
      }),
    ).toMatchObject({
      status: "signed",
      signedAt: "2026-10-02T10:00:00Z",
    });
    for (const status of ["revoked", "superseded", "closed"])
      expect(publicViewSchema.parse({ ...base, status }).status).toBe(status);
  });
  it("άγνωστο status ή active χωρίς έγγραφο απορρίπτεται", () => {
    expect(
      publicViewSchema.safeParse({ ...base, status: "weird" }).success,
    ).toBe(false);
    expect(
      publicViewSchema.safeParse({ ...base, status: "active" }).success,
    ).toBe(false);
  });
});

describe("publicResultSchema", () => {
  it("διαβάζει όλα τα αποτελέσματα των δημόσιων ενεργειών", () => {
    expect(
      publicResultSchema.parse({
        status: "sent",
        channel: "manual",
        masked_email: "m•••@x.gr",
      }),
    ).toEqual({
      status: "sent",
      channel: "manual",
      maskedEmail: "m•••@x.gr",
    });
    expect(
      publicResultSchema.parse({ status: "wrong_code", attempts_left: 3 }),
    ).toEqual({
      status: "wrong_code",
      attemptsLeft: 3,
    });
    expect(
      publicResultSchema.parse({ status: "rate_limited", retry_after: 40 }),
    ).toEqual({
      status: "rate_limited",
      retryAfter: 40,
    });
    expect(publicResultSchema.parse({ status: "rate_limited" })).toEqual({
      status: "rate_limited",
      retryAfter: null,
    });
    expect(
      publicResultSchema.parse({
        status: "signed",
        signed_at: "2026-10-02T10:00:00Z",
      }),
    ).toEqual({
      status: "signed",
      signedAt: "2026-10-02T10:00:00Z",
    });
    expect(publicResultSchema.parse({ status: "signed" })).toEqual({
      status: "signed",
      signedAt: null,
    });
    for (const status of [
      "ok",
      "declined",
      "locked",
      "code_expired",
      "not_signatory",
      "superseded",
      "expired",
    ])
      expect(publicResultSchema.parse({ status }).status).toBe(status);
  });
  it("άγνωστο status απορρίπτεται", () => {
    expect(publicResultSchema.safeParse({ status: "weird" }).success).toBe(
      false,
    );
    expect(publicResultSchema.safeParse(null).success).toBe(false);
  });
});

