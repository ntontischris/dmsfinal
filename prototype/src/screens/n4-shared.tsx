import type { RoleId } from "@/data/roles";
import { findClient } from "@/data/sales";
import { CLIENT_MEMBERSHIPS, TEAM_USERS, type RoleDef } from "@/data/team";
import { screenHref, type ScreenQuery } from "@/screens/shared";

// Βοηθήματα της N4: σύνδεσμοι και ποιοι Χρήστες έχουν έναν Ρόλο.

export interface RoleHolder {
  key: string;
  name: string;
  detail: string;
}

export const n4Href = (
  role: RoleId,
  query: ScreenQuery,
  params: Readonly<Record<string, string | undefined>>,
): string => screenHref(role, "N4", { state: query.state, ...params });

const clientUserName = (email: string, clientId: string): string =>
  findClient(clientId)?.users.find((u) => u.email === email)?.name ?? email;

export const roleHolders = (def: RoleDef): readonly RoleHolder[] =>
  def.kind === "ομάδας"
    ? TEAM_USERS.filter(
        (u) => u.status === "ενεργός" && u.roleIds.includes(def.id),
      ).map((u) => ({ key: u.id, name: u.name, detail: u.email }))
    : CLIENT_MEMBERSHIPS.filter((m) => m.roleId === def.id).map((m) => ({
        key: `${m.email}-${m.clientId}`,
        name: clientUserName(m.email, m.clientId),
        detail: findClient(m.clientId)?.name ?? m.clientId,
      }));

// Όσοι μπορούν να πάρουν τον Ρόλο: ενεργοί Χρήστες ομάδας χωρίς αυτόν, ή Χρήστες πελάτη με άλλον Ρόλο.
export const roleCandidates = (def: RoleDef): readonly RoleHolder[] =>
  def.kind === "ομάδας"
    ? TEAM_USERS.filter(
        (u) => u.status === "ενεργός" && !u.roleIds.includes(def.id),
      ).map((u) => ({ key: u.id, name: u.name, detail: u.email }))
    : CLIENT_MEMBERSHIPS.filter((m) => m.roleId !== def.id).map((m) => ({
        key: `${m.email}-${m.clientId}`,
        name: clientUserName(m.email, m.clientId),
        detail: findClient(m.clientId)?.name ?? m.clientId,
      }));

export const pluralUsers = (count: number): string =>
  count === 1 ? "1 Χρήστης" : `${count} Χρήστες`;
