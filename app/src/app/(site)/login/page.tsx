import { redirect } from "next/navigation";

import { Notice } from "@/components/ui/notice";
import { AuthCard, DemoLogins, LoginForm, demoLabels, getViewer, safeNext } from "@/modules/access";

export const metadata = { title: "Είσοδος" };

const LINK_ERRORS: Record<string, string> = {
  link: "Ο σύνδεσμος έληξε ή χρησιμοποιήθηκε ήδη. Ζήτησε νέο.",
  google: "Η σύνδεση με Google δεν ολοκληρώθηκε. Δοκίμασε ξανά.",
  demo: "Η είσοδος επίδειξης δεν είναι διαθέσιμη τώρα.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

// R9 Είσοδος. Όποιος έχει ήδη συνδεθεί πάει κατευθείαν στο σύστημα.
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const viewer = await getViewer();
  if (viewer.status === "signed-in") redirect(safeNext(next));
  const demos = demoLabels();

  return (
    <AuthCard title="Είσοδος">
      {viewer.status === "unconfigured" ? (
        <Notice kind="error" title="Η βάση δεν έχει συνδεθεί ακόμα">
          <p className="m-0">Η είσοδος θα ανοίξει μόλις συνδεθεί η βάση.</p>
        </Notice>
      ) : (
        <>
          {error && LINK_ERRORS[error] && (
            <p role="alert" className="m-0 text-sm text-destructive">
              {LINK_ERRORS[error]}
            </p>
          )}
          {demos.length > 0 && <DemoLogins labels={demos} />}
          <LoginForm next={safeNext(next)} />
        </>
      )}
    </AuthCard>
  );
}
