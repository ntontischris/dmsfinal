import { expect, test, type Page } from "@playwright/test";

import {
  button,
  card,
  clientIdByName,
  field,
  inContext,
  listItem,
  project,
  signIn,
} from "./sales-parts";

// Σήμερα Σβ (#181): οι κάρτες «περιμένει απόφαση». Ο πωλητής κάνει ένα Αίτημα πρόσβασης· ο Ιδιοκτήτης το βλέπει να μετρά
// στην κάρτα «Χωρίς υπεύθυνο», και το «Άνοιγμα →» τον πάει στην ουρά, όπου το απορρίπτει (ώστε να μη μείνει τίποτα πίσω).
// Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

const UNASSIGNED = "Χωρίς υπεύθυνο";

const unassignedCard = (page: Page) => card(page, UNASSIGNED);

// Το πλήθος της κάρτας, όταν φορτώσει· 0 αν η κάρτα είναι άδεια (μαζεμένη στη γραμμή «Τίποτα σε αναμονή»).
async function unassignedCount(page: Page): Promise<number> {
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  if ((await unassignedCard(page).count()) === 0) return 0;
  const badge = unassignedCard(page).locator('[aria-label$=" σε αναμονή"]');
  await expect(badge).toBeVisible();
  return Number.parseInt((await badge.getAttribute("aria-label")) ?? "0", 10);
}

test("ένα Αίτημα πρόσβασης μετρά στην κάρτα «Χωρίς υπεύθυνο» και το «Άνοιγμα →» πάει στην ουρά", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const topic = `Σήμερα απόφαση ${P}`;

  await signIn(page, "owner@example.com");
  const before = await unassignedCount(page);

  await inContext(browser, "sales@example.com", async (seller) => {
    await seller.goto(
      `/app/clients/${await clientIdByName(`Ταβέρνα Αρμύρα ${P}`)}`,
    );
    await field(seller, "Τι αφορά").fill(topic);
    await field(seller, "Πηγή").selectOption({ label: "Τηλέφωνο" });
    await button(seller, "Αίτημα πρόσβασης").click();
    await expect(
      seller.getByText("Το αίτημα στάλθηκε στη Διαχείριση"),
    ).toBeVisible();
  });

  await page.reload();
  const decide = unassignedCard(page);
  await expect(decide.getByLabel(`${before + 1} σε αναμονή`)).toBeVisible();
  await decide.getByRole("link", { name: "Άνοιγμα →" }).click();
  await expect(page).toHaveURL(/\/app\/unassigned$/);

  const request = listItem(card(page, "Αιτήματα πρόσβασης"), topic);
  await expect(request).toContainText(`Ταβέρνα Αρμύρα ${P}`);
  await button(request, "Απόρριψη").click();
  await field(request, "Σχόλιο απόρριψης (υποχρεωτικό)").fill(
    "Τον Πελάτη τον έχει ήδη ο Νίκος",
  );
  await button(request, "Επιβεβαίωση απόρριψης").click();
  await expect(request).toHaveCount(0);
});
