import { expect, test } from "@playwright/test";

import { FILMING_URL, visit } from "./filming-parts";
import {
  CLIENT_EMAIL,
  CLIENT_PRODUCT_NAME,
  EXCEPTION_NOTE,
  bookFirstFreeSlot,
  setOpeningHours,
  signedBookingAgreement,
  switchUser,
} from "./booking-parts";
import { button, inContext, project, signIn, tableRow } from "./sales-parts";

// Κρατήσεις (C2α, #130): Ωράριο, εξαίρεση, κράτηση του Πελάτη με έγκριση και μετάθεση που απορρίπτεται.
// Σειριακά: το Ωράριο είναι μία γραμμή κοινή για όλα τα specs και το (α) πρέπει να τρέξει πρώτο.
test.describe.configure({ mode: "serial", retries: 0 });

test("ο Ιδιοκτήτης ορίζει το Ωράριο και προσθέτει και σβήνει εξαίρεση", async ({ page }) => {
  const P = project();
  await signIn(page, "owner@example.com");
  await setOpeningHours(page);

  const note = EXCEPTION_NOTE(P);
  await visit(page, "/app/settings/filming");
  const exceptionForm = page.locator("form", { has: button(page, "Προσθήκη εξαίρεσης") });
  await exceptionForm.locator('input[name="day"]').fill("2099-03-02");
  await exceptionForm.locator('select[name="mode"]').selectOption("closed");
  await exceptionForm.locator('textarea[name="note"]').fill(note);
  await button(exceptionForm, "Προσθήκη εξαίρεσης").click();
  await expect(page.getByText(note)).toBeVisible();

  await tableRow(page, note).getByRole("button", { name: "Διαγραφή", exact: true }).click();
  await expect(page.getByText(note)).toHaveCount(0);
});

test("ο Πελάτης κλείνει κράτηση, ο Ιδιοκτήτης την εγκρίνει", async ({ page, browser }) => {
  const P = project();
  await signedBookingAgreement(page, browser, P);
  await switchUser(page, CLIENT_EMAIL(P));
  await visit(page, "/app/book");
  await bookFirstFreeSlot(page);
  await expect(page).toHaveURL(/\/app\/filming\/[0-9a-f-]{36}\?done=booked$/);
  await expect(page.getByText("Αναμένει έγκριση").first()).toBeVisible();

  await inContext(browser, "owner@example.com", async (owner) => {
    await visit(owner, "/app/filming/queue");
    await tableRow(owner, CLIENT_PRODUCT_NAME(P)).getByRole("button", { name: "Έγκριση", exact: true }).click();
    await expect(tableRow(owner, CLIENT_PRODUCT_NAME(P))).toHaveCount(0);
  });
});

test("ο Πελάτης ζητά μετάθεση, ο Ιδιοκτήτης την απορρίπτει και το Γύρισμα μένει", async ({ page, browser }) => {
  const P = project();
  await signIn(page, CLIENT_EMAIL(P));
  await visit(page, "/app/filming");
  await tableRow(page, CLIENT_PRODUCT_NAME(P)).getByRole("link").first().click();
  await expect(page).toHaveURL(FILMING_URL);
  await page.getByRole("link", { name: "Μετάθεση", exact: true }).click();
  await bookFirstFreeSlot(page, { reschedule: true });
  await expect(page.getByText("Αίτημα μετάθεσης").first()).toBeVisible();

  await inContext(browser, "owner@example.com", async (owner) => {
    await visit(owner, "/app/filming/queue");
    const row = tableRow(owner, CLIENT_PRODUCT_NAME(P));
    await row.getByLabel("Λόγος απόρριψης").fill("e2e: δεν χωράει η ώρα");
    await row.getByRole("button", { name: "Απόρριψη", exact: true }).click();
    await expect(tableRow(owner, CLIENT_PRODUCT_NAME(P))).toHaveCount(0);
  });
});
