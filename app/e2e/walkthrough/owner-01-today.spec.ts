import { expect, test } from "@playwright/test";

import { signIn } from "../sales-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη, διαδρομή 01: Είσοδος, Σήμερα και εργαλεία (docs/walkthrough/owner.md).
const OWNER = "owner@example.com";
const HEALTH = "Υγεία συστήματος";
const DECISIONS = "Μόνο εσύ μπορείς";

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

test("01 · η Σήμερα είναι ενημέρωση: αποφάσεις, πρόγραμμα και «Και άλλα», χωρίς τη γραμμή με τους αριθμούς", async ({
  page,
}) => {
  await signIn(page, OWNER);
  await expect(page.getByRole("heading", { name: DECISIONS })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Το πρόγραμμα" })).toBeVisible();
  await expect(page.locator(".a1-lead")).toContainText("εσένα");
  await expect(page.locator(".a1-strip")).toHaveCount(0);
  const more = page.locator("details.a1-others");
  await expect(more.locator("summary")).toHaveText(/^Και άλλα/);
  await more.locator("summary").click();
  await expect(more.locator(".a1-other-list, .a1-quiet").first()).toBeVisible();
  // Η Υγεία πάνω μόνο όταν κάτι χάλασε· αλλιώς μία ήσυχη γραμμή μέσα στο «Και άλλα». Πάντα σε ένα από τα δύο.
  await expect(page.getByRole("heading", { name: HEALTH }).or(more.getByRole("link", { name: HEALTH }))).toHaveCount(1);
});

test("01 · η Σήμερα έχει τα Χρήματα (ποσό και ρυθμός του μήνα) και την ομάδα", async ({ page }) => {
  await signIn(page, OWNER);
  const money = page.locator("[data-part='money']");
  await expect(money.getByRole("heading", { name: "Χρήματα" })).toBeVisible();
  await expect(money.locator(".a1-money-total strong")).toHaveText(/€$/);
  // Ο ρυθμός μετρά μόνο τα Τιμολόγια που λήγουν τον μήνα· όταν δεν λήγει κανένα, το λέει (και δεν έχει μετρητή).
  await expect(
    money.getByText(/: (μπήκαν .+ από .+ που λήγουν αυτόν τον μήνα|δεν λήγει κανένα Τιμολόγιο αυτόν τον μήνα)\.$/),
  ).toBeVisible();
  const team = page.locator("[data-part='team']");
  await expect(team.getByRole("heading", { name: "Η ομάδα" })).toBeVisible();
  await expect(team.getByText("Μόνο όπου κόλλησε κάτι")).toBeVisible();
  // Η πρόταση της κορυφής λέει τα ληξιπρόθεσμα σε €, όχι σε πλήθος (πριν από το € μη διαιρούμενο κενό: \s).
  await expect(page.locator(".a1-lead")).toContainText(/Ληξιπρόθεσμα .+\s€ από|Κανένα ληξιπρόθεσμο Τιμολόγιο\./);
});

// «Αργότερα» (#241 Σ8). Οι αποφάσεις του Ιδιοκτήτη υπάρχουν πάντα: το e2e/seed.mjs αφήνει Ευκαιρίες της φόρμας στην ουρά
// «Χωρίς υπεύθυνο». Δεν βασιζόμαστε σε ημερομηνίες ή τίτλους: παίρνουμε την πρώτη απόφαση, όποια κι αν είναι. Στο τέλος
// (και αν κάτι αποτύχει) η Αναίρεση αφήνει τη βάση όπως ήταν, για τα επόμενα τεστ του ίδιου shard.
test("01 · το «Αργότερα» κρύβει μια απόφαση ως αύριο το πρωί και η Αναίρεση τη φέρνει πίσω", async ({ page }) => {
  await signIn(page, OWNER);
  const decisions = page.locator("[data-part='decisions']");
  const later = decisions.getByRole("button", { name: /^Αργότερα: / });
  const quiet = decisions.locator(".a1-later-line");
  await expect(later.first()).toBeVisible();
  const name = (await later.first().getAttribute("aria-label")) ?? "";
  const same = decisions.getByRole("button", { name, exact: true });
  const before = await same.count();
  try {
    await later.first().click();
    await expect(same).toHaveCount(before - 1);
    await expect(quiet).toHaveText(/^1 για αργότερα · ξαναβγαίνει (αύριο|στις 8) το πρωί · Αναίρεση$/);
    await quiet.getByRole("button", { name: "Αναίρεση", exact: true }).click();
    await expect(quiet).toHaveCount(0);
    await expect(same).toHaveCount(before);
  } finally {
    if ((await quiet.count()) > 0) {
      await quiet.getByRole("button", { name: /^Αναίρεση/ }).click();
      await expect(quiet).toHaveCount(0);
    }
  }
});

test("01 · η Προσαρμογή έχει βελάκια σε κάθε κάρτα που μετακινείται", async ({ page }) => {
  await signIn(page, OWNER);

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
  await expect(page.getByRole("heading", { name: DECISIONS })).toBeVisible();
  await expect(page.getByText("Η εβδομάδα:")).toHaveCount(0);
  await page.goto("/app/filming?tab=week");
  await expect(page.getByRole("link", { name: /^Επόμενες 7 ημέρες/ })).toHaveAttribute("aria-current", "page");
});
