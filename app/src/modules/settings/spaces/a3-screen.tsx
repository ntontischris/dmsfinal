import Link from "next/link";
import type { ReactNode } from "react";

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
import { initialsOf } from "@/spaces/shell/avatar";
import { StateNotice } from "@/spaces/screens/shared";

import { ThemeChoice } from "./a3-theme";

import "../../finance/spaces/money-lines.css";
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

// Κλειστό κουτί στο ύφος των «Χρημάτων»: τίτλος και μία φράση, το περιεχόμενο με ένα πάτημα.
function Box(props: { title: string; hint: string; children: ReactNode }) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div className="a3-box-body">{props.children}</div>
      </details>
    </section>
  );
}

// Η κεφαλίδα: ποιος είσαι (το h1 της σελίδας· το μενού προφίλ δεν έχει κεφαλίδα θέματος) και οι δύο γρήγορες
// ενέργειες, κωδικός και Ειδοποιήσεις.
function ProfileHero({ part, email }: { part: ProfilePart; email: string }) {
  const name = part.name ?? email;
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(name)}
      </span>
      <div>
        <span className="ml-tag">
          Προφίλ · {part.roles.join(", ") || "χωρίς Ρόλο"}
        </span>
        <h1>{name}</h1>
        <p className="a3-wrap">{email}</p>
      </div>
      <div className="ml-quick">
        <Link href="/auth/set-password">Αλλαγή κωδικού</Link>
        <Link href="/app/notifications?tab=prefs">
          Προτιμήσεις Ειδοποιήσεων
        </Link>
      </div>
    </header>
  );
}

function RolesBox(props: { part: ProfilePart; canManage: boolean }) {
  return (
    <Box title="Οι Ρόλοι μου" hint={props.part.roles.join(", ") || "—"}>
      {props.canManage ? (
        <p>
          <Link href={ROLES_HREF}>Ρόλοι και Δικαιώματα</Link>
        </p>
      ) : (
        <p className="muted">
          Τους Ρόλους δεν τους αλλάζεις εσύ. Αν θες αλλαγή, ζήτησέ την από τη
          Διαχείριση.
        </p>
      )}
    </Box>
  );
}

function ClientsBox(props: { memberships: readonly MembershipRow[] }) {
  const { memberships } = props;
  return (
    <Box
      title="Οι Πελάτες μου"
      hint={memberships.map((m) => m.name).join(", ")}
    >
      <ul className="ml-list">
        {memberships.map((m) => (
          <li key={m.clientId} className="ml-line">
            <span className="ml-thumb" aria-hidden="true">
              {initialsOf(m.name)}
            </span>
            <span className="ml-main">
              <strong>{m.name}</strong>
              <small>{m.roleName}</small>
            </span>
          </li>
        ))}
      </ul>
      {memberships.length > 1 && (
        <p>
          <Link href={SWITCH_CLIENT_HREF}>Εναλλαγή Πελάτη</Link>
        </p>
      )}
    </Box>
  );
}

// A3 Προφίλ και προτιμήσεις: κεφαλίδα με το όνομα, και από κάτω κλειστά κουτιά (γλώσσα, θέμα, Ρόλοι, Πελάτες) μαζί
// με την κάρτα του Συνδέσμου ημερολογίου. Κάθε συνδεδεμένος βλέπει μόνο τον εαυτό του.
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
  const [part, link] = await Promise.all([
    isClient ? clientPart(viewer) : teamPart(viewer),
    getLinkStatus(),
  ]);
  const createdAt = link.ok ? link.data.createdAt : null;
  return (
    <div data-spaces className="ml-stack">
      <ProfileHero part={part} email={viewer.email} />
      {/* Η γλώσσα υπάρχει μόνο για Χρήστες πελάτη και αλλάζει μόνο τα email που παίρνουν. */}
      {part.language && (
        <Box title="Γλώσσα των email" hint="Σε ποια γλώσσα σου γράφουμε">
          <SpacesLanguageChoice current={part.language} />
        </Box>
      )}
      <Box title="Θέμα" hint="Σκοτεινό, φωτεινό ή όπως η συσκευή">
        <ThemeChoice />
      </Box>
      <SpacesCalendarLinkCard
        exists={link.ok && link.data.exists}
        createdLabel={createdAt ? formatDateTime(createdAt) : null}
        isClient={isClient}
      />
      <RolesBox part={part} canManage={isOwner(viewer)} />
      {isClient && part.memberships.length > 0 && (
        <ClientsBox memberships={part.memberships} />
      )}
    </div>
  );
}
