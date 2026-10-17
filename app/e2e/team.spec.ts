import { expect, test } from "@playwright/test";

import { field, listItem, signIn } from "./sales-parts";
import {
  assignmentsOf,
  clientWithUsers,
  grantCount,
  isTeamUserActive,
  productionOwner,
  roleHeldBy,
  teamUser,
  unique,
  uniqueEmail,
} from "./team-parts";

// Ομάδα Να (#207): απενεργοποίηση με προεπισκόπηση, Επανενεργοποίηση από την πρόσκληση, Ρόλος σε δύο βήματα και
// Συνάδελφοι (N3). Φανταστικά στοιχεία· τα δεδομένα στήνονται με το service role, οι ενέργειες γίνονται από την οθόνη.

// Τα τεστ γράφουν στην ίδια βάση· μια επανάληψη θα έβρισκε μισοαλλαγμένα δεδομένα.
test.describe.configure({ retries: 0 });

test("η απενεργοποίηση δείχνει ονομαστικά τι επιστρέφει και μετά το επιστρέφει", async ({
  page,
}) => {
  const name = unique("Φεύγων");
  const userId = await teamUser({
    name,
    email: uniqueEmail("leaving"),
    role: "Παραγωγή",
  });
  const title = unique("Παραγωγή Αποχώρησης");
  const { productionId, filmingId } = await assignmentsOf(userId, title);

  await signIn(page, "owner@example.com");
  await page.goto(`/app/team/${userId}`);
  await page
    .getByRole("button", { name: "Απενεργοποίηση", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("1 Παραγωγή → χωρίς Υπεύθυνο");
  await expect(dialog).toContainText(title);
  await expect(dialog).toContainText("1 Εργασία → χωρίς ανάθεση");
  await expect(dialog).toContainText(`Μοντάζ ${title}`);
  await expect(dialog).toContainText(
    "1 θέση σε Συνεργείο μελλοντικού Γυρίσματος",
  );
  await dialog.getByRole("button", { name: "Ναι, απενεργοποίηση" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Ο Χρήστης απενεργοποιήθηκε",
  );

  expect(await isTeamUserActive(userId)).toBe(false);
  expect(await productionOwner(productionId)).toBeNull();
  await page.goto(`/app/filming/${filmingId}`);
  await expect(page.getByText("άδειασε θέση", { exact: true })).toBeVisible();
  await expect(page.getByText(`${name} απενεργοποιήθηκε`)).toBeVisible();
});

test("η Διαχείριση δεν απενεργοποιεί τον Ιδιοκτήτη: η προεπισκόπηση λέει γιατί", async ({
  page,
}) => {
  await signIn(page, "admin@example.com");
  await page.goto("/app/team");
  await page.getByRole("link", { name: "Γιώργος Ιδιοκτήτης" }).click();
  await expect(
    page.getByText("Τον Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Απενεργοποίηση", exact: true }),
  ).toHaveCount(0);
});

test("email απενεργοποιημένου Χρήστη στην πρόσκληση: κουμπί Επανενεργοποίηση", async ({
  page,
}) => {
  const email = uniqueEmail("returning");
  const name = unique("Επιστρέφων");
  const userId = await teamUser({
    name,
    email,
    role: "Πωλήσεις",
    isActive: false,
  });

  await signIn(page, "owner@example.com");
  await page.goto("/app/team");
  await field(page, "Ονοματεπώνυμο").fill(name);
  await field(page, "Email").fill(email);
  await page.getByLabel("Πωλήσεις", { exact: true }).check();
  await page.getByRole("button", { name: "Πρόσκληση", exact: true }).click();
  const offer = page
    .getByRole("alert")
    .filter({ hasText: "έχει απενεργοποιηθεί" });
  await expect(offer).toContainText(name);
  await offer.getByRole("button", { name: "Επανενεργοποίηση" }).click();
  await expect(offer.getByRole("status")).toContainText(
    "Ο Χρήστης επανενεργοποιήθηκε",
  );
  expect(await isTeamUserActive(userId)).toBe(true);
  await expect(listItem(page, email)).toHaveCount(0);
});

test("η αποθήκευση Ρόλου δείχνει πρώτα ποιους επηρεάζει και αποθηκεύει μετά την επιβεβαίωση", async ({
  page,
}) => {
  const holder = unique("Κάτοχος");
  const userId = await teamUser({
    name: holder,
    email: uniqueEmail("holder"),
    role: "Πωλήσεις",
  });
  const roleId = await roleHeldBy(unique("Ρόλος δύο βημάτων"), userId);

  await signIn(page, "owner@example.com");
  await page.goto(`/app/team/roles/${roleId}`);
  await page
    .getByRole("radiogroup", { name: "Βλέπει Γυρίσματα" })
    .getByLabel("Όλα")
    .check();
  await page.getByRole("button", { name: "Αποθήκευση", exact: true }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "Επιβεβαίωση αποθήκευσης",
  });
  await expect(confirm).toContainText(`Επηρεάζει: ${holder}.`);
  expect(await grantCount(roleId)).toBe(0);

  await confirm
    .getByRole("button", { name: "Επιβεβαίωση αποθήκευσης" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Αποθηκεύτηκε (1 αλλαγή)",
  );
  expect(await grantCount(roleId)).toBe(1);
});

test("ο πελάτης προσκαλεί, επαναστέλνει, ακυρώνει και αφαιρεί Συναδέλφους, αλλά όχι τον εαυτό του", async ({
  page,
}) => {
  const self = unique("Σοφία Συναδέλφων");
  const colleague = unique("Πέτρος Συνάδελφος");
  const email = uniqueEmail("colleagues");
  await clientWithUsers({
    clientName: unique("Πελάτης Συναδέλφων"),
    email,
    name: self,
    colleague: { email: uniqueEmail("colleague"), name: colleague },
  });

  await signIn(page, email);
  await page.goto("/app/colleagues");
  await expect(listItem(page, self)).toBeVisible();
  await expect(
    listItem(page, self).getByRole("button", { name: "Αφαίρεση" }),
  ).toHaveCount(0);

  const resendEmail = uniqueEmail("resend");
  const cancelEmail = uniqueEmail("cancel");
  for (const [who, address] of [
    ["Νέα Συνάδελφος", resendEmail],
    ["Ακυρωμένη Συνάδελφος", cancelEmail],
  ]) {
    await field(page, "Ονοματεπώνυμο").fill(who);
    await field(page, "Email").fill(address);
    await page.getByRole("button", { name: "Πρόσκληση Χρήστη πελάτη" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Η πρόσκληση στάλθηκε",
    );
    await expect(listItem(page, address)).toContainText("Εκκρεμεί");
  }

  await listItem(page, resendEmail)
    .getByRole("button", { name: "Επαναποστολή" })
    .click();
  await expect(listItem(page, resendEmail).getByRole("status")).toContainText(
    "Η πρόσκληση στάλθηκε ξανά",
  );

  await listItem(page, cancelEmail)
    .getByRole("button", { name: "Ακύρωση", exact: true })
    .click();
  await expect(listItem(page, cancelEmail)).toHaveCount(0);

  const member = listItem(page, colleague);
  await member.getByRole("button", { name: "Αφαίρεση" }).click();
  await member.getByRole("button", { name: "Ναι, αφαίρεση" }).click();
  await expect(listItem(page, colleague)).toHaveCount(0);
  await expect(listItem(page, self)).toBeVisible();
});
