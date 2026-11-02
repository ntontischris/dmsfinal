import Link from "next/link";

import { AuthPage, SpacesResetForm } from "@/modules/access";

export const metadata = { title: "Επαναφορά κωδικού" };

// R10 Επαναφορά κωδικού.
export default function ResetPage() {
  return (
    <AuthPage title="Επαναφορά κωδικού">
      <p className="r-muted">
        Γράψτε το email σας και θα σας στείλουμε σύνδεσμο επαναφοράς.
      </p>
      <SpacesResetForm />
      <Link href="/login">← Πίσω στην Είσοδο</Link>
    </AuthPage>
  );
}
