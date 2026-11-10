import { expect, test, type Locator } from "@playwright/test";

import {
  PRODUCER,
  addToCrew,
  bookFilmingFromScreen,
  crewRow,
  ensureSignedMonthlyAgreement,
  filmingSpecDay,
  inSpaces,
  visit,
} from "./filming-parts";
import { button, project, shot, signIn } from "./sales-parts";
import { useSpacesLook as setSpacesLook } from "./walkthrough/spaces";

// Γυρίσματα (E1–E4, E6, E7, Ρυθμίσεις) από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Το seed φέρνει μόνο τον Πελάτη και
// την Ευκαιρία· κάθε Συμφωνία και Γύρισμα γράφεται μέσα από τις οθόνες. Σειριακά και χωρίς retries, όπως τα υπόλοιπα τεστ.
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await setSpacesLook(context);
});

test("η Άννα κλείνει Γύρισμα, ο Ιδιοκτήτης ορίζει Συνεργείο και η Ρένα επιβεβαιώνει και ολοκληρώνεται με «έγινε»", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await ensureSignedMonthlyAgreement(page, browser, P);

  await bookFilmingFromScreen(page, P, filmingSpecDay());
  const filmingUrl = page.url();
  const filmingId = filmingUrl.split("/").pop() ?? "";
  await expect(page.getByText("προγραμματισμένο", { exact: true }).first()).toBeVisible();
  await shot(page, "filming-e3-booked");

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    await addToCrew(owner, PRODUCER);
    await expect(crewRow(owner, PRODUCER)).toContainText("Απάντηση: αναμένει");
  });

  await inSpaces(browser, "production@example.com", async (producer) => {
    await visit(producer, `/app/filming/mine?id=${filmingId}`);
    const reply = producer.locator("section", {
      has: producer.getByRole("heading", { name: "Η απάντησή σου", exact: true }),
    });
    await button(reply, "Επιβεβαιώνω").click();
    await expect(reply.getByText("επιβεβαιώνω", { exact: true })).toBeVisible();
    await expect(button(reply, "Επιβεβαιώνω")).toHaveCount(0);
  });

  await inSpaces(browser, "owner@example.com", async (owner) => {
    await visit(owner, filmingUrl);
    await expect(crewRow(owner, PRODUCER)).toContainText("Απάντηση: επιβεβαιώνω");
    await button(owner, "Έγινε (και πόσο κράτησε)").click();
    await owner.getByLabel("Πόσο κράτησε στην πράξη (ώρες)").fill("3");
    await button(owner, "Επιβεβαίωση «έγινε»").click();
    await expect(owner.getByText("έγινε", { exact: true }).first()).toBeVisible();
    await shot(owner, "filming-e3-done");
  });
});

test("η ουρά έγκρισης φαίνεται στον Ιδιοκτήτη και κλειδώνεται για την Παραγωγή", async ({
  page,
  browser,
}) => {
  await signIn(page, "owner@example.com");
  await visit(page, "/app/filming");
  const filters = page.getByRole("navigation", { name: "Φίλτρα" });
  await expect(filters.getByRole("link", { name: /Αναμένουν έγκριση/ })).toBeVisible();

  await visit(page, "/app/filming/queue");
  // Η ουρά είναι κοινή με άλλα τεστ: ή έχει τις ομάδες της ή λέει ότι δεν περιμένει τίποτα.
  await expect(
    page
      .getByRole("heading", { name: "Αναμένουν έγκριση", exact: true })
      .or(page.getByText("Τίποτα δεν περιμένει απάντηση.", { exact: true })),
  ).toBeVisible();

  await inSpaces(browser, "production@example.com", async (producer) => {
    await visit(producer, "/app/filming/queue");
    await expect(producer.getByText("Την ουρά έγκρισης τη βλέπει")).toBeVisible();
  });
});

// Το κουμπί ενεργοποιείται μόνο μετά από αλλαγή· ό,τι γράφεται πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
async function fillUntilSaveEnables(rules: Locator, value: string) {
  await expect(async () => {
    await rules.getByLabel("Ορίζοντας κρατήσεων (μέρες)").fill(value);
    await expect(button(rules, "Αποθήκευση")).toBeEnabled({ timeout: 1_000 });
  }).toPass();
}

test("ο Ιδιοκτήτης αλλάζει έναν Κανόνα γυρισμάτων και τον γυρίζει πίσω", async ({ page }) => {
  await signIn(page, "owner@example.com");
  await visit(page, "/app/settings/filming");
  const rules = page.locator("form", { has: page.locator('input[name="horizonDays"]') });
  await expect(button(rules, "Αποθήκευση")).toBeDisabled();
  await fillUntilSaveEnables(rules, "45");
  await button(rules, "Αποθήκευση").click();
  await expect(rules.getByRole("status")).toContainText("Οι Κανόνες αποθηκεύτηκαν.");
  await expect(button(rules, "Αποθήκευση")).toBeDisabled();

  await page.reload();
  await expect(rules.getByLabel("Ορίζοντας κρατήσεων (μέρες)")).toHaveValue("45");
  await fillUntilSaveEnables(rules, "60");
  await button(rules, "Αποθήκευση").click();
  await expect(rules.getByRole("status")).toContainText("Οι Κανόνες αποθηκεύτηκαν.");
});

test("το Πρότυπο Συνεργείου αποθηκεύεται και φαίνεται στη λίστα του E7", async ({ page }) => {
  const P = project();
  const TEMPLATE = `Πρότυπο ${P}`;
  await signIn(page, "owner@example.com");
  await visit(page, "/app/filming/crew-templates");

  await button(page, "Νέο Πρότυπο").click();
  const create = page.locator("section", {
    has: page.getByRole("heading", { name: "Νέο Πρότυπο συνεργείου", exact: true }),
  });
  await create.getByLabel("Όνομα (υποχρεωτικό)").fill(TEMPLATE);
  await create.getByLabel(PRODUCER, { exact: true }).check();
  await button(create, "Αποθήκευση").click();
  await expect(page.getByRole("heading", { name: TEMPLATE, exact: true })).toBeVisible();
});
