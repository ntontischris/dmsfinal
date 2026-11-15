import { expect, test, type Page } from "@playwright/test";

import { panel } from "./catalogue-parts";
import {
  button,
  clientIdByName,
  field,
  inspector,
  openNewLead,
  project,
  shot,
  signIn,
} from "./sales-parts";
import { clickUntil, openFolds } from "./today-parts";

// Φροντίδα Πελάτη (b7): ο Ιδιοκτήτης γράφει Διεύθυνση και Χώρο γυρίσματος στη Σελίδα Πελάτη, βάζει «Υπενθύμισέ με» για
// σήμερα, τη βλέπει στο Σήμερα και την κλείνει με «Έγινε». Φανταστικά στοιχεία, με το όνομα του project.

test.describe.configure({ retries: 0 });

// Σήμερα στην Αθήνα (YYYY-MM-DD): η υπενθύμιση της μέρας εμφανίζεται αμέσως στο Σήμερα.
const todayInAthens = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(
    new Date(),
  );

async function newClient(page: Page, P: string): Promise<string> {
  const form = await openNewLead(page);
  await field(form, "Όνομα πελάτη ή επιχείρησης").fill(`Φροντίδα Α.Ε. ${P}`);
  await field(form, "Κύριο πρόσωπο").fill("Ελένη Φροντίδα");
  await field(form, "Email").fill(`care.${P}@frontida.example.gr`);
  await form.locator('textarea[name="title"]').fill(`Βίντεο φροντίδας ${P}`);
  await field(form, "Πηγή").selectOption({ label: "Instagram" });
  await field(form, "Επόμενο βήμα").fill("Πρώτο τηλεφώνημα");
  await form.locator('input[name="nextStepDue"]').fill("2099-01-08");
  await button(form, "Δημιουργία Πελάτη και Ευκαιρίας").click();
  await expect(page).toHaveURL(/\/app\/pipeline\/[0-9a-f-]{36}$/);
  return `/app/clients/${await clientIdByName(`Φροντίδα Α.Ε. ${P}`)}`;
}

test("φροντίδα Πελάτη: Διεύθυνση, Χώρος γυρίσματος και «Υπενθύμισέ με» που φτάνει στο Σήμερα", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const P = project();
  const note = `Τηλέφωνο για το καλοκαίρι ${P}`;
  await signIn(page, "owner@example.com");
  const clientHref = await newClient(page, P);
  await page.goto(clientHref);

  const side = inspector(page);
  const placeForm = side.locator("form", {
    has: page.locator('input[name="address"]'),
  });
  await clickUntil(button(side, "Πρόσθεσε διεύθυνση"), placeForm);
  await placeForm
    .locator('input[name="address"]')
    .fill("Οδός Δοκιμής 10, Αθήνα");
  await placeForm
    .locator('input[name="filmingLocation"]')
    .fill(`Στούντιο Δοκιμής ${P}`);
  await button(placeForm, "Αποθήκευση").click();
  await expect(
    side.getByRole("link", { name: `Στούντιο Δοκιμής ${P}` }),
  ).toBeVisible();
  await expect(
    side.getByRole("link", { name: "Οδός Δοκιμής 10, Αθήνα" }),
  ).toHaveAttribute("href", /google\.com\/maps\/search/);

  const reminders = panel(page, "Υπενθυμίσεις μου");
  const addForm = reminders.locator("form", {
    has: page.locator('input[name="note"]'),
  });
  await clickUntil(button(reminders, "Υπενθύμισέ με"), addForm);
  await addForm.locator('input[name="remindOn"]').fill(todayInAthens());
  await addForm.locator('input[name="note"]').fill(note);
  await button(addForm, "Αποθήκευση").click();
  const row = reminders.locator("li", { hasText: note });
  await expect(row).toBeVisible();
  await shot(page, "b7-client-care");

  await page.goto("/app");
  await expect(
    page.getByRole("heading", { level: 1, name: "Σήμερα" }),
  ).toBeVisible();
  await openFolds(page);
  await expect(
    page.getByText("Υπενθυμίσεις μου", { exact: true }).first(),
  ).toBeVisible();

  await page.goto(clientHref);
  await button(
    panel(page, "Υπενθυμίσεις μου").locator("li", { hasText: note }),
    "Έγινε",
  ).click();
  await expect(
    panel(page, "Υπενθυμίσεις μου").locator("li", { hasText: note }),
  ).toHaveCount(0);
});
