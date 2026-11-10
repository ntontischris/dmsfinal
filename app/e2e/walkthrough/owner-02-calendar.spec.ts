import { expect, test } from "@playwright/test";

import { project, signIn } from "../sales-parts";

// Περιήγηση Ιδιοκτήτη, διαδρομή 02: Ημερολόγιο και Ρεπό / Άδεια (docs/walkthrough/owner.md).
const OWNER = "owner@example.com";
const OWNER_NAME = "Γιώργος Ιδιοκτήτης";
const PRODUCTION = "production@example.com";
const DAY = "2027-03-10";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await signIn(page, OWNER);
});

test("02 · οι Ρυθμίσεις έχουν τα Είδη κλεισμένου χρόνου", async ({ page }) => {
  await page.goto("/app/settings/filming?part=calendar");
  for (const kind of ["Ρεπό", "Άδεια", "Ραντεβού", "Τηλεφώνημα", "Άλλο"]) {
    await expect(page.getByRole("button", { name: `Μετονομασία: ${kind}`, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Χρώμα και εικονίδιο: ${kind}`, exact: true })).toBeVisible();
  }
});

test("02 · το εικονίδιο διαλέγεται από λίστα, και μόνο όποιο Είδος το επιτρέπει γίνεται Γύρισμα", async ({ page }) => {
  await page.goto("/app/settings/filming?part=calendar");
  for (const [kind, icon, isConvertible] of [
    ["Ρεπό", "🌙", false],
    ["Ραντεβού", "🤝", true],
  ] as const) {
    const open = page.getByRole("button", { name: `Χρώμα και εικονίδιο: ${kind}`, exact: true });
    const form = page.locator("form.kind-style").filter({ hasText: `Εικονίδιο: ${kind}` });
    await expect(async () => {
      if (!(await form.isVisible())) await open.click();
      await expect(form).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await expect(form.getByRole("radio", { name: icon, exact: true })).toBeChecked();
    await expect(form.getByRole("radio", { name: "Χωρίς εικονίδιο", exact: true })).toBeVisible();
    const convert = form.getByRole("checkbox", { name: /Μπορεί να γίνει Γύρισμα/ });
    if (isConvertible) await expect(convert).toBeChecked();
    else await expect(convert).not.toBeChecked();
    await open.click();
    await expect(form).toBeHidden();
  }
});

test("02 · το Ημερολόγιο έχει Επόμενα βήματα, Προθεσμίες και φίλτρο ατόμου", async ({ page }) => {
  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  await page.locator(".a5-filters > summary").click();
  for (const label of ["Γυρίσματα", "Ρεπό, άδειες", "Επόμενα βήματα", "Προθεσμίες", "Εγώ", "Όλοι"])
    // Τα ενεργά επίπεδα γράφουν «✓ » μπροστά.
    await expect(
      page.locator(".a5-filters .a5-chip").filter({ hasText: new RegExp(`^(✓ )?${label}$`) }),
    ).toBeVisible();
});

test("02 · ο Ιδιοκτήτης κλείνει «Ραντεβού» από το «+ Ραντεβού», οι άλλοι το βλέπουν «Απασχολημένος», και το σβήνει", async ({
  context,
  page,
}) => {
  // Δικός του τίτλος σε κάθε προσπάθεια, χωρίς τη λέξη του Είδους, για να ελέγχεται χωριστά.
  const title = `Συνάντηση δοκιμής ${project()} ${test.info().retry}`;
  // Σχέδιο «3B»: ένα κουμπί ανά Είδος στο Ημερολόγιο, που ανοίγει τη φόρμα με το Είδος ήδη διαλεγμένο.
  await page.goto(`/app/calendar?view=week&date=${DAY}`);
  await page.getByRole("link", { name: "+ Ραντεβού", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/calendar\/blocked\/new\?.*kind=/);
  const kindSelect = page.locator('select[name="kindId"]');
  await expect(kindSelect.locator("option:checked")).toHaveText("Ραντεβού");

  const titleBox = page.getByLabel("Τίτλος");
  // Οι τιμές της φόρμας ζουν στο React· ό,τι γραφτεί πριν ζωντανέψει η σελίδα χάνεται, οπότε ξαναγράφεται.
  await expect(async () => {
    await page.getByLabel("Μερικές ώρες (π.χ. γιατρός)").check();
    await page.getByLabel("Μέρα", { exact: true }).fill(DAY);
    await page.getByLabel("Από", { exact: true }).fill("10:00");
    await page.getByLabel("Έως", { exact: true }).fill("11:00");
    await titleBox.fill(title);
    await expect(titleBox).toHaveValue(title, { timeout: 1_000 });
    await expect(page.getByLabel("Από", { exact: true })).toHaveValue("10:00", { timeout: 1_000 });
  }).toPass();
  await expect(kindSelect.locator("option:checked")).toHaveText("Ραντεβού");
  await page.getByRole("button", { name: "Αποθήκευση" }).click();
  await expect(page).toHaveURL(/\/app\/calendar/);

  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  const item = page.getByRole("link", { name: title, exact: true });
  await expect(item).toBeVisible();
  const row = page.getByRole("listitem").filter({ has: item });
  await expect(row).toContainText("Ραντεβού");
  await expect(row.locator('[data-row-tone="amber"]')).toHaveCount(1);

  // «Δες το και ως…»: η Παραγωγή βλέπει μόνο «Απασχολημένος», χωρίς τίτλο, Είδος ή το χρώμα του. Άλλος Χρήστης στην
  // ίδια καρτέλα: νέα σύνδεση από την αρχή, στη νέα εμφάνιση.
  await context.clearCookies();
  await signIn(page, PRODUCTION);
  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  const list = page.locator(".a5-list");
  const busy = list.getByRole("listitem").filter({ hasText: "Απασχολημένος" }).filter({ hasText: OWNER_NAME });
  await expect(busy.first()).toBeVisible();
  await expect(busy.first().locator("[data-row-tone]")).toHaveCount(0);
  await expect(list).not.toContainText(title);
  await expect(list).not.toContainText("Ραντεβού");

  await context.clearCookies();
  await signIn(page, OWNER);
  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  await item.click();
  await expect(page.getByLabel("Τίτλος")).toHaveValue(title);
  // Το Ραντεβού «Μπορεί να γίνει Γύρισμα» (ρύθμιση του Είδους).
  await expect(page.getByRole("link", { name: "Μετατροπή σε Γύρισμα" })).toBeVisible();
  const confirm = page.getByRole("alertdialog");
  await expect(async () => {
    if (!(await confirm.isVisible())) await page.getByRole("button", { name: "Διαγραφή", exact: true }).click();
    await expect(confirm).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await confirm.getByRole("button", { name: "Διαγραφή", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/calendar/);
  await page.goto(`/app/calendar?view=list&date=${DAY}`);
  await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
});
