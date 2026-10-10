"use client";

import { selectClient } from "../client-user-actions";
import type { MembershipRow } from "../invitation-schemas";

// Η κεφαλίδα του Χρήστη πελάτη: ο επιλογέας Πελάτη, όταν έχει περισσότερους από έναν.
export function ClientSwitcher({ memberships }: { memberships: readonly MembershipRow[] }) {
  const current = memberships.find((membership) => membership.isCurrent)?.clientId ?? memberships[0]?.clientId;
  return (
    <form action={selectClient} className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-sm">
        <span className="kit-label">Πελάτης</span>
        <select
          name="clientId"
          defaultValue={current}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="rounded-sm border border-input bg-background px-2 py-1 text-sm"
        >
          {memberships.map((membership) => (
            <option key={membership.clientId} value={membership.clientId}>
              {membership.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
