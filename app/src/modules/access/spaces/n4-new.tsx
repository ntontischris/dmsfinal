import Link from "next/link";

import { ErrorNotice } from "@/spaces/screens/shared";

import {
  listPermissions,
  listRoles,
  type RoleKind,
  type RoleSummary,
} from "../queries";
import { getViewer, isOwner } from "../viewer";
import { KIND_LABEL, newRoleHref, pickKind, ROLES_PATH } from "./n4-adapter";
import { Denied } from "./n4-common";
import { NewRoleForm } from "./n4-forms";
import { PermissionMatrix } from "./n4-matrix";
import { Hero } from "./n-parts";

// «Νέος Ρόλος» σε αριθμημένα βήματα (όπως η I3): είδος και αφετηρία, όνομα, τα Δικαιώματα που αντιγράφονται.

const KINDS: readonly { kind: RoleKind; label: string }[] = [
  { kind: "team", label: "Ρόλος ομάδας" },
  { kind: "client", label: "Ρόλος πελάτη" },
];

function NewRoleChips({
  kind,
  sources,
  source,
}: {
  kind: RoleKind;
  sources: readonly RoleSummary[];
  source: RoleSummary | undefined;
}) {
  return (
    <>
      <div className="ml-quick n4-chips" role="group" aria-label="Είδος">
        <span className="muted">Είδος:</span>
        {KINDS.map((k) => (
          <Link
            key={k.kind}
            aria-current={k.kind === kind ? "true" : undefined}
            href={newRoleHref(k.kind)}
          >
            {k.label}
          </Link>
        ))}
      </div>
      <p className="muted">
        Το είδος δεν αλλάζει μετά τη δημιουργία. Ένας Ρόλος ομάδας δεν γίνεται
        Ρόλος πελάτη, ούτε το αντίστροφο.
      </p>
      <div className="ml-quick n4-chips" role="group" aria-label="Αφετηρία">
        <span className="muted">Αφετηρία:</span>
        <Link
          aria-current={!source ? "true" : undefined}
          href={newRoleHref(kind)}
        >
          από το μηδέν
        </Link>
        {sources.map((def) => (
          <Link
            key={def.id}
            aria-current={def.id === source?.id ? "true" : undefined}
            href={newRoleHref(kind, def.id)}
          >
            Αντίγραφο του «{def.name}»
          </Link>
        ))}
      </div>
      {kind === "team" && (
        <p className="muted">
          Ο Ιδιοκτήτης δεν αντιγράφεται: όσα κάνει μόνο αυτός δεν δίνονται σε
          Ρόλο.
        </p>
      )}
    </>
  );
}

export async function SpacesNewRole({
  kind: rawKind,
  from,
}: {
  kind: string | undefined;
  from: string | undefined;
}) {
  if (!isOwner(await getViewer())) return <Denied />;
  const kind = pickKind(rawKind);
  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);
  if (!roles.ok || !permissions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τους Ρόλους" />
      </div>
    );
  // Ο Ιδιοκτήτης δεν αντιγράφεται: ό,τι κάνει μόνο ο Ιδιοκτήτης δεν δίνεται σε Ρόλο.
  const sources = roles.data.filter((def) => def.kind === kind && !def.isOwner);
  const source = sources.find((def) => def.id === from);
  return (
    <div data-spaces className="n4">
      <div className="ml-stack">
        <Hero
          mono="+"
          tag={`Ρόλος ${KIND_LABEL[kind]}`}
          title="Νέος Ρόλος"
          lead={
            source
              ? `Αντίγραφο του «${source.name}», με τα ίδια Δικαιώματα.`
              : "Από το μηδέν: χωρίς Δικαιώματα μέχρι να τα δώσεις."
          }
        />
        <NewRoleForm
          key={`${kind}-${source?.id ?? ""}`}
          kind={kind}
          source={source}
          cancelHref={ROLES_PATH}
          chips={<NewRoleChips kind={kind} sources={sources} source={source} />}
          matrix={
            <PermissionMatrix
              kind={kind}
              permissions={permissions.data.filter((p) => p.kind === kind)}
              grants={source?.grants ?? {}}
              locked
            />
          }
        />
      </div>
    </div>
  );
}
