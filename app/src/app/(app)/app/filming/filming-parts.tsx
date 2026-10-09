import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, type Viewer } from "@/modules/access";

// Κοινά κομμάτια των οθονών των Γυρισμάτων: άρνηση πρόσβασης, σφάλμα φόρτωσης, άγνωστο Γύρισμα.

export function NoAccess({
  viewer,
  eyebrow,
  message,
}: {
  viewer: Viewer;
  eyebrow: string;
  message: string;
}) {
  return (
    <>
      <ScreenHeader eyebrow={eyebrow} title="Γυρίσματα" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">{message}</p>
      </AccessNotice>
    </>
  );
}

export function LoadError({
  title = "Δεν φόρτωσαν τα Γυρίσματα",
}: {
  title?: string;
}) {
  return (
    <Notice kind="error" title={title}>
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow="E3 · Γύρισμα" title="Γυρίσματα">
        <Link
          href="/app/filming"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Γυρίσματα
        </Link>
      </ScreenHeader>
      <Notice kind="empty" title="Αυτό το Γύρισμα δεν υπάρχει">
        <p className="m-0">
          Μπορεί να μην είναι πια στη λίστα σου ή ο σύνδεσμος να είναι λάθος.
        </p>
      </Notice>
    </>
  );
}
