import Link from "next/link";
import type { ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import {
  assignmentGroups,
  BLOCK_TEXT,
  type DeactivationPreview,
} from "../deactivation";
import type { N1User, PickerRole } from "./n1-adapter";
import {
  ChangeRolesForm,
  DeactivateButtons,
  ReactivateButton,
} from "./n1-user-forms";

// Η σελίδα ενός Χρήστη ομάδας (prototype `screens/n1-detail.tsx` + `n1-deactivate.tsx`), με τις πραγματικές ενέργειες.

function Summary({ target, reach }: { target: N1User; reach: string }) {
  return (
    <Panel
      label={`${target.name}${target.isSelf ? " (εσύ)" : ""}`}
      aside={
        <Badge tone={target.isActive ? undefined : "attention"}>
          {target.isActive ? "ενεργός" : "απενεργοποιημένος"}
        </Badge>
      }
    >
      <p className="n1-who">
        <Avatar name={target.name} size={44} />
        <span className="n1-who-text">
          <strong>{target.name}</strong>
          <span className="part-sub">{target.roles}</span>
        </span>
      </p>
      <dl className="dl">
        <dt>Email</dt>
        <dd>{target.email}</dd>
        <dt>Ρόλοι</dt>
        <dd>{target.roles}</dd>
        <dt>Τι βλέπει</dt>
        <dd>{reach}</dd>
        {target.since && (
          <>
            <dt>Μέλος από</dt>
            <dd>{fmtDate(target.since)}</dd>
          </>
        )}
        {target.lastSeen !== undefined && (
          <>
            <dt>Τελευταία είσοδος</dt>
            <dd>{target.lastSeen ? fmtDate(target.lastSeen) : "ποτέ"}</dd>
          </>
        )}
        {target.deactivatedAt && (
          <>
            <dt>Απενεργοποιήθηκε</dt>
            <dd>{fmtDate(target.deactivatedAt)}</dd>
          </>
        )}
      </dl>
    </Panel>
  );
}

// Τι επιστρέφει για νέα ανάθεση, ονομαστικά, όπως το λέει η βάση (team_deactivation_preview).
function AssignmentList({ preview }: { preview: DeactivationPreview }) {
  const groups = assignmentGroups(preview.items);
  if (groups.length === 0)
    return <p className="muted">Καμία ανοιχτή ανάθεση.</p>;
  return (
    <div className="n1-bleed">
      <RowList>
        {groups.map((group) => (
          <ListRow
            key={group.kind}
            title={group.title}
            sub={group.names.join(" · ")}
          />
        ))}
      </RowList>
    </div>
  );
}

function PreviewMissing() {
  return (
    <p className="n1-help">
      Δεν φόρτωσε τι θα επιστρέψει η απενεργοποίηση. Δοκίμασε ξανά.
    </p>
  );
}

interface DeactivationProps {
  target: N1User;
  preview: DeactivationPreview | null;
  confirmHref: string;
}

function Deactivation({ target, preview, confirmHref }: DeactivationProps) {
  if (!target.isActive)
    return (
      <Panel label="Επανενεργοποίηση">
        <p className="muted">
          Κρατά τους Ρόλους του ({target.roles}). Οι αναθέσεις που είχε δεν
          επιστρέφουν.
        </p>
        <ReactivateButton userId={target.id} />
      </Panel>
    );
  if (!preview)
    return (
      <Panel label="Ανοιχτές αναθέσεις">
        <PreviewMissing />
      </Panel>
    );
  return (
    <Panel label="Ανοιχτές αναθέσεις">
      <AssignmentList preview={preview} />
      <div className="btn-row n1-section">
        {preview.block ? (
          <button type="button" className="button" data-danger disabled>
            Απενεργοποίηση
          </button>
        ) : (
          <Link className="button" data-danger href={confirmHref}>
            Απενεργοποίηση
          </Link>
        )}
      </div>
      {preview.block && <p className="n1-help">{BLOCK_TEXT[preview.block]}</p>}
    </Panel>
  );
}

function DeactivateConfirm({
  target,
  preview,
  backHref,
}: {
  target: N1User;
  preview: DeactivationPreview | null;
  backHref: string;
}) {
  if (!preview || preview.block || !target.isActive)
    return (
      <div className="n1-danger" role="alert">
        <Panel label="Δεν γίνεται η Απενεργοποίηση">
          {preview?.block ? (
            <p>{BLOCK_TEXT[preview.block]}</p>
          ) : !target.isActive ? (
            <p>Ο Χρήστης είναι ήδη απενεργοποιημένος.</p>
          ) : (
            <PreviewMissing />
          )}
          <Link className="button" href={backHref}>
            Πίσω στον Χρήστη
          </Link>
        </Panel>
      </div>
    );
  return (
    <div className="n1-danger">
      <Panel label={`Απενεργοποίηση: ${target.name}`}>
        <p>Επιστρέφουν για νέα ανάθεση:</p>
        <AssignmentList preview={preview} />
        <p className="note">
          Οι συνεδρίες του κλείνουν αμέσως και ο Σύνδεσμος ημερολογίου παύει. Το
          όνομά του μένει στο ιστορικό. Με Επανενεργοποίηση κρατά τους Ρόλους
          του, αλλά οι αναθέσεις δεν επιστρέφουν.
        </p>
        <DeactivateButtons userId={target.id} backHref={backHref} />
      </Panel>
    </div>
  );
}

export type DetailConfirm = "deactivate" | "anonymize" | undefined;

interface UserDetailProps {
  target: N1User;
  reach: string;
  roles: readonly PickerRole[];
  selected: readonly string[];
  preview: DeactivationPreview | null;
  isOwner: boolean;
  confirm: DetailConfirm;
  // Τα τμήματα GDPR (μόνο Ιδιοκτήτης): η ενότητα και η επιβεβαίωση ανωνυμοποίησης, από το module gdpr.
  gdprSection: ReactNode;
  gdprConfirm: ReactNode;
}

export function UserDetail({
  target,
  reach,
  roles,
  selected,
  preview,
  isOwner,
  confirm,
  gdprSection,
  gdprConfirm,
}: UserDetailProps) {
  return (
    <>
      <p>
        <Link href={hrefOf("N1")}>← Όλοι οι Χρήστες ομάδας</Link>
      </p>
      <Summary target={target} reach={reach} />
      {confirm === "deactivate" && (
        <DeactivateConfirm
          target={target}
          preview={preview}
          backHref={target.href}
        />
      )}
      {confirm === "anonymize" && isOwner && gdprConfirm}
      {!confirm && (
        <>
          <Panel label="Αλλαγή Ρόλων">
            <ChangeRolesForm
              userId={target.id}
              roles={roles}
              selected={selected}
            />
            <p className="note">
              Ισχύει στην επόμενη ενέργειά του και γράφεται στο Ίχνος.{" "}
              {isOwner ? (
                <>
                  Τι κάνει κάθε Ρόλος αλλάζει στη{" "}
                  <Link href={hrefOf("N4")}>Ρόλοι και Δικαιώματα</Link>
                </>
              ) : (
                "Ο Ιδιοκτήτης ειδοποιείται για την αλλαγή. Τους ίδιους τους Ρόλους τους αλλάζει μόνο ο Ιδιοκτήτης."
              )}
            </p>
          </Panel>
          <Deactivation
            target={target}
            preview={preview}
            confirmHref={`${target.href}?confirm=deactivate`}
          />
          {isOwner && gdprSection}
        </>
      )}
    </>
  );
}
