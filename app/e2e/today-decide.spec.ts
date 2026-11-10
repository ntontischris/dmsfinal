import { expect, test, type Page } from "@playwright/test";

import { inSpacesContext } from "./messages-parts";
import { clientIdByName, project, signIn } from "./sales-parts";
import { clickUntil } from "./today-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Σήμερα Σβ (#181) στη νέα εμφάνιση (Χώροι): οι κάρτες «περιμένει απόφαση» μαζεύονται στο «Μόνο εσύ μπορείς». Ο πωλητής
// κάνει ένα Αίτημα πρόσβασης· ο Ιδιοκτήτης το βλέπει να μετρά στις αποφάσεις, και ο σύνδεσμος της ουράς «Χωρίς υπεύθυνο»
// τον πάει εκεί, όπου το απορρίπτει (ώστε να μη μείνει τίποτα πίσω). Σειριακά, χωρίς retries· τα δύο projects μοιράζονται
// μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const decisions = (page: Page) => page.locator("[data-part='decisions']");

// Το πλήθος των αποφάσεων, όταν φορτώσει· 0 αν δεν υπάρχει καμία (το πάνελ μένει χωρίς αριθμό).
async function decisionsCount(page: Page): Promise<number> {
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  await expect(decisions(page)).toBeVisible();
  const total = decisions(page).locator(".kit-panel-head > span.kit-label");
  if ((await total.count()) === 0) return 0;
  return Number.parseInt((await total.textContent()) ?? "0", 10);
}

test("ένα Αίτημα πρόσβασης μετρά στις αποφάσεις της Σήμερα και ο σύνδεσμος πάει στην ουρά «Χωρίς υπεύθυνο»", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const topic = `Σήμερα απόφαση ${P}`;

  await signIn(page, "owner@example.com");
  const before = await decisionsCount(page);

  // Η Πηγή δεν ρωτιέται πια: η βάση δίνει στο αίτημα την Πηγή του Πελάτη.
  await inSpacesContext(browser, "sales@example.com", async (seller) => {
    await seller.goto(
      `/app/clients/${await clientIdByName(`Ταβέρνα Αρμύρα ${P}`)}`,
    );
    const about = seller.getByRole("textbox", { name: "Τι αφορά η Ευκαιρία" });
    await clickUntil(
      seller.getByRole("button", { name: "Αίτημα πρόσβασης", exact: true }),
      about,
    );
    await about.fill(topic);
    await seller.getByRole("button", { name: "Αποστολή αιτήματος" }).click();
    await expect(
      seller.getByText("Το αίτημα στάλθηκε στη Διαχείριση"),
    ).toBeVisible();
  });

  await page.reload();
  await expect(
    decisions(page).locator(".kit-panel-head > span.kit-label"),
  ).toHaveText(String(before + 1));
  await decisions(page).locator('a[href^="/app/unassigned"]').first().click();
  await expect(page).toHaveURL(/\/app\/unassigned$/);

  const request = page.getByRole("listitem").filter({ hasText: topic });
  await expect(request).toContainText(`Ταβέρνα Αρμύρα ${P}`);
  const comment = request.getByRole("textbox", { name: "Σχόλιο απόρριψης" });
  await clickUntil(
    request.getByRole("button", { name: "Απόρριψη", exact: true }),
    comment,
  );
  await comment.fill("Τον Πελάτη τον έχει ήδη ο Νίκος");
  await request
    .getByRole("button", { name: "Επιβεβαίωση απόρριψης", exact: true })
    .click();
  await expect(request).toHaveCount(0);
});
