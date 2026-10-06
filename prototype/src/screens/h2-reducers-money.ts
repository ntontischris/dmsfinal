import type { ChargeChoice, PostApprovalChoice } from "@/data/deliverables";
import {
  TODAY,
  addBusinessDays,
  type H2Context,
  type Live,
} from "@/screens/h2-model";
import { logLine } from "@/screens/h2-reducers";

export const decideCharge = (
  live: Live,
  ctx: H2Context,
  choice: ChargeChoice,
  reason?: string,
): Live => {
  if (!live.charge) return live;
  const decided = { choice, by: ctx.meId, when: TODAY, reason };
  const what =
    choice === "χρεώνεται"
      ? "Απόφαση χρέωσης: χρεώνεται (γεννήθηκε Τιμολογητέο «έξτρα αναθεώρηση»)"
      : `Απόφαση χρέωσης: χωρίς χρέωση (${reason ?? ""})`;
  return logLine(
    { ...live, charge: { ...live.charge, decided } },
    ctx.meId,
    what,
    "κανείς· η δουλειά δεν είχε σταματήσει",
  );
};

const REOPEN_TEXT: Readonly<Record<PostApprovalChoice, string>> = {
  "δεκτό ως γύρος": "Αίτημα αλλαγής: δεκτό ως γύρος (ξανανοίγει, μετρά γύρο)",
  χρεώνεται:
    "Αίτημα αλλαγής: χρεώνεται (ξανανοίγει, γεννήθηκε Τιμολογητέο «αλλαγή που χρεώνεται»)",
  "νέο Παραδοτέο": "Αίτημα αλλαγής: νέο Παραδοτέο (το παλιό μένει εγκεκριμένο)",
};

export const decideRequest = (
  live: Live,
  ctx: H2Context,
  requestId: string,
  choice: PostApprovalChoice,
): Live => {
  const requests = live.requests.map((r) =>
    r.id === requestId
      ? { ...r, decided: { choice, by: ctx.meId, when: TODAY } }
      : r,
  );
  const reopens = choice !== "νέο Παραδοτέο";
  const next: Live = reopens
    ? {
        ...live,
        requests,
        state: "σε εργασία",
        roundsUsed: live.roundsUsed + 1,
        deadline: addBusinessDays(TODAY, ctx.daysAfterChanges),
      }
    : { ...live, requests };
  return logLine(
    next,
    ctx.meId,
    REOPEN_TEXT[choice],
    reopens
      ? `ο Ανατεθειμένος (νέα προθεσμία ${ctx.daysAfterChanges} εργάσιμες)`
      : "ο Ανατεθειμένος του νέου Παραδοτέου",
  );
};
