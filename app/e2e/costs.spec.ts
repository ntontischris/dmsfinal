import { expect, test, type Page } from "@playwright/test";

import { visit } from "./filming-parts";
import { COSTS_URL, openProduction } from "./productions-parts";
import { button, card, project, shot, signIn } from "./sales-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Κόστος και ώρες (G3, G1 «Θέλουν ώρες») από άκρη σε άκρη, στη νέα εμφάνιση (Χώροι). Η Εσωτερική «Showreel {project}»
// του seed είναι ανοιχτή και χωρίς ώρες. Το G3 είναι μία οθόνη με επιλογή Παραγωγής (?production=)· η σελίδα της
// Παραγωγής (G2) ανοίγει το κόστος της με το «Κόστος και ώρες». Τα τεστ γράφουν στην ίδια βάση, σειριακά, χωρίς retries.
test.describe.configure({ retries: 0 });

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

const COSTS_PATH = "/app/productions/costs";
const COST_LINK = "Κόστος και ώρες";
const EDIT_HOURS = "14,5";

// Από τη σελίδα της Παραγωγής στο G3 της, με τον σύνδεσμο της κεφαλίδας (τον βλέπει μόνο όποιος βλέπει κόστος).
async function openCosts(page: Page, title: string): Promise<void> {
  await openProduction(page, title);
  await page.getByRole("link", { name: COST_LINK, exact: true }).click();
  await expect(page).toHaveURL(COSTS_URL);
  await expect(card(page, "Πραγματικές ώρες")).toBeVisible();
}

test("ο Ιδιοκτήτης βλέπει την Παραγωγή στο G3, γράφει ώρες μοντάζ και τις επιβεβαιώνει", async ({
  page,
}) => {
  const TITLE = `Showreel ${project()}`;

  await signIn(page, "owner@example.com");
  // Η «Θέλουν ώρες» της G1 φαίνεται σε όποιον βλέπει κόστος.
  await visit(page, "/app/productions");
  await expect(page.getByRole("link", { name: /^Θέλουν ώρες/ })).toBeVisible();

  await openCosts(page, TITLE);
  await expect(
    page.getByRole("link", { name: "Πίσω στην Παραγωγή (G2)", exact: true }),
  ).toBeVisible();
  await shot(page, "g3-owner-detail");

  const hours = card(page, "Πραγματικές ώρες");
  const edit = hours.getByLabel("Ώρες μοντάζ", { exact: true });
  const confirm = hours.getByRole("checkbox", {
    name: "Επιβεβαιώνω τις ώρες μοντάζ",
    exact: true,
  });
  // Οι τιμές ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
  await expect(async () => {
    await edit.fill(EDIT_HOURS);
    await confirm.check();
    await expect(confirm).toBeChecked({ timeout: 1_000 });
    await expect(edit).toHaveValue(EDIT_HOURS, { timeout: 1_000 });
  }).toPass();
  await button(hours, "Αποθήκευση ωρών").click();
  await expect(hours.getByRole("status")).toContainText("Αποθηκεύτηκε.");

  // Μετά από φρεσκάρισμα οι ώρες μένουν, επιβεβαιωμένες.
  await page.reload();
  await expect(hours.getByLabel("Ώρες μοντάζ", { exact: true })).toHaveValue(
    EDIT_HOURS,
  );
  await expect(confirm).toBeChecked();
  await shot(page, "g3-owner-saved");
});

test("η Διαχείριση βλέπει το κόστος αλλά δεν γράφει", async ({ page }) => {
  const TITLE = `Showreel ${project()}`;

  await signIn(page, "admin@example.com");
  await openCosts(page, TITLE);
  await expect(card(page, "Εκτίμηση και πραγματικό")).toBeVisible();
  await expect(
    page.getByText("Τις γράφει μόνο όποιος «Διαχειρίζεται κόστος»", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Αποθήκευση ωρών", exact: true }),
  ).toHaveCount(0);
});

test("οι Πωλήσεις δεν βλέπουν το G3", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await visit(page, COSTS_PATH);
  await expect(
    page.getByText("Το κόστος το βλέπουν μόνο όσοι", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Αποθήκευση ωρών", exact: true }),
  ).toHaveCount(0);
});
