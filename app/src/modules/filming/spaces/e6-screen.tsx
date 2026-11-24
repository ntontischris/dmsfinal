import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { filmingCaps } from "../caps";
import { NO_CLIENT_LABEL } from "../labels";
import { listMine } from "../queries";
import { getSheet } from "../queries-sheet";
import type { MineEntry } from "../types";
import { weekdayOf } from "./e1-format";
import { RESPONSE_WORDS, replyOf } from "./e3-model";
import { E3Reply } from "./e3-reply";
import { awaitsAnswer, dayOf, e6SheetOf, mineWhen } from "./e6-adapter";
import { E6Sheet } from "./e6-sheet";
import { Box, Line, Lines } from "./ml-parts";

import "./e.css";
import "./e1.css";
import "./e6.css";

function MyList({
  entries,
  selectedId,
}: {
  entries: readonly MineEntry[];
  selectedId: string;
}) {
  return (
    <nav aria-label="Τα Γυρίσματά μου">
      <h2 className="ml-box-title">
        Τα Γυρίσματά μου <small>{entries.length}</small>
      </h2>
      <Lines>
        {entries.map((entry) => {
          const [, , day] = dayOf(entry).split("-");
          return (
            <Line
              key={entry.id}
              isCurrent={entry.id === selectedId}
              lead={
                <span className="fl-date">
                  <small>{weekdayOf(dayOf(entry))}</small>
                  <strong>{day}</strong>
                </span>
              }
              href={hrefOf("E6", { id: entry.id })}
              title={entry.client?.name ?? NO_CLIENT_LABEL}
              sub={`${mineWhen(entry.startsAt, entry.hours)} · ${entry.production.title}`}
              aside={
                <>
                  {entry.sheetVersion === null && (
                    <Badge tone="waiting">χωρίς Δελτίο</Badge>
                  )}
                  {awaitsAnswer(entry) && (
                    <Badge tone="attention">⚠ περιμένει απάντηση</Badge>
                  )}
                </>
              }
            />
          );
        })}
      </Lines>
    </nav>
  );
}

function NoCrew() {
  return (
    <StateNotice kind="empty" title="Δεν είσαι σε κανένα Συνεργείο">
      <p>
        Όταν σε βάλουν σε Συνεργείο Γυρίσματος, το Δελτίο θα εμφανίζεται εδώ.
      </p>
    </StateNotice>
  );
}

async function Selected({
  entry,
  viewerId,
}: {
  entry: MineEntry;
  viewerId: string;
}) {
  const sheet = await getSheet(entry.id);
  if (!sheet.ok) return <ErrorNotice what="το Δελτίο γυρίσματος" />;
  const view = e6SheetOf(entry, sheet.data, viewerId, new Date().getTime());
  if (view) return <E6Sheet key={entry.id} sheet={view} />;
  return (
    <>
      <StateNotice kind="empty" title="Το Δελτίο δεν έχει σταλεί ακόμα">
        <p>
          Είσαι στο Συνεργείο του Γυρίσματος{" "}
          {entry.client?.name ?? NO_CLIENT_LABEL} (
          {mineWhen(entry.startsAt, entry.hours)}). Θα ειδοποιηθείς όταν σταλεί
          το Δελτίο.
        </p>
      </StateNotice>
      <NoSheetReply entry={entry} />
    </>
  );
}

// Χωρίς Δελτίο το μέλος απαντά ήδη «επιβεβαιώνω» ή «δεν μπορώ» (όπως η παλιά E6).
function NoSheetReply({ entry }: { entry: MineEntry }) {
  const reply = replyOf(
    { response: entry.myResponse, version: entry.myVersion },
    entry.state,
    null,
  );
  if (!reply) return null;
  return (
    <Box title="Η απάντησή σου" isOpen>
      <E3Reply
        filmingId={entry.id}
        reply={reply}
        myWord={RESPONSE_WORDS[entry.myResponse]}
      />
      {entry.myReason && <small>Λόγος: {entry.myReason}</small>}
    </Box>
  );
}

// E6 «Τα Γυρίσματά μου» στη νέα εμφάνιση (prototype `screens/E6.tsx`): τα ανοιχτά Γυρίσματα όπου είσαι στο Συνεργείο
// και το Δελτίο του επιλεγμένου (?id=), με απάντηση «επιβεβαιώνω» / «δεν μπορώ».
export async function SpacesMine({ id }: { id: string | undefined }) {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canView || viewer.status !== "signed-in")
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τα Γυρίσματά σου τα βλέπει όποιος «Βλέπει Γυρίσματα».</p>
        </StateNotice>
      </div>
    );
  const entries = await listMine();
  if (!entries.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τα Γυρίσματά σου" />
      </div>
    );
  const selected =
    entries.data.find((entry) => entry.id === id) ?? entries.data[0];
  return (
    <div data-spaces>
      <div className="e ml-stack">
        {selected ? (
          <>
            <MyList entries={entries.data} selectedId={selected.id} />
            <Selected entry={selected} viewerId={viewer.userId} />
          </>
        ) : (
          <NoCrew />
        )}
      </div>
    </div>
  );
}
