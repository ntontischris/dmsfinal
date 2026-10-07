import Link from "next/link";

import { AuthCard, ResetForm } from "@/modules/access";

export const metadata = { title: "Επαναφορά κωδικού" };

// R10 Επαναφορά κωδικού.
export default function ResetPage() {
  return (
    <AuthCard title="Επαναφορά κωδικού">
      <p className="m-0 text-sm text-muted-foreground">Γράψε το email σου και θα σου στείλουμε σύνδεσμο για νέο κωδικό.</p>
      <ResetForm />
      <Link href="/login" className="text-sm text-muted-foreground">
        ← Πίσω στην είσοδο
      </Link>
    </AuthCard>
  );
}
