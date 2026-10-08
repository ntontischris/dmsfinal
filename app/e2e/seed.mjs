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
  { email: "nikos@example.com", name: "Νίκος Πωλήσεις", role: "Πωλήσεις" },
];

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: roles, error: rolesError } = await admin.from("roles").select("id, name").eq("kind", "team");
if (rolesError) throw rolesError;

const ids = {};
for (const user of USERS) {
  const { data, error } = await admin.auth.admin.createUser({ email: user.email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  ids[user.email] = data.user.id;
  const { error: memberError } = await admin.from("team_users").insert({ user_id: data.user.id, name: user.name, email: user.email });
  if (memberError) throw memberError;
  const roleId = roles.find((role) => role.name === user.role)?.id;
  const { error: roleError } = await admin.from("team_user_roles").insert({ user_id: data.user.id, role_id: roleId });
  if (roleError) throw roleError;
  console.log(`seed: ${user.email} → ${user.role}`);
}

// ───────────── Πωλήσεις: Πελάτες και Ευκαιρίες για το e2e/sales.spec.ts ─────────────
// Τα δύο projects του Playwright (desktop, mobile) μοιράζονται μία βάση, γι' αυτό κάθε όνομα και email έχει το όνομα του project.
// Σε αντίθεση με τους Χρήστες, οι Πελάτες μπαίνουν απευθείας με service role: δεν υπάρχει ακόμα άλλος τρόπος να γεννηθούν σε κατάσταση «κατειλημμένου».

const ANNA = ids["sales@example.com"];
const NIKOS = ids["nikos@example.com"];

async function codeId(table, code) {
  const { data, error } = await admin.from(table).select("id").eq("code", code).single();
  if (error) throw error;
  return data.id;
}

async function insertRow(table, values) {
  const { data, error } = await admin.from(table).insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

const stages = { new: await codeId("sales_stages", "new"), meeting: await codeId("sales_stages", "meeting") };
const phoneSource = await codeId("sales_sources", "phone");

// Πελάτης με τον Υπεύθυνό του και μία ανοιχτή Ευκαιρία. Η Πηγή «Τηλέφωνο» χρησιμοποιείται, άρα στις Ρυθμίσεις αποσύρεται, δεν σβήνεται.
async function seedClient({ name, email, contactName, phone = "", managerId, opportunity }) {
  const clientId = await insertRow("clients", {
    name,
    city: "Αθήνα",
    contact_name: contactName,
    contact_email: email,
    contact_phone: phone,
    manager_id: managerId,
  });
  await insertRow("opportunities", {
    client_id: clientId,
    manager_id: managerId,
    stage_id: stages[opportunity.stage],
    source_id: phoneSource,
    title: opportunity.title,
    next_step: opportunity.nextStep,
    next_step_due: opportunity.due,
  });
}

// Ευκαιρία από τη φόρμα της Ιστοσελίδας, με ουρά «Χωρίς υπεύθυνο» όσο τρέχει.
async function intake({ name, email, contactName, phone = "", title }) {
  const { error } = await admin.rpc("sales_intake_form", {
    p_client: { name, contact_name: contactName, contact_email: email, contact_phone: phone },
    p_title: title,
  });
  if (error) throw error;
}

async function setRouting(routing) {
  const { error } = await admin.from("sales_settings").update({ form_routing: routing, form_assignee_id: null }).eq("id", true);
  if (error) throw error;
}

for (const [P, n] of [["desktop", 1], ["mobile", 2]]) {
  await seedClient({
    name: `Κυψέλη Καφέ ${P}`,
    email: `kypseli.${P}@example.com`,
    contactName: "Μαρία Κυψελιώτου",
    managerId: ANNA,
    // Ξεχασμένη: η ημερομηνία του Επόμενου βήματος έχει περάσει.
    opportunity: { title: `Βίντεο εγκαινίων ${P}`, stage: "meeting", nextStep: "Ρώτα αν είδε την πρόταση", due: "2026-01-05" },
  });
  await seedClient({
    name: `Ταβέρνα Αρμύρα ${P}`,
    email: `armyra.${P}@example.com`,
    contactName: "Κώστας Αρμυράκης",
    managerId: NIKOS,
    opportunity: { title: `Νέο βίντεο εστιατορίου ${P}`, stage: "new", nextStep: "Κλείσε συνάντηση", due: "2099-01-01" },
  });
  // Στόχος του τεστ Αιτήματος πρόσβασης.
  await seedClient({
    name: `Γυμναστήριο Κίνηση ${P}`,
    email: `kinisi.${P}@example.com`,
    contactName: "Ελένη Κινητάκη",
    managerId: NIKOS,
    opportunity: { title: `Έξτρα reels ${P}`, stage: "new", nextStep: "Στείλε προσφορά", due: "2099-01-01" },
  });
  // Το τηλέφωνο το ξαναχρησιμοποιεί η φόρμα παρακάτω: έτσι γεννιέται το «Πιθανό διπλό».
  await seedClient({
    name: `Καφέ Αθηνά ${P}`,
    email: `athina.${P}@athina-cafe.example.gr`,
    contactName: "Αθηνά Παπαδοπούλου",
    phone: `231033300${n}`,
    managerId: NIKOS,
    opportunity: { title: `Social πακέτο Αθηνά ${P}`, stage: "new", nextStep: "Τηλεφώνημα γνωριμίας", due: "2099-01-01" },
  });

  await setRouting("queue");
  try {
    await intake({
      name: `Καφέ Αθήναιον ${P}`,
      email: `giannis.${P}@athinaion.example.gr`,
      contactName: "Γιάννης Αθηναίου",
      phone: `231033300${n}`,
      title: `Πακέτο social ${P}`,
    });
    await intake({
      name: `Φούρνος Σπόρος ${P}`,
      email: `niki.${P}@sporos.example.gr`,
      contactName: "Νίκη Σπόρου",
      title: `Βίντεο γνωριμίας ${P}`,
    });
  } finally {
    await setRouting("owner");
  }
  console.log(`seed: Πωλήσεις (${P})`);
}
