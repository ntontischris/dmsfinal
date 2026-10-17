import { expect, test, type Page } from "@playwright/test";

import { clientIdByName, project, signIn } from "./sales-parts";
import { serviceClient, teamUser, unique, uniqueEmail } from "./team-parts";

// Υγεία Pα (#214): Ίχνος ενεργειών (P1). Φίλτρα και chips στη διεύθυνση, «κρυφό ποσό» για Διαχείριση χωρίς «Βλέπει ποσά»,
// «Ιστορικό αλλαγών» από τη σελίδα Πελάτη, εξαγωγή, άρνηση για τις Πωλήσεις. Οι γραμμές του Ίχνους τις γράφει το seed
// (Πελάτες, Κατάλογος)· οι κανόνες ορατότητας και απόκρυψης ελέγχονται στο pgTAP (audit_trail_test.sql). Χωρίς ημερομηνίες.
test.describe.configure({ mode: "serial", retries: 0 });

const AUDIT_PATH = "/app/audit";
const nav = (page: Page) => page.getByRole("navigation", { name: "Οθόνες" });
const chips = (page: Page) => page.getByRole("list", { name: "Ενεργά φίλτρα" });

test("ο Ιδιοκτήτης φιλτράρει το Ίχνος και τα φίλτρα μένουν στη διεύθυνση", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await nav(page).getByRole("link", { name: "Ίχνος ενεργειών" }).click();
  await expect(page).toHaveURL(new RegExp(`${AUDIT_PATH}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Ίχνος ενεργειών" }),
  ).toBeVisible();
  await expect(page.locator("table")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Περίοδος" })
    .getByRole("link", { name: "30 μέρες" })
    .click();
  await expect(page).toHaveURL(/period=30d/);
  await page.getByLabel("Περιοχή").selectOption({ label: "Κατάλογος" });
  await page.getByRole("button", { name: "Εφαρμογή" }).click();
  await expect(page).toHaveURL(/area=catalogue/);
  await expect(page).toHaveURL(/period=30d/);
  await expect(chips(page)).toContainText("Περιοχή: Κατάλογος");
  await expect(chips(page)).toContainText("Περίοδος: 30 μέρες");
  await expect(
    page.locator("td[data-label='Περιοχή']", { hasText: "Κατάλογος" }).first(),
  ).toBeVisible();

  // Ο σελιδοδείκτης ξανανοίγει την ίδια εικόνα.
  await page.reload();
  await expect(chips(page)).toContainText("Περιοχή: Κατάλογος");

  await chips(page)
    .getByRole("link", { name: "Αφαίρεση φίλτρου Περίοδος" })
    .click();
  await expect(page).not.toHaveURL(/period=/);
  await expect(chips(page)).toContainText("Περιοχή: Κατάλογος");
  await chips(page).getByRole("link", { name: "Καθαρισμός" }).click();
  await expect(page).toHaveURL(new RegExp(`${AUDIT_PATH}$`));
  await expect(chips(page)).toHaveCount(0);
});

// Μια «Διαχείριση» χωρίς «Βλέπει ποσά» και «Βλέπει κόστος»: ίδια Δικαιώματα με τη Διαχείριση εκτός από αυτά τα δύο.
async function adminWithoutAmounts(): Promise<string> {
  const admin = serviceClient();
  const roleName = unique("Διαχείριση χωρίς ποσά");
  const { data: role, error: roleError } = await admin
    .from("roles")
    .insert({ name: roleName, kind: "team" })
    .select("id")
    .single();
  if (roleError || !role) throw new Error(`Ρόλος: ${roleError?.message ?? ""}`);
  const { data: source, error: sourceError } = await admin
    .from("role_permissions")
    .select("permission, scope, roles!inner(name, kind)")
    .eq("roles.name", "Διαχείριση")
    .eq("roles.kind", "team");
  if (sourceError || !source)
    throw new Error(`Δικαιώματα: ${sourceError?.message ?? ""}`);
  const rows = source
    .filter(
      (row) => !["finance.amounts", "finance.cost"].includes(row.permission),
    )
    .map((row) => ({
      role_id: role.id,
      permission: row.permission,
      scope: row.scope,
    }));
  const { error } = await admin.from("role_permissions").insert(rows);
  if (error) throw new Error(`Δικαιώματα Ρόλου: ${error.message}`);
  const email = uniqueEmail("audit-no-amounts");
  await teamUser({ name: unique("Θάλεια Ίχνος"), email, role: roleName });
  return email;
}

test("η Διαχείριση χωρίς «Βλέπει ποσά» βλέπει τη γραμμή με «κρυφό ποσό»", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const email = await adminWithoutAmounts();
  await signIn(page, email);
  await page.goto(`${AUDIT_PATH}?entity=catalogue_item_amounts`);
  await expect(chips(page)).toContainText("Στοιχείο: Τιμή στοιχείου Καταλόγου");
  await expect(page.getByText("κρυφό ποσό").first()).toBeVisible();
  await expect(page.getByText(/price: \d/)).toHaveCount(0);

  await page.goto(`${AUDIT_PATH}?entity=catalogue_item_costs`);
  await expect(page.getByText("κρυφό κόστος").first()).toBeVisible();
});

test("το «Ιστορικό αλλαγών» του Πελάτη ανοίγει το Ίχνος φιλτραρισμένο", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const name = `Κυψέλη Καφέ ${project()}`;
  const clientId = await clientIdByName(name);
  await signIn(page, "owner@example.com");
  await page.goto(`/app/clients/${clientId}`);
  await page.getByRole("link", { name: "Ιστορικό αλλαγών" }).click();
  await expect(page).toHaveURL(
    new RegExp(`${AUDIT_PATH}\\?entity=clients&id=${clientId}$`),
  );
  await expect(chips(page)).toContainText(`Στοιχείο: Πελάτης «${name}»`);
  await expect(
    page.getByRole("link", { name: `Πελάτης «${name}»` }).first(),
  ).toBeVisible();
});

test("ο Ιδιοκτήτης εξάγει το Ίχνος με τα φίλτρα του και το βλέπει στο Ιστορικό εξαγωγών", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await page.goto(`${AUDIT_PATH}?period=7d`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel (.xlsx)" }).click();
  expect((await download).suggestedFilename()).toBe(
    "Ίχνος ενεργειών 7 μέρες.xlsx",
  );

  await page.goto("/app/reports/export?dataset=audit");
  await expect(
    page
      .getByRole("navigation", { name: "Τι θέλεις να εξάγεις" })
      .getByRole("link", { name: "Ίχνος ενεργειών" }),
  ).toHaveAttribute("aria-current", "true");
  const history = page
    .getByRole("heading", { name: "Ιστορικό εξαγωγών" })
    .locator("xpath=ancestor::section[1]");
  await expect(
    history.getByText("Ίχνος ενεργειών · Excel").first(),
  ).toBeVisible();
});

test("οι Πωλήσεις δεν βλέπουν το Ίχνος", async ({ page }) => {
  await signIn(page, "sales@example.com");
  await expect(
    nav(page).getByRole("link", { name: "Ίχνος ενεργειών" }),
  ).toHaveCount(0);
  await page.goto(AUDIT_PATH);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
  await expect(page.locator("table")).toHaveCount(0);
});
