import { redirect } from "next/navigation";

import { AuthPage, SpacesSetPasswordForm, getViewer } from "@/modules/access";

export const metadata = { title: "Νέος κωδικός" };

// R10 Νέος κωδικός: φτάνεις εδώ από πρόσκληση ή επαναφορά, ήδη συνδεδεμένος από τον σύνδεσμο.
export default async function SetPasswordPage() {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in") redirect("/login?error=link");
  return (
    <AuthPage title="Νέος κωδικός">
      <p className="r-muted">Για τον λογαριασμό {viewer.email}.</p>
      <SpacesSetPasswordForm />
    </AuthPage>
  );
}
