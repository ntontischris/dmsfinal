import { z } from "zod";

// Ποιος «έχει» έναν Ρόλο, από τη βάση (authz.role_usage): Χρήστες ομάδας (και απενεργοποιημένοι), Χρήστες πελάτη
// (και αφαιρεμένοι), ανοιχτές προσκλήσεις και κοινό στη Γνώση. Αυτά μετακινεί η διαγραφή.

const countSchema = z.number().int().nonnegative();

export const roleUsageSchema = z.object({
  teamUsers: countSchema,
  clientUsers: countSchema,
  invitations: countSchema,
  knowledge: countSchema,
});

export type RoleUsage = z.infer<typeof roleUsageSchema>;

export const roleUsageMapSchema = z.record(z.string(), roleUsageSchema);

export const EMPTY_USAGE: RoleUsage = {
  teamUsers: 0,
  clientUsers: 0,
  invitations: 0,
  knowledge: 0,
};

// Οι άνθρωποι που έχουν τον Ρόλο (ομάδας και πελάτη).
export const usagePeople = (usage: RoleUsage): number =>
  usage.teamUsers + usage.clientUsers;

export const usageTotal = (usage: RoleUsage): number =>
  usagePeople(usage) + usage.invitations + usage.knowledge;

const part = (count: number, one: string, many: string): string | null =>
  count === 0 ? null : `${count} ${count === 1 ? one : many}`;

// «2 Χρήστες ομάδας, 1 ανοιχτή πρόσκληση και 3 στοιχεία της Γνώσης» (ίδια διατύπωση με τη βάση).
export const usageText = (usage: RoleUsage): string => {
  const parts = [
    part(usage.teamUsers, "Χρήστη ομάδας", "Χρήστες ομάδας"),
    part(usage.clientUsers, "Χρήστη πελάτη", "Χρήστες πελάτη"),
    part(usage.invitations, "ανοιχτή πρόσκληση", "ανοιχτές προσκλήσεις"),
    part(usage.knowledge, "στοιχείο της Γνώσης", "στοιχεία της Γνώσης"),
  ].filter((text): text is string => text !== null);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} και ${parts[parts.length - 1]}`;
};
