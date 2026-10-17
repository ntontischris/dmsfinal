import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { AccessNotice, isOwner, type Viewer } from "@/modules/access";

import {
  GDPR_EYEBROW,
  GDPR_LOAD_ERROR,
  GDPR_NO_ACCESS,
  GDPR_NOTE,
  GDPR_TITLE,
} from "../labels";
import { getGdprRegister, getGdprSubjects } from "../queries";
import type { GdprSubjects } from "../schemas";
import { RegisterList } from "./register-list";
import { GdprRequestForm } from "./request-form";
import { SubjectActions } from "./subject-actions";

const header = <ScreenHeader eyebrow={GDPR_EYEBROW} title={GDPR_TITLE} />;

// Οι Χρήστες πελάτη που δεν ανήκουν πια σε κανέναν Πελάτη: δεν έχουν άλλη σελίδα, άρα η Εξαγωγή και η Ανωνυμοποίησή
// τους ζουν εδώ.
function DetachedClientUsers({ subjects }: { subjects: GdprSubjects }) {
  const users = subjects.clientUsers.filter(
    (user) => user.clientIds.length === 0,
  );
  return (
    <Panel label="Χρήστες πελάτη χωρίς Πελάτη" aside={String(users.length)}>
      {users.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Κανένας. Όποιος αφαιρεθεί από κάθε Πελάτη εμφανίζεται εδώ.
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0">
          {users.map((user) => (
            <li
              key={user.id}
              className="grid gap-2 border-b pb-4 last:border-b-0 last:pb-0"
            >
              <span className="font-medium">{user.name}</span>
              <SubjectActions
                kind="client_user"
                id={user.id}
                name={user.name}
                block={user.block}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// N1 Αιτήματα GDPR: μητρώο με προθεσμία, καταγραφή, και οι Χρήστες πελάτη χωρίς Πελάτη. Μόνο ο Ιδιοκτήτης.
export async function GdprScreen({ viewer }: { viewer: Viewer }) {
  if (!isOwner(viewer))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{GDPR_NO_ACCESS}</p>
        </AccessNotice>
      </>
    );
  const [register, subjects] = await Promise.all([
    getGdprRegister(),
    getGdprSubjects(),
  ]);
  if (!register.ok || !subjects.ok)
    return (
      <>
        {header}
        <Notice kind="error" title="Δεν φόρτωσαν τα Αιτήματα GDPR">
          <p className="m-0">{GDPR_LOAD_ERROR}</p>
        </Notice>
      </>
    );
  const open = register.data.requests.filter(
    (request) => !request.completedOn,
  ).length;
  return (
    <>
      {header}
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          {GDPR_NOTE} <Link href="/app/team">← Ομάδα</Link>
        </p>
        <Panel label="Μητρώο αιτημάτων" aside={`${open} ανοιχτά`} isFlush>
          <RegisterList requests={register.data.requests} />
        </Panel>
        <Panel label="Νέο αίτημα">
          <GdprRequestForm subjects={subjects.data} />
        </Panel>
        <DetachedClientUsers subjects={subjects.data} />
      </div>
    </>
  );
}
