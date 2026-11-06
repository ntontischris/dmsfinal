import { describe, expect, it } from "vitest";

import { parseThemePreference, resolveTheme, THEME_SCRIPT } from "./theme";

describe("parseThemePreference", () => {
  it("κρατά το σκοτεινό όταν δεν υπάρχει αποθηκευμένη ή γνωστή τιμή", () => {
    expect(parseThemePreference(null)).toBe("dark");
    expect(parseThemePreference("")).toBe("dark");
    expect(parseThemePreference("blue")).toBe("dark");
  });

  it("δέχεται φωτεινό, σκοτεινό και όπως η συσκευή", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("ακολουθεί τη συσκευή μόνο για το «system»", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("αγνοεί τη συσκευή για ρητή επιλογή", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

interface FakePage {
  dataset: { theme?: string };
  setDeviceDark: (isDark: boolean) => void;
  store: Map<string, string>;
}

// Τρέχει το πραγματικό inline script με ψεύτικο localStorage, matchMedia και <html>.
function runScript(stored: string | null, isDeviceDark: boolean): FakePage {
  const store = new Map<string, string>(
    stored === null ? [] : [["theme", stored]],
  );
  const dataset: { theme?: string } = {};
  const listeners: (() => void)[] = [];
  const query = {
    matches: isDeviceDark,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  const localStorage = { getItem: (key: string) => store.get(key) ?? null };
  const document = { documentElement: { dataset } };
  const run = new Function(
    "localStorage",
    "matchMedia",
    "document",
    THEME_SCRIPT,
  );
  run(localStorage, () => query, document);
  const setDeviceDark = (isDark: boolean) => {
    query.matches = isDark;
    listeners.forEach((fn) => fn());
  };
  return { dataset, setDeviceDark, store };
}

describe("THEME_SCRIPT", () => {
  it("αφήνει σκοτεινό για νέο Χρήστη χωρίς αποθηκευμένη τιμή", () => {
    expect(runScript(null, false).dataset.theme).toBeUndefined();
  });

  it("βάζει φωτεινό για ρητή επιλογή, όποια κι αν είναι η συσκευή", () => {
    const page = runScript("light", true);
    expect(page.dataset.theme).toBe("light");
    page.setDeviceDark(false);
    expect(page.dataset.theme).toBe("light");
  });

  it("με «system» ακολουθεί τη συσκευή και αλλάζει ζωντανά", () => {
    const page = runScript("system", false);
    expect(page.dataset.theme).toBe("light");
    page.setDeviceDark(true);
    expect(page.dataset.theme).toBeUndefined();
    page.setDeviceDark(false);
    expect(page.dataset.theme).toBe("light");
  });

  it("σταματά να ακολουθεί τη συσκευή όταν ο Χρήστης διαλέξει ρητά", () => {
    const page = runScript("system", true);
    page.store.set("theme", "dark");
    page.setDeviceDark(false);
    expect(page.dataset.theme).toBeUndefined();
  });
});
