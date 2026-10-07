// Φτιάχνει τους φανταστικούς Χρήστες των τεστ σε τοπικό Supabase. Τρέχει μόνο στο CI, ποτέ σε πραγματική βάση.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || !/127\.0\.0\.1|localhost/.test(url)) {
  console.error("seed: μόνο σε τοπικό Supabase (NEXT_PUBLIC_SUPABASE_URL στο 127.0.0.1)");
  process.exit(1);
}

export const PASSWORD = "e2e-password-123";
const USERS = [
  { email: "owner@example.com", name: "Γιώργος Ιδιοκτήτης", role: "Ιδιοκτήτης" },
  { email: "admin@example.com", name: "Δημήτρης Διαχείριση", role: "Διαχείριση" },
  { email: "sales@example.com", name: "Άννα Πωλήσεις", role: "Πωλήσεις" },
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: roles, error: rolesError } = await admin.from("roles").select("id, name").eq("kind", "team");
if (rolesError) throw rolesError;

for (const user of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const { error: memberError } = await admin.from("team_users").insert({ user_id: data.user.id, name: user.name, email: user.email });
  if (memberError) throw memberError;
  const roleId = roles.find((role) => role.name === user.role)?.id;
  const { error: roleError } = await admin.from("team_user_roles").insert({ user_id: data.user.id, role_id: roleId });
  if (roleError) throw roleError;
  console.log(`seed: ${user.email} → ${user.role}`);
}
