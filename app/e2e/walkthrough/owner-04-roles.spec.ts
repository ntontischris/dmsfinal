import { expect, test } from "@playwright/test";

import { signIn } from "../sales-parts";
import {
  roleHeldBy,
  serviceClient,
  teamUser,
  unique,
  uniqueEmail,
} from "../team-parts";
import { useSpacesLook } from "./spaces";

// Περιήγηση Ιδιοκτήτη, διαδρομές 7–8: Ρόλοι. Ένας νέος Ρόλος διαγράφεται από τη λίστα· ένας Ρόλος που τον έχει κάποιος
// διαγράφεται από τη σελίδα του, αφού οι Χρήστες του μετακινηθούν σε άλλον Ρόλο. Ό,τι φτιάχνει το τεστ το σβήνει.
const OWNER = "owner@example.com";
const ROLES_PATH = "/app/team/roles";

test.describe.configure({ mode: "serial", retries: 0 });

test.beforeEach(async ({ context, page }) => {
  await useSpacesLook(context);
  await signIn(page, OWNER);
});

async function roleCount(name: string): Promise<number> {
  const { count, error } = await serviceClient()
    .from("roles")
    .select("id", { count: "exact", head: true })
    .eq("name", name);
  if (error) throw new Error(`Ρόλοι: ${error.message}`);
  return count ?? 0;
}

async function roleNamesOf(userId: string): Promise<string[]> {
  const { data, error } = await serviceClient()
    .from("team_user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  if (error || !data) throw new Error(`Ρόλοι Χρήστη: ${error?.message ?? ""}`);
  return data.flatMap((row) => {
    const role = row.roles as unknown as { name: string } | null;
    return role ? [role.name] : [];
  });
}

test("ένας νέος Ρόλος που δεν τον έχει κανείς διαγράφεται από τη λίστα", async ({
  page,
}) => {
  const name = unique("Ρόλος για διαγραφή");
  await page.goto(`${ROLES_PATH}/new?kind=team`);
  await page.getByLabel("Όνομα").fill(name);
  await page.getByRole("button", { name: "Δημιουργία Ρόλου" }).click();
  await expect(page).toHaveURL(new RegExp(`${ROLES_PATH}/[0-9a-f-]{36}$`));

  await page.goto(ROLES_PATH);
  await page
    .getByRole("link", { name: `Διαγραφή του Ρόλου «${name}»` })
    .click();
  const confirm = page.getByRole("alertdialog", { name: "Επιβεβαίωση" });
  await expect(confirm).toContainText("Δεν τον έχει κανείς");
  await confirm.getByRole("button", { name: "Ναι, διαγραφή" }).click();
  await expect(page).toHaveURL(new RegExp(`${ROLES_PATH}$`));
  await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  expect(await roleCount(name)).toBe(0);
});

test("ένας Ρόλος που τον έχουν διαγράφεται αφού οι Χρήστες του πάνε σε άλλον", async ({
  page,
}) => {
  const userId = await teamUser({
    name: unique("Μετακινούμενος"),
    email: uniqueEmail("moved"),
    role: "Πωλήσεις",
  });
  const name = unique("Ρόλος με Χρήστη");
  const roleId = await roleHeldBy(name, userId);

  await page.goto(`${ROLES_PATH}/${roleId}`);
  await expect(page.getByText("Τον έχουν 1 Χρήστη ομάδας.")).toBeVisible();
  await page.getByRole("link", { name: "Διαγραφή Ρόλου" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Επιβεβαίωση" });
  await confirm
    .getByLabel("Μετακίνησε τον 1 Χρήστη σε…")
    .selectOption({ label: "Παραγωγή" });
  await confirm
    .getByRole("button", { name: "Μετακίνηση και διαγραφή" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${ROLES_PATH}$`));
  expect(await roleCount(name)).toBe(0);
  expect((await roleNamesOf(userId)).sort()).toEqual(
    ["Πωλήσεις", "Παραγωγή"].sort(),
  );
});
