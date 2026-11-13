import { expect, test } from "@playwright/test";

import { field, project, signIn } from "./sales-parts";
import { serviceClient } from "./team-parts";

// a2: η μία «Πρόσκληση» (N6) από το «+ Νέο», για άνθρωπο της ομάδας ή Πελάτη. Φανταστικά στοιχεία.
test.describe.configure({ retries: 0 });

async function freshClient(name: string): Promise<string> {
  const { data, error } = await serviceClient()
    .from("clients")
    .insert({
      name,
      contact_name: "Επαφή",
      contact_email: `${Date.now()}@example.com`,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Πελάτης: ${error?.message ?? ""}`);
  return String(data.id);
}

test("το «Νέο» ανοίγει την Πρόσκληση και από εκεί προσκαλείς άνθρωπο Πελάτη", async ({
  page,
}) => {
  const P = project();
  const name = `Πελάτης Πρόσκλησης ${P} ${Date.now()}`;
  const clientId = await freshClient(name);
  await signIn(page, "owner@example.com");

  const newMenu = page.getByRole("button", { name: "Νέο", exact: true });
  const invite = page.getByRole("link", { name: "Πρόσκληση Χρήστη" });
  await expect(async () => {
    if (!(await invite.isVisible())) await newMenu.click();
    await expect(invite).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await invite.click();
  await expect(page).toHaveURL(/\/app\/team\/invite/);

  // Η ίδια φόρμα: πρώτα ο άνθρωπος της ομάδας, με τους Ρόλους ομάδας.
  const form = page.locator("#n1-invite");
  await expect(form.getByLabel("Ρόλος Πωλήσεις", { exact: true })).toBeVisible();
  await form.getByLabel("Άνθρωπο Πελάτη").check();
  await expect(field(form, "Πελάτης")).toBeVisible();
  await expect(field(form, "Ρόλος πελάτη")).toBeVisible();

  // Από τη Σελίδα Πελάτη ή με ?client= ο Πελάτης έρχεται έτοιμος.
  await page.goto(`/app/team/invite?kind=client&client=${clientId}`);
  await expect(form.getByText(`Ο Χρήστης μπαίνει στον Πελάτη «${name}»`)).toBeVisible();
  await field(form, "Ονοματεπώνυμο").fill(`Επαφή ${P}`);
  await field(form, "Email").fill(`invite.${P}.${Date.now()}@example.com`);
  await form.getByRole("button", { name: "Αποστολή πρόσκλησης" }).click();
  await expect(form.getByRole("status")).toContainText("Η πρόσκληση στάλθηκε");
});
