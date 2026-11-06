import { athensLocal, describeActivity, formatDateTime } from "../helpers";
import type { ActivityLookups, ActivityRow } from "../types";

// Οι γραμμές του «Δραστηριότητες» (B2 και B4) και ποιος διορθώνει ή σβήνει ποια. Ο ίδιος κανόνας με τη βάση
// (authz.can_change_activity): μόνο χειροκίνητη· ο Ιδιοκτήτης πάντα, όποιος τη γράφει μέσα σε 24 ώρες από την καταγραφή.

export interface B2ActivityRow {
  id: string;
  when: string;
  kind: string;
  text: string;
  by: string;
  canChange: boolean;
  kindId: string | null;
  body: string;
  occurredLocal: string; // για τη φόρμα διόρθωσης
}

export interface ActivityWho {
  userId: string | null;
  isOwner: boolean;
  canManage: boolean;
}

const DAY_MS = 86_400_000;
const YEAR_MS = 365 * DAY_MS;

// Τα όρια του «Πότε έγινε» ως τιμές datetime-local: από έναν χρόνο πίσω έως τώρα (η βάση ελέγχει το ίδιο).
export const activityTimeBounds = (
  now: number = Date.now(),
): { min: string; max: string } => ({
  min: athensLocal(new Date(now - YEAR_MS)),
  max: athensLocal(new Date(now)),
});

export const canChangeActivity = (
  activity: Pick<ActivityRow, "kindId" | "actorId" | "createdAt">,
  who: ActivityWho,
  now: number,
): boolean => {
  if (activity.kindId === null) return false;
  if (who.isOwner) return true;
  return (
    who.canManage &&
    who.userId !== null &&
    activity.actorId === who.userId &&
    now - Date.parse(activity.createdAt) < DAY_MS
  );
};

export const toActivityRows = (
  activities: readonly ActivityRow[],
  lookups: ActivityLookups,
  context: { who: ActivityWho; showOpportunity: boolean; now?: number },
): B2ActivityRow[] =>
  activities.map((activity) => {
    const described = describeActivity(activity, lookups);
    const title =
      context.showOpportunity && activity.opportunityTitle
        ? `${described.text} (${activity.opportunityTitle})`
        : described.text;
    return {
      id: activity.id,
      when: formatDateTime(activity.occurredAt),
      kind: activity.isEdited
        ? `${described.kind} · διορθώθηκε`
        : described.kind,
      text: title,
      by: activity.actorName ?? "Σύστημα",
      canChange: canChangeActivity(
        activity,
        context.who,
        context.now ?? Date.now(),
      ),
      kindId: activity.kindId,
      body: activity.body,
      occurredLocal: athensLocal(activity.occurredAt),
    };
  });
