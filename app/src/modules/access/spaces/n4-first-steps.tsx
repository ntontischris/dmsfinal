"use client";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";

import { saveRoleFirstSteps } from "../first-steps-actions";
import { InviteMessage } from "./n1-invite";

// a3: ο Ιδιοκτήτης γράφει τι βλέπει στην κάρτα «Πρώτα βήματα» όποιος έχει αυτόν τον Ρόλο.
export function RoleFirstStepsForm(props: { roleId: string; body: string }) {
  const { state, isPending, onSubmit } = useKeptForm(saveRoleFirstSteps);
  return (
    <div id="role-first-steps">
      <Panel label="Πρώτα βήματα">
        <form onSubmit={onSubmit} className="n1-form">
          <input type="hidden" name="roleId" value={props.roleId} />
          <label className="n1-field">
            <span>Κείμενο κάρτας</span>
            <textarea
              className="input"
              name="body"
              rows={4}
              maxLength={2000}
              defaultValue={props.body}
            />
          </label>
          <p className="muted">
            Φαίνεται στη Σήμερα, στην πρώτη είσοδο, μέχρι ο Χρήστης να πατήσει
            «Κατάλαβα». Κενό = καμία κάρτα για αυτόν τον Ρόλο.
          </p>
          <div className="btn-row">
            <button type="submit" className="button" disabled={isPending}>
              {isPending ? "Αποθήκευση…" : "Αποθήκευση κειμένου"}
            </button>
            <InviteMessage state={state} />
          </div>
        </form>
      </Panel>
    </div>
  );
}
