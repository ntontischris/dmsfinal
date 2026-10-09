import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, type Viewer } from "@/modules/access";

// Κοινά κομμάτια των οθονών του Εξοπλισμού (F1, F2, F3): άρνηση πρόσβασης, σφάλμα φόρτωσης, άγνωστο αντικείμενο.

export function NoAccess({
  viewer,
  eyebrow,
}: {
  viewer: Viewer;
  eyebrow: string;
}) {
  return (
    <>
      <ScreenHeader eyebrow={eyebrow} title="Εξοπλισμός" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">
          Τον Εξοπλισμό τον βλέπει όποιος «Βλέπει Εξοπλισμό».
        </p>
      </AccessNotice>
    </>
  );
}

export function LoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσε ο Εξοπλισμός">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow="F2 · Αντικείμενο" title="Εξοπλισμός">
        <Link
          href="/app/equipment"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Εξοπλισμός
        </Link>
      </ScreenHeader>
      <Notice kind="empty" title="Αυτό το αντικείμενο δεν υπάρχει">
        <p className="m-0">
          Μπορεί να έχει διαγραφεί ή ο σύνδεσμος να είναι λάθος.
        </p>
      </Notice>
    </>
  );
}
