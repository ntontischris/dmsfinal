import type { TodayTeam } from "../view-schema";
import { initialsOf } from "./a1-deck-model";
import { BriefBox, BriefLine } from "./a1-lines";
import { teamFineOf, teamLineOf, teamPillOf } from "./a1-team";

// «Η ομάδα» (#241 Σ5): μόνο όπου κόλλησε κάτι, ένας άνθρωπος ανά γραμμή· οι υπόλοιποι σε μία φράση.
export function TeamBrief({ team }: { team: TodayTeam }) {
  const fine = teamFineOf(team.people.length, team.fine);
  return (
    <BriefBox part="team" label="Η ομάδα">
      <p className="a1-summary" data-muted>
        Μόνο όπου κόλλησε κάτι
      </p>
      {team.people.length > 0 && (
        <ul className="ml-list">
          {team.people.map((person) => {
            const pill = teamPillOf(person);
            return (
              <BriefLine
                key={person.id}
                thumb={initialsOf(person.name)}
                title={person.name}
                label={person.name}
                sub={teamLineOf(person)}
                tag={pill.label}
                isUrgent={pill.tone === "attention"}
              />
            );
          })}
        </ul>
      )}
      {fine && (
        <p className="a1-summary" data-muted>
          {fine}
        </p>
      )}
    </BriefBox>
  );
}
