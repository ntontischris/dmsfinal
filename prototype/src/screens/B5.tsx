import Link from "next/link";

import { ACCESS_REQUESTS } from "@/data/access-requests";
import { TEAM, findClient, memberName } from "@/data/sales";
import { AccessRequests } from "@/screens/b5-access-requests";
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

  const requests = ACCESS_REQUESTS.map((request) => {
    const client = findClient(request.clientId);
    return {
      id: request.id,
      requester: memberName(request.requesterId),
      client: client?.name ?? "",
      currentOwner: memberName(client?.ownerId ?? null),
      topic: request.topic,
      comment: request.comment,
      date: fmtDate(request.date),
    };
  });

  return (
    <>
      <StateSwitcher role={role} code="B5" state={state} />
      <p className="note">
        Νέες Ευκαιρίες από τη φόρμα πάνε σε: <strong>ουρά «Χωρίς
        υπεύθυνο»</strong> (η αρχική τιμή του συστήματος). Αλλάζει στις{" "}
        <Link href={screenHref(role, "O2", {})}>Ρυθμίσεις › Πωλήσεις</Link>.
        Όσο υπάρχει ένα μόνο πρόσωπο που αναθέτει, η Ευκαιρία πάει κατευθείαν
        σε αυτό και δεν περνά από την ουρά. Όσοι αναθέτουν ειδοποιούνται για
        κάθε νέα Ευκαιρία από φόρμα· αυτόματη μοιρασιά σε πωλητές δεν υπάρχει.
      </p>
      {state === "error" && <ErrorNotice what="η ουρά «Χωρίς υπεύθυνο»" />}
      {state === "empty" && (
        <StateNotice kind="empty" title="Δεν υπάρχει τίποτα σε αναμονή">
          <p>
            Όλες οι Ευκαιρίες από τη φόρμα έχουν Υπεύθυνο και δεν υπάρχουν
            Αιτήματα πρόσβασης.
          </p>
        </StateNotice>
      )}
      {state === "normal" && (
        <>
          <h2>Χωρίς υπεύθυνο</h2>
          <UnassignedQueue
            items={items}
            members={TEAM.map((member) => ({ id: member.id, name: member.name }))}
          />
          <h2>Αιτήματα πρόσβασης</h2>
          <p className="muted">
            Ένας Πελάτης έχει έναν πωλητή. Εδώ αποφασίζεις αν άλλος πωλητής
            ανοίγει Ευκαιρία σε Πελάτη που δεν είναι δικός του.
          </p>
          <AccessRequests items={requests} />
        </>
      )}
    </>
  );
}
