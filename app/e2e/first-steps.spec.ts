import { expect, test } from "@playwright/test";

import { project, signIn } from "./sales-parts";
import { roleHeldBy, teamUser, unique, uniqueEmail } from "./team-parts";

// a3: ο Ιδιοκτήτης γράφει τα «Πρώτα βήματα» ενός Ρόλου· ο Χρήστης τα βλέπει στη Σήμερα μέχρι το «Κατάλαβα». Φανταστικά στοιχεία.
test.describe.configure({ retries: 0 });

test("ο Ιδιοκτήτης γράφει τα «Πρώτα βήματα» και ο νέος Χρήστης τα κλείνει", async ({
  browser,
}) => {
  const P = project();
  const email = uniqueEmail(`first-steps-${P}`);
  const userId = await teamUser({
    name: unique("Πρώτα Βήματα"),
    email,
    role: "Λογιστής",
  });
  const roleId = await roleHeldBy(unique(`Βοηθός ${P}`), userId);
  const text = `Ξεκίνα από τα Παραδοτέα της εβδομάδας (${P} ${Date.now()}).`;

  const owner = await browser.newPage();
  await signIn(owner, "owner@example.com");
  await owner.goto(`/app/team/roles/${roleId}`);
  const form = owner.locator("#role-first-steps");
  await form.getByRole("textbox").fill(text);
  await form.getByRole("button", { name: "Αποθήκευση κειμένου" }).click();
  await expect(form.getByRole("status")).toContainText("Αποθηκεύτηκε");
  await owner.close();

  const page = await browser.newPage();
  await signIn(page, email);
  const card = page.locator("#first-steps");
  await expect(
    card.getByRole("heading", { name: "Πρώτα βήματα" }),
  ).toBeVisible();
  await expect(card).toContainText(text);
  await expect(card).toContainText("Βλέπεις τα Οικονομικά");
  await card.getByRole("button", { name: "Κατάλαβα" }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#first-steps")).toHaveCount(0);
  await page.close();
});
