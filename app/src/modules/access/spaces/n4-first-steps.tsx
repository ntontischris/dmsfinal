"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { saveRoleFirstSteps } from "../first-steps-actions";
import { InviteMessage } from "./n1-invite";
import { Box } from "./n-parts";

// a3: ο Ιδιοκτήτης γράφει τι βλέπει στην κάρτα «Πρώτα βήματα» όποιος έχει αυτόν τον Ρόλο.
export function RoleFirstStepsForm(props: { roleId: string; body: string }) {
  const { state, isPending, onSubmit } = useKeptForm(saveRoleFirstSteps);
  return (
    <div id="role-first-steps">
      <Box
        title="Πρώτα βήματα"
        hint={props.body ? "Η κάρτα της πρώτης εισόδου" : "Καμία κάρτα ακόμα"}
      >
        <form onSubmit={onSubmit} className="ml-fields">
          <input type="hidden" name="roleId" value={props.roleId} />
          <label className="ml-field">
            <span>Κείμενο κάρτας</span>
            <textarea
              className="input"
              name="body"
              rows={4}
              maxLength={2000}
              defaultValue={props.body}
            />
            <small>
              Φαίνεται στη Σήμερα, στην πρώτη είσοδο, μέχρι ο Χρήστης να πατήσει
              «Κατάλαβα». Κενό = καμία κάρτα για αυτόν τον Ρόλο.
            </small>
          </label>
          <div className="ml-actions">
            <InviteMessage state={state} />
            <button type="submit" disabled={isPending}>
              {isPending ? "Αποθήκευση…" : "Αποθήκευση κειμένου"}
            </button>
          </div>
        </form>
      </Box>
    </div>
  );
}
