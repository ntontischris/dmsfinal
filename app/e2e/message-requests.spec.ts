import { expect, test } from "@playwright/test";

import { switchUser } from "./booking-parts";
import { project, signIn } from "./sales-parts";

// Τα Αιτήματα (Jδ, #163) από άκρη σε άκρη. Ο Πελάτης «Πελάτης Αιτημάτων {project}» και ο Χρήστης πελάτη
// «requests.{project}@example.com» (Πλήρης, Υπεύθυνος του Πελάτη η Άννα) έρχονται από το seed. Σειριακά, χωρίς retries.
test.describe.configure({ mode: "serial", retries: 0 });

const MESSAGES_PATH = "/app/messages";
const COMPOSER = "Νέο Μήνυμα";

test("ο πελάτης στέλνει Αίτημα «άλλο», η ομάδα το απορρίπτει με απάντηση και ο πελάτης τη βλέπει", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const P = project();
  const text = `Θέλουμε ένα βίντεο για το event ${P}`;
  const reply = `Δεν προλαβαίνουμε φέτος ${P}`;

  // 1. Ο πελάτης γράφει Μήνυμα και τσεκάρει «Ζητώ κάτι να γίνει (Αίτημα)» με είδος «άλλο».
  await signIn(page, `requests.${P}@example.com`);
  await page.goto(MESSAGES_PATH);
  const composer = page.getByRole("region", { name: COMPOSER });
  await composer.getByLabel("Μήνυμα προς την ομάδα").fill(text);
  await page.waitForLoadState("networkidle");
  await composer.getByLabel("Ζητώ κάτι να γίνει (Αίτημα)").check();
  await expect(composer.getByLabel("Είδος Αιτήματος")).toHaveValue("other");
  await composer.getByRole("button", { name: "Αποστολή" }).click();
  await expect(composer.getByRole("status")).toContainText(
    "Το Αίτημα στάλθηκε.",
  );

  // 2. Το Μήνυμα έγινε Αίτημα: ανοιχτό, χωρίς υπεύθυνο προς τον πελάτη και χωρίς διαγραφή.
  const sent = page.locator("article", { hasText: text });
  const box = sent.getByRole("region", { name: "Αίτημα: Άλλο" });
  await expect(box).toContainText("ανοιχτό");
  await expect(box).not.toContainText("Ανατέθηκε");
  await expect(sent.getByRole("button", { name: "Διαγραφή" })).toHaveCount(0);
  await expect(sent).toContainText("δεν διαγράφεται");

  // 3. Η καρτέλα «Αιτήματα (1 ανοιχτά)» το έχει πρώτο.
  await page.goto(`${MESSAGES_PATH}?tab=requests`);
  await expect(
    page.getByRole("link", { name: "Αιτήματα (1 ανοιχτά)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: text }),
  ).toContainText("ανοιχτό");

  // 4. Ο Ιδιοκτήτης το βρίσκει στα «όλα τα ανοιχτά» (υπεύθυνη είναι η Άννα), το ανοίγει και το απορρίπτει με απάντηση.
  await switchUser(page, "owner@example.com");
  await page.goto(`${MESSAGES_PATH}?tab=requests&view=open`);
  const row = page.getByRole("listitem").filter({ hasText: text });
  await expect(row).toContainText("Υπεύθυνος: Άννα");
  await row.getByRole("link", { name: "Άνοιγμα" }).click();
  await expect(page).toHaveURL(/\/app\/messages\/[0-9a-f-]{36}#m-/);
  const request = page
    .locator("article", { hasText: text })
    .getByRole("region", { name: "Αίτημα: Άλλο" });
  await request.getByRole("button", { name: "Απόρριψη", exact: true }).click();
  await request
    .getByLabel("Απάντηση προς τον πελάτη (υποχρεωτική)")
    .fill(reply);
  await request.getByRole("button", { name: "Απόρριψη Αιτήματος" }).click();
  await expect(request).toContainText("απορρίφθηκε");
  await expect(request).toContainText(reply);

  // 5. Ο πελάτης βλέπει «Απάντηση της ομάδας: …» στην καρτέλα Αιτήματα, χωρίς υπεύθυνο.
  await switchUser(page, `requests.${P}@example.com`);
  await page.goto(`${MESSAGES_PATH}?tab=requests`);
  const item = page.getByRole("listitem").filter({ hasText: text });
  await expect(item).toContainText("απορρίφθηκε");
  await expect(item).toContainText(`Απάντηση της ομάδας: ${reply}`);
  await expect(item).not.toContainText("Υπεύθυνος");
  await expect(
    page.getByRole("link", { name: "Αιτήματα (0 ανοιχτά)" }),
  ).toBeVisible();
});
