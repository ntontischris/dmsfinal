import { expect, test, type Page } from "@playwright/test";

import { clientIdByName, project, signIn } from "./sales-parts";
import { serviceClient, teamUser, unique, uniqueEmail } from "./team-parts";
import { useSpacesLook } from "./walkthrough/spaces";

// Υγεία Pα (#214): Ίχνος ενεργειών (P1). Φίλτρα και chips στη διεύθυνση, «κρυφό ποσό» για Διαχείριση χωρίς «Βλέπει ποσά»,
// «Ιστορικό αλλαγών» από τη σελίδα Πελάτη, εξαγωγή, άρνηση για τις Πωλήσεις. Οι γραμμές του Ίχνους τις γράφει το seed
// (Πελάτες, Κατάλογος)· οι κανόνες ορατότητας και απόκρυψης ελέγχονται στο pgTAP (audit_trail_test.sql). Χωρίς ημερομηνίες.
test.describe.configure({ mode: "serial", retries: 0 });

const AUDIT_PATH = "/app/audit";
// Οι καρτέλες του Χώρου «Εταιρεία», όπου το Ίχνος είναι η καρτέλα «Ίχνος».
const companyTabs = (page: Page) =>
  page.getByRole("navigation", { name: "Εταιρεία" });
const chips = (page: Page) => page.getByRole("list", { name: "Ενεργά φίλτρα" });
const auditRows = (page: Page) => page.locator("li.part-row");

test.beforeEach(async ({ context }) => {
  await useSpacesLook(context);
});

test("ο Ιδιοκτήτης φιλτράρει το Ίχνος και τα φίλτρα μένουν στη διεύθυνση", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@example.com");
  await page.goto("/app/team");
  await companyTabs(page)
    .getByRole("link", { name: "Ίχνος", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${AUDIT_PATH}$`));
  await expect(
    companyTabs(page).getByRole("link", { name: "Ίχνος", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Ίχνος ενεργειών" }),
  ).toBeVisible();
  await expect(auditRows(page).first()).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "30 μέρες" }).click();
  await expect(page).toHaveURL(/period=30d/);
  await page.getByLabel("Περιοχή").selectOption({ label: "Κατάλογος" });
  await page.getByRole("button", { name: "Εφαρμογή" }).click();
  await expect(page).toHaveURL(/area=catalogue/);
  await expect(page).toHaveURL(/period=30d/);
  await expect(chips(page)).toContainText("Περιοχή: Κατάλογος");
  await expect(chips(page)).toContainText("Περίοδος: 30 μέρες");
  await expect(
    auditRows(page).locator(".part-sub", { hasText: "Κατάλογος" }).first(),
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
  // Το «Ιστορικό αλλαγών» ζει στο «⋯» της κεφαλίδας του Πελάτη.
  const menu = page.locator("details", {
    has: page.locator('summary[aria-label="Περισσότερες ενέργειες"]'),
  });
  await expect(async () => {
    if ((await menu.getAttribute("open")) === null)
      await menu.locator("summary").click();
    await expect(menu).toHaveAttribute("open", "", { timeout: 1_000 });
  }).toPass();
  await menu.getByRole("link", { name: "Ιστορικό αλλαγών" }).click();
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
      .locator("details.kit-fb-card", { hasText: "Σύνολο δεδομένων" })
      .locator(".kit-fb-chip"),
  ).toHaveText("Ίχνος ενεργειών");
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
    page.getByRole("link", { name: "Ίχνος", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ίχνος ενεργειών" })).toHaveCount(
    0,
  );
  await page.goto(AUDIT_PATH);
  await expect(
    page.getByRole("heading", { name: "Χωρίς δικαίωμα" }),
  ).toBeVisible();
  await expect(auditRows(page)).toHaveCount(0);
});
