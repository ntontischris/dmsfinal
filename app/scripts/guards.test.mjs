import { describe, expect, it } from "vitest";

import { findDesignViolations } from "./check-design.mjs";
import { findModuleViolations } from "./check-modules.mjs";
import { findSecrets } from "./check-secrets.mjs";

const file = (path, text) => ({ path, text });

describe("check:modules", () => {
  it("δέχεται import από το index ενός module", () => {
    expect(findModuleViolations([file("src/app/page.tsx", 'import { x } from "@/modules/sales";')])).toEqual([]);
  });

  it("απορρίπτει import στα εσωτερικά άλλου module", () => {
    const found = findModuleViolations([file("src/modules/finance/a.ts", 'import { y } from "@/modules/sales/queries";')]);
    expect(found).toHaveLength(1);
  });

  it("δέχεται import στα εσωτερικά του ίδιου module", () => {
    expect(findModuleViolations([file("src/modules/sales/a.ts", 'import { y } from "@/modules/sales/queries";')])).toEqual([]);
  });

  it("απορρίπτει σχετικό import που βγαίνει από το module", () => {
    expect(findModuleViolations([file("src/modules/sales/a.ts", 'import { z } from "../../modules/finance/b";')])).toHaveLength(1);
  });
});

describe("check:design", () => {
  it("δέχεται τα tokens", () => {
    expect(findDesignViolations([file("src/a.tsx", '<p className="bg-card text-primary border-destructive/50" />')])).toEqual([]);
  });

  it("απορρίπτει hex, συναρτήσεις χρώματος και την παλέτα του Tailwind", () => {
    const text = ['<p style={{ color: "#ff0000" }} />', '<p className="bg-red-500" />', "a { color: oklch(50% 0 0); }"].join("\n");
    expect(findDesignViolations([file("src/a.tsx", text)])).toHaveLength(3);
  });

  it("επιτρέπει χρώματα μόνο στο αρχείο των tokens", () => {
    expect(findDesignViolations([file("src/app/globals.css", "--x: oklch(50% 0 0);")])).toEqual([]);
  });
});

describe("check:secrets", () => {
  it("βρίσκει JWT και ιδιωτικά κλειδιά", () => {
    const jwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJyb2xlIjoic2VydmljZSJ9", "abcdefghijklmnop"].join(".");
    expect(findSecrets([file("app/.env.example", `KEY=${jwt}`)])).toHaveLength(1);
    const pem = ["-----BEGIN RSA", "PRIVATE KEY-----"].join(" ");
    expect(findSecrets([file("x.md", pem)])).toHaveLength(1);
  });

  it("αφήνει ήσυχο τον κανονικό κώδικα", () => {
    expect(findSecrets([file("a.ts", 'const url = process.env.NEXT_PUBLIC_SUPABASE_URL;')])).toEqual([]);
  });
});
