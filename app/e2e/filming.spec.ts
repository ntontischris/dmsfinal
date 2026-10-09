import { expect, test } from "@playwright/test";

import {
  PRODUCER,
  bookFilmingFromScreen,
  clientName,
  fieldOf,
  openFilmingFromList,
  signedMonthlyAgreement,
} from "./filming-parts";
import {
  button,
  card,
  inContext,
  project,
  shot,
  signIn,
  tableRow,
} from "./sales-parts";

// Γυρίσματα (E1–E4, E6, E7, Ρυθμίσεις) από άκρη σε άκρη. Το seed φέρνει μόνο τον Πελάτη και την Ευκαιρία·
// κάθε Συμφωνία και Γύρισμα γράφεται μέσα από τις οθόνες. Σειριακά και χωρίς retries, όπως τα υπόλοιπα τεστ.
test.describe.configure({ mode: "serial", retries: 0 });

const CREW_SAVED = "Το Συνεργείο αποθηκεύτηκε.";
const CREW_CONFIRMED = "Η συμμετοχή επιβεβαιώθηκε.";
const DONE_SAVED = "Το Γύρισμα σημειώθηκε «έγινε».";

test("η Άννα κλείνει Γύρισμα, ο Ιδιοκτήτης ορίζει Συνεργείο και η Ρένα επιβεβαιώνει και ολοκληρώνεται με «έγινε»", async ({
  page,
  browser,
}) => {
  const P = project();
  await signIn(page, "sales@example.com");
  await signedMonthlyAgreement(page, browser, P);

  await bookFilmingFromScreen(page, P);
  await openFilmingFromList(page, P);
  await expect(
    page.getByText("Προγραμματισμένο", { exact: true }).first(),
  ).toBeVisible();
  await shot(page, "filming-e3-booked");

  await inContext(browser, "owner@example.com", async (owner) => {
    await openFilmingFromList(owner, P);
    await owner.getByLabel(PRODUCER, { exact: true }).check();
    await button(owner, "Αποθήκευση Συνεργείου").click();
    await expect(owner.getByRole("status")).toContainText(CREW_SAVED);
    await expect(owner.locator("li", { hasText: PRODUCER })).toContainText(
      "Περιμένει",
    );
  });

  await inContext(browser, "production@example.com", async (producer) => {
    await producer.goto("/app/filming/mine");
    const row = tableRow(producer, clientName(P));
    await expect(row).toBeVisible();
    await button(row, "Επιβεβαιώνω").click();
    await expect(producer.getByRole("status")).toContainText(CREW_CONFIRMED);
  });

  await inContext(browser, "owner@example.com", async (owner) => {
    await openFilmingFromList(owner, P);
    await expect(owner.locator("li", { hasText: PRODUCER })).toContainText(
      "Επιβεβαίωσε",
    );
    const outcome = owner.locator("form", {
      has: owner.getByRole("button", { name: "Έγινε", exact: true }),
    });
    await fieldOf(outcome, "Πραγματικές ώρες").fill("3");
    await button(outcome, "Έγινε").click();
    await expect(owner.getByRole("status")).toContainText(DONE_SAVED);
    await expect(
      owner.getByText("Έγινε", { exact: true }).first(),
    ).toBeVisible();
    await shot(owner, "filming-e3-done");
  });
});

test("η ουρά έγκρισης φαίνεται στον Ιδιοκτήτη και κλειδώνεται για την Παραγωγή", async ({
  page,
  browser,
}) => {
  await signIn(page, "owner@example.com");
  const nav = page.getByRole("navigation", { name: "Οθόνες" });
  await expect(nav.getByRole("link", { name: "Ουρά έγκρισης" })).toBeVisible();

  await page.goto("/app/filming/queue");
  await expect(
    card(page, "Αναμένουν έγκριση"),
  ).toBeVisible();
  await expect(
    card(page, "Αιτήματα ακύρωσης"),
  ).toBeVisible();

  await inContext(browser, "production@example.com", async (producer) => {
    await producer.goto("/app/filming/queue");
    await expect(
      producer.getByText("Την ουρά έγκρισης τη βλέπει"),
    ).toBeVisible();
  });
});

test("ο Ιδιοκτήτης αλλάζει έναν Κανόνα γυρισμάτων και τον γυρίζει πίσω", async ({
  page,
}) => {
  await signIn(page, "owner@example.com");
  await page.goto("/app/settings/filming");
  const rules = page.locator("form", {
    has: page.getByRole("button", { name: "Αποθήκευση Κανόνων", exact: true }),
  });
  const horizon = fieldOf(rules, "Ορίζοντας κρατήσεων (μέρες)");
  await horizon.fill("45");
  await button(rules, "Αποθήκευση Κανόνων").click();
  await expect(rules.getByRole("status")).toContainText(
    "Οι Κανόνες αποθηκεύτηκαν.",
  );

  await page.reload();
  await expect(fieldOf(rules, "Ορίζοντας κρατήσεων (μέρες)")).toHaveValue("45");
  await fieldOf(rules, "Ορίζοντας κρατήσεων (μέρες)").fill("60");
  await button(rules, "Αποθήκευση Κανόνων").click();
  await expect(rules.getByRole("status")).toContainText(
    "Οι Κανόνες αποθηκεύτηκαν.",
  );
});

test("το Πρότυπο Συνεργείου αποθηκεύεται και φαίνεται στη λίστα του E7", async ({
  page,
}) => {
  const P = project();
  const TEMPLATE = `Πρότυπο ${P}`;
  await signIn(page, "owner@example.com");
  await page.goto("/app/filming/crew-templates");

  const create = page.locator("section", { hasText: "Νέο Πρότυπο" });
  await fieldOf(create, "Όνομα").fill(TEMPLATE);
  await create.getByLabel(PRODUCER, { exact: true }).check();
  await button(create, "Δημιουργία Προτύπου").click();
  await expect(create.getByRole("status")).toContainText(
    "Το Πρότυπο αποθηκεύτηκε.",
  );
  await expect(page.getByText(TEMPLATE, { exact: true })).toBeVisible();
});
