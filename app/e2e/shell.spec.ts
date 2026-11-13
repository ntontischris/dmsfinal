import { expect, test } from "@playwright/test";

import { project, signIn } from "./sales-parts";
import { serviceClient, teamUser, unique, uniqueEmail } from "./team-parts";

// Το κέλυφος των Χώρων (L7): μενού προφίλ στο κινητό, τίτλος οθόνης ανά κοινό, Χώρος «Εταιρεία» μόνο όταν έχει κάτι,
// και τι βλέπει ένας λογαριασμός χωρίς ομάδα και χωρίς Πελάτη. Ό,τι φτιάχνει το τεστ έχει όνομα με project και ώρα.
const PASSWORD = "e2e-password-123";

test("στο κινητό η «Έξοδος» του μενού προφίλ πατιέται και μετά από κύλιση", async ({
  page,
}) => {
  test.skip(project() !== "mobile", "Το σφάλμα ήταν μόνο στο κινητό.");
  const email = uniqueEmail("exodos");
  await teamUser({ name: unique("Έξοδος"), email, role: "Πωλήσεις" });
  await signIn(page, email);

  // Η κεφαλίδα ενός πάνελ περνούσε πάνω από το ανοιχτό μενού όταν η σελίδα είχε κυλήσει.
  await page.mouse.wheel(0, 240);
  await page.getByRole("button", { name: /^Προφίλ: / }).click();
  // Το κλικ αποτυγχάνει αν άλλο στοιχείο «πιάνει» το σημείο της «Έξοδος».
  await page.getByRole("button", { name: "Έξοδος", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("ο Χρήστης πελάτη βλέπει τον τίτλο «Μηνύματα» στη Συνομιλία του", async ({
  page,
}) => {
  await signIn(page, `chat.${project()}@example.com`);
  await page.goto("/app/messages");
  await expect(
    page.getByRole("heading", { level: 1, name: /^Μηνύματα/ }),
  ).toBeVisible();
});

test("ο Χώρος «Εταιρεία» δεν φαίνεται σε όποιον δεν έχει τίποτα εκεί", async ({
  page,
}) => {
  const email = uniqueEmail("no-company");
  await teamUser({ name: unique("Χωρίς Εταιρεία"), email, role: "Παραγωγή" });
  await signIn(page, email);
  await expect(
    page.getByRole("navigation", { name: "Χώροι" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Εταιρεία", exact: true }),
  ).toHaveCount(0);
});

test("λογαριασμός χωρίς Πελάτη βλέπει μήνυμα για πελάτη, όχι για την ομάδα", async ({
  page,
}) => {
  const email = uniqueEmail("no-client");
  const { error } = await serviceClient().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`Λογαριασμός: ${error.message}`);
  await signIn(page, email);

  await expect(
    page.getByText(
      "Ο λογαριασμός σου δεν έχει ακόμα συνδεθεί με την επιχείρησή σου.",
      {
        exact: false,
      },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Ζήτησε πρόσκληση από τον Ιδιοκτήτη"),
  ).toHaveCount(0);

  await page.goto("/app/messages");
  await expect(page.getByText("Δεν υπάρχει ακόμα Συνομιλία")).toBeVisible();
});
