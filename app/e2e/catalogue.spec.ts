import { expect, test } from "@playwright/test";

import {
  ITEM_URL,
  control,
  fillNewPackage,
  openItem,
  panel,
  publishArchiveRestore,
  screenHeader,
} from "./catalogue-parts";
import {
  button,
  card,
  listItem,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";

// Κατάλογος και Κόστος (C1, C2), Ρυθμίσεις › Συμφωνίες (O3) και Οικονομικά (O6) από άκρη σε άκρη. Φανταστικά στοιχεία.
// Τα Πακέτα, οι Υπηρεσίες και ο μήνας Κόστους ώρας (40,00 €) τα φτιάχνει το e2e/seed.mjs (βοηθητικά: e2e/catalogue-parts.ts).
// Τα ποσά ταιριάζουν με `\s`: το κενό πριν το «€» δεν σπάει γραμμή.
const NOT_ALLOWED = "Χωρίς δικαίωμα";

// Τα τεστ γράφουν στην ίδια βάση: μια επανάληψη θα έβρισκε τα δεδομένα της πρώτης προσπάθειας μισοαλλαγμένα
// και θα έκρυβε το πραγματικό λάθος.
test.describe.configure({ retries: 0 });

test("οι Πωλήσεις βλέπουν τιμές και Παροχές, όχι κόστος", async ({ page }) => {
  const P = project();
  await signIn(page, "sales@example.com");
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: /Κατάλογος/ })).toBeVisible();
  await expect(
    nav.getByRole("link", {
      name: /Ρυθμίσεις Συμφωνιών|Ρυθμίσεις Οικονομικών/,
    }),
  ).toHaveCount(0);

  await page.goto("/app/catalogue");
  const row = tableRow(page, `Μηνιαία Παρουσία ${P}`);
  await expect(row).toContainText("2 Γυρίσματα, 8 reels");
  await expect(row).toContainText(/1\.300,00\s€\s\/\sμήνα/);
  await expect(page.locator("th", { hasText: "Τιμή" })).toHaveCount(1);
  await expect(page.locator("th", { hasText: "Εκτ. κόστος" })).toHaveCount(0);
  await expect(page.locator("th", { hasText: "Περιθώριο" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Νέο Πακέτο" })).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "και αρχειοθετημένα" }),
  ).toHaveCount(0);
  await expect(page.getByText(`Παλιό πακέτο ${P}`)).toHaveCount(0);
  await shot(page, "c1-sales");

  await openItem(page, `Μηνιαία Παρουσία ${P}`);
  await expect(panel(page, "Βασικά και τιμή")).toContainText(
    /1\.300,00\s€\s\/\sμήνα/,
  );
  await expect(card(page, "Κόστος και περιθώριο")).toHaveCount(0);
  await expect(button(page, "Αρχειοθέτηση")).toHaveCount(0);
  await expect(screenHeader(page).getByText("Μόνο ανάγνωση")).toBeVisible();
  await expect(control(page, "Όνομα")).toHaveCount(0);

  for (const url of [
    "/app/catalogue/new",
    "/app/settings/agreements",
    "/app/settings/finance",
  ]) {
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: NOT_ALLOWED, exact: true }),
    ).toBeVisible();
  }
});

test("η Διαχείριση βλέπει κόστος και περιθώριο, αλλά τις ώρες μόνο για ανάγνωση", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "admin@example.com");
  await page.goto("/app/catalogue");
  await expect(page.locator("th", { hasText: "Εκτ. κόστος" })).toHaveCount(1);
  await expect(page.locator("th", { hasText: "Περιθώριο" })).toHaveCount(1);
  const row = tableRow(page, `Μηνιαία Παρουσία ${P}`);
  await expect(row).toContainText(/800,00\s€/);
  await expect(row).toContainText(/500,00\s€\s·\s38,5%/);
  await expect(page.getByText(/Κόστος ώρας.*40,00\s€/).first()).toBeVisible();

  const old = tableRow(page, `Παλιό πακέτο ${P}`);
  await expect(old).toHaveCount(0);
  await page.getByRole("checkbox", { name: "και αρχειοθετημένα" }).check();
  await expect(old).toContainText("Αρχειοθετημένο");
  await shot(page, "c1-admin");

  await openItem(page, `Μηνιαία Παρουσία ${P}`);
  const cost = panel(page, "Κόστος και περιθώριο");
  await expect(cost).toContainText("Εκτιμώμενο κόστος");
  for (const amount of [
    /800,00\s€/,
    /1\.040,00\s€/,
    /1\.280,00\s€/,
    /1\.600,00\s€/,
  ])
    await expect(cost).toContainText(amount);
  await expect(cost).toContainText("6 ώρες");
  await expect(cost).toContainText("14 ώρες");
  await expect(control(cost, "Ώρες γυρίσματος")).toHaveCount(0);
  await expect(control(cost, "Άμεσο κόστος")).toBeVisible();
  await expect(panel(page, "Μέσες Πραγματικές ώρες")).toContainText(
    "έρχονται με το module Παραγωγές",
  );
  await shot(page, "c2-admin");

  await page.goto("/app/settings/finance");
  await expect(page.getByText(/Κόστος ώρας που ισχύει/)).toContainText(
    /40,00\s€/,
  );
  await expect(
    page.getByText("Αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος»").first(),
  ).toBeVisible();
  await expect(button(page, "Αποθήκευση μήνα")).toHaveCount(0);
});

test("ο Ιδιοκτήτης αλλάζει ώρες και τιμή, και το περιθώριο ακολουθεί", async ({
  page,
}) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await openItem(page, `Εκδήλωση ${P}`);

  const cost = panel(page, "Κόστος και περιθώριο");
  await control(cost, "Ώρες γυρίσματος").fill("5");
  await control(cost, "Ώρες μοντάζ").fill("7");
  await button(cost, "Αποθήκευση").click();
  await expect(cost.getByRole("status")).toContainText(
    "Ισχύει για νέες προτάσεις",
  );
  await page.reload();
  await expect(panel(page, "Κόστος και περιθώριο")).toContainText(/480,00\s€/);

  const basics = panel(page, "Βασικά και τιμή");
  await control(basics, "Τιμή χωρίς ΦΠΑ").fill("600");
  await button(basics, "Αποθήκευση").click();
  await expect(basics.getByRole("status")).toContainText(
    "Ισχύει για νέες προτάσεις",
  );
  await page.reload();
  await expect(panel(page, "Κόστος και περιθώριο")).toContainText(
    /Περιθώριο στην τιμή\s*120,00\s€\s·\s20%/,
  );
  await expect(panel(page, "Βασικά και τιμή")).toContainText(
    /Με ΦΠΑ 24%:\s744,00\s€/,
  );
  await shot(page, "c2-owner");
});

test("η Διαχείριση φτιάχνει Πακέτο, το κάνει δημόσιο, το αρχειοθετεί και το επαναφέρει", async ({
  page,
}) => {
  const P = project();
  const name = `Νέο Πακέτο ${P}`;
  await signIn(page, "admin@example.com");
  await page.goto("/app/catalogue");
  await page.getByRole("link", { name: "Νέο Πακέτο", exact: true }).click();
  await expect(control(page, "Είδος")).toHaveValue("package_monthly");
  await fillNewPackage(page, name);
  await button(page, "Δημιουργία").click();
  await expect(page).toHaveURL(ITEM_URL);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(control(page, "Ποσότητα")).toHaveValue("4");
  const itemUrl = page.url();

  await page.goto("/app/catalogue");
  await expect(tableRow(page, name)).toContainText("4 reels");

  await page.goto("/app/catalogue/new?type=package");
  await fillNewPackage(page, name);
  await button(page, "Δημιουργία").click();
  await expect(
    page.getByText("Υπάρχει ήδη ενεργό Πακέτο ή Υπηρεσία με αυτό το όνομα."),
  ).toBeVisible();

  await publishArchiveRestore(page, { itemUrl, name });
  await shot(page, "c2-restored");
});

test("Ρυθμίσεις › Συμφωνίες: Είδη Παροχής", async ({ page }) => {
  const P = project();
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/agreements");
  await expect(
    page
      .getByRole("navigation", { name: "Ενότητες Ρυθμίσεων" })
      .getByRole("link", { name: "Συμφωνίες", exact: true }),
  ).toHaveAttribute("aria-current", /.+/);

  const kinds = panel(page, "Είδη Παροχής");
  const reel = tableRow(kinds, "reel");
  await expect(reel.getByText(/Σε χρήση σε \d+/)).toBeVisible();
  await expect(button(reel, "Απόσυρση")).toBeVisible();
  await expect(button(reel, "Διαγραφή")).toHaveCount(0);

  const add = kinds.locator("form", {
    has: page.getByRole("button", { name: "Προσθήκη", exact: true }),
  });
  await control(add, "Ετικέτα").fill(`Live ${P}`);
  await control(add, "Μονάδα").fill("μεταδόσεις");
  await button(add, "Προσθήκη").click();
  await expect(add.getByRole("alert")).toContainText("Γράψε και τα αγγλικά");

  await control(add, "Ετικέτα (EN)").fill(`Live ${P}`);
  await control(add, "Μονάδα (EN)").fill("streams");
  await button(add, "Προσθήκη").click();
  await expect(add.getByRole("status")).toContainText("Αποθηκεύτηκε");
  const added = tableRow(kinds, `Live ${P}`);
  await expect(added.getByText("Νέο", { exact: true })).toBeVisible();
  await shot(page, "o3-admin");

  await button(added, "Διαγραφή").click();
  await expect(added).toHaveCount(0);
  await expect(kinds.getByText(`«Live ${P}» διαγράφηκε`)).toBeVisible();
});

test("Ρυθμίσεις › Οικονομικά: Κόστος ώρας και Εύρος τιμής", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/finance");
  await expect(page.getByText(/Κόστος ώρας που ισχύει/)).toContainText(
    /40,00\s€/,
  );

  const months = panel(page, "Κόστος ώρας");
  await control(months, "Μήνας").selectOption({ index: 1 });
  await control(months, "Έξοδα του μήνα (€)").fill("9900");
  await control(months, "Αναμενόμενες παραγωγικές ώρες").fill("220");
  await button(months, "Αποθήκευση μήνα").click();
  await expect(months.getByRole("status")).toContainText(
    "Αποθηκεύτηκε. Ισχύει από τον",
  );
  await expect(months.locator("tr", { hasText: "Επόμενος" })).toContainText(
    /45,00\s€/,
  );
  await expect(months.locator("tr", { hasText: "Τρέχων" })).toContainText(
    /40,00\s€/,
  );
  await shot(page, "o6-owner");

  const range = panel(page, "Εύρος τιμής");
  const saveMin = async (value: string, margin: string) => {
    await control(range, "Ελάχιστη (×)").fill(value);
    await button(range, "Αποθήκευση").click();
    await expect(range).toContainText(`Ελάχιστο περιθώριο: ${margin}`);
  };
  try {
    await saveMin("1,2", "16,7%");
    await expect(range.getByRole("status")).toContainText("Αποθηκεύτηκε");
  } finally {
    await saveMin("1,3", "23,1%");
  }

  await control(range, "Στόχος (×)").fill("1");
  await button(range, "Αποθήκευση").click();
  await expect(range.getByRole("alert")).toContainText(
    "Οι πολλαπλασιαστές ξεκινούν από 1 και ανεβαίνουν",
  );
});

test("ο Έλεγχος ετοιμότητας βλέπει έτοιμους Κατάλογο και Κόστος ώρας", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/settings/readiness");
  const list = card(page, "Πριν το άνοιγμα σε πελάτες");
  for (const title of [
    "Κατάλογος: Πακέτα, Υπηρεσίες, τιμές",
    "Έξοδα και ώρες: ο πρώτος μήνας Κόστους ώρας",
  ]) {
    const item = listItem(list, title);
    await expect(item.getByText("έτοιμο", { exact: true })).toBeVisible();
    await expect(item).not.toContainText("έρχεται με");
  }
});
