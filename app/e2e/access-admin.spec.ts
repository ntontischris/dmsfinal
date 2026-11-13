import { expect, test } from "@playwright/test";

import { clientIdByName, project, signIn } from "./sales-parts";
import { grantCount, serviceClient, unique } from "./team-parts";

// Πρόσβαση (L7): a7 η Διαχείριση «Διαγράφει Πελάτες»· a6 ο νέος Ρόλος-αντίγραφο φτιάχνεται μαζί με τα Δικαιώματά του
// σε μία ενέργεια. Φανταστικά στοιχεία· ό,τι φτιάχνει το τεστ έχει όνομα με project και ώρα.

async function freshClient(name: string): Promise<string> {
  const { error } = await serviceClient().from("clients").insert({
    name,
    contact_name: "Μαρία Παπαδάκη",
    contact_email: `access-admin-${Date.now()}@example.com`,
  });
  if (error) throw new Error(`Πελάτης: ${error.message}`);
  return clientIdByName(name);
}

async function roleIdByName(name: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("roles")
    .select("id")
    .eq("name", name)
    .eq("kind", "team")
    .single();
  if (error || !data) throw new Error(`Ρόλος «${name}»: ${error?.message}`);
  return data.id as string;
}

test("η Διαχείριση σβήνει Πελάτη που μπήκε κατά λάθος", async ({ page }) => {
  const name = `Λάθος Πελάτης Διαχείρισης ${project()} ${Date.now()}`;
  const clientId = await freshClient(name);

  await signIn(page, "admin@example.com");
  await page.goto(`/app/clients/${clientId}`);
  const menu = page.locator("details", {
    has: page.locator('summary[aria-label="Περισσότερες ενέργειες"]'),
  });
  const dialog = page.getByRole("alertdialog", {
    name: `Διαγραφή Πελάτη: ${name}`,
  });
  await expect(async () => {
    if ((await menu.getAttribute("open")) === null)
      await menu.locator("summary").click();
    if (!(await dialog.isVisible()))
      await menu
        .getByRole("button", { name: "Διαγραφή Πελάτη", exact: true })
        .click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await dialog.getByLabel(`Γράψε «${name}» για επιβεβαίωση`).fill(name);
  await dialog.getByRole("button", { name: "Διαγραφή", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/clients\?deleted=1$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Ο Πελάτης διαγράφηκε." }),
  ).toBeVisible();
});

test("νέος Ρόλος ως αντίγραφο: έρχεται με όλα τα Δικαιώματα της αφετηρίας", async ({
  page,
}) => {
  const sourceId = await roleIdByName("Πωλήσεις");
  const name = unique("Πωλήσεις αντίγραφο");

  await signIn(page, "owner@example.com");
  await page.goto(`/app/team/roles/new?kind=team&from=${sourceId}`);
  await page.getByLabel("Όνομα", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Δημιουργία Ρόλου" }).click();
  await expect(page).toHaveURL(/\/app\/team\/roles\/[0-9a-f-]{36}$/);

  const newId = page.url().split("/").pop() ?? "";
  expect(await grantCount(newId)).toBe(await grantCount(sourceId));
  expect(await grantCount(newId)).toBeGreaterThan(0);
});
