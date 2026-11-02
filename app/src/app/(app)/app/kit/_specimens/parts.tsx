import { Specimen } from "./specimen";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import {
  Avatar,
  AvatarStack,
  DateLead,
  Due,
  Entity,
  GroupBand,
  ListRow,
  Meter,
  Person,
  RowList,
  Segments,
  TimeLead,
} from "@/components/ui/parts";

// Τα κομμάτια περιεχομένου (screens2): άνθρωποι, πρόοδος, γραμμές λίστας, ομάδες. Φανταστικά δεδομένα.
// Φαίνονται καλύτερα με τη «Νέα εμφάνιση»· καμία οθόνη δεν τα χρησιμοποιεί ακόμα.

function People() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name="Άρης Κωνσταντίνου" />
        <AvatarStack
          names={[
            "Άρης Κωνσταντίνου",
            "Ελένη Παππά",
            "Νίκος Ράλλης",
            "Μαρία Λάμπρου",
          ]}
        />
        <AvatarStack names={[]} />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Person name="Ελένη Παππά" role="Υπεύθυνη" />
        <Person name="Χωρίς υπεύθυνο" />
        <Person name="—" />
      </div>
      <Entity
        name="Καφέ Αθηνά"
        href="/app/kit#parts"
        sub="Πακέτο Social · από 03/2026"
      />
    </div>
  );
}

function Progress() {
  return (
    <div className="grid max-w-md gap-4">
      <Meter label="Γυρίσματα" used={3} total={8} />
      <Meter label="Reels" used={8} total={8} />
      <Meter label="Ώρες" used={14} total={10} tone="attention" />
      <Segments label="Παροχές του μήνα" used={2} total={5} />
    </div>
  );
}

function Rows() {
  return (
    <Panel label="Επόμενα" isFlush>
      <RowList>
        <GroupBand label="Σήμερα · Πεμ 29" aside="2 γυρίσματα" isToday />
        <ListRow
          lead={<TimeLead start="09:30" end="14:00" />}
          title="Γύρισμα Reels"
          href="/app/kit#parts"
          sub="Καφέ Αθηνά · Πλατεία Αριστοτέλους"
          aside={<Badge tone="ok">επιβεβαιωμένο</Badge>}
          isHighlighted
        />
        <ListRow
          lead={<TimeLead start="16:00" />}
          title="Συνέντευξη podcast"
          sub="Γυμναστήριο Κίνηση"
          aside={<Badge tone="waiting">περιμένει πελάτη</Badge>}
        />
        <GroupBand label="Κυρ 01" />
        <ListRow
          lead={<DateLead weekday="Κυρ" day="01" />}
          title="Μοντάζ teaser"
          sub="Παραδοτέο · έκδοση 2"
          aside={<Due isLate>28/10</Due>}
        />
        <ListRow
          lead="v1"
          title="Παλιά πρόταση"
          sub="Αντικαταστάθηκε"
          aside={<Badge tone="faded">ακυρώθηκε</Badge>}
          isFaded
        />
      </RowList>
    </Panel>
  );
}

export function Parts() {
  return (
    <Specimen
      id="parts"
      title="Κομμάτια"
      origin="screens2"
      when="Κάθε είδος πληροφορίας με το δικό του σχήμα: άνθρωποι, πρόοδος, γραμμές λίστας με «πότε», ομάδες και προθεσμίες. Η κατάσταση μένει πάντα σήμα με λέξη."
    >
      <div className="grid gap-6">
        <People />
        <Progress />
        <div className="flex flex-wrap gap-2">
          <Badge tone="attention">ληξιπρόθεσμο</Badge>
          <Badge tone="strong">σειρά σου</Badge>
          <Badge tone="ok">έτοιμο</Badge>
          <Badge tone="waiting">περιμένει</Badge>
          <Badge tone="faded">ακυρώθηκε</Badge>
          <Badge>πληροφορία</Badge>
        </div>
        <Rows />
      </div>
    </Specimen>
  );
}
