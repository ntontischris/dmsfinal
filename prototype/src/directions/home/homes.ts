// PROTOTYPE «Οπτική κατεύθυνση», γύρος 2: δέκα προτάσεις για την Αρχική (R1),
// όλες συνδυασμοί του A (σινεμά) και του B (ακρίβεια). ?variant=1..10, &full=1 για πλήρη οθόνη.

import type { SwitcherOption } from "@/directions/direction-switcher";

export const HOME_DIRECTIONS: readonly SwitcherOption[] = [
  {
    key: "1",
    name: "Μοντάζ",
    traits:
      "Η σελίδα ως timeline μοντάζ: program monitor, κανάλια, playhead που τρέχει με την κύλιση",
  },
  {
    key: "2",
    name: "Σκόπευτρο",
    traits:
      "Το hero είναι το σκόπευτρο της κάμερας: HUD, εστίαση, ζωντανό timecode, μετρητές ήχου",
  },
  {
    key: "3",
    name: "Φωτοτράπεζα",
    traits:
      "Contact sheet: πλέγμα καρέ, σημάδια με μολύβι, επιλεγμένα κάδρα που μεγαλώνουν",
  },
  {
    key: "4",
    name: "Χρωματική διόρθωση",
    traits:
      "Σύρε το πριν/μετά από LOG σε τελικό χρώμα· waveform και vectorscope ως διάκοσμος",
  },
  {
    key: "5",
    name: "Φως",
    traits:
      "Ζωντανό WebGL φως (anamorphic flare) κάτω από αυστηρό τυπογραφικό πλέγμα",
  },
  {
    key: "6",
    name: "Τίτλοι αρχής",
    traits:
      "Η αρχική ανοίγει σαν ταινία: letterbox που ανοίγει, κινούμενοι τίτλοι, credits",
  },
  {
    key: "7",
    name: "Ρεζί",
    traits:
      "Multiviewer σκηνοθεσίας: 9 οθόνες, tally PGM/PVW, ρολόι, lower third",
  },
  {
    key: "8",
    name: "Σενάριο",
    traits: "Σελίδα σεναρίου με σκηνές και storyboard: η διαδικασία ως ταινία",
  },
  {
    key: "9",
    name: "Διάφραγμα",
    traits: "Ίριδα φακού που ανοίγει με την κύλιση· κλίμακα f-stop ως πλοήγηση",
  },
  {
    key: "10",
    name: "Τεχνικό δελτίο",
    traits:
      "Ελβετική ακρίβεια: τεράστιοι αριθμοί, πίνακας προδιαγραφών, διάτρηση φιλμ",
  },
];

export const findHomeDirection = (key: string | null): SwitcherOption =>
  HOME_DIRECTIONS.find((direction) => direction.key === key) ??
  HOME_DIRECTIONS[0];
