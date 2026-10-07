import type { ReactNode } from "react";

import { Notice } from "@/components/ui/notice";

import type { Viewer } from "../viewer";

// Τι βλέπει κάποιος που δεν μπορεί να ανοίξει μια οθόνη: γιατί, και πού να πάει.
export function AccessNotice({ viewer, children }: { viewer: Viewer; children?: ReactNode }) {
  if (viewer.status === "unconfigured")
    return (
      <Notice kind="error" title="Η βάση δεν έχει συνδεθεί ακόμα">
        <p className="m-0">Η οθόνη θα δείξει δεδομένα μόλις συνδεθεί η βάση.</p>
      </Notice>
    );
  return (
    <Notice kind="empty" title="Χωρίς δικαίωμα">
      {children}
    </Notice>
  );
}
