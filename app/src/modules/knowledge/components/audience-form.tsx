"use client";

import { saveAudience } from "../actions-items";
import { PUBLIC_AUDIENCE_LABEL, ROLE_KIND_LABEL } from "../labels";
import type { Audience, RoleOption } from "../view-schema";
import { ActionForm } from "./action-form";

// Κοινό ενός στοιχείου: Ρόλοι ομάδας, Ρόλοι πελάτη, ή «δημόσιο». Ισχύει στην επόμενη ανάγνωση (και για τον Βοηθό).

interface AudienceFormProps {
  itemId: string;
  audience: Audience;
  roles: readonly RoleOption[];
}

function RoleGroup({
  kind,
  roles,
  checked,
}: {
  kind: RoleOption["kind"];
  roles: readonly RoleOption[];
  checked: Set<string>;
}) {
  const list = roles.filter((role) => role.kind === kind);
  if (list.length === 0) return null;
  return (
    <fieldset className="m-0 grid gap-1.5 border-0 p-0">
      <legend className="kit-label mb-1">{ROLE_KIND_LABEL[kind]}</legend>
      {list.map((role) => (
        <label key={role.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="roles"
            value={role.id}
            defaultChecked={checked.has(role.id)}
          />
          {role.name}
        </label>
      ))}
    </fieldset>
  );
}

export function AudienceForm({ itemId, audience, roles }: AudienceFormProps) {
  const checked = new Set(audience.roles.map((role) => role.id));
  return (
    <ActionForm
      action={saveAudience}
      submitLabel="Αποθήκευση Κοινού"
      onlyWhenChanged
    >
      <input type="hidden" name="id" value={itemId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <RoleGroup kind="team" roles={roles} checked={checked} />
        <RoleGroup kind="client" roles={roles} checked={checked} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={audience.isPublic}
        />
        {PUBLIC_AUDIENCE_LABEL}
      </label>
    </ActionForm>
  );
}
