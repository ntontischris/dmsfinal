import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, type Viewer } from "@/modules/access";

// Κοινά κομμάτια των οθονών των Παραγωγών (G1, G2): άρνηση πρόσβασης, σφάλμα φόρτωσης, άγνωστη Παραγωγή.

export function NoAccess({ viewer, eyebrow }: { viewer: Viewer; eyebrow: string }) {
  return (
    <>
      <ScreenHeader eyebrow={eyebrow} title="Παραγωγές" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">Τις Παραγωγές τις βλέπει όποιος «Βλέπει Παραγωγές».</p>
      </AccessNotice>
    </>
  );
}

export function LoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσαν οι Παραγωγές">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow="G2 · Παραγωγή" title="Παραγωγές">
        <Link href="/app/productions" className={buttonVariants({ variant: "ghost" })}>
          ← Παραγωγές
        </Link>
      </ScreenHeader>
      <Notice kind="empty" title="Αυτή η Παραγωγή δεν υπάρχει">
        <p className="m-0">Μπορεί να μην είναι πια στη λίστα σου ή ο σύνδεσμος να είναι λάθος.</p>
      </Notice>
    </>
  );
}
