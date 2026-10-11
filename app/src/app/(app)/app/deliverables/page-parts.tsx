import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, type Viewer } from "@/modules/access";

// Κοινά κομμάτια των οθονών των Παραδοτέων (H1, H2): άρνηση πρόσβασης, σφάλμα φόρτωσης, άγνωστο Παραδοτέο.

export function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow="H1 · Παραδοτέα" title="Παραδοτέα" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">Την ουρά Παραδοτέων τη βλέπει όποιος «Δουλεύει Παραδοτέα» ή «Ελέγχει Παραδοτέα».</p>
      </AccessNotice>
    </>
  );
}

export function LoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσαν τα Παραδοτέα">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow="H2 · Παραδοτέο" title="Παραδοτέα">
        <Link href="/app/deliverables" className={buttonVariants({ variant: "ghost" })}>
          ← Παραδοτέα
        </Link>
      </ScreenHeader>
      <Notice kind="empty" title="Αυτό το Παραδοτέο δεν υπάρχει">
        <p className="m-0">Μπορεί να έχει ακυρωθεί ή ο σύνδεσμος να είναι λάθος.</p>
      </Notice>
    </>
  );
}
