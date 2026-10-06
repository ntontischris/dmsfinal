import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { TeamUser } from "@/data/team";
import { deactivationBlock, roleNames } from "@/data/team-access";
import {
  AssignmentList,
  BLOCK_TEXT,
  DeactivateConfirm,
} from "@/screens/n1-deactivate";
import { AnonymizeConfirm, GdprUserSection } from "@/screens/n1-gdpr";
import { RolePicker } from "@/screens/n1-roles";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

interface DetailProps {
  role: RoleId;
  actor: TeamUser;
  target: TeamUser;
  confirm: string | undefined;
}

function Summary({ target, isSelf }: { target: TeamUser; isSelf: boolean }) {
  return (
    <section className="card n1-section">
      <div className="card-title">
        <h2>
          {target.name}
          {isSelf && " (εσύ)"}
        </h2>
        <Badge tone={target.status === "ενεργός" ? undefined : "attention"}>
          {target.status}
        </Badge>
      </div>
      <dl className="dl">
        <dt>Email</dt>
        <dd>{target.email}</dd>
        <dt>Ρόλοι</dt>
        <dd>{roleNames(target.roleIds)}</dd>
        <dt>Μέλος από</dt>
        <dd>{fmtDate(target.since)}</dd>
        <dt>Τελευταία είσοδος</dt>
        <dd>{target.lastSeen ? fmtDate(target.lastSeen) : "ποτέ"}</dd>
        {target.deactivatedAt && (
          <>
            <dt>Απενεργοποιήθηκε</dt>
            <dd>{fmtDate(target.deactivatedAt)}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

function ChangeRoles({ role, actor, target }: Omit<DetailProps, "confirm">) {
  return (
    <section className="card n1-section">
      <h2 className="card-title">Αλλαγή Ρόλων</h2>
      <form className="n1-form">
        <RolePicker
          actor={actor}
          idPrefix="n1-edit"
          selected={target.roleIds}
          target={target}
        />
        <div className="btn-row">
          <button type="button" className="button" data-primary>
            Αποθήκευση Ρόλων
          </button>
        </div>
      </form>
      <p className="note">
        Ισχύει στην επόμενη ενέργειά του και γράφεται στο Ίχνος.{" "}
        {role === "owner"
          ? "Τι κάνει κάθε Ρόλος αλλάζει στη "
          : "Ο Ιδιοκτήτης ειδοποιείται για την αλλαγή (Γεγονός 58). Τους ίδιους τους Ρόλους τους αλλάζει μόνο ο Ιδιοκτήτης."}
        {role === "owner" && (
          <Link href={screenHref(role, "N4", {})}>
            Ρόλοι και Δικαιώματα (N4)
          </Link>
        )}
      </p>
    </section>
  );
}

function Deactivation({ role, actor, target }: Omit<DetailProps, "confirm">) {
  if (target.status !== "ενεργός") {
    return (
      <section className="card n1-section">
        <h2 className="card-title">Επανενεργοποίηση</h2>
        <p className="muted">
          Κρατά τους Ρόλους του ({roleNames(target.roleIds)}). Οι αναθέσεις που
          είχε δεν επιστρέφουν.
        </p>
        <button type="button" className="button" data-primary>
          Επανενεργοποίηση
        </button>
      </section>
    );
  }
  const block = deactivationBlock(actor, target);
  return (
    <section className="card n1-section">
      <h2 className="card-title">Ανοιχτές αναθέσεις</h2>
      <AssignmentList id={target.id} />
      <div className="btn-row n1-section">
        {block ? (
          <button type="button" className="button" data-danger disabled>
            Απενεργοποίηση
          </button>
        ) : (
          <Link
            className="button"
            data-danger
            href={screenHref(role, "N1", {
              user: target.id,
              confirm: "deactivate",
            })}
          >
            Απενεργοποίηση
          </Link>
        )}
      </div>
      {block && <p className="n1-help">{BLOCK_TEXT[block]}</p>}
    </section>
  );
}

export function UserDetail({ role, actor, target, confirm }: DetailProps) {
  const isOwnerActor = role === "owner";
  return (
    <>
      <p>
        <Link href={screenHref(role, "N1", {})}>← Όλοι οι Χρήστες ομάδας</Link>
      </p>
      <Summary target={target} isSelf={actor.id === target.id} />
      {confirm === "deactivate" && (
        <DeactivateConfirm role={role} actor={actor} target={target} />
      )}
      {confirm === "anonymize" && isOwnerActor && (
        <AnonymizeConfirm role={role} target={target} />
      )}
      {!confirm && (
        <>
          <ChangeRoles role={role} actor={actor} target={target} />
          <Deactivation role={role} actor={actor} target={target} />
          {isOwnerActor && <GdprUserSection role={role} target={target} />}
        </>
      )}
    </>
  );
}
