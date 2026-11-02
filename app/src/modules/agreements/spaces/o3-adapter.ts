import type { AgreementDefaults, AgreementKind, KindInfo } from "../types";

// O3 (νέα εμφάνιση): μικρές καθαρές συναρτήσεις των καρτών Ρυθμίσεις › Συμφωνίες.

// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό τα πεδία είναι κειμένου.
export const decimalText = (value: number): string =>
  String(value).replace(".", ",");

export const termsHref = (set: AgreementKind): string =>
  `/app/settings/agreements?set=${set}`;

// «Μόνο προς τα εμπρός»: πόσα υπάρχοντα δεν αλλάζουν με την αποθήκευση.
export const forwardText = (
  defaults: Pick<AgreementDefaults, "openProposals" | "liveAgreements">,
): string =>
  `Αφορά ${defaults.openProposals} ανοιχτές προτάσεις και ${defaults.liveAgreements} Συμφωνίες, που δεν αλλάζουν· η νέα τιμή ισχύει μόνο για νέες.`;

export type LimitsDraft = Readonly<Record<string, string>>;

// Ό,τι δεν έχει αγγίξει ο Χρήστης μένει όπως το έχει η βάση (και ένα είδος που εμφανίστηκε μετά δεν μηδενίζεται).
export const limitTextOf = (
  kind: Pick<KindInfo, "id" | "revisionLimit">,
  draft: LimitsDraft,
): string => draft[kind.id] ?? kind.revisionLimit?.toString() ?? "";

const roundsOf = (text: string): number | string | null => {
  const value = text.trim();
  if (value === "") return null;
  return /^\d{1,3}$/.test(value) ? Number(value) : value;
};

// Το κρυφό πεδίο JSON [{kindId, rounds|null}]· ό,τι δεν διαβάζεται ως αριθμός φτάνει ως κείμενο και το απορρίπτει ο server.
export const limitsField = (
  kinds: readonly Pick<KindInfo, "id" | "revisionLimit">[],
  draft: LimitsDraft,
): string =>
  JSON.stringify(
    kinds.map((kind) => ({
      kindId: kind.id,
      rounds: roundsOf(limitTextOf(kind, draft)),
    })),
  );
