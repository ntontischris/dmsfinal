import { TEAM, findClient } from "@/data/sales";
import { unassignedOpportunities } from "@/data/sales-access";
import { UnassignedQueue, type QueueItem } from "@/screens/b5-queue";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

// Ουρά «Χωρίς υπεύθυνο»: Ευκαιρίες από τη φόρμα για νέο Πελάτη. Μόνο Ιδ · Δι (Δικαίωμα «Μεταβιβάζει Υπεύθυνο»).
export function B5({ role, query }: ScreenProps) {
  const state = parseState(query.state);

  const items: readonly QueueItem[] = unassignedOpportunities().map(
    (opportunity) => {
      const client = findClient(opportunity.clientId);
      return {
        id: opportunity.id,
        href: screenHref(role, "B4", { id: opportunity.id }),
        title: opportunity.title,
        clientName: client?.name ?? "",
        source: opportunity.source,
        received: fmtDate(opportunity.activities[0]?.when ?? "2026-09-20"),
        isNewClient: client?.status === "Υποψήφιος",
        isPossibleDuplicate: !!client?.possibleDuplicateOf,
      };
    },
  );

  return (
    <>
      <StateSwitcher role={role} code="B5" state={state} />
      <p className="muted">
        Όσοι αναθέτουν ειδοποιούνται για κάθε νέα Ευκαιρία από φόρμα. Αυτόματη
        μοιρασιά σε πωλητές δεν υπάρχει.
      </p>
      {state === "error" && <ErrorNotice what="η ουρά «Χωρίς υπεύθυνο»" />}
      {state === "empty" && (
        <StateNotice kind="empty" title="Η ουρά είναι άδεια">
          <p>Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο.</p>
        </StateNotice>
      )}
      {state === "normal" && (
        <UnassignedQueue
          items={items}
          members={TEAM.map((member) => ({ id: member.id, name: member.name }))}
        />
      )}
    </>
  );
}
