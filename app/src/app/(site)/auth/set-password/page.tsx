import { redirect } from "next/navigation";

import { AuthCard, SetPasswordForm, getViewer } from "@/modules/access";

export const metadata = { title: "Νέος κωδικός" };

// R10 Νέος κωδικός: φτάνεις εδώ από πρόσκληση ή επαναφορά, ήδη συνδεδεμένος από τον σύνδεσμο.
export default async function SetPasswordPage() {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in") redirect("/login?error=link");
  return (
    <AuthCard title="Όρισε κωδικό">
      <p className="m-0 text-sm text-muted-foreground">Για τον λογαριασμό {viewer.email}.</p>
      <SetPasswordForm />
    </AuthCard>
  );
}
