import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, type Viewer } from "@/modules/access";

import { COST_TITLE } from "../labels";

// Οι άδειες και οι σφαλμάτων καταστάσεις των οθονών κόστους: άρνηση, σφάλμα φόρτωσης, άγνωστη Παραγωγή.

export function CostNoAccess({ viewer, eyebrow }: { viewer: Viewer; eyebrow: string }) {
  return (
    <>
      <ScreenHeader eyebrow={eyebrow} title={COST_TITLE} />
      <AccessNotice viewer={viewer}>
        <p className="m-0">Το κόστος το βλέπουν μόνο όσοι «Βλέπουν κόστος και κερδοφορία».</p>
      </AccessNotice>
    </>
  );
}

export function CostLoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσε το κόστος">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function CostMissing({ eyebrow }: { eyebrow: string }) {
  return (
    <>
      <ScreenHeader eyebrow={eyebrow} title={COST_TITLE}>
        <Link href="/app/productions/costs" className={buttonVariants({ variant: "ghost" })}>
          ← Κόστος και ώρες
        </Link>
      </ScreenHeader>
      <Notice kind="empty" title="Αυτή η Παραγωγή δεν υπάρχει">
        <p className="m-0">Μπορεί να μην είναι πια στη λίστα σου ή ο σύνδεσμος να είναι λάθος.</p>
      </Notice>
    </>
  );
}
