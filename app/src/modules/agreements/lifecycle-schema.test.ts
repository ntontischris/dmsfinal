import { describe, expect, it } from "vitest";

import {
  SIGNED_FILE_MAX_BYTES,
  continuationSchema,
  dissolveSchema,
  hasFileSignature,
  isSignedFileOk,
  parseLifecycle,
  signedFileExtension,
} from "./lifecycle-schema";

const ID = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";
const OPP = "7a2d3a2f-4c1b-4e7f-8e63-1b2c3d4e5f60";

const view = (overrides: Record<string, unknown> = {}) => ({
  state: "active",
  renewalLeadDays: 30,
  noticeDays: 30,
  noContinuation: null,
  dissolution: null,
  renewals: [],
  signedFile: null,
  can: {
    dissolve: true,
    cancelDissolution: false,
    setContinuation: true,
    renew: true,
    attachFile: true,
  },
  ...overrides,
});

const fileOf = (bytes: number[], type: string, size?: number): File => {
  const file = new File([new Uint8Array(bytes)], "x", { type });
  return size === undefined
    ? file
    : Object.defineProperty(file, "size", { value: size });
};

describe("parseLifecycle", () => {
  it("null σημαίνει ότι η Συμφωνία δεν φαίνεται", () => {
    expect(parseLifecycle(null)).toBeNull();
  });

  it("διαβάζει Λύση, ανανεώσεις και αρχείο", () => {
    const parsed = parseLifecycle(
      view({
        dissolution: { on: "2026-12-31", reason: "Κλείνει", byName: "Γιώργος" },
        renewals: [
          {
            opportunityId: OPP,
            opportunityTitle: "Ανανέωση · Αθηνά",
            outcome: "open",
            agreementId: ID,
            termEnd: "2027-01-31",
            isAutomatic: true,
            createdAt: "2026-12-01T09:00:00Z",
          },
        ],
        signedFile: {
          name: "Σύμβαση.pdf",
          type: "application/pdf",
          size: 1200,
          uploadedAt: "2026-11-14T09:00:00Z",
        },
      }),
    );
    expect(parsed?.dissolution?.on).toBe("2026-12-31");
    expect(parsed?.renewals[0]?.opportunityTitle).toBe("Ανανέωση · Αθηνά");
    expect(parsed?.signedFile?.name).toBe("Σύμβαση.pdf");
  });

  it("απορρίπτει σχήμα χωρίς τα Δικαιώματα της βάσης", () => {
    expect(() => parseLifecycle(view({ can: {} }))).toThrow();
  });
});

describe("dissolveSchema", () => {
  it("θέλει ημερομηνία και λόγο", () => {
    expect(
      dissolveSchema.safeParse({ agreementId: ID, on: "2026-12-31", reason: "Λήξη συνεργασίας" })
        .success,
    ).toBe(true);
    expect(
      dissolveSchema.safeParse({ agreementId: ID, on: "2026-12-31", reason: "  " })
        .success,
    ).toBe(false);
    expect(
      dissolveSchema.safeParse({ agreementId: ID, on: "31/12", reason: "Λόγος" })
        .success,
    ).toBe(false);
  });
});

describe("continuationSchema", () => {
  it("yes/no γίνεται boolean και άλλη τιμή απορρίπτεται", () => {
    expect(
      continuationSchema.parse({ agreementId: ID, continue: "no", note: "" })
        .continue,
    ).toBe(false);
    expect(
      continuationSchema.parse({ agreementId: ID, continue: "yes", note: "" })
        .continue,
    ).toBe(true);
    expect(
      continuationSchema.safeParse({ agreementId: ID, continue: "maybe", note: "" })
        .success,
    ).toBe(false);
  });
});

describe("υπογεγραμμένο αρχείο", () => {
  it("δέχεται PDF, JPG, PNG έως 4 MB", () => {
    expect(signedFileExtension("application/pdf")).toBe("pdf");
    expect(signedFileExtension("image/jpeg")).toBe("jpg");
    expect(signedFileExtension("image/png")).toBe("png");
    expect(signedFileExtension("text/plain")).toBeNull();
    expect(isSignedFileOk(fileOf([1], "application/pdf"))).toBe(true);
    expect(isSignedFileOk(fileOf([1], "text/plain"))).toBe(false);
    expect(isSignedFileOk(fileOf([], "application/pdf"))).toBe(false);
    expect(
      isSignedFileOk(fileOf([1], "image/png", SIGNED_FILE_MAX_BYTES + 1)),
    ).toBe(false);
    expect(isSignedFileOk("όνομα.pdf")).toBe(false);
  });

  it("ελέγχει τα πρώτα bytes του τύπου", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(hasFileSignature(pdf, "pdf")).toBe(true);
    expect(hasFileSignature(pdf, "png")).toBe(false);
    expect(hasFileSignature(new Uint8Array([0xff, 0xd8, 0xff]), "jpg")).toBe(true);
    expect(hasFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "png")).toBe(true);
    expect(hasFileSignature(new Uint8Array([0x25]), "pdf")).toBe(false);
  });
});
