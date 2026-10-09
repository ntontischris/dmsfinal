import { Panel } from "@/components/ui/panel";

import { memberChoices } from "../helpers";
import type { OwnerCandidate, ProductionDetail } from "../types";

import { AddMemberForm, RemoveMemberForm } from "./member-forms";
import { MutedNote } from "./form-fields";

interface MembersPanelProps {
  production: ProductionDetail;
  candidates: readonly OwnerCandidate[];
}

const NO_MEMBER_NOTE =
  "Κανένα Μέλος με το χέρι. Ο Υπεύθυνος είναι μέλος χωρίς να γράφεται εδώ.";

// Τα Μέλη της Παραγωγής. Προσθήκη και αφαίρεση μόνο σε όποιον διαχειρίζεται την Παραγωγή.
export function MembersPanel({ production, candidates }: MembersPanelProps) {
  const canManage = production.viewerCan.members;
  const choices = memberChoices(candidates, production.owner?.id ?? null, production.members);
  return (
    <Panel label="Μέλη">
      <div className="grid gap-4">
        {production.members.length === 0 ? (
          <MutedNote>{NO_MEMBER_NOTE}</MutedNote>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 text-sm">
            {production.members.map((member) => (
              <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2">
                <span>{member.name}</span>
                {canManage && (
                  <RemoveMemberForm productionId={production.id} userId={member.userId} />
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && choices.length > 0 && (
          <AddMemberForm productionId={production.id} choices={choices} />
        )}
      </div>
    </Panel>
  );
}
