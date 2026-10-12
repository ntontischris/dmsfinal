import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { project } from "./sales-parts";

// Σύνδεσμος διακοπής (#171, Α10) από άκρη σε άκρη. Ο Πελάτης «Πελάτης Ειδοποιήσεων {project}» και ο Χρήστης πελάτη
// «notify.{project}@example.com» (Πλήρης) έρχονται από το seed. Ένα μη απαραίτητο Γεγονός (μετακίνηση στο Google) μπαίνει
// στην ουρά με service role και τρέχει ο επεξεργαστής, όπως κάνει το cron κάθε λεπτού. Μετά ο πελάτης ανοίγει το /u/<token>
// χωρίς είσοδο και επιβεβαιώνει. Σειριακά, χωρίς retries· τα δύο projects μοιράζονται μία βάση.
test.describe.configure({ mode: "serial", retries: 0 });

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, { auth: { persistSession: false } });
}

async function clientOf(admin: SupabaseClient, P: string) {
  const { data: client, error } = await admin
    .from("clients")
    .select("id")
    .eq("name", `Πελάτης Ειδοποιήσεων ${P}`)
    .single();
  if (error) throw error;
  const { data: member, error: memberError } = await admin
    .from("client_users")
    .select("user_id")
    .eq("client_id", client.id)
    .single();
  if (memberError) throw memberError;
  return { clientId: String(client.id), userId: String(member.user_id) };
}

// Ένα Γεγονός «Γύρισμα μετακινήθηκε στο Google» για τον Πελάτη και ο επεξεργαστής: φτιάχνει το email με token διακοπής.
async function emailWithToken(
  admin: SupabaseClient,
  P: string,
  clientId: string,
): Promise<string> {
  const { error } = await admin.from("events").insert({
    type: "filming.google_moved",
    entity: "filmings",
    case_key: `filming.google_moved:e2e-unsubscribe:${P}:${Date.now()}`,
    client_id: clientId,
    payload: {},
  });
  if (error) throw error;
  const { error: processError } = await admin.rpc("events_process");
  if (processError) throw processError;
  const { data, error: readError } = await admin
    .from("email_outbox")
    .select("payload")
    .eq("kind", "automation")
    .eq("to_email", `notify.${P}@example.com`)
    .order("created_at", { ascending: false })
    .limit(20);
  if (readError) throw readError;
  const token = (data ?? [])
    .map((row) => row.payload?.unsubscribeToken)
    .find((value): value is string => typeof value === "string");
  if (!token) throw new Error("Δεν βρέθηκε email με σύνδεσμο διακοπής");
  return token;
}

test("ο πελάτης ανοίγει τον σύνδεσμο διακοπής χωρίς είσοδο, επιβεβαιώνει και βλέπει ότι έγινε", async ({
  page,
}) => {
  const P = project();
  const admin = adminClient();
  const { clientId, userId } = await clientOf(admin, P);
  const token = await emailWithToken(admin, P, clientId);

  await page.goto(`/u/${token}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Διακοπή email · Unsubscribe",
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/u/${token}$`));
  await page.getByRole("button", { name: "Διακοπή · Unsubscribe" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Έγινε. Δεν θα ξαναλάβετε αυτό το είδος email.",
  );
  await expect(
    page.getByRole("button", { name: "Διακοπή · Unsubscribe" }),
  ).toHaveCount(0);

  const { count, error } = await admin
    .from("automation_optouts")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  expect(count).toBeGreaterThan(0);
});

test("άκυρος σύνδεσμος διακοπής: ίδια σελίδα και ίδια απάντηση", async ({
  page,
}) => {
  await page.goto(`/u/${"0".repeat(64)}`);
  await page.getByRole("button", { name: "Διακοπή · Unsubscribe" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Έγινε. Δεν θα ξαναλάβετε αυτό το είδος email.",
  );
});
