import { personName } from "@/data/filming";
import type { ProductionMember } from "@/data/productions-access";
import type { ProductionState, ProductionTask } from "@/data/productions";

export interface LiveMember extends ProductionMember {
  baseOpen: number;
}

export interface LiveDelivery {
  when: string;
  by: string;
  comment?: string;
}

export interface Live {
  ownerId: string;
  members: readonly LiveMember[];
  tasks: readonly ProductionTask[];
  state: ProductionState;
  delivery?: LiveDelivery;
  cancellation?: { when: string; by: string; reason: string };
  log: readonly string[];
}

export type UpdateLive = (change: (live: Live) => Live) => void;

export const openTasksOf = (live: Live, personId: string): number =>
  live.tasks.filter((t) => t.assigneeId === personId && !t.doneAt).length;

export const openCountOf = (live: Live, member: LiveMember): number =>
  member.baseOpen + openTasksOf(live, member.personId);

export const withLog = (live: Live, line: string): Live => ({
  ...live,
  log: [line, ...live.log],
});

export const isMemberOf = (live: Live, personId: string): boolean =>
  live.members.some((m) => m.personId === personId);

// Η ανάθεση σε άνθρωπο που δεν είναι Μέλος τον κάνει Μέλος.
export const withMember = (live: Live, personId: string): Live =>
  isMemberOf(live, personId)
    ? live
    : {
        ...live,
        members: [
          ...live.members,
          {
            personId,
            reason: "από ανάθεση",
            openAssignments: 0,
            baseOpen: 0,
          },
        ],
      };

export const changeOwner = (live: Live, personId: string): Live => {
  const added = withMember(live, personId);
  return withLog(
    {
      ...added,
      ownerId: personId,
      members: added.members.map((m) =>
        m.personId === personId
          ? { ...m, reason: "Υπεύθυνος" }
          : m.personId === live.ownerId
            ? { ...m, reason: "με το χέρι" }
            : m,
      ),
    },
    `Νέος Υπεύθυνος: ${personName(personId)}${isMemberOf(live, personId) ? "" : " (έγινε Μέλος)"}.`,
  );
};

export const removeMember = (live: Live, personId: string): Live => {
  const gone = live.members.find((m) => m.personId === personId);
  if (!gone || personId === live.ownerId) return live;
  return withLog(
    {
      ...live,
      members: live.members
        .filter((m) => m.personId !== personId)
        .map((m) =>
          m.personId === live.ownerId
            ? { ...m, baseOpen: m.baseOpen + gone.baseOpen }
            : m,
        ),
      tasks: live.tasks.map((t) =>
        t.assigneeId === personId && !t.doneAt
          ? { ...t, assigneeId: live.ownerId }
          : t,
      ),
    },
    `Αφαιρέθηκε Μέλος: ${personName(personId)}.`,
  );
};

export const TODAY = "2026-09-20";

// Το «ποιος» στα δεδομένα είναι id ανθρώπου, όνομα ή «σύστημα».
export const whoLabel = (who: string): string =>
  personName(who) === "—" ? who : personName(who);
