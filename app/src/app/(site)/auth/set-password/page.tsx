import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthPage, SpacesSetPasswordForm, getPasswordContext, getViewer } from "@/modules/access";

export const metadata = { title: "Νέος κωδικός" };

// R10 Νέος κωδικός: φτάνεις εδώ από πρόσκληση ή επαναφορά (ήδη συνδεδεμένος από τον σύνδεσμο), ή από το Προφίλ
// («Αλλαγή κωδικού»), όπου ζητείται και ο τωρινός κωδικός.
export default async function SetPasswordPage() {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in") redirect("/login?error=link");
  const context = await getPasswordContext();
  return (
    <AuthPage title={context === "profile" ? "Αλλαγή κωδικού" : "Νέος κωδικός"}>
      <p className="r-muted">Για τον λογαριασμό {viewer.email}.</p>
      <SpacesSetPasswordForm context={context} email={viewer.email} />
      {context === "profile" && (
        <p className="r-muted">
          <Link href="/app/settings/profile">Πίσω στο Προφίλ</Link>
        </p>
      )}
    </AuthPage>
  );
}
