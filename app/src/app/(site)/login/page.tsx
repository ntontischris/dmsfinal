import { redirect } from "next/navigation";

import {
  AuthPage,
  SpacesDeadLink,
  SpacesDemoLogins,
  SpacesLoginForm,
  demoLabels,
  getViewer,
  safeNext,
} from "@/modules/access";

export const metadata = { title: "Είσοδος" };

const LINK_ERRORS: Record<string, string> = {
  demo: "Η είσοδος επίδειξης δεν είναι διαθέσιμη τώρα.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

// R9 Είσοδος. Όποιος έχει ήδη συνδεθεί πάει κατευθείαν στο σύστημα. Ένας ληγμένος σύνδεσμος από email
// (?error=link) δείχνει την R13 «Ο σύνδεσμος δεν ισχύει πια».
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const viewer = await getViewer();
  if (viewer.status === "signed-in") redirect(safeNext(next));
  if (error === "link")
    return (
      <AuthPage title="Ο σύνδεσμος δεν ισχύει πια">
        <SpacesDeadLink />
      </AuthPage>
    );
  const demos = demoLabels();
  const linkError = error ? LINK_ERRORS[error] : undefined;

  return (
    <AuthPage title="Είσοδος">
      {viewer.status === "unconfigured" ? (
        <p className="r-msg" data-kind="error" role="alert">
          Η βάση δεν έχει συνδεθεί ακόμα. Η είσοδος θα ανοίξει μόλις συνδεθεί η
          βάση.
        </p>
      ) : (
        <>
          {linkError && (
            <p className="r-msg" data-kind="error" role="alert">
              {linkError}
            </p>
          )}
          {demos.length > 0 && <SpacesDemoLogins labels={demos} />}
          <SpacesLoginForm next={safeNext(next)} />
        </>
      )}
    </AuthPage>
  );
}
