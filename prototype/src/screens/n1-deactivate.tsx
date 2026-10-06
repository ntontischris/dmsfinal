import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { OpenAssignments, TeamUser } from "@/data/team";
import {
  assignmentsOf,
  deactivationBlock,
  type DeactivationBlock,
} from "@/data/team-access";
import { screenHref } from "@/screens/shared";

export const BLOCK_TEXT: Readonly<
  Record<Exclude<DeactivationBlock, null>, string>
> = {
  self: "Δεν απενεργοποιείς τον εαυτό σου.",
  "owner-by-non-owner": "Τον Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης.",
  "last-owner":
    "Είναι ο τελευταίος ενεργός Ιδιοκτήτης: πρώτα δώσε τον Ρόλο Ιδιοκτήτης σε άλλον.",
};

const assignmentLines = (a: OpenAssignments): readonly string[] =>
  [
    a.clients + a.opportunities > 0 &&
      `${a.clients} Πελάτες και ${a.opportunities} Ευκαιρίες → στην ουρά «Χωρίς υπεύθυνο»`,
    a.productions > 0 &&
      `${a.productions} Παραγωγές όπου ήταν Υπεύθυνος → χωρίς Υπεύθυνο, στη G1`,
    a.tasks + a.deliverables > 0 &&
      `${a.tasks} Εργασίες και ${a.deliverables} Παραδοτέα → χωρίς ανάθεση`,
    a.crews > 0 &&
      `${a.crews} θέσεις σε Συνεργεία μελλοντικών Γυρισμάτων → κενές, με σήμα`,
  ].filter((line): line is string => !!line);

export function AssignmentList({ id }: { id: string }) {
  const lines = assignmentLines(assignmentsOf(id));
  if (lines.length === 0) {
    return <p className="muted">Καμία ανοιχτή ανάθεση.</p>;
  }
  return (
    <ul className="n1-steps">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

interface ConfirmProps {
  role: RoleId;
  actor: TeamUser;
  target: TeamUser;
}

export function DeactivateConfirm({ role, actor, target }: ConfirmProps) {
  const back = screenHref(role, "N1", { user: target.id });
  const block = deactivationBlock(actor, target);
  if (block) {
    return (
      <section className="card n1-section n1-danger" role="alert">
        <h2 className="card-title">Δεν γίνεται η Απενεργοποίηση</h2>
        <p>{BLOCK_TEXT[block]}</p>
        <Link className="button" href={back}>
          Πίσω στον Χρήστη
        </Link>
      </section>
    );
  }
  return (
    <section className="card n1-section n1-danger">
      <h2 className="card-title">Απενεργοποίηση: {target.name}</h2>
      <p>Επιστρέφουν για νέα ανάθεση:</p>
      <AssignmentList id={target.id} />
      <p className="note">
        Οι συνεδρίες του κλείνουν αμέσως και ο Σύνδεσμος ημερολογίου παύει. Το
        όνομά του μένει στο ιστορικό. Με Επανενεργοποίηση κρατά τους Ρόλους του,
        αλλά οι αναθέσεις δεν επιστρέφουν.
      </p>
      <div className="btn-row">
        <button type="button" className="button" data-danger>
          Ναι, απενεργοποίηση
        </button>
        <Link className="button" href={back}>
          Άκυρο
        </Link>
      </div>
    </section>
  );
}
