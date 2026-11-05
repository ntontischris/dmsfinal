import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import type { TodayTeam } from "../view-schema";
import { teamFineOf, teamLineOf, teamPillOf } from "./a1-team";

// «Η ομάδα» (#241 Σ5): μόνο όπου κόλλησε κάτι, ένας άνθρωπος ανά γραμμή· οι υπόλοιποι σε μία φράση.
export function TeamBrief({ team }: { team: TodayTeam }) {
  const fine = teamFineOf(team.people.length, team.fine);
  return (
    <div className="a1-brief-panel" data-part="team">
      <Panel label="Η ομάδα">
        <p className="muted a1-summary">Μόνο όπου κόλλησε κάτι</p>
        {team.people.length > 0 && (
          <div className="a1-rows">
            <RowList>
              {team.people.map((person) => {
                const pill = teamPillOf(person);
                return (
                  <ListRow
                    key={person.id}
                    lead={<Avatar name={person.name} />}
                    title={person.name}
                    sub={teamLineOf(person)}
                    aside={<Badge tone={pill.tone}>{pill.label}</Badge>}
                  />
                );
              })}
            </RowList>
          </div>
        )}
        {fine && <p className="muted a1-summary">{fine}</p>}
      </Panel>
    </div>
  );
}
