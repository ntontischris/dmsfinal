import { expect, test } from "@playwright/test";

import { signIn } from "../sales-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη, διαδρομή 01: Είσοδος, Σήμερα και εργαλεία (docs/walkthrough/owner.md).
const OWNER = "owner@example.com";
const HEALTH = "Υγεία συστήματος";

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

test("01 · η Είσοδος δεν έχει Google και ο λάθος κωδικός δεν λέει αν υπάρχει λογαριασμός", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByText("Η είσοδος γίνεται μόνο με πρόσκληση.")).toBeVisible();
  await expect(page.getByText("Συνέχεια με Google")).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill(OWNER);
  await page.getByLabel("Κωδικός").fill("wrong-password-1");
  await page.getByRole("button", { name: "Είσοδος" }).click();
  await expect(page.getByText("Λάθος email ή κωδικός.")).toBeVisible();
});

test("01 · η Σήμερα δείχνει πάντα την Υγεία και η Προσαρμογή έχει βελάκια σε κάθε κάρτα που μετακινείται", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await expect(page.getByRole("heading", { name: HEALTH })).toBeVisible();
  await expect(page.locator(".a1-more").getByText(HEALTH)).toHaveCount(0);

  await page.getByRole("link", { name: "Προσαρμογή", exact: true }).click();
  const list = page.locator(".a1-custom-list");
  await expect(list).toBeVisible();
  const up = list.getByRole("button", { name: /πιο πάνω$/ });
  const down = list.getByRole("button", { name: /πιο κάτω$/ });
  const count = await up.count();
  expect(count).toBeGreaterThan(1);
  await expect(down).toHaveCount(count);
  await expect(up.first()).toBeDisabled();
  await expect(list.getByText("πάντα πρώτη")).toBeVisible();
});

test("01 · στο Προφίλ ο Ιδιοκτήτης έχει σύνδεσμο στους Ρόλους, όχι «ζήτησέ το από τη Διαχείριση»", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await page.goto("/app/settings/profile");
  await expect(page.getByRole("heading", { name: "Οι Ρόλοι μου" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ρόλοι και Δικαιώματα" })).toBeVisible();
  await expect(page.getByText("Τους Ρόλους δεν τους αλλάζεις εσύ")).toHaveCount(0);
});

test("01 · το «Νέο» και η Αναζήτηση ανοίγουν από τη Σήμερα", async ({ page }) => {
  await signIn(page, OWNER);
  const newMenu = page.getByRole("button", { name: "Νέο", exact: true });
  const newFilming = page.getByRole("link", { name: "Νέο Γύρισμα" });
  // Πάτημα πριν ζωντανέψει η σελίδα χάνεται· ξαναπατάμε μόνο όσο το μενού μένει κλειστό.
  await expect(async () => {
    if (!(await newFilming.isVisible())) await newMenu.click();
    await expect(newFilming).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(page.getByRole("link", { name: "Καταχώρηση Τιμολογίου" })).toBeVisible();

  await page.keyboard.press("Escape");
  const searchBox = page.getByLabel("Αναζήτηση", { exact: true });
  await expect(async () => {
    if (!(await searchBox.isVisible())) await page.getByRole("button", { name: "Αναζήτηση (Ctrl+K)" }).click();
    await expect(searchBox).toBeVisible({ timeout: 1_000 });
  }).toPass();
});

test("01 · η Σήμερα δεν έχει διπλή γραμμή «Η εβδομάδα» και τα Γυρίσματα έχουν την προβολή «Επόμενες 7 ημέρες»", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await expect(page.getByRole("heading", { name: HEALTH })).toBeVisible();
  await expect(page.getByText("Η εβδομάδα:")).toHaveCount(0);
  await page.goto("/app/filming?tab=week");
  await expect(page.getByRole("link", { name: /^Επόμενες 7 ημέρες/ })).toHaveAttribute("aria-current", "page");
});
