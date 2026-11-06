import { describe, expect, it } from "vitest";

import {
  clientFieldsSchema,
  createOpportunitySchema,
  decideAccessSchema,
  deleteClientSchema,
  editActivitySchema,
  logActivitySchema,
  mergeSchema,
  nextStepSchema,
  requestAccessSchema,
} from "./schemas";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

const validClient = {
  name: "Κυψέλη Καφέ",
  legalName: "",
  city: "",
  afm: "",
  contactName: "Μαρία",
  contactEmail: "maria@example.gr",
  contactPhone: "",
};

describe("clientFieldsSchema", () => {
  it("δέχεται έγκυρο ΑΦΜ", () => {
    expect(
      clientFieldsSchema.safeParse({ ...validClient, afm: "099999999" })
        .success,
    ).toBe(true);
  });
  it("δέχεται κενό ΑΦΜ", () => {
    expect(clientFieldsSchema.safeParse(validClient).success).toBe(true);
  });
  it("απορρίπτει ΑΦΜ με λάθος ψηφίο ελέγχου", () => {
    expect(
      clientFieldsSchema.safeParse({ ...validClient, afm: "123456789" })
        .success,
    ).toBe(false);
  });
  it("απορρίπτει άκυρο email", () => {
    const result = clientFieldsSchema.safeParse({
      ...validClient,
      contactEmail: "maria",
    });
    expect(result.success).toBe(false);
  });
});

describe("nextStepSchema", () => {
  it("απορρίπτει κενό Επόμενο βήμα", () => {
    expect(
      nextStepSchema.safeParse({ nextStep: "  ", nextStepDue: "2026-10-10" })
        .success,
    ).toBe(false);
  });
  it("απορρίπτει ανύπαρκτη ημερομηνία", () => {
    expect(
      nextStepSchema.safeParse({ nextStep: "Κλήση", nextStepDue: "2026-02-30" })
        .success,
    ).toBe(false);
  });
});

describe("decideAccessSchema", () => {
  it("η απόρριψη χωρίς σχόλιο απορρίπτεται", () => {
    const result = decideAccessSchema.safeParse({
      requestId: UUID_A,
      decision: "reject",
      comment: "",
    });
    expect(result.success).toBe(false);
  });
  it("η έγκριση δεν χρειάζεται σχόλιο", () => {
    const result = decideAccessSchema.safeParse({
      requestId: UUID_A,
      decision: "approve",
      comment: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("mergeSchema", () => {
  it("απορρίπτει ίδιο Πελάτη και στις δύο θέσεις", () => {
    expect(
      mergeSchema.safeParse({ survivorId: UUID_A, absorbedId: UUID_A }).success,
    ).toBe(false);
  });
  it("δέχεται δύο διαφορετικούς Πελάτες", () => {
    expect(
      mergeSchema.safeParse({ survivorId: UUID_A, absorbedId: UUID_B }).success,
    ).toBe(true);
  });
});

describe("createOpportunitySchema", () => {
  it("δέχεται clientId κενό (νέος Πελάτης)", () => {
    const result = createOpportunitySchema.safeParse({
      clientId: "",
      title: "Βίντεο εγκαινίων",
      sourceId: UUID_A,
      referredBy: "",
      nextStep: "Πρώτη κλήση",
      nextStepDue: "2026-10-12",
    });
    expect(result.success).toBe(true);
  });
  it("ζητά Πηγή για νέο Πελάτη", () => {
    const result = createOpportunitySchema.safeParse({
      clientId: "",
      title: "Βίντεο εγκαινίων",
      sourceId: "",
      referredBy: "",
      nextStep: "Πρώτη κλήση",
      nextStepDue: "2026-10-12",
    });
    expect(result.error?.issues[0]?.message).toBe("Διάλεξε Πηγή.");
  });
  it("δεν ζητά Πηγή για υπάρχοντα Πελάτη", () => {
    const result = createOpportunitySchema.safeParse({
      clientId: UUID_B,
      title: "Νέο πακέτο",
      sourceId: "",
      referredBy: "",
      nextStep: "Πρώτη κλήση",
      nextStepDue: "2026-10-12",
    });
    expect(result.success).toBe(true);
  });
});

describe("requestAccessSchema", () => {
  it("δέχεται Αίτημα χωρίς Πηγή (η βάση παίρνει την Πηγή του Πελάτη)", () => {
    expect(
      requestAccessSchema.safeParse({
        clientId: UUID_A,
        topic: "Καμπάνια",
        comment: "",
        sourceId: "",
      }).success,
    ).toBe(true);
  });
});

describe("deleteClientSchema", () => {
  it("δέχεται Πελάτη και όνομα επιβεβαίωσης χωρίς κενά στις άκρες", () => {
    const parsed = deleteClientSchema.safeParse({
      clientId: UUID_A,
      confirmName: "  Κυψέλη Καφέ ",
    });
    expect(parsed.success && parsed.data.confirmName).toBe("Κυψέλη Καφέ");
  });
  it("ζητά το όνομα του Πελάτη", () => {
    const parsed = deleteClientSchema.safeParse({
      clientId: UUID_A,
      confirmName: "   ",
    });
    expect(parsed.error?.issues[0]?.message).toBe(
      "Γράψε το όνομα του Πελάτη για επιβεβαίωση.",
    );
  });
  it("αρνείται άκυρο Πελάτη", () => {
    expect(
      deleteClientSchema.safeParse({ clientId: "x", confirmName: "Α" }).success,
    ).toBe(false);
  });
});

describe("logActivitySchema", () => {
  const K = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";
  const C = "7f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";
  const base = { kindId: K, body: "Κλήση", occurredAt: "" };

  it("δέχεται Δραστηριότητα κατευθείαν στον Πελάτη, με ώρα", () => {
    const parsed = logActivitySchema.safeParse({
      ...base,
      opportunityId: "",
      clientId: C,
      occurredAt: "2026-11-04T10:30",
    });
    expect(parsed.success).toBe(true);
  });

  it("θέλει Πελάτη ή Ευκαιρία και ώρα σε σωστή μορφή", () => {
    expect(
      logActivitySchema.safeParse({ ...base, opportunityId: "", clientId: "" })
        .success,
    ).toBe(false);
    expect(
      logActivitySchema.safeParse({
        ...base,
        opportunityId: "",
        clientId: C,
        occurredAt: "4/11/2026",
      }).success,
    ).toBe(false);
  });

  it("η διόρθωση θέλει πάντα ώρα", () => {
    expect(
      editActivitySchema.safeParse({ ...base, activityId: C }).success,
    ).toBe(false);
    expect(
      editActivitySchema.safeParse({
        ...base,
        activityId: C,
        occurredAt: "2026-11-04T10:30",
      }).success,
    ).toBe(true);
  });
});
