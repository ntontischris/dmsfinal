import {
  CLIENT_USER,
  TODAY_ISO,
  type ClientComment,
  type ClientStatus,
  type H4View,
} from "@/screens/h3-model";

export interface LocalComment extends ClientComment {
  version: number;
}

export interface LocalAnswer {
  by: string;
  when: string;
  isApproval: boolean;
}

// Τοπική κατάσταση του prototype: τίποτα δεν αποθηκεύεται.
export interface LocalState {
  comments: readonly LocalComment[];
  answers: Readonly<Record<number, LocalAnswer>>;
  status: ClientStatus;
  roundsUsed: number;
  approvedAt?: string;
  request?: { when: string; text: string };
}

export const initialStateOf = (view: H4View): LocalState => ({
  comments: [],
  answers: {},
  status: view.status,
  roundsUsed: view.rounds.used,
  approvedAt: view.approvedAt,
  request: view.openRequest,
});

interface NewComment {
  version: number;
  text: string;
  at?: number;
  isBrokenLink?: boolean;
}

export const withComment = (
  state: LocalState,
  { version, text, at, isBrokenLink }: NewComment,
): LocalState => ({
  ...state,
  comments: [
    ...state.comments,
    {
      id: `local-${state.comments.length + 1}`,
      version,
      who: CLIENT_USER,
      isClient: true,
      when: TODAY_ISO,
      text,
      at,
      isBrokenLink,
    },
  ],
});

const answered = (
  state: LocalState,
  version: number,
  isApproval: boolean,
): LocalState => ({
  ...state,
  answers: {
    ...state.answers,
    [version]: { by: CLIENT_USER, when: TODAY_ISO, isApproval },
  },
});

export const withApproval = (
  state: LocalState,
  version: number,
): LocalState => ({
  ...answered(state, version, true),
  status: "εγκρίθηκε",
  approvedAt: TODAY_ISO,
});

// Η δουλειά δεν σταματά: το Παραδοτέο πάει αμέσως «σε εργασία», ο γύρος μετρά.
export const withChangeRequest = (
  state: LocalState,
  version: number,
): LocalState => ({
  ...answered(state, version, false),
  status: "σε εργασία",
  roundsUsed: state.roundsUsed + 1,
});

export const withPostApprovalRequest = (
  state: LocalState,
  text: string,
): LocalState => ({ ...state, request: { when: TODAY_ISO, text } });
