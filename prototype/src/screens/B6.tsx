import { OPPORTUNITIES } from "@/data/opportunities";
import {
  SALES_CLIENTS,
  findClient,
  memberName,
  type SalesClient,
} from "@/data/sales";
import {
  DuplicatePairs,
  type DuplicatePair,
  type PairSide,
} from "@/screens/b6-pairs";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

const toSide = (client: SalesClient): PairSide => ({
  id: client.id,
  name: client.name,
  fields: [
    ["Επωνυμία", client.legalName],
    ["ΑΦΜ", client.vat],
    ["Τηλέφωνο", client.contact.phone],
    ["Email", client.contact.email],
    ["Κύριο πρόσωπο", client.contact.name],
    ["Υπεύθυνος", memberName(client.ownerId)],
    [
      "Ευκαιρίες",
      String(
        OPPORTUNITIES.filter(
          (opportunity) => opportunity.clientId === client.id,
        ).length,
      ),
    ],
    ["Συμφωνίες", String(client.agreements.length)],
  ],
});

const toPairs = (): readonly DuplicatePair[] =>
  SALES_CLIENTS.flatMap((client) => {
    const existing = client.possibleDuplicateOf
      ? findClient(client.possibleDuplicateOf.clientId)
      : undefined;
    if (!client.possibleDuplicateOf || !existing) return [];
    return [
      {
        key: client.id,
        reason: client.possibleDuplicateOf.reason,
        candidate: toSide(client),
        existing: toSide(existing),
      },
    ];
  });

// Πιθανά διπλά και Συγχώνευση: μόνο Ιδ · Δι (Δικαίωμα «Συγχωνεύει Πελάτες»).
export function B6({ role, query }: ScreenProps) {
  const state = parseState(query.state);

  return (
    <>
      <StateSwitcher role={role} code="B6" state={state} />
      {state === "error" && <ErrorNotice what="τα Πιθανά διπλά" />}
      {state === "empty" && (
        <StateNotice kind="empty" title="Κανένα Πιθανό διπλό">
          <p>
            Όταν μια φόρμα μοιάζει με υπάρχοντα Πελάτη χωρίς ακριβές ταίριασμα,
            θα εμφανιστεί εδώ.
          </p>
        </StateNotice>
      )}
      {state === "normal" && <DuplicatePairs pairs={toPairs()} />}
    </>
  );
}
