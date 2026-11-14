import { expect, test } from "@playwright/test";

import { clientIdByName, project, shot, signIn } from "./sales-parts";

// Η δημόσια φόρμα ενδιαφέροντος (b4): ο επισκέπτης στέλνει χωρίς σύνδεση, ο Ιδιοκτήτης βρίσκει τον Πελάτη με την Ευκαιρία
// «Ενδιαφέρον από την Ιστοσελίδα». Φανταστικά στοιχεία, μοναδικά ανά τρέξιμο.
test.describe.configure({ retries: 0 });

const ENDPOINT = "/api/forms/interest";

test("φόρμα Ιστοσελίδας: σωστή υποβολή γίνεται Ευκαιρία, το honeypot και τα λάθη δεν γράφουν τίποτα", async ({
  page,
  request,
}) => {
  const run = `${project()}-${Date.now()}`;
  const name = `Ιστοσελίδα Α.Ε. ${run}`;
  // Δική του διεύθυνση ανά τρέξιμο, για να μη μοιράζεται το όριο ρυθμού με άλλα τεστ.
  const headers = { "x-forwarded-for": `198.51.100.${Date.now() % 250}` };

  const ok = await request.post(ENDPOINT, {
    headers,
    form: {
      name,
      contact_name: "Ελπίδα Φόρμα",
      contact_email: `web.${run}@istoselida.example.gr`,
      message: "Θέλουμε βίντεο για το νέο κατάστημα",
      website: "",
    },
  });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ ok: true, status: "ok" });

  const trap = await request.post(ENDPOINT, {
    headers,
    data: {
      name: `Bot ${run}`,
      contact_name: "Bot",
      contact_email: `bot.${run}@example.com`,
      website: "http://spam.example.com",
    },
  });
  expect(trap.status()).toBe(200);

  const invalid = await request.post(ENDPOINT, {
    headers,
    data: { contact_name: "Λάθος", contact_email: "όχι-email" },
  });
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toMatchObject({ field: "contact_email" });

  await expect(clientIdByName(`Bot ${run}`)).rejects.toBeTruthy();

  await signIn(page, "owner@example.com");
  await page.goto(`/app/clients/${await clientIdByName(name)}`);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(
    page.getByText("Ενδιαφέρον από την Ιστοσελίδα").first(),
  ).toBeVisible();
  await shot(page, "sales-web-form-client");
});
