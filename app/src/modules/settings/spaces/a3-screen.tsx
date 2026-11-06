import Link from "next/link";

import {
  getViewer,
  isOwner,
  listClientUsers,
  listMemberships,
  listMyRoleNames,
  type MembershipRow,
  type Viewer,
} from "@/modules/access";
import { getLinkStatus, SpacesCalendarLinkCard } from "@/modules/calendar";
import { formatDateTime } from "@/modules/filming";
import {
  getMyLanguage,
  SpacesLanguageChoice,
  type EmailLanguage,
} from "@/modules/notifications";
import { Panel } from "@/spaces/kit/panel";
import { Entity, ListRow, RowList } from "@/spaces/kit/parts";
import { StateNotice } from "@/spaces/screens/shared";

import { ThemeChoice } from "./a3-theme";

import "./a3.css";

export const PROFILE_HREF = "/app/settings/profile";
export const SWITCH_CLIENT_HREF = "/app/settings/switch-client";
// Τους Ρόλους τους αλλάζει μόνο ο Ιδιοκτήτης (N4, nav.ts «owner»).
const ROLES_HREF = "/app/team/roles";

type SignedIn = Extract<Viewer, { status: "signed-in" }>;

interface ProfilePart {
  name: string | null;
  roles: readonly string[];
  memberships: readonly MembershipRow[];
  language: EmailLanguage | null;
}

// Ό,τι διαφέρει για Χρήστη πελάτη: όνομα, Ρόλος και Πελάτες από τις συμμετοχές του, και η γλώσσα των email.
async function clientPart(viewer: SignedIn): Promise<ProfilePart> {
  const [memberships, language] = await Promise.all([
    listMemberships(),
    getMyLanguage(),
  ]);
  const rows = memberships.ok ? memberships.data : [];
  const current = rows.find((row) => row.isCurrent) ?? rows[0];
  const users = current ? await listClientUsers(current.clientId) : null;
  const self = users?.ok
    ? users.data.find((user) => user.userId === viewer.userId)
    : undefined;
  return {
    name: self?.name ?? null,
    roles: current ? [current.roleName] : [],
    memberships: rows,
    language: language.ok ? language.data : null,
  };
}

async function teamPart(viewer: SignedIn): Promise<ProfilePart> {
  const roles = await listMyRoleNames(viewer.userId);
  return {
    name: viewer.team?.name ?? null,
    roles: roles.ok ? roles.data : [],
    memberships: [],
    language: null,
  };
}

function DetailsCard({ name, email }: { name: string | null; email: string }) {
  return (
    <Panel label="Στοιχεία" isFlush>
      <RowList>
        {name && <ListRow title="Όνομα" aside={<strong>{name}</strong>} />}
        <ListRow title="Email" aside={<strong>{email}</strong>} />
      </RowList>
    </Panel>
  );
}

function LoginCard() {
  return (
    <Panel label="Είσοδος" isFlush>
      <RowList>
        <ListRow
          title="Κωδικός"
          aside={
            <Link className="button" href="/auth/set-password">
              Αλλαγή κωδικού
            </Link>
          }
        />
      </RowList>
    </Panel>
  );
}

// A3 Προφίλ και προτιμήσεις στη νέα εμφάνιση (prototype `screens/A3.tsx`): μαζεύει ό,τι ήταν σκόρπιο (γλώσσα από την A2,
// Σύνδεσμος ημερολογίου από την A5, θέμα από το μενού προφίλ). Κάθε συνδεδεμένος βλέπει μόνο τον εαυτό του.
export async function SpacesProfile() {
  const viewer = await getViewer();
  if (viewer.status !== "signed-in")
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το Προφίλ το έχουν μόνο όσοι έχουν λογαριασμό.
        </StateNotice>
      </div>
    );
  const isClient = viewer.team === null;
  const canManageRoles = isOwner(viewer);
  const [part, link] = await Promise.all([
    isClient ? clientPart(viewer) : teamPart(viewer),
    getLinkStatus(),
  ]);
  const createdAt = link.ok ? link.data.createdAt : null;
  return (
    <div data-spaces className="stack">
      <DetailsCard name={part.name} email={viewer.email} />
      <LoginCard />
      {/* Η γλώσσα υπάρχει μόνο για Χρήστες πελάτη και αλλάζει μόνο τα email που παίρνουν. */}
      <Panel label={part.language ? "Γλώσσα email και θέμα" : "Θέμα"}>
        {part.language && (
          <>
            <h3>Γλώσσα των email</h3>
            <SpacesLanguageChoice current={part.language} />
          </>
        )}
        <h3>Θέμα</h3>
        <ThemeChoice />
      </Panel>
      <SpacesCalendarLinkCard
        exists={link.ok && link.data.exists}
        createdLabel={createdAt ? formatDateTime(createdAt) : null}
        isClient={isClient}
      />
      <Panel label="Ειδοποιήσεις">
        <p>
          <Link href="/app/notifications?tab=prefs">
            Προτιμήσεις Ειδοποιήσεων
          </Link>
        </p>
      </Panel>
      <Panel label="Οι Ρόλοι μου">
        <p>{part.roles.join(", ") || "—"}</p>
        {canManageRoles ? (
          <p>
            <Link href={ROLES_HREF}>Ρόλοι και Δικαιώματα</Link>
          </p>
        ) : (
          <p className="muted">
            Τους Ρόλους δεν τους αλλάζεις εσύ. Αν θες αλλαγή, ζήτησέ την από τη
            Διαχείριση.
          </p>
        )}
      </Panel>
      {isClient && part.memberships.length > 0 && (
        <Panel label="Οι Πελάτες μου" isFlush>
          <RowList>
            {part.memberships.map((m) => (
              <ListRow
                key={m.clientId}
                title={<Entity name={m.name} />}
                aside={m.roleName}
              />
            ))}
          </RowList>
          {part.memberships.length > 1 && (
            <p className="a3-note">
              <Link href={SWITCH_CLIENT_HREF}>Εναλλαγή Πελάτη</Link>
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
