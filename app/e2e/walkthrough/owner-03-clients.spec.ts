import { expect, test } from "@playwright/test";

import {
  clientIdByName,
  field,
  inspector,
  project,
  signIn,
} from "../sales-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη, διαδρομή 03: Πελάτες. Ένας Πελάτης που μπήκε κατά λάθος σβήνεται· ένας με δουλειά όχι.
const OWNER = "owner@example.com";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context, page }) => {
  await useSpacesLook(context);
  await signIn(page, OWNER);
});

test("03 · ο Ιδιοκτήτης σβήνει έναν Πελάτη που μπήκε κατά λάθος, γράφοντας το όνομά του", async ({
  page,
}) => {
  // Δικό του όνομα και email σε κάθε προσπάθεια, ώστε μια αποτυχημένη να μην μπερδεύει την επόμενη.
  const name = `Λάθος Πελάτης ${project()} ${test.info().retry}`;
  const email = `walk-${Date.now()}@example.com`;

  await page.goto("/app/clients");
  const form = page.locator("form.new-lead");
  // Το κουμπί ζωντανεύει μόλις φορτώσει η σελίδα· μέχρι τότε το πάτημα χάνεται.
  await expect(async () => {
    if (!(await form.isVisible()))
      await page
        .getByRole("button", { name: "Νέος Πελάτης / Ευκαιρία", exact: true })
        .click();
    await expect(form).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await field(form, "Όνομα πελάτη ή επιχείρησης").fill(name);
  await field(form, "Κύριο πρόσωπο").fill("Σοφία Λάθους");
  await field(form, "Email").fill(email);
  await form.locator('textarea[name="title"]').fill("Βίντεο που δεν θα γίνει");
  await field(form, "Πηγή").selectOption({ label: "Τηλέφωνο" });
  await field(form, "Επόμενο βήμα").fill("Κλήση");
  await form
    .getByRole("button", {
      name: "Δημιουργία Πελάτη και Ευκαιρίας",
      exact: true,
    })
    .click();

  let clientId = "";
  await expect(async () => {
    clientId = await clientIdByName(name);
  }).toPass();
  await page.goto(`/app/clients/${clientId}`);

  const side = inspector(page);
  const dialog = page.getByRole("alertdialog", {
    name: `Διαγραφή Πελάτη: ${name}`,
  });
  await expect(async () => {
    if (!(await dialog.isVisible()))
      await side
        .getByRole("button", { name: "Διαγραφή Πελάτη", exact: true })
        .click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  const confirm = dialog.getByRole("button", { name: "Διαγραφή", exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Γράψε «${name}» για επιβεβαίωση`).fill(name);
  await confirm.click();

  await expect(page).toHaveURL(/\/app\/clients\?deleted=1$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Ο Πελάτης διαγράφηκε." }),
  ).toBeVisible();
  await page.goto(`/app/clients?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});

test("03 · ένας Πελάτης με δουλειά δεν σβήνεται και η σελίδα λέει γιατί", async ({
  page,
}) => {
  // Από το seed: έχει Χρήστη πελάτη (και, όταν τρέξουν τα τεστ Κρατήσεων, Συμφωνία). Ο λόγος αλλάζει, το «δεν σβήνεται» όχι.
  const clientId = await clientIdByName(`Πελάτης Κρατήσεων ${project()}`);
  await page.goto(`/app/clients/${clientId}`);
  const side = inspector(page);
  await expect(
    side.getByRole("button", { name: "Διαγραφή Πελάτη", exact: true }),
  ).toBeDisabled();
  await expect(side.getByText(/^Δεν σβήνεται: /)).toBeVisible();
});
